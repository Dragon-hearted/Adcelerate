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
    <Transition
      enter-active-class="transition-all duration-200 ease-out"
      leave-active-class="transition-all duration-150 ease-in"
      enter-from-class="opacity-0 -translate-y-1 max-h-0"
      enter-to-class="opacity-100 translate-y-0 max-h-[1000px]"
      leave-from-class="opacity-100 translate-y-0 max-h-[1000px]"
      leave-to-class="opacity-0 -translate-y-1 max-h-0"
    >
      <div
        v-if="!collapsed"
        id="token-usage-body"
        class="overflow-hidden"
      >
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
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTokens } from '../composables/useTokens';
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

function formatCost(usd: number): string {
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 10)  return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(3)}`;
}

function formatRelative(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
</script>
