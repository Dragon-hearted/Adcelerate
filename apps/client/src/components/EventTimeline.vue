<template>
  <div class="flex-1 mobile:h-[50vh] overflow-hidden flex flex-col">
    <!-- Fixed Header -->
    <div class="px-4 py-3 mobile:px-3 mobile:py-2 bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)] relative z-10">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-sm font-semibold text-[var(--theme-text-primary)] uppercase tracking-wider">
          Event Stream
        </h2>
        <span v-if="filteredEvents.length > 0" class="text-xs text-[var(--theme-text-quaternary)] tabular-nums">
          {{ filteredEvents.length }} event{{ filteredEvents.length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- Agent/App Tags Row -->
      <div v-if="displayedAgentIds.length > 0" class="mb-2 flex flex-wrap gap-1.5 mobile:gap-1">
        <button
          v-for="agentId in displayedAgentIds"
          :key="agentId"
          @click="emit('selectAgent', agentId)"
          :class="[
            'inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border transition-all duration-150 cursor-pointer',
            isAgentActive(agentId)
              ? 'border-transparent'
              : 'border-transparent opacity-40 hover:opacity-70'
          ]"
          :style="{
            borderColor: getHexColorForApp(getAppNameFromAgentId(agentId)) + '60',
            backgroundColor: getHexColorForApp(getAppNameFromAgentId(agentId)) + (isAgentActive(agentId) ? '20' : '10'),
            color: getHexColorForApp(getAppNameFromAgentId(agentId))
          }"
          :title="`${isAgentActive(agentId) ? 'Active' : 'Sleeping'} — click to add ${agentId} to swim lanes`"
        >
          <span
            class="w-1.5 h-1.5 rounded-full flex-shrink-0"
            :class="isAgentActive(agentId) ? 'animate-pulse' : ''"
            :style="{ backgroundColor: getHexColorForApp(getAppNameFromAgentId(agentId)) }"
          ></span>
          <span class="font-mono">{{ agentId }}</span>
          <span v-if="getTeamForAgent(agentId)" class="opacity-60">{{ getTeamForAgent(agentId) }}</span>
        </button>
      </div>

      <!-- Search Bar -->
      <div class="w-full">
        <div class="relative">
          <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--theme-text-quaternary)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            :value="searchPattern"
            @input="updateSearchPattern(($event.target as HTMLInputElement).value)"
            placeholder="Search events (regex)..."
            :class="[
              'w-full pl-8 pr-8 py-1.5 rounded-md text-sm mobile:text-xs font-mono border transition-colors duration-150',
              'bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] placeholder-[var(--theme-text-quaternary)]',
              'border-[var(--theme-border-primary)] focus:border-[var(--theme-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--theme-primary)]',
              searchError ? 'border-[var(--theme-accent-error)] focus:ring-[var(--theme-accent-error)]' : ''
            ]"
            aria-label="Search events with regex pattern"
          />
          <button
            v-if="searchPattern"
            @click="clearSearch"
            class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] transition-colors"
            title="Clear search"
            aria-label="Clear search"
          >
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div
          v-if="searchError"
          class="mt-1 px-2 py-1 bg-[var(--theme-accent-error)]/10 border border-[var(--theme-accent-error)]/30 rounded text-xs text-[var(--theme-accent-error)]"
          role="alert"
        >
          {{ searchError }}
        </div>
      </div>
    </div>
    
    <!-- Scrollable Event List -->
    <div 
      ref="scrollContainer"
      class="flex-1 overflow-y-auto px-3 py-3 mobile:px-2 mobile:py-1.5 relative"
      @scroll="handleScroll"
    >
      <TransitionGroup
        name="event"
        tag="div"
        class="space-y-2 mobile:space-y-1.5"
      >
        <EventRow
          v-for="event in filteredEvents"
          :key="`${event.id}-${event.timestamp}`"
          :event="event"
          :gradient-class="getGradientForSession(event.session_id)"
          :color-class="getColorForSession(event.session_id)"
          :app-gradient-class="getGradientForApp(event.source_app)"
          :app-color-class="getColorForApp(event.source_app)"
          :app-hex-color="getHexColorForApp(event.source_app)"
        />
      </TransitionGroup>
      
      <div v-if="filteredEvents.length === 0" class="flex flex-col items-center justify-center py-16 mobile:py-10 text-center">
        <div class="w-12 h-12 mb-4 rounded-full bg-[var(--theme-bg-tertiary)] flex items-center justify-center">
          <svg class="w-6 h-6 text-[var(--theme-text-quaternary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-[var(--theme-text-secondary)] mb-1">Waiting for agent events</p>
        <p class="text-xs text-[var(--theme-text-quaternary)] max-w-xs">Events will appear here as agents start sending data through the WebSocket connection.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { HookEvent } from '../types';
import EventRow from './EventRow.vue';
import { useEventColors } from '../composables/useEventColors';
import { useEventSearch } from '../composables/useEventSearch';

const props = defineProps<{
  events: HookEvent[];
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
    team: string;
  };
  stickToBottom: boolean;
  uniqueAppNames?: string[]; // Agent IDs (app:session) active in current time window
  allAppNames?: string[]; // All agent IDs (app:session) ever seen in session
}>();

const emit = defineEmits<{
  'update:stickToBottom': [value: boolean];
  selectAgent: [agentName: string];
}>();

const scrollContainer = ref<HTMLElement>();
const { getGradientForSession, getColorForSession, getGradientForApp, getColorForApp, getHexColorForApp } = useEventColors();
const { searchPattern, searchError, searchEvents, updateSearchPattern, clearSearch } = useEventSearch();

// Use all agent IDs, preferring allAppNames if available (all ever seen), fallback to uniqueAppNames (active in time window)
const displayedAgentIds = computed(() => {
  return props.allAppNames?.length ? props.allAppNames : (props.uniqueAppNames || []);
});

// Extract app name from agent ID (format: "app:session")
const getAppNameFromAgentId = (agentId: string): string => {
  return agentId.split(':')[0];
};

// Check if an agent is currently active (has events in the current time window)
const isAgentActive = (agentId: string): boolean => {
  return (props.uniqueAppNames || []).includes(agentId);
};

// Get team name for an agent from its events
const getTeamForAgent = (agentId: string): string | null => {
  const [appName, sessionId] = agentId.split(':');
  for (const event of props.events) {
    if (event.source_app === appName && event.session_id?.startsWith(sessionId)) {
      const teamName = event.payload?.team_info?.team_name;
      if (teamName) return teamName;
    }
  }
  return null;
};

const filteredEvents = computed(() => {
  let filtered = props.events.filter(event => {
    if (props.filters.sourceApp && event.source_app !== props.filters.sourceApp) {
      return false;
    }
    if (props.filters.sessionId && event.session_id !== props.filters.sessionId) {
      return false;
    }
    if (props.filters.eventType && event.hook_event_type !== props.filters.eventType) {
      return false;
    }
    if (props.filters.team && event.payload?.team_info?.team_name !== props.filters.team) {
      return false;
    }
    return true;
  });

  // Apply regex search filter
  if (searchPattern.value) {
    filtered = searchEvents(filtered, searchPattern.value);
  }

  return filtered;
});

const scrollToBottom = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
  }
};

const handleScroll = () => {
  if (!scrollContainer.value) return;
  
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
  
  if (isAtBottom !== props.stickToBottom) {
    emit('update:stickToBottom', isAtBottom);
  }
};

watch(() => props.events.length, async () => {
  if (props.stickToBottom) {
    await nextTick();
    scrollToBottom();
  }
});

watch(() => props.stickToBottom, (shouldStick) => {
  if (shouldStick) {
    scrollToBottom();
  }
});
</script>

<style scoped>
.event-enter-active {
  transition: all 0.3s ease;
}

.event-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.event-leave-active {
  transition: all 0.3s ease;
}

.event-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>