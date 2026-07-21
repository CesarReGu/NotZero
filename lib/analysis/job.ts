import type {
  CurrentPracticePack,
  EvidenceLedger,
  EvidenceSourceType,
  KnowledgeBridgeReport,
  LocationContext,
} from "@/lib/domain/schemas";
import type { ExtractedSource } from "@/lib/evidence/files";
import { isRetryableModelError } from "@/lib/openai/responses";

/**
 * The live analysis is a persistent, resumable server-side job rather than a
 * single request. This module is the pure state machine that drives it: each
 * call to {@link advanceJob} runs exactly one stage, checkpoints its output, and
 * returns the next job. Because a completed stage is never re-run, a retry after
 * a failure resumes from the failed stage and never re-spends tokens on work
 * that already succeeded.
 *
 * All model work is injected as {@link StageRunners}, so the ordering, retry, and
 * checkpoint logic can be exercised deterministically without a network or key.
 */

export type JobStage = "extract" | "pack" | "compare" | "solve" | "done";
export type JobStatus = "queued" | "running" | "completed" | "failed";
export type JobOutcome = "report" | "ledger_only";

// The order stages run in. `done` is terminal.
export const JOB_STAGE_SEQUENCE: readonly JobStage[] = ["extract", "pack", "compare", "solve", "done"] as const;

// Each stage gets a small number of automatic attempts for transient failures
// (a truncated response, a 5xx). A key or spending problem never retries; a
// persistent malformed result stops after the first attempt and is recorded so
// the visitor can retry it themselves without repeating earlier stages.
export const MAX_STAGE_ATTEMPTS = 2;

export type JobErrorCode =
  | "key_or_quota"
  | "model_output"
  | "unsupported_field"
  | "analysis_failed";

export type JobError = { code: JobErrorCode; message: string; stage: JobStage; retryable: boolean };

export type JobState = {
  version: 1;
  // Whether a key was available when the job started. Purely for the reader; the
  // key itself is never part of job state and is never persisted.
  live: boolean;
  usingServerKey: boolean;
  locationContext: LocationContext;
  projectType: EvidenceSourceType;
  // The content-hash cache key for these exact inputs. When the job completes it
  // repopulates the shared result cache under this key, so re-uploading the same
  // evidence returns instantly with no new model calls or tokens.
  cacheKey?: string;
  // The extracted, normalized evidence text needed to run (or re-run) extraction.
  // It is cleared the instant the ledger is checkpointed, so the raw text is held
  // only for the extraction window rather than for the life of the job.
  sources: ExtractedSource[];
  inputWarnings: string[];
  ledger?: EvidenceLedger;
  pack?: CurrentPracticePack;
  baseReport?: KnowledgeBridgeReport;
  report?: KnowledgeBridgeReport;
  outcome?: JobOutcome;
  error?: JobError | null;
  attempts: Partial<Record<JobStage, number>>;
};

export type Job = {
  id: string;
  sessionHash: string;
  status: JobStatus;
  stage: JobStage;
  state: JobState;
  createdAt: number;
  updatedAt: number;
};

export type StageRunners = {
  extract(input: { sources: ExtractedSource[]; locationContext: LocationContext; inputWarnings: string[] }): Promise<EvidenceLedger>;
  // Returns the current-practice pack for the ledger's inferred field: a curated
  // pack when one matches, otherwise a generated one. It throws (never returns
  // null) when a pack cannot be produced, so the failure is recorded and retriable.
  resolvePack(ledger: EvidenceLedger): Promise<CurrentPracticePack>;
  compare(input: { ledger: EvidenceLedger; pack: CurrentPracticePack }): Promise<KnowledgeBridgeReport>;
  solve(input: { ledger: EvidenceLedger; baseReport: KnowledgeBridgeReport; pack: CurrentPracticePack }): Promise<KnowledgeBridgeReport>;
};

export function isTerminal(job: Job): boolean {
  return job.status === "completed" || job.status === "failed";
}

export function initialJobState(input: {
  live: boolean;
  usingServerKey: boolean;
  locationContext: LocationContext;
  projectType: EvidenceSourceType;
  sources: ExtractedSource[];
  inputWarnings: string[];
  cacheKey?: string;
}): JobState {
  return {
    version: 1,
    live: input.live,
    usingServerKey: input.usingServerKey,
    locationContext: input.locationContext,
    projectType: input.projectType,
    cacheKey: input.cacheKey,
    sources: input.sources,
    inputWarnings: input.inputWarnings,
    attempts: {},
    error: null,
  };
}

/** A key or spending problem is the visitor's to fix and must never be retried. */
function isTerminalKeyError(error: unknown): boolean {
  return error instanceof Error && /status 40[13]\b|status 429\b/.test(error.message);
}

function stageError(stage: JobStage, error: unknown): JobError {
  if (isTerminalKeyError(error)) {
    return { code: "key_or_quota", message: "OpenAI rejected the key or reported a rate or spending limit. Check the key's access and usage limits, then retry.", stage, retryable: false };
  }
  const message = error instanceof Error && error.message ? error.message : "The analysis could not be completed safely.";
  return { code: "model_output", message, stage, retryable: true };
}

/**
 * Runs the next stage of a job exactly once and returns the updated job. On a
 * successful stage it checkpoints the output and advances; on a transient
 * failure under the attempt cap it leaves the job `running` for the next call to
 * retry; otherwise it records a typed failure. The returned object is always a
 * new job value, so callers can persist it directly.
 */
export async function advanceJob(job: Job, runners: StageRunners, now: number): Promise<Job> {
  if (isTerminal(job)) return job;

  const stage = job.stage;
  const state: JobState = { ...job.state, attempts: { ...job.state.attempts } };

  try {
    if (stage === "extract") {
      const ledger = await runners.extract({ sources: state.sources, locationContext: state.locationContext, inputWarnings: state.inputWarnings });
      state.ledger = ledger;
      // The extracted text is no longer needed once the ledger exists; downstream
      // stages work from the ledger alone. Drop it so it is not retained further.
      state.sources = [];
      state.error = null;
      if (ledger.claims.length === 0) {
        // Valid, honest end state: the files were read but supported no claim, so
        // there is nothing to compare against current practice.
        state.outcome = "ledger_only";
        return { ...job, stage: "done", status: "completed", state, updatedAt: now };
      }
      return { ...job, stage: "pack", status: "running", state, updatedAt: now };
    }

    if (stage === "pack") {
      const pack = await runners.resolvePack(state.ledger!);
      state.pack = pack;
      state.error = null;
      return { ...job, stage: "compare", status: "running", state, updatedAt: now };
    }

    if (stage === "compare") {
      const baseReport = await runners.compare({ ledger: state.ledger!, pack: state.pack! });
      state.baseReport = baseReport;
      state.error = null;
      return { ...job, stage: "solve", status: "running", state, updatedAt: now };
    }

    if (stage === "solve") {
      // The solution layer degrades to the validated market comparison on its
      // own rather than throwing, so reaching this stage produces a report.
      const report = await runners.solve({ ledger: state.ledger!, baseReport: state.baseReport!, pack: state.pack! });
      state.report = report;
      state.outcome = "report";
      state.error = null;
      return { ...job, stage: "done", status: "completed", state, updatedAt: now };
    }

    return { ...job, status: "completed", state, updatedAt: now };
  } catch (error) {
    const attempts = (state.attempts[stage] ?? 0) + 1;
    state.attempts = { ...state.attempts, [stage]: attempts };
    const recorded = stageError(stage, error);
    const canAutoRetry = recorded.retryable && isRetryableModelError(error) && attempts < MAX_STAGE_ATTEMPTS;
    if (canAutoRetry) {
      // Leave the job on the same stage; the next advance retries it. No earlier
      // stage is repeated because their outputs are already checkpointed.
      return { ...job, status: "running", state, updatedAt: now };
    }
    state.error = recorded;
    return { ...job, status: "failed", state, updatedAt: now };
  }
}

/**
 * Clears a recorded failure so the job can be retried from the stage it failed
 * on. Earlier checkpoints are untouched, so a retry never repeats completed work
 * or re-spends tokens on it.
 */
export function retryJob(job: Job, now: number): Job {
  if (job.status !== "failed") return job;
  const attempts = { ...job.state.attempts };
  delete attempts[job.stage];
  return { ...job, status: "running", state: { ...job.state, attempts, error: null }, updatedAt: now };
}

// The five reader-facing pipeline labels, and where each job stage sits among
// them, so the interface can show continuous stage-by-stage progress.
export const JOB_PROGRESS_LABELS: readonly string[] = [
  "Reading evidence",
  "Building the evidence ledger",
  "Comparing current requirements",
  "Constructing bridges",
  "Checking sources",
] as const;

const STAGE_COMPLETED_STEPS: Record<JobStage, number> = { extract: 1, pack: 2, compare: 3, solve: 4, done: 5 };

/** How many of the five pipeline labels are complete for a job's current stage. */
export function jobProgressStep(job: { status: JobStatus; stage: JobStage }): number {
  if (job.status === "completed") return JOB_PROGRESS_LABELS.length;
  if (job.status === "queued") return 0;
  return STAGE_COMPLETED_STEPS[job.stage] ?? 0;
}
