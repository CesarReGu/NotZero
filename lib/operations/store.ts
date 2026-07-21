import {
  createAnalysisCacheSql,
  createAnalysisJobsSql,
  createAnalysisSessionsSql,
  createCacheSessionIndexSql,
  createJobSessionIndexSql,
  createOperationalCountersSql,
} from "@/db/schema";
import { getOperationalDatabase } from "@/lib/operations/database";
import type { Job, JobStatus, JobStage } from "@/lib/analysis/job";

type SessionUsage = { allowed: boolean; requestCount: number; liveCount: number };
type CachedResult = { responseJson: string; expiresAt: number };
type StoredJobRow = { sessionHash: string; status: JobStatus; stage: JobStage; stateJson: string; leaseUntil: number; createdAt: number; updatedAt: number; expiresAt: number };

const memorySymbol = Symbol.for("notzero.operationalMemory");
type MemoryState = {
  sessions: Map<string, { requestCount: number; liveCount: number }>;
  counters: Map<string, number>;
  cache: Map<string, { sessionHash: string; responseJson: string; expiresAt: number }>;
  jobs: Map<string, StoredJobRow>;
};
type MemoryGlobal = typeof globalThis & { [memorySymbol]?: MemoryState };

function memoryState() {
  const target = globalThis as MemoryGlobal;
  return target[memorySymbol] ??= { sessions: new Map(), counters: new Map(), cache: new Map(), jobs: new Map() };
}

let initializedDatabase: D1Database | null = null;
let initialization: Promise<void> | null = null;

async function ensureDatabase(database: D1Database) {
  if (initializedDatabase === database && initialization) return initialization;
  initializedDatabase = database;
  initialization = database.batch([
    database.prepare(createAnalysisSessionsSql),
    database.prepare(createOperationalCountersSql),
    database.prepare(createAnalysisCacheSql),
    database.prepare(createCacheSessionIndexSql),
    database.prepare(createAnalysisJobsSql),
    database.prepare(createJobSessionIndexSql),
  ]).then(() => undefined);
  return initialization;
}

export function dailyWindowStart(now: number) {
  return Math.floor(now / 86_400_000) * 86_400_000;
}

export async function recordSessionRequest(sessionHash: string, now: number, requestLimit: number): Promise<SessionUsage> {
  const windowStart = dailyWindowStart(now);
  const database = getOperationalDatabase();
  if (!database) {
    const memory = memoryState();
    const key = `${sessionHash}:${windowStart}`;
    const usage = memory.sessions.get(key) ?? { requestCount: 0, liveCount: 0 };
    if (usage.requestCount >= requestLimit) return { allowed: false, ...usage };
    usage.requestCount += 1;
    memory.sessions.set(key, usage);
    return { allowed: true, ...usage };
  }

  await ensureDatabase(database);
  const result = await database.prepare(`
    INSERT INTO analysis_sessions (session_hash, window_start, request_count, live_count, updated_at)
    VALUES (?, ?, 1, 0, ?)
    ON CONFLICT (session_hash, window_start) DO UPDATE SET
      request_count = request_count + 1,
      updated_at = excluded.updated_at
    WHERE request_count < ?
  `).bind(sessionHash, windowStart, now, requestLimit).run();
  const usage = await database.prepare("SELECT request_count AS requestCount, live_count AS liveCount FROM analysis_sessions WHERE session_hash = ? AND window_start = ?")
    .bind(sessionHash, windowStart).first<{ requestCount: number; liveCount: number }>();
  return { allowed: Number(result.meta.changes ?? 0) > 0, requestCount: usage?.requestCount ?? requestLimit, liveCount: usage?.liveCount ?? 0 };
}

export async function reserveLiveAnalysis(sessionHash: string, now: number, sessionLimit: number, globalLimit: number, counterKey: string) {
  const windowStart = dailyWindowStart(now);
  const database = getOperationalDatabase();
  if (!database) {
    const memory = memoryState();
    const sessionKey = `${sessionHash}:${windowStart}`;
    const usage = memory.sessions.get(sessionKey) ?? { requestCount: 0, liveCount: 0 };
    const globalCount = memory.counters.get(counterKey) ?? 0;
    if (usage.liveCount >= sessionLimit) return { allowed: false, reason: "session_limit" as const };
    if (globalCount >= globalLimit) return { allowed: false, reason: "global_limit" as const };
    usage.liveCount += 1;
    memory.sessions.set(sessionKey, usage);
    memory.counters.set(counterKey, globalCount + 1);
    return { allowed: true as const };
  }

  await ensureDatabase(database);
  const session = await database.prepare("SELECT live_count AS liveCount FROM analysis_sessions WHERE session_hash = ? AND window_start = ?")
    .bind(sessionHash, windowStart).first<{ liveCount: number }>();
  if ((session?.liveCount ?? 0) >= sessionLimit) return { allowed: false as const, reason: "session_limit" as const };

  const globalResult = await database.prepare(`
    INSERT INTO operational_counters (key, value, updated_at) VALUES (?, 1, ?)
    ON CONFLICT (key) DO UPDATE SET value = value + 1, updated_at = excluded.updated_at
    WHERE value < ?
  `).bind(counterKey, now, globalLimit).run();
  if (Number(globalResult.meta.changes ?? 0) === 0) return { allowed: false as const, reason: "global_limit" as const };

  const sessionResult = await database.prepare(`
    UPDATE analysis_sessions SET live_count = live_count + 1, updated_at = ?
    WHERE session_hash = ? AND window_start = ? AND live_count < ?
  `).bind(now, sessionHash, windowStart, sessionLimit).run();
  if (Number(sessionResult.meta.changes ?? 0) === 0) return { allowed: false as const, reason: "session_limit" as const };
  return { allowed: true as const };
}

export async function getCachedResult(cacheKey: string, now: number): Promise<CachedResult | null> {
  const database = getOperationalDatabase();
  if (!database) {
    const entry = memoryState().cache.get(cacheKey);
    if (!entry || entry.expiresAt <= now) {
      memoryState().cache.delete(cacheKey);
      return null;
    }
    return { responseJson: entry.responseJson, expiresAt: entry.expiresAt };
  }
  await ensureDatabase(database);
  await database.prepare("DELETE FROM analysis_cache WHERE expires_at <= ?").bind(now).run();
  const entry = await database.prepare("SELECT response_json AS responseJson, expires_at AS expiresAt FROM analysis_cache WHERE cache_key = ?")
    .bind(cacheKey).first<CachedResult>();
  return entry ?? null;
}

export async function getSessionCachedResult(cacheKey: string, sessionHash: string, now: number): Promise<CachedResult | null> {
  const database = getOperationalDatabase();
  if (!database) {
    const entry = memoryState().cache.get(cacheKey);
    if (!entry || entry.sessionHash !== sessionHash || entry.expiresAt <= now) {
      if (entry?.expiresAt && entry.expiresAt <= now) memoryState().cache.delete(cacheKey);
      return null;
    }
    return { responseJson: entry.responseJson, expiresAt: entry.expiresAt };
  }
  await ensureDatabase(database);
  await database.prepare("DELETE FROM analysis_cache WHERE expires_at <= ?").bind(now).run();
  return await database.prepare("SELECT response_json AS responseJson, expires_at AS expiresAt FROM analysis_cache WHERE cache_key = ? AND session_hash = ?")
    .bind(cacheKey, sessionHash).first<CachedResult>() ?? null;
}

export async function putCachedResult(cacheKey: string, sessionHash: string, responseJson: string, now: number, ttlSeconds: number) {
  const expiresAt = now + ttlSeconds * 1000;
  const database = getOperationalDatabase();
  if (!database) {
    memoryState().cache.set(cacheKey, { sessionHash, responseJson, expiresAt });
    return;
  }
  await ensureDatabase(database);
  await database.prepare(`
    INSERT INTO analysis_cache (cache_key, session_hash, response_json, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (cache_key) DO UPDATE SET response_json = excluded.response_json, session_hash = excluded.session_hash, created_at = excluded.created_at, expires_at = excluded.expires_at
  `).bind(cacheKey, sessionHash, responseJson, now, expiresAt).run();
}

export async function deleteSessionCache(sessionHash: string) {
  const database = getOperationalDatabase();
  if (!database) {
    const memory = memoryState();
    for (const [key, value] of memory.cache) if (value.sessionHash === sessionHash) memory.cache.delete(key);
    return;
  }
  await ensureDatabase(database);
  await database.prepare("DELETE FROM analysis_cache WHERE session_hash = ?").bind(sessionHash).run();
}

function rowToJob(jobId: string, row: StoredJobRow): Job {
  return { id: jobId, sessionHash: row.sessionHash, status: row.status, stage: row.stage, state: JSON.parse(row.stateJson), createdAt: row.createdAt, updatedAt: row.updatedAt };
}

export async function createJob(job: Job, now: number, ttlSeconds: number) {
  const expiresAt = now + ttlSeconds * 1000;
  const stateJson = JSON.stringify(job.state);
  const database = getOperationalDatabase();
  if (!database) {
    memoryState().jobs.set(job.id, { sessionHash: job.sessionHash, status: job.status, stage: job.stage, stateJson, leaseUntil: 0, createdAt: job.createdAt, updatedAt: job.updatedAt, expiresAt });
    return;
  }
  await ensureDatabase(database);
  await database.prepare(`
    INSERT INTO analysis_jobs (job_id, session_hash, status, stage, state_json, lease_until, created_at, updated_at, expires_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).bind(job.id, job.sessionHash, job.status, job.stage, stateJson, job.createdAt, job.updatedAt, expiresAt).run();
}

export async function getJob(jobId: string, sessionHash: string, now: number): Promise<Job | null> {
  const database = getOperationalDatabase();
  if (!database) {
    const row = memoryState().jobs.get(jobId);
    if (!row || row.sessionHash !== sessionHash) return null;
    if (row.expiresAt <= now) { memoryState().jobs.delete(jobId); return null; }
    return rowToJob(jobId, row);
  }
  await ensureDatabase(database);
  await database.prepare("DELETE FROM analysis_jobs WHERE expires_at <= ?").bind(now).run();
  const row = await database.prepare("SELECT session_hash AS sessionHash, status, stage, state_json AS stateJson, lease_until AS leaseUntil, created_at AS createdAt, updated_at AS updatedAt, expires_at AS expiresAt FROM analysis_jobs WHERE job_id = ? AND session_hash = ?")
    .bind(jobId, sessionHash).first<StoredJobRow>();
  return row ? rowToJob(jobId, row) : null;
}

/**
 * Atomically claims the right to run a job's next stage for `leaseMs`. Only one
 * caller can hold the lease at a time, so a poll and a background driver never
 * run the same stage twice. A crashed holder's lease simply expires and the next
 * caller re-acquires it, which is what makes the job resume after a restart.
 */
export async function acquireJobLease(jobId: string, sessionHash: string, now: number, leaseMs: number): Promise<boolean> {
  const leaseUntil = now + leaseMs;
  const database = getOperationalDatabase();
  if (!database) {
    const row = memoryState().jobs.get(jobId);
    if (!row || row.sessionHash !== sessionHash || row.expiresAt <= now) return false;
    if (row.status !== "queued" && row.status !== "running") return false;
    if (row.leaseUntil > now) return false;
    row.leaseUntil = leaseUntil;
    return true;
  }
  await ensureDatabase(database);
  const result = await database.prepare(`
    UPDATE analysis_jobs SET lease_until = ?, updated_at = ?
    WHERE job_id = ? AND session_hash = ? AND status IN ('queued', 'running') AND lease_until <= ? AND expires_at > ?
  `).bind(leaseUntil, now, jobId, sessionHash, now, now).run();
  return Number(result.meta.changes ?? 0) > 0;
}

/**
 * Persists a job's new status, stage, and stage checkpoints, and releases the
 * lease so the next stage can start immediately. Renewing `expires_at` keeps an
 * active job alive for its full window from the last progress.
 */
export async function saveJob(job: Job, now: number, ttlSeconds: number) {
  const expiresAt = now + ttlSeconds * 1000;
  const stateJson = JSON.stringify(job.state);
  const database = getOperationalDatabase();
  if (!database) {
    const existing = memoryState().jobs.get(job.id);
    memoryState().jobs.set(job.id, { sessionHash: job.sessionHash, status: job.status, stage: job.stage, stateJson, leaseUntil: 0, createdAt: existing?.createdAt ?? job.createdAt, updatedAt: job.updatedAt, expiresAt });
    return;
  }
  await ensureDatabase(database);
  await database.prepare(`
    UPDATE analysis_jobs SET status = ?, stage = ?, state_json = ?, lease_until = 0, updated_at = ?, expires_at = ?
    WHERE job_id = ? AND session_hash = ?
  `).bind(job.status, job.stage, stateJson, job.updatedAt, expiresAt, job.id, job.sessionHash).run();
}

export async function deleteSessionJobs(sessionHash: string) {
  const database = getOperationalDatabase();
  if (!database) {
    const memory = memoryState();
    for (const [key, value] of memory.jobs) if (value.sessionHash === sessionHash) memory.jobs.delete(key);
    return;
  }
  await ensureDatabase(database);
  await database.prepare("DELETE FROM analysis_jobs WHERE session_hash = ?").bind(sessionHash).run();
}

// Visitor-supplied OpenAI keys for in-flight jobs live only in process memory,
// never in the database and never in a log. They let a background driver keep a
// job moving between polls within one running server; if the process restarts,
// the key is simply re-supplied by the returning client's next poll. Entries are
// swept on access so a forgotten job never pins a key.
const jobKeySymbol = Symbol.for("notzero.jobKeys");
type JobKeyGlobal = typeof globalThis & { [jobKeySymbol]?: Map<string, { apiKey: string; expiresAt: number }> };
const JOB_KEY_TTL_MS = 60 * 60 * 1000;

function jobKeyStore() {
  const target = globalThis as JobKeyGlobal;
  return target[jobKeySymbol] ??= new Map();
}

function sweepJobKeys(now: number) {
  const store = jobKeyStore();
  for (const [key, value] of store) if (value.expiresAt <= now) store.delete(key);
}

export function rememberJobKey(jobId: string, apiKey: string, now: number) {
  sweepJobKeys(now);
  jobKeyStore().set(jobId, { apiKey, expiresAt: now + JOB_KEY_TTL_MS });
}

export function recallJobKey(jobId: string, now: number): string | null {
  sweepJobKeys(now);
  return jobKeyStore().get(jobId)?.apiKey ?? null;
}

export function forgetJobKey(jobId: string) {
  jobKeyStore().delete(jobId);
}

export function resetOperationalMemoryForTests() {
  (globalThis as MemoryGlobal)[memorySymbol] = { sessions: new Map(), counters: new Map(), cache: new Map(), jobs: new Map() };
  (globalThis as JobKeyGlobal)[jobKeySymbol] = new Map();
}
