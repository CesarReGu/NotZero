import assert from "node:assert/strict";
import test from "node:test";
import { compareWithGpt56 } from "../lib/bridge/openai-adapter";
import { enrichWithSolutionLayer, solveWithGpt56 } from "../lib/bridge/solution-adapter";
import { buildDecisionHeadline } from "../components/knowledge-bridge-report";
import { extractWithGpt56 } from "../lib/evidence/openai-adapter";
import { softwareBackendPracticePack } from "../lib/market/current-practice";
import { customSoftwareSources, modelResponse, successfulBridgeOutput, successfulEvidenceOutput, successfulSolutionOutput, weakBridgeOutput, weakEvidenceOutput, weakSummarySource } from "./fixtures/model-scenarios";

const context = { field: "Software development", targetTitle: "Junior backend engineer", location: "Mexico" };

async function completedTwoStages() {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-7", fetcher: async () => modelResponse(successfulBridgeOutput()) });
  return { ledger, report };
}

test("a fictional custom upload completes both mocked GPT-5.6 stages", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(successfulBridgeOutput()) });

  assert.equal(ledger.claims.length, 2);
  assert.equal(report.findings[0].artifactReference?.locator.path, "inventory-api/config.ts");
  assert.equal(report.walkthrough?.comparisonState, "illustrative");
  assert.equal(report.nextSteps.length, 3);
});
test("weak evidence stays low-confidence and becomes insufficient evidence", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: [weakSummarySource], inputWarnings: [], fetcher: async () => modelResponse(weakEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(weakBridgeOutput()) });

  assert.equal(ledger.claims[0].confidence, "low");
  assert.equal(report.findings[0].group, "insufficient_evidence");
  assert.match(report.findings[0].recommendedAction, /provide/i);
  assert.match(buildDecisionHeadline(report, softwareBackendPracticePack), /does not yet support a reliable bridge/i);
});

test("summary-only evidence produces no invented code location or walkthrough", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: [weakSummarySource], inputWarnings: [], fetcher: async () => modelResponse(weakEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(weakBridgeOutput()) });

  assert.equal(report.walkthrough, undefined);
  assert.match(report.walkthroughUnavailableReason ?? "", /stable implementation locator/i);
  assert.equal(report.findings[0].artifactReference, undefined);
});

test("invented extraction citations are omitted while unsafe comparison citations remain rejected", async () => {
  const inventedEvidence = structuredClone(successfulEvidenceOutput);
  inventedEvidence.claims[1].references[0].excerpt = "A Dockerfile already exists";
  const sanitizedLedger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(inventedEvidence) });
  assert.equal(sanitizedLedger.claims.length, 1);
  assert.match(sanitizedLedger.warnings.at(-1) ?? "", /could not be verified/);

  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const inventedMarket = successfulBridgeOutput();
  inventedMarket.findings[0].relationshipSourceIds = ["invented-job-posting"];
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(inventedMarket) }), /was not found/);
});

test("a finding without dated market coverage is rejected", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const missingMarket = successfulBridgeOutput();
  missingMarket.findings[0].relationshipSourceIds = ["docs-docker-overview"];
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(missingMarket) }), /requires dated market evidence/);
});

test("schema failures stop before an unsafe result is returned", async () => {
  await assert.rejects(() => extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse({ claims: "invalid", warnings: [], limitations: [] }) }));

  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse({ findings: [] }) }));
});

test("the third stage completes the report with vocabulary, code bridges, and a curriculum roadmap", async () => {
  const { ledger, report: base } = await completedTwoStages();
  const { report, enriched } = await enrichWithSolutionLayer({ apiKey: "test-key", model: "gpt-5.6-luna", ledger, report: base, pack: softwareBackendPracticePack, fetcher: async () => modelResponse(successfulSolutionOutput()) });

  assert.equal(enriched, true);
  assert.equal(report.vocabularyBridges?.length, 3);
  assert.equal(report.codeBridges?.length, 1);
  // The observed panel is quoted from the validated ledger reference, so the
  // code, path, lines, and date are server data rather than model text.
  assert.equal(report.codeBridges?.[0].observed.code, "process.env.PORT ?? 4000");
  assert.equal(report.codeBridges?.[0].observed.path, "inventory-api/config.ts");
  assert.equal(report.codeBridges?.[0].observed.date, "2023-04-10");
  assert.deepEqual(report.roadmap?.phases.map((phase) => phase.order), [1, 2]);
  assert.equal(report.roleProfiles?.length, softwareBackendPracticePack.roleProfiles.length);
  assert.equal(report.walkthroughUnavailableReason, undefined);
  const topics = report.roadmap?.phases[0].modules?.[0].topics ?? [];
  assert.ok(topics.some((topic) => topic.stance === "settled" && topic.hours === 0 && topic.claimIds.length > 0));
});

test("the third stage rejects invented claims, paths, resources, and non-project quotes", async () => {
  const { ledger, report } = await completedTwoStages();
  const solve = (output: unknown) => solveWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", ledger, report, pack: softwareBackendPracticePack, fetcher: async () => modelResponse(output) });

  const inventedClaim = successfulSolutionOutput();
  inventedClaim.vocabularyBridges[0].claimId = "invented-claim";
  await assert.rejects(() => solve(inventedClaim), /unknown evidence claim/);

  const wrongPath = successfulSolutionOutput();
  wrongPath.vocabularyBridges[0].referencePath = "inventory-api/other.ts";
  await assert.rejects(() => solve(wrongPath), /does not reference/);

  const inventedResource = successfulSolutionOutput();
  inventedResource.roadmap.phases[0].modules[0].topics[1].resourceIds = ["invented-resource"];
  await assert.rejects(() => solve(inventedResource), /unknown learning resource/);

  const curriculumQuote = successfulSolutionOutput();
  curriculumQuote.codeBridges[0].claimId = "claim-custom-foundations";
  curriculumQuote.codeBridges[0].referencePath = "study-plan.md";
  await assert.rejects(() => solve(curriculumQuote), /must quote a project file/);
});

test("a failed third stage degrades to the validated market comparison with an explicit limitation", async () => {
  const { ledger, report: base } = await completedTwoStages();
  const unavailable = async () => new Response("unavailable", { status: 503 });
  const { report, enriched } = await enrichWithSolutionLayer({ apiKey: "test-key", model: "gpt-5.6-luna", ledger, report: base, pack: softwareBackendPracticePack, fetcher: unavailable });

  assert.equal(enriched, false);
  assert.deepEqual(report.findings, base.findings);
  assert.equal(report.roadmap, undefined);
  assert.equal(report.roleProfiles?.length, softwareBackendPracticePack.roleProfiles.length);
  assert.ok(report.limitations.some((item) => /guided program/i.test(item)));
});

test("a curriculum that claims settled topics with remaining hours is rejected and degrades", async () => {
  const { ledger, report: base } = await completedTwoStages();
  const dishonest = successfulSolutionOutput();
  dishonest.roadmap.phases[0].modules[0].topics[0].hours = 2;
  const { report, enriched } = await enrichWithSolutionLayer({ apiKey: "test-key", model: "gpt-5.6-luna", ledger, report: base, pack: softwareBackendPracticePack, fetcher: async () => modelResponse(dishonest) });

  assert.equal(enriched, false);
  assert.equal(report.roadmap, undefined);
  assert.ok(report.limitations.some((item) => /guided program/i.test(item)));
});

test("model transport failures remain failures in both stages", async () => {
  const unavailable = async () => new Response("unavailable", { status: 503 });
  await assert.rejects(() => extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: unavailable }), /status 503/);

  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: context.location }, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: unavailable }), /status 503/);
});
