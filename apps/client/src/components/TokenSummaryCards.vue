<template>
  <div class="grid grid-cols-3 gap-2 mobile:gap-1.5">
    <div
      v-for="period in periods"
      :key="period.id"
      class="rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] px-3 py-2.5 mobile:px-2 mobile:py-2"
    >
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">
          {{ period.label }}
        </span>
        <span
          v-if="period.isLive"
          class="relative flex h-1.5 w-1.5"
          aria-label="Live"
          role="status"
        >
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-60"></span>
          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--theme-primary)]"></span>
        </span>
      </div>
      <div class="text-xl mobile:text-base font-semibold text-[var(--theme-text-primary)] tabular-nums leading-none">
        {{ formatCost(period.totals.cost_usd) }}
      </div>
      <div class="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--theme-text-tertiary)] tabular-nums">
        <span>{{ formatTokens(totalTokens(period.totals)) }} tok</span>
        <span class="text-[var(--theme-border-secondary)]">·</span>
        <span>{{ period.totals.count }} <span class="mobile:hidden">turns</span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TokenSummary, PeriodTotals } from '../types/tokens';
import { formatCost, formatTokens } from '../utils/formatters';

const props = defineProps<{ summary: TokenSummary | null }>();

type PeriodId = 'today' | 'week' | 'month';

const periods = computed<{ id: PeriodId; label: string; totals: PeriodTotals; isLive: boolean }[]>(() => {
  const empty: PeriodTotals = {
    cost_usd: 0, input: 0, output: 0, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 0,
  };
  return [
    { id: 'today', label: 'Today',      totals: props.summary?.today ?? empty, isLive: true  },
    { id: 'week',  label: 'This week',  totals: props.summary?.week  ?? empty, isLive: false },
    { id: 'month', label: 'This month', totals: props.summary?.month ?? empty, isLive: false },
  ];
});

function totalTokens(t: PeriodTotals): number {
  return t.input + t.output + t.cache_read + t.cache_write_5m + t.cache_write_1h;
}
</script>
