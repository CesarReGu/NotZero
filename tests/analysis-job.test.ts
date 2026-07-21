import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceJob,
  initialJobState,
  isTerminal,
  jobProgressStep,
  MAX_STAGE_ATTEMPTS,
  retryJob,
  type Job,
  type StageRunners,
} from "../lib/analysis/job";
import { isRetryableModelError, isTerminalKeyError, ModelOutputError, OpenAiRequestError, readResponseOutputText, requestResponses } from "../lib/openai/responses";
import {
  acquireJobLease,
  createJob,
  deleteSessionJobs,
  forgetJobKey,
  getJob,
  recallJobKey,
  rememberJobKey,
  resetOperationalMemoryForTests,
  saveJob,
} from "../lib/operations/store";
import { alexEvidenceLedger } from "../lib/fixtures/alex-ledger";
import { alexBridgeReport } from "../lib/bridge/prepared-report";
import { softwareBackendPracticePack } from "../lib/market/current-practice";
import type { ExtractedSource } from "../lib/evidence/files";

const source: ExtractedSource = {
  metadata: { id: "s1", name: "study-plan.md", sourceType: "curriculum", mimeType: "text/markdown", sizeBytes: 100, contentHash: "a".repeat(64), normalizedHash: "b".repeat(64), characterCount: 99 },
  normalizedText: "Coursework: probability, statistics, data mining, and pattern recognition.",
};

function newJob(): Job {
  return {
    id: "job-1",
    sessionHash: "sess",
    status: "queued",
    stage: "extract",
    state: initialJobState({ live: true, usingServerKey: true, locationContext: { location: "Mexico" }, projectType: "project_artifact", sources: [source], inputWarnings: [], cacheKey: "ck" }),
    createdAt: 0,
    updatedAt: 0,
  };
}

async function drive(job: Job, runners: StageRunners, max = 8): Promise<Job> {
  let now = 1;
  while (!isTerminal(job) && max > 0) {
    job = await advanceJob(job, runners, now);
    now += 1;
    max -= 1;
  }
  return job;
}

// --- Shared Responses reader ------------------------------------------------

test("the reader returns structured output text from a completed response", () => {
  assert.equal(readResponseOutputText({ output: [{ content: [{ type: "output_text", text: "hello" }] }] }), "hello");
});

test("a truncated response is a retryable model error, not an opaque failure", () => {
  try {
    readResponseOutputText({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] });
    assert.fail("expected the reader to throw");
  } catch (error) {
    assert.ok(error instanceof ModelOutputError);
    assert.equal(error.reason, "incomplete");
    assert.equal(error.retryable, true);
    assert.equal(isRetryableModelError(error), true);
  }
});

test("a refusal is a non-retryable model error", () => {
  try {
    readResponseOutputText({ output: [{ content: [{ refusal: "declined" }] }] });
    assert.fail("expected the reader to throw");
  } catch (error) {
    assert.ok(error instanceof ModelOutputError);
    assert.equal(error.reason, "refusal");
    assert.equal(isRetryableModelError(error), false);
  }
});

test("upstream 5xx is retryable and a bare 429 is not", () => {
  assert.equal(isRetryableModelError(new Error("OpenAI analysis failed with status 503.")), true);
  assert.equal(isRetryableModelError(new Error("OpenAI analysis failed with status 429.")), false);
});

// --- Rate-limit vs. quota handling in the shared request helper -------------

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

test("a token rate limit is waited out and retried instead of failing the stage", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => {
    calls += 1;
    if (calls < 3) return jsonResponse({ error: { type: "tokens", code: "rate_limit_exceeded", message: "Rate limit reached" } }, 429);
    return jsonResponse({ output: [{ content: [{ type: "output_text", text: "ok" }] }] });
  };
  const waits: number[] = [];
  const raw = await requestResponses({ fetcher, apiKey: "k", body: "{}", label: "analysis", sleep: async (ms) => { waits.push(ms); } });
  assert.equal(readResponseOutputText(raw), "ok");
  assert.equal(calls, 3);
  assert.equal(waits.length, 2, "it waited before each retry rather than resending immediately");
});

test("an exhausted quota (429 insufficient_quota) is terminal, never retried", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls += 1; return jsonResponse({ error: { type: "insufficient_quota", code: "insufficient_quota", message: "You exceeded your current quota" } }, 429); };
  await assert.rejects(
    () => requestResponses({ fetcher, apiKey: "k", body: "{}", label: "analysis", sleep: async () => {} }),
    (error: unknown) => error instanceof OpenAiRequestError && error.status === 429 && error.retryable === false && isTerminalKeyError(error),
  );
  assert.equal(calls, 1, "a billing wall is not a rate limit and must not be resent");
});

test("a rate limit that never clears is surfaced as retryable, not a terminal key error", async () => {
  const fetcher: typeof fetch = async () => jsonResponse({ error: { code: "rate_limit_exceeded", type: "tokens" } }, 429);
  await assert.rejects(
    () => requestResponses({ fetcher, apiKey: "k", body: "{}", label: "pack", sleep: async () => {}, maxRateLimitRetries: 2 }),
    (error: unknown) => error instanceof OpenAiRequestError && error.retryable === true && isRetryableModelError(error) && !isTerminalKeyError(error),
  );
});

test("a stalled rate limit fails the stage as retryable, distinct from a rejected key", async () => {
  const runners: StageRunners = {
    extract: async () => alexEvidenceLedger,
    resolvePack: async () => { throw new OpenAiRequestError("OpenAI practice-pack generation failed with status 429 (rate_limit_exceeded).", 429, "rate_limit_exceeded", true); },
    compare: async () => alexBridgeReport,
    solve: async () => alexBridgeReport,
  };
  const job = await drive(newJob(), runners);
  assert.equal(job.status, "failed");
  assert.equal(job.stage, "pack");
  assert.equal(job.state.error?.code, "rate_limited");
  assert.equal(job.state.error?.retryable, true);
});

// --- Job state machine ------------------------------------------------------

test("advanceJob runs every stage exactly once and completes with a report", async () => {
  const calls = { extract: 0, pack: 0, compare: 0, solve: 0 };
  const runners: StageRunners = {
    extract: async () => { calls.extract += 1; return alexEvidenceLedger; },
    resolvePack: async () => { calls.pack += 1; return softwareBackendPracticePack; },
    compare: async () => { calls.compare += 1; return alexBridgeReport; },
    solve: async () => { calls.solve += 1; return alexBridgeReport; },
  };

  const job = await drive(newJob(), runners);
  assert.equal(job.status, "completed");
  assert.equal(job.stage, "done");
  assert.equal(job.state.outcome, "report");
  assert.ok(job.state.report);
  assert.deepEqual(calls, { extract: 1, pack: 1, compare: 1, solve: 1 });
  // The extracted text is dropped the moment the ledger is checkpointed.
  assert.equal(job.state.sources.length, 0);
});

test("a job with no supported claims ends as an honest ledger-only result", async () => {
  const runners: StageRunners = {
    extract: async () => ({ ...alexEvidenceLedger, claims: [] }),
    resolvePack: async () => { throw new Error("pack should not run"); },
    compare: async () => { throw new Error("compare should not run"); },
    solve: async () => { throw new Error("solve should not run"); },
  };
  const job = await drive(newJob(), runners);
  assert.equal(job.status, "completed");
  assert.equal(job.state.outcome, "ledger_only");
  assert.equal(job.state.report, undefined);
});

test("a stage failure is recorded and a retry resumes without repeating completed stages", async () => {
  const calls = { extract: 0, pack: 0, compare: 0, solve: 0 };
  let compareShouldFail = true;
  const runners: StageRunners = {
    extract: async () => { calls.extract += 1; return alexEvidenceLedger; },
    resolvePack: async () => { calls.pack += 1; return softwareBackendPracticePack; },
    compare: async () => { calls.compare += 1; if (compareShouldFail) throw new ModelOutputError("truncated", "incomplete", true); return alexBridgeReport; },
    solve: async () => { calls.solve += 1; return alexBridgeReport; },
  };

  let job = await drive(newJob(), runners);
  assert.equal(job.status, "failed");
  assert.equal(job.stage, "compare");
  assert.equal(job.state.error?.stage, "compare");
  assert.equal(calls.extract, 1);
  assert.equal(calls.pack, 1);
  // The stage auto-retried up to the cap before recording the failure.
  assert.equal(calls.compare, MAX_STAGE_ATTEMPTS);

  compareShouldFail = false;
  job = retryJob(job, 100);
  assert.equal(job.status, "running");
  job = await drive(job, runners);

  assert.equal(job.status, "completed");
  assert.ok(job.state.report);
  // Earlier stages were never repeated: no duplicate extraction or pack tokens.
  assert.equal(calls.extract, 1);
  assert.equal(calls.pack, 1);
  assert.equal(calls.compare, MAX_STAGE_ATTEMPTS + 1);
  assert.equal(calls.solve, 1);
});

test("a rejected key fails the stage immediately without auto-retry", async () => {
  let packCalls = 0;
  const runners: StageRunners = {
    extract: async () => alexEvidenceLedger,
    resolvePack: async () => { packCalls += 1; throw new Error("OpenAI practice-pack generation failed with status 401."); },
    compare: async () => alexBridgeReport,
    solve: async () => alexBridgeReport,
  };
  const job = await drive(newJob(), runners);
  assert.equal(job.status, "failed");
  assert.equal(job.stage, "pack");
  assert.equal(job.state.error?.code, "key_or_quota");
  assert.equal(job.state.error?.retryable, false);
  assert.equal(packCalls, 1);
});

test("jobProgressStep advances across the five pipeline labels", () => {
  assert.equal(jobProgressStep({ status: "queued", stage: "extract" }), 0);
  assert.equal(jobProgressStep({ status: "running", stage: "extract" }), 1);
  assert.equal(jobProgressStep({ status: "running", stage: "pack" }), 2);
  assert.equal(jobProgressStep({ status: "running", stage: "compare" }), 3);
  assert.equal(jobProgressStep({ status: "running", stage: "solve" }), 4);
  assert.equal(jobProgressStep({ status: "completed", stage: "done" }), 5);
});

// --- Persistence and leasing ------------------------------------------------

test("a job round-trips through the store and is scoped to its session", async () => {
  resetOperationalMemoryForTests();
  await createJob(newJob(), 1000, 1800);
  const got = await getJob("job-1", "sess", 2000);
  assert.ok(got);
  assert.equal(got?.stage, "extract");
  assert.equal(await getJob("job-1", "other-session", 2000), null);
});

test("the lease serializes stage execution and releases on save", async () => {
  resetOperationalMemoryForTests();
  await createJob(newJob(), 1000, 1800);
  assert.equal(await acquireJobLease("job-1", "sess", 2000, 180000), true);
  // A concurrent driver cannot take a held lease, so a stage never double-runs.
  assert.equal(await acquireJobLease("job-1", "sess", 2000, 180000), false);
  // Persisting progress releases the lease for the next stage.
  await saveJob({ ...newJob(), status: "running", stage: "pack" }, 3000, 1800);
  assert.equal(await acquireJobLease("job-1", "sess", 3000, 180000), true);
});

test("clearing a session deletes its jobs and expired jobs are dropped", async () => {
  resetOperationalMemoryForTests();
  await createJob(newJob(), 1000, 1800);
  await deleteSessionJobs("sess");
  assert.equal(await getJob("job-1", "sess", 2000), null);

  await createJob(newJob(), 1000, 1);
  assert.equal(await getJob("job-1", "sess", 5000), null);
});

test("a visitor key for a job is held only in memory and can be forgotten", () => {
  rememberJobKey("job-1", "sk-test-value", 1000);
  assert.equal(recallJobKey("job-1", 1000), "sk-test-value");
  forgetJobKey("job-1");
  assert.equal(recallJobKey("job-1", 1000), null);
});
