import { NextResponse } from "next/server";
import { currentPracticePackSchema, evidenceLedgerSchema, knowledgeBridgeReportSchema, locationContextSchema, type CurrentPracticePack, type EvidenceSourceType } from "@/lib/domain/schemas";
import { readServerConfig, type ServerConfig } from "@/lib/config/server";
import { EvidenceInputError, extractEvidenceFile, type ExtractedSource } from "@/lib/evidence/files";
import { EVIDENCE_LIMITS } from "@/lib/evidence/limits";
import { extractWithGpt56 } from "@/lib/evidence/openai-adapter";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";
import { BRIDGE_PROMPT_VERSION, BRIDGE_REPORT_SCHEMA_VERSION, compareWithGpt56 } from "@/lib/bridge/openai-adapter";
import { enrichWithSolutionLayer, SOLUTION_PROMPT_VERSION } from "@/lib/bridge/solution-adapter";
import { selectCurrentPracticePack } from "@/lib/market/current-practice";
import { finalizeGeneratedReport, generateGroundedPracticePack, GROUNDED_PACK_PROMPT_VERSION } from "@/lib/market/practice-pack-adapter";
import { JOB_POSTINGS_SCAN_PROMPT_VERSION } from "@/lib/market/job-postings-adapter";
import { advanceJob, initialJobState, isTerminal, jobProgressStep, retryJob, type Job, type StageRunners } from "@/lib/analysis/job";
import { analysisCacheKey, operationalSession } from "@/lib/operations/session";
import { acquireJobLease, createJob, deleteSessionCache, deleteSessionJobs, forgetJobKey, getCachedResult, getJob, putCachedResult, recallJobKey, recordSessionRequest, rememberJobKey, reserveLiveAnalysis, saveJob } from "@/lib/operations/store";
import { scheduleBackground } from "@/lib/operations/runtime";

export const runtime = "nodejs";

// A job runs one model stage at a time. The lease is held for the duration of a
// single stage so a slow reasoning call is never interrupted by another poll,
// and it lapses well before a stuck job would otherwise be stranded.
const JOB_LEASE_MS = 180_000;
// A background driver only ever needs to walk the handful of remaining stages;
// this bounds it against a logic error without ever cutting a real pipeline short.
const BACKGROUND_MAX_STEPS = 8;
const JOB_ID_PATTERN = /^[a-f0-9-]{16,80}$/i;

function json(body: unknown, status = 200, setCookie?: string | null, cacheStatus?: "hit" | "miss") {
  const headers = new Headers({ "Cache-Control": "no-store" });
  if (setCookie) headers.set("Set-Cookie", setCookie);
  if (cacheStatus) headers.set("X-NotZero-Cache", cacheStatus);
  return NextResponse.json(body, { status, headers });
}

function text(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function files(form: FormData, key: string) {
  return form.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
}

async function extractGroup(inputFiles: File[], sourceType: EvidenceSourceType, startIndex: number) {
  const sources: ExtractedSource[] = [];
  const warnings: string[] = [];
  for (let index = 0; index < inputFiles.length; index += 1) {
    const extracted = await extractEvidenceFile(inputFiles[index], sourceType, startIndex + index);
    sources.push(extracted.source);
    warnings.push(...extracted.warnings);
  }
  return { sources, warnings };
}

/**
 * Resolves which OpenAI key this request may use. A visitor-supplied key
 * (X-OpenAI-Key header) is used only for this request, is never stored or
 * logged, and takes precedence so the deployment's own budget is not spent when
 * the visitor brings their own. The server key requires the deployment to have
 * live analysis enabled.
 */
function resolveApiKey(request: Request, config: ServerConfig) {
  const header = request.headers.get("x-openai-key")?.trim() ?? "";
  if (header) {
    if (!config.allowUserKeys) throw new EvidenceInputError("user_keys_disabled", "This deployment does not accept visitor-supplied API keys.", 403);
    if (!/^sk-[A-Za-z0-9_-]{16,240}$/.test(header)) throw new EvidenceInputError("invalid_api_key", "The OpenAI API key looks malformed. Keys start with sk- and contain no spaces.", 401);
    return { apiKey: header, usingServerKey: false, live: true };
  }
  const serverKey = config.liveAnalysisEnabled ? process.env.OPENAI_API_KEY : undefined;
  return { apiKey: serverKey ?? null, usingServerKey: Boolean(serverKey), live: Boolean(serverKey) };
}

/**
 * Binds the four model stages to a resolved key and config. The pack stage
 * throws (rather than degrading to a partial result) so a generation failure is
 * recorded on the job and can be retried, instead of silently leaving the field
 * without a comparison.
 */
function buildRunners(apiKey: string, config: ServerConfig): StageRunners {
  return {
    extract: ({ sources, locationContext, inputWarnings }) =>
      extractWithGpt56({ apiKey, model: config.model, reasoningEffort: config.reasoningEffort, locationContext, sources, inputWarnings }),
    resolvePack: async (ledger) => {
      const curated = selectCurrentPracticePack(ledger.fieldContext);
      if (curated) return curated;
      return generateGroundedPracticePack({ apiKey, model: config.model, reasoningEffort: config.reasoningEffort, fieldContext: ledger.fieldContext, enableJobSearch: config.jobSearchEnabled });
    },
    compare: ({ ledger, pack }) =>
      compareWithGpt56({ apiKey, model: config.model, reasoningEffort: config.reasoningEffort, ledger, pack, analysisVersion: config.analysisVersion }),
    solve: async ({ ledger, baseReport, pack }) => {
      let report = (await enrichWithSolutionLayer({ apiKey, model: config.model, reasoningEffort: config.reasoningEffort, ledger, report: baseReport, pack })).report;
      if (pack.generated) report = finalizeGeneratedReport(report, pack);
      return report;
    },
  };
}

/**
 * Claims the lease, runs exactly one stage, persists the new checkpoint, and (on
 * completion) repopulates the shared result cache so an identical re-upload is
 * free. Returns null when another driver already holds the lease.
 */
async function advanceLeasedJob(jobId: string, sessionHash: string, apiKey: string, config: ServerConfig): Promise<Job | null> {
  const acquired = await acquireJobLease(jobId, sessionHash, Date.now(), JOB_LEASE_MS);
  if (!acquired) return null;
  const job = await getJob(jobId, sessionHash, Date.now());
  if (!job || isTerminal(job)) return job;
  const next = await advanceJob(job, buildRunners(apiKey, config), Date.now());
  await saveJob(next, Date.now(), config.cacheTtlSeconds);
  if (next.status === "completed" && next.state.report && next.state.cacheKey) {
    const storedPack = next.state.pack?.generated ? next.state.pack : undefined;
    await putCachedResult(next.state.cacheKey, sessionHash, JSON.stringify({ ledger: next.state.ledger, report: next.state.report, pack: storedPack }), Date.now(), config.cacheTtlSeconds);
  }
  // A completed job has no more model work, so drop any in-memory visitor key
  // now rather than holding it until the hourly sweep. A failed job keeps its
  // key so a retry does not have to re-supply it.
  if (next.status === "completed") forgetJobKey(jobId);
  return next;
}

/**
 * Best-effort driver that keeps a job moving between polls (and completes it with
 * no client attached when the deployment holds the key). Every step goes through
 * the lease, so it never races the foreground poll.
 */
async function driveJobInBackground(jobId: string, sessionHash: string, apiKey: string, config: ServerConfig) {
  for (let step = 0; step < BACKGROUND_MAX_STEPS; step += 1) {
    const job = await getJob(jobId, sessionHash, Date.now());
    if (!job || isTerminal(job)) return;
    const next = await advanceLeasedJob(jobId, sessionHash, apiKey, config);
    if (!next || isTerminal(next)) return;
  }
}

/** Shapes a job into the client contract. Progress and stage drive the pipeline UI. */
function jobResponse(job: Job, setCookie: string | null, cacheStatus?: "hit" | "miss") {
  const base = { jobId: job.id, stage: job.stage, progress: jobProgressStep(job) };
  if (job.status === "failed") {
    return json({ ...base, status: "failed", error: job.state.error, ledger: job.state.ledger }, 200, setCookie, cacheStatus);
  }
  if (job.status === "completed") {
    if (job.state.outcome === "ledger_only") return json({ ...base, status: "ledger_only", ledger: job.state.ledger }, 200, setCookie, cacheStatus);
    const pack = job.state.pack?.generated ? job.state.pack : undefined;
    return json({ ...base, status: "completed", ledger: job.state.ledger, report: job.state.report, pack }, 200, setCookie, cacheStatus);
  }
  return json({ ...base, status: "running", ledger: job.state.ledger }, 200, setCookie, cacheStatus);
}

function seededCompletedJob(sessionHash: string, ledger: ReturnType<typeof evidenceLedgerSchema.parse>, report: ReturnType<typeof knowledgeBridgeReportSchema.parse>, pack: CurrentPracticePack | undefined, cacheKey: string, now: number): Job {
  const state = initialJobState({
    live: true,
    usingServerKey: false,
    locationContext: { location: ledger.fieldContext.location, jurisdiction: ledger.fieldContext.jurisdiction },
    projectType: "project_artifact",
    sources: [],
    inputWarnings: [],
    cacheKey,
  });
  state.ledger = ledger;
  state.pack = pack;
  state.report = report;
  state.outcome = "report";
  return { id: crypto.randomUUID(), sessionHash, status: "completed", stage: "done", state, createdAt: now, updatedAt: now };
}

export async function DELETE(request: Request) {
  const session = await operationalSession(request);
  await Promise.all([deleteSessionCache(session.hash), deleteSessionJobs(session.hash)]);
  return json({ status: "cleared" }, 200, session.setCookie);
}

/**
 * Polls a live job. Each poll advances one stage (under a lease) when it can and
 * always returns the job's current progress, so the analysis continues whether
 * or not a client stays connected. A visitor key is re-supplied on each poll and
 * kept only in memory for the job's duration.
 */
export async function GET(request: Request) {
  let setCookie: string | null = null;
  try {
    const url = new URL(request.url);
    const jobId = url.searchParams.get("jobId")?.trim() ?? "";
    if (!JOB_ID_PATTERN.test(jobId)) throw new EvidenceInputError("invalid_job", "This analysis reference is invalid.", 400);

    const config = readServerConfig();
    const session = await operationalSession(request);
    setCookie = session.setCookie;
    const now = Date.now();

    let job = await getJob(jobId, session.hash, now);
    if (!job) return json({ status: "not_found", error: "job_not_found", message: "This analysis has expired or was cleared. Upload your evidence again to start over." }, 404, setCookie);

    if (url.searchParams.get("retry") === "1" && job.status === "failed") {
      job = retryJob(job, now);
      await saveJob(job, now, config.cacheTtlSeconds);
    }

    if (isTerminal(job)) return jobResponse(job, setCookie);

    // The job is still running. Resolve the key: a visitor key on this request,
    // the deployment key, or the key remembered in memory for this job.
    const keyContext = resolveApiKey(request, config);
    let apiKey = keyContext.apiKey;
    if (apiKey && !keyContext.usingServerKey) rememberJobKey(jobId, apiKey, now);
    if (!apiKey) apiKey = recallJobKey(jobId, now);
    if (!apiKey) {
      return json({ status: "running", jobId, stage: job.stage, progress: jobProgressStep(job), needsKey: true, ledger: job.state.ledger }, 200, setCookie);
    }

    const advanced = await advanceLeasedJob(jobId, session.hash, apiKey, config);
    const current = advanced ?? job;
    if (!isTerminal(current)) {
      const key = apiKey;
      scheduleBackground(() => driveJobInBackground(jobId, session.hash, key, config));
    }
    return jobResponse(current, setCookie);
  } catch (error) {
    if (error instanceof EvidenceInputError) return json({ error: error.code, message: error.message }, error.status, setCookie);
    return json({ error: "analysis_failed", message: "The analysis status could not be read safely." }, 502, setCookie);
  }
}

export async function POST(request: Request) {
  let setCookie: string | null = null;
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > EVIDENCE_LIMITS.totalBytes + 1_000_000) throw new EvidenceInputError("request_size", "The complete request must be smaller than 9 MB.", 413);
    const form = await request.formData();
    if (text(form, "mode") === "prepared") {
      return json({ status: "completed", ledger: alexEvidenceLedger, report: alexBridgeReport });
    }

    const config = readServerConfig();
    const keyContext = resolveApiKey(request, config);
    const session = await operationalSession(request);
    setCookie = session.setCookie;
    const now = Date.now();
    const usage = await recordSessionRequest(session.hash, now, config.sessionRequestLimit);
    if (!usage.allowed) throw new EvidenceInputError("request_limit", "This anonymous session has reached its daily analysis-request limit. Try again after the daily window resets.", 429);

    // The visitor supplies only where they are. The field and target role are
    // inferred from the evidence during extraction, so the answer is never typed
    // into the input.
    const locationContext = locationContextSchema.parse({
      location: text(form, "location"),
      jurisdiction: text(form, "jurisdiction") || undefined,
    });
    const curriculum = files(form, "curriculum");
    const supporting = files(form, "supporting");
    const project = files(form, "project");
    if (curriculum.length !== EVIDENCE_LIMITS.curriculumFiles) throw new EvidenceInputError("curriculum_count", "Choose exactly one curriculum or study-plan document.");
    if (supporting.length > EVIDENCE_LIMITS.supportingFiles) throw new EvidenceInputError("supporting_count", "Choose no more than three supporting documents.");
    if (project.length < 1 || project.length > EVIDENCE_LIMITS.projectFiles) throw new EvidenceInputError("project_count", "Choose between one and five files from one bounded project or professional task.");
    const allFiles = [...curriculum, ...supporting, ...project];
    if (allFiles.reduce((total, file) => total + file.size, 0) > EVIDENCE_LIMITS.totalBytes) throw new EvidenceInputError("total_size", "The complete evidence set must be 8 MB or smaller.");

    const curriculumResult = await extractGroup(curriculum, "curriculum", 0);
    const supportingResult = await extractGroup(supporting, "supporting_document", curriculum.length);
    const projectType: EvidenceSourceType = text(form, "projectType") === "professional_task" ? "professional_task" : "project_artifact";
    const projectResult = await extractGroup(project, projectType, curriculum.length + supporting.length);
    const extractedSources = [...curriculumResult.sources, ...supportingResult.sources, ...projectResult.sources];
    const warnings = [...curriculumResult.warnings, ...supportingResult.warnings, ...projectResult.warnings];
    const totalCharacters = extractedSources.reduce((total, source) => total + source.normalizedText.length, 0);
    if (totalCharacters > EVIDENCE_LIMITS.totalCharacters) throw new EvidenceInputError("total_text", "The extracted evidence exceeds the 240,000 character analysis limit.");
    const hashes = new Set<string>();
    for (const source of extractedSources) {
      if (hashes.has(source.metadata.normalizedHash)) throw new EvidenceInputError("duplicate_input", `${source.metadata.name} duplicates another submitted file after normalization.`, 409);
      hashes.add(source.metadata.normalizedHash);
    }

    const cacheKey = await analysisCacheKey({
      sessionHash: session.hash,
      analysisVersion: config.analysisVersion,
      promptVersions: ["evidence-extraction.v1", JOB_POSTINGS_SCAN_PROMPT_VERSION, GROUNDED_PACK_PROMPT_VERSION, BRIDGE_PROMPT_VERSION, SOLUTION_PROMPT_VERSION, "evidence-review.v1"],
      reportSchemaVersion: BRIDGE_REPORT_SCHEMA_VERSION,
      model: config.model,
      reasoningEffort: config.reasoningEffort,
      // Whether this request can run the live stages, regardless of whose key
      // enables them. Keyless preflight results must never satisfy a later
      // request that brings a key.
      liveAnalysisEnabled: keyContext.live,
      locationContext,
      projectType,
      sources: extractedSources.map((source) => ({
        hash: source.metadata.normalizedHash,
        sourceType: source.metadata.sourceType,
        date: source.metadata.date,
      })),
    });
    const cached = await getCachedResult(cacheKey, now);
    if (cached) {
      const stored = JSON.parse(cached.responseJson) as { ledger?: unknown; report?: unknown; pack?: unknown };
      const ledger = evidenceLedgerSchema.parse(stored.ledger ?? stored);
      const report = stored.report ? knowledgeBridgeReportSchema.parse(stored.report) : undefined;
      const pack = stored.pack ? currentPracticePackSchema.parse(stored.pack) : undefined;
      // A prior identical run that already produced a full report: hand back a
      // completed job so a refresh or return restores it, with no new model calls.
      if (report && keyContext.apiKey) {
        const job = seededCompletedJob(session.hash, ledger, report, pack, cacheKey, now);
        await createJob(job, now, config.cacheTtlSeconds);
        return jobResponse(job, setCookie, "hit");
      }
      return json({ status: "cached", ledger, report, pack }, 200, setCookie, "hit");
    }

    if (!keyContext.apiKey) {
      const keyGuidance = config.allowUserKeys
        ? "Add your OpenAI API key to run the live GPT-5.6 analysis and generate evidence claims from these files."
        : "Live GPT-5.6 evidence claims are disabled in this deployment, so no capability conclusion has been generated.";
      const ledger = evidenceLedgerSchema.parse({
        id: `preflight-${crypto.randomUUID()}`,
        schemaVersion: "evidence-ledger.v1",
        promptVersion: "evidence-extraction.v1",
        analysisMode: "preflight_only",
        fieldContext: { field: "Pending analysis", targetTitle: "Pending analysis", location: locationContext.location, jurisdiction: locationContext.jurisdiction },
        sources: extractedSources.map((source) => source.metadata),
        claims: [],
        warnings,
        limitations: [`The files passed server-side validation and text extraction. ${keyGuidance}`],
      });
      await putCachedResult(cacheKey, session.hash, JSON.stringify({ ledger }), now, config.cacheTtlSeconds);
      return json({ status: "validated", ledger }, 200, setCookie, "miss");
    }

    // A key is available. Start a persistent, resumable job and return its id
    // immediately: the analysis runs stage by stage server-side, driven by polls
    // and a best-effort background driver, and survives navigation and refresh.
    if (keyContext.usingServerKey) {
      const reservation = await reserveLiveAnalysis(
        session.hash,
        now,
        config.sessionLiveLimit,
        config.globalLiveLimit,
        `live-analysis:${config.analysisVersion}`,
      );
      if (!reservation.allowed) {
        const message = reservation.reason === "session_limit"
          ? "This anonymous session has reached its daily live-analysis limit."
          : "Live analysis is temporarily paused by the deployment-wide spending circuit breaker.";
        throw new EvidenceInputError(reservation.reason, message, 429);
      }
    }

    const job: Job = {
      id: crypto.randomUUID(),
      sessionHash: session.hash,
      status: "queued",
      stage: "extract",
      state: initialJobState({
        live: true,
        usingServerKey: keyContext.usingServerKey,
        locationContext,
        projectType,
        sources: extractedSources,
        inputWarnings: warnings,
        cacheKey,
      }),
      createdAt: now,
      updatedAt: now,
    };
    await createJob(job, now, config.cacheTtlSeconds);
    if (keyContext.apiKey && !keyContext.usingServerKey) rememberJobKey(job.id, keyContext.apiKey, now);
    const apiKey = keyContext.apiKey;
    scheduleBackground(() => driveJobInBackground(job.id, session.hash, apiKey, config));
    return json({ status: "running", jobId: job.id, stage: "extract", progress: 0 }, 200, setCookie, "miss");
  } catch (error) {
    if (error instanceof EvidenceInputError) return json({ error: error.code, message: error.message }, error.status, setCookie);
    if (error instanceof Error && error.name === "ZodError") return json({ error: "invalid_context", message: "A valid location is required and the evidence must fit the documented limits." }, 400, setCookie);
    return json({ error: "analysis_failed", message: "The evidence could not be analyzed safely. No result was retained." }, 502, setCookie);
  }
}
