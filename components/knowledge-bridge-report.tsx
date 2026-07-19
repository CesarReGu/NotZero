"use client";

import { useEffect, useRef, useState } from "react";
import type { BridgeFinding, CurrentPracticePack, EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";
import { currentPracticePackById } from "@/lib/market/current-practice";

const groupLabel: Record<BridgeFinding["group"], string> = {
  current: "Current",
  transferable: "Transferable",
  small_bridge: "Small bridge",
  genuine_gap: "Genuine gap",
  insufficient_evidence: "Insufficient evidence",
};

const coverageLabel = { ...groupLabel, not_assessed: "Not assessed" } as const;

export function buildDecisionHeadline(report: KnowledgeBridgeReport, pack: CurrentPracticePack, subjectLabel?: string) {
  const coverage = report.requirementCoverage ?? [];
  const connectedCount = coverage.filter((item) => ["current", "transferable", "small_bridge"].includes(item.group)).length;
  const bridge = report.findings.find((finding) => finding.group === "small_bridge") ?? report.findings.find((finding) => finding.group === "transferable");
  const requirement = bridge ? pack.requirements.find((item) => item.id === bridge.currentRequirementId) : undefined;
  const owner = subjectLabel ? `${subjectLabel}'s` : "Your";
  if (connectedCount === 0 || !requirement) return `${owner} evidence does not yet support a reliable bridge across the reviewed requirements.`;
  return `${owner} evidence already connects to ${connectedCount} of ${coverage.length} reviewed requirements. The shortest bridge is ${requirement.name.toLowerCase()}.`;
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

type FindingFilter = "all" | "strengths" | "bridges" | "gaps" | "unknowns";

const filterGroups: Record<Exclude<FindingFilter, "all">, BridgeFinding["group"][]> = {
  strengths: ["current", "transferable"],
  bridges: ["small_bridge"],
  gaps: ["genuine_gap"],
  unknowns: ["insufficient_evidence"],
};

type CitationReceipt = {
  id: string;
  number: number;
  kind: "personal" | "market" | "technical";
  title: string;
  sourceName: string;
  date: string;
  excerpt: string;
  evidenceClass?: string;
  confidence?: string;
  confidenceBasis?: string;
  limitation?: string;
  path?: string;
  locator?: string;
  employer?: string;
  roleTitle?: string;
  location?: string;
  url?: string;
};

function personalReceiptKey(reference: BridgeFinding["artifactReference"] & {}) {
  return `personal:${reference.sourceId}:${reference.locator.path}:${reference.locator.kind}:${reference.locator.value}:${reference.excerpt}`;
}

function externalReceiptKey(sourceId: string) {
  return `external:${sourceId}`;
}

export function buildCitationLedger(report: KnowledgeBridgeReport, ledger: EvidenceLedger, pack: CurrentPracticePack) {
  const receipts: CitationReceipt[] = [];
  const byKey = new Map<string, CitationReceipt>();

  function add(key: string, receipt: Omit<CitationReceipt, "id" | "number">) {
    const existing = byKey.get(key);
    if (existing) return existing;
    const item = { ...receipt, id: `evidence-${receipts.length + 1}`, number: receipts.length + 1 };
    receipts.push(item);
    byKey.set(key, item);
    return item;
  }

  function addClaimReferences(claimId: string) {
    const claim = ledger.claims.find((item) => item.id === claimId);
    if (!claim) return;
    for (const reference of claim.references) {
      const source = ledger.sources.find((item) => item.id === reference.sourceId);
      add(personalReceiptKey(reference), {
        kind: "personal",
        title: claim.title,
        sourceName: source?.name ?? reference.locator.path,
        date: source?.date ?? "Date unavailable",
        excerpt: reference.excerpt,
        evidenceClass: humanize(claim.evidenceClass),
        confidence: claim.confidence,
        confidenceBasis: claim.statement,
        limitation: claim.limitations[0],
        path: reference.locator.path,
        locator: `${humanize(reference.locator.kind)}: ${reference.locator.value}`,
      });
    }
  }

  const shortestBridge = report.findings.find((finding) => finding.group === "small_bridge") ?? report.findings.find((finding) => finding.group === "transferable") ?? report.findings[0];
  const findingsInDisplayOrder = [shortestBridge, ...report.findings.filter((finding) => finding.id !== shortestBridge.id)];

  for (const [findingIndex, finding] of findingsInDisplayOrder.entries()) {
    for (const claimId of finding.evidenceClaimIds) addClaimReferences(claimId);

    for (const relationship of finding.relationshipEvidence) {
      const market = pack.sources.find((item) => item.id === relationship.sourceId);
      const technical = pack.technicalSources.find((item) => item.id === relationship.sourceId);
      if (market) {
        add(externalReceiptKey(market.id), {
          kind: "market",
          title: `${market.employer}, ${market.roleTitle}`,
          sourceName: market.employer,
          date: market.observedAt,
          excerpt: market.usageBasis,
          employer: market.employer,
          roleTitle: market.roleTitle,
          location: market.location,
          url: market.url,
          limitation: "A reviewed posting is one dated market observation. It is not a universal requirement.",
        });
      } else if (technical) {
        add(externalReceiptKey(technical.id), {
          kind: "technical",
          title: technical.title,
          sourceName: technical.publisher,
          date: technical.observedAt,
          excerpt: technical.usageBasis,
          url: technical.url,
          limitation: "This source supports the stated tool relationship in the reviewed technical context.",
        });
      }
    }

    if (finding.artifactReference) {
      const claim = ledger.claims.find((item) => item.references.some((reference) => personalReceiptKey(reference) === personalReceiptKey(finding.artifactReference!)));
      const source = ledger.sources.find((item) => item.id === finding.artifactReference?.sourceId);
      add(personalReceiptKey(finding.artifactReference), {
        kind: "personal",
        title: claim?.title ?? finding.title,
        sourceName: source?.name ?? finding.artifactReference.locator.path,
        date: source?.date ?? "Date unavailable",
        excerpt: finding.artifactReference.excerpt,
        evidenceClass: claim ? humanize(claim.evidenceClass) : "demonstrated",
        confidence: claim?.confidence ?? finding.confidence,
        confidenceBasis: claim?.statement ?? finding.observedImplementation,
        limitation: claim?.limitations[0] ?? finding.limitations[0],
        path: finding.artifactReference.locator.path,
        locator: `${humanize(finding.artifactReference.locator.kind)}: ${finding.artifactReference.locator.value}`,
      });
    }

    if (findingIndex === 0) {
      for (const step of report.nextSteps) for (const claimId of step.buildsOn) addClaimReferences(claimId);
    }
  }

  if (report.walkthrough) {
    const claim = ledger.claims.find((item) => item.id === report.walkthrough?.claimId);
    const reference = report.walkthrough.artifactReference;
    const source = ledger.sources.find((item) => item.id === reference.sourceId);
    add(personalReceiptKey(reference), {
      kind: "personal",
      title: claim?.title ?? report.walkthrough.title,
      sourceName: source?.name ?? reference.locator.path,
      date: source?.date ?? "Date unavailable",
      excerpt: reference.excerpt,
      evidenceClass: claim ? humanize(claim.evidenceClass) : "demonstrated",
      confidence: claim?.confidence,
      confidenceBasis: claim?.statement ?? report.walkthrough.observedImplementation,
      limitation: claim?.limitations[0] ?? report.walkthrough.limitations[0],
      path: reference.locator.path,
      locator: `${humanize(reference.locator.kind)}: ${reference.locator.value}`,
    });
  }

  return { receipts, byKey };
}

function CitationMarker({ receipt, onOpen }: { receipt: CitationReceipt; onOpen: (receipt: CitationReceipt, trigger: HTMLButtonElement) => void }) {
  return <button className="citation-marker" type="button" aria-label={`Evidence ${receipt.number}: ${receipt.sourceName}, ${receipt.date}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onOpen(receipt, event.currentTarget); }}><sup>[{receipt.number}]</sup><span className="citation-preview" aria-hidden="true"><strong>{receipt.sourceName}</strong><small>{receipt.date}{receipt.evidenceClass ? ` · ${receipt.evidenceClass}` : ""}</small><span>{receipt.excerpt}</span></span></button>;
}

export function KnowledgeBridgeReportView({ report, ledger, subjectLabel, revealStep = 5, onPriorityChange }: { report: KnowledgeBridgeReport; ledger: EvidenceLedger; subjectLabel?: string; revealStep?: number; onPriorityChange?: (requirementId: string) => void }) {
  const pack = currentPracticePackById(report.currentPracticePackId);
  const [filter, setFilter] = useState<FindingFilter>("all");
  const [activeReceipt, setActiveReceipt] = useState<CitationReceipt | null>(null);
  const receiptTriggerRef = useRef<HTMLButtonElement | null>(null);
  const receiptCloseRef = useRef<HTMLButtonElement | null>(null);
  const receiptPanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!activeReceipt) return;
    receiptCloseRef.current?.focus();
    const handlePanelKeys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveReceipt(null);
        requestAnimationFrame(() => receiptTriggerRef.current?.focus());
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = [...(receiptPanelRef.current?.querySelectorAll<HTMLElement>('button, a[href]') ?? [])];
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handlePanelKeys);
    return () => document.removeEventListener("keydown", handlePanelKeys);
  }, [activeReceipt]);

  if (!pack || pack.datasetVersion !== report.datasetVersion) return <section className="analysis-state analysis-error" role="alert"><strong>This report&apos;s dated market pack is unavailable.</strong><p>NotZero will not render conclusions against a different dataset version.</p></section>;
  const citationLedger = buildCitationLedger(report, ledger, pack);
  const supportedStrengths = report.counts.current + report.counts.transferable;
  const shortestBridge = report.findings.find((finding) => finding.group === "small_bridge") ?? report.findings.find((finding) => finding.group === "transferable") ?? report.findings[0];
  const strongestFoundation = report.findings.find((finding) => finding.group === "current") ?? report.findings.find((finding) => finding.group === "transferable") ?? shortestBridge;
  const hasSupportedBridge = shortestBridge.group === "small_bridge" || shortestBridge.group === "transferable";
  const hasSupportedFoundation = ["current", "transferable", "small_bridge"].includes(strongestFoundation.group);
  const requirementCoverage = report.requirementCoverage ?? [];
  const supportedRequirementCount = requirementCoverage.filter((item) => item.group === "current" || item.group === "transferable").length;
  const notAssessedCount = requirementCoverage.filter((item) => item.group === "not_assessed").length;
  const visibleFindings = filter === "all" ? report.findings : report.findings.filter((finding) => filterGroups[filter].includes(finding.group));
  const shortestClaimReceipts = claimReceipts(shortestBridge.evidenceClaimIds);
  const shortestRelationshipReceipts = relationshipReceipts(shortestBridge);
  const walkthroughReceipt = report.walkthrough ? citationLedger.byKey.get(personalReceiptKey(report.walkthrough.artifactReference)) : undefined;
  const walkthroughSource = report.walkthrough ? ledger.sources.find((source) => source.id === report.walkthrough?.artifactReference.sourceId) : undefined;
  const filterOptions: { id: FindingFilter; label: string; count: number }[] = [
    { id: "all", label: "All conclusions", count: report.findings.length },
    { id: "strengths", label: "Supported strengths", count: supportedStrengths },
    { id: "bridges", label: "Bridges", count: report.counts.smallBridge },
    { id: "gaps", label: "Genuine gaps", count: report.counts.genuineGap },
    { id: "unknowns", label: "Unknowns", count: report.counts.insufficientEvidence },
  ];
  const decisionHeadline = buildDecisionHeadline(report, pack, subjectLabel);
  const firstStepClaims = report.nextSteps[0].buildsOn.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
  const supportedPriorities = report.findings.filter((finding) => finding.evidenceClaimIds.length > 0 && ["current", "transferable", "small_bridge"].includes(finding.group));

  function openReceipt(receipt: CitationReceipt, trigger: HTMLButtonElement) {
    receiptTriggerRef.current = trigger;
    setActiveReceipt(receipt);
  }

  function closeReceipt() {
    setActiveReceipt(null);
    requestAnimationFrame(() => receiptTriggerRef.current?.focus());
  }

  function claimReceipts(claimIds: string[]) {
    return claimIds.flatMap((claimId) => ledger.claims.find((claim) => claim.id === claimId)?.references ?? []).map((reference) => citationLedger.byKey.get(personalReceiptKey(reference))).filter((receipt): receipt is CitationReceipt => Boolean(receipt));
  }

  function relationshipReceipts(finding: BridgeFinding) {
    return finding.relationshipEvidence.map((source) => citationLedger.byKey.get(externalReceiptKey(source.sourceId))).filter((receipt): receipt is CitationReceipt => Boolean(receipt));
  }

  function uniqueReceipts(receipts: CitationReceipt[]) {
    return [...new Map(receipts.map((receipt) => [receipt.id, receipt])).values()];
  }

  function markers(receipts: CitationReceipt[]) {
    return uniqueReceipts(receipts).map((receipt) => <CitationMarker receipt={receipt} onOpen={openReceipt} key={receipt.id} />);
  }

  function goToFinding(findingId: string | null) {
    if (!findingId) return;
    setFilter("all");
    requestAnimationFrame(() => {
      const finding = document.getElementById(`role-map-${findingId}`) as HTMLDetailsElement | null;
      if (!finding) return;
      finding.open = true;
      finding.focus({ preventScroll: true });
      finding.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <section className="bridge-report" aria-labelledby="bridge-report-title">
      <section className="report-print-cover" aria-label="Report cover">
        <p className="eyebrow">NotZero Knowledge Bridge</p>
        <h2>{decisionHeadline}</h2>
        <p>{strongestFoundation.existingCapability}</p>
        <dl><div><dt>Highest-leverage bridge</dt><dd>{shortestBridge.title}</dd></div><div><dt>First action</dt><dd>{report.nextSteps[0].title}</dd></div><div><dt>Evidence reviewed</dt><dd>{ledger.claims.length} validated claims and {pack.sources.length} dated market sources</dd></div></dl>
        <small>Generated {report.generatedAt.slice(0, 10)} · Market pack {pack.datasetVersion}</small>
      </section>
      <section className="decision-brief" aria-label="Your decision brief">
      <header className="bridge-report-header">
        <div>
          <p className="eyebrow">Your decision brief</p>
          <h3 id="bridge-report-title">{decisionHeadline}</h3>
          <p>This conclusion comes only from the validated evidence and the dated practice pack. Open any citation when you want to inspect the proof.</p>
          <details className="reasoning-receipt"><summary>Why this conclusion?</summary><div><strong>Evidence connection</strong><p>{strongestFoundation.existingCapability}</p><strong>Current-practice connection</strong><p>{shortestBridge.explanation}</p><span className="inline-citations">{markers(uniqueReceipts([...claimReceipts(strongestFoundation.evidenceClaimIds), ...shortestClaimReceipts, ...shortestRelationshipReceipts]))}</span></div></details>
        </div>
        <span className="report-date">Market pack<br /><strong>{pack.observedThrough}</strong></span>
      </header>

      <div className="report-trust-strip" aria-label="How this result was checked">
        <details id="trust-claims"><summary>{ledger.claims.length} file-backed claims</summary><div><strong>Submitted evidence</strong><p>Each claim points to a source, stable locator, and exact excerpt. Unsupported conclusions remain unknown.</p><a href="#evidence-appendix">Inspect the evidence appendix</a></div></details>
        <details id="trust-market"><summary>{pack.sources.length} dated market sources</summary><div><strong>Observation window</strong><p>{pack.observedFrom} through {pack.observedThrough}. Counts come from the controlled pack, not from an open-ended web summary.</p></div></details>
        <details id="trust-version"><summary>{pack.datasetVersion}</summary><div><strong>Reproducible inputs</strong><p>The report records its analysis version, schema version, market dataset, and generation date.</p></div></details>
        <details id="trust-validation"><summary>{report.analysisMode === "live_gpt_5_6" ? "GPT-5.6 plus validation" : "Prepared fixture plus validation"}</summary><div><strong>Server-validated result</strong><p>Typed schemas, known claim IDs, dated market literals, and project locators are checked before display.</p></div></details>
      </div>

      <div className="decision-answers" aria-label="Decision brief answers">
        <article><span>{hasSupportedFoundation ? "What you already have" : "What the evidence shows"}</span><strong>{strongestFoundation.title}</strong><p>{strongestFoundation.existingCapability}</p></article>
        <article><span>{hasSupportedBridge ? "Highest-leverage bridge" : "Before choosing a bridge"}</span><strong>{hasSupportedBridge ? shortestBridge.title : "More specific evidence is needed"}</strong><p>{hasSupportedBridge ? `Add ${shortestBridge.newConcepts.slice(0, 2).join(" and ") || shortestBridge.modernCounterpart}.` : shortestBridge.recommendedAction}</p></article>
        <article><span>What to do next</span><strong>{report.nextSteps[0].title}</strong><p>Builds on {firstStepClaims.map((claim) => claim.title).join(" and ")}. Proof: {report.nextSteps[0].proof}</p></article>
      </div>

      <div className="report-counts" aria-label="Knowledge Bridge result counts">
        <div data-group="strengths"><strong>{revealStep >= 2 ? supportedStrengths : 0}</strong><span>Supported strengths</span><small>Useful foundations already visible</small></div>
        <div data-group="small_bridge"><strong>{revealStep >= 2 ? report.counts.smallBridge : 0}</strong><span>Practical bridges</span><small>Small additions with high leverage</small></div>
        <div data-group="genuine_gap"><strong>{revealStep >= 2 ? report.counts.genuineGap : 0}</strong><span>Genuine gaps</span><small>Important areas with no direct foundation</small></div>
        <div data-group="insufficient_evidence"><strong>{revealStep >= 2 ? report.counts.insufficientEvidence : 0}</strong><span>Unknowns</span><small>More evidence would change the answer</small></div>
      </div>

      {requirementCoverage.length > 0 && <figure className="coverage-figure" aria-labelledby="coverage-caption">
        <div className="coverage-strip" role="list" aria-label="Coverage across reviewed requirements">
          {requirementCoverage.map((item) => {
            const requirement = pack.requirements.find((candidate) => candidate.id === item.requirementId);
            if (!requirement) return null;
            const label = `${requirement.name}: ${coverageLabel[item.group]}, ${item.evidenceCount} supporting evidence ${item.evidenceCount === 1 ? "claim" : "claims"}`;
            return <button type="button" role="listitem" className="chart-mark" data-tooltip={label} data-group={item.group} aria-label={label} onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }} onClick={() => goToFinding(item.findingId)} key={item.requirementId}><span aria-hidden="true" /></button>;
          })}
        </div>
        <figcaption id="coverage-caption"><strong>Supported foundations: {supportedRequirementCount} of {requirementCoverage.length} reviewed requirements.</strong><span>{notAssessedCount > 0 ? `${notAssessedCount} ${notAssessedCount === 1 ? "requirement was" : "requirements were"} not assessed from this evidence set.` : "Every reviewed requirement received an evidence-based conclusion."}</span></figcaption>
      </figure>}

      <section className="shortest-bridge" aria-labelledby="shortest-bridge-title">
        <div className="shortest-bridge-heading"><p className="eyebrow">Your shortest bridge</p><h4 id="shortest-bridge-title">{shortestBridge.title}</h4><p>{shortestBridge.explanation}<span className="inline-citations">{markers([...shortestClaimReceipts, ...shortestRelationshipReceipts])}</span></p></div>
        <div className="shortest-bridge-path">
          <div><span>Keep</span><p>{shortestBridge.existingCapability}<span className="inline-citations">{markers(shortestClaimReceipts)}</span></p></div>
          <div><span>Add</span><p>{shortestBridge.newConcepts.join(", ") || shortestBridge.modernCounterpart}<span className="inline-citations">{markers(shortestRelationshipReceipts)}</span></p></div>
          <div><span>Prove</span><p>{shortestBridge.recommendedAction}</p></div>
        </div>
      </section>
      </section>

      <section className="next-steps" aria-labelledby="next-steps-title">
        <p className="eyebrow">Your next moves</p>
        <h4 id="next-steps-title">Three steps, ordered by learning delta</h4>
        {onPriorityChange && supportedPriorities.length > 1 && <div className="priority-control"><label htmlFor="bridge-priority">Choose a different supported priority</label><select id="bridge-priority" value={report.findings.find((finding) => finding.title === report.nextSteps[0].title.replace(/^Prioritize /, ""))?.currentRequirementId ?? shortestBridge.currentRequirementId} onChange={(event) => onPriorityChange(event.target.value)}>{supportedPriorities.map((finding) => <option value={finding.currentRequirementId} key={finding.id}>{finding.title}</option>)}</select><small>The three-step plan is recomputed from this validated report. Your evidence is not uploaded again.</small></div>}
        <ol>{report.nextSteps.map((step) => {
          const buildsOnClaims = step.buildsOn.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
          return <li key={step.rank}><span>{step.rank}</span><div><strong>{step.title}</strong><small className="step-foundation">Evidence: {buildsOnClaims.map((claim) => claim.title).join(" and ")}<span className="inline-citations">{markers(claimReceipts(step.buildsOn))}</span></small><details className="reasoning-receipt step-reasoning"><summary>Why this step?</summary><div><p>{step.whyNow}</p><span className="inline-citations">{markers(claimReceipts(step.buildsOn))}</span></div></details><dl className="step-contract"><div><dt>Reuse</dt><dd>{step.reuses}</dd></div><div><dt>Learn</dt><dd>{step.newConcept}</dd></div><div><dt>Why teams use it</dt><dd>{step.whyItIsUsed}</dd></div><div><dt>Proof</dt><dd>{step.proof}</dd></div></dl></div></li>;
        })}</ol>
      </section>

      <section className="upgrade-challenge" aria-labelledby="challenge-title">
        <div><p className="eyebrow">Use work you already have</p><h4 id="challenge-title">{report.upgradeChallenge.title}</h4><p>{report.upgradeChallenge.objective}</p></div>
        <ol>{report.upgradeChallenge.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      <div className="report-actions screen-only">
        <button id="download-report" type="button" className="button button-secondary" onClick={() => window.print()}>Download report (PDF)</button>
        <span>Choose Save as PDF in the print dialog. The downloaded report uses this validated result.</span>
      </div>

      <details className="difference-method screen-only">
        <summary>What makes this different from asking a chatbot</summary>
        <div><p>A chat can produce similar prose. NotZero adds an inspectable method and a keepable result.</p><ul><li><a href="#trust-claims">Claims resolve to submitted evidence.</a></li><li><a href="#trust-market">Market comparisons use a dated source pack.</a></li><li><a href="#evidence-appendix">Evidence classes separate demonstrated, inferred, and unknown.</a></li><li><a href="#shortest-bridge-title">The learning delta is explicit.</a></li><li><a href="#challenge-title">The result ends in a project-grounded proof task.</a></li><li><a href="#download-report">The same validated payload becomes the downloadable report.</a></li></ul></div>
      </details>

      <div className="bridge-findings">
        <p className="eyebrow">Role map</p>
        <h4>{report.findings.length} evidence-based conclusions</h4>
        {requirementCoverage.length > 0 && <figure className="market-demand" aria-labelledby="market-demand-caption">
          <figcaption id="market-demand-caption"><strong>What appeared across the reviewed roles</strong><span>Exact posting counts from the dated market pack. The shortest bridge is highlighted.</span></figcaption>
          <div className="market-demand-rows" role="list">
            {requirementCoverage.map((item) => {
              const requirement = pack.requirements.find((candidate) => candidate.id === item.requirementId);
              if (!requirement) return null;
              const sources = requirement.sourceIds.map((sourceId) => pack.sources.find((source) => source.id === sourceId)).filter((source) => source !== undefined);
              const sourceSummary = sources.map((source) => `${source.employer}, ${source.roleTitle}, ${source.observedAt}`).join("; ");
              const label = `${requirement.name}: ${requirement.mentionCount} of ${pack.sources.length} reviewed postings. ${coverageLabel[item.group]}. Sources: ${sourceSummary}`;
              return <button type="button" role="listitem" className={`chart-mark ${requirement.id === shortestBridge.currentRequirementId ? "is-priority" : ""}`} data-tooltip={label} aria-label={label} onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }} onClick={() => goToFinding(item.findingId)} key={requirement.id}>
                <span className="demand-name">{requirement.name}</span><span className="demand-group" data-group={item.group}>{coverageLabel[item.group]}</span><span className="demand-track" aria-hidden="true"><span style={{ width: `${(requirement.mentionCount / pack.sources.length) * 100}%` }} /></span><strong>{requirement.mentionCount} of {pack.sources.length}</strong>
              </button>;
            })}
          </div>
        </figure>}
        <div className="finding-filters" aria-label="Filter conclusions">
          {filterOptions.map((option) => <button type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)} key={option.id}>{option.label}<span>{option.count}</span></button>)}
        </div>
        {filter !== "all" && <p className="filter-note" role="status">Showing {visibleFindings.length} of {report.findings.length} conclusions. Choose All conclusions to restore the complete narrative.</p>}
        <div className="filtered-findings">
        {visibleFindings.map((finding) => {
          const requirement = pack.requirements.find((item) => item.id === finding.currentRequirementId);
          const claims = finding.evidenceClaimIds.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
          const evidenceCount = claims.reduce((count, claim) => count + claim.references.length, 0) + finding.relationshipEvidence.length;
          const personalReceipts = claimReceipts(finding.evidenceClaimIds);
          const marketAndTechnicalReceipts = relationshipReceipts(finding);
          const findingReceipts = uniqueReceipts([...personalReceipts, ...marketAndTechnicalReceipts]);
          const artifactReceipt = finding.artifactReference ? citationLedger.byKey.get(personalReceiptKey(finding.artifactReference)) : undefined;
          return (
            <details className="bridge-finding" id={`role-map-${finding.id}`} tabIndex={-1} data-group={finding.group} key={finding.id}>
              <summary>
                <span className="finding-index" aria-hidden="true">{String(report.findings.indexOf(finding) + 1).padStart(2, "0")}</span>
                <div><span>{groupLabel[finding.group]}{finding.relationshipType ? ` · ${humanize(finding.relationshipType)}` : ""}</span><strong>{finding.title}</strong><span className={`uncertainty-chip uncertainty-${finding.group}`}>{finding.group === "insufficient_evidence" || finding.confidence === "low" ? "Needs more evidence" : finding.confidence === "medium" ? "Context-dependent" : "Evidence-backed"}</span><span className="summary-citations">{markers(findingReceipts)}</span></div>
                <small className="confidence-label" aria-label={`${finding.confidence} confidence`}><span aria-hidden="true">{[0, 1, 2].map((dot) => <i data-filled={dot < ({ low: 1, medium: 2, high: 3 }[finding.confidence])} key={dot} />)}</span>{finding.confidence}</small>
              </summary>
              <div className="finding-body">
                <div className="finding-summary-grid">
                  <div className="finding-bridge-graphic" role="group" aria-label={`${finding.existingCapability} ${finding.relationshipType ? humanize(finding.relationshipType) : "compared with"} ${finding.modernCounterpart}`}>
                    <article className="bridge-node bridge-node-evidence"><span>What you already have</span><p>{finding.existingCapability}</p>{finding.transferableConcepts.length > 0 && <small>Transfers: {finding.transferableConcepts.join(", ")}</small>}</article>
                    <div className="bridge-rule" aria-hidden="true"><span>{finding.relationshipType ? humanize(finding.relationshipType) : "compare with"}</span><i /></div>
                    <article className="bridge-node bridge-node-current"><span>What current practice changes</span><p>{finding.modernCounterpart}</p>{finding.manualStepsChanged.length > 0 && <small>Changes: {finding.manualStepsChanged.join(", ")}</small>}</article>
                  </div>
                  <div className="finding-delta-card"><span>What is actually new</span>{finding.newConcepts.length > 0 ? <ul>{finding.newConcepts.map((item) => <li key={item}>{item}</li>)}</ul> : <p>No distinct new concept was established.</p>}</div>
                  <div className="finding-action finding-delta-card"><span>Smallest useful proof</span><p>{finding.recommendedAction}</p></div>
                </div>
                <details className="finding-receipts">
                  <summary>{evidenceCount} evidence items · Why this conclusion?</summary>
                  <div className="finding-receipts-body">
                    <p className="finding-explanation">{finding.explanation}<span className="inline-citations">{markers(findingReceipts)}</span></p>
                    <div className="finding-evidence"><strong>{subjectLabel ? `Evidence from ${subjectLabel}'s materials` : "Evidence from your materials"}</strong>{claims.map((claim) => <div key={claim.id}><p><b>{claim.title}</b> {claim.statement}</p>{claim.references.map((reference) => <code key={`${claim.id}-${reference.locator.path}-${reference.locator.value}`}>{reference.locator.path} · {humanize(reference.locator.kind)}: {reference.locator.value}</code>)}</div>)}</div>
                    {requirement && <div className="market-frequency"><strong>{requirement.mentionCount} of {pack.sources.length}</strong><span>reviewed postings explicitly mentioned {requirement.name.toLowerCase()} <span className="inline-citations">{markers(marketAndTechnicalReceipts.filter((receipt) => receipt.kind === "market"))}</span></span></div>}
                    {finding.artifactReference && <blockquote className="finding-artifact"><p>&ldquo;{finding.artifactReference.excerpt}&rdquo; {artifactReceipt && <span className="inline-citations">{markers([artifactReceipt])}</span>}</p><cite>{finding.artifactReference.locator.path} · {humanize(finding.artifactReference.locator.kind)}: {finding.artifactReference.locator.value}</cite></blockquote>}
                    <div className="why-used"><strong>Why this practice is used</strong><p>{finding.whyItIsUsed}</p></div>
                    {finding.manualStepsChanged.length > 0 && <div className="manual-change"><strong>What the newer practice changes</strong><ul>{finding.manualStepsChanged.map((item) => <li key={item}>{item}</li>)}</ul></div>}
                    <div className="finding-provenance"><span className={`comparison-state state-${finding.comparisonState}`}>{finding.comparisonState}</span><div>{finding.relationshipEvidence.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.sourceId}>{source.sourceKind === "official_documentation" ? "Official documentation" : "Market source"}</a>)}</div></div>
                    <p className="finding-limit">Limit: {finding.limitations[0]}</p>
                  </div>
                </details>
              </div>
            </details>
          );
        })}
        </div>
      </div>

      {report.walkthrough ? <section className="walkthrough" aria-labelledby="walkthrough-title">
        <div className="walkthrough-heading">
          <div><p className="eyebrow">Project-grounded walkthrough</p><h4 id="walkthrough-title">{report.walkthrough.title}</h4></div>
          <span className={`comparison-state state-${report.walkthrough.comparisonState}`}>{report.walkthrough.comparisonState}</span>
        </div>
        <div className="walkthrough-grid" role="group" aria-label="Dated project and current-practice comparison">
          <article className="walkthrough-observed">
            <header><span>In your project</span><time dateTime={walkthroughSource?.date}>{walkthroughSource?.date ?? "Date unavailable"}</time></header>
            <blockquote><p>&ldquo;{report.walkthrough.artifactReference.excerpt}&rdquo; {walkthroughReceipt && <span className="inline-citations">{markers([walkthroughReceipt])}</span>}</p></blockquote>
            <p>{report.walkthrough.observedImplementation}</p>
            <code>{report.walkthrough.artifactReference.locator.path} · {report.walkthrough.artifactReference.locator.value}</code>
          </article>
          <div className="walkthrough-rule" aria-hidden="true"><span>{humanize(report.walkthrough.relationshipType)}</span><i /></div>
          <article className="walkthrough-counterpart">
            <header><span>Current practice</span><time dateTime={pack.observedThrough}>{pack.observedThrough}</time></header>
            <p>{report.walkthrough.modernCounterpart}</p>
            {report.walkthrough.illustrativeSketch && <pre><code>{report.walkthrough.illustrativeSketch}</code></pre>}
          </article>
        </div>
        <div className="walkthrough-delta"><div><strong>What transfers</strong><ul>{report.walkthrough.whatTransfers.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>What remains new</strong><ul>{report.walkthrough.whatIsNew.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
        <p className="finding-limit">Limit: {report.walkthrough.limitations[0]}</p>
      </section> : <section className="walkthrough walkthrough-unavailable" aria-label="Project walkthrough unavailable"><p>{report.walkthroughUnavailableReason}</p></section>}

      <details className="market-method">
        <summary>How the market comparison was produced</summary>
        <div className="market-method-body">
          <div><h5>Method</h5><ul>{pack.methodology.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><h5>Reviewed sources</h5><ul>{pack.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.employer}, {source.roleTitle}</a><span>{source.location} · reviewed {source.observedAt}</span></li>)}</ul></div>
          <div><h5>Limits</h5><ul>{[...pack.limitations, ...report.limitations].map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </details>

      {activeReceipt && <div className="receipt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReceipt(); }}>
        <aside className="receipt-panel" ref={receiptPanelRef} role="dialog" aria-modal="true" aria-labelledby="receipt-panel-title">
          <header><div><p className="eyebrow">Evidence {activeReceipt.number}</p><h4 id="receipt-panel-title">{activeReceipt.title}</h4></div><button type="button" ref={receiptCloseRef} onClick={closeReceipt} aria-label="Close evidence receipt">Close</button></header>
          <div className="receipt-panel-meta"><span>{activeReceipt.sourceName}</span><span>{activeReceipt.date}</span>{activeReceipt.evidenceClass && <span>{activeReceipt.evidenceClass}</span>}{activeReceipt.confidence && <span>{activeReceipt.confidence} confidence</span>}</div>
          {activeReceipt.kind === "personal" ? <>
            <blockquote><p>&ldquo;{activeReceipt.excerpt}&rdquo;</p></blockquote>
            <code>{activeReceipt.path} · {activeReceipt.locator}</code>
            {activeReceipt.confidenceBasis && <div className="receipt-section"><strong>Why this supports the conclusion</strong><p>{activeReceipt.confidenceBasis}</p></div>}
          </> : <>
            <div className="receipt-section"><strong>{activeReceipt.kind === "market" ? "Dated market observation" : "Reviewed technical source"}</strong><p>{activeReceipt.excerpt}</p></div>
            {activeReceipt.kind === "market" && <dl><div><dt>Employer</dt><dd>{activeReceipt.employer}</dd></div><div><dt>Role</dt><dd>{activeReceipt.roleTitle}</dd></div><div><dt>Location</dt><dd>{activeReceipt.location}</dd></div><div><dt>Observed</dt><dd>{activeReceipt.date}</dd></div></dl>}
            {activeReceipt.url && <a href={activeReceipt.url} target="_blank" rel="noreferrer">Open reviewed source</a>}
          </>}
          {activeReceipt.limitation && <div className="receipt-limit"><strong>Limit</strong><p>{activeReceipt.limitation}</p></div>}
        </aside>
      </div>}

      <footer className="report-print-footer">
        <span>Analysis {report.analysisVersion}</span>
        <span>Generated {report.generatedAt.slice(0, 10)}</span>
        <span>Market pack {pack.datasetVersion}</span>
        <p>NotZero interprets the evidence and dated sources available to it. It does not certify mastery or guarantee job eligibility.</p>
      </footer>
    </section>
  );
}
