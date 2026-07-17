"use client";

import { useState } from "react";
import type { PreparedScenario } from "@/lib/domain/schemas";
import { BridgePreview } from "@/components/bridge-preview";

type DemoStepperProps = {
  scenario: PreparedScenario;
};

const steps = ["Evidence", "Target role", "Review and analyze"];

function evidenceLabel(value: PreparedScenario["evidence"][number]["evidenceClass"]) {
  return value.replaceAll("_", " ");
}

export function DemoStepper({ scenario }: DemoStepperProps) {
  const [step, setStep] = useState(1);
  const [showPreview, setShowPreview] = useState(false);
  const role = scenario.targetRoles[0];

  function moveTo(nextStep: number) {
    setShowPreview(false);
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="demo-panel">
      <ol className="stepper" aria-label="Demo progress">
        {steps.map((label, index) => {
          const number = index + 1;
          const state = number === step ? "current" : number < step ? "complete" : "pending";
          return (
            <li key={label} data-state={state} aria-current={number === step ? "step" : undefined}>
              <span>{number < step ? "✓" : number}</span>
              <strong>{label}</strong>
            </li>
          );
        })}
      </ol>

      <div className="step-content" aria-live="polite">
        {step === 1 && (
          <section aria-labelledby="evidence-title">
            <p className="step-count">Step 1 of 3</p>
            <h2 id="evidence-title">Choose the evidence</h2>
            <p className="step-description">Start with Alex&apos;s prepared profile. Your own documents will use the same evidence structure.</p>

            <div className="privacy-notice" role="note">
              <strong>Before using your own materials</strong>
              <p>Do not upload credentials, confidential employer code, personal identifiers, or work you do not have the right to share. The prepared demo contains fictional data only.</p>
            </div>

            <div className="choice-grid">
              <div className="choice-card choice-selected">
                <div className="choice-card-heading">
                  <span className="radio-mark" aria-hidden="true" />
                  <div><strong>Try a prepared graduate profile</strong><span>Recommended · no upload</span></div>
                </div>
                <div className="profile-summary">
                  <span className="profile-initials" aria-hidden="true">AR</span>
                  <div><strong>{scenario.person.name}</strong><p>{scenario.person.program} · {scenario.person.graduationYear}</p></div>
                </div>
                <ul className="evidence-compact-list">
                  {scenario.evidence.map((item) => <li key={item.id}><span>{item.title}</span><small>{evidenceLabel(item.evidenceClass)}</small></li>)}
                </ul>
              </div>

              <div className="choice-card choice-disabled" aria-disabled="true">
                <div className="choice-card-heading">
                  <span className="radio-mark" aria-hidden="true" />
                  <div><strong>Use my own documents</strong><span>Coming in the evidence-ledger phase</span></div>
                </div>
                <p>One curriculum, up to three supporting documents, and one bounded project artifact.</p>
              </div>
            </div>

            <div className="step-actions step-actions-end">
              <button className="button button-primary" type="button" onClick={() => moveTo(2)}>Continue to target role</button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="target-title">
            <p className="step-count">Step 2 of 3</p>
            <h2 id="target-title">Choose the target role</h2>
            <p className="step-description">Phase 1 supports one deliberately bounded software role and market context.</p>

            <div className="target-card" aria-label="Selected target role">
              <span className="radio-mark" aria-hidden="true" />
              <div>
                <span className="status-label status-current">Selected role</span>
                <h3>{role.title}</h3>
                <p>{role.location}</p>
                <small>{role.scope}</small>
              </div>
            </div>

            <div className="scope-note">
              <strong>Why the scope is narrow</strong>
              <p>A controlled role and location make market comparisons dated, reproducible, and easier to inspect. More roles can follow after this path is verified.</p>
            </div>

            <div className="step-actions">
              <button className="button button-secondary" type="button" onClick={() => moveTo(1)}>Back</button>
              <button className="button button-primary" type="button" onClick={() => moveTo(3)}>Review the evidence</button>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="review-title">
            <p className="step-count">Step 3 of 3</p>
            <h2 id="review-title">Review and analyze</h2>
            <p className="step-description">Confirm the prepared evidence and target before opening the deterministic bridge preview.</p>

            <dl className="review-list">
              <div><dt>Graduate profile</dt><dd>{scenario.person.name}, {scenario.person.graduationYear}</dd></div>
              <div><dt>Evidence items</dt><dd>{scenario.evidence.length} fictional, dated sources</dd></div>
              <div><dt>Target</dt><dd>{role.title}</dd></div>
              <div><dt>Market context</dt><dd>{role.location}</dd></div>
            </dl>

            <div className="disclaimer">
              NotZero interprets the materials and market sources available to it. It does not certify mastery or guarantee job eligibility. Review the evidence and correct anything that does not reflect your experience.
            </div>

            <div className="step-actions">
              <button className="button button-secondary" type="button" onClick={() => moveTo(2)}>Back</button>
              <button className="button button-primary" type="button" onClick={() => setShowPreview(true)} aria-expanded={showPreview}>
                {showPreview ? "Prepared preview opened" : "Analyze prepared profile"}
              </button>
            </div>

            {showPreview && (
              <div className="prepared-result" role="status">
                <div className="prepared-result-heading">
                  <div><p className="eyebrow">Prepared result preview</p><h3>You already understand the environment problem.</h3></div>
                  <span className="status-label status-current">Deterministic fixture</span>
                </div>
                <p className="prepared-result-note">This preview is derived from the checked-in fictional fixture. Live GPT-5.6 extraction is intentionally disabled until the evidence pipeline and validation layer are implemented.</p>
                <BridgePreview />
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
