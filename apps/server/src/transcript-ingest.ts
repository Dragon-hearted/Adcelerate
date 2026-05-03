import chokidar from 'chokidar';
import { stat, open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { parseLine } from './transcript-parser';
import { insertTokenEvent, getTranscriptOffset, setTranscriptOffset, type TokenEventRow } from './db';

export type TokenEventBroadcast = (record: TokenEventRow) => void;

interface IngestOptions {
  rootDir?: string;
  debounceMs?: number;
  onTokenEvent?: TokenEventBroadcast;
}

const PROJECTS_DIR = process.env.CLAUDE_PROJECTS_DIR
  || path.join(os.homedir(), '.claude/projects');

async function ingestFile(file: string, onTokenEvent?: TokenEventBroadcast): Promise<number> {
  let st;
  try {
    st = await stat(file);
  } catch {
    return 0;
  }
  if (!st.isFile()) return 0;

  const startOffset = getTranscriptOffset(file);
  if (st.size <= startOffset) return 0;

  const fh = await open(file, 'r');
  try {
    const buf = Buffer.alloc(st.size - startOffset);
    await fh.read(buf, 0, buf.length, startOffset);
    const text = buf.toString('utf8');

    // Only consume up through the last newline. Trailing partial line stays
    // for the next read; offset advances only past complete lines.
    const lastNl = text.lastIndexOf('\n');
    if (lastNl === -1) return 0;

    const consumable = text.slice(0, lastNl);
    let lineStartOffset = startOffset;
    let inserted = 0;

    for (const line of consumable.split('\n')) {
      const lineByteLen = Buffer.byteLength(line, 'utf8') + 1; // + the '\n'
      const offsetAtLineStart = lineStartOffset;
      lineStartOffset += lineByteLen;

      const row = parseLine(line, file, offsetAtLineStart);
      if (!row) continue;
      const saved = insertTokenEvent(row);
      if (saved) {
        inserted++;
        onTokenEvent?.(saved);
      }
    }

    setTranscriptOffset(file, startOffset + Buffer.byteLength(consumable, 'utf8') + 1);
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

  const pending = new Map<string, NodeJS.Timeout>();

  const schedule = (file: string) => {
    if (!file.endsWith('.jsonl')) return;
    const existing = pending.get(file);
    if (existing) clearTimeout(existing);
    pending.set(file, setTimeout(async () => {
      pending.delete(file);
      try {
        const n = await ingestFile(file, onTokenEvent);
        if (n > 0) console.log(`[ingest] ${file} +${n} token_events`);
      } catch (err) {
        console.error('[ingest] error processing', file, err);
      }
    }, debounceMs));
  };

  const watcher = chokidar.watch(rootDir, {
    ignoreInitial: false,
    persistent: true,
    awaitWriteFinish: false,
    depth: 5,
  });

  watcher.on('add', schedule);
  watcher.on('change', schedule);

  const ready = new Promise<void>((resolve) => watcher.once('ready', () => resolve()));
  await ready;

  console.log(`[ingest] initial scan complete`);

  return async () => {
    for (const t of pending.values()) clearTimeout(t);
    pending.clear();
    await watcher.close();
  };
}
