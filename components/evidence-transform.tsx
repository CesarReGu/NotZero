"use client";

import { useState } from "react";
import { NotZeroMark } from "@/components/notzero-mark";

type UseCaseId = "software" | "law" | "accounting";

const useCases = {
  software: {
    tab: "Software development",
    range: "2022 project → 2026 role",
    sourceType: "Academic artifact",
    title: "Final Project",
    meta: "Alex Rivera · 2022",
    captions: [
      "Upload a final project",
      "NotZero finds the knowledge underneath the tools",
      "See what transfers and what to learn next",
    ],
    target: "Project evidence to Junior Backend Developer",
    results: [
      ["Already demonstrated", "REST API design", "Project evidence found"],
      ["Small bridge", "Docker", "From environment configuration"],
      ["New to explore", "Cloud deployment", "No evidence found yet"],
    ],
  },
  law: {
    tab: "Law",
    range: "2022 memo → 2026 practice",
    sourceType: "Academic artifact",
    title: "Privacy Law Memo",
    meta: "Final assignment · 2022",
    captions: [
      "Upload a past legal assignment",
      "NotZero checks the reasoning against current authority",
      "See what still applies and what needs revalidation",
    ],
    target: "Legal reasoning to current privacy practice",
    results: [
      ["Still transfers", "Issue spotting", "Reasoning remains relevant"],
      ["Needs revalidation", "2022 privacy authority", "Law and jurisdiction may have changed"],
      ["New practice layer", "AI research duties", "Current technology competence"],
    ],
  },
  accounting: {
    tab: "Accounting",
    range: "2021 workbook → 2026 workflow",
    sourceType: "Academic artifact",
    title: "Reconciliation Workbook",
    meta: "Accounting project · 2021",
    captions: [
      "Upload a project or work sample",
      "NotZero separates durable principles from changed workflows",
      "See the modern tools built on your foundation",
    ],
    target: "Reconciliation skills to current finance practice",
    results: [
      ["Still transfers", "Internal controls", "Control logic found"],
      ["Workflow evolved", "Automated matching", "Builds on reconciliation rules"],
      ["New to verify", "AI review controls", "Current governance practice"],
    ],
  },
} satisfies Record<UseCaseId, {
  tab: string;
  range: string;
  sourceType: string;
  title: string;
  meta: string;
  captions: string[];
  target: string;
  results: string[][];
}>;

export function EvidenceTransform() {
  const [activeId, setActiveId] = useState<UseCaseId>("software");
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);
  const active = useCases[activeId];

  function selectUseCase(id: UseCaseId) {
    setActiveId(id);
    setCycle((value) => value + 1);
    setPaused(false);
  }

  return (
    <div className="use-case-showcase">
      <div className="use-case-heading">
        <p>Use cases</p>
        <span>One method, adapted to each field&apos;s evidence and standards.</span>
      </div>
      <div className="use-case-tabs" aria-label="Choose an example field">
        {(Object.keys(useCases) as UseCaseId[]).map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={activeId === id}
            onClick={() => selectUseCase(id)}
          >
            {useCases[id].tab}
          </button>
        ))}
      </div>

      <article className="evidence-transform" aria-labelledby="transform-title">
        <div className="transform-topline">
          <div>
            <span className="live-dot" aria-hidden="true" />
            Evidence map
          </div>
          <span>{active.range}</span>
        </div>

        <div
          className={`transform-cycle${paused ? " is-paused" : ""}`}
          key={`${activeId}-${cycle}`}
        >
          <div className="transform-caption" aria-hidden="true">
            {active.captions.map((caption, index) => (
              <p key={caption}><span>{String(index + 1).padStart(2, "0")}</span>{caption}</p>
            ))}
          </div>

          <div className="transform-stage">
            <div className="source-document">
              <div className="pdf-mark" aria-hidden="true"><span>PDF</span></div>
              <div className="document-copy">
                <span>{active.sourceType}</span>
                <strong id="transform-title">{active.title}</strong>
                <small>{active.meta}</small>
              </div>
              <div className="document-lines" aria-hidden="true"><i /><i /><i /></div>
              <div className="scan-line" aria-hidden="true" />
            </div>

            <div className="analysis-core" aria-hidden="true">
              <span className="core-ring" />
              <span className="core-disc"><NotZeroMark className="core-mark" /></span>
              <i /><i /><i />
            </div>

            <div className="transform-results" aria-label={`NotZero ${active.tab} example results`}>
              {active.results.map(([label, title, detail], index) => (
                <div className={`transform-result ${["result-current", "result-bridge", "result-unknown"][index]}`} key={title}>
                  <span>{label}</span>
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="transform-footer">
          <p><span>Now mapping</span> {active.target}</p>
          <div className="motion-controls">
            <button type="button" onClick={() => setPaused((value) => !value)}>
              {paused ? "Play" : "Pause"}
            </button>
            <button type="button" onClick={() => { setCycle((value) => value + 1); setPaused(false); }}>
              Replay
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
