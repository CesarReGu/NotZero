import type { CurrentPracticePack, KnowledgeBridgeReport, RoadmapPhase, TopicStance } from "@/lib/domain/schemas";

export type PhaseTotals = {
  phase: RoadmapPhase;
  topicCount: number;
  settled: number;
  partial: number;
  fresh: number;
  hours: number;
  exerciseMinutes: number;
};

export type CurriculumTotals = {
  phases: PhaseTotals[];
  topicCount: number;
  settled: number;
  partial: number;
  fresh: number;
  /** Hours that remain once settled topics are removed. */
  hours: number;
  /** Hours a syllabus covering the same ground would spend on settled topics. */
  hoursSkipped: number;
  exerciseCount: number;
  exerciseMinutes: number;
  resourceCount: number;
};

// What a generic course would budget for a topic the evidence already settles.
// Deliberately conservative: the claim "you can skip this" is stronger than the
// claim "you save exactly N hours", so the estimate stays modest and is always
// labelled as an estimate in the interface.
const SETTLED_TOPIC_HOURS = 3;

export function stanceOrder(stance: TopicStance) {
  return stance === "settled" ? 0 : stance === "partial" ? 1 : 2;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

export function curriculumTotals(report: KnowledgeBridgeReport): CurriculumTotals | null {
  const phases = (report.roadmap?.phases ?? []).filter((phase) => (phase.modules?.length ?? 0) > 0);
  if (phases.length === 0) return null;

  const resourceIds = new Set<string>();
  const phaseTotals = phases.map((phase) => {
    const topics = (phase.modules ?? []).flatMap((curriculumModule) => curriculumModule.topics);
    for (const topic of topics) for (const id of topic.resourceIds) resourceIds.add(id);
    return {
      phase,
      topicCount: topics.length,
      settled: topics.filter((topic) => topic.stance === "settled").length,
      partial: topics.filter((topic) => topic.stance === "partial").length,
      fresh: topics.filter((topic) => topic.stance === "new").length,
      hours: round(topics.reduce((total, topic) => total + topic.hours, 0)),
      exerciseMinutes: (phase.exercises ?? []).reduce((total, exercise) => total + exercise.minutes, 0),
    };
  });

  const settled = phaseTotals.reduce((total, item) => total + item.settled, 0);
  return {
    phases: phaseTotals,
    topicCount: phaseTotals.reduce((total, item) => total + item.topicCount, 0),
    settled,
    partial: phaseTotals.reduce((total, item) => total + item.partial, 0),
    fresh: phaseTotals.reduce((total, item) => total + item.fresh, 0),
    hours: round(phaseTotals.reduce((total, item) => total + item.hours, 0)),
    hoursSkipped: settled * SETTLED_TOPIC_HOURS,
    exerciseCount: phases.reduce((total, phase) => total + (phase.exercises?.length ?? 0), 0),
    exerciseMinutes: phaseTotals.reduce((total, item) => total + item.exerciseMinutes, 0),
    resourceCount: resourceIds.size,
  };
}

/**
 * When the reader should expect a different answer. A saved report is a dated
 * document, and this is the date on it: the market pack was observed on a day,
 * and the maintainers state how long they expect those observations to hold.
 */
export function packFreshness(pack: CurrentPracticePack, generatedAt: string) {
  const observed = new Date(`${pack.observedThrough}T00:00:00.000Z`);
  const interval = pack.reviewIntervalDays;
  const dueDate = new Date(observed.getTime() + interval * 86_400_000);
  const generated = new Date(generatedAt);
  const ageDays = Math.max(0, Math.round((generated.getTime() - observed.getTime()) / 86_400_000));
  return {
    observedThrough: pack.observedThrough,
    datasetVersion: pack.datasetVersion,
    reviewIntervalDays: interval,
    nextReview: dueDate.toISOString().slice(0, 10),
    ageDays,
    sourceCount: pack.sources.length,
  };
}
