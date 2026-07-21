import type { EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";

export type AnalysisState = "idle" | "loading" | "empty" | "partial" | "error" | "limit" | "completed";

const limitCodes = new Set([
  "curriculum_count", "supporting_count", "project_count", "request_size", "total_size", "file_size", "total_text",
  "request_limit", "session_limit", "global_limit",
]);

export function classifyAnalysisResult(ledger: EvidenceLedger, report?: KnowledgeBridgeReport): AnalysisState {
  if (report) return "completed";
  return ledger.claims.length > 0 ? "partial" : "empty";
}

export function isLimitFailure(status: number, code?: string): boolean {
  return status === 413 || status === 429 || Boolean(code && limitCodes.has(code));
}
