'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CCEvent } from '@command-center/shared';

export interface ReplayState {
  index: number; // index of the last-revealed event (-1 = nothing yet)
  playing: boolean;
  speed: number; // playback multiplier
  play: () => void;
  pause: () => void;
  toggle: () => void;
  restart: () => void;
  seek: (i: number) => void;
  setSpeed: (s: number) => void;
}

// Cap the inter-event delay so long idle gaps in the log don't stall playback.
const MAX_STEP_MS = 2000;

/**
 * Deterministic replay clock over an ordered (by seq) event log. Playback
 * respects the recorded inter-event timing scaled by `speed`; scrubbing jumps
 * straight to an index. Reconstruction is deterministic: the rendered timeline
 * is always exactly events[0..index].
 */
export function useReplay(events: CCEvent[]): ReplayState {
  const total = events.length;
  const [index, setIndex] = useState(total > 0 ? total - 1 : -1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When a fresh log loads, snap to the end (full reconstruction) and stop.
  useEffect(() => {
    setIndex(total > 0 ? total - 1 : -1);
    setPlaying(false);
  }, [total]);

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    clear();
    if (!playing) return;
    if (index >= total - 1) {
      setPlaying(false);
      return;
    }
    const cur = events[index];
    const next = events[index + 1];
    const rawGap = cur && next ? next.timestamp - cur.timestamp : 300;
    const delay = Math.max(0, Math.min(MAX_STEP_MS, rawGap)) / Math.max(0.1, speed);
    timer.current = setTimeout(() => setIndex((i) => i + 1), delay || 16);
    return clear;
  }, [playing, index, speed, total, events]);

  const play = useCallback(() => {
    setIndex((i) => {
      // Replaying from the end restarts from the top.
      if (i >= total - 1) return total > 0 ? 0 : -1;
      return i;
    });
    setPlaying(true);
  }, [total]);

  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, play, pause]);
  const restart = useCallback(() => {
    setPlaying(false);
    setIndex(total > 0 ? 0 : -1);
  }, [total]);
  const seek = useCallback(
    (i: number) => {
      setPlaying(false);
      setIndex(Math.max(-1, Math.min(total - 1, i)));
    },
    [total],
  );

  return { index, playing, speed, play, pause, toggle, restart, seek, setSpeed };
}
