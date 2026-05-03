// Smoke test: mount `TokenUsagePanel` with a stubbed `useTokens` composable
// and assert that the three child components (cards / chart / table) render.
//
// The composable layer is mocked via `vi.mock` so the test runs without a
// running server, WebSocket, or DB — pure Vue render lifecycle on jsdom.
//
// We also exercise reactivity: pushing a new event into the stubbed
// `liveEvents` ref and verifying that downstream `lastEvent`-derived state
// re-renders. This catches the failure mode where a future refactor
// accidentally drops reactivity off the panel's bindings.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref, computed, nextTick } from 'vue';
import type {
  TokenEvent,
  TokenSummary,
  TokenTimeseriesPoint,
  TokenBreakdownRow,
  TokenRange,
  TokenBucket,
  TokenBreakdownDimension,
} from '../../types/tokens';
// Use the shared currency formatter for assertions so the test stays correct
// in locales that render decimal commas (e.g. de-DE → "6,75 $") rather than
// hard-coding the en-US digit pattern "6.75".
import { formatCost } from '../../utils/formatters';

// --- Hardcoded fixtures ---------------------------------------------------

const fixtureSummary: TokenSummary = {
  today: { cost_usd: 0.42, input: 1_000, output: 500, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 3 },
  week:  { cost_usd: 1.50, input: 5_000, output: 2_000, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 12 },
  month: { cost_usd: 6.75, input: 20_000, output: 8_000, cache_read: 0, cache_write_5m: 0, cache_write_1h: 0, count: 45 },
};

const fixtureTimeseries: TokenTimeseriesPoint[] = [
  { ts: 1_700_000_000_000, cost_usd: 0.10, tokens: 100 },
  { ts: 1_700_086_400_000, cost_usd: 0.20, tokens: 200 },
];

const fixtureBreakdown: TokenBreakdownRow[] = [
  { key: 'claude-opus-4-7', cost_usd: 5.00, tokens: 25_000, count: 30 },
  { key: 'claude-sonnet-4-5', cost_usd: 1.75, tokens: 8_000, count: 15 },
];

// --- Stubbed composable ---------------------------------------------------
//
// We expose mutable refs at module scope so individual tests can poke at
// them between mounts (e.g. push a `liveEvents` entry and verify the
// computed `lastEvent` updates).

const stubSummary = ref<TokenSummary | null>(fixtureSummary);
const stubTimeseries = ref<TokenTimeseriesPoint[]>(fixtureTimeseries);
const stubBreakdown = ref<TokenBreakdownRow[]>(fixtureBreakdown);
const stubLiveEvents = ref<TokenEvent[]>([]);
const stubLastEvent = ref<TokenEvent | null>(null);
const stubLoading = ref(false);
const stubError = ref<string | null>(null);
const stubRange = ref<TokenRange>('7d');
const stubBucket = ref<TokenBucket>('day');
const stubBreakdownDim = ref<TokenBreakdownDimension>('model');

const refetchAll = vi.fn(async () => {});
const setRange = vi.fn(async (r: TokenRange) => { stubRange.value = r; });
const setBreakdownDim = vi.fn(async (d: TokenBreakdownDimension) => { stubBreakdownDim.value = d; });

vi.mock('../../composables/useTokens', () => ({
  useTokens: () => ({
    summary: stubSummary,
    timeseries: stubTimeseries,
    breakdown: stubBreakdown,
    liveEvents: stubLiveEvents,
    lastEvent: stubLastEvent,
    loading: stubLoading,
    error: stubError,
    range: stubRange,
    bucket: stubBucket,
    breakdownDim: stubBreakdownDim,
    totalSpend: computed(() => stubSummary.value?.month.cost_usd ?? 0),
    refetchAll,
    setRange,
    setBreakdownDim,
  }),
  // Module-level helpers used by other components — stub as no-ops.
  applyTokenEvent: vi.fn(),
  refetchAllExternal: vi.fn(async () => {}),
  findCostForEvent: vi.fn(() => null),
  findCostForEventAsync: vi.fn(async () => null),
}));

// Import AFTER vi.mock so the SFC picks up the stubbed composable.
import TokenUsagePanel from '../TokenUsagePanel.vue';

beforeEach(() => {
  // Reset state between tests so a mutation in one test doesn't leak.
  stubSummary.value = fixtureSummary;
  stubTimeseries.value = fixtureTimeseries;
  stubBreakdown.value = fixtureBreakdown;
  stubLiveEvents.value = [];
  stubLastEvent.value = null;
  stubLoading.value = false;
  stubError.value = null;
  stubRange.value = '7d';
  stubBucket.value = 'day';
  stubBreakdownDim.value = 'model';
  refetchAll.mockClear();
  setRange.mockClear();
  setBreakdownDim.mockClear();
});

describe('TokenUsagePanel — smoke mount', () => {
  it('renders the three child components when mounted', async () => {
    const wrapper = mount(TokenUsagePanel);
    await flushPromises();
    await nextTick();

    // The panel composes three feature components — verify each is in the
    // tree by class hooks the SFCs ship today (looking for elements that
    // can only come from those children).
    const html = wrapper.html();
    // Summary cards: rendered as a 3-column grid of period cards.
    expect(html).toContain('grid-cols-3');
    // Timeseries chart and breakdown table both render inside the
    // `lg:grid-cols-2` two-up layout.
    expect(html).toContain('lg:grid-cols-2');
    // Total spend in the header pulls from the stubbed summary.month.cost_usd.
    // Use the shared formatter so this assertion survives locales that render
    // decimal commas (e.g. de-DE) — hard-coding "6.75" would falsely fail.
    expect(html).toContain(formatCost(fixtureSummary.month.cost_usd));
  });

  it('calls refetchAll on mount', async () => {
    mount(TokenUsagePanel);
    await flushPromises();
    expect(refetchAll).toHaveBeenCalledTimes(1);
  });

  it('renders the error banner when error ref is non-null', async () => {
    stubError.value = 'oops the server fell over';
    const wrapper = mount(TokenUsagePanel);
    await flushPromises();
    await nextTick();
    expect(wrapper.html()).toContain('oops the server fell over');
  });
});

describe('TokenUsagePanel — reactive updates', () => {
  it('reactively reflects an updated lastEvent in the header', async () => {
    const wrapper = mount(TokenUsagePanel);
    await flushPromises();
    await nextTick();
    // No lastEvent initially, so the "last: …" header span is hidden.
    expect(wrapper.html()).not.toContain('claude-opus-4-7 ·');

    // Simulate a fake `token_event` arriving from the WebSocket layer:
    // mutate the ref the stubbed composable returns. The panel reads
    // `lastEvent` reactively, so this should trigger a re-render.
    const fakeEvent: TokenEvent = {
      id: 1,
      ts: Date.now(),
      session_id: 'sess-1',
      cwd: '/repo',
      git_branch: 'main',
      model: 'claude-opus-4-7',
      input: 100,
      cache_read: 0,
      cache_write_5m: 0,
      cache_write_1h: 0,
      output: 50,
      cost_usd: 0.001,
      request_id: 'req-1',
      transcript_file: '/tmp/x.jsonl',
      transcript_line_offset: 0,
    };
    stubLiveEvents.value = [...stubLiveEvents.value, fakeEvent];
    stubLastEvent.value = fakeEvent;
    await nextTick();

    // After the reactive update, the model name appears in the header span
    // (`last: claude-opus-4-7 · …`).
    expect(wrapper.html()).toContain('claude-opus-4-7');
  });

  it('reactively reflects an updated summary in the header total', async () => {
    const wrapper = mount(TokenUsagePanel);
    await flushPromises();
    await nextTick();
    expect(wrapper.html()).toContain(formatCost(fixtureSummary.month.cost_usd));

    // Bump month spend; the header should re-render to the new total.
    stubSummary.value = {
      ...fixtureSummary,
      month: { ...fixtureSummary.month, cost_usd: 99.99 },
    };
    await nextTick();
    expect(wrapper.html()).toContain(formatCost(99.99));
  });
});
