import { z } from "zod";
import {
  currentPracticePackSchema,
  knowledgeBridgeReportSchema,
  marketRequirementKindSchema,
  relationshipTypeSchema,
  type ComparisonState,
  type CurrentPracticePack,
  type FieldContext,
  type KnowledgeBridgeReport,
} from "@/lib/domain/schemas";
import { validatePracticePack } from "@/lib/market/current-practice";
import type { ReasoningEffort } from "@/lib/config/server";
import { isTerminalKeyError, readResponseOutputText, requestResponses } from "@/lib/openai/responses";
import { scanJobPostingsWithGpt56, type JobPostingScan } from "@/lib/market/job-postings-adapter";

export const PRACTICE_PACK_PROMPT_VERSION = "practice-pack.v1";
// The grounded path is a second, distinct prompt (postings in, canonical pack
// out) so a result built from real postings is versioned apart from one built
// from imagined archetypes.
export const GROUNDED_PACK_PROMPT_VERSION = "practice-pack-grounded.v1";
// Reasoning tokens share this budget on the Responses API. The pack itself is
// bounded by the schema, so the ceiling mostly buys reasoning room at high
// effort. It is sized above the extraction and comparison ceilings because a
// truncated pack was the observed failure mode for a non-curated field at max
// reasoning effort: the model spent its budget reasoning and returned an
// incomplete response with no structured output.
export const PRACTICE_PACK_MAX_OUTPUT_TOKENS = 48_000;

const seniorityValues = ["entry", "early_career", "mixed", "senior"] as const;
const resourceKindValues = ["official_documentation", "specification", "reference"] as const;

// The model returns a compact reference it can keep internally consistent at a
// small scale. The server assembles the full reciprocal pack from it, so the
// strict pack validators (mention counts, reciprocal source mappings, role
// profiles observed in their postings) always hold regardless of the model.
const generatedPackSchema = z.object({
  roleArchetypes: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(120),
    sector: z.string().min(1).max(80),
    seniority: z.enum(seniorityValues),
    requirementIds: z.array(z.string().min(1).max(60)).min(1).max(12),
  })).min(5).max(10),
  requirements: z.array(z.object({
    id: z.string().min(1).max(60),
    name: z.string().min(1).max(80),
    kind: marketRequirementKindSchema,
    aliases: z.array(z.string().min(1).max(60)).max(6),
    context: z.string().min(1).max(400),
  })).min(4).max(12),
  roleProfiles: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(100),
    summary: z.string().min(1).max(360),
    emphasis: z.string().min(1).max(280),
    archetypeIds: z.array(z.string().min(1).max(60)).min(1).max(10),
    requirementIds: z.array(z.string().min(1).max(60)).min(2).max(12),
  })).min(1).max(5),
  technicalSources: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(120),
    publisher: z.string().min(1).max(80),
    url: z.url().max(300),
    supports: z.array(relationshipTypeSchema).min(1).max(6),
    usageBasis: z.string().min(1).max(300),
  })).min(1).max(6),
  learningResources: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(160),
    publisher: z.string().min(1).max(80),
    url: z.url().max(300),
    kind: z.enum(resourceKindValues),
    readingMinutes: z.number().int().min(5).max(240),
    covers: z.string().min(1).max(280),
  })).min(3).max(10),
  methodology: z.array(z.string().min(1).max(400)).min(1).max(6),
  limitations: z.array(z.string().min(1).max(400)).min(1).max(6),
}).strict();

export type GeneratedPackModelOutput = z.infer<typeof generatedPackSchema>;

const stringItem = (max: number) => ({ type: "string", minLength: 1, maxLength: max });

const practicePackOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["roleArchetypes", "requirements", "roleProfiles", "technicalSources", "learningResources", "methodology", "limitations"],
  properties: {
    roleArchetypes: {
      type: "array", minItems: 5, maxItems: 10,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "sector", "seniority", "requirementIds"],
        properties: {
          id: stringItem(60), title: stringItem(120), sector: stringItem(80),
          seniority: { type: "string", enum: [...seniorityValues] },
          requirementIds: { type: "array", minItems: 1, maxItems: 12, items: stringItem(60) },
        },
      },
    },
    requirements: {
      type: "array", minItems: 4, maxItems: 12,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "name", "kind", "aliases", "context"],
        properties: {
          id: stringItem(60), name: stringItem(80),
          kind: { type: "string", enum: marketRequirementKindSchema.options },
          aliases: { type: "array", maxItems: 6, items: stringItem(60) },
          context: stringItem(400),
        },
      },
    },
    roleProfiles: {
      type: "array", minItems: 1, maxItems: 5,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "summary", "emphasis", "archetypeIds", "requirementIds"],
        properties: {
          id: stringItem(60), title: stringItem(100), summary: stringItem(360), emphasis: stringItem(280),
          archetypeIds: { type: "array", minItems: 1, maxItems: 10, items: stringItem(60) },
          requirementIds: { type: "array", minItems: 2, maxItems: 12, items: stringItem(60) },
        },
      },
    },
    technicalSources: {
      type: "array", minItems: 1, maxItems: 6,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "publisher", "url", "supports", "usageBasis"],
        properties: {
          id: stringItem(60), title: stringItem(120), publisher: stringItem(80),
          url: { type: "string", minLength: 1, maxLength: 300 },
          supports: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", enum: relationshipTypeSchema.options } },
          usageBasis: stringItem(300),
        },
      },
    },
    learningResources: {
      type: "array", minItems: 3, maxItems: 10,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "publisher", "url", "kind", "readingMinutes", "covers"],
        properties: {
          id: stringItem(60), title: stringItem(160), publisher: stringItem(80),
          url: { type: "string", minLength: 1, maxLength: 300 },
          kind: { type: "string", enum: [...resourceKindValues] },
          readingMinutes: { type: "integer", minimum: 5, maximum: 240 },
          covers: stringItem(280),
        },
      },
    },
    methodology: { type: "array", minItems: 1, maxItems: 6, items: stringItem(400) },
    limitations: { type: "array", minItems: 1, maxItems: 6, items: stringItem(400) },
  },
} as const;

function slug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "field";
}

// A real, working job-board search for the role in the location. It is honest:
// a search that surfaces current postings, never a claim about one specific
// posting we reviewed.
function jobSearchUrl(role: string, location: string) {
  const primaryLocation = location.split(/[·|,]/)[0].trim() || location;
  return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(primaryLocation)}`;
}

type PackSource = {
  id: string;
  employer: string;
  roleTitle: string;
  location: string;
  seniority: (typeof seniorityValues)[number];
  url: string;
  observedAt: string;
  sourceType: "employer_job_posting";
  usageBasis: string;
  requirementIds: string[];
};

type NormalizedProfile = { id: string; title: string; summary: string; emphasis: string; sourceIds: string[]; requirementIds: string[] };

/**
 * Shared tail for both generated paths (real postings and archetypes). Given
 * sources that already carry their requirement ids, it recomputes every
 * requirement's mention count and reciprocal source mapping, keeps only role
 * profiles whose requirements are actually observed in their cited sources, and
 * validates the assembled pack. Because the counts and mappings are derived here
 * rather than trusted from the model, a generated pack satisfies the same strict
 * validators a curated pack does regardless of how its sources were obtained.
 */
function finishPack(params: {
  sources: PackSource[];
  modelRequirements: GeneratedPackModelOutput["requirements"];
  modelProfiles: NormalizedProfile[];
  technicalSources: GeneratedPackModelOutput["technicalSources"];
  learningResources: GeneratedPackModelOutput["learningResources"];
  methodology: string[];
  limitations: string[];
  fieldContext: FieldContext;
  grounding: "web_search" | "model_archetypes";
  observedOn: string;
}): CurrentPracticePack {
  const { sources, observedOn } = params;

  // A requirement is kept only if a source emphasizes it. Because the count is
  // derived from exactly those sources, mentionCount and the reciprocal mapping
  // are consistent by construction.
  const requirements = params.modelRequirements
    .map((requirement) => {
      const sourceIds = sources.filter((source) => source.requirementIds.includes(requirement.id)).map((source) => source.id);
      return { id: requirement.id, name: requirement.name, kind: requirement.kind, aliases: requirement.aliases, sourceIds, mentionCount: sourceIds.length, context: requirement.context };
    })
    .filter((requirement) => requirement.mentionCount > 0);

  if (requirements.length < 1) throw new Error("Generated pack did not yield any requirement observed in a source.");

  const keptRequirementIds = new Set(requirements.map((requirement) => requirement.id));
  const sourceById = new Map(sources.map((source) => [source.id, source]));

  const roleProfiles = params.modelProfiles
    .map((profile) => {
      const sourceIds = [...new Set(profile.sourceIds.filter((id) => sourceById.has(id)))];
      const observed = new Set<string>();
      for (const sourceId of sourceIds) for (const requirementId of sourceById.get(sourceId)?.requirementIds ?? []) observed.add(requirementId);
      const requirementIds = [...new Set(profile.requirementIds.filter((id) => keptRequirementIds.has(id) && observed.has(id)))];
      return { id: profile.id, title: profile.title, summary: profile.summary, emphasis: profile.emphasis, sourceIds, requirementIds };
    })
    .filter((profile) => profile.sourceIds.length >= 1 && profile.requirementIds.length >= 2)
    .slice(0, 6);

  const datasetVersion = `generated-${slug(params.fieldContext.field)}-${observedOn}-${crypto.randomUUID().slice(0, 8)}`;

  const pack = currentPracticePackSchema.parse({
    id: `pack-${datasetVersion}`,
    schemaVersion: "current-practice-pack.v1",
    datasetVersion,
    field: params.fieldContext.field,
    targetScope: params.fieldContext.targetTitle,
    locationScope: params.fieldContext.location,
    generated: true,
    grounding: params.grounding,
    observedFrom: observedOn,
    observedThrough: observedOn,
    reviewIntervalDays: 30,
    sources,
    requirements,
    technicalSources: params.technicalSources.map((source) => ({
      id: source.id, title: source.title, publisher: source.publisher, url: source.url,
      observedAt: observedOn, usageBasis: source.usageBasis, supports: source.supports,
    })),
    learningResources: params.learningResources.map((resource) => ({ ...resource, observedAt: observedOn })),
    roleProfiles,
    methodology: params.methodology,
    limitations: params.limitations,
  });

  return validatePracticePack(pack);
}

/**
 * Turns the compact archetype model output into a full, validated pack. This is
 * the fallback used when no real postings could be located: its "sources" are
 * representative role archetypes the model produced, and their links open live
 * job-board searches rather than specific postings.
 */
export function assembleGeneratedPack(model: GeneratedPackModelOutput, fieldContext: FieldContext, now = new Date()): CurrentPracticePack {
  const today = now.toISOString().slice(0, 10);
  const declaredRequirementIds = new Set(model.requirements.map((requirement) => requirement.id));

  const sources = model.roleArchetypes
    .map((archetype) => ({
      id: archetype.id,
      employer: archetype.sector,
      roleTitle: archetype.title,
      location: fieldContext.location,
      seniority: archetype.seniority,
      url: jobSearchUrl(archetype.title, fieldContext.location),
      observedAt: today,
      sourceType: "employer_job_posting" as const,
      usageBasis: `Representative ${fieldContext.field} role archetype generated for this analysis; not an individually reviewed posting.`,
      requirementIds: [...new Set(archetype.requirementIds.filter((id) => declaredRequirementIds.has(id)))],
    }))
    .filter((source) => source.requirementIds.length > 0);

  if (sources.length < 5) throw new Error("Generated pack did not yield at least five usable role archetypes.");

  return finishPack({
    sources,
    modelRequirements: model.requirements,
    modelProfiles: model.roleProfiles.map((profile) => ({ id: profile.id, title: profile.title, summary: profile.summary, emphasis: profile.emphasis, sourceIds: profile.archetypeIds, requirementIds: profile.requirementIds })),
    technicalSources: model.technicalSources,
    learningResources: model.learningResources,
    methodology: [
      "This current-practice reference was generated by GPT-5.6 for the entered field, target, and location. It was not compiled from individually reviewed job postings.",
      "Requirement counts describe representative role archetypes the model produced, not a survey of real postings.",
      ...model.methodology,
    ],
    limitations: [
      "Generated reference: the requirements, roles, and reading list were synthesized by the model for this field and were not human-reviewed.",
      "Role links open live job-board searches for the target so the reader can check real current postings; they are not specific postings NotZero reviewed.",
      ...model.limitations,
    ],
    fieldContext,
    grounding: "model_archetypes",
    observedOn: today,
  });
}

// The pack is the one stage with no curated fallback, so a single truncated or
// transiently malformed response would otherwise leave a whole non-software
// field with no comparison at all. It gets its own bounded retry: two attempts,
// stopping early for key or spending problems the caller must surface.
const PRACTICE_PACK_ATTEMPTS = 2;

export async function generatePracticePackWithGpt56(args: {
  apiKey: string;
  model: string;
  reasoningEffort?: ReasoningEffort;
  fieldContext: FieldContext;
  fetcher?: typeof fetch;
  now?: Date;
}): Promise<CurrentPracticePack> {
  const fetcher = args.fetcher ?? fetch;
  const body = JSON.stringify({
    model: args.model,
    prompt_cache_key: "notzero-practice-pack-v1",
    reasoning: { effort: args.reasoningEffort ?? "medium" },
    instructions: [
      "You produce a compact current-practice reference for one professional field, so NotZero can compare a person's prior evidence against how the work is practiced now.",
      "Describe the field, target, and location given in the input. Never restate or assume a specific person's evidence; you are describing the field, not an individual.",
      "Requirements are concrete, checkable capabilities a current practitioner is expected to have (each classified concept, practice, or tool). Prefer the capabilities that most distinguish current professional practice from older academic training in this field.",
      "Every role archetype must list the requirement ids it emphasizes, and every requirement must be emphasized by at least one archetype. Role profiles are clusters of requirements that appear together in real roles.",
      "Reuse the exact requirement ids you declared. Do not reference a requirement id from a role, profile, or source unless it appears verbatim in the requirements array.",
      "technicalSources and learningResources must be genuine, well-known, stable references (official documentation, standards, or authoritative references) with correct public URLs. Never invent a URL, standard, or publisher.",
      "Choose a relationship the technical source actually supports from the allowed set. Keep everything accurate and neutral; this reference will be shown to the reader labeled as model-generated.",
      "Use short kebab-case ids. Do not give professional, medical, legal, or financial advice.",
    ].join("\n"),
    input: JSON.stringify({ fieldContext: args.fieldContext }),
    text: { format: { type: "json_schema", name: "notzero_practice_pack", strict: true, schema: practicePackOutputJsonSchema } },
    max_output_tokens: PRACTICE_PACK_MAX_OUTPUT_TOKENS,
  });

  for (let attempt = 0; attempt < PRACTICE_PACK_ATTEMPTS; attempt += 1) {
    try {
      const raw = await requestResponses({ fetcher, apiKey: args.apiKey, label: "practice-pack generation", body });
      const model = generatedPackSchema.parse(JSON.parse(readResponseOutputText(raw)));
      return assembleGeneratedPack(model, args.fieldContext, args.now);
    } catch (error) {
      // Key and spending problems are terminal and must reach the caller so the
      // visitor can fix them. A truncated response, a malformed shape, a 5xx, or
      // an inconsistent assembly can all come out clean on a fresh generation, so
      // they get one more attempt before the failure is recorded and surfaced.
      if (isTerminalKeyError(error) || attempt === PRACTICE_PACK_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("OpenAI practice-pack generation failed.");
}

// The grounded synthesis reuses the reading-list and technical-source shapes
// from the archetype schema, but its sources are the real postings from the
// scan, so instead of inventing archetypes the model only maps each provided
// posting id to the canonical requirement ids it states.
const groundedSynthesisSchema = z.object({
  requirements: z.array(z.object({
    id: z.string().min(1).max(60),
    name: z.string().min(1).max(80),
    kind: marketRequirementKindSchema,
    aliases: z.array(z.string().min(1).max(60)).max(6),
    context: z.string().min(1).max(400),
  })).min(4).max(14),
  postingRequirements: z.array(z.object({
    postingId: z.string().min(1).max(60),
    requirementIds: z.array(z.string().min(1).max(60)).min(1).max(14),
  })).min(5).max(20),
  roleProfiles: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(100),
    summary: z.string().min(1).max(360),
    emphasis: z.string().min(1).max(280),
    postingIds: z.array(z.string().min(1).max(60)).min(1).max(20),
    requirementIds: z.array(z.string().min(1).max(60)).min(2).max(14),
  })).min(1).max(5),
  technicalSources: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(120),
    publisher: z.string().min(1).max(80),
    url: z.url().max(300),
    supports: z.array(relationshipTypeSchema).min(1).max(6),
    usageBasis: z.string().min(1).max(300),
  })).min(1).max(6),
  learningResources: z.array(z.object({
    id: z.string().min(1).max(60),
    title: z.string().min(1).max(160),
    publisher: z.string().min(1).max(80),
    url: z.url().max(300),
    kind: z.enum(resourceKindValues),
    readingMinutes: z.number().int().min(5).max(240),
    covers: z.string().min(1).max(280),
  })).min(3).max(10),
  methodology: z.array(z.string().min(1).max(400)).min(1).max(6),
  limitations: z.array(z.string().min(1).max(400)).min(1).max(6),
}).strict();

export type GroundedSynthesisModelOutput = z.infer<typeof groundedSynthesisSchema>;

const groundedPackOutputJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["requirements", "postingRequirements", "roleProfiles", "technicalSources", "learningResources", "methodology", "limitations"],
  properties: {
    requirements: {
      type: "array", minItems: 4, maxItems: 14,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "name", "kind", "aliases", "context"],
        properties: {
          id: stringItem(60), name: stringItem(80),
          kind: { type: "string", enum: marketRequirementKindSchema.options },
          aliases: { type: "array", maxItems: 6, items: stringItem(60) },
          context: stringItem(400),
        },
      },
    },
    postingRequirements: {
      type: "array", minItems: 5, maxItems: 20,
      items: {
        type: "object", additionalProperties: false,
        required: ["postingId", "requirementIds"],
        properties: {
          postingId: stringItem(60),
          requirementIds: { type: "array", minItems: 1, maxItems: 14, items: stringItem(60) },
        },
      },
    },
    roleProfiles: {
      type: "array", minItems: 1, maxItems: 5,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "summary", "emphasis", "postingIds", "requirementIds"],
        properties: {
          id: stringItem(60), title: stringItem(100), summary: stringItem(360), emphasis: stringItem(280),
          postingIds: { type: "array", minItems: 1, maxItems: 20, items: stringItem(60) },
          requirementIds: { type: "array", minItems: 2, maxItems: 14, items: stringItem(60) },
        },
      },
    },
    technicalSources: {
      type: "array", minItems: 1, maxItems: 6,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "publisher", "url", "supports", "usageBasis"],
        properties: {
          id: stringItem(60), title: stringItem(120), publisher: stringItem(80),
          url: { type: "string", minLength: 1, maxLength: 300 },
          supports: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", enum: relationshipTypeSchema.options } },
          usageBasis: stringItem(300),
        },
      },
    },
    learningResources: {
      type: "array", minItems: 3, maxItems: 10,
      items: {
        type: "object", additionalProperties: false,
        required: ["id", "title", "publisher", "url", "kind", "readingMinutes", "covers"],
        properties: {
          id: stringItem(60), title: stringItem(160), publisher: stringItem(80),
          url: { type: "string", minLength: 1, maxLength: 300 },
          kind: { type: "string", enum: [...resourceKindValues] },
          readingMinutes: { type: "integer", minimum: 5, maximum: 240 },
          covers: stringItem(280),
        },
      },
    },
    methodology: { type: "array", minItems: 1, maxItems: 6, items: stringItem(400) },
    limitations: { type: "array", minItems: 1, maxItems: 6, items: stringItem(400) },
  },
} as const;

/**
 * Builds a validated pack whose sources are the real postings from the scan.
 * Posting metadata (employer, role, location, url) comes from the scan and is
 * never re-emitted by the synthesis model, so the model cannot corrupt a real
 * posting's facts. It only supplies the canonical requirements and, per posting
 * id, which of them the posting states. Mention counts are then recomputed from
 * those mappings, exactly as for a curated pack.
 */
export function assembleGroundedPack(scan: JobPostingScan, synthesis: GroundedSynthesisModelOutput, fieldContext: FieldContext): CurrentPracticePack {
  const declaredRequirementIds = new Set(synthesis.requirements.map((requirement) => requirement.id));
  const postingRequirements = new Map(synthesis.postingRequirements.map((mapping) => [mapping.postingId, mapping.requirementIds]));

  const sources: PackSource[] = scan.postings
    .map((posting) => ({
      id: posting.id,
      employer: posting.employer,
      roleTitle: posting.roleTitle,
      location: posting.location || fieldContext.location,
      seniority: posting.seniority,
      url: posting.url,
      observedAt: scan.retrievedAt,
      sourceType: "employer_job_posting" as const,
      usageBasis: `A ${fieldContext.field} job posting located by GPT-5.6 web search on ${scan.retrievedAt}. NotZero did not open the link or confirm the listing is still active, and the requirement labels are the model's normalization of the posting text.`,
      requirementIds: [...new Set((postingRequirements.get(posting.id) ?? []).filter((id) => declaredRequirementIds.has(id)))],
    }))
    .filter((source) => source.requirementIds.length > 0);

  if (sources.length < 5) throw new Error("Grounded pack did not retain at least five postings mapped to a requirement.");

  return finishPack({
    sources,
    modelRequirements: synthesis.requirements,
    modelProfiles: synthesis.roleProfiles.map((profile) => ({ id: profile.id, title: profile.title, summary: profile.summary, emphasis: profile.emphasis, sourceIds: profile.postingIds, requirementIds: profile.requirementIds })),
    technicalSources: synthesis.technicalSources,
    learningResources: synthesis.learningResources,
    methodology: [
      `NotZero has no human-reviewed market pack for ${fieldContext.field}, so GPT-5.6 located job postings by web search on ${scan.retrievedAt} and NotZero derived the requirement counts from them.`,
      "Requirement counts record how many of the located postings state each requirement. Each posting links to where it was found; NotZero did not open the links or confirm the listings are still active.",
      ...synthesis.methodology,
    ],
    limitations: [
      `Generated reference: GPT-5.6 located these postings by web search on ${scan.retrievedAt} and synthesized the requirements, roles, and reading list. No human reviewed them, so treat the result as illustrative.`,
      "Each posting links to where it was found, but NotZero does not verify that a listing is still open or that its stated requirements are accurate. Listings change or close, and the requirement labels are the model's reading of the posting. Verify specifics before relying on them.",
      ...synthesis.limitations,
    ],
    fieldContext,
    grounding: "web_search",
    observedOn: scan.retrievedAt,
  });
}

/**
 * Second stage of the grounded path: hand the located postings to GPT-5.6 (no
 * web search this time) and get back the canonical requirements, per-posting
 * requirement mappings, role profiles, and reading list. It shares the pack
 * stage's bounded retry, and a rejected key or spending limit is rethrown.
 */
export async function synthesizeGroundedPack(args: {
  apiKey: string;
  model: string;
  reasoningEffort?: ReasoningEffort;
  scan: JobPostingScan;
  fetcher?: typeof fetch;
}): Promise<CurrentPracticePack> {
  const fetcher = args.fetcher ?? fetch;
  const fieldContext: FieldContext = { field: args.scan.field, targetTitle: args.scan.targetTitle, location: args.scan.location };
  const postings = args.scan.postings.map((posting) => ({
    id: posting.id, employer: posting.employer, roleTitle: posting.roleTitle, location: posting.location, seniority: posting.seniority, requirementPhrases: posting.requirementPhrases,
  }));
  const body = JSON.stringify({
    model: args.model,
    prompt_cache_key: "notzero-practice-pack-grounded-v1",
    reasoning: { effort: args.reasoningEffort ?? "medium" },
    instructions: [
      "You turn a set of real, already-located job postings into a compact current-practice reference for one professional field, so NotZero can compare a person's prior evidence against how the work is hired for now.",
      "Work only from the postings given by id. Do not add postings and do not invent employers or URLs.",
      "Define canonical requirements by normalizing the requirement phrases across the postings: merge synonyms into one requirement, keep genuinely distinct tools separate, and record notable variants as aliases. Prefer the capabilities that most distinguish current practice from older academic training in this field.",
      "For every posting id given, list which canonical requirement ids that posting states, reusing the posting ids exactly. Reference a requirement id only if it appears verbatim in your requirements array. Never claim a requirement a posting did not state.",
      "Role profiles are clusters of requirements that appear together across postings; cite the posting ids each profile is drawn from.",
      "technicalSources and learningResources must be genuine, well-known, stable references (official documentation, standards, or authoritative references) with correct public URLs. Never invent a URL, standard, or publisher.",
      "Use short kebab-case ids. Keep everything accurate and neutral; this reference is shown labeled as model-generated. Do not give professional, medical, legal, or financial advice.",
    ].join("\n"),
    input: JSON.stringify({ field: fieldContext.field, targetTitle: fieldContext.targetTitle, location: fieldContext.location, postings }),
    text: { format: { type: "json_schema", name: "notzero_grounded_pack", strict: true, schema: groundedPackOutputJsonSchema } },
    max_output_tokens: PRACTICE_PACK_MAX_OUTPUT_TOKENS,
  });

  for (let attempt = 0; attempt < PRACTICE_PACK_ATTEMPTS; attempt += 1) {
    try {
      const raw = await requestResponses({ fetcher, apiKey: args.apiKey, label: "grounded practice-pack synthesis", body });
      const grounded = groundedSynthesisSchema.parse(JSON.parse(readResponseOutputText(raw)));
      return assembleGroundedPack(args.scan, grounded, fieldContext);
    } catch (error) {
      if (isTerminalKeyError(error) || attempt === PRACTICE_PACK_ATTEMPTS - 1) throw error;
    }
  }
  throw new Error("OpenAI grounded practice-pack synthesis failed.");
}

/**
 * The pack stage for a field the curated packs do not cover. It first tries the
 * grounded path: a live web search for real current postings, then a synthesis
 * into a pack whose counts are counts over those real postings. When the search
 * finds too few real postings, or web search is unavailable, or the grounded
 * synthesis fails for any non-key reason, it falls back to the archetype pack so
 * every field still returns a full, honestly labeled result. Only a rejected key
 * or spending limit stops the whole thing, because that is the visitor's to fix.
 */
export async function generateGroundedPracticePack(args: {
  apiKey: string;
  model: string;
  reasoningEffort?: ReasoningEffort;
  fieldContext: FieldContext;
  enableJobSearch?: boolean;
  fetcher?: typeof fetch;
  now?: Date;
}): Promise<CurrentPracticePack> {
  if (args.enableJobSearch !== false) {
    let scan: JobPostingScan | null = null;
    try {
      scan = await scanJobPostingsWithGpt56({ apiKey: args.apiKey, model: args.model, reasoningEffort: args.reasoningEffort, fieldContext: args.fieldContext, fetcher: args.fetcher, now: args.now });
    } catch (error) {
      if (isTerminalKeyError(error)) throw error;
      scan = null;
    }
    if (scan) {
      try {
        return await synthesizeGroundedPack({ apiKey: args.apiKey, model: args.model, reasoningEffort: args.reasoningEffort, scan, fetcher: args.fetcher });
      } catch (error) {
        if (isTerminalKeyError(error)) throw error;
        // A non-key grounded failure falls through to the archetype pack below.
      }
    }
  }
  return generatePracticePackWithGpt56({ apiKey: args.apiKey, model: args.model, reasoningEffort: args.reasoningEffort, fieldContext: args.fieldContext, fetcher: args.fetcher, now: args.now });
}

const downgradeComparisonState = (state: ComparisonState): ComparisonState => (state === "verified" ? "illustrative" : state);

/**
 * Applies the honesty rules for a report built against a generated pack: nothing
 * synthesized may claim the "verified" comparison state, and the report carries
 * explicit provenance limitations. The market counts and role links are already
 * labeled inside the pack.
 */
export function finalizeGeneratedReport(report: KnowledgeBridgeReport, pack: CurrentPracticePack): KnowledgeBridgeReport {
  const webSearched = pack.grounding === "web_search";
  const provenance = webSearched
    ? `The current-practice reference for ${pack.field} was built from job postings GPT-5.6 located by web search on ${pack.observedThrough}. Each posting is linked so you can check it, but no human reviewed them and NotZero did not confirm the listings are still active, so this is an illustrative synthesis rather than a curated dataset.`
    : `The current-practice reference for ${pack.field} was generated by GPT-5.6 for your field, target, and location on ${pack.observedThrough}. It is an illustrative synthesis, not a human-reviewed dataset of real postings.`;
  const countsNote = webSearched
    ? "Market counts describe how many of the located postings state each requirement, not a human-reviewed sample. Open the links and verify specifics before relying on them."
    : "Market counts describe representative role archetypes, not reviewed postings. Verify specifics and links before relying on them.";
  return knowledgeBridgeReportSchema.parse({
    ...report,
    findings: report.findings.map((finding) => ({ ...finding, comparisonState: downgradeComparisonState(finding.comparisonState) })),
    codeBridges: report.codeBridges?.map((bridge) => ({ ...bridge, comparisonState: downgradeComparisonState(bridge.comparisonState) })),
    walkthrough: report.walkthrough ? { ...report.walkthrough, comparisonState: downgradeComparisonState(report.walkthrough.comparisonState) } : undefined,
    upgradeChallenge: { ...report.upgradeChallenge, comparisonState: downgradeComparisonState(report.upgradeChallenge.comparisonState) },
    limitations: [...new Set([provenance, countsNote, ...report.limitations])],
  });
}
