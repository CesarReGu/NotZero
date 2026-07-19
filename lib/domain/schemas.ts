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

export const marketRequirementKindSchema = z.enum(["concept", "practice", "tool"]);

export const marketSourceSchema = z.object({
  id: z.string().min(1),
  employer: z.string().min(1),
  roleTitle: z.string().min(1),
  location: z.string().min(1),
  seniority: z.enum(["entry", "early_career", "mixed", "senior"]),
  url: z.url(),
  observedAt: z.iso.date(),
  sourceType: z.literal("employer_job_posting"),
  usageBasis: z.string().min(1).max(500),
  requirementIds: z.array(z.string().min(1)).min(1),
});

export const marketRequirementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: marketRequirementKindSchema,
  aliases: z.array(z.string().min(1)),
  sourceIds: z.array(z.string().min(1)).min(1),
  mentionCount: z.number().int().positive(),
  context: z.string().min(1).max(500),
});

export const technicalSourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  publisher: z.string().min(1),
  url: z.url(),
  observedAt: z.iso.date(),
  usageBasis: z.string().min(1).max(500),
  supports: z.array(relationshipTypeSchema).min(1),
});

export const currentPracticePackSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal("current-practice-pack.v1"),
  datasetVersion: z.string().min(1),
  field: z.literal("Software development"),
  targetScope: z.string().min(1),
  locationScope: z.string().min(1),
  observedFrom: z.iso.date(),
  observedThrough: z.iso.date(),
  sources: z.array(marketSourceSchema).min(5),
  requirements: z.array(marketRequirementSchema).min(1),
  technicalSources: z.array(technicalSourceSchema).min(1),
  methodology: z.array(z.string().min(1).max(500)).min(1),
  limitations: z.array(z.string().min(1).max(500)).min(1),
});

export const resultGroupSchema = z.enum([
  "current",
  "transferable",
  "small_bridge",
  "genuine_gap",
  "insufficient_evidence",
]);

export const comparisonStateSchema = z.enum(["verified", "illustrative", "conceptual"]);

export const relationshipEvidenceSchema = z.object({
  sourceId: z.string().min(1),
  sourceKind: z.enum(["market_dataset", "official_documentation"]),
  summary: z.string().min(1).max(500),
  url: z.url(),
});

export const bridgeFindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  group: resultGroupSchema,
  existingCapability: z.string().min(1).max(500),
  evidenceClaimIds: z.array(z.string().min(1)),
  currentRequirementId: z.string().min(1),
  relationshipType: relationshipTypeSchema.optional(),
  relationshipEvidence: z.array(relationshipEvidenceSchema).min(1),
  artifactReference: evidenceReferenceSchema.optional(),
  observedImplementation: z.string().min(1).max(700),
  modernCounterpart: z.string().min(1).max(700),
  comparisonState: comparisonStateSchema,
  manualStepsChanged: z.array(z.string().min(1).max(300)),
  transferableConcepts: z.array(z.string().min(1).max(200)),
  newConcepts: z.array(z.string().min(1).max(200)),
  whyItIsUsed: z.string().min(1).max(500),
  explanation: z.string().min(1).max(900),
  recommendedAction: z.string().min(1).max(500),
  confidence: z.enum(["low", "medium", "high"]),
  limitations: z.array(z.string().min(1).max(500)).min(1),
});

export const prioritizedNextStepSchema = z.object({
  rank: z.number().int().min(1).max(3),
  title: z.string().min(1).max(140),
  buildsOn: z.array(z.string().min(1)).min(1),
  whyNow: z.string().min(1).max(500),
  proof: z.string().min(1).max(500),
});

export const upgradeChallengeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  basedOnClaimIds: z.array(z.string().min(1)).min(1),
  objective: z.string().min(1).max(700),
  acceptanceCriteria: z.array(z.string().min(1).max(400)).min(2).max(6),
  comparisonState: comparisonStateSchema,
});

export const projectWalkthroughSchema = z.object({
  title: z.string().min(1).max(140),
  claimId: z.string().min(1),
  artifactReference: evidenceReferenceSchema,
  observedImplementation: z.string().min(1).max(700),
  modernCounterpart: z.string().min(1).max(700),
  relationshipType: relationshipTypeSchema,
  comparisonState: comparisonStateSchema,
  illustrativeSketch: z.string().min(1).max(2000).optional(),
  whatTransfers: z.array(z.string().min(1).max(250)).min(1),
  whatIsNew: z.array(z.string().min(1).max(250)).min(1),
  limitations: z.array(z.string().min(1).max(500)).min(1),
});

export const knowledgeBridgeReportSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.enum(["knowledge-bridge-report.v1", "knowledge-bridge-report.v2"]),
  analysisVersion: z.string().min(1).max(80),
  analysisMode: z.enum(["prepared_fixture", "live_gpt_5_6"]),
  ledgerId: z.string().min(1),
  currentPracticePackId: z.string().min(1),
  datasetVersion: z.string().min(1),
  generatedAt: z.iso.datetime(),
  findings: z.array(bridgeFindingSchema).min(1).max(12),
  counts: z.object({
    current: z.number().int().nonnegative(),
    transferable: z.number().int().nonnegative(),
    smallBridge: z.number().int().nonnegative(),
    genuineGap: z.number().int().nonnegative(),
    insufficientEvidence: z.number().int().nonnegative(),
  }),
  requirementCoverage: z.array(z.object({
    requirementId: z.string().min(1),
    findingId: z.string().min(1).nullable(),
    group: z.union([resultGroupSchema, z.literal("not_assessed")]),
    evidenceCount: z.number().int().nonnegative(),
  })).min(1).optional(),
  nextSteps: z.array(prioritizedNextStepSchema).length(3),
  upgradeChallenge: upgradeChallengeSchema,
  walkthrough: projectWalkthroughSchema.optional(),
  walkthroughUnavailableReason: z.string().min(1).max(500).optional(),
  limitations: z.array(z.string().min(1).max(500)).min(1),
}).superRefine((report, context) => {
  if (Boolean(report.walkthrough) === Boolean(report.walkthroughUnavailableReason)) {
    context.addIssue({
      code: "custom",
      path: ["walkthrough"],
      message: "Provide either a project walkthrough or a reason it is unavailable.",
    });
  }
  if (report.requirementCoverage) {
    const seenRequirements = new Set<string>();
    const seenFindings = new Set<string>();
    for (const [index, coverage] of report.requirementCoverage.entries()) {
      if (seenRequirements.has(coverage.requirementId)) context.addIssue({ code: "custom", path: ["requirementCoverage", index, "requirementId"], message: "Requirement coverage must be unique." });
      seenRequirements.add(coverage.requirementId);
      if (!coverage.findingId) {
        if (coverage.group !== "not_assessed" || coverage.evidenceCount !== 0) context.addIssue({ code: "custom", path: ["requirementCoverage", index], message: "Unassessed coverage cannot claim a group or evidence." });
        continue;
      }
      if (seenFindings.has(coverage.findingId)) context.addIssue({ code: "custom", path: ["requirementCoverage", index, "findingId"], message: "A finding can cover only one requirement." });
      seenFindings.add(coverage.findingId);
      const finding = report.findings.find((item) => item.id === coverage.findingId);
      if (!finding || finding.currentRequirementId !== coverage.requirementId || finding.group !== coverage.group || new Set(finding.evidenceClaimIds).size !== coverage.evidenceCount) {
        context.addIssue({ code: "custom", path: ["requirementCoverage", index], message: "Requirement coverage must match the validated finding." });
      }
    }
    for (const finding of report.findings) if (!seenFindings.has(finding.id)) context.addIssue({ code: "custom", path: ["requirementCoverage"], message: `Finding ${finding.id} is missing from requirement coverage.` });
  }
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
export type CurrentPracticePack = z.infer<typeof currentPracticePackSchema>;
export type KnowledgeBridgeReport = z.infer<typeof knowledgeBridgeReportSchema>;
export type BridgeFinding = z.infer<typeof bridgeFindingSchema>;
