<template>
  <div>
    <!-- HITL Interaction -->
    <HITLInteraction
      v-if="event.humanInTheLoop && (event.humanInTheLoopStatus?.status === 'pending' || event.humanInTheLoopStatus?.status === 'responded')"
      :event="event"
      :app-bg-style="appBgStyle"
      :app-border-style="appBorderStyle"
      :border-color-class="borderColorClass"
      @response-submitted="(response) => emit('response-submitted', response)"
    />

    <!-- Standard Event Row (non-HITL) -->
    <div
      v-if="!event.humanInTheLoop"
      class="group relative p-3 mobile:p-2 rounded-md cursor-pointer border transition-all duration-150 bg-[var(--theme-bg-primary)]"
      :class="[
        isExpanded
          ? 'border-[var(--theme-primary)] shadow-md'
          : 'border-[var(--theme-border-primary)] hover:border-[var(--theme-border-secondary)] hover:shadow-sm'
      ]"
      @click="isExpanded = !isExpanded"
    >
      <EventRowCollapsed
        :event="event"
        :gradient-class="gradientClass"
        :color-class="colorClass"
        :app-hex-color="appHexColor"
      />

      <EventRowExpanded
        v-if="isExpanded"
        :event="event"
        @open-chat="showChatModal = true"
      />
    </div>

    <!-- Chat Modal -->
    <ChatTranscriptModal
      v-if="event.chat && event.chat.length > 0"
      :is-open="showChatModal"
      :chat="event.chat"
      @close="showChatModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { HookEvent, HumanInTheLoopResponse } from '../types';
import HITLInteraction from './HITLInteraction.vue';
import EventRowCollapsed from './EventRowCollapsed.vue';
import EventRowExpanded from './EventRowExpanded.vue';
import ChatTranscriptModal from './ChatTranscriptModal.vue';

const props = defineProps<{
  event: HookEvent;
  gradientClass: string;
  colorClass: string;
  appGradientClass: string;
  appColorClass: string;
  appHexColor: string;
}>();

const emit = defineEmits<{
  (e: 'response-submitted', response: HumanInTheLoopResponse): void;
}>();

const isExpanded = ref(false);
const showChatModal = ref(false);

const borderColorClass = computed(() => props.colorClass.replace('bg-', 'border-'));

const appBorderStyle = computed(() => ({
  borderColor: props.appHexColor
}));

const appBgStyle = computed(() => ({
  backgroundColor: props.appHexColor + '33'
}));
</script>
