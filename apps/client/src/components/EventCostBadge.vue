<template>
  <span
    class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20"
    :title="`${tokens.toLocaleString()} tokens`"
  >
    {{ formatted }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatCost } from '../utils/formatters';

const props = defineProps<{
  costUsd: number;
  tokens: number;
}>();

const tokens = computed<number>(() => {
  const v = Number(props.tokens);
  return Number.isFinite(v) ? v : 0;
});

const cost = computed<number | null>(() => {
  const v = Number(props.costUsd);
  return Number.isFinite(v) ? v : null;
});

const formatted = computed(() => {
  if (cost.value === null) return '—';
  return formatCost(cost.value);
});
</script>
