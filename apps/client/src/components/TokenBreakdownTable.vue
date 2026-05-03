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
          <th scope="col" class="px-3 py-1.5 mobile:px-2 font-medium" :aria-sort="sortAriaFor('key')">
            <button
              type="button"
              @click="sort('key')"
              class="flex items-center gap-1 uppercase tracking-wider hover:text-[var(--theme-text-secondary)] transition-colors"
            >
              {{ keyHeader }}
              <span aria-hidden="true" class="text-[var(--theme-text-quaternary)]">{{ sortIndicator('key') }}</span>
            </button>
          </th>
          <th scope="col" class="px-3 py-1.5 mobile:px-2 font-medium text-right tabular-nums" :aria-sort="sortAriaFor('cost_usd')">
            <button
              type="button"
              @click="sort('cost_usd')"
              class="ml-auto flex items-center gap-1 uppercase tracking-wider hover:text-[var(--theme-text-secondary)] transition-colors"
            >
              Cost
              <span aria-hidden="true" class="text-[var(--theme-text-quaternary)]">{{ sortIndicator('cost_usd') }}</span>
            </button>
          </th>
          <th scope="col" class="px-3 py-1.5 mobile:px-2 font-medium text-right tabular-nums mobile:hidden" :aria-sort="sortAriaFor('tokens')">
            <button
              type="button"
              @click="sort('tokens')"
              class="ml-auto flex items-center gap-1 uppercase tracking-wider hover:text-[var(--theme-text-secondary)] transition-colors"
            >
              Tokens
              <span aria-hidden="true" class="text-[var(--theme-text-quaternary)]">{{ sortIndicator('tokens') }}</span>
            </button>
          </th>
          <th scope="col" class="px-3 py-1.5 mobile:px-2 font-medium text-right tabular-nums" :aria-sort="sortAriaFor('count')">
            <button
              type="button"
              @click="sort('count')"
              class="ml-auto flex items-center gap-1 uppercase tracking-wider hover:text-[var(--theme-text-secondary)] transition-colors"
            >
              Turns
              <span aria-hidden="true" class="text-[var(--theme-text-quaternary)]">{{ sortIndicator('count') }}</span>
            </button>
          </th>
          <th scope="col" class="px-3 py-1.5 mobile:px-2 mobile:hidden"><span class="sr-only">Share</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="row in displayRows"
          :key="row.key"
          class="border-b border-[var(--theme-border-primary)] last:border-0 hover:bg-[var(--theme-bg-secondary)] transition-colors duration-100"
        >
          <td class="px-3 py-1.5 mobile:px-2 text-[var(--theme-text-primary)] truncate max-w-[200px] mobile:max-w-[120px]" :title="row.key">
            {{ keyLabels.get(row.key) ?? row.key }}
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
import { computed, ref } from 'vue';
import type { TokenBreakdownRow, TokenBreakdownDimension } from '../types/tokens';
import { formatCost, formatTokens } from '../utils/formatters';

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

type SortCol = 'key' | 'cost_usd' | 'tokens' | 'count';
type SortDir = 'asc' | 'desc' | 'none';

const sortCol = ref<SortCol>('cost_usd');
const sortDir = ref<SortDir>('desc');

function sort(col: SortCol): void {
  if (sortCol.value !== col) {
    sortCol.value = col;
    sortDir.value = 'desc';
    return;
  }
  // toggle: desc -> asc -> none -> desc
  sortDir.value = sortDir.value === 'desc' ? 'asc' : sortDir.value === 'asc' ? 'none' : 'desc';
}

function sortAriaFor(col: SortCol): 'ascending' | 'descending' | 'none' {
  if (sortCol.value !== col) return 'none';
  if (sortDir.value === 'asc') return 'ascending';
  if (sortDir.value === 'desc') return 'descending';
  return 'none';
}

function sortIndicator(col: SortCol): string {
  if (sortCol.value !== col) return '';
  if (sortDir.value === 'asc') return '▲';
  if (sortDir.value === 'desc') return '▼';
  return '';
}

// Stable comparator that pushes null/undefined to the end regardless of direction.
function compareValues(a: unknown, b: unknown, dir: 'asc' | 'desc'): number {
  const aMissing = a === null || a === undefined;
  const bMissing = b === null || b === undefined;
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  if (typeof a === 'number' && typeof b === 'number') {
    return dir === 'asc' ? a - b : b - a;
  }
  const as = String(a);
  const bs = String(b);
  if (as < bs) return dir === 'asc' ? -1 : 1;
  if (as > bs) return dir === 'asc' ? 1 : -1;
  return 0;
}

const sortedRows = computed<TokenBreakdownRow[]>(() => {
  if (sortDir.value === 'none') return props.rows;
  // Stable sort: use a decorate-sort-undecorate to preserve original order
  // when the comparator returns 0.
  const indexed = props.rows.map((row, idx) => ({ row, idx }));
  const dir = sortDir.value;
  const col = sortCol.value;
  indexed.sort((a, b) => {
    const av = (a.row as unknown as Record<string, unknown>)[col];
    const bv = (b.row as unknown as Record<string, unknown>)[col];
    const cmp = compareValues(av, bv, dir);
    return cmp !== 0 ? cmp : a.idx - b.idx;
  });
  return indexed.map(x => x.row);
});

const displayRows = computed(() => sortedRows.value.slice(0, 12));

const maxCost = computed(() => Math.max(...props.rows.map(r => r.cost_usd), 0.001));

function barPct(cost: number): number {
  return Math.round((cost / maxCost.value) * 100);
}

function shortKey(key: string, segments: number): string {
  if (props.currentDim !== 'cwd') return key;
  // Split on both POSIX (`/`) and Windows (`\`) separators — `cwd` comes
  // straight from transcript metadata and Windows sessions render the
  // backslash form, which the previous single-separator split left
  // untouched and broke the same-basename disambiguation pass below.
  const parts = key.split(/[/\\]+/).filter(Boolean);
  if (parts.length === 0) return key;
  return parts.slice(-segments).join('/');
}

// Build a one-shot map of row.key -> rendered label, disambiguating any
// last-2-segment collisions by prepending the parent-of-parent (3 segments).
// Only applies to the `cwd` dimension; other dimensions render keys verbatim.
const keyLabels = computed<Map<string, string>>(() => {
  const map = new Map<string, string>();
  if (props.currentDim !== 'cwd') {
    for (const row of displayRows.value) map.set(row.key, row.key);
    return map;
  }
  // First pass: 2-segment label
  const twoSeg = new Map<string, string[]>();
  for (const row of displayRows.value) {
    const label = shortKey(row.key, 2) || row.key;
    const bucket = twoSeg.get(label) ?? [];
    bucket.push(row.key);
    twoSeg.set(label, bucket);
  }
  // Second pass: assign labels, expanding collisions to 3 segments
  for (const row of displayRows.value) {
    const label2 = shortKey(row.key, 2) || row.key;
    const collided = (twoSeg.get(label2)?.length ?? 0) > 1;
    map.set(row.key, collided ? (shortKey(row.key, 3) || row.key) : label2);
  }
  return map;
});
</script>
