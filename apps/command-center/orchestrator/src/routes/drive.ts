// ─────────────────────────────────────────────────────────────────────────────
// POST /api/drive — Drive-mode dispatch (slice #39 / ADR-0002).
//
// The Console's control-plane command: spawn an agent session with the
// adcelerate-execute skill loaded, record ONE durable cc.drive.requested, and
// prompt the session to route + run the task. adcelerate-execute OWNS system
// routing (it scores systems.yaml and invokes the matched system's own
// skill/CLI) — this route does NOT reimplement it.
//
// Skill loading (Task-0 de-risk result): the SDK `skills` option is a context
// FILTER over discovered skills, not a discovery root, and `settingSources:[]`
// (kept, for the canUseTool safety boundary) excludes project `.claude/skills/`.
// So the skill is made discoverable via a repo-local PLUGIN (`drive-plugin`,
// co-located here) whose `skills/adcelerate-execute` symlinks the real skill —
// default plugin discovery is independent of settingSources. Empirically
// confirmed: under settingSources:[] + this plugin the skill loads as
// `drive-plugin:adcelerate-execute`; no project settings/permissions/hooks load.
//
// REST, not a socket event — mirrors POST /api/sessions; the Console subscribes
// to the returned sessionId to stream the Run onto the Canvas (reuses the
// existing /api/ingest → step-graph:update pipe; no new emit-back path).
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import type { FastifyInstance } from 'fastify';
import type { DriveCommand } from '@command-center/shared';
import { sessionRegistry } from '../agents/registry';
import { eventBus } from '../bus/event-bus';

// Repo-local plugin dir: orchestrator/drive-plugin (this file is orchestrator/src/routes).
const DRIVE_PLUGIN_PATH = resolve(import.meta.dir, '..', '..', 'drive-plugin');
const DRIVE_SKILLS = ['adcelerate-execute'];
const DRIVE_PLUGINS = [{ type: 'local' as const, path: DRIVE_PLUGIN_PATH }];
// Plugin-qualified slash command the skill registers under (Task-0 init-probe
// finding: skills:['adcelerate-execute'] matches by `:name` suffix; the command
// is namespaced by the plugin). Deterministic trigger for the staged executor.
const DRIVE_COMMAND = '/drive-plugin:adcelerate-execute';

export async function driveRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: Partial<DriveCommand> }>('/api/drive', async (req, reply) => {
    const task = typeof req.body?.task === 'string' ? req.body.task.trim() : '';
    if (!task) return reply.code(400).send({ error: 'task is required' });
    const systemHint =
      typeof req.body?.systemHint === 'string' && req.body.systemHint.trim()
        ? req.body.systemHint.trim()
        : undefined;

    // Spawn the Drive session with the skill loaded (settingSources:[] preserved).
    const descriptor = await sessionRegistry.create({
      name: `drive-${randomUUID().slice(0, 8)}`,
      role: 'generalist',
      skills: DRIVE_SKILLS,
      plugins: DRIVE_PLUGINS,
    });

    // ONE durable control-plane record on the new session's log.
    // ponytail: the cc.cascade.requested consumer (ADR-0016 §3 cooperative-drain,
    // MAX_CONCURRENCY=5 scheduler, deferred from #42) is the FUTURE reuse of this
    // dispatch primitive — it will spawn a Drive session per cascade target the
    // same way. NOT built here (#39 ships only the Drive dispatch it sits on).
    eventBus.emit({
      session_id: descriptor.session_id,
      hook_event_type: 'cc.drive.requested',
      payload: { task, systemHint },
      summary: `drive.requested${systemHint ? ` → ${systemHint}` : ''}`,
    });

    // Prompt the session to route + run the task. adcelerate-execute scores
    // systems.yaml; the optional hint is a steer, not a reimplemented router.
    const hint = systemHint ? ` (preferred system: ${systemHint})` : '';
    sessionRegistry.prompt(descriptor.session_id, `${DRIVE_COMMAND} ${task}${hint}`);

    return reply.code(201).send({ sessionId: descriptor.session_id });
  });
}
