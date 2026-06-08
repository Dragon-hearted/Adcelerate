// Unit tests for the github poller's pure parsing helpers.
import { describe, it, expect } from 'bun:test';
import { parseTrack, normalizePrState, toMs } from '../../src/github/poller';

describe('parseTrack — %(upstream:track) parsing', () => {
  it('parses ahead+behind', () => {
    expect(parseTrack('[ahead 2, behind 1]')).toEqual({ ahead: 2, behind: 1 });
  });
  it('parses ahead only', () => {
    expect(parseTrack('[ahead 3]')).toEqual({ ahead: 3, behind: undefined });
  });
  it('parses behind only', () => {
    expect(parseTrack('[behind 4]')).toEqual({ ahead: undefined, behind: 4 });
  });
  it('returns undefined for in-sync / gone / empty', () => {
    expect(parseTrack('')).toEqual({ ahead: undefined, behind: undefined });
    expect(parseTrack('[gone]')).toEqual({ ahead: undefined, behind: undefined });
  });
});

describe('normalizePrState — gh state → contract state', () => {
  it('maps gh uppercase states', () => {
    expect(normalizePrState('OPEN')).toBe('open');
    expect(normalizePrState('CLOSED')).toBe('closed');
    expect(normalizePrState('MERGED')).toBe('merged');
  });
  it('defaults unknown to open', () => {
    expect(normalizePrState('')).toBe('open');
    expect(normalizePrState('weird')).toBe('open');
  });
});

describe('toMs — ISO → epoch ms with NaN guard', () => {
  it('parses a valid ISO timestamp', () => {
    expect(toMs('2026-01-15T12:00:00.000Z')).toBe(Date.parse('2026-01-15T12:00:00.000Z'));
  });
  it('returns 0 for an invalid timestamp', () => {
    expect(toMs('not-a-date')).toBe(0);
    expect(toMs('')).toBe(0);
  });
});
