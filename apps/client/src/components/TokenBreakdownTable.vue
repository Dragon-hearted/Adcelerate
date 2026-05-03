<template>
  <div class="bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded-lg overflow-hidden">
    <div class="px-3 py-2 mobile:px-2 mobile:py-1.5 flex items-center justify-between border-b border-[var(--theme-border-primary)]">
      <h4 class="text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">
        Breakdown
      </h4>
      <div
        class="flex gap-0.5 bg-[var(--theme-bg-secondary)] rounded-md p-0.5 border border-[var(--theme-border-primary)]"
        role="tablist"
        aria-label="Group by"
      >
        <button
          v-for="dim in dimensions"
          :key="dim.value"
          @click="$emit('update:dim', dim.value)"
          :class="[
            'px-2 py-0.5 text-xs font-medium rounded transition-colors duration-150',
            currentDim === dim.value
              ? 'bg-[var(--theme-primary)] text-white shadow-sm'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          ]"
          role="tab"
          :aria-selected="currentDim === dim.value"
        >{{ dim.label }}</button>
      </div>
    </div>
    <div v-if="rows.length === 0" class="text-center text-xs text-[var(--theme-text-quaternary)] py-4">
      No data yet.
    </div>
    <table v-else class="w-full text-xs">
      <thead>
        <tr class="text-left text-[10px] uppercase tracking-wider text-[var(--theme-text-quaternary)] border-b border-[var(--theme-border-primary)]">
          <th class="px-3 py-1.5 mobile:px-2 font-medium">{{ keyHeader }}</th>
          <th class="px-3 py-1.5 mobile:px-2 font-medium text-right tabular-nums">Cost</th>
          <th class="px-3 py-1.5 mobile:px-2 font-medium text-right tabular-nums mobile:hidden">Tokens</th>
          <th class="px-3 py-1.5 mobile:px-2 font-medium text-right tabular-nums">Turns</th>
          <th class="px-3 py-1.5 mobile:px-2 mobile:hidden"></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in displayRows"
          :key="row.key"
          class="border-b border-[var(--theme-border-primary)] last:border-0 hover:bg-[var(--theme-bg-secondary)] transition-colors duration-100"
        >
          <td class="px-3 py-1.5 mobile:px-2 text-[var(--theme-text-primary)] truncate max-w-[200px] mobile:max-w-[120px]" :title="row.key">
            {{ formatKey(row.key) }}
          </td>
          <td class="px-3 py-1.5 mobile:px-2 text-right tabular-nums text-[var(--theme-text-primary)] font-medium">
            {{ formatCost(row.cost_usd) }}
          </td>
          <td class="px-3 py-1.5 mobile:px-2 text-right tabular-nums text-[var(--theme-text-tertiary)] mobile:hidden">
            {{ formatTokens(row.tokens) }}
          </td>
          <td class="px-3 py-1.5 mobile:px-2 text-right tabular-nums text-[var(--theme-text-tertiary)]">
            {{ row.count }}
          </td>
          <td class="px-3 py-1.5 mobile:px-2 mobile:hidden w-24">
            <div class="h-1.5 rounded-full bg-[var(--theme-bg-tertiary)] overflow-hidden">
              <div
                class="h-full rounded-full bg-[var(--theme-primary)]"
                :style="{ width: `${barPct(row.cost_usd)}%` }"
              ></div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { TokenBreakdownRow, TokenBreakdownDimension } from '../types/tokens';

const props = defineProps<{
  rows: TokenBreakdownRow[];
  currentDim: TokenBreakdownDimension;
}>();
defineEmits<{ 'update:dim': [d: TokenBreakdownDimension] }>();

const dimensions: { value: TokenBreakdownDimension; label: string }[] = [
  { value: 'model',      label: 'Model' },
  { value: 'cwd',        label: 'Project' },
  { value: 'git_branch', label: 'Branch' },
];

const keyHeader = computed(() => dimensions.find(d => d.value === props.currentDim)?.label ?? '');

const displayRows = computed(() => props.rows.slice(0, 12));

const maxCost = computed(() => Math.max(...props.rows.map(r => r.cost_usd), 0.001));

function barPct(cost: number): number {
  return Math.round((cost / maxCost.value) * 100);
}

function formatKey(key: string): string {
  if (props.currentDim === 'cwd') {
    // Show just the basename for projects
    return key.split('/').filter(Boolean).slice(-2).join('/') || key;
  }
  return key;
}

function formatCost(usd: number): string {
  if (usd >= 100) return `$${usd.toFixed(0)}`;
  if (usd >= 10)  return `$${usd.toFixed(2)}`;
  return `$${usd.toFixed(3)}`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}
</script>
