import { Database } from 'bun:sqlite';
import type { HookEvent, FilterOptions, Theme, ThemeSearchQuery } from './types';

let db: Database;

export function initDatabase(): void {
  db = new Database('events.db');
  
  // Enable WAL mode for better concurrent performance
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA synchronous = NORMAL');
  
  // Create events table
  db.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_app TEXT NOT NULL,
      session_id TEXT NOT NULL,
      hook_event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      chat TEXT,
      summary TEXT,
      timestamp INTEGER NOT NULL
    )
  `);
  
  // Check if chat column exists, add it if not (for migration)
  try {
    const columns = db.prepare("PRAGMA table_info(events)").all() as any[];
    const hasChatColumn = columns.some((col: any) => col.name === 'chat');
    if (!hasChatColumn) {
      db.exec('ALTER TABLE events ADD COLUMN chat TEXT');
    }

    // Check if summary column exists, add it if not (for migration)
    const hasSummaryColumn = columns.some((col: any) => col.name === 'summary');
    if (!hasSummaryColumn) {
      db.exec('ALTER TABLE events ADD COLUMN summary TEXT');
    }

    // Check if humanInTheLoop column exists, add it if not (for migration)
    const hasHumanInTheLoopColumn = columns.some((col: any) => col.name === 'humanInTheLoop');
    if (!hasHumanInTheLoopColumn) {
      db.exec('ALTER TABLE events ADD COLUMN humanInTheLoop TEXT');
    }

    // Check if humanInTheLoopStatus column exists, add it if not (for migration)
    const hasHumanInTheLoopStatusColumn = columns.some((col: any) => col.name === 'humanInTheLoopStatus');
    if (!hasHumanInTheLoopStatusColumn) {
      db.exec('ALTER TABLE events ADD COLUMN humanInTheLoopStatus TEXT');
    }

    // Check if model_name column exists, add it if not (for migration)
    const hasModelNameColumn = columns.some((col: any) => col.name === 'model_name');
    if (!hasModelNameColumn) {
      db.exec('ALTER TABLE events ADD COLUMN model_name TEXT');
    }
  } catch (error) {
    // If the table doesn't exist yet, the CREATE TABLE above will handle it
  }
  
  // Create indexes for common queries
  db.exec('CREATE INDEX IF NOT EXISTS idx_source_app ON events(source_app)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_session_id ON events(session_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_hook_event_type ON events(hook_event_type)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_timestamp ON events(timestamp)');
  
  // Create themes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS themes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      displayName TEXT NOT NULL,
      description TEXT,
      colors TEXT NOT NULL,
      isPublic INTEGER NOT NULL DEFAULT 0,
      authorId TEXT,
      authorName TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      tags TEXT,
      downloadCount INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      ratingCount INTEGER DEFAULT 0
    )
  `);
  
  // Create theme shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS theme_shares (
      id TEXT PRIMARY KEY,
      themeId TEXT NOT NULL,
      shareToken TEXT NOT NULL UNIQUE,
      expiresAt INTEGER,
      isPublic INTEGER NOT NULL DEFAULT 0,
      allowedUsers TEXT,
      createdAt INTEGER NOT NULL,
      accessCount INTEGER DEFAULT 0,
      FOREIGN KEY (themeId) REFERENCES themes (id) ON DELETE CASCADE
    )
  `);
  
  // Create theme ratings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS theme_ratings (
      id TEXT PRIMARY KEY,
      themeId TEXT NOT NULL,
      userId TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      createdAt INTEGER NOT NULL,
      UNIQUE(themeId, userId),
      FOREIGN KEY (themeId) REFERENCES themes (id) ON DELETE CASCADE
    )
  `);
  
  // Create indexes for theme tables
  db.exec('CREATE INDEX IF NOT EXISTS idx_themes_name ON themes(name)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_themes_isPublic ON themes(isPublic)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_themes_createdAt ON themes(createdAt)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_theme_shares_token ON theme_shares(shareToken)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_theme_ratings_theme ON theme_ratings(themeId)');

  // Token usage tracking — populated by transcript-ingest.ts watching
  // ~/.claude/projects/**/*.jsonl. One row per assistant turn.
  //
  // Path-only dedupe (transcript_file + transcript_line_offset) collides when
  // a `.jsonl` is truncated and recreated at the same path: a row at offset N
  // in the new file looks identical to a row at offset N in the previous
  // incarnation, so SQLite either rejects the new row or — worse — silently
  // dedupes legitimate new data. We pin file identity with the (dev, ino)
  // tuple so identical paths with different underlying inodes are treated as
  // distinct. `inode` is nullable for pre-migration rows; in that case the
  // dedupe falls back to path-only behaviour (matching the legacy semantics).
  db.exec(`
    CREATE TABLE IF NOT EXISTS token_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts INTEGER NOT NULL,
      session_id TEXT NOT NULL,
      cwd TEXT,
      git_branch TEXT,
      model TEXT NOT NULL,
      input INTEGER NOT NULL DEFAULT 0,
      cache_read INTEGER NOT NULL DEFAULT 0,
      cache_write_5m INTEGER NOT NULL DEFAULT 0,
      cache_write_1h INTEGER NOT NULL DEFAULT 0,
      output INTEGER NOT NULL DEFAULT 0,
      cost_usd REAL,
      request_id TEXT,
      transcript_file TEXT NOT NULL,
      transcript_line_offset INTEGER NOT NULL,
      inode INTEGER,
      UNIQUE(transcript_file, inode, transcript_line_offset)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_token_events_ts ON token_events(ts)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_token_events_session ON token_events(session_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_token_events_model ON token_events(model)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_token_events_cwd ON token_events(cwd)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS transcript_offsets (
      file TEXT PRIMARY KEY,
      offset INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      inode INTEGER
    )
  `);

  // Migration mirror for token_events — same pattern as the events table above.
  // If a future column is added to the CREATE TABLE block, add an ADD COLUMN
  // here so existing databases pick it up without a rebuild.
  //
  // `inode` is nullable INTEGER. Pre-migration rows store NULL. The ingest
  // layer treats NULL inode as a wildcard — i.e. legacy rows match by path
  // alone (preserving the old dedupe semantics). New rows written by an
  // up-to-date ingester carry their inode, so a path that gets rotated to
  // a different inode no longer collides with the old row at offset N.
  // (The table-level UNIQUE constraint stays as it was for legacy installs;
  // rotation is also defended procedurally via inodeMap in transcript-ingest.)
  try {
    const tokenEventsCols = db.prepare("PRAGMA table_info(token_events)").all() as any[];
    const expectedTokenCols: { name: string; ddl: string }[] = [
      { name: 'ts', ddl: 'ts INTEGER NOT NULL DEFAULT 0' },
      { name: 'session_id', ddl: 'session_id TEXT NOT NULL DEFAULT \'\'' },
      { name: 'cwd', ddl: 'cwd TEXT' },
      { name: 'git_branch', ddl: 'git_branch TEXT' },
      { name: 'model', ddl: 'model TEXT NOT NULL DEFAULT \'\'' },
      { name: 'input', ddl: 'input INTEGER NOT NULL DEFAULT 0' },
      { name: 'cache_read', ddl: 'cache_read INTEGER NOT NULL DEFAULT 0' },
      { name: 'cache_write_5m', ddl: 'cache_write_5m INTEGER NOT NULL DEFAULT 0' },
      { name: 'cache_write_1h', ddl: 'cache_write_1h INTEGER NOT NULL DEFAULT 0' },
      { name: 'output', ddl: 'output INTEGER NOT NULL DEFAULT 0' },
      { name: 'cost_usd', ddl: 'cost_usd REAL' },
      { name: 'request_id', ddl: 'request_id TEXT' },
      { name: 'transcript_file', ddl: 'transcript_file TEXT NOT NULL DEFAULT \'\'' },
      { name: 'transcript_line_offset', ddl: 'transcript_line_offset INTEGER NOT NULL DEFAULT 0' },
      { name: 'inode', ddl: 'inode INTEGER' },
    ];
    for (const col of expectedTokenCols) {
      const has = tokenEventsCols.some((c: any) => c.name === col.name);
      if (!has) {
        db.exec(`ALTER TABLE token_events ADD COLUMN ${col.ddl}`);
      }
    }
  } catch (error) {
    // table doesn't exist or pragma failed — CREATE TABLE above handles fresh installs
  }

  // Migration mirror for transcript_offsets. `inode` is the persisted (dev,
  // ino) hash for the file at the time the offset was recorded. On startup,
  // if the on-disk inode doesn't match the stored inode the offset is reset
  // to 0 so the new file incarnation is re-ingested from the top.
  try {
    const offsetsCols = db.prepare("PRAGMA table_info(transcript_offsets)").all() as any[];
    const expectedOffsetCols: { name: string; ddl: string }[] = [
      { name: 'file', ddl: 'file TEXT' },
      { name: 'offset', ddl: 'offset INTEGER NOT NULL DEFAULT 0' },
      { name: 'updated_at', ddl: 'updated_at INTEGER NOT NULL DEFAULT 0' },
      { name: 'inode', ddl: 'inode INTEGER' },
    ];
    for (const col of expectedOffsetCols) {
      const has = offsetsCols.some((c: any) => c.name === col.name);
      if (!has) {
        db.exec(`ALTER TABLE transcript_offsets ADD COLUMN ${col.ddl}`);
      }
    }
  } catch (error) {
    // table doesn't exist or pragma failed — CREATE TABLE above handles fresh installs
  }
}

export interface TokenEventRow {
  id?: number;
  ts: number;
  session_id: string;
  cwd: string | null;
  git_branch: string | null;
  model: string;
  input: number;
  cache_read: number;
  cache_write_5m: number;
  cache_write_1h: number;
  output: number;
  cost_usd: number | null;
  request_id: string | null;
  transcript_file: string;
  transcript_line_offset: number;
  // Stable file identity (typically the OS inode number) at the time the
  // row was ingested. Optional on the type because:
  //   1. Legacy rows persisted before the inode migration are stored as NULL.
  //   2. The ingest layer is the only producer that knows the inode; tests
  //      and ad-hoc inserts may omit it.
  // When present, two rows with the same (transcript_file, offset) but
  // different inodes are treated as distinct (file rotation case).
  inode?: number | null;
}

export function insertTokenEvent(row: TokenEventRow): TokenEventRow | null {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO token_events
      (ts, session_id, cwd, git_branch, model, input, cache_read, cache_write_5m, cache_write_1h, output, cost_usd, request_id, transcript_file, transcript_line_offset, inode)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    row.ts,
    row.session_id,
    row.cwd,
    row.git_branch,
    row.model,
    row.input,
    row.cache_read,
    row.cache_write_5m,
    row.cache_write_1h,
    row.output,
    row.cost_usd,
    row.request_id,
    row.transcript_file,
    row.transcript_line_offset,
    row.inode ?? null
  );
  if (result.changes === 0) return null;
  return { ...row, id: Number(result.lastInsertRowid) };
}

export interface TranscriptOffsetRow {
  offset: number;
  inode: number | null;
}

// Returns just the persisted byte offset for `file`. Kept for callers that
// don't care about inode (e.g. legacy code paths). New callers should prefer
// `getTranscriptOffsetRow` so they can validate the inode against the
// current on-disk file and reset on mismatch.
export function getTranscriptOffset(file: string): number {
  return getTranscriptOffsetRow(file)?.offset ?? 0;
}

// Returns the persisted offset row including stored inode. NULL inode means
// the row was written before the inode migration — callers should treat NULL
// as a wildcard (path-only match) to preserve legacy behaviour.
export function getTranscriptOffsetRow(file: string): TranscriptOffsetRow | null {
  const stmt = db.prepare('SELECT offset, inode FROM transcript_offsets WHERE file = ?');
  const row = stmt.get(file) as { offset: number; inode: number | null } | undefined;
  if (!row) return null;
  return { offset: row.offset, inode: row.inode };
}

export function setTranscriptOffset(file: string, offset: number, inode?: number | null): void {
  const stmt = db.prepare(`
    INSERT INTO transcript_offsets (file, offset, updated_at, inode) VALUES (?, ?, ?, ?)
    ON CONFLICT(file) DO UPDATE SET
      offset = excluded.offset,
      updated_at = excluded.updated_at,
      inode = excluded.inode
  `);
  stmt.run(file, offset, Date.now(), inode ?? null);
}

// Used by the transcript-ingest unlink handler — drop the row when its
// underlying file is removed so the offsets table doesn't grow forever.
export function deleteTranscriptOffset(file: string): void {
  const stmt = db.prepare('DELETE FROM transcript_offsets WHERE file = ?');
  stmt.run(file);
}

// Used by the /api/tokens/event REST fallback in the client's findCostForEvent.
// Returns the closest token_events row (by |ts - target|) within the window,
// or null if no row is within window ms.
export function findTokenEventNear(
  sessionId: string,
  ts: number,
  windowMs: number,
): TokenEventRow | null {
  const stmt = db.prepare(`
    SELECT * FROM token_events
    WHERE session_id = ? AND ABS(ts - ?) <= ?
    ORDER BY ABS(ts - ?) ASC
    LIMIT 1
  `);
  const row = stmt.get(sessionId, ts, windowMs, ts) as TokenEventRow | undefined;
  return row ?? null;
}

export function insertEvent(event: HookEvent): HookEvent {
  const stmt = db.prepare(`
    INSERT INTO events (source_app, session_id, hook_event_type, payload, chat, summary, timestamp, humanInTheLoop, humanInTheLoopStatus, model_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const timestamp = event.timestamp || Date.now();

  // Initialize humanInTheLoopStatus to pending if humanInTheLoop exists
  let humanInTheLoopStatus = event.humanInTheLoopStatus;
  if (event.humanInTheLoop && !humanInTheLoopStatus) {
    humanInTheLoopStatus = { status: 'pending' };
  }

  const result = stmt.run(
    event.source_app,
    event.session_id,
    event.hook_event_type,
    JSON.stringify(event.payload),
    event.chat ? JSON.stringify(event.chat) : null,
    event.summary || null,
    timestamp,
    event.humanInTheLoop ? JSON.stringify(event.humanInTheLoop) : null,
    humanInTheLoopStatus ? JSON.stringify(humanInTheLoopStatus) : null,
    event.model_name || null
  );

  return {
    ...event,
    id: Number(result.lastInsertRowid),
    timestamp,
    humanInTheLoopStatus
  };
}

export function getFilterOptions(): FilterOptions {
  const sourceApps = db.prepare('SELECT DISTINCT source_app FROM events ORDER BY source_app').all() as { source_app: string }[];
  const sessionIds = db.prepare('SELECT DISTINCT session_id FROM events ORDER BY session_id DESC LIMIT 300').all() as { session_id: string }[];
  const hookEventTypes = db.prepare('SELECT DISTINCT hook_event_type FROM events ORDER BY hook_event_type').all() as { hook_event_type: string }[];
  
  return {
    source_apps: sourceApps.map(row => row.source_app),
    session_ids: sessionIds.map(row => row.session_id),
    hook_event_types: hookEventTypes.map(row => row.hook_event_type)
  };
}

export function getRecentEvents(limit: number = 300): HookEvent[] {
  const stmt = db.prepare(`
    SELECT id, source_app, session_id, hook_event_type, payload, chat, summary, timestamp, humanInTheLoop, humanInTheLoopStatus, model_name
    FROM events
    ORDER BY timestamp DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as any[];

  return rows.map(row => ({
    id: row.id,
    source_app: row.source_app,
    session_id: row.session_id,
    hook_event_type: row.hook_event_type,
    payload: JSON.parse(row.payload),
    chat: row.chat ? JSON.parse(row.chat) : undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp,
    humanInTheLoop: row.humanInTheLoop ? JSON.parse(row.humanInTheLoop) : undefined,
    humanInTheLoopStatus: row.humanInTheLoopStatus ? JSON.parse(row.humanInTheLoopStatus) : undefined,
    model_name: row.model_name || undefined
  })).reverse();
}

// Theme database functions
export function insertTheme(theme: Theme): Theme {
  const stmt = db.prepare(`
    INSERT INTO themes (id, name, displayName, description, colors, isPublic, authorId, authorName, createdAt, updatedAt, tags, downloadCount, rating, ratingCount)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(
    theme.id,
    theme.name,
    theme.displayName,
    theme.description || null,
    JSON.stringify(theme.colors),
    theme.isPublic ? 1 : 0,
    theme.authorId || null,
    theme.authorName || null,
    theme.createdAt,
    theme.updatedAt,
    JSON.stringify(theme.tags),
    theme.downloadCount || 0,
    theme.rating || 0,
    theme.ratingCount || 0
  );
  
  return theme;
}

export function updateTheme(id: string, updates: Partial<Theme>): boolean {
  const allowedFields = ['displayName', 'description', 'colors', 'isPublic', 'updatedAt', 'tags'];
  const setClause = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => `${key} = ?`)
    .join(', ');
  
  if (!setClause) return false;
  
  const values = Object.keys(updates)
    .filter(key => allowedFields.includes(key))
    .map(key => {
      if (key === 'colors' || key === 'tags') {
        return JSON.stringify(updates[key as keyof Theme]);
      }
      if (key === 'isPublic') {
        return updates[key as keyof Theme] ? 1 : 0;
      }
      return updates[key as keyof Theme];
    });
  
  const stmt = db.prepare(`UPDATE themes SET ${setClause} WHERE id = ?`);
  const result = stmt.run(...values, id);
  
  return result.changes > 0;
}

export function getTheme(id: string): Theme | null {
  const stmt = db.prepare('SELECT * FROM themes WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return null;
  
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    colors: JSON.parse(row.colors),
    isPublic: Boolean(row.isPublic),
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: JSON.parse(row.tags || '[]'),
    downloadCount: row.downloadCount,
    rating: row.rating,
    ratingCount: row.ratingCount
  };
}

export function getThemes(query: ThemeSearchQuery = {}): Theme[] {
  let sql = 'SELECT * FROM themes WHERE 1=1';
  const params: any[] = [];
  
  if (query.isPublic !== undefined) {
    sql += ' AND isPublic = ?';
    params.push(query.isPublic ? 1 : 0);
  }
  
  if (query.authorId) {
    sql += ' AND authorId = ?';
    params.push(query.authorId);
  }
  
  if (query.query) {
    sql += ' AND (name LIKE ? OR displayName LIKE ? OR description LIKE ?)';
    const searchTerm = `%${query.query}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }
  
  // Add sorting
  const sortBy = query.sortBy || 'created';
  const safeSortOrder = ['ASC', 'DESC'].includes(query.sortOrder?.toUpperCase() ?? '') ? query.sortOrder!.toUpperCase() : 'DESC';
  const sortColumn = {
    name: 'name',
    created: 'createdAt',
    updated: 'updatedAt',
    downloads: 'downloadCount',
    rating: 'rating'
  }[sortBy] || 'createdAt';

  sql += ` ORDER BY ${sortColumn} ${safeSortOrder}`;
  
  // Add pagination
  if (query.limit) {
    sql += ' LIMIT ?';
    params.push(query.limit);
    
    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }
  }
  
  const stmt = db.prepare(sql);
  const rows = stmt.all(...params) as any[];
  
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    description: row.description,
    colors: JSON.parse(row.colors),
    isPublic: Boolean(row.isPublic),
    authorId: row.authorId,
    authorName: row.authorName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tags: JSON.parse(row.tags || '[]'),
    downloadCount: row.downloadCount,
    rating: row.rating,
    ratingCount: row.ratingCount
  }));
}

export function deleteTheme(id: string): boolean {
  const stmt = db.prepare('DELETE FROM themes WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

export function incrementThemeDownloadCount(id: string): boolean {
  const stmt = db.prepare('UPDATE themes SET downloadCount = downloadCount + 1 WHERE id = ?');
  const result = stmt.run(id);
  return result.changes > 0;
}

// HITL helper functions
export function updateEventHITLResponse(id: number, response: any): HookEvent | null {
  const status = {
    status: 'responded',
    respondedAt: response.respondedAt,
    response
  };

  const stmt = db.prepare('UPDATE events SET humanInTheLoopStatus = ? WHERE id = ?');
  stmt.run(JSON.stringify(status), id);

  const selectStmt = db.prepare(`
    SELECT id, source_app, session_id, hook_event_type, payload, chat, summary, timestamp, humanInTheLoop, humanInTheLoopStatus, model_name
    FROM events
    WHERE id = ?
  `);
  const row = selectStmt.get(id) as any;

  if (!row) return null;

  return {
    id: row.id,
    source_app: row.source_app,
    session_id: row.session_id,
    hook_event_type: row.hook_event_type,
    payload: JSON.parse(row.payload),
    chat: row.chat ? JSON.parse(row.chat) : undefined,
    summary: row.summary || undefined,
    timestamp: row.timestamp,
    humanInTheLoop: row.humanInTheLoop ? JSON.parse(row.humanInTheLoop) : undefined,
    humanInTheLoopStatus: row.humanInTheLoopStatus ? JSON.parse(row.humanInTheLoopStatus) : undefined,
    model_name: row.model_name || undefined
  };
}

export { db };