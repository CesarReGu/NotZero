import type { BridgeFinding, CurrentPracticePack } from "@/lib/domain/schemas";

export function deriveRequirementCoverage(findings: BridgeFinding[], pack: CurrentPracticePack) {
  const findingsByRequirement = new Map<string, BridgeFinding>();
  for (const finding of findings) {
    if (findingsByRequirement.has(finding.currentRequirementId)) throw new Error(`More than one finding targets ${finding.currentRequirementId}.`);
    findingsByRequirement.set(finding.currentRequirementId, finding);
  }

  return pack.requirements.map((requirement) => {
    const finding = findingsByRequirement.get(requirement.id);
    return {
      requirementId: requirement.id,
      findingId: finding?.id ?? null,
      group: finding?.group ?? "not_assessed" as const,
      evidenceCount: finding ? new Set(finding.evidenceClaimIds).size : 0,
    };
  });
}
