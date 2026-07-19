"use client";

import { useState } from "react";
import type { EvidenceLedger, PreparedScenario } from "@/lib/domain/schemas";
import { BridgePreview } from "@/components/bridge-preview";
import { EvidenceLedgerView } from "@/components/evidence-ledger";

type DemoStepperProps = { scenario: PreparedScenario };
type Mode = "prepared" | "custom";
type DatedFile = { file: File; date: string };

const steps = ["Evidence", "Target context", "Review and analyze"];

function evidenceLabel(value: PreparedScenario["evidence"][number]["evidenceClass"]) {
  return value.replaceAll("_", " ");
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function datedFiles(list: FileList | null): DatedFile[] {
  return Array.from(list ?? []).map((file) => ({ file, date: today() }));
}

function FileRows({ items, onDate, onRemove }: { items: DatedFile[]; onDate: (index: number, date: string) => void; onRemove: (index: number) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="selected-file-list">
      {items.map((item, index) => (
        <li key={`${item.file.name}-${item.file.lastModified}-${index}`}>
          <div><strong>{item.file.name}</strong><small>{Math.ceil(item.file.size / 1024)} KB</small></div>
          <label>Date<input type="date" value={item.date} onChange={(event) => onDate(index, event.target.value)} required /></label>
          <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${item.file.name}`}>Remove</button>
        </li>
      ))}
    </ul>
  );
}

export function DemoStepper({ scenario }: DemoStepperProps) {
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState<Mode>("prepared");
  const [ledger, setLedger] = useState<EvidenceLedger | null>(null);
  const [requestState, setRequestState] = useState<"idle" | "reading" | "error">("idle");
  const [error, setError] = useState("");
  const [curriculum, setCurriculum] = useState<DatedFile[]>([]);
  const [supporting, setSupporting] = useState<DatedFile[]>([]);
  const [project, setProject] = useState<DatedFile[]>([]);
  const [projectType, setProjectType] = useState<"project_artifact" | "professional_task">("project_artifact");
  const [field, setField] = useState("Software development");
  const [targetTitle, setTargetTitle] = useState("Junior backend engineer");
  const [location, setLocation] = useState("Mexico · Remote-friendly");
  const [jurisdiction, setJurisdiction] = useState("Mexico");
  const role = scenario.targetRoles[0];

  function moveTo(nextStep: number) {
    setLedger(null);
    setError("");
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseMode(nextMode: Mode) {
    setMode(nextMode);
    setLedger(null);
    setError("");
  }

  function updateDate(setter: React.Dispatch<React.SetStateAction<DatedFile[]>>, index: number, date: string) {
    setter((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, date } : item));
  }

  function removeFile(setter: React.Dispatch<React.SetStateAction<DatedFile[]>>, index: number) {
    setter((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function customEvidenceComplete() {
    return curriculum.length === 1 && project.length >= 1 && project.length <= 5 && supporting.length <= 3
      && [...curriculum, ...supporting, ...project].every((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.date));
  }

  async function analyze() {
    setRequestState("reading");
    setError("");
    setLedger(null);
    try {
      const form = new FormData();
      form.set("mode", mode);
      if (mode === "custom") {
        form.set("field", field);
        form.set("targetTitle", targetTitle);
        form.set("location", location);
        form.set("jurisdiction", jurisdiction);
        form.set("projectType", projectType);
        curriculum.forEach(({ file }) => form.append("curriculum", file));
        supporting.forEach(({ file }) => form.append("supporting", file));
        project.forEach(({ file }) => form.append("project", file));
        form.set("curriculumDates", JSON.stringify(curriculum.map((item) => item.date)));
        form.set("supportingDates", JSON.stringify(supporting.map((item) => item.date)));
        form.set("projectDates", JSON.stringify(project.map((item) => item.date)));
      }
      const response = await fetch("/api/evidence-ledger", { method: "POST", body: form });
      const body = await response.json() as { ledger?: EvidenceLedger; message?: string };
      if (!response.ok || !body.ledger) throw new Error(body.message || "The evidence could not be analyzed.");
      setLedger(body.ledger);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The evidence could not be analyzed.");
      setRequestState("error");
      return;
    }
    setRequestState("idle");
  }

  function resetCustomEvidence() {
    setCurriculum([]);
    setSupporting([]);
    setProject([]);
    setLedger(null);
    setError("");
    setStep(1);
  }

  return (
    <div className="demo-panel">
      <ol className="stepper" aria-label="Demo progress">
        {steps.map((label, index) => {
          const number = index + 1;
          const state = number === step ? "current" : number < step ? "complete" : "pending";
          return <li key={label} data-state={state} aria-current={number === step ? "step" : undefined}><span>{number < step ? "✓" : number}</span><strong>{label}</strong></li>;
        })}
      </ol>

      <div className="step-content" aria-live="polite">
        {step === 1 && (
          <section aria-labelledby="evidence-title">
            <p className="step-count">Step 1 of 3</p>
            <h2 id="evidence-title">Choose the evidence</h2>
            <p className="step-description">Use Alex&apos;s prepared software profile or validate a bounded evidence set from any field.</p>
            <div className="privacy-notice" role="note"><strong>Before using your own materials</strong><p>Do not upload credentials, confidential employer material, patient or client information, personal identifiers, or work you do not have the right to share. Files are processed for this request and are not retained by this Phase 2 flow.</p></div>

            <div className="mode-choice" aria-label="Evidence source">
              <button type="button" className={mode === "prepared" ? "is-selected" : ""} aria-pressed={mode === "prepared"} onClick={() => chooseMode("prepared")}><strong>Prepared graduate profile</strong><span>Recommended for judges</span></button>
              <button type="button" className={mode === "custom" ? "is-selected" : ""} aria-pressed={mode === "custom"} onClick={() => chooseMode("custom")}><strong>Use my own documents</strong><span>Server-validated evidence</span></button>
            </div>

            {mode === "prepared" ? (
              <div className="choice-card choice-selected prepared-choice">
                <div className="profile-summary"><span className="profile-initials" aria-hidden="true">AR</span><div><strong>{scenario.person.name}</strong><p>{scenario.person.program} · {scenario.person.graduationYear}</p></div></div>
                <ul className="evidence-compact-list">{scenario.evidence.map((item) => <li key={item.id}><span>{item.title}</span><small>{evidenceLabel(item.evidenceClass)}</small></li>)}</ul>
              </div>
            ) : (
              <div className="upload-ledger-form">
                <div className="upload-limit-note"><strong>Accepted evidence set</strong><span>1 curriculum · up to 3 supporting documents · 1 to 5 files from one project or task · 2 MB each · 8 MB total</span></div>
                <div className="upload-field"><label htmlFor="curriculum-file"><strong>Curriculum or study plan</strong><span>PDF, TXT, Markdown, CSV, or JSON</span></label><input id="curriculum-file" type="file" accept=".pdf,.txt,.md,.csv,.json" onChange={(event) => setCurriculum(datedFiles(event.target.files).slice(0, 1))} /></div>
                <FileRows items={curriculum} onDate={(index, date) => updateDate(setCurriculum, index, date)} onRemove={(index) => removeFile(setCurriculum, index)} />
                <div className="upload-field"><label htmlFor="supporting-files"><strong>Supporting documents</strong><span>Optional, up to three academic files</span></label><input id="supporting-files" type="file" multiple accept=".pdf,.txt,.md,.csv,.json" onChange={(event) => setSupporting(datedFiles(event.target.files).slice(0, 3))} /></div>
                <FileRows items={supporting} onDate={(index, date) => updateDate(setSupporting, index, date)} onRemove={(index) => removeFile(setSupporting, index)} />
                <div className="project-kind"><label><input type="radio" name="project-kind" checked={projectType === "project_artifact"} onChange={() => setProjectType("project_artifact")} /> Academic project</label><label><input type="radio" name="project-kind" checked={projectType === "professional_task"} onChange={() => setProjectType("professional_task")} /> Professional task</label></div>
                <div className="upload-field"><label htmlFor="project-files"><strong>One bounded project or task</strong><span>Description, report, or selected readable source files</span></label><input id="project-files" type="file" multiple accept=".pdf,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.java,.cs,.go,.rs,.rb,.php,.sql,.html,.css,.scss,.xml,.yml,.yaml,.toml,.ini" onChange={(event) => setProject(datedFiles(event.target.files).slice(0, 5))} /></div>
                <FileRows items={project} onDate={(index, date) => updateDate(setProject, index, date)} onRemove={(index) => removeFile(setProject, index)} />
              </div>
            )}

            <div className="step-actions step-actions-end"><button className="button button-primary" type="button" disabled={mode === "custom" && !customEvidenceComplete()} onClick={() => moveTo(2)}>Continue to target context</button></div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="target-title">
            <p className="step-count">Step 2 of 3</p><h2 id="target-title">Describe where you are going</h2>
            {mode === "prepared" ? (
              <><p className="step-description">The judge path remains deliberately bounded to one software role and market context.</p><div className="target-card" aria-label="Selected target role"><span className="radio-mark" aria-hidden="true" /><div><span className="status-label status-current">Selected target</span><h3>{role.title}</h3><p>{role.location}</p><small>{role.scope}</small></div></div></>
            ) : (
              <><p className="step-description">Current practice depends on the field, target, location, and sometimes jurisdiction. These fields prevent a software-only or one-market interpretation.</p><div className="target-fields"><label>Field<input value={field} maxLength={80} onChange={(event) => setField(event.target.value)} required /></label><label>Target role or practice<input value={targetTitle} maxLength={120} onChange={(event) => setTargetTitle(event.target.value)} required /></label><label>Location<input value={location} maxLength={120} onChange={(event) => setLocation(event.target.value)} required /></label><label>Jurisdiction <span>if relevant</span><input value={jurisdiction} maxLength={120} onChange={(event) => setJurisdiction(event.target.value)} /></label></div></>
            )}
            <div className="scope-note"><strong>Why context matters</strong><p>Software tools, accounting standards, nursing guidance, and legal authority change through different source systems. Phase 2 records the context now so later comparisons can use the right dated evidence.</p></div>
            <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => moveTo(1)}>Back</button><button className="button button-primary" type="button" disabled={mode === "custom" && (!field.trim() || !targetTitle.trim() || !location.trim())} onClick={() => moveTo(3)}>Review the evidence</button></div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="review-title">
            <p className="step-count">Step 3 of 3</p><h2 id="review-title">Review and build the ledger</h2>
            <p className="step-description">NotZero reads and validates the evidence before making any claim about what it supports.</p>
            <dl className="review-list">
              <div><dt>Evidence mode</dt><dd>{mode === "prepared" ? "Prepared fictional fixture" : "Your bounded evidence set"}</dd></div>
              <div><dt>Evidence items</dt><dd>{mode === "prepared" ? scenario.evidence.length : curriculum.length + supporting.length + project.length} dated sources</dd></div>
              <div><dt>Field</dt><dd>{mode === "prepared" ? scenario.fieldContext.field : field}</dd></div>
              <div><dt>Target</dt><dd>{mode === "prepared" ? role.title : targetTitle}</dd></div>
              <div><dt>Context</dt><dd>{mode === "prepared" ? role.location : `${location}${jurisdiction ? ` · ${jurisdiction}` : ""}`}</dd></div>
            </dl>
            <div className="disclaimer">NotZero interprets the materials and market sources available to it. It does not certify mastery or guarantee job eligibility. Review the evidence and correct anything that does not reflect your experience.</div>
            {error && <div className="analysis-error" role="alert"><strong>We could not build the ledger.</strong><p>{error}</p><span>Your selected files remain in this browser so you can correct the issue.</span></div>}
            <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => moveTo(2)}>Back</button><button className="button button-primary" type="button" onClick={analyze} disabled={requestState === "reading"}>{requestState === "reading" ? "Reading and checking evidence…" : "Build evidence ledger"}</button></div>
            {ledger && <><div className="prepared-result"><EvidenceLedgerView ledger={ledger} />{mode === "prepared" && <div className="ledger-bridge-followup"><p className="eyebrow">Next phase preview</p><h3>One ledger claim becomes a Knowledge Bridge.</h3><BridgePreview /></div>}</div>{mode === "custom" && <button className="reset-evidence" type="button" onClick={resetCustomEvidence}>Clear my files and result</button>}</>}
          </section>
        )}
      </div>
    </div>
  );
}
