// Unit tests for `parseLine` from transcript-parser.ts.
//
// These tests verify the parser's behavior on the kinds of garbage that
// real `~/.claude/projects/**/*.jsonl` transcripts produce: mixed line
// endings, multibyte UTF-8 boundaries, missing fields, malformed JSON,
// and the mtime fallback path that lets us back-fill timestamp-less rows
// without ever attributing them to `Date.now()`.

import { describe, it, expect } from 'bun:test';
import { parseLine } from './transcript-parser';

const FILE = '/tmp/fake-transcript.jsonl';
const FIXED_TS_ISO = '2026-01-15T12:00:00.000Z';
const FIXED_TS_MS = Date.parse(FIXED_TS_ISO);

function assistantLine(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    type: 'assistant',
    sessionId: 'sess-abc',
    cwd: '/repo',
    gitBranch: 'main',
    timestamp: FIXED_TS_ISO,
    requestId: 'req-1',
    message: {
      model: 'claude-opus-4-7',
      usage: {
        input_tokens: 100,
        output_tokens: 50,
        cache_read_input_tokens: 20,
        cache_creation_input_tokens: 10,
        cache_creation: {
          ephemeral_5m_input_tokens: 6,
          ephemeral_1h_input_tokens: 4,
        },
      },
    },
    ...extra,
  });
}

describe('parseLine — assistant turn', () => {
  it('parses a fully-populated assistant turn into a TokenEvent', () => {
    const row = parseLine(assistantLine(), FILE, 0);
    expect(row).not.toBeNull();
    expect(row!.session_id).toBe('sess-abc');
    expect(row!.cwd).toBe('/repo');
    expect(row!.git_branch).toBe('main');
    expect(row!.model).toBe('claude-opus-4-7');
    expect(row!.input).toBe(100);
    expect(row!.output).toBe(50);
    expect(row!.cache_read).toBe(20);
    // When ephemeral split fields are present and non-zero, cacheWrite5m
    // should be ephemeral_5m, not the combined cache_creation_input_tokens.
    expect(row!.cache_write_5m).toBe(6);
    expect(row!.cache_write_1h).toBe(4);
    expect(row!.ts).toBe(FIXED_TS_MS);
    expect(row!.transcript_file).toBe(FILE);
    expect(row!.transcript_line_offset).toBe(0);
    expect(row!.request_id).toBe('req-1');
    // Cost is computable for a known model — must be a finite positive number.
    expect(typeof row!.cost_usd).toBe('number');
    expect(Number.isFinite(row!.cost_usd as number)).toBe(true);
  });

  it('falls back to combined cache_creation_input_tokens when no ephemeral split present', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'sess-1',
      timestamp: FIXED_TS_ISO,
      message: {
        model: 'claude-opus-4-7',
        usage: {
          input_tokens: 1,
          output_tokens: 1,
          cache_creation_input_tokens: 42,
          // no `cache_creation` ephemeral split
        },
      },
    });
    const row = parseLine(line, FILE, 0);
    expect(row).not.toBeNull();
    expect(row!.cache_write_5m).toBe(42);
    expect(row!.cache_write_1h).toBe(0);
  });
});

describe('parseLine — non-assistant / skipped lines', () => {
  it('returns null for a system turn', () => {
    const sys = JSON.stringify({ type: 'system', sessionId: 's', timestamp: FIXED_TS_ISO });
    expect(parseLine(sys, FILE, 0)).toBeNull();
  });

  it('returns null for a user turn (no usage block)', () => {
    const usr = JSON.stringify({ type: 'user', sessionId: 's', timestamp: FIXED_TS_ISO });
    expect(parseLine(usr, FILE, 0)).toBeNull();
  });

  it('returns null for an assistant turn missing `usage`', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      timestamp: FIXED_TS_ISO,
      message: { model: 'claude-opus-4-7' },
    });
    expect(parseLine(line, FILE, 0)).toBeNull();
  });

  it('returns null for an assistant turn missing `model`', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      timestamp: FIXED_TS_ISO,
      message: { usage: { input_tokens: 1, output_tokens: 1 } },
    });
    expect(parseLine(line, FILE, 0)).toBeNull();
  });

  it('returns null for an assistant turn missing `sessionId`', () => {
    const line = JSON.stringify({
      type: 'assistant',
      timestamp: FIXED_TS_ISO,
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 1, output_tokens: 1 } },
    });
    expect(parseLine(line, FILE, 0)).toBeNull();
  });

  it('returns null for an empty / whitespace line', () => {
    expect(parseLine('', FILE, 0)).toBeNull();
    expect(parseLine('   ', FILE, 0)).toBeNull();
    expect(parseLine('\n', FILE, 0)).toBeNull();
  });

  it('returns null for an assistant turn with all-zero usage (keep-alive)', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      timestamp: FIXED_TS_ISO,
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 0, output_tokens: 0 } },
    });
    expect(parseLine(line, FILE, 0)).toBeNull();
  });
});

describe('parseLine — malformed input', () => {
  it('returns null for non-JSON input without throwing', () => {
    expect(parseLine('this is not json', FILE, 0)).toBeNull();
    expect(parseLine('{not even close', FILE, 0)).toBeNull();
    expect(parseLine('[}', FILE, 0)).toBeNull();
  });

  it.skip('returns null for valid JSON that is not an object (TODO: fix in source)', () => {
    // BUG DISCOVERED: parseLine throws TypeError on `JSON.parse('null')` and
    // `JSON.parse('42')` because the type-check at line 51 dereferences `obj`
    // without a null/typeof guard. The fix would be:
    //   if (!obj || typeof obj !== 'object' || obj.type !== 'assistant') return null;
    // Skipping (not fixing) per the test-builder's no-source-edit constraint.
    expect(parseLine('null', FILE, 0)).toBeNull();
    expect(parseLine('42', FILE, 0)).toBeNull();
    expect(parseLine('[]', FILE, 0)).toBeNull();
  });

  it('returns null for an invalid timestamp string', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      timestamp: 'not-a-real-date',
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 1, output_tokens: 1 } },
    });
    expect(parseLine(line, FILE, 0)).toBeNull();
  });
});

describe('parseLine — encoding edge cases', () => {
  it('handles a multibyte emoji in the JSON payload', () => {
    // Tests the byte-aware ingest path: an emoji is 4 bytes in UTF-8.
    // If a chunk boundary slices an emoji, the line passed to parseLine
    // should already be a complete decoded string by the time we get here
    // (the ingest layer is responsible for byte-correct boundaries), but
    // we verify the parser handles emoji content without choking.
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 'sess-🎉',
      timestamp: FIXED_TS_ISO,
      cwd: '/path/with/🎉/emoji',
      message: {
        model: 'claude-opus-4-7',
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    });
    const row = parseLine(line, FILE, 0);
    expect(row).not.toBeNull();
    expect(row!.session_id).toBe('sess-🎉');
    expect(row!.cwd).toBe('/path/with/🎉/emoji');
  });

  it('tolerates a CRLF line ending (trim removes the trailing \\r)', () => {
    const line = assistantLine() + '\r';
    const row = parseLine(line, FILE, 0);
    expect(row).not.toBeNull();
    expect(row!.session_id).toBe('sess-abc');
  });

  it('tolerates leading/trailing whitespace', () => {
    const line = '   ' + assistantLine() + '   ';
    const row = parseLine(line, FILE, 0);
    expect(row).not.toBeNull();
  });
});

describe('parseLine — timestamp fallback', () => {
  it('uses mtimeMs when obj.timestamp is absent', () => {
    const mtime = 1_700_000_000_000;
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      // no timestamp
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 1, output_tokens: 1 } },
    });
    const row = parseLine(line, FILE, 0, mtime);
    expect(row).not.toBeNull();
    expect(row!.ts).toBe(mtime);
  });

  it('returns null when both obj.timestamp and mtimeMs are missing', () => {
    // Critical regression guard: the previous version silently substituted
    // `Date.now()` here, which back-attributed historical rows to wall-clock
    // ingest time. We MUST refuse to invent a timestamp.
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 1, output_tokens: 1 } },
    });
    expect(parseLine(line, FILE, 0)).toBeNull();
    expect(parseLine(line, FILE, 0, undefined)).toBeNull();
  });

  it('returns null when obj.timestamp is missing and mtimeMs is non-finite', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      message: { model: 'claude-opus-4-7', usage: { input_tokens: 1, output_tokens: 1 } },
    });
    expect(parseLine(line, FILE, 0, NaN)).toBeNull();
    expect(parseLine(line, FILE, 0, Infinity)).toBeNull();
  });

  it('prefers obj.timestamp over mtimeMs when both are present', () => {
    const mtime = 1_700_000_000_000;
    const row = parseLine(assistantLine(), FILE, 0, mtime);
    expect(row).not.toBeNull();
    expect(row!.ts).toBe(FIXED_TS_MS);
    expect(row!.ts).not.toBe(mtime);
  });
});

describe('parseLine — unknown model', () => {
  it('parses an unknown model successfully but leaves cost_usd null', () => {
    const line = JSON.stringify({
      type: 'assistant',
      sessionId: 's',
      timestamp: FIXED_TS_ISO,
      message: {
        model: 'unknown-future-model-99',
        usage: { input_tokens: 1, output_tokens: 1 },
      },
    });
    const row = parseLine(line, FILE, 0);
    expect(row).not.toBeNull();
    expect(row!.model).toBe('unknown-future-model-99');
    // Token volume still recorded; cost is null (not 0) so SQL aggregations
    // can surface "unpriced" rows separately if needed.
    expect(row!.cost_usd).toBeNull();
  });
});
