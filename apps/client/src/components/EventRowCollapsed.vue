<template>
  <div>
    <!-- App color indicator -->
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
      :style="{ backgroundColor: appHexColor }"
    ></div>

    <div class="ml-3">
      <!-- Single unified layout (responsive) -->
      <div class="flex items-start justify-between gap-2 mb-1">
        <div class="flex items-center gap-2 flex-wrap min-w-0">
          <!-- Source app badge -->
          <span
            class="inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded border"
            :style="{ backgroundColor: appHexColor + '15', borderColor: appHexColor + '40', color: appHexColor }"
          >
            {{ event.source_app }}
          </span>
          <!-- Session ID -->
          <span class="text-xs font-mono text-[var(--theme-text-quaternary)]">
            {{ sessionIdShort }}
          </span>
          <!-- Team info -->
          <span v-if="teamInfo" class="text-xs text-[var(--theme-text-tertiary)] px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)]">
            {{ teamInfo.team_name }}
            <span class="opacity-60">{{ teamInfo.is_team_lead ? 'lead' : teamInfo.teammate_name }}</span>
          </span>
          <!-- Spawned agent info (SubagentStart/SubagentStop) -->
          <span v-if="spawnedAgentName" class="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            {{ spawnedAgentName }}
          </span>
          <span v-if="spawnedTeamName" class="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-[var(--theme-accent-info)]/10 text-[var(--theme-accent-info)] border border-[var(--theme-accent-info)]/20">
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            {{ spawnedTeamName }}
          </span>
          <!-- Agent type (for subagents without a name) -->
          <span v-if="agentType && !spawnedAgentName" class="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]">
            {{ agentType }}
          </span>
          <!-- Model name -->
          <span v-if="event.model_name" class="text-xs text-[var(--theme-text-quaternary)] font-mono" :title="`Model: ${event.model_name}`">
            {{ formatModelName(event.model_name) }}
          </span>
        </div>
        <!-- Timestamp -->
        <span class="text-xs text-[var(--theme-text-quaternary)] tabular-nums whitespace-nowrap flex-shrink-0">
          {{ formatTime(event.timestamp) }}
        </span>
      </div>

      <!-- Event type + tool info row -->
      <div class="flex items-center gap-2 flex-wrap">
        <!-- Hook event type badge -->
        <span :class="[
          'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
          eventTypeClass
        ]">
          {{ event.hook_event_type }}
        </span>
        <!-- Tool name -->
        <span v-if="toolName" class="inline-flex items-center text-xs font-mono font-medium text-[var(--theme-primary)] bg-[var(--theme-primary)]/8 px-1.5 py-0.5 rounded">
          {{ toolName }}
        </span>
        <!-- Tool detail -->
        <span v-if="toolInfo?.detail" class="text-xs text-[var(--theme-text-tertiary)] truncate max-w-xs mobile:max-w-[200px]" :class="{ 'italic': event.hook_event_type === 'UserPromptSubmit' }">
          {{ toolInfo.detail }}
        </span>
      </div>

      <!-- Summary -->
      <div v-if="event.summary" class="mt-1.5 text-xs text-[var(--theme-text-secondary)] bg-[var(--theme-bg-secondary)] px-2 py-1 rounded border border-[var(--theme-border-primary)]">
        {{ event.summary }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HookEvent } from '../types';
import { formatModelName } from '../utils/formatters';

const props = defineProps<{
  event: HookEvent;
  gradientClass: string;
  colorClass: string;
  appHexColor: string;
}>();

const sessionIdShort = computed(() => props.event.session_id.slice(0, 8));

const teamInfo = computed(() => props.event.payload?.team_info || null);

const spawnedAgentName = computed(() => {
  const payload = props.event.payload;
  // Explicit field from send_event.py enrichment
  if (payload?.spawned_agent_name) return payload.spawned_agent_name;
  // Parse name@team format from agent_id
  const agentId = payload?.agent_id;
  if (agentId && agentId.includes('@')) return agentId.split('@')[0];
  return null;
});

const spawnedTeamName = computed(() => {
  const payload = props.event.payload;
  if (payload?.spawned_team_name) return payload.spawned_team_name;
  const agentId = payload?.agent_id;
  if (agentId && agentId.includes('@')) return agentId.split('@')[1];
  return null;
});

const agentType = computed(() => {
  const payload = props.event.payload;
  if (['SubagentStart', 'SubagentStop'].includes(props.event.hook_event_type)) {
    return payload?.agent_type || null;
  }
  return null;
});

const toolName = computed(() => {
  const toolEvents = ['PreToolUse', 'PostToolUse', 'PostToolUseFailure', 'PermissionRequest'];
  if (toolEvents.includes(props.event.hook_event_type) && props.event.payload?.tool_name) {
    return props.event.payload.tool_name;
  }
  return null;
});

const eventTypeClass = computed(() => {
  const typeStyles: Record<string, string> = {
    'PostToolUse': 'bg-[var(--theme-accent-success)]/15 text-[var(--theme-accent-success)]',
    'PostToolUseFailure': 'bg-[var(--theme-accent-error)]/15 text-[var(--theme-accent-error)]',
    'PreToolUse': 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]',
    'PermissionRequest': 'bg-[var(--theme-accent-warning)]/15 text-[var(--theme-accent-warning)]',
    'Stop': 'bg-[var(--theme-accent-error)]/10 text-[var(--theme-accent-error)]',
    'Notification': 'bg-[var(--theme-accent-info)]/10 text-[var(--theme-accent-info)]',
    'SubagentStart': 'bg-[var(--theme-accent-success)]/10 text-[var(--theme-accent-success)]',
    'SubagentStop': 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]',
    'SessionStart': 'bg-[var(--theme-accent-success)]/10 text-[var(--theme-accent-success)]',
    'SessionEnd': 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]',
    'UserPromptSubmit': 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]',
    'PreCompact': 'bg-[var(--theme-accent-warning)]/10 text-[var(--theme-accent-warning)]',
  };
  return typeStyles[props.event.hook_event_type] || 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-secondary)]';
});

const toolInfo = computed(() => {
  const payload = props.event.payload;

  if (props.event.hook_event_type === 'UserPromptSubmit' && payload.prompt) {
    return {
      tool: 'Prompt:',
      detail: `"${payload.prompt.slice(0, 100)}${payload.prompt.length > 100 ? '...' : ''}"`
    };
  }

  if (props.event.hook_event_type === 'PreCompact') {
    const trigger = payload.trigger || 'unknown';
    return {
      tool: 'Compaction:',
      detail: trigger === 'manual' ? 'Manual compaction' : 'Auto-compaction (full context)'
    };
  }

  if (props.event.hook_event_type === 'SessionStart') {
    const source = payload.source || 'unknown';
    const sourceLabels: Record<string, string> = {
      'startup': 'New session',
      'resume': 'Resuming session',
      'clear': 'Fresh session'
    };
    return {
      tool: 'Session:',
      detail: sourceLabels[source] || source
    };
  }

  if (payload.tool_name) {
    const info: { tool: string; detail?: string } = { tool: payload.tool_name };

    if (payload.tool_input) {
      const input = payload.tool_input;
      if (input.command) {
        info.detail = input.command.slice(0, 50) + (input.command.length > 50 ? '...' : '');
      } else if (input.file_path) {
        info.detail = input.file_path.split('/').pop();
      } else if (input.pattern) {
        info.detail = input.pattern;
      } else if (input.url) {
        info.detail = input.url.slice(0, 60) + (input.url.length > 60 ? '...' : '');
      } else if (input.query) {
        info.detail = `"${input.query.slice(0, 50)}${input.query.length > 50 ? '...' : ''}"`;
      } else if (input.notebook_path) {
        info.detail = input.notebook_path.split('/').pop();
      } else if (input.recipient) {
        info.detail = `→ ${input.recipient}${input.summary ? ': ' + input.summary : ''}`;
      } else if (input.subject) {
        info.detail = input.subject;
      } else if (input.taskId) {
        info.detail = `#${input.taskId}${input.status ? ' → ' + input.status : ''}`;
      } else if (input.description && input.subagent_type) {
        info.detail = `${input.subagent_type}: ${input.description}`;
      } else if (input.task_id) {
        info.detail = `task: ${input.task_id}`;
      } else if (input.team_name) {
        info.detail = input.team_name;
      } else if (input.skill) {
        info.detail = input.skill;
      }
    }

    return info;
  }

  return null;
});

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString();
};
</script>
