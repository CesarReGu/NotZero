import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeScan,
  scanJobPostingsWithGpt56,
  type JobPostingScan,
  type JobPostingScanModelOutput,
} from "../lib/market/job-postings-adapter";
import {
  assembleGroundedPack,
  finalizeGeneratedReport,
  generateGroundedPracticePack,
  synthesizeGroundedPack,
  type GroundedSynthesisModelOutput,
} from "../lib/market/practice-pack-adapter";
import { validatePracticePack } from "../lib/market/current-practice";
import { compareWithGpt56 } from "../lib/bridge/openai-adapter";
import { alexBridgeReport } from "../lib/bridge/prepared-report";
import { evidenceLedgerSchema } from "../lib/domain/schemas";
import { modelResponse } from "./fixtures/model-scenarios";

const hash = (character: string) => character.repeat(64);
const nursingContext = { field: "Nursing", targetTitle: "Registered nurse", location: "New South Wales, Australia · open to remote" };
const retrievedAt = "2026-07-20";
const at = new Date("2026-07-20T00:00:00Z");

// Six distinct, well-formed postings for a field the curated packs do not cover.
function nursingScanModel(): JobPostingScanModelOutput {
  return {
    queries: ["registered nurse jobs New South Wales", "graduate registered nurse NSW"],
    postings: [
      { employer: "Royal Prince Alfred Hospital", roleTitle: "Registered Nurse", location: "Sydney, NSW", seniority: "entry", url: "https://example.org/jobs/rpa-rn", requirementPhrases: ["patient assessment", "medication administration", "electronic medical records"] },
      { employer: "St Vincent's Health", roleTitle: "Graduate Registered Nurse", location: "Sydney, NSW", seniority: "entry", url: "https://example.org/jobs/svh-grn", requirementPhrases: ["medication administration", "electronic medical records", "clinical documentation"] },
      { employer: "Ramsay Health Care", roleTitle: "Registered Nurse Surgical", location: "Newcastle, NSW", seniority: "early_career", url: "https://example.org/jobs/ramsay-surg", requirementPhrases: ["electronic medical records", "clinical documentation", "infection control"] },
      { employer: "NSW Health", roleTitle: "Registered Nurse", location: "Wollongong, NSW", seniority: "mixed", url: "https://example.org/jobs/nswhealth-rn", requirementPhrases: ["clinical documentation", "infection control", "care planning"] },
      { employer: "Healthscope", roleTitle: "Registered Nurse Aged Care", location: "Sydney, NSW", seniority: "early_career", url: "https://example.org/jobs/healthscope-ac", requirementPhrases: ["infection control", "care planning", "patient assessment"] },
      { employer: "Calvary Health", roleTitle: "Registered Nurse", location: "Remote / NSW", seniority: "mixed", url: "https://example.org/jobs/calvary-rn", requirementPhrases: ["care planning", "patient assessment", "medication administration"] },
    ],
    notes: ["Sampled from public listings."],
  };
}

const REQUIREMENTS: GroundedSynthesisModelOutput["requirements"] = [
  { id: "patient-assessment", name: "Patient assessment", kind: "practice", aliases: [], context: "Structured assessment of a patient's condition on presentation and over time." },
  { id: "medication-administration", name: "Medication administration", kind: "practice", aliases: [], context: "Safe preparation and administration of medication within scope." },
  { id: "electronic-medical-records", name: "Electronic medical records", kind: "tool", aliases: ["EMR"], context: "Recording and retrieving patient information in a clinical record system." },
  { id: "clinical-documentation", name: "Clinical documentation", kind: "practice", aliases: [], context: "Documenting care, observations, and handover in the record." },
  { id: "infection-control", name: "Infection control", kind: "practice", aliases: [], context: "Standard precautions and hand hygiene in clinical settings." },
  { id: "care-planning", name: "Care planning", kind: "practice", aliases: [], context: "Developing and reviewing a plan of care with the team." },
];

// Maps each posting id to three consecutive requirements (with wraparound), so
// every requirement is observed in at least one posting and every posting keeps
// at least one requirement.
function nursingSynthesis(postingIds: string[]): GroundedSynthesisModelOutput {
  const ids = REQUIREMENTS.map((requirement) => requirement.id);
  return {
    requirements: REQUIREMENTS,
    postingRequirements: postingIds.map((postingId, index) => ({
      postingId,
      requirementIds: [ids[index % ids.length], ids[(index + 1) % ids.length], ids[(index + 2) % ids.length]],
    })),
    roleProfiles: [
      { id: "profile-ward-rn", title: "Ward registered nurse", summary: "Delivers direct patient care on a ward.", emphasis: "Assessment, medication, and documentation on shift.", postingIds: postingIds.slice(0, 3), requirementIds: ["patient-assessment", "medication-administration", "electronic-medical-records"] },
    ],
    technicalSources: [
      { id: "src-nmba", title: "Registered nurse standards for practice", publisher: "NMBA", url: "https://www.nursingmidwiferyboard.gov.au/", supports: ["standardizes"], usageBasis: "The national standards a registered nurse practises against." },
    ],
    learningResources: [
      { id: "read-nmba", title: "RN standards for practice", publisher: "NMBA", url: "https://www.nursingmidwiferyboard.gov.au/standards", kind: "reference", readingMinutes: 30, covers: "The scope and standards for registered nursing practice." },
      { id: "read-hand-hygiene", title: "Hand hygiene", publisher: "WHO", url: "https://www.who.int/teams/integrated-health-services/infection-prevention-control", kind: "official_documentation", readingMinutes: 20, covers: "Standard precautions and the moments for hand hygiene." },
      { id: "read-emr", title: "My Health Record for providers", publisher: "ADHA", url: "https://www.myhealthrecord.gov.au/for-healthcare-professionals", kind: "reference", readingMinutes: 15, covers: "Recording and retrieving patient information in a shared record." },
    ],
    methodology: ["Requirements normalized from the phrases in the located postings."],
    limitations: ["A small illustrative synthesis, not a workforce survey."],
  };
}

function scanFrom(model: JobPostingScanModelOutput): JobPostingScan {
  return normalizeScan(model, nursingContext, retrievedAt);
}

test("the scan normalizes to well-formed, deduplicated postings with stable ids", () => {
  const model = nursingScanModel();
  // A duplicate URL, a duplicate employer+role, and a non-http entry that must all drop.
  model.postings.push({ employer: "Royal Prince Alfred Hospital", roleTitle: "Registered Nurse", location: "Sydney, NSW", seniority: "entry", url: "https://example.org/jobs/rpa-rn?utm=x", requirementPhrases: ["patient assessment"] });
  model.postings.push({ employer: "Ghost Clinic", roleTitle: "Nurse", location: "Nowhere", seniority: "entry", url: "not-a-real-url", requirementPhrases: ["x"] });

  const scan = scanFrom(model);
  assert.equal(scan.postings.length, 6, "the duplicate URL and the malformed URL are dropped");
  assert.equal(new Set(scan.postings.map((posting) => posting.id)).size, 6, "ids are unique");
  for (const posting of scan.postings) assert.match(posting.url, /^https:\/\//);
  assert.equal(scan.retrievedAt, retrievedAt);
});

test("a grounded pack is assembled from real postings with real links and counts over those postings", () => {
  const scan = scanFrom(nursingScanModel());
  const pack = assembleGroundedPack(scan, nursingSynthesis(scan.postings.map((posting) => posting.id)), nursingContext);

  assert.equal(pack.generated, true);
  assert.equal(pack.grounding, "web_search");
  assert.equal(pack.field, "Nursing");
  assert.equal(pack.sources.length, 6);
  // Every source is the real posting, not a job-board search, and dated to retrieval.
  for (const [index, source] of pack.sources.entries()) {
    assert.equal(source.url, scan.postings[index].url);
    assert.equal(source.observedAt, retrievedAt);
    assert.match(source.url, /^https:\/\/example\.org\/jobs\//);
    assert.match(source.usageBasis, /web search/i);
  }
  // Counts are counts over the real postings, and reciprocity holds.
  for (const requirement of pack.requirements) {
    assert.equal(requirement.mentionCount, requirement.sourceIds.length);
    assert.equal(requirement.mentionCount, 3);
    for (const sourceId of requirement.sourceIds) {
      assert.ok(pack.sources.find((source) => source.id === sourceId)?.requirementIds.includes(requirement.id));
    }
  }
  assert.match(pack.datasetVersion, /^generated-nursing-2026-07-20-/);
  assert.doesNotThrow(() => validatePracticePack(pack));
});

test("synthesizeGroundedPack turns a scan into a validated web-searched pack", async () => {
  const scan = scanFrom(nursingScanModel());
  const fetcher: typeof fetch = async (_url, init) => {
    const body = JSON.parse(String((init as RequestInit).body ?? "{}"));
    const input = JSON.parse(body.input);
    return modelResponse(nursingSynthesis(input.postings.map((posting: { id: string }) => posting.id)));
  };
  const pack = await synthesizeGroundedPack({ apiKey: "test-key", model: "gpt-5.6-luna", scan, fetcher });

  assert.equal(pack.grounding, "web_search");
  assert.equal(pack.sources.length, 6);
  assert.ok(pack.methodology.some((line) => /web search/i.test(line)));
});

test("generateGroundedPracticePack prefers the web-searched pack when postings are found", async () => {
  let scanCalls = 0;
  let synthCalls = 0;
  const fetcher: typeof fetch = async (_url, init) => {
    const body = String((init as RequestInit).body ?? "{}");
    if (body.includes("notzero-job-postings-scan-v1")) {
      scanCalls += 1;
      assert.ok(body.includes("web_search"), "the scan enables the web-search tool");
      return modelResponse(nursingScanModel());
    }
    synthCalls += 1;
    const input = JSON.parse(JSON.parse(body).input);
    return modelResponse(nursingSynthesis(input.postings.map((posting: { id: string }) => posting.id)));
  };
  const pack = await generateGroundedPracticePack({ apiKey: "test-key", model: "gpt-5.6-luna", fieldContext: nursingContext, fetcher, now: at });

  assert.equal(scanCalls, 1);
  assert.equal(synthCalls, 1);
  assert.equal(pack.grounding, "web_search");
  assert.equal(pack.field, "Nursing");
});

// A field where the search surfaces too few real postings must not fail: it
// falls back to the archetype pack so the field still returns a full result.
const archetypePackModel = {
  roleArchetypes: [1, 2, 3, 4, 5].map((n) => ({ id: `role-${n}`, title: `Nurse role ${n}`, sector: `Sector ${n} (representative)`, seniority: "mixed" as const, requirementIds: ["assessment", "documentation", "medication", "infection-control"] })),
  requirements: [
    { id: "assessment", name: "Patient assessment", kind: "practice" as const, aliases: [], context: "Structured assessment of a patient." },
    { id: "documentation", name: "Clinical documentation", kind: "practice" as const, aliases: [], context: "Documenting care and observations." },
    { id: "medication", name: "Medication administration", kind: "practice" as const, aliases: [], context: "Safe administration of medication within scope." },
    { id: "infection-control", name: "Infection control", kind: "practice" as const, aliases: [], context: "Standard precautions and hand hygiene." },
  ],
  roleProfiles: [{ id: "profile-rn", title: "Registered nurse", summary: "Delivers ward care.", emphasis: "Assessment and documentation.", archetypeIds: ["role-1", "role-2"], requirementIds: ["assessment", "documentation"] }],
  technicalSources: [{ id: "src-nmba", title: "RN standards", publisher: "NMBA", url: "https://www.nursingmidwiferyboard.gov.au/", supports: ["standardizes" as const], usageBasis: "National RN standards." }],
  learningResources: [
    { id: "read-a", title: "RN standards", publisher: "NMBA", url: "https://www.nursingmidwiferyboard.gov.au/standards", kind: "reference" as const, readingMinutes: 30, covers: "Scope and standards." },
    { id: "read-b", title: "Hand hygiene", publisher: "WHO", url: "https://www.who.int/teams/integrated-health-services/infection-prevention-control", kind: "official_documentation" as const, readingMinutes: 20, covers: "Standard precautions." },
    { id: "read-c", title: "Shared records", publisher: "ADHA", url: "https://www.myhealthrecord.gov.au/for-healthcare-professionals", kind: "reference" as const, readingMinutes: 15, covers: "Shared record use." },
  ],
  methodology: ["Synthesized role expectations."],
  limitations: ["Illustrative sketch."],
};

test("generateGroundedPracticePack falls back to archetypes when too few postings are found", async () => {
  const thin: JobPostingScanModelOutput = { ...nursingScanModel(), postings: nursingScanModel().postings.slice(0, 2) };
  const fetcher: typeof fetch = async (_url, init) => {
    const body = String((init as RequestInit).body ?? "{}");
    if (body.includes("notzero-job-postings-scan-v1")) return modelResponse(thin);
    if (body.includes("notzero-practice-pack-grounded-v1")) throw new Error("grounded synthesis must not run when the scan is unusable");
    return modelResponse(archetypePackModel);
  };
  const pack = await generateGroundedPracticePack({ apiKey: "test-key", model: "gpt-5.6-luna", fieldContext: nursingContext, fetcher, now: at });

  assert.equal(pack.grounding, "model_archetypes");
  assert.equal(pack.generated, true);
  assert.match(pack.sources[0].url, /linkedin\.com\/jobs\/search/);
});

test("disabling job search skips the scan and generates an archetype pack directly", async () => {
  const fetcher: typeof fetch = async (_url, init) => {
    const body = String((init as RequestInit).body ?? "{}");
    if (body.includes("notzero-job-postings-scan-v1")) throw new Error("the scan must not run when job search is disabled");
    return modelResponse(archetypePackModel);
  };
  const pack = await generateGroundedPracticePack({ apiKey: "test-key", model: "gpt-5.6-luna", fieldContext: nursingContext, enableJobSearch: false, fetcher, now: at });
  assert.equal(pack.grounding, "model_archetypes");
});

test("a rejected key during the scan is terminal and reaches the caller", async () => {
  for (const status of [401, 403, 429]) {
    const fetcher: typeof fetch = async () => new Response("no", { status });
    await assert.rejects(
      () => generateGroundedPracticePack({ apiKey: "bad", model: "gpt-5.6-luna", fieldContext: nursingContext, fetcher, now: at }),
      new RegExp(`status ${status}`),
    );
  }
});

test("the scan returns null (not an error) after a persistent non-key failure", async () => {
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls += 1; return new Response("busy", { status: 503 }); };
  const scan = await scanJobPostingsWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", fieldContext: nursingContext, fetcher, now: at });
  assert.equal(scan, null);
  assert.equal(calls, 2, "it retries once before giving up so the caller can fall back");
});

test("a report against a web-searched pack is capped illustrative and labeled as located by web search", () => {
  const scan = scanFrom(nursingScanModel());
  const pack = assembleGroundedPack(scan, nursingSynthesis(scan.postings.map((posting) => posting.id)), nursingContext);
  const withVerified = {
    ...alexBridgeReport,
    findings: alexBridgeReport.findings.map((finding, index) => (index === 0 ? { ...finding, comparisonState: "verified" as const } : finding)),
    upgradeChallenge: { ...alexBridgeReport.upgradeChallenge, comparisonState: "verified" as const },
  };
  const finalized = finalizeGeneratedReport(withVerified, pack);

  assert.ok(finalized.findings.every((finding) => finding.comparisonState !== "verified"));
  assert.ok(finalized.limitations.some((limit) => /located by web search/i.test(limit)));
  assert.ok(!finalized.limitations.some((limit) => /representative role archetypes/i.test(limit)));
});

// The market summary a finding cites must read as real postings, not roles.
const nursingLedger = evidenceLedgerSchema.parse({
  id: "ledger-nursing-1",
  schemaVersion: "evidence-ledger.v1",
  promptVersion: "evidence-extraction.v1",
  analysisMode: "live_gpt_5_6",
  fieldContext: { field: "Nursing", targetTitle: "Registered nurse", location: "New South Wales, Australia" },
  sources: [{ id: "clinical-notes", name: "clinical-notes.md", sourceType: "professional_task", mimeType: "text/markdown", sizeBytes: 120, contentHash: hash("1"), normalizedHash: hash("a"), characterCount: 119 }],
  claims: [{ id: "claim-assessment", title: "Structured patient assessment", statement: "The task records a structured patient assessment and handover notes.", evidenceClass: "demonstrated", references: [{ sourceId: "clinical-notes", excerpt: "structured patient assessment", locator: { path: "clinical-notes.md", kind: "section", value: "Assessment", startLine: 1, endLine: 1 } }], confidence: "high", limitations: ["A single documented task."] }],
  warnings: [],
  limitations: ["Bounded claims only."],
});

function nursingBridgeOutput(postingSourceId: string) {
  return {
    findings: [{
      id: "finding-assessment",
      title: "Assessment notes map to structured EMR practice",
      group: "small_bridge",
      existingCapability: "The task shows structured patient assessment documentation.",
      evidenceClaimIds: ["claim-assessment"],
      currentRequirementId: "patient-assessment",
      relationshipType: "standardizes",
      relationshipSourceIds: [postingSourceId, "src-nmba"],
      artifactClaimId: null,
      observedImplementation: "Assessment recorded as free-text notes.",
      modernCounterpart: "Current roles record assessment in a structured record.",
      comparisonState: "illustrative",
      manualStepsChanged: ["Paper notes"],
      transferableConcepts: ["assessment"],
      newConcepts: ["EMR workflows"],
      whyItIsUsed: "Structured records support continuity of care.",
      explanation: "The existing assessment documentation transfers to the record requirement.",
      recommendedAction: "Practise charting an assessment in a structured record sandbox.",
      confidence: "high",
      limitations: ["The record workflow was not performed."],
    }],
    nextSteps: [1, 2, 3].map((rank) => ({ rank, title: `Charting proof ${rank}`, buildsOn: ["claim-assessment"], reuses: "Assessment documentation.", newConcept: "Structured records.", whyItIsUsed: "Records support handover.", whyNow: "It reuses the documented assessment.", proof: `Complete charting proof ${rank}.` })),
    upgradeChallenge: { id: "challenge-emr", title: "Chart an assessment in a structured record", basedOnClaimIds: ["claim-assessment"], objective: "Record one assessment in a structured record sandbox.", acceptanceCriteria: ["Fields are structured", "The note is complete"], comparisonState: "illustrative" },
    walkthrough: null,
    walkthroughUnavailableReason: "The submitted task is summarized without a stable locator.",
    limitations: ["Illustrative comparison against located postings."],
  };
}

test("a finding against a web-searched pack cites current postings, not representative roles", async () => {
  const scan = scanFrom(nursingScanModel());
  const pack = assembleGroundedPack(scan, nursingSynthesis(scan.postings.map((posting) => posting.id)), nursingContext);
  const assessment = pack.requirements.find((requirement) => requirement.id === "patient-assessment");
  assert.ok(assessment);
  const postingSourceId = assessment!.sourceIds[0];

  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", ledger: nursingLedger, pack, analysisVersion: "phase-7", fetcher: async () => modelResponse(nursingBridgeOutput(postingSourceId)) });
  const marketSummary = report.findings[0].relationshipEvidence.find((source) => source.sourceKind === "market_dataset");
  assert.ok(marketSummary);
  assert.match(marketSummary!.summary, /current postings/i);
  assert.ok(!/representative roles/i.test(marketSummary!.summary));
});
