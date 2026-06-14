'use client';

import { Pause, Play, SkipBack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { ReplayState } from '@/hooks/useReplay';
import { formatTime } from '@/lib/format';

const SPEEDS = [0.5, 1, 2, 4, 8];

/**
 * Replay scrubber for `/sessions/[id]`. Drives the deterministic replay clock
 * (useReplay) over GET /api/sessions/:id/replay — play/pause, scrub, and an
 * adjustable speed multiplier.
 */
export function ReplayControls({
  replay,
  total,
  currentTimestamp,
}: {
  replay: ReplayState;
  total: number;
  currentTimestamp?: number;
}) {
  const { index, playing, speed, toggle, restart, seek, setSpeed } = replay;
  // Slider is 1-based count of revealed events (0..total).
  const value = index + 1;

  return (
    <div className="flex items-center gap-3 border-t border-border bg-card/50 px-3 py-2">
      <Button size="icon" variant="outline" onClick={restart} title="Restart" disabled={total === 0}>
        <SkipBack />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={toggle}
        title={playing ? 'Pause' : 'Play'}
        disabled={total === 0}
      >
        {playing ? <Pause /> : <Play />}
      </Button>

      <input
        type="range"
        min={0}
        max={total}
        value={value}
        onChange={(e) => seek(Number(e.target.value) - 1)}
        disabled={total === 0}
        className="h-1.5 flex-1 cursor-pointer accent-primary"
        aria-label="Replay position"
      />

      <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
        {Math.max(0, value)}/{total}
        {currentTimestamp ? ` · ${formatTime(currentTimestamp)}` : ''}
      </span>

      <label className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
        speed
        <Select
          value={String(speed)}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="h-7 w-16"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </Select>
      </label>
    </div>
  );
}
