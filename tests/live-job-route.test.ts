import assert from "node:assert/strict";
import test from "node:test";
import { advanceJob, initialJobState, isTerminal, retryJob, MAX_STAGE_ATTEMPTS, type Job, type StageRunners } from "../lib/analysis/job";
import { acquireJobLease, createJob, getJob, resetOperationalMemoryForTests, saveJob } from "../lib/operations/store";
import { extractWithGpt56 } from "../lib/evidence/openai-adapter";
import { compareWithGpt56 } from "../lib/bridge/openai-adapter";
import { enrichWithSolutionLayer } from "../lib/bridge/solution-adapter";
import { generatePracticePackWithGpt56 } from "../lib/market/practice-pack-adapter";
import { finalizeGeneratedReport } from "../lib/market/practice-pack-adapter";
import { selectCurrentPracticePack } from "../lib/market/current-practice";
import { customSoftwareSources, modelResponse, successfulBridgeOutput, successfulEvidenceOutput } from "./fixtures/model-scenarios";

// Integration across the real pieces the live route drives: the injectable
// adapters, the job state machine, and the persistent store with its lease. It
// mirrors the route's advance-one-stage-under-lease loop exactly, but injects
// each stage's model response through the adapters' `fetcher` so it is
// deterministic (the model itself is covered by the adapter tests).

const KEY = "test-key";
const MODEL = "gpt-5.6-luna";

// Routes a Responses API request to a canned reply by its prompt cache key. The
// guided-program stage returns 503 on purpose so it degrades to the validated
// market comparison, and each stage's call is counted to prove no stage re-runs.
function stageFetcher() {
  const calls = { extraction: 0, comparison: 0, solution: 0 };
  const fetcher: typeof fetch = async (_url, init) => {
    const body = String((init as RequestInit).body ?? "");
    if (body.includes("notzero-evidence-extraction")) { calls.extraction += 1; return modelResponse(successfulEvidenceOutput); }
    if (body.includes("notzero-bridge-comparison")) { calls.comparison += 1; return modelResponse(successfulBridgeOutput()); }
    if (body.includes("notzero-solution-layer")) { calls.solution += 1; return new Response("unavailable", { status: 503 }); }
    throw new Error(`unexpected model call: ${body.slice(0, 80)}`);
  };
  return { fetcher, calls };
}

function buildRunners(fetcher: typeof fetch): StageRunners {
  return {
    extract: ({ sources, locationContext, inputWarnings }) => extractWithGpt56({ apiKey: KEY, model: MODEL, locationContext, sources, inputWarnings, fetcher }),
    resolvePack: async (ledger) => {
      const curated = selectCurrentPracticePack(ledger.fieldContext);
      if (curated) return curated;
      return generatePracticePackWithGpt56({ apiKey: KEY, model: MODEL, fieldContext: ledger.fieldContext, fetcher });
    },
    compare: ({ ledger, pack }) => compareWithGpt56({ apiKey: KEY, model: MODEL, ledger, pack, analysisVersion: "phase-7", fetcher }),
    solve: async ({ ledger, baseReport, pack }) => {
      let report = (await enrichWithSolutionLayer({ apiKey: KEY, model: MODEL, ledger, report: baseReport, pack, fetcher })).report;
      if (pack.generated) report = finalizeGeneratedReport(report, pack);
      return report;
    },
  };
}

function newJob(id = "job-int-1"): Job {
  return {
    id,
    sessionHash: "sess",
    status: "queued",
    stage: "extract",
    state: initialJobState({ live: true, usingServerKey: true, locationContext: { location: "Mexico" }, projectType: "source_file", sources: customSoftwareSources, inputWarnings: [], cacheKey: `ck-${id}` }),
    createdAt: 1000,
    updatedAt: 1000,
  };
}

// The exact loop the route's poll/background driver runs: claim the lease, load
// the job, advance one stage, persist. A single test thread always wins the
// lease, so this exercises the full create/lease/get/advance/save round-trip.
async function driveViaStore(runners: StageRunners, id = "job-int-1", ttl = 1800): Promise<Job> {
  await createJob(newJob(id), 1000, ttl);
  let now = 2000;
  for (let step = 0; step < 12; step += 1) {
    assert.equal(await acquireJobLease(id, "sess", now, 180000), true, "the single driver claims the lease");
    const job = await getJob(id, "sess", now);
    assert.ok(job);
    if (isTerminal(job!)) return job!;
    const next = await advanceJob(job!, runners, now);
    await saveJob(next, now, ttl);
    now += 1000;
    if (isTerminal(next)) return next;
  }
  throw new Error("job did not terminate");
}

test("a custom job runs extraction, comparison, and the guided program to a completed report", async () => {
  resetOperationalMemoryForTests();
  const { fetcher, calls } = stageFetcher();
  const job = await driveViaStore(buildRunners(fetcher));

  assert.equal(job.status, "completed");
  assert.equal(job.state.outcome, "report");
  assert.ok(job.state.report);
  assert.equal(job.state.report!.findings.length >= 1, true);
  // The guided-program stage failed, so the report degraded to the validated
  // market comparison rather than failing the whole job.
  assert.equal(job.state.report!.roadmap, undefined);
  assert.ok(job.state.report!.limitations.some((limit) => /guided program/i.test(limit)));
  // Each successful stage ran once. The extracted text was dropped after extraction.
  assert.equal(calls.extraction, 1);
  assert.equal(calls.comparison, 1);
  assert.equal(job.state.sources.length, 0);
  // The persisted job is what a returning client would poll and see.
  const stored = await getJob("job-int-1", "sess", 3000);
  assert.equal(stored?.status, "completed");
  assert.ok(stored?.state.report);
});

test("a stage failure is recorded and a retry resumes without re-running extraction or comparison", async () => {
  resetOperationalMemoryForTests();
  const calls = { extraction: 0, comparison: 0 };
  let comparisonFails = true;
  const fetcher: typeof fetch = async (_url, init) => {
    const body = String((init as RequestInit).body ?? "");
    if (body.includes("notzero-evidence-extraction")) { calls.extraction += 1; return modelResponse(successfulEvidenceOutput); }
    if (body.includes("notzero-bridge-comparison")) { calls.comparison += 1; return comparisonFails ? new Response("unavailable", { status: 503 }) : modelResponse(successfulBridgeOutput()); }
    if (body.includes("notzero-solution-layer")) return new Response("unavailable", { status: 503 });
    throw new Error("unexpected model call");
  };
  const runners = buildRunners(fetcher);

  let job = await driveViaStore(runners);
  assert.equal(job.status, "failed");
  assert.equal(job.stage, "compare");
  assert.equal(job.state.error?.stage, "compare");
  assert.equal(calls.extraction, 1);
  // The comparison auto-retried up to the cap before the failure was recorded.
  assert.equal(calls.comparison, MAX_STAGE_ATTEMPTS);

  // Fix the upstream and retry: it resumes at the failed stage.
  comparisonFails = false;
  job = retryJob(job, 9000);
  await saveJob(job, 9000, 1800);
  let now = 10000;
  for (let step = 0; step < 6 && !isTerminal(job); step += 1) {
    await acquireJobLease(job.id, "sess", now, 180000);
    const loaded = await getJob(job.id, "sess", now);
    job = await advanceJob(loaded!, runners, now);
    await saveJob(job, now, 1800);
    now += 1000;
  }

  assert.equal(job.status, "completed");
  assert.ok(job.state.report);
  // Extraction never re-ran; only the comparison was attempted once more.
  assert.equal(calls.extraction, 1);
  assert.equal(calls.comparison, MAX_STAGE_ATTEMPTS + 1);
});
