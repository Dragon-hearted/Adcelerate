// classifyEffect (#43) — pure effect-class ruleset. read auto-allows; everything
// not provably read-only gates (fail-safe). Mirrors canUseTool's RISKY set + the
// new client/-path detection.
import { test, expect, describe } from 'bun:test';
import { classifyEffect, type EffectClass } from '../src/index';

describe('classifyEffect — pure effect ruleset (#43)', () => {
  test('read-only tools → read (auto-allow)', () => {
    for (const t of ['Read', 'Grep', 'Glob', 'LS']) {
      expect(classifyEffect(t)).toBe('read' satisfies EffectClass);
    }
  });

  test('a Write whose path is under client/ → irreversible', () => {
    expect(classifyEffect('Write', { file_path: 'client/acme/brand.json' })).toBe('irreversible');
    expect(classifyEffect('Write', { file_path: '/abs/repo/client/x/out.png' })).toBe('irreversible');
  });

  test('Write/Edit/MultiEdit/NotebookEdit → irreversible regardless of path', () => {
    for (const t of ['Write', 'Edit', 'MultiEdit', 'NotebookEdit']) {
      expect(classifyEffect(t, { file_path: 'docs/readme.md' })).toBe('irreversible');
    }
  });

  test('Bash → irreversible', () => {
    expect(classifyEffect('Bash', { command: 'ls -la' })).toBe('irreversible');
  });

  test('network/proxy tools → irreversible (mirrors canUseTool regex)', () => {
    for (const t of ['WebFetch', 'mcp__http__post', 'mcp__x__fetch']) {
      expect(classifyEffect(t)).toBe('irreversible');
    }
  });

  test('unknown tool name → irreversible (FAIL-SAFE gate)', () => {
    expect(classifyEffect('SomeMysteryTool')).toBe('irreversible');
    expect(classifyEffect('mcp__weird__thing', { foo: 1 })).toBe('irreversible');
  });
});
