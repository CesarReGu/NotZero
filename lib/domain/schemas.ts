import { z } from "zod";

export const evidenceClassSchema = z.enum([
  "expected_exposure",
  "demonstrated",
  "self_reported",
  "inferred",
  "unknown",
]);

export const relationshipTypeSchema = z.enum([
  "foundation_for",
  "modern_implementation_of",
  "automates",
  "standardizes",
  "encapsulates",
  "commonly_used_with",
  "alternative_to",
  "successor_to",
  "partial_replacement",
  "no_direct_equivalent",
]);

export const evidenceSourceTypeSchema = z.enum([
  "curriculum",
  "supporting_document",
  "project_artifact",
  "professional_task",
  "source_file",
]);

export const fieldContextSchema = z.object({
  field: z.string().trim().min(2).max(80),
  targetTitle: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  jurisdiction: z.string().trim().max(120).optional(),
});

export const sourceLocatorSchema = z.object({
  path: z.string().min(1),
  kind: z.enum(["section", "symbol", "line", "line_range", "configuration_key"]),
  value: z.string().min(1),
  startLine: z.number().int().positive().nullable().optional(),
  endLine: z.number().int().positive().nullable().optional(),
});

export const evidenceSourceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sourceType: evidenceSourceTypeSchema,
  date: z.iso.date(),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  normalizedHash: z.string().regex(/^[a-f0-9]{64}$/),
  characterCount: z.number().int().nonnegative(),
  pageCount: z.number().int().positive().optional(),
});

export const evidenceReferenceSchema = z.object({
  sourceId: z.string().min(1),
  excerpt: z.string().min(1).max(800),
  locator: sourceLocatorSchema,
});

export const evidenceClaimSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  statement: z.string().min(1).max(700),
  evidenceClass: evidenceClassSchema,
  references: z.array(evidenceReferenceSchema).min(1),
  confidence: z.enum(["low", "medium", "high"]),
  limitations: z.array(z.string().min(1).max(400)).max(5),
});

export const evidenceLedgerSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal("evidence-ledger.v1"),
  promptVersion: z.literal("evidence-extraction.v1"),
  analysisMode: z.enum(["prepared_fixture", "live_gpt_5_6", "preflight_only"]),
  fieldContext: fieldContextSchema,
  sources: z.array(evidenceSourceSchema).min(1),
  claims: z.array(evidenceClaimSchema),
  warnings: z.array(z.string().min(1).max(400)),
  limitations: z.array(z.string().min(1).max(500)).min(1),
  model: z.string().min(1).optional(),
});

export const evidenceModelOutputSchema = z.object({
  claims: z.array(evidenceClaimSchema).max(40),
  warnings: z.array(z.string().min(1).max(400)).max(12),
  limitations: z.array(z.string().min(1).max(500)).min(1).max(12),
});

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceType: evidenceSourceTypeSchema,
  evidenceClass: evidenceClassSchema,
  date: z.iso.date(),
  summary: z.string().min(1),
  locator: sourceLocatorSchema.optional(),
});

export const targetRoleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  field: z.string().min(1).default("Software development"),
  location: z.string().min(1),
  jurisdiction: z.string().min(1).optional(),
  scope: z.string().min(1),
});

export const preparedScenarioSchema = z.object({
  id: z.string().min(1),
  fieldContext: fieldContextSchema,
  person: z.object({
    name: z.string().min(1),
    graduationYear: z.number().int().min(2000),
    program: z.string().min(1),
  }),
  evidence: z.array(evidenceItemSchema).min(1),
  targetRoles: z.array(targetRoleSchema).min(1),
});

export type EvidenceClass = z.infer<typeof evidenceClassSchema>;
export type EvidenceSourceType = z.infer<typeof evidenceSourceTypeSchema>;
export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceClaim = z.infer<typeof evidenceClaimSchema>;
export type EvidenceLedger = z.infer<typeof evidenceLedgerSchema>;
export type FieldContext = z.infer<typeof fieldContextSchema>;
export type PreparedScenario = z.infer<typeof preparedScenarioSchema>;
