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

const props = defineProps<{
  costUsd: number;
  tokens: number;
}>();

const formatted = computed(() => {
  const c = props.costUsd;
  if (c >= 100) return `$${c.toFixed(0)}`;
  if (c >= 10)  return `$${c.toFixed(2)}`;
  if (c >= 0.01) return `$${c.toFixed(3)}`;
  return `<1¢`;
});
</script>
