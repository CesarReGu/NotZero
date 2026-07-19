import assert from "node:assert/strict";
import test from "node:test";
import { alexBridgeReport, buildPreparedBridgeReport } from "../lib/bridge/prepared-report";
import { alexEvidenceLedger } from "../lib/fixtures/alex-ledger";
import { softwareBackendPracticePack } from "../lib/market/current-practice";
import { buildCitationLedger } from "../components/knowledge-bridge-report";

test("the current-practice pack has reciprocal sources and exact mention counts", () => {
  const pack = softwareBackendPracticePack;
  assert.equal(pack.sources.length, 8);
  assert.equal(pack.datasetVersion, "software-backend-devops-mx.v1.2026-07-18");

  for (const requirement of pack.requirements) {
    assert.equal(requirement.mentionCount, requirement.sourceIds.length);
    for (const sourceId of requirement.sourceIds) {
      const source = pack.sources.find((item) => item.id === sourceId);
      assert.ok(source?.requirementIds.includes(requirement.id));
    }
  }
});

test("the prepared report exercises every result group and exactly three next steps", () => {
  const report = alexBridgeReport;
  assert.ok(report.walkthrough);
  assert.deepEqual(new Set(report.findings.map((finding) => finding.group)), new Set([
    "current", "transferable", "small_bridge", "genuine_gap", "insufficient_evidence",
  ]));
  assert.deepEqual(report.nextSteps.map((step) => step.rank), [1, 2, 3]);
  assert.equal(report.upgradeChallenge.acceptanceCriteria.length, 4);
  assert.equal(report.walkthrough.artifactReference.locator.path, "alex-api/src/config.ts");
  assert.equal(report.walkthrough.comparisonState, "illustrative");
  assert.ok(report.findings.every((finding) => finding.whyItIsUsed.length > 0));
});

test("the prepared report rejects a missing evidence claim", () => {
  const changedLedger = {
    ...alexEvidenceLedger,
    claims: alexEvidenceLedger.claims.filter((claim) => claim.id !== "claim-runtime-config"),
  };
  assert.throws(() => buildPreparedBridgeReport(changedLedger), /claim-runtime-config/);
});

test("citation receipts are numbered once and retain inspectable source details", () => {
  const citationLedger = buildCitationLedger(alexBridgeReport, alexEvidenceLedger, softwareBackendPracticePack);
  assert.deepEqual(citationLedger.receipts.map((receipt) => receipt.number), citationLedger.receipts.map((_, index) => index + 1));
  assert.equal(new Set(citationLedger.receipts.map((receipt) => receipt.id)).size, citationLedger.receipts.length);
  assert.ok(citationLedger.receipts.some((receipt) => receipt.kind === "personal" && receipt.path === "alex-api/src/config.ts" && receipt.excerpt.length > 0));
  assert.ok(citationLedger.receipts.some((receipt) => receipt.kind === "market" && receipt.employer && receipt.location && receipt.url));
  assert.ok(citationLedger.receipts.some((receipt) => receipt.kind === "technical" && receipt.sourceName && receipt.url));
});
