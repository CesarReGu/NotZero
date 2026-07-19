import { NextResponse } from "next/server";
import { evidenceLedgerSchema, fieldContextSchema, type EvidenceSourceType } from "@/lib/domain/schemas";
import { readServerConfig } from "@/lib/config/server";
import { EvidenceInputError, extractEvidenceFile, type ExtractedSource } from "@/lib/evidence/files";
import { EVIDENCE_LIMITS } from "@/lib/evidence/limits";
import { extractWithGpt56 } from "@/lib/evidence/openai-adapter";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    if (text(form, "mode") === "prepared") {
      return NextResponse.json({ status: "completed", ledger: alexEvidenceLedger, report: alexBridgeReport });
    }

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

    const config = readServerConfig();
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
      return NextResponse.json({ status: "validated", ledger });
    }

    const ledger = await extractWithGpt56({
      apiKey: process.env.OPENAI_API_KEY,
      model: config.model,
      fieldContext,
      sources: extractedSources,
      inputWarnings: warnings,
    });
    return NextResponse.json({ status: "completed", ledger });
  } catch (error) {
    if (error instanceof EvidenceInputError) return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
    if (error instanceof Error && error.name === "ZodError") return NextResponse.json({ error: "invalid_context", message: "Field, target, and location are required and must fit the documented limits." }, { status: 400 });
    return NextResponse.json({ error: "analysis_failed", message: "The evidence could not be analyzed safely. No result was retained." }, { status: 502 });
  }
}
