<template>
  <div
    class="mb-3 p-3 rounded-lg border-l-4 bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)]"
    :class="isResolved
      ? 'border-l-[var(--theme-accent-success)]'
      : 'border-l-[var(--theme-accent-warning)] ring-1 ring-[var(--theme-accent-warning)]/20'"
    @click.stop
  >
    <!-- Question Header -->
    <div class="mb-2.5">
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <div
            class="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
            :class="isResolved ? 'bg-[var(--theme-accent-success)]/15' : 'bg-[var(--theme-accent-warning)]/15'"
          >
            <svg v-if="event.humanInTheLoop!.type === 'permission'" class="w-3.5 h-3.5" :class="isResolved ? 'text-[var(--theme-accent-success)]' : 'text-[var(--theme-accent-warning)]'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <svg v-else-if="event.humanInTheLoop!.type === 'choice'" class="w-3.5 h-3.5" :class="isResolved ? 'text-[var(--theme-accent-success)]' : 'text-[var(--theme-accent-warning)]'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg v-else class="w-3.5 h-3.5" :class="isResolved ? 'text-[var(--theme-accent-success)]' : 'text-[var(--theme-accent-warning)]'" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-sm font-semibold" :class="isResolved ? 'text-[var(--theme-accent-success)]' : 'text-[var(--theme-accent-warning)]'">
            {{ hitlTypeLabel }}
          </h3>
          <span v-if="permissionType" class="text-xs font-mono px-1.5 py-0.5 rounded bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] text-[var(--theme-text-secondary)]">
            {{ permissionType }}
          </span>
        </div>
        <div class="flex items-center gap-2">
          <span v-if="!isResolved" class="inline-flex items-center gap-1 text-xs text-[var(--theme-accent-warning)]">
            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
            Awaiting
          </span>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-8">
        <span
          class="text-xs font-medium px-1.5 py-0.5 rounded border"
          :style="{ backgroundColor: appBgStyle.backgroundColor, borderColor: appBorderStyle.borderColor, color: appBorderStyle.borderColor }"
        >
          {{ event.source_app }}
        </span>
        <span class="text-xs font-mono text-[var(--theme-text-quaternary)]">
          {{ sessionIdShort }}
        </span>
        <span class="text-xs text-[var(--theme-text-quaternary)] tabular-nums">
          {{ formatTime(event.timestamp) }}
        </span>
      </div>
    </div>

    <!-- Question Text -->
    <div class="mb-3 ml-8 p-2.5 bg-[var(--theme-bg-secondary)] rounded-md border border-[var(--theme-border-primary)]">
      <p class="text-sm text-[var(--theme-text-primary)]">
        {{ event.humanInTheLoop!.question }}
      </p>
    </div>

    <!-- Inline Response Display (Optimistic UI) -->
    <div v-if="displayResponse" class="mb-3 ml-8 p-2.5 bg-[var(--theme-accent-success)]/5 rounded-md border border-[var(--theme-accent-success)]/30">
      <div class="flex items-center gap-1.5 mb-1">
        <svg class="w-3.5 h-3.5 text-[var(--theme-accent-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
        <span class="text-xs font-semibold text-[var(--theme-accent-success)]">Response submitted</span>
      </div>
      <div v-if="displayResponse.response" class="text-sm text-[var(--theme-text-primary)]">
        {{ displayResponse.response }}
      </div>
      <div v-if="displayResponse.permission !== undefined" class="text-sm text-[var(--theme-text-primary)]">
        {{ displayResponse.permission ? 'Approved' : 'Denied' }}
      </div>
      <div v-if="displayResponse.choice" class="text-sm text-[var(--theme-text-primary)]">
        {{ displayResponse.choice }}
      </div>
    </div>

    <!-- Response UI: Question -->
    <div v-if="event.humanInTheLoop!.type === 'question'" class="ml-8">
      <textarea
        v-model="responseText"
        class="w-full p-2.5 text-sm border border-[var(--theme-border-secondary)] rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] bg-[var(--theme-bg-primary)] text-[var(--theme-text-primary)] resize-none transition-colors"
        rows="2"
        placeholder="Type your response..."
        @click.stop
      ></textarea>
      <div class="flex justify-end mt-2">
        <button
          @click.stop="handleSubmitResponse"
          :disabled="!responseText.trim() || isSubmitting || hasSubmittedResponse"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-[var(--theme-accent-success)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-opacity duration-150"
        >
          <svg v-if="isSubmitting" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
          {{ isSubmitting ? 'Sending...' : 'Submit' }}
        </button>
      </div>
    </div>

    <!-- Response UI: Permission -->
    <div v-else-if="event.humanInTheLoop!.type === 'permission'" class="ml-8">
      <div class="flex justify-end items-center gap-2">
        <span v-if="isResolved" class="text-xs font-medium text-[var(--theme-accent-success)] px-2 py-1 bg-[var(--theme-accent-success)]/10 rounded">
          Responded
        </span>
        <button
          @click.stop="handleSubmitPermission(false)"
          :disabled="isSubmitting || hasSubmittedResponse"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[var(--theme-accent-error)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-opacity duration-150"
        >
          Deny
        </button>
        <button
          @click.stop="handleSubmitPermission(true)"
          :disabled="isSubmitting || hasSubmittedResponse"
          class="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-[var(--theme-accent-success)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-opacity duration-150"
        >
          Approve
        </button>
      </div>
    </div>

    <!-- Response UI: Choice -->
    <div v-else-if="event.humanInTheLoop!.type === 'choice'" class="ml-8">
      <div class="flex flex-wrap gap-2 justify-end">
        <button
          v-for="choice in event.humanInTheLoop!.choices"
          :key="choice"
          @click.stop="handleSubmitChoice(choice)"
          :disabled="isSubmitting || hasSubmittedResponse"
          class="px-3 py-1.5 text-sm font-medium text-white bg-[var(--theme-primary)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed rounded-md transition-opacity duration-150"
        >
          {{ isSubmitting ? 'Sending...' : choice }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { HookEvent, HumanInTheLoopResponse } from '../types';
import { useHITLSubmit } from '../composables/useHITLSubmit';

const props = defineProps<{
  event: HookEvent;
  appBgStyle: Record<string, string>;
  appBorderStyle: Record<string, string>;
  borderColorClass: string;
}>();

const emit = defineEmits<{
  (e: 'response-submitted', response: HumanInTheLoopResponse): void;
}>();

const {
  responseText,
  isSubmitting,
  hasSubmittedResponse,
  localResponse,
  submitResponse,
  submitPermission,
  submitChoice
} = useHITLSubmit(() => props.event);

const sessionIdShort = computed(() => props.event.session_id.slice(0, 8));

const isResolved = computed(() =>
  hasSubmittedResponse.value || props.event.humanInTheLoopStatus?.status === 'responded'
);

const displayResponse = computed(() => {
  const local = localResponse.value;
  const server = props.event.humanInTheLoopStatus?.response;
  if (!local && !server) return null;
  return {
    response: local?.response || server?.response,
    permission: local?.permission ?? server?.permission,
    choice: local?.choice || server?.choice
  };
});

const hitlTypeLabel = computed(() => {
  const labelMap: Record<string, string> = {
    question: 'Agent Question',
    permission: 'Permission Request',
    choice: 'Choice Required'
  };
  return labelMap[props.event.humanInTheLoop?.type || ''] || 'Question';
});

const permissionType = computed(() => props.event.payload?.permission_type || null);

const formatTime = (timestamp?: number) => {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString();
};

const handleSubmitResponse = async () => {
  const result = await submitResponse();
  if (result) emit('response-submitted', result);
};

const handleSubmitPermission = async (approved: boolean) => {
  const result = await submitPermission(approved);
  if (result) emit('response-submitted', result);
};

const handleSubmitChoice = async (choice: string) => {
  const result = await submitChoice(choice);
  if (result) emit('response-submitted', result);
};
</script>

