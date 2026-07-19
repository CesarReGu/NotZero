export const createAnalysisSessionsSql = `
  CREATE TABLE IF NOT EXISTS analysis_sessions (
    session_hash TEXT NOT NULL,
    window_start INTEGER NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0,
    live_count INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (session_hash, window_start)
  )
`;

export const createOperationalCountersSql = `
  CREATE TABLE IF NOT EXISTS operational_counters (
    key TEXT PRIMARY KEY,
    value INTEGER NOT NULL DEFAULT 0,
    updated_at INTEGER NOT NULL
  )
`;

export const createAnalysisCacheSql = `
  CREATE TABLE IF NOT EXISTS analysis_cache (
    cache_key TEXT PRIMARY KEY,
    session_hash TEXT NOT NULL,
    response_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`;

export const createCacheSessionIndexSql = `
  CREATE INDEX IF NOT EXISTS analysis_cache_session_idx
  ON analysis_cache (session_hash)
`;
