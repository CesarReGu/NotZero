import assert from "node:assert/strict";
import test from "node:test";
import { applyEvidenceReview, reprioritizeBridge, reviewedLedger } from "@/lib/bridge/review";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { softwareBackendPracticePack } from "@/lib/market/current-practice";

test("evidence review removes excluded claims before comparison and updates dependent conclusions", () => {
  const excludedId = alexBridgeReport.codeBridges?.[0].claimId;
  assert.ok(excludedId);
  const result = applyEvidenceReview(alexEvidenceLedger, alexBridgeReport, [excludedId], softwareBackendPracticePack);
  assert.ok(result.report);
  assert.equal(result.ledger.claims.some((claim) => claim.id === excludedId), false);
  assert.ok(result.report.findings.every((finding) => !finding.evidenceClaimIds.includes(excludedId)));
  // The excluded claim's code bridge goes with it; the others survive, so the
  // report is still project-grounded and needs no unavailable reason.
  assert.ok(result.report.codeBridges?.every((bridge) => bridge.claimId !== excludedId));
  assert.equal(result.report.codeBridges?.length, (alexBridgeReport.codeBridges?.length ?? 0) - 1);
  assert.equal(result.report.walkthroughUnavailableReason, undefined);
});

test("excluding every project claim removes the code comparisons and explains why", () => {
  const projectClaimIds = [...new Set(alexBridgeReport.codeBridges?.map((bridge) => bridge.claimId) ?? [])];
  assert.ok(projectClaimIds.length > 0);
  const result = applyEvidenceReview(alexEvidenceLedger, alexBridgeReport, projectClaimIds, softwareBackendPracticePack);
  assert.ok(result.report);
  assert.equal(result.report.codeBridges?.length, 0);
  assert.equal(result.report.walkthrough, undefined);
  assert.match(result.report.walkthroughUnavailableReason ?? "", /excluded/i);
});

test("excluding a claim prunes the vocabulary and roadmap references that cited it", () => {
  const excludedId = "claim-runtime-config";
  const dependentVocabulary = (alexBridgeReport.vocabularyBridges ?? []).filter((term) => term.claimId === excludedId).map((term) => term.id);
  assert.ok(dependentVocabulary.length > 0, "the fixture should have vocabulary that cites the excluded claim");

  const result = applyEvidenceReview(alexEvidenceLedger, alexBridgeReport, [excludedId], softwareBackendPracticePack);
  assert.ok(result.report);
  assert.ok(result.report.vocabularyBridges?.every((term) => term.claimId !== excludedId));

  const phases = result.report.roadmap?.phases ?? [];
  assert.ok(phases.length >= 2, "the roadmap should survive a single exclusion");
  assert.deepEqual(phases.map((phase) => phase.order), phases.map((_, index) => index + 1));
  for (const phase of phases) {
    assert.ok(!phase.startsFromClaimIds.includes(excludedId));
    for (const vocabularyId of phase.vocabularyIds) assert.ok(!dependentVocabulary.includes(vocabularyId));
    for (const curriculumModule of phase.modules ?? []) {
      for (const topic of curriculumModule.topics) {
        assert.ok(!topic.claimIds.includes(excludedId));
        // A topic that lost its backing evidence must not keep asserting it.
        assert.ok(topic.stance === "new" || topic.claimIds.length > 0);
      }
    }
  }
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
