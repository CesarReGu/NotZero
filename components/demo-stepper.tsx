"use client";

import { useEffect, useRef, useState } from "react";
import type { EvidenceLedger, KnowledgeBridgeReport, PreparedScenario } from "@/lib/domain/schemas";
import { EvidenceLedgerView } from "@/components/evidence-ledger";
import { KnowledgeBridgeReportView } from "@/components/knowledge-bridge-report";
import { classifyAnalysisResult, isLimitFailure, type AnalysisState } from "@/lib/analysis/outcome";

type DemoStepperProps = { scenario: PreparedScenario };
type Mode = "prepared" | "custom";
type DatedFile = { file: File; date: string };

const steps = ["Evidence", "Target context", "Review and analyze"];
const analysisStages = [
  "Reading evidence",
  "Building the evidence ledger",
  "Comparing current requirements",
  "Constructing bridges",
  "Checking sources",
];

function AnalysisPipeline({ loading, revealStep }: { loading: boolean; revealStep: number }) {
  return (
    <div className="analysis-pipeline" aria-label="Analysis pipeline">
      <div className="analysis-pipeline-heading">
        <div><span>Analysis pipeline</span><strong>{loading ? "Working through your evidence" : revealStep >= analysisStages.length ? "All checks completed" : "Settling the verified result"}</strong></div>
        <small>{loading ? "No estimated percentage" : `${Math.min(revealStep + 1, analysisStages.length)} of ${analysisStages.length} checks shown`}</small>
      </div>
      <ol>
        {analysisStages.map((label, index) => {
          const state = loading ? (index === 0 ? "current" : "pending") : index <= revealStep ? "complete" : index === revealStep + 1 ? "current" : "pending";
          return <li data-state={state} key={label}><span aria-hidden="true">{state === "complete" ? "✓" : index + 1}</span><strong>{label}</strong><small>{state}</small></li>;
        })}
      </ol>
    </div>
  );
}

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
  const [report, setReport] = useState<KnowledgeBridgeReport | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [revealStep, setRevealStep] = useState(-1);
  const [error, setError] = useState("");
  const [curriculum, setCurriculum] = useState<DatedFile[]>([]);
  const [supporting, setSupporting] = useState<DatedFile[]>([]);
  const [project, setProject] = useState<DatedFile[]>([]);
  const [projectType, setProjectType] = useState<"project_artifact" | "professional_task">("project_artifact");
  const [field, setField] = useState("Software development");
  const [targetTitle, setTargetTitle] = useState("Junior backend engineer");
  const [location, setLocation] = useState("Mexico · Remote-friendly");
  const [jurisdiction, setJurisdiction] = useState("Mexico");
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const revealTimersRef = useRef<number[]>([]);
  const role = scenario.targetRoles[0];

  useEffect(() => {
    stepHeadingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (analysisState !== "idle") statusRef.current?.focus();
  }, [analysisState]);

  useEffect(() => {
    if (!ledger) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ledger]);

  useEffect(() => () => revealTimersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  function clearRevealTimers() {
    revealTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    revealTimersRef.current = [];
  }

  function playReveal() {
    clearRevealTimers();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealStep(analysisStages.length);
      return;
    }
    setRevealStep(0);
    for (let index = 1; index <= analysisStages.length; index += 1) {
      revealTimersRef.current.push(window.setTimeout(() => setRevealStep(index), index * 480));
    }
  }

  function skipReveal() {
    clearRevealTimers();
    setRevealStep(analysisStages.length);
  }

  function moveTo(nextStep: number) {
    clearRevealTimers();
    setLedger(null);
    setReport(null);
    setRevealStep(-1);
    setError("");
    setAnalysisState("idle");
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseMode(nextMode: Mode) {
    clearRevealTimers();
    setMode(nextMode);
    setLedger(null);
    setReport(null);
    setRevealStep(-1);
    setError("");
    setAnalysisState("idle");
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
    clearRevealTimers();
    setAnalysisState("loading");
    setError("");
    setLedger(null);
    setReport(null);
    setRevealStep(-1);
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
      const body = await response.json() as { ledger?: EvidenceLedger; report?: KnowledgeBridgeReport; message?: string; error?: string };
      if (!response.ok || !body.ledger) {
        if (isLimitFailure(response.status, body.error)) {
          setError(body.message || "The evidence exceeds a documented analysis limit.");
          setAnalysisState("limit");
          return;
        }
        throw new Error(body.message || "The evidence could not be analyzed.");
      }
      setLedger(body.ledger);
      setReport(body.report ?? null);
      setAnalysisState(classifyAnalysisResult(body.ledger, body.report));
      if (body.report) playReveal();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The evidence could not be analyzed.");
      setAnalysisState("error");
      return;
    }
  }

  async function resetAnalysis() {
    clearRevealTimers();
    if (mode === "custom") {
      try { await fetch("/api/evidence-ledger", { method: "DELETE" }); } catch { /* Local state is still cleared below. */ }
    }
    setCurriculum([]);
    setSupporting([]);
    setProject([]);
    setLedger(null);
    setReport(null);
    setRevealStep(-1);
    setError("");
    setAnalysisState("idle");
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
            <h2 id="evidence-title" ref={stepHeadingRef} tabIndex={-1}>Choose the evidence</h2>
            <p className="step-description">Use Alex&apos;s prepared software profile or validate a bounded evidence set from any field.</p>
            <div className="privacy-notice" role="note"><strong>Before using your own materials</strong><p>Do not upload credentials, confidential employer material, patient or client information, personal identifiers, or work you do not have the right to share. Validated results may be cached for up to 30 minutes. Reset deletes the anonymous session&apos;s cached result.</p></div>

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
            <p className="step-count">Step 2 of 3</p><h2 id="target-title" ref={stepHeadingRef} tabIndex={-1}>Describe where you are going</h2>
            {mode === "prepared" ? (
              <><p className="step-description">The judge path remains deliberately bounded to one software role and market context.</p><div className="target-card" aria-label="Selected target role"><span className="radio-mark" aria-hidden="true" /><div><span className="status-label status-current">Selected target</span><h3>{role.title}</h3><p>{role.location}</p><small>{role.scope}</small></div></div></>
            ) : (
              <><p className="step-description">Current practice depends on the field, target, location, and sometimes jurisdiction. These fields prevent a software-only or one-market interpretation.</p><div className="target-fields"><label>Field<input value={field} maxLength={80} onChange={(event) => setField(event.target.value)} required /></label><label>Target role or practice<input value={targetTitle} maxLength={120} onChange={(event) => setTargetTitle(event.target.value)} required /></label><label>Location<input value={location} maxLength={120} onChange={(event) => setLocation(event.target.value)} required /></label><label>Jurisdiction <span>if relevant</span><input value={jurisdiction} maxLength={120} onChange={(event) => setJurisdiction(event.target.value)} /></label></div></>
            )}
            <div className="scope-note"><strong>Why context matters</strong><p>Software tools, accounting standards, nursing guidance, and legal authority change through different source systems. The current software pack uses dated market and technical sources selected for the target role and location.</p></div>
            <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => moveTo(1)}>Back</button><button className="button button-primary" type="button" disabled={mode === "custom" && (!field.trim() || !targetTitle.trim() || !location.trim())} onClick={() => moveTo(3)}>Review the evidence</button></div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="review-title">
            <p className="step-count">Step 3 of 3</p><h2 id="review-title" ref={stepHeadingRef} tabIndex={-1}>Review and build the bridge</h2>
            <p className="step-description">NotZero first validates the evidence, then compares supported claims with one dated, profession-specific current-practice pack.</p>
            <dl className="review-list">
              <div><dt>Evidence mode</dt><dd>{mode === "prepared" ? "Prepared fictional fixture" : "Your bounded evidence set"}</dd></div>
              <div><dt>Evidence items</dt><dd>{mode === "prepared" ? scenario.evidence.length : curriculum.length + supporting.length + project.length} dated sources</dd></div>
              <div><dt>Field</dt><dd>{mode === "prepared" ? scenario.fieldContext.field : field}</dd></div>
              <div><dt>Target</dt><dd>{mode === "prepared" ? role.title : targetTitle}</dd></div>
              <div><dt>Context</dt><dd>{mode === "prepared" ? role.location : `${location}${jurisdiction ? ` · ${jurisdiction}` : ""}`}</dd></div>
            </dl>
            <div className="disclaimer">NotZero interprets the materials and market sources available to it. It does not certify mastery or guarantee job eligibility. Review the evidence and correct anything that does not reflect your experience.</div>
            {analysisState === "loading" && <div className="analysis-state analysis-loading" role="status" ref={statusRef} tabIndex={-1}><span className="analysis-pulse" aria-hidden="true" /><div><strong>Reading the evidence and building connections</strong><p>The server is completing the stages below. A stage is only marked complete after a validated result returns.</p></div><AnalysisPipeline loading revealStep={-1} /></div>}
            {analysisState === "error" && <div className="analysis-state analysis-error" role="alert" ref={statusRef} tabIndex={-1}><strong>We could not build the analysis.</strong><p>{error}</p><span>Your selected files remain in this browser so you can correct the issue and try again.</span></div>}
            {analysisState === "limit" && <div className="analysis-state analysis-limit" role="alert" ref={statusRef} tabIndex={-1}><strong>This evidence set is outside the prototype limits.</strong><p>{error}</p><span>Return to the evidence step, reduce the bounded set, and try again.</span></div>}
            {analysisState === "empty" && <div className="analysis-state analysis-empty" role="status" ref={statusRef} tabIndex={-1}><strong>Your files passed validation. No capability conclusion was generated.</strong><p>The current deployment can verify this evidence set, but a profession-specific market comparison is not available for it yet.</p></div>}
            {analysisState === "partial" && <div className="analysis-state analysis-partial" role="status" ref={statusRef} tabIndex={-1}><strong>Your evidence ledger is ready. The market bridge is still incomplete.</strong><p>Review the extracted claims below. NotZero will not apply the software market pack to a different field or context.</p></div>}
            {analysisState === "completed" && <div className="analysis-state analysis-complete" role="status" ref={statusRef} tabIndex={-1}><strong>Your Knowledge Bridge is ready.</strong><p>Start with the decision brief, then open any conclusion to inspect its evidence and learning delta.</p></div>}
            <div className="step-actions"><button className="button button-secondary" type="button" onClick={() => moveTo(2)}>Back</button><button className="button button-primary" type="button" onClick={analyze} disabled={analysisState === "loading"}>{analysisState === "loading" ? "Building your Knowledge Bridge…" : ledger ? "Rebuild Knowledge Bridge" : "Build Knowledge Bridge"}</button></div>
            {ledger && <div className="prepared-result" data-reveal-step={report ? revealStep : undefined} data-reveal-state={report && revealStep < analysisStages.length ? "playing" : "complete"} ref={resultRef} tabIndex={-1}>
              {report && <div className="result-reveal screen-only"><AnalysisPipeline loading={false} revealStep={revealStep} /><div className="result-reveal-controls"><span>{revealStep < analysisStages.length ? "The validated result is taking shape." : "Your evidence, current requirements, and sources are connected."}</span>{revealStep < analysisStages.length ? <button type="button" onClick={skipReveal}>Skip reveal</button> : <button type="button" onClick={playReveal}>Replay reveal</button>}</div></div>}
              {report && <KnowledgeBridgeReportView report={report} ledger={ledger} subjectLabel={mode === "prepared" ? scenario.person.name : undefined} revealStep={revealStep} />}
              {report ? <details className="evidence-appendix"><summary>Evidence appendix · {ledger.claims.length} verified claims</summary><EvidenceLedgerView ledger={ledger} /></details> : <EvidenceLedgerView ledger={ledger} />}
            </div>}
            {(ledger || analysisState === "error" || analysisState === "limit") && <button className="reset-evidence" type="button" onClick={resetAnalysis}>{mode === "custom" ? "Clear my files and result" : "Start over and clear result"}</button>}
          </section>
        )}
      </div>
    </div>
  );
}
