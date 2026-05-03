<template>
  <div class="bg-[var(--theme-bg-primary)] border border-[var(--theme-border-primary)] rounded-lg overflow-hidden">
    <div class="px-3 py-2 mobile:px-2 mobile:py-1.5 flex items-center justify-between border-b border-[var(--theme-border-primary)]">
      <div class="flex items-center gap-2">
        <h4 class="text-xs font-medium text-[var(--theme-text-tertiary)] uppercase tracking-wider">
          Spend over time
        </h4>
        <span class="text-[11px] text-[var(--theme-text-quaternary)] tabular-nums">
          {{ formatCost(rangeTotal) }} <span class="mobile:hidden">{{ rangeLabel }}</span>
        </span>
      </div>
      <div
        class="flex gap-0.5 bg-[var(--theme-bg-secondary)] rounded-md p-0.5 border border-[var(--theme-border-primary)]"
        role="tablist"
        aria-label="Time range"
      >
        <button
          v-for="r in ranges"
          :key="r"
          @click="$emit('update:range', r)"
          :class="[
            'px-2 py-0.5 text-xs font-medium rounded transition-colors duration-150',
            range === r
              ? 'bg-[var(--theme-primary)] text-white shadow-sm'
              : 'text-[var(--theme-text-tertiary)] hover:text-[var(--theme-text-primary)] hover:bg-[var(--theme-bg-tertiary)]'
          ]"
          role="tab"
          :aria-selected="range === r"
        >{{ r }}</button>
      </div>
    </div>
    <div class="px-3 py-2 mobile:px-2">
      <canvas
        ref="canvasRef"
        class="w-full block"
        :style="{ height: `${canvasHeight}px` }"
      />
      <div v-if="points.length === 0" class="text-center text-xs text-[var(--theme-text-quaternary)] py-4">
        No data yet — run a Claude Code session to populate.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { TokenTimeseriesPoint, TokenRange } from '../types/tokens';
import { formatCost } from '../utils/formatters';

const props = defineProps<{
  points: TokenTimeseriesPoint[];
  range: TokenRange;
}>();
defineEmits<{ 'update:range': [r: TokenRange] }>();

const ranges: TokenRange[] = ['1d', '7d', '30d'];
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasHeight = 140;

let resizeObserver: ResizeObserver | null = null;
let themeObserver: MutationObserver | null = null;
let rafPending = false;

const rangeLabel = computed(() => `(last ${props.range})`);
const rangeTotal = computed(() => props.points.reduce((sum, p) => sum + p.cost_usd, 0));

function getCssVar(name: string): string {
  if (typeof window === 'undefined') return '#888';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888';
}

function draw(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvasHeight;

  // Guard against zero/near-zero canvas sizes (e.g. parent collapsed). Drawing
  // into a 0-px canvas is a wasted call and `Math.floor(0 * dpr) = 0` causes
  // browsers to ignore subsequent strokes silently.
  if (cssW <= 8 || cssH <= 8) return;

  // Set the backing-store size only inside draw() — binding `:width`/`:height`
  // reactively in the template causes Vue to re-set them between draws and
  // wipe the canvas state.
  const targetW = Math.floor(cssW * dpr);
  const targetH = Math.floor(cssH * dpr);
  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;

  // setTransform avoids accumulating scales across redraws (which `ctx.scale`
  // would do on every call, doubling DPR each frame).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  if (props.points.length === 0) return;

  const maxCost = Math.max(...props.points.map(p => p.cost_usd), 0.001);
  const padX = 4;
  const padY = 8;
  const w = cssW - padX * 2;
  const h = cssH - padY * 2;

  const primary = getCssVar('--theme-primary') || '#6366f1';
  const grid = getCssVar('--theme-border-primary') || '#e5e7eb';

  // Grid baseline
  ctx.strokeStyle = grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padX, cssH - padY);
  ctx.lineTo(cssW - padX, cssH - padY);
  ctx.stroke();

  // Bars
  const barCount = props.points.length;
  const barW = Math.max(2, Math.min(24, w / barCount - 2));
  const gap = (w - barW * barCount) / Math.max(barCount - 1, 1);

  ctx.fillStyle = primary;
  for (let i = 0; i < barCount; i++) {
    const p = props.points[i]!;
    const x = padX + i * (barW + gap);
    const barH = Math.max(1, (p.cost_usd / maxCost) * h);
    const y = cssH - padY - barH;
    ctx.fillRect(x, y, barW, barH);
  }
}

function scheduleDraw(): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(() => {
    rafPending = false;
    draw();
  });
}

watch(() => props.points, draw, { deep: true });
watch(() => props.range, draw);

onMounted(() => {
  draw();
  if (canvasRef.value && typeof ResizeObserver !== 'undefined') {
    // Coalesce resize bursts into a single rAF-aligned draw — DevTools docking,
    // window animations and Tailwind transitions otherwise spam the callback.
    resizeObserver = new ResizeObserver(() => {
      scheduleDraw();
    });
    resizeObserver.observe(canvasRef.value);
  }

  // Theme switch is signalled by class mutations on <html>. Mirror the pattern
  // already used by LivePulseChart so this chart picks up CSS variable changes
  // without prop churn.
  if (typeof MutationObserver !== 'undefined') {
    themeObserver = new MutationObserver(() => {
      scheduleDraw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  themeObserver?.disconnect();
  themeObserver = null;
});
</script>
