import { NextResponse } from "next/server";
import { evidenceLedgerSchema, fieldContextSchema, type EvidenceSourceType } from "@/lib/domain/schemas";
import { readServerConfig } from "@/lib/config/server";
import { EvidenceInputError, extractEvidenceFile, type ExtractedSource } from "@/lib/evidence/files";
import { EVIDENCE_LIMITS } from "@/lib/evidence/limits";
import { extractWithGpt56 } from "@/lib/evidence/openai-adapter";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";
import { analysisCacheKey, operationalSession } from "@/lib/operations/session";
import { deleteSessionCache, getCachedResult, putCachedResult, recordSessionRequest, reserveLiveAnalysis } from "@/lib/operations/store";

export const runtime = "nodejs";

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

function dateList(form: FormData, key: string, count: number) {
  const raw = text(form, key);
  let values: unknown = [];
  try { values = JSON.parse(raw || "[]"); } catch { values = []; }
  if (!Array.isArray(values) || values.length !== count || values.some((value) => typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))) {
    throw new EvidenceInputError("missing_date", `A valid date is required for every ${key.replace("Dates", "")} file.`);
  }
  return values as string[];
}

async function extractGroup(inputFiles: File[], dates: string[], sourceType: EvidenceSourceType, startIndex: number) {
  const sources: ExtractedSource[] = [];
  const warnings: string[] = [];
  for (let index = 0; index < inputFiles.length; index += 1) {
    const extracted = await extractEvidenceFile(inputFiles[index], sourceType, dates[index], startIndex + index);
    sources.push(extracted.source);
    warnings.push(...extracted.warnings);
  }
  return { sources, warnings };
}

export async function DELETE(request: Request) {
  const session = await operationalSession(request);
  await deleteSessionCache(session.hash);
  return json({ status: "cleared" }, 200, session.setCookie);
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
    const session = await operationalSession(request);
    setCookie = session.setCookie;
    const now = Date.now();
    const usage = await recordSessionRequest(session.hash, now, config.sessionRequestLimit);
    if (!usage.allowed) throw new EvidenceInputError("request_limit", "This anonymous session has reached its daily analysis-request limit. Try again after the daily window resets.", 429);

    const fieldContext = fieldContextSchema.parse({
      field: text(form, "field"),
      targetTitle: text(form, "targetTitle"),
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

    const curriculumDates = dateList(form, "curriculumDates", curriculum.length);
    const supportingDates = dateList(form, "supportingDates", supporting.length);
    const projectDates = dateList(form, "projectDates", project.length);
    const curriculumResult = await extractGroup(curriculum, curriculumDates, "curriculum", 0);
    const supportingResult = await extractGroup(supporting, supportingDates, "supporting_document", curriculum.length);
    const projectType: EvidenceSourceType = text(form, "projectType") === "professional_task" ? "professional_task" : "project_artifact";
    const projectResult = await extractGroup(project, projectDates, projectType, curriculum.length + supporting.length);
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
      promptVersion: "evidence-extraction.v1",
      model: config.model,
      liveAnalysisEnabled: config.liveAnalysisEnabled,
      fieldContext,
      projectType,
      sources: extractedSources.map((source) => ({
        hash: source.metadata.normalizedHash,
        sourceType: source.metadata.sourceType,
        date: source.metadata.date,
      })),
    });
    const cached = await getCachedResult(cacheKey, now);
    if (cached) {
      const ledger = evidenceLedgerSchema.parse(JSON.parse(cached.responseJson));
      return json({ status: "cached", ledger }, 200, setCookie, "hit");
    }

    if (!config.liveAnalysisEnabled || !process.env.OPENAI_API_KEY) {
      const ledger = evidenceLedgerSchema.parse({
        id: `preflight-${crypto.randomUUID()}`,
        schemaVersion: "evidence-ledger.v1",
        promptVersion: "evidence-extraction.v1",
        analysisMode: "preflight_only",
        fieldContext,
        sources: extractedSources.map((source) => source.metadata),
        claims: [],
        warnings,
        limitations: ["The files passed server-side validation and text extraction. Live GPT-5.6 evidence claims are disabled in this deployment, so no capability conclusion has been generated."],
      });
      await putCachedResult(cacheKey, session.hash, JSON.stringify(ledger), now, config.cacheTtlSeconds);
      return json({ status: "validated", ledger }, 200, setCookie, "miss");
    }

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

    const ledger = await extractWithGpt56({
      apiKey: process.env.OPENAI_API_KEY,
      model: config.model,
      fieldContext,
      sources: extractedSources,
      inputWarnings: warnings,
    });
    await putCachedResult(cacheKey, session.hash, JSON.stringify(ledger), now, config.cacheTtlSeconds);
    return json({ status: "completed", ledger }, 200, setCookie, "miss");
  } catch (error) {
    if (error instanceof EvidenceInputError) return json({ error: error.code, message: error.message }, error.status, setCookie);
    if (error instanceof Error && error.name === "ZodError") return json({ error: "invalid_context", message: "Field, target, and location are required and must fit the documented limits." }, 400, setCookie);
    return json({ error: "analysis_failed", message: "The evidence could not be analyzed safely. No result was retained." }, 502, setCookie);
  }
}
