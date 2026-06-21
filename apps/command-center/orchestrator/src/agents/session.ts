// ─────────────────────────────────────────────────────────────────────────────
// AgentSession — wraps one Claude Agent SDK `query()` loop.
//
//   • streaming input: an AsyncQueue<SDKUserMessage> is the SDK `prompt`, so the
//     UI can push live multi-turn prompts into a running agent.
//   • output: every SDKMessage → normalizer → EventBus (persist + broadcast).
//   • lifecycle: an AgentStateMachine drives `sessions.state` + cc.agent.state.
//   • tokens: the SDK `result` usage drives the real-time `token:tick` fast path
//     and the session's running totals.
//   • stop: `Query.interrupt()` (streaming control) + close the queue + abort.
//
// Approval/question gating (canUseTool + ask_human MCP server) is injected by
// the approval engine (#4) via the `deps` FACTORIES — kept out of this file so
// #3 stands alone and #4 plugs in without edits here.
//
// Auth: defaults to the local Claude CLI / subscription session. When no
// ANTHROPIC_API_KEY is configured we pass an env that strips the key, so a
// low-credit key in the ambient environment can't break the subprocess
// (mirrors MoodBoarder's `env -u ANTHROPIC_API_KEY` pattern).
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import {
  query,
  type SDKMessage,
  type SDKUserMessage,
  type Options,
  type CanUseTool,
  type McpServerConfig,
  type Query,
} from '@anthropic-ai/claude-agent-sdk';
import type { AgentDescriptor, AgentRole, AgentState } from '@command-center/shared';
import { config } from '../config';
import { db } from '../db/client';
import { sessions } from '../db/schema';
import { eventBus } from '../bus/event-bus';
import { AsyncQueue } from './async-queue';
import { normalize, type NormalizedEvent } from './normalizer';
import { AgentStateMachine, isTerminal } from './state-machine';

export type QueryFn = (params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}) => Query;

/**
 * Injected by the approval engine (#4). Factories receive the live session so a
 * gate can attribute requests / drive state. All optional — without them the
 * agent runs un-gated (acceptable for the #3 single-session slice).
 */
export interface AgentSessionDeps {
  makeCanUseTool?: (session: AgentSession) => CanUseTool;
  makeMcpServers?: (session: AgentSession) => Record<string, McpServerConfig>;
  /** Override `query` for tests (scripted SDKMessage stream). */
  queryFn?: QueryFn;
}

export interface AgentSessionInit {
  name: string;
  role: AgentRole;
  model: string;
  cwd: string;
  /** Role persona appended to the Claude Code system prompt (Phase 7 presets). */
  systemPromptAppend?: string;
  /**
   * SDK `options.skills` — a context filter over DISCOVERED skills (slice #39 /
   * ADR-0002). Drive sessions pass `['adcelerate-execute']`. Note: this is a
   * filter, not a discovery root — the skill must already be discoverable (Drive
   * supplies `plugins` below to make it so without touching `settingSources`).
   */
  skills?: Options['skills'];
  /**
   * SDK `options.plugins` — local plugins loaded for this session (slice #39).
   * Drive passes the repo-local `drive-plugin` so `adcelerate-execute` is
   * discoverable while `settingSources:[]` stays (no project settings/permissions/
   * hooks load → the canUseTool gate is uncircumventable). Empirically verified.
   */
  plugins?: Options['plugins'];
}

function userMessage(text: string): SDKUserMessage {
  return {
    type: 'user',
    message: { role: 'user', content: text },
    parent_tool_use_id: null,
  };
}

// Parent Claude Code orchestration markers. If the orchestrator is itself
// launched from within a Claude Code session, these leak into the spawned agent
// and make it detect a NESTED session — which bypasses our canUseTool gate and
// drifts auth/effort context. Strip them so every spawned agent is a clean,
// standalone Claude Code where our approval engine is the authoritative
// permission boundary. (In a normal terminal deployment they're simply absent.)
const PARENT_CC_ENV_KEYS = [
  'CLAUDECODE',
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_EXECPATH',
  'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS',
  'CLAUDE_EFFORT',
  'AI_AGENT',
] as const;

/** Build the subprocess env: clean standalone Claude Code, local-CLI auth default. */
function sdkEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env };
  // No configured key → strip it so the SDK uses the local Claude CLI session
  // (avoids "Credit balance too low" from a stale ambient key).
  if (!config.ANTHROPIC_API_KEY) delete env.ANTHROPIC_API_KEY;
  for (const key of PARENT_CC_ENV_KEYS) delete env[key];
  return env;
}

export class AgentSession {
  readonly descriptor: AgentDescriptor;
  private readonly queue = new AsyncQueue<SDKUserMessage>();
  private readonly abort = new AbortController();
  private readonly sm: AgentStateMachine;
  // tool_use_id → {name, input}, seeded from PreToolUse so PostToolUse/Bash
  // events can be attributed back to their tool.
  private readonly tools = new Map<string, { name: string; input?: unknown }>();
  private q: Query | null = null;
  private loopPromise: Promise<void> | null = null;
  private readonly systemPromptAppend?: string;
  private readonly skills?: Options['skills'];
  private readonly plugins?: Options['plugins'];

  constructor(
    init: AgentSessionInit,
    private readonly deps: AgentSessionDeps = {},
  ) {
    this.systemPromptAppend = init.systemPromptAppend;
    this.skills = init.skills;
    this.plugins = init.plugins;
    this.descriptor = {
      session_id: randomUUID(),
      name: init.name,
      role: init.role,
      model: init.model,
      state: 'idle',
      cwd: init.cwd,
      startedAt: Date.now(),
      lastEventAt: Date.now(),
      totals: { input: 0, output: 0, cost_usd: 0 },
    };
    this.sm = new AgentStateMachine((from, to) => this.onStateChange(from, to), 'idle');
  }

  get id(): string {
    return this.descriptor.session_id;
  }

  get state(): AgentState {
    return this.sm.state;
  }

  /** Transition state externally (used by the approval gate in #4). */
  setState(next: AgentState, opts?: { force?: boolean }): void {
    this.sm.to(next, opts);
  }

  /** Persist the session row, open the SDK query, and start consuming output. */
  async start(): Promise<AgentDescriptor> {
    db.insert(sessions)
      .values({
        sessionId: this.id,
        name: this.descriptor.name,
        role: this.descriptor.role,
        model: this.descriptor.model,
        state: 'starting',
        cwd: this.descriptor.cwd,
        startedAt: this.descriptor.startedAt,
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      })
      .run();

    this.sm.to('starting');

    const queryFn = this.deps.queryFn ?? (query as QueryFn);
    this.q = queryFn({ prompt: this.queue, options: this.buildOptions() });

    this.sm.to('running');
    this.loopPromise = this.consume();
    return { ...this.descriptor };
  }

  /** Push a user turn into the live input queue. */
  prompt(text: string): void {
    this.emit({ hook_event_type: 'cc.prompt.submitted', payload: { text } });
    this.emit({ hook_event_type: 'UserPromptSubmit', payload: { text } });
    this.queue.push(userMessage(text));
  }

  /** Graceful interrupt: SDK control interrupt → close queue → abort. */
  async stop(): Promise<void> {
    this.sm.to('stopping');
    try {
      await this.q?.interrupt();
    } catch {
      // interrupt is best-effort; the queue close + abort still wind it down.
    }
    this.queue.close();
    try {
      this.abort.abort();
    } catch {
      /* already aborted */
    }
    await this.loopPromise;
  }

  /** Await the query loop's completion (tests). */
  async done(): Promise<void> {
    await this.loopPromise;
  }

  private buildOptions(): Options {
    const options: Options = {
      model: this.descriptor.model,
      cwd: this.descriptor.cwd,
      includePartialMessages: true,
      abortController: this.abort,
      env: sdkEnv(),
      // The orchestrator's canUseTool is the AUTHORITATIVE safety boundary. Do
      // NOT load the host's ~/.claude settings — their allow-rules would
      // pre-approve Bash/Write/etc. and silently bypass our approval gate. With
      // no setting sources + 'default' mode, every risky tool routes through
      // canUseTool (the human-in-the-loop). Auth is unaffected (it comes from
      // the CLI session / ANTHROPIC_API_KEY, not from settings sources).
      settingSources: [],
      permissionMode: 'default',
    };
    // Skill loading (slice #39 / ADR-0002). `settingSources:[]` above stays — the
    // skill is made discoverable via a local `plugin` (default plugin discovery is
    // independent of settingSources), and `skills` filters to just it. The
    // canUseTool gate is untouched: plugins load skills/commands, NOT permissions.
    if (this.skills) options.skills = this.skills;
    if (this.plugins) options.plugins = this.plugins;
    // Role persona — keep full Claude Code capability, append the role flavor.
    if (this.systemPromptAppend) {
      options.systemPrompt = {
        type: 'preset',
        preset: 'claude_code',
        append: this.systemPromptAppend,
      };
    }
    const canUseTool = this.deps.makeCanUseTool?.(this);
    if (canUseTool) options.canUseTool = canUseTool;
    const mcpServers = this.deps.makeMcpServers?.(this);
    if (mcpServers) options.mcpServers = mcpServers;
    return options;
  }

  private async consume(): Promise<void> {
    try {
      for await (const msg of this.q as Query) {
        this.handle(msg);
      }
      if (!isTerminal(this.sm.state)) this.sm.to('done');
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[agent-session ${this.id}] query loop error:`, err);
      this.sm.to('error', { force: true });
    }
  }

  private handle(msg: SDKMessage): void {
    // Seed tool attribution from assistant tool_use blocks before normalizing.
    if (msg.type === 'assistant') {
      const content = (msg.message as { content?: unknown })?.content;
      if (Array.isArray(content)) {
        for (const block of content as Array<Record<string, unknown>>) {
          if (block.type === 'tool_use' && typeof block.id === 'string') {
            this.tools.set(block.id, { name: String(block.name ?? ''), input: block.input });
          }
        }
      }
    }

    for (const n of normalize(msg, { resolveTool: (id) => this.tools.get(id) })) {
      this.emit(n);
    }

    if (msg.type === 'result') this.onResult(msg);
  }

  private onResult(msg: Extract<SDKMessage, { type: 'result' }>): void {
    const usage = msg.usage as { input_tokens?: number; output_tokens?: number } | undefined;
    const input = usage?.input_tokens ?? 0;
    const output = usage?.output_tokens ?? 0;
    const cost = msg.total_cost_usd ?? 0;

    this.descriptor.totals.input += input;
    this.descriptor.totals.output += output;
    this.descriptor.totals.cost_usd += cost;

    try {
      db.update(sessions)
        .set({
          inputTokens: this.descriptor.totals.input,
          outputTokens: this.descriptor.totals.output,
          costUsd: this.descriptor.totals.cost_usd,
        })
        .where(eq(sessions.sessionId, this.id))
        .run();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[agent-session] totals update failed:', err);
    }

    eventBus.emitTokenTick({ session_id: this.id, input, output, cost_usd: cost });
  }

  private emit(n: NormalizedEvent): void {
    this.descriptor.lastEventAt = Date.now();
    eventBus.emit({
      session_id: this.id,
      agent_name: this.descriptor.name,
      ...n,
    });
  }

  private onStateChange(from: AgentState, to: AgentState): void {
    this.descriptor.state = to;
    try {
      const patch: { state: AgentState; endedAt?: number } = { state: to };
      if (isTerminal(to)) patch.endedAt = Date.now();
      db.update(sessions).set(patch).where(eq(sessions.sessionId, this.id)).run();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[agent-session] state persist failed:', err);
    }
    eventBus.emit({
      session_id: this.id,
      agent_name: this.descriptor.name,
      hook_event_type: 'cc.agent.state',
      payload: { state: to, from },
    });
    eventBus.emitAgentState({ ...this.descriptor });
  }
}
