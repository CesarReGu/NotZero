"use client";

import { useState } from "react";
import type {
  CurrentPracticePack,
  CurriculumTopic,
  EvidenceLedger,
  KnowledgeBridgeReport,
  PhaseExercise,
  TopicStance,
} from "@/lib/domain/schemas";
import { curriculumTotals } from "@/lib/bridge/curriculum";

const stanceLabel: Record<TopicStance, string> = {
  settled: "Already yours",
  partial: "Partly there",
  new: "New",
};

const stanceMeaning: Record<TopicStance, string> = {
  settled: "Your files answer this. Skip it.",
  partial: "The idea transfers. One piece is new.",
  new: "No counterpart in the evidence yet.",
};

const exerciseKindLabel: Record<PhaseExercise["kind"], string> = {
  drill: "Drill",
  build: "Build",
  verify: "Prove it",
};

function hoursLabel(hours: number) {
  if (hours === 0) return "0h";
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours} h` : `${hours.toFixed(1)} h`;
}

function TopicRow({ topic, ledger, pack }: { topic: CurriculumTopic; ledger: EvidenceLedger; pack: CurrentPracticePack }) {
  const claims = topic.claimIds.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
  const resources = topic.resourceIds.map((id) => pack.learningResources.find((item) => item.id === id)).filter((item) => item !== undefined);
  return (
    <li className="topic-row" data-stance={topic.stance}>
      <span className="topic-mark" aria-hidden="true" />
      <div className="topic-body">
        <div className="topic-head">
          <h6>{topic.title}</h6>
          <span className="topic-stance">{stanceLabel[topic.stance]}</span>
          <span className="topic-hours">{topic.stance === "settled" ? "skip" : hoursLabel(topic.hours)}</span>
        </div>
        <p>{topic.note}</p>
        {(claims.length > 0 || resources.length > 0) && (
          <div className="topic-links">
            {claims.map((claim) => (
              <span className="topic-claim" key={claim.id}>
                <b>Your evidence</b>
                {claim.title}
              </span>
            ))}
            {resources.map((resource) => (
              <a className="topic-resource" href={resource.url} target="_blank" rel="noreferrer" key={resource.id}>
                <b>{resource.publisher}</b>
                {resource.title}
                <small>{resource.readingMinutes} min · checked {resource.observedAt}</small>
              </a>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function ExerciseCard({ exercise }: { exercise: PhaseExercise }) {
  return (
    <li className="exercise-card" data-kind={exercise.kind}>
      <header>
        <span className="exercise-kind">{exerciseKindLabel[exercise.kind]}</span>
        <h6>{exercise.title}</h6>
        <span className="exercise-time">{minutesLabel(exercise.minutes)}</span>
      </header>
      <p className="exercise-prompt">{exercise.prompt}</p>
      <p className="exercise-start"><span>Start from</span>{exercise.startFrom}</p>
      <div className="exercise-acceptance">
        <span>Done when</span>
        <ul>{exercise.acceptance.map((item) => <li key={item}>{item}</li>)}</ul>
      </div>
      <details className="exercise-hint">
        <summary>Stuck?</summary>
        <p>{exercise.stuckHint}</p>
      </details>
    </li>
  );
}

export function CurriculumProgram({ report, ledger, pack, subjectLabel }: {
  report: KnowledgeBridgeReport;
  ledger: EvidenceLedger;
  pack: CurrentPracticePack;
  subjectLabel?: string;
}) {
  const totals = curriculumTotals(report);
  const [openPhase, setOpenPhase] = useState(1);
  if (!totals || !report.roadmap) return null;

  const active = totals.phases.find((item) => item.phase.order === openPhase) ?? totals.phases[0];
  const owner = subjectLabel ? `${subjectLabel}'s` : "your";
  const composition = ([
    { stance: "settled", count: totals.settled },
    { stance: "partial", count: totals.partial },
    { stance: "new", count: totals.fresh },
  ] satisfies { stance: TopicStance; count: number }[]).filter((slice) => slice.count > 0);

  return (
    <section className="program" aria-labelledby="program-title">
      <div className="program-banner">
        <div className="program-banner-lede">
          <p className="eyebrow">Your program</p>
          <h4 id="program-title">
            <b>{hoursLabel(totals.hours)}</b>
            <span>of study left, not a fresh degree</span>
          </h4>
          <p>
            {`A syllabus covering this ground would put all ${totals.topicCount} topics below in front of you. ${totals.settled} of them are already answered by files ${subjectLabel ?? "you"} uploaded, and ${totals.partial} more are one detail away from something ${subjectLabel ? "they" : "you"} already do. Every remaining hour is counted here, and every topic says why it is on the list.`}
          </p>
        </div>
        <dl className="program-figures">
          <div><dt>Topics reviewed</dt><dd>{totals.topicCount}</dd></div>
          <div data-stance="settled"><dt>Already yours</dt><dd>{totals.settled}</dd></div>
          <div data-stance="partial"><dt>Partly there</dt><dd>{totals.partial}</dd></div>
          <div data-stance="new"><dt>Genuinely new</dt><dd>{totals.fresh}</dd></div>
        </dl>
      </div>

      <figure className="program-composition">
        <div className="composition-bar" role="img" aria-label={`Across ${totals.topicCount} curriculum topics: ${totals.settled} already settled by the evidence, ${totals.partial} partly covered, ${totals.fresh} genuinely new.`}>
          {composition.map((slice) => (
            <span className="composition-slice" data-stance={slice.stance} style={{ flexGrow: slice.count }} key={slice.stance}>
              <b aria-hidden="true">{slice.count}</b>
            </span>
          ))}
        </div>
        <figcaption>
          <ul className="composition-legend">
            {composition.map((slice) => (
              <li data-stance={slice.stance} key={slice.stance}>
                <span className="legend-swatch" aria-hidden="true" />
                <b>{slice.count}</b>
                <span className="legend-name">{stanceLabel[slice.stance]}</span>
                <small>{stanceMeaning[slice.stance]}</small>
              </li>
            ))}
          </ul>
          <p className="program-skip-note">
            {`Roughly ${totals.hoursSkipped} hours of a generic course go to the ${totals.settled} settled topics. That estimate is the reason this plan is short, and it is an estimate.`}
          </p>
        </figcaption>
      </figure>

      <div className="program-route">
        <h5>{report.roadmap.title}</h5>
        <p>{report.roadmap.premise}</p>
      </div>

      <ol className="phase-spine" aria-label="Program phases">
        {totals.phases.map((item) => {
          const selected = item.phase.order === active.phase.order;
          return (
            <li key={item.phase.order}>
              <button type="button" aria-expanded={selected} className={selected ? "phase-node is-selected" : "phase-node"} onClick={() => setOpenPhase(item.phase.order)}>
                <span className="phase-node-number">{item.phase.order}</span>
                <span className="phase-node-title">{item.phase.title}</span>
                <span className="phase-node-meta">{hoursLabel(item.hours)} · {item.topicCount} topics</span>
                <span className="phase-node-bar" aria-hidden="true">
                  {item.settled > 0 && <i data-stance="settled" style={{ flexGrow: item.settled }} />}
                  {item.partial > 0 && <i data-stance="partial" style={{ flexGrow: item.partial }} />}
                  {item.fresh > 0 && <i data-stance="new" style={{ flexGrow: item.fresh }} />}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {totals.phases.map((item) => {
        const phase = item.phase;
        const selected = phase.order === active.phase.order;
        const startsFrom = phase.startsFromClaimIds.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
        const terms = phase.vocabularyIds.map((id) => report.vocabularyBridges?.find((entry) => entry.id === id)).filter((entry) => entry !== undefined);
        const unlocks = phase.unlocksRequirementIds.map((id) => pack.requirements.find((entry) => entry.id === id)).filter((entry) => entry !== undefined);
        return (
          <article className="phase-detail" data-open={selected} key={phase.order} aria-label={`Phase ${phase.order}: ${phase.title}`}>
            <header className="phase-detail-head">
              <p className="eyebrow">Phase {phase.order} of {totals.phases.length} · {hoursLabel(item.hours)} of study · {minutesLabel(item.exerciseMinutes)} of practice</p>
              <h5>{phase.title}</h5>
              <p>{phase.goal}</p>
              {startsFrom.length > 0 && (
                <div className="phase-starts">
                  <span>Starts from work already in the evidence</span>
                  <ul>
                    {startsFrom.map((claim) => (
                      <li key={claim.id}>
                        <b>{claim.title}</b>
                        <code>{claim.references[0].locator.path}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="phase-outcome">
                <div><span>You build</span><p>{phase.buildArtifact}</p></div>
                <div><span>Done when</span><p>{phase.checkpoint}</p></div>
              </div>
              <div className="phase-footer">
                <small className="phase-scope">{phase.scope}</small>
                {terms.length > 0 && <small>Now you can say: {terms.map((term) => term.industryTerm).join(", ")}</small>}
                {unlocks.length > 0 && <small>Answers: {unlocks.map((entry) => entry.name).join(", ")}</small>}
              </div>
            </header>

            {(phase.modules ?? []).map((curriculumModule) => (
              <section className="module" key={curriculumModule.id} aria-label={curriculumModule.title}>
                <div className="module-head">
                  <h6>{curriculumModule.title}</h6>
                  <p>{curriculumModule.summary}</p>
                </div>
                <ol className="topic-list">
                  {curriculumModule.topics.map((topic) => <TopicRow topic={topic} ledger={ledger} pack={pack} key={topic.id} />)}
                </ol>
              </section>
            ))}

            {(phase.exercises ?? []).length > 0 && (
              <section className="exercise-set" aria-label={`Practice for phase ${phase.order}`}>
                <div className="module-head">
                  <h6>Practice, on {owner} own project</h6>
                  <p>Nothing here is a toy problem. Each one starts from a file already in the evidence and ends in something checkable.</p>
                </div>
                <ol className="exercise-list">
                  {(phase.exercises ?? []).map((exercise) => <ExerciseCard exercise={exercise} key={exercise.id} />)}
                </ol>
              </section>
            )}
          </article>
        );
      })}
    </section>
  );
}
