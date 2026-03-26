<template>
  <div class="h-screen flex flex-col bg-[var(--theme-bg-secondary)]">
    <!-- Header -->
    <header class="short:hidden bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)] shadow-sm">
      <div class="px-4 py-2.5 mobile:py-2 mobile:px-3 flex items-center justify-between gap-3">
        <!-- Logo + Title -->
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="flex-shrink-0 w-8 h-8 mobile:w-6 mobile:h-6 rounded-lg bg-[var(--theme-primary)] flex items-center justify-center">
            <svg class="w-5 h-5 mobile:w-4 mobile:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 class="text-lg mobile:text-sm font-semibold text-[var(--theme-text-primary)] truncate">
            <span class="mobile:hidden">Multi-Agent Observability</span>
            <span class="hidden mobile:inline">Observability</span>
          </h1>
        </div>

        <!-- Connection Status Badge -->
        <div
          v-if="isConnected"
          class="flex items-center gap-1.5 px-2.5 py-1 mobile:px-2 rounded-full bg-[var(--theme-accent-success)]/10 border border-[var(--theme-accent-success)]/30"
        >
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-accent-success)] opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-[var(--theme-accent-success)]"></span>
          </span>
          <span class="text-xs font-medium text-[var(--theme-accent-success)] mobile:hidden">Connected</span>
        </div>
        <div
          v-else
          class="flex items-center gap-1.5 px-2.5 py-1 mobile:px-2 rounded-full bg-[var(--theme-accent-error)]/10 border border-[var(--theme-accent-error)]/30"
        >
          <span class="flex h-2 w-2">
            <span class="inline-flex rounded-full h-2 w-2 bg-[var(--theme-accent-error)]"></span>
          </span>
          <span class="text-xs font-medium text-[var(--theme-accent-error)] mobile:hidden">Disconnected</span>
        </div>

        <!-- Toolbar -->
        <div class="flex items-center gap-1.5 mobile:gap-1">
          <!-- Event Count Badge -->
          <span class="text-xs font-medium text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] px-2.5 py-1 rounded-full tabular-nums">
            {{ events.length }} <span class="mobile:hidden">events</span>
          </span>

          <!-- Clear Button -->
          <button
            @click="handleClearClick"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 mobile:px-2 rounded-md text-sm mobile:text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] transition-colors duration-150"
            title="Clear events"
          >
            <svg class="w-4 h-4 mobile:w-3.5 mobile:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span class="mobile:hidden">Clear</span>
          </button>

          <!-- Filters Toggle -->
          <button
            @click="showFilters = !showFilters"
            :class="[
              'inline-flex items-center gap-1.5 px-2.5 py-1.5 mobile:px-2 rounded-md text-sm mobile:text-xs font-medium border transition-colors duration-150',
              showFilters
                ? 'text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/30'
                : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] border-[var(--theme-border-primary)]'
            ]"
            :title="showFilters ? 'Hide filters' : 'Show filters'"
          >
            <svg class="w-4 h-4 mobile:w-3.5 mobile:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span class="mobile:hidden">Filters</span>
          </button>

          <!-- Theme Button -->
          <button
            @click="handleThemeManagerClick"
            class="inline-flex items-center gap-1.5 px-2.5 py-1.5 mobile:px-2 rounded-md text-sm mobile:text-xs font-medium text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)] bg-[var(--theme-bg-secondary)] hover:bg-[var(--theme-bg-tertiary)] border border-[var(--theme-border-primary)] transition-colors duration-150"
            title="Open theme manager"
          >
            <svg class="w-4 h-4 mobile:w-3.5 mobile:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            <span class="mobile:hidden">Theme</span>
          </button>
        </div>
      </div>
    </header>
    
    <!-- Filters -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-2 max-h-0"
      enter-to-class="opacity-100 translate-y-0 max-h-40"
      leave-from-class="opacity-100 translate-y-0 max-h-40"
      leave-to-class="opacity-0 -translate-y-2 max-h-0"
    >
      <FilterPanel
        v-if="showFilters"
        class="short:hidden overflow-hidden"
        :filters="filters"
        :events="events"
        @update:filters="filters = $event"
      />
    </Transition>
    
    <!-- Live Pulse Chart -->
    <LivePulseChart
      :events="events"
      :filters="filters"
      @update-unique-apps="uniqueAppNames = $event"
      @update-all-apps="allAppNames = $event"
      @update-time-range="currentTimeRange = $event"
    />

    <!-- Agent Swim Lane Container (below pulse chart, full width, hidden when empty) -->
    <div v-if="selectedAgentLanes.length > 0" class="w-full bg-[var(--theme-bg-secondary)] px-3 py-4 mobile:px-2 mobile:py-2 overflow-hidden">
      <AgentSwimLaneContainer
        :selected-agents="selectedAgentLanes"
        :events="events"
        :time-range="currentTimeRange"
        @update:selected-agents="selectedAgentLanes = $event"
      />
    </div>
    
    <!-- Timeline -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <EventTimeline
        :events="events"
        :filters="filters"
        :unique-app-names="uniqueAppNames"
        :all-app-names="allAppNames"
        v-model:stick-to-bottom="stickToBottom"
        @select-agent="toggleAgentLane"
      />
    </div>
    
    <!-- Stick to bottom button -->
    <StickScrollButton
      class="short:hidden"
      :stick-to-bottom="stickToBottom"
      @toggle="stickToBottom = !stickToBottom"
    />
    
    <!-- Error / Disconnected Banner -->
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="!isConnected"
        class="fixed bottom-4 left-4 right-4 mobile:bottom-3 mobile:left-3 mobile:right-3 z-40"
      >
        <div class="max-w-md mx-auto bg-[var(--theme-bg-primary)] border border-[var(--theme-accent-error)]/40 rounded-lg shadow-lg p-3 flex items-center gap-3">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--theme-accent-error)]/10 flex items-center justify-center">
            <svg class="w-4 h-4 text-[var(--theme-accent-error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-[var(--theme-text-primary)]">Connection lost</p>
            <p class="text-xs text-[var(--theme-text-tertiary)]">{{ error || 'Attempting to reconnect...' }}</p>
          </div>
          <div class="flex-shrink-0">
            <svg class="w-4 h-4 text-[var(--theme-text-quaternary)] animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        </div>
      </div>
    </Transition>
    
    <!-- Theme Manager -->
    <ThemeManager
      :is-open="showThemeManager"
      @close="showThemeManager = false"
    />

    <!-- Toast Notifications -->
    <ToastNotification
      v-for="(toast, index) in toasts"
      :key="toast.id"
      :index="index"
      :agent-name="toast.agentName"
      :agent-color="toast.agentColor"
      @dismiss="dismissToast(toast.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { TimeRange } from './types';
import { useWebSocket } from './composables/useWebSocket';
import { useThemes } from './composables/useThemes';
import { useEventColors } from './composables/useEventColors';
import EventTimeline from './components/EventTimeline.vue';
import FilterPanel from './components/FilterPanel.vue';
import StickScrollButton from './components/StickScrollButton.vue';
import LivePulseChart from './components/LivePulseChart.vue';
import ThemeManager from './components/ThemeManager.vue';
import ToastNotification from './components/ToastNotification.vue';
import AgentSwimLaneContainer from './components/AgentSwimLaneContainer.vue';
import { WS_URL } from './config';

// WebSocket connection
const { events, isConnected, error, clearEvents } = useWebSocket(WS_URL);

// Theme management (sets up theme system)
useThemes();

// Event colors
const { getHexColorForApp } = useEventColors();

// Filters
const filters = ref({
  sourceApp: '',
  sessionId: '',
  eventType: '',
  team: ''
});

// UI state
const stickToBottom = ref(true);
const showThemeManager = ref(false);
const showFilters = ref(false);
const uniqueAppNames = ref<string[]>([]); // Apps active in current time window
const allAppNames = ref<string[]>([]); // All apps ever seen in session
const selectedAgentLanes = ref<string[]>([]);
const currentTimeRange = ref<TimeRange>('1m'); // Current time range from LivePulseChart

// Toast notifications
interface Toast {
  id: number;
  agentName: string;
  agentColor: string;
}
const toasts = ref<Toast[]>([]);
let toastIdCounter = 0;
const seenAgents = new Set<string>();

// Watch for new agents and show toast
watch(uniqueAppNames, (newAppNames) => {
  // Find agents that are new (not in seenAgents set)
  newAppNames.forEach(appName => {
    if (!seenAgents.has(appName)) {
      seenAgents.add(appName);
      // Show toast for new agent
      const toast: Toast = {
        id: toastIdCounter++,
        agentName: appName,
        agentColor: getHexColorForApp(appName)
      };
      toasts.value.push(toast);
    }
  });
}, { deep: true });

const dismissToast = (id: number) => {
  const index = toasts.value.findIndex(t => t.id === id);
  if (index !== -1) {
    toasts.value.splice(index, 1);
  }
};

// Handle agent tag clicks for swim lanes
const toggleAgentLane = (agentName: string) => {
  const index = selectedAgentLanes.value.indexOf(agentName);
  if (index >= 0) {
    // Remove from comparison
    selectedAgentLanes.value.splice(index, 1);
  } else {
    // Add to comparison
    selectedAgentLanes.value.push(agentName);
  }
};

// Handle clear button click
const handleClearClick = () => {
  clearEvents();
  selectedAgentLanes.value = [];
};

// Debug handler for theme manager
const handleThemeManagerClick = () => {
  console.log('Theme manager button clicked!');
  showThemeManager.value = true;
};
</script>