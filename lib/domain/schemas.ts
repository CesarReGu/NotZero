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

// What the visitor actually supplies now: only where they are. The field and the
// target role are inferred from the evidence by the extraction stage, so the
// person never has to already know the name of the field they are moving toward.
export const locationContextSchema = z.object({
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
  // No date on user-uploaded evidence. A self-reported file date is unverifiable
  // and could mislead the analysis; currency is judged from the content itself and
  // from the dated market pack, never from a label on the person's own file. The
  // prepared fixture and market sources carry authored/server-owned dates, so the
  // field stays present but optional.
  date: z.iso.date().optional(),
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
  // Inferred from the evidence alone: the professional field the material belongs
  // to and the closest current target role. These replace the user-typed field
  // and target so the answer is never handed to the model in the input.
  field: z.string().trim().min(2).max(80),
  targetTitle: z.string().trim().min(2).max(120),
  fieldRationale: z.string().trim().min(1).max(400),
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

// A learning resource is a dated pointer to something the reader can open and
// read. It belongs to the market pack rather than the report because which
// source teaches current practice is a fact about a moment in time: when the
// pack is re-observed, the reading list is re-observed with it.
export const learningResourceSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(160),
  publisher: z.string().min(1).max(80),
  url: z.url(),
  kind: z.enum(["official_documentation", "specification", "reference"]),
  observedAt: z.iso.date(),
  readingMinutes: z.number().int().positive().max(240),
  covers: z.string().min(1).max(300),
});

// A role profile is a cluster of requirements observed together in the reviewed
// postings. It names its sources so it stays derived rather than invented. It
// lives in the market pack because it describes the postings, not the person:
// every report compared against the same pack shares the same profiles.
export const roleProfileSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  summary: z.string().min(1).max(400),
  emphasis: z.string().min(1).max(300),
  sourceIds: z.array(z.string().min(1)).min(1),
  requirementIds: z.array(z.string().min(1)).min(2),
});

export const currentPracticePackSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal("current-practice-pack.v1"),
  datasetVersion: z.string().min(1),
  field: z.string().min(1).max(80),
  targetScope: z.string().min(1),
  locationScope: z.string().min(1),
  // True when the pack was synthesized by the model for a field the curated
  // packs do not cover. A generated pack is labeled illustrative in the report.
  // A curated pack keeps this false.
  generated: z.boolean().default(false),
  // How the pack's postings were obtained, so provenance copy stays honest:
  //   curated         — a human reviewed each posting (only the software pack today);
  //   web_search      — GPT-5.6 located real current postings by web search on the
  //                     observation date, but no human reviewed them;
  //   model_archetypes — no real postings were available, so the "sources" are
  //                     representative role archetypes the model produced.
  // Older or curated packs omit it and default to `curated`.
  grounding: z.enum(["curated", "web_search", "model_archetypes"]).default("curated"),
  observedFrom: z.iso.date(),
  observedThrough: z.iso.date(),
  // How long the maintainers expect these observations to stay usable. Shown to
  // the reader so a saved report carries its own expiry rather than looking
  // permanent.
  reviewIntervalDays: z.number().int().min(30).max(365).default(180),
  sources: z.array(marketSourceSchema).min(5),
  requirements: z.array(marketRequirementSchema).min(1),
  technicalSources: z.array(technicalSourceSchema).min(1),
  learningResources: z.array(learningResourceSchema).default([]),
  roleProfiles: z.array(roleProfileSchema).max(6).default([]),
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
  reuses: z.string().min(1).max(400),
  newConcept: z.string().min(1).max(400),
  whyItIsUsed: z.string().min(1).max(500),
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

export const codeLanguageSchema = z.enum([
  "typescript",
  "javascript",
  "sql",
  "dockerfile",
  "yaml",
  "shell",
  "text",
]);

// A code bridge shows a verbatim excerpt of the user's own artifact beside a
// current-practice counterpart. The observed side must always be quoted from a
// submitted source; the modern side is labelled by comparisonState and is never
// presented as executed.
export const codeBridgeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  claimId: z.string().min(1),
  requirementId: z.string().min(1),
  relationshipType: relationshipTypeSchema,
  comparisonState: comparisonStateSchema,
  observed: z.object({
    label: z.string().min(1).max(120),
    language: codeLanguageSchema,
    code: z.string().min(1).max(2000),
    path: z.string().min(1),
    startLine: z.number().int().positive().nullable().optional(),
    endLine: z.number().int().positive().nullable().optional(),
    date: z.iso.date().optional(),
  }),
  demonstrates: z.string().min(1).max(500),
  modern: z.object({
    label: z.string().min(1).max(120),
    language: codeLanguageSchema,
    code: z.string().min(1).max(2000),
    caption: z.string().min(1).max(300),
    // Where this file would live in the user's project. Used by the export
    // package so the counterpart ships as a real, droppable file.
    filename: z.string().min(1).max(80).regex(/^[A-Za-z0-9._/-]+$/),
  }),
  whyItMatters: z.string().min(1).max(500),
  whatTransfers: z.array(z.string().min(1).max(250)).min(1).max(6),
  whatIsNew: z.array(z.string().min(1).max(250)).min(1).max(6),
  limitations: z.array(z.string().min(1).max(500)).min(1).max(4),
});

// How a term the user already uses relates to the term teams use now. Kept
// separate from relationshipType, which describes tools rather than words.
export const vocabularyRelationSchema = z.enum(["equivalent", "narrower", "related"]);

export const vocabularyBridgeSchema = z.object({
  id: z.string().min(1),
  claimId: z.string().min(1),
  yourTerm: z.string().min(1).max(200),
  industryTerm: z.string().min(1).max(120),
  relation: vocabularyRelationSchema,
  note: z.string().min(1).max(400),
  sourcePath: z.string().min(1),
  requirementId: z.string().min(1).optional(),
});

// Where a single syllabus topic stands against the submitted evidence.
// `settled` is the load-bearing state: it is how the curriculum shrinks. A
// topic may only be called settled when a claim in the ledger backs it, which
// the schema enforces below.
export const topicStanceSchema = z.enum(["settled", "partial", "new"]);

export const curriculumTopicSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(160),
  stance: topicStanceSchema,
  // Hours cover the work that remains, so a settled topic costs nothing. This
  // is the number that makes the curriculum shorter than a generic one.
  hours: z.number().min(0).max(40),
  note: z.string().min(1).max(400),
  claimIds: z.array(z.string().min(1)).max(4),
  resourceIds: z.array(z.string().min(1)).max(3),
}).superRefine((topic, context) => {
  if (topic.stance === "settled" && topic.hours !== 0) {
    context.addIssue({ code: "custom", path: ["hours"], message: "A settled topic must cost zero remaining hours." });
  }
  if (topic.stance !== "settled" && topic.hours <= 0) {
    context.addIssue({ code: "custom", path: ["hours"], message: "A topic that is not settled must carry remaining hours." });
  }
  // Removing work from a student's plan is the strongest claim this product
  // makes, so it always has to name the evidence behind it.
  if (topic.stance !== "new" && topic.claimIds.length === 0) {
    context.addIssue({ code: "custom", path: ["claimIds"], message: "Only a topic backed by an evidence claim may be marked settled or partial." });
  }
  if (topic.stance === "new" && topic.resourceIds.length === 0) {
    context.addIssue({ code: "custom", path: ["resourceIds"], message: "A new topic must point at something the reader can go and read." });
  }
});

export const curriculumModuleSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  summary: z.string().min(1).max(400),
  topics: z.array(curriculumTopicSchema).min(3).max(12),
});

// Practice attached to a phase. `drill` is a small isolated repetition,
// `build` extends the reader's own project, `verify` proves the phase landed.
export const phaseExerciseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(140),
  kind: z.enum(["drill", "build", "verify"]),
  minutes: z.number().int().min(5).max(480),
  prompt: z.string().min(1).max(700),
  startFrom: z.string().min(1).max(300),
  acceptance: z.array(z.string().min(1).max(300)).min(2).max(5),
  stuckHint: z.string().min(1).max(400),
});

export const roadmapPhaseSchema = z.object({
  order: z.number().int().min(1).max(6),
  title: z.string().min(1).max(140),
  goal: z.string().min(1).max(400),
  startsFromClaimIds: z.array(z.string().min(1)).min(1),
  vocabularyIds: z.array(z.string().min(1)),
  newConcepts: z.array(z.string().min(1).max(200)).min(1).max(6),
  buildArtifact: z.string().min(1).max(300),
  checkpoint: z.string().min(1).max(300),
  scope: z.string().min(1).max(160),
  unlocksRequirementIds: z.array(z.string().min(1)),
  modules: z.array(curriculumModuleSchema).max(4).optional(),
  exercises: z.array(phaseExerciseSchema).max(4).optional(),
});

export const roadmapSchema = z.object({
  title: z.string().min(1).max(140),
  premise: z.string().min(1).max(500),
  phases: z.array(roadmapPhaseSchema).min(2).max(6),
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
  codeBridges: z.array(codeBridgeSchema).max(5).optional(),
  vocabularyBridges: z.array(vocabularyBridgeSchema).max(24).optional(),
  roleProfiles: z.array(roleProfileSchema).max(6).optional(),
  roadmap: roadmapSchema.optional(),
  walkthroughUnavailableReason: z.string().min(1).max(500).optional(),
  limitations: z.array(z.string().min(1).max(500)).min(1),
}).superRefine((report, context) => {
  const hasProjectGrounding = Boolean(report.walkthrough) || (report.codeBridges?.length ?? 0) > 0;
  if (hasProjectGrounding === Boolean(report.walkthroughUnavailableReason)) {
    context.addIssue({
      code: "custom",
      path: ["walkthrough"],
      message: "Provide either a project walkthrough or code bridge, or a reason none is available.",
    });
  }
  const seenCodeBridges = new Set<string>();
  for (const [index, bridge] of (report.codeBridges ?? []).entries()) {
    if (seenCodeBridges.has(bridge.id)) context.addIssue({ code: "custom", path: ["codeBridges", index, "id"], message: "Code bridge ids must be unique." });
    seenCodeBridges.add(bridge.id);
  }

  const vocabularyIds = new Set((report.vocabularyBridges ?? []).map((item) => item.id));
  if (vocabularyIds.size !== (report.vocabularyBridges ?? []).length) {
    context.addIssue({ code: "custom", path: ["vocabularyBridges"], message: "Vocabulary bridge ids must be unique." });
  }
  if (report.roadmap) {
    const seenTopics = new Set<string>();
    const seenExercises = new Set<string>();
    for (const [index, phase] of report.roadmap.phases.entries()) {
      if (phase.order !== index + 1) {
        context.addIssue({ code: "custom", path: ["roadmap", "phases", index, "order"], message: "Roadmap phases must be numbered sequentially from 1." });
      }
      for (const vocabularyId of phase.vocabularyIds) {
        if (!vocabularyIds.has(vocabularyId)) {
          context.addIssue({ code: "custom", path: ["roadmap", "phases", index, "vocabularyIds"], message: `Roadmap phase ${phase.order} references unknown vocabulary ${vocabularyId}.` });
        }
      }
      for (const curriculumModule of phase.modules ?? []) {
        for (const topic of curriculumModule.topics) {
          if (seenTopics.has(topic.id)) {
            context.addIssue({ code: "custom", path: ["roadmap", "phases", index, "modules"], message: `Curriculum topic ${topic.id} appears more than once.` });
          }
          seenTopics.add(topic.id);
        }
      }
      for (const exercise of phase.exercises ?? []) {
        if (seenExercises.has(exercise.id)) {
          context.addIssue({ code: "custom", path: ["roadmap", "phases", index, "exercises"], message: `Exercise ${exercise.id} appears more than once.` });
        }
        seenExercises.add(exercise.id);
      }
      // A phase that carries a syllabus has to carry the practice that proves
      // it. Reading lists without exercises are the failure mode this section
      // exists to avoid.
      if ((phase.modules?.length ?? 0) > 0 && (phase.exercises?.length ?? 0) === 0) {
        context.addIssue({ code: "custom", path: ["roadmap", "phases", index, "exercises"], message: `Roadmap phase ${phase.order} lists topics but no way to practise them.` });
      }
    }
  }
  const seenProfiles = new Set<string>();
  for (const [index, profile] of (report.roleProfiles ?? []).entries()) {
    if (seenProfiles.has(profile.id)) context.addIssue({ code: "custom", path: ["roleProfiles", index, "id"], message: "Role profile ids must be unique." });
    seenProfiles.add(profile.id);
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
  file: z.object({
    url: z.string().min(1),
    name: z.string().min(1),
    bytes: z.number().int().positive(),
    mimeType: z.string().min(1),
  }).optional(),
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
export type LocationContext = z.infer<typeof locationContextSchema>;
export type PreparedScenario = z.infer<typeof preparedScenarioSchema>;
export type CurrentPracticePack = z.infer<typeof currentPracticePackSchema>;
export type KnowledgeBridgeReport = z.infer<typeof knowledgeBridgeReportSchema>;
export type BridgeFinding = z.infer<typeof bridgeFindingSchema>;
export type CodeBridge = z.infer<typeof codeBridgeSchema>;
export type CodeLanguage = z.infer<typeof codeLanguageSchema>;
export type ResultGroup = z.infer<typeof resultGroupSchema>;
export type ComparisonState = z.infer<typeof comparisonStateSchema>;
export type VocabularyBridge = z.infer<typeof vocabularyBridgeSchema>;
export type RoleProfile = z.infer<typeof roleProfileSchema>;
export type Roadmap = z.infer<typeof roadmapSchema>;
export type RoadmapPhase = z.infer<typeof roadmapPhaseSchema>;
export type CurriculumModule = z.infer<typeof curriculumModuleSchema>;
export type CurriculumTopic = z.infer<typeof curriculumTopicSchema>;
export type TopicStance = z.infer<typeof topicStanceSchema>;
export type PhaseExercise = z.infer<typeof phaseExerciseSchema>;
export type LearningResource = z.infer<typeof learningResourceSchema>;
