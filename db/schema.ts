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

// A live analysis runs as a persistent, resumable job. Each row holds the job's
// status, current stage, and a JSON snapshot of every completed stage's output,
// so the analysis survives navigation, refresh, and process restarts, and a
// retry resumes from the last checkpoint. `lease_until` serializes execution so
// two concurrent drivers never run the same stage (and never double-spend
// tokens). Rows expire like cache entries and are removed on reset.
export const createAnalysisJobsSql = `
  CREATE TABLE IF NOT EXISTS analysis_jobs (
    job_id TEXT PRIMARY KEY,
    session_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    stage TEXT NOT NULL,
    state_json TEXT NOT NULL,
    lease_until INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )
`;

export const createJobSessionIndexSql = `
  CREATE INDEX IF NOT EXISTS analysis_jobs_session_idx
  ON analysis_jobs (session_hash)
`;
