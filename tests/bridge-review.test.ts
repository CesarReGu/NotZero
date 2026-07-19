import assert from "node:assert/strict";
import test from "node:test";
import { applyEvidenceReview, reprioritizeBridge, reviewedLedger } from "@/lib/bridge/review";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { softwareBackendPracticePack } from "@/lib/market/current-practice";

test("evidence review removes excluded claims before comparison and updates dependent conclusions", () => {
  const excludedId = alexBridgeReport.walkthrough?.claimId;
  assert.ok(excludedId);
  const result = applyEvidenceReview(alexEvidenceLedger, alexBridgeReport, [excludedId], softwareBackendPracticePack);
  assert.ok(result.report);
  assert.equal(result.ledger.claims.some((claim) => claim.id === excludedId), false);
  assert.equal(result.report.walkthrough, undefined);
  assert.match(result.report.walkthroughUnavailableReason ?? "", /excluded/i);
  assert.ok(result.report.findings.every((finding) => !finding.evidenceClaimIds.includes(excludedId)));
});

test("unknown exclusions are rejected and excluding every claim produces no report", () => {
  assert.throws(() => reviewedLedger(alexEvidenceLedger, ["invented-claim"]), /not found/);
  const result = applyEvidenceReview(alexEvidenceLedger, alexBridgeReport, alexEvidenceLedger.claims.map((claim) => claim.id), softwareBackendPracticePack);
  assert.equal(result.ledger.claims.length, 0);
  assert.equal(result.report, undefined);
});

test("a supported requirement can reprioritize the validated three-step plan", () => {
  const target = alexBridgeReport.findings.find((finding) => finding.group === "current");
  assert.ok(target);
  const report = reprioritizeBridge(alexBridgeReport, target.currentRequirementId);
  assert.deepEqual(report.nextSteps.map((step) => step.rank), [1, 2, 3]);
  assert.deepEqual(report.nextSteps[0].buildsOn, target.evidenceClaimIds);
  assert.match(report.nextSteps[0].title, /^Prioritize /);
});
