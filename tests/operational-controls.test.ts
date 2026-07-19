import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteSessionCache,
  getCachedResult,
  getSessionCachedResult,
  putCachedResult,
  recordSessionRequest,
  reserveLiveAnalysis,
  resetOperationalMemoryForTests,
} from "../lib/operations/store";

test("anonymous sessions have a hard request ceiling", async () => {
  resetOperationalMemoryForTests();
  const now = Date.UTC(2026, 6, 18, 12);
  assert.equal((await recordSessionRequest("session-a", now, 2)).allowed, true);
  assert.equal((await recordSessionRequest("session-a", now, 2)).allowed, true);
  assert.equal((await recordSessionRequest("session-a", now, 2)).allowed, false);
  assert.equal((await recordSessionRequest("session-b", now, 2)).allowed, true);
});

test("session and deployment-wide live-analysis circuit breakers are independent", async () => {
  resetOperationalMemoryForTests();
  const now = Date.UTC(2026, 6, 18, 12);
  await recordSessionRequest("session-a", now, 10);
  await recordSessionRequest("session-b", now, 10);
  assert.deepEqual(await reserveLiveAnalysis("session-a", now, 1, 2, "phase-5"), { allowed: true });
  assert.deepEqual(await reserveLiveAnalysis("session-a", now, 1, 2, "phase-5"), { allowed: false, reason: "session_limit" });
  assert.deepEqual(await reserveLiveAnalysis("session-b", now, 2, 2, "phase-5"), { allowed: true });
  assert.deepEqual(await reserveLiveAnalysis("session-b", now, 2, 2, "phase-5"), { allowed: false, reason: "global_limit" });
});

test("cached results expire and can be deleted by anonymous session", async () => {
  resetOperationalMemoryForTests();
  const now = Date.UTC(2026, 6, 18, 12);
  await putCachedResult("cache-a", "session-a", "{\"safe\":true}", now, 60);
  assert.equal((await getCachedResult("cache-a", now + 1_000))?.responseJson, "{\"safe\":true}");
  await deleteSessionCache("session-a");
  assert.equal(await getCachedResult("cache-a", now + 2_000), null);
  await putCachedResult("cache-b", "session-b", "{}", now, 60);
  assert.equal(await getCachedResult("cache-b", now + 61_000), null);
});

test("review cache reads remain bound to the anonymous session", async () => {
  resetOperationalMemoryForTests();
  const now = Date.now();
  await putCachedResult("review-a", "session-a", "{\"ledger\":true}", now, 60);
  assert.equal((await getSessionCachedResult("review-a", "session-a", now + 1_000))?.responseJson, "{\"ledger\":true}");
  assert.equal(await getSessionCachedResult("review-a", "session-b", now + 1_000), null);
});
