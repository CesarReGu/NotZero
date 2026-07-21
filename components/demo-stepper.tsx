"use client";

import { useEffect, useRef, useState } from "react";
import type { CurrentPracticePack, EvidenceLedger, KnowledgeBridgeReport, PreparedScenario } from "@/lib/domain/schemas";
import { EvidenceLedgerView } from "@/components/evidence-ledger";
import { KnowledgeBridgeReportView } from "@/components/knowledge-bridge-report";
import { classifyAnalysisResult, isLimitFailure, type AnalysisState } from "@/lib/analysis/outcome";
import { deriveEvidenceMix } from "@/lib/evidence/mix";
import { COUNTRIES, DEFAULT_COUNTRY_CODE, OTHER_COUNTRY_CODE, composeLocation, countryByCode } from "@/lib/geo/regions";

type DemoStepperProps = { scenario: PreparedScenario };
type Mode = "prepared" | "custom";
type PreparedEvidenceItem = PreparedScenario["evidence"][number];
type OpenFile = { item: PreparedEvidenceItem; text: string | null; error: string };
type LiveCapability = { liveAnalysisEnabled: boolean; allowUserKeys: boolean; model: string };
type JobPollBody = {
  status?: string;
  stage?: string;
  progress?: number;
  jobId?: string;
  needsKey?: boolean;
  ledger?: EvidenceLedger;
  report?: KnowledgeBridgeReport;
  pack?: CurrentPracticePack;
  error?: { code?: string; message?: string; stage?: string } | string;
  message?: string;
};

// The visitor's OpenAI key lives in this tab only. It is sent with each
// analysis request so the server can run the three GPT-5.6 calls, and it is
// never persisted server-side.
const KEY_STORAGE = "notzero.openai.key";

// The id of the active live job. It survives refresh and navigation so returning
// to the demo restores the running or finished analysis. The job itself lives
// server-side; this only points at it.
const JOB_STORAGE = "notzero.job";
// How long the client waits between status polls. Each poll may itself block for
// one stage, so this is only the pause between stages, not a per-stage timer.
const POLL_INTERVAL_MS = 1200;

function persistJobId(id: string) {
  try { window.localStorage.setItem(JOB_STORAGE, id); } catch { /* Polling still works from in-memory state this session. */ }
}
function readPersistedJobId() {
  try { return window.localStorage.getItem(JOB_STORAGE) ?? ""; } catch { return ""; }
}
function clearPersistedJobId() {
  try { window.localStorage.removeItem(JOB_STORAGE); } catch { /* Nothing stored to remove. */ }
}
const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function plausibleApiKey(value: string) {
  return /^sk-[A-Za-z0-9_-]{16,240}$/.test(value);
}

function maskedKey(value: string) {
  return `sk-…${value.slice(-4)}`;
}

const analysisStages = [
  "Reading evidence",
  "Building the evidence ledger",
  "Comparing current requirements",
  "Constructing bridges",
  "Checking sources",
];

// Uneven dwell times, one per stage. An even cadence reads as a decorative
// progress bar; stages that each take their own time read as work being done.
const stageDurations = [520, 780, 660, 900, 580];

// Mirrors the three upload slots in the custom flow, so the prepared profile
// reads as an already-completed version of the same form.
const preparedGroups: { key: string; label: string; hint: string; sourceTypes: PreparedEvidenceItem["sourceType"][] }[] = [
  { key: "curriculum", label: "Curriculum or study plan", hint: "1 of 1 allowed", sourceTypes: ["curriculum"] },
  { key: "supporting", label: "Supporting academic documents", hint: "3 of 3 allowed", sourceTypes: ["supporting_document"] },
  { key: "project", label: "Final project · alex-api", hint: "5 of 5 allowed", sourceTypes: ["project_artifact", "professional_task", "source_file"] },
];

function EvidenceMix({ ledger }: { ledger: EvidenceLedger }) {
  const mix = deriveEvidenceMix(ledger);
  return <figure className="evidence-mix" aria-labelledby="evidence-mix-caption"><div className="evidence-mix-strip" role="list" aria-label="Claims by evidence class">{mix.flatMap((group) => Array.from({ length: group.count }, (_, index) => <span role="listitem" data-evidence-class={group.evidenceClass} aria-label={`${group.evidenceClass.replaceAll("_", " ")} claim ${index + 1} of ${group.count}`} key={`${group.evidenceClass}-${index}`} />))}</div><figcaption id="evidence-mix-caption"><strong>Evidence mix</strong><span>{mix.map((group) => `${group.count} ${group.evidenceClass.replaceAll("_", " ")}`).join(" · ")}</span></figcaption></figure>;
}

// revealStep counts the checks already finished, so "N of 5 checks shown" and
// the result below it change on the same tick.
function AnalysisPipeline({ loading, revealStep }: { loading: boolean; revealStep: number }) {
  const completed = loading ? 0 : Math.max(revealStep, 0);
  return (
    <div className="analysis-pipeline" aria-label="Analysis pipeline">
      <div className="analysis-pipeline-heading">
        <div><span>Analysis pipeline</span><strong>{loading ? "Working through the evidence" : completed >= analysisStages.length ? "All checks completed" : "Settling the verified result"}</strong></div>
        <small>{loading ? "No estimated percentage" : `${completed} of ${analysisStages.length} checks shown`}</small>
      </div>
      <ol>
        {analysisStages.map((label, index) => {
          const state = index < completed ? "complete" : index === completed ? "current" : "pending";
          return <li data-state={state} key={label}><span aria-hidden="true">{state === "complete" ? "✓" : index + 1}</span><strong>{label}</strong><small>{state}</small></li>;
        })}
      </ol>
    </div>
  );
}

// Placeholder in the report's own silhouette — masthead, standing band, profile
// tabs, requirement rows — so the swap at "5 of 5" lands on the same layout
// instead of reflowing the page under the reader.
const skeletonMetaFields = ["compared against", "evidence", "market pack", "generated"];
const skeletonBands = [4, 3, 2, 2, 1];
const skeletonMeters = [86, 72, 64, 51, 43, 30];

function ReportSkeleton({ completed }: { completed: number }) {
  // Repeated at both ends: the pipeline above scrolls out of view, and the
  // reader who scrolls into the placeholders still needs to see live work.
  const stage = <><i />{analysisStages[Math.min(completed, analysisStages.length - 1)]}<b>{completed} of {analysisStages.length}</b></>;
  return (
    <div className="report-skeleton screen-only" aria-hidden="true">
      <p className="skeleton-status">{stage}</p>
      <div className="skeleton-card">
        <span className="skeleton-line" data-size="eyebrow" />
        <span className="skeleton-line" data-size="title" />
        <span className="skeleton-line" data-size="title-end" />
        <div className="skeleton-meta">{skeletonMetaFields.map((field) => <div key={field}><span className="skeleton-line" data-size="label" /><span className="skeleton-line" data-size="value" /></div>)}</div>
      </div>
      <div className="skeleton-card">
        <div className="skeleton-standing"><span className="skeleton-count" /><div><span className="skeleton-line" data-size="value" /><span className="skeleton-line" data-size="label" /></div></div>
        <div className="skeleton-composition">{skeletonBands.map((weight, index) => <span className="skeleton-band" style={{ flexGrow: weight }} key={`band-${index}`} />)}</div>
      </div>
      <div className="skeleton-tabs">{Array.from({ length: 3 }, (_, index) => <span className="skeleton-tab" key={`tab-${index}`} />)}</div>
      <div className="skeleton-card skeleton-rows">
        {skeletonMeters.map((width) => (
          <div className="skeleton-row" key={width}>
            <span className="skeleton-line" data-size="value" />
            <span className="skeleton-meter"><i style={{ width: `${width}%` }} /></span>
            <span className="skeleton-chip" />
          </div>
        ))}
      </div>
      <p className="skeleton-status">{stage}</p>
    </div>
  );
}

function evidenceLabel(value: PreparedEvidenceItem["evidenceClass"]) {
  return value.replaceAll("_", " ");
}

// Sub-kilobyte source files are common here, and rounding them all up to "1 KB"
// would misreport the evidence set.
function fileSize(bytes: number) {
  return bytes < 1024 ? `${bytes} bytes` : `${(bytes / 1024).toFixed(1)} KB`;
}

function pickFiles(list: FileList | null): File[] {
  return Array.from(list ?? []);
}

function FileRows({ items, onRemove }: { items: File[]; onRemove: (index: number) => void }) {
  if (items.length === 0) return null;
  return (
    <ul className="selected-file-list">
      {items.map((file, index) => (
        <li key={`${file.name}-${file.lastModified}-${index}`}>
          <div><strong>{file.name}</strong><small>{Math.ceil(file.size / 1024)} KB</small></div>
          <button type="button" onClick={() => onRemove(index)} aria-label={`Remove ${file.name}`}>Remove</button>
        </li>
      ))}
    </ul>
  );
}

export function DemoStepper({ scenario }: DemoStepperProps) {
  const [mode, setMode] = useState<Mode>("prepared");
  const [ledger, setLedger] = useState<EvidenceLedger | null>(null);
  const [report, setReport] = useState<KnowledgeBridgeReport | null>(null);
  // A generated pack (for a field the curated packs do not cover) is not in the
  // static registry, so the server returns it with the report and it is passed
  // straight to the report view.
  const [pack, setPack] = useState<CurrentPracticePack | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>("idle");
  const [analysisId, setAnalysisId] = useState("");
  const [excludedClaimIds, setExcludedClaimIds] = useState<string[]>([]);
  const [revealStep, setRevealStep] = useState(-1);
  const [error, setError] = useState("");
  const [openFile, setOpenFile] = useState<OpenFile | null>(null);
  const [curriculum, setCurriculum] = useState<File[]>([]);
  const [supporting, setSupporting] = useState<File[]>([]);
  const [project, setProject] = useState<File[]>([]);
  const [projectType, setProjectType] = useState<"project_artifact" | "professional_task">("project_artifact");
  // Location is a country -> region -> city cascade. The three selections are
  // composed into the plain `location` and `jurisdiction` strings the server
  // already expects, so the API contract is unchanged.
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [customCountry, setCustomCountry] = useState("");
  const [region, setRegion] = useState("");
  const [regionOther, setRegionOther] = useState(false);
  const [city, setCity] = useState("");
  const [openToRemote, setOpenToRemote] = useState(true);
  // Hydration-safe: nothing key-dependent renders until the visitor opens the
  // custom path, so reading tab-local storage in the initializer cannot cause
  // a server/client markup mismatch.
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      const stored = window.sessionStorage.getItem(KEY_STORAGE) ?? "";
      return plausibleApiKey(stored) ? stored : "";
    } catch {
      return "";
    }
  });
  const [keyPanelOpen, setKeyPanelOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");
  const [keyError, setKeyError] = useState("");
  const [capability, setCapability] = useState<LiveCapability | null>(null);
  // Live-job state. The job runs server-side; the client only tracks its id,
  // stage progress, and any recorded failure so it can show progress and retry.
  const [jobId, setJobId] = useState("");
  const [liveStep, setLiveStep] = useState(0);
  const [jobFailure, setJobFailure] = useState<string>("");
  const [needsKey, setNeedsKey] = useState(false);
  // A monotonically increasing token that invalidates a running poll loop when
  // the analysis is reset, the mode changes, or the component unmounts.
  const pollTokenRef = useRef(0);
  // Always send the freshest key on each poll, even if it was added mid-analysis.
  const apiKeyRef = useRef("");
  const statusRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const revealTimersRef = useRef<number[]>([]);
  const fileTextCacheRef = useRef(new Map<string, string>());
  const fileTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fileCloseRef = useRef<HTMLButtonElement | null>(null);
  const filePanelRef = useRef<HTMLElement | null>(null);
  const keyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const keyInputRef = useRef<HTMLInputElement | null>(null);
  const keyPanelRef = useRef<HTMLElement | null>(null);
  const role = scenario.targetRoles[0];
  const country = countryByCode(countryCode);
  const regionLabel = country?.regionLabel ?? "State, province, or region";
  const { location, jurisdiction, countryName } = composeLocation({ country, customCountry, region, city, openToRemote });

  // Asked once, when the visitor first opens the custom path: whether this
  // deployment already has server-side live analysis and accepts visitor keys.
  useEffect(() => {
    if (mode !== "custom" || capability) return;
    let cancelled = false;
    fetch("/api/health")
      .then((response) => response.ok ? response.json() as Promise<Partial<LiveCapability>> : null)
      .then((body) => {
        if (cancelled || !body) return;
        setCapability({
          liveAnalysisEnabled: Boolean(body.liveAnalysisEnabled),
          allowUserKeys: body.allowUserKeys !== false,
          model: typeof body.model === "string" ? body.model : "gpt-5.6-luna",
        });
      })
      .catch(() => { /* The panel copy falls back to the keyless description. */ });
    return () => { cancelled = true; };
  }, [mode, capability]);

  useEffect(() => {
    if (analysisState !== "idle") statusRef.current?.focus();
  }, [analysisState]);

  useEffect(() => {
    if (!ledger) return;
    resultRef.current?.focus({ preventScroll: true });
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [ledger]);

  useEffect(() => () => revealTimersRef.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);

  // On load, resume a live job left running by a previous visit (a refresh, a
  // closed tab, or navigation away and back). The server kept the job going, so
  // the first poll restores its current progress or finished result. The restore
  // happens in an async callback (like the capability probe below) so the mount
  // effect stays free of a synchronous cascading render and hydration mismatch.
  useEffect(() => {
    const storedJobId = readPersistedJobId();
    if (!storedJobId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setMode("custom");
      setJobId(storedJobId);
      setLiveStep(0);
      setAnalysisState("loading");
      startPolling(storedJobId);
    });
    return () => { cancelled = true; };
    // Runs once on mount; the poll loop is keyed by a token, not deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop any running poll loop when the component unmounts so it does not keep
  // fetching after the page is gone. The server job is unaffected and resumes on
  // return.
  useEffect(() => () => { pollTokenRef.current += 1; }, []);

  useEffect(() => {
    if (!openFile) return;
    fileCloseRef.current?.focus();
    const handlePanelKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenFile(null);
        requestAnimationFrame(() => fileTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(filePanelRef.current?.querySelectorAll<HTMLElement>("button, a[href]") ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handlePanelKeys);
    return () => document.removeEventListener("keydown", handlePanelKeys);
  }, [openFile]);

  useEffect(() => {
    if (!keyPanelOpen) return;
    keyInputRef.current?.focus();
    const handlePanelKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setKeyPanelOpen(false);
        requestAnimationFrame(() => keyTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(keyPanelRef.current?.querySelectorAll<HTMLElement>("button, a[href], input") ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handlePanelKeys);
    return () => document.removeEventListener("keydown", handlePanelKeys);
  }, [keyPanelOpen]);

  function openKeyPanel(trigger?: HTMLButtonElement) {
    if (trigger) keyTriggerRef.current = trigger;
    setKeyDraft("");
    setKeyError("");
    setKeyPanelOpen(true);
  }

  function closeKeyPanel() {
    setKeyPanelOpen(false);
    requestAnimationFrame(() => keyTriggerRef.current?.focus());
  }

  function saveKey(event: React.FormEvent) {
    event.preventDefault();
    const value = keyDraft.trim();
    if (!plausibleApiKey(value)) {
      setKeyError("That does not look like an OpenAI API key. Keys start with sk- and contain no spaces.");
      return;
    }
    setApiKey(value);
    apiKeyRef.current = value;
    try { window.sessionStorage.setItem(KEY_STORAGE, value); } catch { /* Tab-local state still holds the key. */ }
    closeKeyPanel();
    // A job that paused waiting for a key resumes from its last completed stage.
    if (jobId && (needsKey || analysisState === "loading")) {
      setNeedsKey(false);
      startPolling(jobId);
    }
  }

  function removeKey() {
    setApiKey("");
    try { window.sessionStorage.removeItem(KEY_STORAGE); } catch { /* Nothing stored to remove. */ }
  }

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
    let elapsed = 0;
    for (const [index, duration] of stageDurations.entries()) {
      elapsed += duration;
      revealTimersRef.current.push(window.setTimeout(() => setRevealStep(index + 1), elapsed));
    }
  }

  function chooseMode(nextMode: Mode) {
    stopPolling();
    clearRevealTimers();
    setMode(nextMode);
    setLedger(null);
    setReport(null);
    setPack(null);
    setAnalysisId("");
    setExcludedClaimIds([]);
    setJobId("");
    setLiveStep(0);
    setJobFailure("");
    setNeedsKey(false);
    setRevealStep(-1);
    setError("");
    setAnalysisState("idle");
    // Returning to the custom path resumes a job left running by an earlier visit.
    if (nextMode === "custom") {
      const storedJobId = readPersistedJobId();
      if (storedJobId) {
        setJobId(storedJobId);
        setAnalysisState("loading");
        startPolling(storedJobId);
      }
    }
  }

  function removeFile(setter: React.Dispatch<React.SetStateAction<File[]>>, index: number) {
    setter((items) => items.filter((_, itemIndex) => itemIndex !== index));
  }

  function customEvidenceComplete() {
    return curriculum.length === 1 && project.length >= 1 && project.length <= 5 && supporting.length <= 3;
  }

  function customContextComplete() {
    return countryName.trim().length > 0;
  }

  async function viewPreparedFile(item: PreparedEvidenceItem, trigger: HTMLButtonElement) {
    if (!item.file) return;
    fileTriggerRef.current = trigger;
    const cached = fileTextCacheRef.current.get(item.file.url);
    if (cached !== undefined) {
      setOpenFile({ item, text: cached, error: "" });
      return;
    }
    setOpenFile({ item, text: null, error: "" });
    try {
      const response = await fetch(item.file.url);
      if (!response.ok) throw new Error();
      const text = await response.text();
      fileTextCacheRef.current.set(item.file.url, text);
      setOpenFile((current) => current?.item.id === item.id ? { item, text, error: "" } : current);
    } catch {
      setOpenFile((current) => current?.item.id === item.id ? { item, text: null, error: "The file could not be loaded. Use the download link instead." } : current);
    }
  }

  function closeFile() {
    setOpenFile(null);
    requestAnimationFrame(() => fileTriggerRef.current?.focus());
  }

  function stopPolling() {
    pollTokenRef.current += 1;
  }

  // Begins (or resumes) polling a live job. Each poll advances one server stage
  // and returns current progress, so the loop reflects the analysis as it runs
  // and stops as soon as the job completes, fails, or is cleared.
  function startPolling(id: string, retryFirst = false) {
    pollTokenRef.current += 1;
    const token = pollTokenRef.current;
    void pollLoop(id, token, retryFirst);
  }

  // Applies a poll result to the interface. Returns true when the job reached a
  // terminal state, so the poll loop can stop.
  function applyJobBody(body: JobPollBody): boolean {
    if (typeof body.progress === "number") setLiveStep(body.progress);
    if (body.needsKey) {
      // The job is saved and waiting for a key. Pause the loop; saving a key
      // resumes it exactly where it stopped, with no repeated stages.
      setNeedsKey(true);
      setAnalysisState("loading");
      return true;
    }
    setNeedsKey(false);
    if (body.status === "completed" && body.report && body.ledger) {
      clearRevealTimers();
      setLedger(body.ledger);
      setReport(body.report);
      setPack(body.pack ?? null);
      setRevealStep(analysisStages.length);
      setLiveStep(analysisStages.length);
      setAnalysisState("completed");
      return true;
    }
    if (body.status === "ledger_only" && body.ledger) {
      setLedger(body.ledger);
      setReport(null);
      setPack(null);
      setAnalysisState(body.ledger.claims.length > 0 ? "partial" : "empty");
      return true;
    }
    if (body.status === "failed") {
      const message = typeof body.error === "object" ? body.error?.message : undefined;
      setJobFailure(message || body.message || "The analysis could not be completed. Your progress is saved and can be retried.");
      setAnalysisState("error");
      return true;
    }
    setAnalysisState("loading");
    return false;
  }

  async function pollLoop(id: string, token: number, retryFirst: boolean) {
    let retry = retryFirst;
    while (pollTokenRef.current === token) {
      let response: Response;
      try {
        const query = retry ? `jobId=${encodeURIComponent(id)}&retry=1` : `jobId=${encodeURIComponent(id)}`;
        response = await fetch(`/api/evidence-ledger?${query}`, { headers: apiKeyRef.current ? { "X-OpenAI-Key": apiKeyRef.current } : undefined });
      } catch {
        // A transient network error must not lose the job: wait and poll again.
        await delay(POLL_INTERVAL_MS);
        continue;
      }
      retry = false;
      if (pollTokenRef.current !== token) return;
      if (response.status === 404) {
        clearPersistedJobId();
        setJobId("");
        setError("This analysis expired or was cleared. Upload your evidence again to start over.");
        setAnalysisState("error");
        return;
      }
      let body: JobPollBody;
      try { body = await response.json() as JobPollBody; }
      catch { await delay(POLL_INTERVAL_MS); continue; }
      if (pollTokenRef.current !== token) return;
      if (!response.ok) {
        const code = typeof body.error === "string" ? body.error : undefined;
        if (isLimitFailure(response.status, code)) { setError(body.message || "A live-analysis limit was reached."); setAnalysisState("limit"); return; }
        setJobFailure(body.message || "The analysis could not be completed."); setAnalysisState("error"); return;
      }
      if (applyJobBody(body)) return;
      await delay(POLL_INTERVAL_MS);
    }
  }

  function retryJobAnalysis() {
    if (!jobId) return;
    setJobFailure("");
    setError("");
    setNeedsKey(false);
    setAnalysisState("loading");
    startPolling(jobId, true);
  }

  async function analyze() {
    stopPolling();
    clearRevealTimers();
    setError("");
    setJobFailure("");
    setNeedsKey(false);
    setLedger(null);
    setReport(null);
    setPack(null);
    setRevealStep(-1);
    setLiveStep(0);
    setAnalysisState("loading");
    try {
      const form = new FormData();
      form.set("mode", mode);
      if (mode === "custom") {
        form.set("location", location);
        form.set("jurisdiction", jurisdiction);
        form.set("projectType", projectType);
        curriculum.forEach((file) => form.append("curriculum", file));
        supporting.forEach((file) => form.append("supporting", file));
        project.forEach((file) => form.append("project", file));
      }
      const response = await fetch("/api/evidence-ledger", {
        method: "POST",
        body: form,
        headers: mode === "custom" && apiKey ? { "X-OpenAI-Key": apiKey } : undefined,
      });
      const body = await response.json() as JobPollBody;
      if (!response.ok) {
        const code = typeof body.error === "string" ? body.error : undefined;
        if (isLimitFailure(response.status, code)) {
          setError(body.message || "The evidence exceeds a documented analysis limit.");
          setAnalysisState("limit");
          return;
        }
        throw new Error(body.message || "The evidence could not be analyzed.");
      }
      if (mode === "prepared") {
        if (!body.ledger) throw new Error("The prepared analysis could not be loaded.");
        setLedger(body.ledger);
        setReport(body.report ?? null);
        setPack(body.pack ?? null);
        setAnalysisState(classifyAnalysisResult(body.ledger, body.report));
        if (body.report) playReveal();
        return;
      }
      // Custom evidence. With a key the server starts a persistent job and the
      // analysis runs on its own from here; without a key it returns a validated
      // (or cached) ledger with no live claims.
      if (body.jobId) {
        persistJobId(body.jobId);
        setJobId(body.jobId);
        if (body.status === "completed" || body.status === "ledger_only" || body.status === "failed") {
          // A seeded result from an identical earlier run: no new work to poll.
          applyJobBody(body);
          return;
        }
        setLiveStep(typeof body.progress === "number" ? body.progress : 0);
        setAnalysisState("loading");
        startPolling(body.jobId);
        return;
      }
      if (body.ledger) {
        setLedger(body.ledger);
        setReport(body.report ?? null);
        setPack(body.pack ?? null);
        if (body.report) { setRevealStep(analysisStages.length); setAnalysisState("completed"); }
        else setAnalysisState(classifyAnalysisResult(body.ledger, body.report));
        return;
      }
      throw new Error(body.message || "The analysis could not be started.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The evidence could not be analyzed.");
      setAnalysisState("error");
    }
  }

  async function compareReviewedEvidence() {
    if (!ledger || !analysisId) return;
    setAnalysisState("loading");
    setError("");
    try {
      const form = new FormData();
      form.set("action", "compare");
      form.set("analysisId", analysisId);
      form.set("excludedClaimIds", JSON.stringify(excludedClaimIds));
      const response = await fetch("/api/evidence-ledger", {
        method: "POST",
        body: form,
        headers: mode === "custom" && apiKey ? { "X-OpenAI-Key": apiKey } : undefined,
      });
      const body = await response.json() as { ledger?: EvidenceLedger; report?: KnowledgeBridgeReport; pack?: CurrentPracticePack; message?: string; error?: string };
      if (!response.ok || !body.ledger) {
        if (isLimitFailure(response.status, body.error)) { setError(body.message || "The comparison limit was reached."); setAnalysisState("limit"); return; }
        throw new Error(body.message || "The reviewed evidence could not be compared.");
      }
      setLedger(body.ledger);
      setReport(body.report ?? null);
      setPack(body.pack ?? null);
      setAnalysisState(classifyAnalysisResult(body.ledger, body.report));
      if (body.report) playReveal();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reviewed evidence could not be compared.");
      setAnalysisState("error");
    }
  }

  async function resetAnalysis() {
    stopPolling();
    clearRevealTimers();
    clearPersistedJobId();
    if (mode === "custom") {
      try { await fetch("/api/evidence-ledger", { method: "DELETE" }); } catch { /* Local state is still cleared below. */ }
    }
    setCurriculum([]);
    setSupporting([]);
    setProject([]);
    setLedger(null);
    setReport(null);
    setPack(null);
    setAnalysisId("");
    setExcludedClaimIds([]);
    setJobId("");
    setLiveStep(0);
    setJobFailure("");
    setNeedsKey(false);
    setRevealStep(-1);
    setError("");
    setAnalysisState("idle");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const hasResult = ledger !== null;
  const loading = analysisState === "loading";
  // Until every check lands, the report is withheld behind its skeleton so the
  // pipeline above is reporting on work the reader cannot already see.
  const revealing = report !== null && revealStep < analysisStages.length;

  return (
    <div className="demo-panel">
      <div className="step-content" aria-live="polite">
        <section aria-labelledby="intake-title">
          {!hasResult && analysisState === "idle" && (
            <div className="intake">
              <header className="intake-header">
                <h2 id="intake-title">Choose the evidence</h2>
                <p className="step-description">One validated evidence set, one dated market comparison, one keepable result.</p>
              </header>

              <div className="mode-choice" aria-label="Evidence source">
                <button type="button" className={mode === "prepared" ? "is-selected" : ""} aria-pressed={mode === "prepared"} onClick={() => chooseMode("prepared")}><strong>Prepared graduate profile</strong><span>Ready-made fictional evidence, one click to the result</span></button>
                <button type="button" className={mode === "custom" ? "is-selected" : ""} aria-pressed={mode === "custom"} onClick={() => chooseMode("custom")}><strong>Use my own documents</strong><span>Upload your evidence and run the live GPT-5.6 analysis</span></button>
              </div>

              {mode === "prepared" ? (
                <div className="prepared-intake">
                  <div className="prepared-banner">
                    <span className="profile-initials" aria-hidden="true">AR</span>
                    <div><strong>{scenario.person.name}</strong><p>{scenario.person.program} · Class of {scenario.person.graduationYear}</p></div>
                    <span className="fixture-badge">Ready-made demo profile</span>
                  </div>
                  <p className="prepared-note">
                    Alex is fictional, but every file below is real and complete: a 2022 capstone REST API, its
                    documentation, and the coursework around it. This is the same evidence set the upload flow accepts,
                    already filled in. Open or download any file. In this profile they cannot be changed or replaced.
                  </p>
                  <div className="evidence-file-groups">
                    {preparedGroups.map((group) => {
                      const items = scenario.evidence.filter((item) => group.sourceTypes.includes(item.sourceType));
                      if (items.length === 0) return null;
                      return (
                        <div className="evidence-file-group" key={group.key}>
                          <h3>{group.label}<span className="evidence-file-hint">{group.hint}</span></h3>
                          <ul className="evidence-file-list">
                            {items.map((item) => (
                              <li key={item.id}>
                                <div className="evidence-file-name">
                                  <strong>{item.file?.name ?? item.title}</strong>
                                  <small>{item.date} · {item.file ? fileSize(item.file.bytes) : ""} · {evidenceLabel(item.evidenceClass)}</small>
                                </div>
                                <div className="evidence-file-actions">
                                  {item.file && <button type="button" onClick={(event) => void viewPreparedFile(item, event.currentTarget)}>Open</button>}
                                  {item.file && <a href={item.file.url} download={item.file.name.split("/").pop()}>Download</a>}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                  <div className="prepared-target">
                    <div><span>Comparing against</span><strong>{role.title}</strong><small>{role.location} · {role.scope}</small></div>
                    <div><span>Market evidence</span><strong>Dated software pack</strong><small>Eight employer postings reviewed July 18, 2026, plus official documentation</small></div>
                  </div>
                </div>
              ) : (
                <div className="custom-intake">
                  <div className="privacy-notice" role="note"><strong>Before using your own materials</strong><p>Do not upload credentials, confidential employer material, patient or client information, personal identifiers, or work you do not have the right to share. Validated results may be cached for up to 30 minutes. Reset deletes the anonymous session&apos;s cached result.</p></div>
                  <div className="live-key-panel" data-state={apiKey ? "ready" : "missing"}>
                    <div className="live-key-copy">
                      <strong>Live analysis</strong>
                      {apiKey ? (
                        <p>Your OpenAI API key <code>{maskedKey(apiKey)}</code> stays in this browser tab and travels only with your analysis requests. It powers three GPT-5.6 Luna calls: evidence extraction, market comparison, and the guided program.</p>
                      ) : capability?.liveAnalysisEnabled ? (
                        <p>This deployment already runs live GPT-5.6 Luna analysis with its own server-side key, within daily limits. Adding your own key is optional and moves usage to your OpenAI account.</p>
                      ) : (
                        <p>The full report is generated by GPT-5.6 Luna through the OpenAI API and needs your API key. Without one, NotZero validates and inspects your files but draws no conclusions from them.</p>
                      )}
                    </div>
                    <div className="live-key-actions">
                      {apiKey ? (
                        <>
                          <button type="button" onClick={(event) => openKeyPanel(event.currentTarget)}>Change key</button>
                          <button type="button" onClick={removeKey}>Remove</button>
                        </>
                      ) : (capability?.allowUserKeys ?? true) && (
                        <button type="button" className="button button-secondary" onClick={(event) => openKeyPanel(event.currentTarget)}>Add your OpenAI API key</button>
                      )}
                    </div>
                  </div>
                  <div className="upload-ledger-form">
                    <div className="upload-limit-note"><strong>Accepted evidence set</strong><span>1 curriculum · up to 3 supporting documents · 1 to 5 files from one project or task · 2 MB each · 8 MB total</span></div>
                    <div className="upload-field"><label htmlFor="curriculum-file"><strong>Curriculum or study plan</strong><span>PDF, TXT, Markdown, CSV, or JSON</span></label><input id="curriculum-file" type="file" accept=".pdf,.txt,.md,.csv,.json" onChange={(event) => setCurriculum(pickFiles(event.target.files).slice(0, 1))} /></div>
                    <FileRows items={curriculum} onRemove={(index) => removeFile(setCurriculum, index)} />
                    <div className="upload-field"><label htmlFor="supporting-files"><strong>Supporting documents</strong><span>Optional, up to three academic files</span></label><input id="supporting-files" type="file" multiple accept=".pdf,.txt,.md,.csv,.json" onChange={(event) => setSupporting(pickFiles(event.target.files).slice(0, 3))} /></div>
                    <FileRows items={supporting} onRemove={(index) => removeFile(setSupporting, index)} />
                    <div className="project-kind"><label><input type="radio" name="project-kind" checked={projectType === "project_artifact"} onChange={() => setProjectType("project_artifact")} /> Academic project</label><label><input type="radio" name="project-kind" checked={projectType === "professional_task"} onChange={() => setProjectType("professional_task")} /> Professional task</label></div>
                    <div className="upload-field"><label htmlFor="project-files"><strong>One bounded project or task</strong><span>Description, report, or selected readable source files</span></label><input id="project-files" type="file" multiple accept=".pdf,.txt,.md,.json,.csv,.ts,.tsx,.js,.jsx,.py,.java,.cs,.go,.rs,.rb,.php,.sql,.html,.css,.scss,.xml,.yml,.yaml,.toml,.ini" onChange={(event) => setProject(pickFiles(event.target.files).slice(0, 5))} /></div>
                    <FileRows items={project} onRemove={(index) => removeFile(setProject, index)} />
                  </div>
                  <div className="custom-context">
                    <h3>Where you are</h3>
                    <p>Only your location, so the comparison reflects your job market. NotZero reads your field and the role it points to from the evidence itself. You never name them, and you do not need to already know them.</p>
                    <div className="location-fields">
                      <label htmlFor="country-select">Country
                        <select id="country-select" value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setRegion(""); setRegionOther(false); }}>
                          {COUNTRIES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
                        </select>
                      </label>
                      {countryCode === OTHER_COUNTRY_CODE && (
                        <label htmlFor="custom-country">Country name<input id="custom-country" value={customCountry} maxLength={60} placeholder="Type your country" onChange={(event) => setCustomCountry(event.target.value)} /></label>
                      )}
                      <label htmlFor="region-field">{regionLabel} <span>optional</span>
                        {country?.regions && !regionOther ? (
                          <select id="region-field" value={region} onChange={(event) => { const value = event.target.value; if (value === "__other") { setRegionOther(true); setRegion(""); } else setRegion(value); }}>
                            <option value="">Select…</option>
                            {country.regions.map((item) => <option key={item} value={item}>{item}</option>)}
                            <option value="__other">Other / not listed</option>
                          </select>
                        ) : (
                          <input id="region-field" value={region} maxLength={60} placeholder={`Your ${regionLabel.toLowerCase()}`} onChange={(event) => setRegion(event.target.value)} />
                        )}
                      </label>
                      <label htmlFor="city-field">City or municipality <span>optional</span><input id="city-field" value={city} maxLength={60} placeholder="Your city or municipality" onChange={(event) => setCity(event.target.value)} /></label>
                    </div>
                    <label className="remote-toggle"><input type="checkbox" checked={openToRemote} onChange={(event) => setOpenToRemote(event.target.checked)} /> Open to remote roles</label>
                    <p className="composed-location" role="note">Comparing against <strong>{location}</strong>{jurisdiction ? <> · jurisdiction <strong>{jurisdiction}</strong></> : null}</p>
                  </div>
                </div>
              )}

              <div className="step-actions intake-actions">
                <p className="intake-disclaimer">NotZero interprets the materials and market sources available to it. It does not certify mastery or guarantee job eligibility.</p>
                <button className="button button-primary" type="button" disabled={loading || (mode === "custom" && (!customEvidenceComplete() || !customContextComplete()))} onClick={analyze}>
                  {loading ? "Building the Knowledge Bridge…" : mode === "prepared" ? "Build Alex's Knowledge Bridge" : apiKey || capability?.liveAnalysisEnabled ? "Build my Knowledge Bridge" : "Validate my evidence"}
                </button>
              </div>
            </div>
          )}

          {hasResult && (
            <div className="intake-summary screen-only">
              <div className="intake-summary-context">
                <span className="profile-initials" aria-hidden="true">{mode === "prepared" ? "AR" : "You"}</span>
                <p>
                  <strong>{mode === "prepared" ? scenario.person.name : "Your evidence"}</strong>
                  {" · "}{ledger.sources.length} {ledger.sources.length === 1 ? "file" : "files"} · {mode === "prepared" ? role.title : ledger.fieldContext.targetTitle} · {mode === "prepared" ? role.location : ledger.fieldContext.location}
                </p>
              </div>
              <button className="reset-evidence" type="button" onClick={resetAnalysis}>{mode === "custom" ? "Clear my files and result" : "Start over"}</button>
            </div>
          )}

          {analysisState === "loading" && <div className="analysis-state analysis-loading" role="status" ref={statusRef} tabIndex={-1}>
            <span className="analysis-pulse" aria-hidden="true" />
            <div>
              <strong>{needsKey ? "Add your key to continue the analysis" : liveStep >= analysisStages.length ? "Finishing your report" : "Analyzing your evidence"}</strong>
              {needsKey ? (
                <>
                  <p>Your analysis is saved on the server and waiting. Add your OpenAI key to continue it from the last completed stage. No finished work is repeated.</p>
                  {(capability?.allowUserKeys ?? true) && <button type="button" className="button button-secondary" onClick={(event) => openKeyPanel(event.currentTarget)}>Add your OpenAI API key</button>}
                </>
              ) : (
                <p>This runs on the server and keeps going if you navigate away, refresh, or close the tab. Return any time to pick up where it is. Each stage is marked complete only after a validated result returns.</p>
              )}
            </div>
            <AnalysisPipeline loading={liveStep <= 0} revealStep={liveStep} />
          </div>}
          {analysisState === "error" && <div className="analysis-state analysis-error" role="alert" ref={statusRef} tabIndex={-1}>
            <strong>We could not complete the analysis.</strong>
            <p>{jobFailure || error}</p>
            {jobId && jobFailure ? (
              <>
                <span>Your progress is saved. Retrying continues from the last completed stage, so finished work and its tokens are not repeated.</span>
                <button type="button" className="button button-primary retry-analysis" onClick={retryJobAnalysis}>Retry the analysis</button>
              </>
            ) : (
              <span>Your selected files remain in this browser so you can correct the issue and try again.</span>
            )}
          </div>}
          {analysisState === "limit" && <div className="analysis-state analysis-limit" role="alert" ref={statusRef} tabIndex={-1}><strong>This evidence set is outside the prototype limits.</strong><p>{error}</p><span>Reduce the bounded evidence set and try again.</span></div>}
          {analysisState === "empty" && <div className="analysis-state analysis-empty" role="status" ref={statusRef} tabIndex={-1}>
            <strong>Your files passed validation. No capability conclusion was generated.</strong>
            {mode === "custom" && !apiKey && (capability?.allowUserKeys ?? true) && !capability?.liveAnalysisEnabled ? (
              <>
                <p>The files are readable and within the documented limits. Add your OpenAI API key to run the full GPT-5.6 Luna analysis on this exact evidence set.</p>
                <button type="button" className="button button-secondary empty-key-action" onClick={(event) => openKeyPanel(event.currentTarget)}>Add your OpenAI API key</button>
              </>
            ) : (
              <p>The current deployment can verify this evidence set, but a profession-specific market comparison is not available for it yet.</p>
            )}
          </div>}
          {analysisState === "partial" && <div className="analysis-state analysis-partial" role="status" ref={statusRef} tabIndex={-1}><strong>Your evidence ledger is ready. The market bridge is still incomplete.</strong><p>Review the extracted claims below. A current-practice comparison could not be completed for this field and context in this run.</p></div>}
          {analysisState === "review" && ledger && <section className="evidence-review" aria-labelledby="evidence-review-title"><p className="eyebrow">Evidence checkpoint</p><h3 id="evidence-review-title">Keep only the claims that reflect your experience</h3><p>Every extracted claim is included by default. Exclude anything that feels unsupported, then build the market comparison from the remaining evidence.</p><p className="detected-field" role="note"><span>Read from your evidence</span> <strong>{ledger.fieldContext.field}</strong> — closest current role: <strong>{ledger.fieldContext.targetTitle}</strong></p><fieldset><legend>Claims to include</legend>{ledger.claims.map((claim) => { const excluded = excludedClaimIds.includes(claim.id); return <label key={claim.id}><input type="checkbox" checked={!excluded} onChange={() => setExcludedClaimIds((items) => excluded ? items.filter((id) => id !== claim.id) : [...items, claim.id])} /><span><strong>{claim.title}</strong><small>{claim.evidenceClass.replaceAll("_", " ")} · {claim.confidence} confidence</small><p>{claim.statement}</p></span></label>; })}</fieldset><div className="evidence-review-actions"><span>{ledger.claims.length - excludedClaimIds.length} of {ledger.claims.length} claims included</span><button className="button button-primary" type="button" onClick={compareReviewedEvidence} disabled={excludedClaimIds.length === ledger.claims.length}>Compare included evidence</button></div></section>}
          {analysisState === "completed" && !revealing && <div className="analysis-state analysis-complete screen-only" role="status" ref={statusRef} tabIndex={-1}><strong>The Knowledge Bridge is ready.</strong><p>Start with the verdict, then open any conclusion to inspect its evidence and learning delta.</p></div>}

          {ledger && <div className="prepared-result" data-reveal-state={revealing ? "playing" : "complete"} ref={resultRef} tabIndex={-1}>
            {report && <div className="result-reveal screen-only"><AnalysisPipeline loading={false} revealStep={revealStep} /><div className="result-reveal-controls"><span>{revealing ? "The validated result is taking shape." : "Your evidence, current requirements, and sources are connected."}</span></div></div>}
            {revealing ? <ReportSkeleton completed={Math.max(revealStep, 0)} /> : <>
              {report && <KnowledgeBridgeReportView report={report} ledger={ledger} pack={pack ?? undefined} subjectLabel={mode === "prepared" ? scenario.person.name : undefined} />}
              {report ? <details className="evidence-appendix" id="evidence-appendix"><summary>Evidence appendix · {ledger.claims.length} validated claims</summary><EvidenceMix ledger={ledger} /><EvidenceLedgerView ledger={ledger} /></details> : <EvidenceLedgerView ledger={ledger} />}
            </>}
          </div>}
          {(analysisState === "error" || analysisState === "limit") && <button className="reset-evidence" type="button" onClick={resetAnalysis}>{mode === "custom" ? "Clear my files and start over" : "Start over"}</button>}
        </section>
      </div>

      {keyPanelOpen && <div className="receipt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeKeyPanel(); }}>
        <aside className="receipt-panel key-panel" ref={keyPanelRef} role="dialog" aria-modal="true" aria-labelledby="key-panel-title">
          <header><div><p className="eyebrow">Live analysis</p><h4 id="key-panel-title">Use your OpenAI API key</h4></div><button type="button" onClick={closeKeyPanel} aria-label="Close API key panel">Close</button></header>
          <form className="key-form" onSubmit={saveKey}>
            <label htmlFor="openai-api-key">OpenAI API key</label>
            <input
              id="openai-api-key"
              ref={keyInputRef}
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-…"
              value={keyDraft}
              onChange={(event) => { setKeyDraft(event.target.value); setKeyError(""); }}
              aria-describedby={keyError ? "openai-api-key-error" : undefined}
            />
            {keyError && <p className="key-error" id="openai-api-key-error" role="alert">{keyError}</p>}
            <button className="button button-primary" type="submit">Save for this tab</button>
          </form>
          <div className="key-facts">
            <h5>What happens with the key</h5>
            <ul>
              <li>It stays in this browser tab and is sent only with your analysis requests over HTTPS. NotZero never stores or logs it.</li>
              <li>The server uses it for three schema-constrained GPT-5.6 Luna calls: evidence extraction, market comparison, and the guided program.</li>
              <li>Closing the tab or selecting Remove forgets the key.</li>
            </ul>
            <h5>Cost and account</h5>
            <ul>
              <li>The calls run on your OpenAI platform account at API rates. A typical evidence set costs well under one US dollar with GPT-5.6 Luna; larger uploads cost more.</li>
              <li>No ChatGPT subscription is required or used. Create a key in the API keys section of platform.openai.com.</li>
            </ul>
          </div>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer">Open platform.openai.com API keys</a>
        </aside>
      </div>}

      {openFile && <div className="receipt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeFile(); }}>
        <aside className="receipt-panel file-viewer" ref={filePanelRef} role="dialog" aria-modal="true" aria-labelledby="file-viewer-title">
          <header><div><p className="eyebrow">Prepared evidence file</p><h4 id="file-viewer-title">{openFile.item.file?.name ?? openFile.item.title}</h4></div><button type="button" ref={fileCloseRef} onClick={closeFile} aria-label="Close file viewer">Close</button></header>
          <div className="receipt-panel-meta"><span>{openFile.item.date}</span><span>{evidenceLabel(openFile.item.evidenceClass)}</span>{openFile.item.file && <span>{openFile.item.file.bytes.toLocaleString("en-US")} bytes</span>}</div>
          <p className="file-viewer-summary">{openFile.item.summary}</p>
          {openFile.error ? <div className="receipt-limit"><strong>Could not open</strong><p>{openFile.error}</p></div> : openFile.text === null ? <p className="file-viewer-loading">Loading the file…</p> : <pre className="file-viewer-content"><code>{openFile.text}</code></pre>}
          {openFile.item.file && <a href={openFile.item.file.url} download={openFile.item.file.name.split("/").pop()}>Download this file</a>}
        </aside>
      </div>}
    </div>
  );
}
