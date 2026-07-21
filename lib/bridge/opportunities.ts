import type { CurrentPracticePack, KnowledgeBridgeReport, ResultGroup } from "@/lib/domain/schemas";
import { requirementStandings } from "@/lib/bridge/role-match";

export type PostingRequirement = {
  requirementId: string;
  name: string;
  group: ResultGroup | "not_assessed";
};

export type PostingMatch = {
  id: string;
  employer: string;
  roleTitle: string;
  location: string;
  seniority: string;
  url: string;
  observedAt: string;
  reached: PostingRequirement[];
  bridge: PostingRequirement[];
  open: PostingRequirement[];
  total: number;
};

const REACHED: Array<ResultGroup | "not_assessed"> = ["current", "transferable"];

const seniorityLabel: Record<string, string> = {
  entry: "Entry level",
  early_career: "Early career",
  mixed: "Mixed experience",
  senior: "Senior",
};

export function seniorityText(value: string) {
  return seniorityLabel[value] ?? value;
}

/**
 * Every reviewed posting, scored against the evidence one requirement at a time.
 * The role-profile view answers "what kind of work is this"; this answers the
 * blunter question a person actually asks, which is whether the specific job
 * they are looking at is within reach today.
 *
 * Ordering favours postings the evidence already reaches, then those with the
 * fewest requirements still open, so the top of the list is the shortest walk.
 */
export function matchPostings(report: KnowledgeBridgeReport, pack: CurrentPracticePack): PostingMatch[] {
  const standings = requirementStandings(report, pack);
  return pack.sources
    .map((source) => {
      const rows = source.requirementIds
        .map((id) => {
          const standing = standings.get(id);
          const requirement = pack.requirements.find((item) => item.id === id);
          if (!requirement) return null;
          return { requirementId: id, name: requirement.name, group: standing?.group ?? "not_assessed" };
        })
        .filter((row): row is PostingRequirement => row !== null);
      return {
        id: source.id,
        employer: source.employer,
        roleTitle: source.roleTitle,
        location: source.location,
        seniority: source.seniority,
        url: source.url,
        observedAt: source.observedAt,
        reached: rows.filter((row) => REACHED.includes(row.group)),
        bridge: rows.filter((row) => row.group === "small_bridge"),
        open: rows.filter((row) => !REACHED.includes(row.group) && row.group !== "small_bridge"),
        total: rows.length,
      };
    })
    .sort((a, b) =>
      (b.reached.length + b.bridge.length) - (a.reached.length + a.bridge.length)
      || a.open.length - b.open.length
      || a.employer.localeCompare(b.employer));
}
