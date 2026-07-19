import {
  createAnalysisCacheSql,
  createAnalysisSessionsSql,
  createCacheSessionIndexSql,
  createOperationalCountersSql,
} from "@/db/schema";
import { getOperationalDatabase } from "@/lib/operations/database";

type SessionUsage = { allowed: boolean; requestCount: number; liveCount: number };
type CachedResult = { responseJson: string; expiresAt: number };

const memorySymbol = Symbol.for("notzero.operationalMemory");
type MemoryState = {
  sessions: Map<string, { requestCount: number; liveCount: number }>;
  counters: Map<string, number>;
  cache: Map<string, { sessionHash: string; responseJson: string; expiresAt: number }>;
};
type MemoryGlobal = typeof globalThis & { [memorySymbol]?: MemoryState };

function memoryState() {
  const target = globalThis as MemoryGlobal;
  return target[memorySymbol] ??= { sessions: new Map(), counters: new Map(), cache: new Map() };
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

export function resetOperationalMemoryForTests() {
  (globalThis as MemoryGlobal)[memorySymbol] = { sessions: new Map(), counters: new Map(), cache: new Map() };
}
