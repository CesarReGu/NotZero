import assert from "node:assert/strict";
import test from "node:test";
import { alexBridgeReport, buildPreparedBridgeReport } from "../lib/bridge/prepared-report";
import { alexEvidenceLedger } from "../lib/fixtures/alex-ledger";
import { softwareBackendPracticePack } from "../lib/market/current-practice";

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
  assert.deepEqual(new Set(report.findings.map((finding) => finding.group)), new Set([
    "current", "transferable", "small_bridge", "genuine_gap", "insufficient_evidence",
  ]));
  assert.deepEqual(report.nextSteps.map((step) => step.rank), [1, 2, 3]);
  assert.equal(report.upgradeChallenge.acceptanceCriteria.length, 4);
  assert.equal(report.walkthrough.artifactReference.locator.path, "alex-api/src/config.ts");
  assert.equal(report.walkthrough.comparisonState, "illustrative");
});

test("the prepared report rejects a missing evidence claim", () => {
  const changedLedger = {
    ...alexEvidenceLedger,
    claims: alexEvidenceLedger.claims.filter((claim) => claim.id !== "claim-runtime-config"),
  };
  assert.throws(() => buildPreparedBridgeReport(changedLedger), /claim-runtime-config/);
});
