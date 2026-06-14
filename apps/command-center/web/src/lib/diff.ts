// Reconstruct original/modified text from a unified `git diff` so Monaco's
// side-by-side DiffEditor can render it. We can't recover unchanged regions
// between hunks (they're elided from the patch), but per-hunk context + the
// +/- lines are enough for a faithful, readable diff view.

export interface ReconstructedDiff {
  original: string;
  modified: string;
}

export function parseUnifiedDiff(diff: string): ReconstructedDiff {
  const original: string[] = [];
  const modified: string[] = [];
  if (!diff) return { original: '', modified: '' };

  const lines = diff.split('\n');
  let inHunk = false;

  for (const line of lines) {
    if (line.startsWith('@@')) {
      inHunk = true;
      // Separate hunks with a blank line for readability.
      if (original.length) original.push('');
      if (modified.length) modified.push('');
      continue;
    }
    if (!inHunk) continue; // skip `diff --git`, `index`, `---`, `+++` headers
    if (line.startsWith('\\')) continue; // "\ No newline at end of file"

    const tag = line[0];
    const content = line.slice(1);
    if (tag === '+') {
      modified.push(content);
    } else if (tag === '-') {
      original.push(content);
    } else {
      // context (' ') or empty line within a hunk
      original.push(content);
      modified.push(content);
    }
  }

  return { original: original.join('\n'), modified: modified.join('\n') };
}

// Best-effort Monaco language id from a file extension.
const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  md: 'markdown',
  css: 'css',
  scss: 'scss',
  html: 'html',
  py: 'python',
  rs: 'rust',
  go: 'go',
  sh: 'shell',
  bash: 'shell',
  yml: 'yaml',
  yaml: 'yaml',
  toml: 'ini',
  sql: 'sql',
};

export function languageFromPath(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  return EXT_LANG[ext] ?? 'plaintext';
}
