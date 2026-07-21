import type { CurrentPracticePack, KnowledgeBridgeReport, ResultGroup, RoleProfile } from "@/lib/domain/schemas";

export type RequirementStanding = {
  requirementId: string;
  name: string;
  mentionCount: number;
  group: ResultGroup | "not_assessed";
  findingId: string | null;
  /** The finding's recommended action, when the evidence supported one. */
  recommendedAction?: string;
  /** Why the market pack lists this requirement, for the source column. */
  context: string;
};

export type RoleMatch = {
  profile: RoleProfile;
  connected: RequirementStanding[];
  bridges: RequirementStanding[];
  open: RequirementStanding[];
  /** Requirements the profile asks for that the evidence already reaches. */
  connectedCount: number;
  totalCount: number;
  /** Postings in the reviewed pack that this profile was derived from. */
  postingCount: number;
};

const CONNECTED: Array<ResultGroup | "not_assessed"> = ["current", "transferable"];

export function requirementStandings(report: KnowledgeBridgeReport, pack: CurrentPracticePack) {
  const standings = new Map<string, RequirementStanding>();
  for (const coverage of report.requirementCoverage ?? []) {
    const requirement = pack.requirements.find((item) => item.id === coverage.requirementId);
    if (!requirement) continue;
    const finding = coverage.findingId ? report.findings.find((item) => item.id === coverage.findingId) : undefined;
    standings.set(requirement.id, {
      requirementId: requirement.id,
      name: requirement.name,
      mentionCount: requirement.mentionCount,
      group: coverage.group,
      findingId: coverage.findingId,
      recommendedAction: finding?.recommendedAction,
      context: requirement.context,
    });
  }
  return standings;
}

/**
 * Scores each profile by how many of its requirements the evidence already
 * reaches. Deliberately a count rather than a percentage: the denominator is
 * the profile's own requirement list, which the reader can see and check.
 */
export function matchRoleProfiles(report: KnowledgeBridgeReport, pack: CurrentPracticePack): RoleMatch[] {
  const standings = requirementStandings(report, pack);
  const matches = (report.roleProfiles ?? []).map((profile) => {
    const rows = profile.requirementIds
      .map((id) => standings.get(id))
      .filter((row): row is RequirementStanding => Boolean(row));
    const connected = rows.filter((row) => CONNECTED.includes(row.group));
    const bridges = rows.filter((row) => row.group === "small_bridge");
    const open = rows.filter((row) => !CONNECTED.includes(row.group) && row.group !== "small_bridge");
    return {
      profile,
      connected,
      bridges,
      open,
      connectedCount: connected.length + bridges.length,
      totalCount: rows.length,
      postingCount: profile.sourceIds.length,
    };
  });

  // Best fit first: most requirements already reached, then fewest still open,
  // then the profile built from the most reviewed postings.
  return matches.sort((a, b) =>
    b.connectedCount - a.connectedCount
    || a.open.length - b.open.length
    || b.postingCount - a.postingCount
    || a.profile.title.localeCompare(b.profile.title));
}
