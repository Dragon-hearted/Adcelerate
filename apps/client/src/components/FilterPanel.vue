<template>
  <div class="bg-[var(--theme-bg-primary)] border-b border-[var(--theme-border-primary)] px-4 py-2.5 mobile:px-3 mobile:py-2">
    <div class="flex flex-wrap gap-2.5 items-end mobile:flex-col mobile:items-stretch">
      <div class="min-w-[140px] mobile:w-full">
        <label class="block text-xs font-medium text-[var(--theme-text-tertiary)] mb-1 uppercase tracking-wider">
          Source
        </label>
        <select
          v-model="localFilters.sourceApp"
          @change="updateFilters"
          class="w-full px-2.5 py-1.5 text-sm border border-[var(--theme-border-primary)] rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] transition-colors duration-150 appearance-none cursor-pointer"
        >
          <option value="">All Sources</option>
          <option v-for="app in filterOptions.source_apps" :key="app" :value="app">
            {{ app }}
          </option>
        </select>
      </div>

      <div class="min-w-[140px] mobile:w-full">
        <label class="block text-xs font-medium text-[var(--theme-text-tertiary)] mb-1 uppercase tracking-wider">
          Session
        </label>
        <select
          v-model="localFilters.sessionId"
          @change="updateFilters"
          class="w-full px-2.5 py-1.5 text-sm border border-[var(--theme-border-primary)] rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] transition-colors duration-150 appearance-none cursor-pointer"
        >
          <option value="">All Sessions</option>
          <option v-for="session in filterOptions.session_ids" :key="session" :value="session">
            {{ session.slice(0, 8) }}...
          </option>
        </select>
      </div>

      <div class="min-w-[140px] mobile:w-full">
        <label class="block text-xs font-medium text-[var(--theme-text-tertiary)] mb-1 uppercase tracking-wider">
          Event Type
        </label>
        <select
          v-model="localFilters.eventType"
          @change="updateFilters"
          class="w-full px-2.5 py-1.5 text-sm border border-[var(--theme-border-primary)] rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] transition-colors duration-150 appearance-none cursor-pointer"
        >
          <option value="">All Types</option>
          <option v-for="type in filterOptions.hook_event_types" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <div v-if="uniqueTeamNames.length > 0" class="min-w-[140px] mobile:w-full">
        <label class="block text-xs font-medium text-[var(--theme-text-tertiary)] mb-1 uppercase tracking-wider">
          Team
        </label>
        <select
          v-model="localFilters.team"
          @change="updateFilters"
          class="w-full px-2.5 py-1.5 text-sm border border-[var(--theme-border-primary)] rounded-md focus:ring-1 focus:ring-[var(--theme-primary)] focus:border-[var(--theme-primary)] bg-[var(--theme-bg-secondary)] text-[var(--theme-text-primary)] transition-colors duration-150 appearance-none cursor-pointer"
        >
          <option value="">All Teams</option>
          <option v-for="team in uniqueTeamNames" :key="team" :value="team">
            {{ team }}
          </option>
        </select>
      </div>

      <button
        v-if="hasActiveFilters"
        @click="clearFilters"
        class="px-3 py-1.5 mobile:w-full text-sm font-medium text-[var(--theme-text-secondary)] bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-bg-quaternary)] rounded-md border border-[var(--theme-border-primary)] transition-colors duration-150"
      >
        Clear Filters
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { FilterOptions, HookEvent } from '../types';
import { API_BASE_URL } from '../config';

const props = defineProps<{
  filters: {
    sourceApp: string;
    sessionId: string;
    eventType: string;
    team: string;
  };
  events: HookEvent[];
}>();

const emit = defineEmits<{
  'update:filters': [filters: typeof props.filters];
}>();

const filterOptions = ref<FilterOptions>({
  source_apps: [],
  session_ids: [],
  hook_event_types: []
});

const uniqueTeamNames = computed(() => {
  const teams = new Set<string>();
  for (const event of props.events) {
    const teamName = event.payload?.team_info?.team_name;
    if (teamName) teams.add(teamName);
  }
  return Array.from(teams).sort();
});

const localFilters = ref({ ...props.filters });

const hasActiveFilters = computed(() => {
  return localFilters.value.sourceApp || localFilters.value.sessionId || localFilters.value.eventType || localFilters.value.team;
});

const updateFilters = () => {
  emit('update:filters', { ...localFilters.value });
};

const clearFilters = () => {
  localFilters.value = {
    sourceApp: '',
    sessionId: '',
    eventType: '',
    team: ''
  };
  updateFilters();
};

const fetchFilterOptions = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/events/filter-options`);
    if (response.ok) {
      filterOptions.value = await response.json();
    }
  } catch (error) {
    console.error('Failed to fetch filter options:', error);
  }
};

let filterRefreshInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  fetchFilterOptions();
  // Refresh filter options periodically
  filterRefreshInterval = setInterval(fetchFilterOptions, 10000);
});

onUnmounted(() => {
  if (filterRefreshInterval) {
    clearInterval(filterRefreshInterval);
    filterRefreshInterval = null;
  }
});
</script>