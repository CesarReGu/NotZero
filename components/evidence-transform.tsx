"use client";

import { useState } from "react";

export function EvidenceTransform() {
  const [cycle, setCycle] = useState(0);
  const [paused, setPaused] = useState(false);

  return (
    <article className="evidence-transform" aria-labelledby="transform-title">
      <div className="transform-topline">
        <div>
          <span className="live-dot" aria-hidden="true" />
          Evidence map
        </div>
        <span>2022 input <b aria-hidden="true">→</b> 2026 role</span>
      </div>

      <div
        className={`transform-stage${paused ? " is-paused" : ""}`}
        key={cycle}
      >
        <div className="source-document">
          <div className="pdf-mark" aria-hidden="true"><span>PDF</span></div>
          <div className="document-copy">
            <span>Academic artifact</span>
            <strong id="transform-title">Final Project</strong>
            <small>Alex Rivera · 2022</small>
          </div>
          <div className="document-lines" aria-hidden="true"><i /><i /><i /></div>
          <div className="scan-line" aria-hidden="true" />
        </div>

        <div className="analysis-core" aria-hidden="true">
          <span>NZ</span>
          <i /><i /><i />
        </div>

        <div className="transform-results" aria-label="NotZero analysis results">
          <div className="transform-result result-current">
            <span>Already demonstrated</span>
            <strong>REST API design</strong>
            <small>Project evidence found</small>
          </div>
          <div className="transform-result result-bridge">
            <span>Small bridge</span>
            <strong>Docker</strong>
            <small>From environment configuration</small>
          </div>
          <div className="transform-result result-unknown">
            <span>New to explore</span>
            <strong>Cloud deployment</strong>
            <small>No evidence found yet</small>
          </div>
        </div>

        <div className="transform-burst" aria-hidden="true"><i /><i /><i /><i /></div>
      </div>

      <div className="transform-footer">
        <p><span>Now mapping</span> Project evidence to Junior Backend Developer</p>
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
  );
}
