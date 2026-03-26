<template>
  <div class="mt-2 pt-2 border-t border-[var(--theme-border-primary)] space-y-2">
    <!-- Payload -->
    <div>
      <div class="flex items-center justify-between mb-1.5">
        <h4 class="text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">
          Payload
        </h4>
        <button
          @click.stop="copyPayload"
          class="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] rounded border border-[var(--theme-border-primary)] transition-colors duration-150"
        >
          <svg v-if="copyButtonText === 'Copy'" class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          {{ copyButtonText }}
        </button>
      </div>
      <pre class="text-xs text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)] p-2.5 rounded-md overflow-x-auto max-h-64 overflow-y-auto font-mono border border-[var(--theme-border-primary)] leading-relaxed">{{ formattedPayload }}</pre>
    </div>

    <!-- Chat transcript button -->
    <div v-if="event.chat && event.chat.length > 0" class="flex justify-end">
      <button
        @click.stop="!isMobile && $emit('open-chat')"
        :class="[
          'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border transition-colors duration-150',
          isMobile
            ? 'bg-[var(--theme-bg-tertiary)] text-[var(--theme-text-quaternary)] border-[var(--theme-border-primary)] cursor-not-allowed opacity-50'
            : 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary)]/20'
        ]"
        :disabled="isMobile"
      >
        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {{ isMobile ? 'Desktop only' : `Chat transcript (${event.chat.length})` }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent } from '../types';
import { useMediaQuery } from '../composables/useMediaQuery';

const props = defineProps<{
  event: HookEvent;
}>();

defineEmits<{
  (e: 'open-chat'): void;
}>();

const { isMobile } = useMediaQuery();

const copyButtonText = ref('Copy');

const formattedPayload = computed(() => {
  return JSON.stringify(props.event.payload, null, 2);
});

const copyPayload = async () => {
  try {
    await navigator.clipboard.writeText(formattedPayload.value);
    copyButtonText.value = 'Copied!';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
    copyButtonText.value = 'Failed';
    setTimeout(() => {
      copyButtonText.value = 'Copy';
    }, 2000);
  }
};
</script>
