import assert from "node:assert/strict";
import test from "node:test";
import { compareWithGpt56 } from "../lib/bridge/openai-adapter";
import { buildDecisionHeadline } from "../components/knowledge-bridge-report";
import { extractWithGpt56 } from "../lib/evidence/openai-adapter";
import { softwareBackendPracticePack } from "../lib/market/current-practice";
import { customSoftwareSources, modelResponse, successfulBridgeOutput, successfulEvidenceOutput, weakBridgeOutput, weakEvidenceOutput, weakSummarySource } from "./fixtures/model-scenarios";

const context = { field: "Software development", targetTitle: "Junior backend engineer", location: "Mexico" };

test("a fictional custom upload completes both mocked GPT-5.6 stages", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(successfulBridgeOutput()) });

  assert.equal(ledger.claims.length, 2);
  assert.equal(report.findings[0].artifactReference?.locator.path, "inventory-api/config.ts");
  assert.equal(report.walkthrough?.comparisonState, "illustrative");
  assert.equal(report.nextSteps.length, 3);
});
test("weak evidence stays low-confidence and becomes insufficient evidence", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: [weakSummarySource], inputWarnings: [], fetcher: async () => modelResponse(weakEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(weakBridgeOutput()) });

  assert.equal(ledger.claims[0].confidence, "low");
  assert.equal(report.findings[0].group, "insufficient_evidence");
  assert.match(report.findings[0].recommendedAction, /provide/i);
  assert.match(buildDecisionHeadline(report, softwareBackendPracticePack), /does not yet support a reliable bridge/i);
});

test("summary-only evidence produces no invented code location or walkthrough", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: [weakSummarySource], inputWarnings: [], fetcher: async () => modelResponse(weakEvidenceOutput) });
  const report = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(weakBridgeOutput()) });

  assert.equal(report.walkthrough, undefined);
  assert.match(report.walkthroughUnavailableReason ?? "", /stable implementation locator/i);
  assert.equal(report.findings[0].artifactReference, undefined);
});

test("invented citations are rejected in extraction and comparison", async () => {
  const inventedEvidence = structuredClone(successfulEvidenceOutput);
  inventedEvidence.claims[1].references[0].excerpt = "A Dockerfile already exists";
  await assert.rejects(() => extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(inventedEvidence) }), /does not resolve/);

  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const inventedMarket = successfulBridgeOutput();
  inventedMarket.findings[0].relationshipSourceIds = ["invented-job-posting"];
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(inventedMarket) }), /was not found/);
});

test("a finding without dated market coverage is rejected", async () => {
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  const missingMarket = successfulBridgeOutput();
  missingMarket.findings[0].relationshipSourceIds = ["docs-docker-overview"];
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse(missingMarket) }), /requires dated market evidence/);
});

test("schema failures stop before an unsafe result is returned", async () => {
  await assert.rejects(() => extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse({ claims: "invalid", warnings: [], limitations: [] }) }));

  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: async () => modelResponse({ findings: [] }) }));
});

test("model transport failures remain failures in both stages", async () => {
  const unavailable = async () => new Response("unavailable", { status: 503 });
  await assert.rejects(() => extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: unavailable }), /status 503/);

  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", fieldContext: context, sources: customSoftwareSources, inputWarnings: [], fetcher: async () => modelResponse(successfulEvidenceOutput) });
  await assert.rejects(() => compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6", ledger, pack: softwareBackendPracticePack, analysisVersion: "phase-6", fetcher: unavailable }), /status 503/);
});
