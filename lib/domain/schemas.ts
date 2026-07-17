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

export const evidenceItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sourceType: z.enum(["curriculum", "supporting_document", "project_artifact"]),
  evidenceClass: evidenceClassSchema,
  date: z.iso.date(),
  summary: z.string().min(1),
  locator: z.object({
    path: z.string().min(1),
    kind: z.enum(["section", "symbol", "line", "configuration_key"]),
    value: z.string().min(1),
  }).optional(),
});

export const targetRoleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  location: z.string().min(1),
  scope: z.string().min(1),
});

export const preparedScenarioSchema = z.object({
  id: z.string().min(1),
  person: z.object({
    name: z.string().min(1),
    graduationYear: z.number().int().min(2000),
    program: z.string().min(1),
  }),
  evidence: z.array(evidenceItemSchema).min(1),
  targetRoles: z.array(targetRoleSchema).min(1),
});

export type PreparedScenario = z.infer<typeof preparedScenarioSchema>;
