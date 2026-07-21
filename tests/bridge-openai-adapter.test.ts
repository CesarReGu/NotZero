import assert from "node:assert/strict";
import test from "node:test";
import { BRIDGE_MAX_OUTPUT_TOKENS, compareWithGpt56, validateBridgeModelOutput } from "../lib/bridge/openai-adapter";
import { alexEvidenceLedger } from "../lib/fixtures/alex-ledger";
import { selectCurrentPracticePack, softwareBackendPracticePack } from "../lib/market/current-practice";

function modelOutput() {
  return {
    findings: [{
      id: "finding-container",
      title: "Runtime setup is a foundation for containerization",
      group: "small_bridge",
      existingCapability: "The project externalizes runtime configuration and documents a repeatable setup.",
      evidenceClaimIds: ["claim-runtime-config", "claim-manual-deployment"],
      currentRequirementId: "containerization",
      relationshipType: "standardizes",
      relationshipSourceIds: ["job-lingaro-backend-mx", "docs-docker-overview"],
      artifactClaimId: "claim-runtime-config",
      observedImplementation: "Runtime values remain outside application logic and setup steps are documented.",
      modernCounterpart: "A container image can standardize runtime and dependency setup while values remain external.",
      comparisonState: "illustrative",
      manualStepsChanged: ["Install the runtime separately"],
      transferableConcepts: ["external configuration", "ports"],
      newConcepts: ["image layers", "container lifecycle"],
      whyItIsUsed: "Teams use containers to reproduce the runtime across development and deployment environments.",
      explanation: "This reuses an existing configuration foundation and adds a bounded packaging model.",
      recommendedAction: "Add and run an illustrative Dockerfile for the existing project.",
      confidence: "high",
      limitations: ["The suggested container configuration has not been executed."],
    }],
    nextSteps: [1, 2, 3].map((rank) => ({
      rank,
      title: `Container proof step ${rank}`,
      buildsOn: ["claim-runtime-config"],
      reuses: "External runtime configuration.",
      newConcept: "Container image construction and lifecycle.",
      whyItIsUsed: "Teams use containers to standardize runtime setup.",
      whyNow: "It reuses the project's external runtime configuration.",
      proof: `Complete bounded proof ${rank}.`,
    })),
    upgradeChallenge: {
      id: "challenge-container",
      title: "Package the existing API",
      basedOnClaimIds: ["claim-runtime-config"],
      objective: "Run the existing project from a documented container boundary.",
      acceptanceCriteria: ["The runtime starts", "Configuration remains external"],
      comparisonState: "illustrative",
    },
    walkthrough: {
      title: "From PORT to a container boundary",
      claimId: "claim-runtime-config",
      observedImplementation: "The project reads PORT from its environment.",
      modernCounterpart: "The container declares its runtime boundary while PORT remains configurable.",
      relationshipType: "standardizes",
      comparisonState: "illustrative",
      illustrativeSketch: "ENV PORT=3000",
      whatTransfers: ["External configuration"],
      whatIsNew: ["Image construction"],
      limitations: ["The sketch has not been executed."],
    },
    walkthroughUnavailableReason: null,
    limitations: ["This result uses a small dated market pack."],
  };
}

function responseFor(output: unknown) {
  return new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }] }), { status: 200 });
}

test("a matching software context selects the reviewed practice pack conservatively", () => {
  assert.equal(selectCurrentPracticePack({ field: "Software engineering", targetTitle: "Junior backend engineer", location: "Mexico" })?.id, softwareBackendPracticePack.id);
  assert.equal(selectCurrentPracticePack({ field: "Law", targetTitle: "Technology lawyer", location: "Mexico" }), null);
  assert.equal(selectCurrentPracticePack({ field: "Software development", targetTitle: "Mobile designer", location: "Mexico" }), null);
  assert.equal(selectCurrentPracticePack({ field: "Software development", targetTitle: "Backend engineer", location: "Germany" }), null);
});

test("the second GPT-5.6 stage hydrates only validated claims and dated pack sources", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const report = await compareWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    ledger: alexEvidenceLedger,
    pack: softwareBackendPracticePack,
    analysisVersion: "phase-6",
    fetcher: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body));
      return responseFor(modelOutput());
    },
  });
  assert.equal(requestBody?.prompt_cache_key, "notzero-bridge-comparison-v2");
  assert.equal(requestBody?.max_output_tokens, BRIDGE_MAX_OUTPUT_TOKENS);
  assert.equal(report.analysisMode, "live_gpt_5_6");
  assert.equal(report.schemaVersion, "knowledge-bridge-report.v2");
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].relationshipEvidence[0].summary, "7 of 8 reviewed postings mentioned containerization.");
  assert.equal(report.findings[0].artifactReference?.locator.path, "alex-api/src/config.ts");
  assert.equal(report.walkthrough?.artifactReference.locator.path, "alex-api/src/config.ts");
  assert.deepEqual(report.counts, { current: 0, transferable: 0, smallBridge: 1, genuineGap: 0, insufficientEvidence: 0 });
});

test("comparison repairs technical-only findings and unsupported relationship sources", async () => {
  const output = modelOutput();
  Object.assign(output.findings[0], {
    relationshipType: "foundation_for",
    relationshipSourceIds: ["docs-docker-overview"],
  });
  const report = await compareWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    ledger: alexEvidenceLedger,
    pack: softwareBackendPracticePack,
    analysisVersion: "phase-6",
    fetcher: async () => responseFor(output),
  });
  assert.equal(report.findings.length, 1);
  assert.equal(report.findings[0].relationshipType, undefined);
  assert.equal(report.findings[0].relationshipEvidence[0].sourceKind, "market_dataset");
  assert.match(report.findings[0].limitations.at(-1) ?? "", /technical source was retained|source did not support/);
  assert.match(report.limitations.at(-1) ?? "", /dated market source/);
});

test("bridge validation rejects invented claims, mismatched sources, and misstated market counts", () => {
  const unknownClaim = modelOutput();
  Object.assign(unknownClaim.findings[0], { evidenceClaimIds: ["claim-invented"] });
  assert.throws(() => validateBridgeModelOutput({ output: unknownClaim, ledger: alexEvidenceLedger, pack: softwareBackendPracticePack, analysisVersion: "phase-6" }), /unknown evidence claim/);

  const wrongSource = modelOutput();
  Object.assign(wrongSource.findings[0], { relationshipType: "successor_to", relationshipSourceIds: ["job-lingaro-backend-mx", "docs-opentelemetry-overview"] });
  assert.throws(() => validateBridgeModelOutput({ output: wrongSource, ledger: alexEvidenceLedger, pack: softwareBackendPracticePack, analysisVersion: "phase-6" }), /does not support the proposed relationship/);

  const wrongCount = modelOutput();
  Object.assign(wrongCount.findings[0], { explanation: "Only 2 of 8 reviewed postings mentioned this requirement." });
  assert.throws(() => validateBridgeModelOutput({ output: wrongCount, ledger: alexEvidenceLedger, pack: softwareBackendPracticePack, analysisVersion: "phase-6" }), /misstated a market count/);
});

test("a live report may honestly omit the walkthrough when project evidence cannot support one", () => {
  const output = modelOutput();
  Object.assign(output.findings[0], { artifactClaimId: null });
  Object.assign(output, { walkthrough: null, walkthroughUnavailableReason: "The submitted summary does not include a stable project locator." });
  const report = validateBridgeModelOutput({ output, ledger: alexEvidenceLedger, pack: softwareBackendPracticePack, analysisVersion: "phase-6" });
  assert.equal(report.walkthrough, undefined);
  assert.match(report.walkthroughUnavailableReason ?? "", /stable project locator/);
});
