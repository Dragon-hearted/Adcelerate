import chokidar from 'chokidar';
import { stat, open } from 'node:fs/promises';
import { StringDecoder } from 'node:string_decoder';
import os from 'node:os';
import path from 'node:path';
import { parseLine } from './transcript-parser';
import {
  insertTokenEvent,
  getTranscriptOffset,
  setTranscriptOffset,
  deleteTranscriptOffset,
  type TokenEventRow,
} from './db';

export type TokenEventBroadcast = (record: TokenEventRow) => void;

interface IngestOptions {
  rootDir?: string;
  debounceMs?: number;
  onTokenEvent?: TokenEventBroadcast;
}

const PROJECTS_DIR = process.env.CLAUDE_PROJECTS_DIR
  || path.join(os.homedir(), '.claude/projects');

// Hard cap on how many bytes we'll buffer in a single read pass. If a transcript
// file grows by more than this between read events without producing a single
// '\n', we skip the slab and advance the offset — otherwise a runaway single-
// line file would loop forever consuming memory.
const MAX_READ_BYTES = 50 * 1024 * 1024; // 50 MB

// Backfill concurrency cap on startup. Streaming changes go through the
// per-file mutex so this only bounds the initial scan.
const BACKFILL_CONCURRENCY = 8;

interface InodeKey {
  dev: number;
  ino: number;
}

async function ingestFile(
  file: string,
  inodeMap: Map<string, InodeKey>,
  onTokenEvent?: TokenEventBroadcast,
): Promise<number> {
  let st;
  try {
    st = await stat(file);
  } catch {
    return 0;
  }
  if (!st.isFile()) return 0;

  // (dev, ino) check — if the inode for this path changed since last time we
  // saw it, the file was rotated/replaced underneath us. Reset the offset so
  // we re-ingest from byte 0 of the new file.
  const prevInode = inodeMap.get(file);
  const inodeChanged =
    prevInode !== undefined &&
    (prevInode.dev !== st.dev || prevInode.ino !== st.ino);
  if (inodeChanged) {
    setTranscriptOffset(file, 0);
  }
  inodeMap.set(file, { dev: st.dev, ino: st.ino });

  let startOffset = getTranscriptOffset(file);

  // Truncation / rotation: file shrank below where we left off. Reset and
  // re-ingest from the top of the (now smaller) file.
  if (st.size < startOffset) {
    setTranscriptOffset(file, 0);
    startOffset = 0;
  }

  if (st.size <= startOffset) return 0;

  let bytesToRead = st.size - startOffset;

  // Per-read size cap. If we have a giant slab and no newline in it, we'd loop
  // forever. Read up to MAX_READ_BYTES; if no newline is found, skip the slab.
  const slabCapped = bytesToRead > MAX_READ_BYTES;
  if (slabCapped) bytesToRead = MAX_READ_BYTES;

  const fh = await open(file, 'r');
  try {
    const buf = Buffer.alloc(bytesToRead);
    const { bytesRead } = await fh.read(buf, 0, buf.length, startOffset);
    if (bytesRead <= 0) return 0;

    // Find the byte index of the LAST '\n' so we don't consume a partial
    // trailing line. Everything before-and-including that newline is parsed
    // line-by-line; everything after stays for the next read.
    let lastNl = -1;
    for (let i = bytesRead - 1; i >= 0; i--) {
      if (buf[i] === 0x0A) { lastNl = i; break; }
    }

    if (lastNl === -1) {
      if (slabCapped) {
        console.warn(
          `[ingest] ${file}: ${bytesRead} bytes without newline — skipping slab to avoid infinite loop`,
        );
        // Advance past the no-newline garbage so we don't re-scan it.
        setTranscriptOffset(file, startOffset + bytesRead);
      }
      return 0;
    }

    let inserted = 0;
    let lineStart = 0; // byte index within `buf` where the current line begins
    const decoder = new StringDecoder('utf8');
    const fileMtimeMs = st.mtimeMs;

    // Walk forward through `buf` finding each '\n' byte.
    let nlIndex = buf.indexOf(0x0A, 0);
    while (nlIndex !== -1 && nlIndex <= lastNl) {
      const slice = buf.subarray(lineStart, nlIndex);
      const lineText = decoder.write(slice);
      const offsetAtLineStart = startOffset + lineStart;

      let row: TokenEventRow | null = null;
      try {
        row = parseLine(lineText, file, offsetAtLineStart, fileMtimeMs);
      } catch (err) {
        console.error('[ingest] parseLine threw for', file, '@', offsetAtLineStart, err);
      }

      if (row) {
        try {
          const saved = insertTokenEvent(row);
          if (saved) {
            inserted++;
            onTokenEvent?.(saved);
          }
        } catch (err) {
          // Per-row try/catch — one bad row must never wedge the loop or the
          // offset advance below.
          console.error('[ingest] insertTokenEvent failed for', file, '@', offsetAtLineStart, err);
        }
      }

      lineStart = nlIndex + 1;
      nlIndex = buf.indexOf(0x0A, lineStart);
    }

    // Always advance the offset past every full line we consumed, even if
    // some rows failed to insert. The byte offset is `startOffset + lastNl + 1`
    // (one past the final newline). Critically, this is computed on raw byte
    // positions — never via `Buffer.byteLength` of a re-encoded string, which
    // is what the old code did and which drifted on multibyte boundaries.
    const newOffset = startOffset + lastNl + 1;
    setTranscriptOffset(file, newOffset);
    return inserted;
  } finally {
    await fh.close();
  }
}

export async function startTranscriptIngest(opts: IngestOptions = {}): Promise<() => Promise<void>> {
  const rootDir = opts.rootDir ?? PROJECTS_DIR;
  const debounceMs = opts.debounceMs ?? 250;
  const onTokenEvent = opts.onTokenEvent;

  console.log(`[ingest] watching ${rootDir}`);

  // Per-file mutex: pending change events chain onto whatever ingest is
  // already in flight for that file. This prevents two concurrent reads of
  // the same offset producing duplicate token_events rows.
  const inflight = new Map<string, Promise<void>>();
  // Track every still-running ingest promise so shutdown can await them all.
  const inflightSet = new Set<Promise<void>>();
  // (dev, ino) per file for rotation detection.
  const inodeMap = new Map<string, InodeKey>();
  // Debounce timers per file to coalesce rapid-fire change events.
  const pending = new Map<string, NodeJS.Timeout>();

  function runIngest(file: string): Promise<void> {
    const prev = inflight.get(file) ?? Promise.resolve();
    const next = prev
      .then(async () => {
        try {
          const n = await ingestFile(file, inodeMap, onTokenEvent);
          if (n > 0) console.log(`[ingest] ${file} +${n} token_events`);
        } catch (err) {
          console.error('[ingest] error processing', file, err);
        }
      });
    inflight.set(file, next);
    inflightSet.add(next);
    next.finally(() => {
      if (inflight.get(file) === next) inflight.delete(file);
      inflightSet.delete(next);
    });
    return next;
  }

  const schedule = (file: string) => {
    if (!file.endsWith('.jsonl')) return;
    const existing = pending.get(file);
    if (existing) clearTimeout(existing);
    pending.set(file, setTimeout(() => {
      pending.delete(file);
      runIngest(file);
    }, debounceMs));
  };

  const watcher = chokidar.watch(rootDir, {
    ignoreInitial: false,
    persistent: true,
    awaitWriteFinish: false,
    depth: 5,
    followSymlinks: false,
    ignored: /(^|[/\\])\../, // dotfiles
  });

  watcher.on('add', schedule);
  watcher.on('change', schedule);
  watcher.on('unlink', (file: string) => {
    if (!file.endsWith('.jsonl')) return;
    try {
      deleteTranscriptOffset(file);
    } catch (err) {
      console.error('[ingest] failed to delete offset for', file, err);
    }
    inflight.delete(file);
    inodeMap.delete(file);
    const t = pending.get(file);
    if (t) { clearTimeout(t); pending.delete(file); }
  });

  // Wait for chokidar to finish the initial enumeration. This is FAST even
  // on large trees — chokidar fires `ready` after the directory walk, before
  // our per-file ingest handlers run. Bounded with a 30s timeout so a stuck
  // watcher (e.g. permissions error on a project dir) cannot wedge boot.
  await Promise.race([
    new Promise<void>((resolve) => watcher.once('ready', () => resolve())),
    new Promise<void>((_resolve, reject) =>
      setTimeout(() => reject(new Error('chokidar ready timeout (30s)')), 30_000),
    ),
  ]);

  // Backfill runs in the BACKGROUND so server boot doesn't block on large
  // ~/.claude/projects histories. /api/tokens/* may return partial data
  // during the backfill window — this is eventual consistency, not a bug;
  // every queried row is correct, the set just grows over a few seconds.
  const backfillFiles: string[] = [];
  for (const [file, t] of pending.entries()) {
    clearTimeout(t);
    backfillFiles.push(file);
  }
  pending.clear();

  let backfillDone: Promise<void> = Promise.resolve();
  if (backfillFiles.length > 0) {
    backfillDone = pLimit(backfillFiles, BACKFILL_CONCURRENCY, (file) => runIngest(file))
      .then(() => {
        console.log(`[ingest] backfill complete (${backfillFiles.length} files)`);
      })
      .catch((err) => {
        console.error('[ingest] backfill error:', err);
      });
  }

  console.log(`[ingest] watcher ready (backfill ${backfillFiles.length} files in background)`);

  return async () => {
    // Stop accepting new debounced runs.
    for (const t of pending.values()) clearTimeout(t);
    pending.clear();
    // Drain background backfill first, then in-flight per-file runs, before
    // closing the watcher — otherwise we strand a half-applied offset.
    await backfillDone;
    await Promise.allSettled([...inflightSet]);
    await watcher.close();
  };
}

/**
 * Tiny inline concurrency limiter — avoids pulling in `p-limit` as a dep.
 * Spawns at most `n` workers, each pulling from a shared queue until empty.
 */
async function pLimit<T>(
  items: T[],
  n: number,
  fn: (t: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const queue = [...items];
  const workers = Array.from({ length: Math.min(n, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) return;
      try {
        await fn(item);
      } catch (err) {
        console.error('[ingest] backfill worker error:', err);
      }
    }
  });
  await Promise.all(workers);
}
