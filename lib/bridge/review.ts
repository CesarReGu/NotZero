import { deriveRequirementCoverage } from "@/lib/bridge/coverage";
import { knowledgeBridgeReportSchema, type CurrentPracticePack, type EvidenceLedger, type KnowledgeBridgeReport } from "@/lib/domain/schemas";

export function reviewedLedger(ledger: EvidenceLedger, excludedClaimIds: string[]) {
  const known = new Set(ledger.claims.map((claim) => claim.id));
  for (const id of excludedClaimIds) if (!known.has(id)) throw new Error(`Excluded claim ${id} was not found in the validated ledger.`);
  const excluded = new Set(excludedClaimIds);
  return { ...ledger, claims: ledger.claims.filter((claim) => !excluded.has(claim.id)) };
}

export function applyEvidenceReview(ledger: EvidenceLedger, report: KnowledgeBridgeReport, excludedClaimIds: string[], pack: CurrentPracticePack) {
  const filteredLedger = reviewedLedger(ledger, excludedClaimIds);
  if (filteredLedger.claims.length === 0) return { ledger: filteredLedger, report: undefined };
  const included = new Set(filteredLedger.claims.map((claim) => claim.id));
  const fallbackClaim = filteredLedger.claims[0];
  const findings = report.findings.map((finding) => {
    const evidenceClaimIds = finding.evidenceClaimIds.filter((id) => included.has(id));
    if (evidenceClaimIds.length > 0 || !["current", "transferable", "small_bridge"].includes(finding.group)) {
      return { ...finding, evidenceClaimIds, artifactReference: finding.artifactReference && finding.evidenceClaimIds.some((id) => included.has(id)) ? finding.artifactReference : undefined };
    }
    return {
      ...finding,
      group: "insufficient_evidence" as const,
      evidenceClaimIds: [],
      relationshipType: undefined,
      artifactReference: undefined,
      existingCapability: "The evidence that supported this conclusion was excluded during review.",
      observedImplementation: "No included claim now supports a project-specific implementation conclusion.",
      comparisonState: "conceptual" as const,
      manualStepsChanged: [],
      transferableConcepts: [],
      explanation: "This requirement remains in the role map, but NotZero cannot preserve the earlier conclusion after the supporting claim was removed.",
      recommendedAction: "Include a dated artifact or source excerpt that demonstrates the relevant foundation, then run the comparison again.",
      confidence: "low" as const,
      limitations: [...finding.limitations, "The user excluded the claim that previously supported this conclusion."],
    };
  });
  const nextSteps = report.nextSteps.map((step) => {
    const buildsOn = step.buildsOn.filter((id) => included.has(id));
    return buildsOn.length > 0 ? step : {
      ...step,
      buildsOn: [fallbackClaim.id],
      reuses: fallbackClaim.statement,
      whyNow: "The original supporting claim was excluded. This revised step starts from the strongest remaining included evidence.",
    };
  });
  const challengeClaims = report.upgradeChallenge.basedOnClaimIds.filter((id) => included.has(id));
  const walkthrough = report.walkthrough && included.has(report.walkthrough.claimId) ? report.walkthrough : undefined;
  const counts = {
    current: findings.filter((item) => item.group === "current").length,
    transferable: findings.filter((item) => item.group === "transferable").length,
    smallBridge: findings.filter((item) => item.group === "small_bridge").length,
    genuineGap: findings.filter((item) => item.group === "genuine_gap").length,
    insufficientEvidence: findings.filter((item) => item.group === "insufficient_evidence").length,
  };
  const revised = knowledgeBridgeReportSchema.parse({
    ...report,
    id: `${report.id}-reviewed`,
    ledgerId: filteredLedger.id,
    findings,
    counts,
    requirementCoverage: deriveRequirementCoverage(findings, pack),
    nextSteps,
    upgradeChallenge: { ...report.upgradeChallenge, basedOnClaimIds: challengeClaims.length > 0 ? challengeClaims : [fallbackClaim.id] },
    walkthrough,
    walkthroughUnavailableReason: walkthrough ? undefined : "The claim supporting the project walkthrough was excluded during evidence review. Include a project claim with a stable locator to restore it.",
  });
  return { ledger: filteredLedger, report: revised };
}

export function reprioritizeBridge(report: KnowledgeBridgeReport, requirementId: string) {
  const finding = report.findings.find((item) => item.currentRequirementId === requirementId);
  if (!finding || finding.evidenceClaimIds.length === 0 || !["current", "transferable", "small_bridge"].includes(finding.group)) throw new Error("Only a supported bridge can become the priority.");
  const priority = {
    rank: 1,
    title: `Prioritize ${finding.title}`.slice(0, 140),
    buildsOn: finding.evidenceClaimIds,
    reuses: finding.existingCapability,
    newConcept: finding.newConcepts.join(", ") || finding.modernCounterpart,
    whyItIsUsed: finding.whyItIsUsed,
    whyNow: finding.explanation,
    proof: finding.recommendedAction,
  };
  const remaining = report.nextSteps.filter((step) => step.title !== priority.title).slice(0, 2).map((step, index) => ({ ...step, rank: index + 2 }));
  return knowledgeBridgeReportSchema.parse({ ...report, nextSteps: [priority, ...remaining] });
}
