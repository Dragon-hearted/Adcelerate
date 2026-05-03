<template>
  <div class="grid grid-cols-3 gap-2 mobile:gap-1.5">
    <div
      v-for="(period, i) in periods"
      :key="period.label"
      class="rounded-lg border border-[var(--theme-border-primary)] bg-[var(--theme-bg-primary)] px-3 py-2.5 mobile:px-2 mobile:py-2"
    >
      <div class="flex items-center justify-between mb-1">
        <span class="text-[10px] font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">
          {{ period.label }}
        </span>
        <span
          v-if="i === 0"
          class="relative flex h-1.5 w-1.5"
          title="Live"
        >
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-primary)] opacity-60"></span>
          <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--theme-primary)]"></span>
        </span>
      </div>
      <div class="text-xl mobile:text-base font-semibold text-[var(--theme-text-primary)] tabular-nums leading-none">
        {{ formatCost(period.totals.cost_usd) }}
      </div>
      <div class="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--theme-text-tertiary)] tabular-nums">
        <span>{{ formatTokens(totalTokens(period.totals)) }}</span>
        <span class="text-[var(--theme-border-secondary)]">·</span>
        <span>{{ period.totals.count }} <span class="mobile:hidden">turns</span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TokenSummary, PeriodTotals } from '../types/tokens';

const props = defineProps<{ summary: TokenSummary | null }>();

const periods = computed(() => {
  const empty: PeriodTotals = {
    cost_usd: 0, input: 0, output: 0, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 0,
  };
  return [
    { label: 'Today',     totals: props.summary?.today ?? empty },
    { label: 'This week', totals: props.summary?.week  ?? empty },
    { label: 'This month',totals: props.summary?.month ?? empty },
  ];
});

function totalTokens(t: PeriodTotals): number {
  return t.input + t.output + t.cache_read + t.cache_write_5m + t.cache_write_1h;
}

function formatCost(usd: number): string {
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 10)  return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(3)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M tok`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k tok`;
  return `${n} tok`;
}
</script>
