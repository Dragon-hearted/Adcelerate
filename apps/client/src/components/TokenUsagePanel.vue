<template>
  <section
    class="short:hidden bg-[var(--theme-bg-secondary)] border-b border-[var(--theme-border-primary)]"
  >
    <header class="px-4 py-2.5 mobile:px-3 mobile:py-2 flex items-center justify-between gap-3">
      <button
        @click="collapsed = !collapsed"
        class="flex items-center gap-2 text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider hover:text-[var(--theme-text-primary)] transition-colors"
        :aria-expanded="!collapsed"
        aria-controls="token-usage-body"
      >
        <svg
          class="w-3.5 h-3.5 transition-transform duration-200"
          :class="{ '-rotate-90': collapsed }"
          fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
        Token usage
      </button>
      <div class="flex items-center gap-2 text-xs tabular-nums text-[var(--theme-text-tertiary)]">
        <span v-if="lastEvent" class="text-[var(--theme-text-quaternary)] mobile:hidden">
          last: {{ lastEvent.model }} · {{ formatRelative(lastEvent.ts) }}
        </span>
        <span class="font-semibold text-[var(--theme-text-primary)]">
          {{ formatCost(totalSpend) }}
        </span>
        <span class="text-[var(--theme-text-quaternary)] mobile:hidden">/ 30d</span>
      </div>
    </header>
    <!--
      grid-template-rows trick: outer grid animates 0fr -> 1fr; inner div uses
      `min-height: 0` + overflow-hidden so the body's natural height drives the
      transition without a hardcoded max-height ceiling that clips at large widths.
    -->
    <div
      id="token-usage-body"
      class="grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none"
      :style="{ gridTemplateRows: collapsed ? '0fr' : '1fr' }"
      :aria-hidden="collapsed ? 'true' : 'false'"
    >
      <div class="overflow-hidden min-h-0">
        <div class="px-4 pb-3 mobile:px-3 mobile:pb-2 space-y-2">
          <TokenSummaryCards :summary="summary" />
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-2">
            <TokenTimeseriesChart
              :points="timeseries"
              :range="range"
              @update:range="setRange"
            />
            <TokenBreakdownTable
              :rows="breakdown"
              :current-dim="breakdownDim"
              @update:dim="setBreakdownDim"
            />
          </div>
          <p v-if="error" class="text-[11px] text-[var(--theme-accent-error)]">{{ error }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTokens } from '../composables/useTokens';
import { formatCost, formatRelative } from '../utils/formatters';
import TokenSummaryCards from './TokenSummaryCards.vue';
import TokenTimeseriesChart from './TokenTimeseriesChart.vue';
import TokenBreakdownTable from './TokenBreakdownTable.vue';

const collapsed = ref(false);

const {
  summary,
  timeseries,
  breakdown,
  lastEvent,
  error,
  range,
  breakdownDim,
  totalSpend,
  refetchAll,
  setRange,
  setBreakdownDim,
} = useTokens();

onMounted(() => {
  refetchAll();
});
</script>
