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
import { isRetryableModelError, ModelOutputError, readResponseOutputText } from "../lib/openai/responses";
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

test("upstream 5xx is retryable and 429 is not", () => {
  assert.equal(isRetryableModelError(new Error("OpenAI analysis failed with status 503.")), true);
  assert.equal(isRetryableModelError(new Error("OpenAI analysis failed with status 429.")), false);
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
