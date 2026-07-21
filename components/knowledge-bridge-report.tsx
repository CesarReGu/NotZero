"use client";

import { useEffect, useRef, useState } from "react";
import type { BridgeFinding, CurrentPracticePack, EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";
import { currentPracticePackById } from "@/lib/market/current-practice";
import { downloadBridgeCard } from "@/lib/bridge/card";
import { downloadBridgePackage } from "@/lib/export/package";
import { matchRoleProfiles } from "@/lib/bridge/role-match";
import { matchPostings, seniorityText } from "@/lib/bridge/opportunities";
import { packFreshness } from "@/lib/bridge/curriculum";
import { CodePanel, codeLanguageLabel } from "@/components/code-panel";
import { CurriculumProgram } from "@/components/curriculum-program";

const groupLabel: Record<BridgeFinding["group"], string> = {
  current: "Current",
  transferable: "Transferable",
  small_bridge: "Small bridge",
  genuine_gap: "Genuine gap",
  insufficient_evidence: "Insufficient evidence",
};

const coverageLabel = { ...groupLabel, not_assessed: "Not assessed" } as const;

type CoverageGroup = keyof typeof coverageLabel;

// Fixed display order. Colour follows the conclusion, never the row position, so
// filtering or reordering never repaints a group.
const coverageOrder: CoverageGroup[] = ["current", "transferable", "small_bridge", "genuine_gap", "insufficient_evidence", "not_assessed"];

const vocabularyRelationLabel = {
  equivalent: "Same practice, their word",
  narrower: "Same idea, wider scope",
  related: "Close, not the same",
} as const;

const coverageMeaning: Record<CoverageGroup, string> = {
  current: "Already matches current practice",
  transferable: "Applies through a current tool",
  small_bridge: "One bounded addition away",
  genuine_gap: "No direct foundation yet",
  insufficient_evidence: "Not enough evidence to say",
  not_assessed: "No conclusion drawn",
};

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

type CitationReceipt = {
  id: string;
  number: number;
  kind: "personal" | "market" | "technical";
  title: string;
  sourceName: string;
  date?: string;
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
        date: source?.date,
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
        date: source?.date,
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

  for (const bridge of report.codeBridges ?? []) addClaimReferences(bridge.claimId);

  if (report.walkthrough) {
    const claim = ledger.claims.find((item) => item.id === report.walkthrough?.claimId);
    const reference = report.walkthrough.artifactReference;
    const source = ledger.sources.find((item) => item.id === reference.sourceId);
    add(personalReceiptKey(reference), {
      kind: "personal",
      title: claim?.title ?? report.walkthrough.title,
      sourceName: source?.name ?? reference.locator.path,
      date: source?.date,
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
  return <button className="citation-marker" type="button" aria-label={`Evidence ${receipt.number}: ${receipt.sourceName}${receipt.date ? `, ${receipt.date}` : ""}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onOpen(receipt, event.currentTarget); }}><sup>[{receipt.number}]</sup><span className="citation-preview" aria-hidden="true"><strong>{receipt.sourceName}</strong><small>{[receipt.date, receipt.evidenceClass].filter(Boolean).join(" · ")}</small><span>{receipt.excerpt}</span></span></button>;
}

export function KnowledgeBridgeReportView({ report, ledger, subjectLabel, pack: packProp }: { report: KnowledgeBridgeReport; ledger: EvidenceLedger; subjectLabel?: string; pack?: CurrentPracticePack }) {
  // A generated pack is not in the static registry, so the server sends it with
  // the report; a curated report still resolves from the registry by id.
  const pack = packProp ?? currentPracticePackById(report.currentPracticePackId);
  const [activeReceipt, setActiveReceipt] = useState<CitationReceipt | null>(null);
  // One status line, so the most recent download action is what the reader sees.
  const [actionStatus, setActionStatus] = useState("");
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const receiptTriggerRef = useRef<HTMLButtonElement | null>(null);
  const receiptCloseRef = useRef<HTMLButtonElement | null>(null);
  const receiptPanelRef = useRef<HTMLElement | null>(null);
  const reportRef = useRef<HTMLElement | null>(null);

  // A downloaded PDF is a standalone document: nothing in it should stay hidden
  // behind a disclosure the reader cannot click. Before the browser paints a
  // print or "Save as PDF", open every collapsed <details> in the report, then
  // restore the reader's on-screen state once printing is done. The listeners
  // query the DOM at print time, so they cover rows revealed after mount too.
  useEffect(() => {
    const root = reportRef.current;
    if (!root) return;
    let reopened: HTMLDetailsElement[] = [];
    const expand = () => {
      reopened = [...root.querySelectorAll<HTMLDetailsElement>("details")].filter((node) => !node.open);
      for (const node of reopened) node.open = true;
    };
    const restore = () => {
      for (const node of reopened) node.open = false;
      reopened = [];
    };
    window.addEventListener("beforeprint", expand);
    window.addEventListener("afterprint", restore);
    return () => {
      window.removeEventListener("beforeprint", expand);
      window.removeEventListener("afterprint", restore);
    };
  }, []);

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
  // Provenance copy has two axes. `generated` (any model-built pack) drives the
  // illustrative caveats. `webSearched` vs `archetypes` drives the noun: a
  // web-searched pack holds real current postings, so it reads as "postings"
  // like the curated pack; only the archetype fallback describes imagined
  // "representative roles" with live-search links.
  const generated = pack.generated;
  const webSearched = pack.grounding === "web_search";
  const archetypes = generated && !webSearched;
  const sourceNoun = archetypes ? "representative roles" : webSearched ? "current postings" : "reviewed postings";
  const sourcesWord = archetypes ? "roles" : "postings";
  const observedVerb = archetypes ? "generated" : webSearched ? "found" : "reviewed";
  const sourceUnit = (count: number) => archetypes ? (count === 1 ? "representative role" : "representative roles") : webSearched ? (count === 1 ? "posting" : "postings") : (count === 1 ? "reviewed posting" : "reviewed postings");
  const generatedBannerText = webSearched
    ? `NotZero has no human-reviewed market pack for ${pack.field} yet, so GPT-5.6 located job postings for your field, target, and location by web search on ${pack.observedThrough}, and NotZero derived the requirement counts from them. Each posting is linked so you can check it, but no human reviewed them and NotZero did not confirm the listings are still open. Treat the conclusions as illustrative and verify specifics before relying on them.`
    : `NotZero has no human-reviewed market pack for ${pack.field} yet, so GPT-5.6 generated this current-practice reference for your field, target, and location on ${pack.observedThrough}. Requirement counts describe representative role archetypes, and the role links open live job-board searches rather than individual postings NotZero reviewed. Treat the conclusions as illustrative and check specifics before relying on them.`;
  const openingsLimitText = archetypes
    ? `These are representative roles NotZero generated on ${pack.observedThrough}; each link opens a live search so the sample stays checkable.`
    : webSearched
    ? `These are job postings GPT-5.6 located on ${pack.observedThrough}; each link opens where it was found so you can check it. NotZero did not confirm they are still open, and some may have closed since.`
    : `These are the postings NotZero reviewed on ${pack.observedThrough}, kept so the counts stay checkable. Some have closed since.`;
  const trustMarketText = archetypes
    ? `Generated by GPT-5.6 for ${pack.field} on ${pack.observedThrough}. Counts describe representative role archetypes, not individually reviewed postings.`
    : webSearched
    ? `GPT-5.6 located these postings by web search on ${pack.observedThrough}. Counts come from the located postings, not an open-ended web summary, but no human reviewed them and NotZero did not confirm the listings are still active.`
    : `Observed ${pack.observedFrom} through ${pack.observedThrough}. Counts come from the controlled pack, not from an open-ended web summary.`;
  const citationLedger = buildCitationLedger(report, ledger, pack);
  const shortestBridge = report.findings.find((finding) => finding.group === "small_bridge") ?? report.findings.find((finding) => finding.group === "transferable") ?? report.findings[0];
  const strongestFoundation = report.findings.find((finding) => finding.group === "current") ?? report.findings.find((finding) => finding.group === "transferable") ?? shortestBridge;
  const requirementCoverage = report.requirementCoverage ?? [];
  const connectedCount = requirementCoverage.filter((item) => ["current", "transferable", "small_bridge"].includes(item.group)).length;
  const notAssessedCount = requirementCoverage.filter((item) => item.group === "not_assessed").length;
  const decisionHeadline = buildDecisionHeadline(report, pack, subjectLabel);
  const shortestClaimReceipts = claimReceipts(shortestBridge.evidenceClaimIds);
  const shortestRelationshipReceipts = relationshipReceipts(shortestBridge);
  const shortestRequirement = pack.requirements.find((item) => item.id === shortestBridge.currentRequirementId);
  const walkthroughReceipt = report.walkthrough ? citationLedger.byKey.get(personalReceiptKey(report.walkthrough.artifactReference)) : undefined;
  const walkthroughSource = report.walkthrough ? ledger.sources.find((source) => source.id === report.walkthrough?.artifactReference.sourceId) : undefined;
  const codeBridges = report.codeBridges ?? [];
  const vocabulary = [...(report.vocabularyBridges ?? [])].sort((a, b) => {
    const order = { equivalent: 0, narrower: 1, related: 2 };
    return order[a.relation] - order[b.relation];
  });
  const equivalentCount = vocabulary.filter((term) => term.relation === "equivalent").length;
  const roleMatches = matchRoleProfiles(report, pack);
  const postings = matchPostings(report, pack);
  const freshness = packFreshness(pack, report.generatedAt);
  const bestMatch = roleMatches[0];
  const activeMatch = roleMatches.find((match) => match.profile.id === selectedProfileId) ?? bestMatch;

  // Composition of the coverage strip, in fixed group order.
  const composition = coverageOrder
    .map((group) => ({ group, count: requirementCoverage.filter((item) => item.group === group).length }))
    .filter((slice) => slice.count > 0);
  const compositionSummary = composition.map((slice) => `${slice.count} ${coverageLabel[slice.group].toLowerCase()}`).join(", ");

  // Demand rows are ordered by how often the requirement appeared in the
  // reviewed postings, so the chart reads top-down as market demand.
  const demandRows = [...requirementCoverage]
    .map((item) => ({ coverage: item, requirement: pack.requirements.find((candidate) => candidate.id === item.requirementId) }))
    .filter((row): row is { coverage: typeof requirementCoverage[number]; requirement: CurrentPracticePack["requirements"][number] } => Boolean(row.requirement))
    .sort((a, b) => b.requirement.mentionCount - a.requirement.mentionCount || a.requirement.name.localeCompare(b.requirement.name));

  function openReceipt(receipt: CitationReceipt, trigger: HTMLButtonElement) {
    receiptTriggerRef.current = trigger;
    setActiveReceipt(receipt);
  }

  function closeReceipt() {
    setActiveReceipt(null);
    requestAnimationFrame(() => receiptTriggerRef.current?.focus());
  }

  async function saveBridgeCard() {
    try {
      await downloadBridgeCard(report, pack!);
      setActionStatus("Bridge card saved. It contains summary fields only.");
    } catch {
      setActionStatus("This browser could not save the bridge card.");
    }
  }

  async function savePackage() {
    setActionStatus("Building your package…");
    try {
      const result = await downloadBridgePackage(report, ledger, pack!, subjectLabel);
      setActionStatus(`Saved ${result.fileCount} files. Open README.txt first.`);
    } catch {
      setActionStatus("This browser could not build the package. Use Print summary instead.");
    }
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

  return (
    <section className="bridge-report" aria-labelledby="bridge-report-title" ref={reportRef}>
      <section className="report-print-cover" aria-label="Report cover">
        <p className="eyebrow">NotZero Knowledge Bridge</p>
        <h2>{decisionHeadline}</h2>
        <p>{strongestFoundation.existingCapability}</p>
        <dl><div><dt>Highest-leverage bridge</dt><dd>{shortestBridge.title}</dd></div><div><dt>First action</dt><dd>{report.nextSteps[0].title}</dd></div><div><dt>Evidence reviewed</dt><dd>{ledger.claims.length} validated claims and {pack.sources.length} {archetypes ? "representative roles" : "dated market sources"}</dd></div></dl>
        <small>Generated {report.generatedAt.slice(0, 10)} · Market pack {pack.datasetVersion}</small>
      </section>

      <header className="report-masthead">
        <div className="report-masthead-id">
          <p className="eyebrow">{subjectLabel ? `${subjectLabel} · Knowledge Bridge` : "Your Knowledge Bridge"}</p>
          <h3 id="bridge-report-title">{decisionHeadline}</h3>
        </div>
        <dl className="report-masthead-meta">
          <div><dt>Compared against</dt><dd>{pack.targetScope}</dd></div>
          <div><dt>Evidence</dt><dd>{ledger.sources.length} files · {ledger.claims.length} validated claims</dd></div>
          <div><dt>Market pack</dt><dd>{pack.sources.length} {sourcesWord} · {observedVerb} {pack.observedThrough}</dd></div>
          <div><dt>Generated</dt><dd>{report.generatedAt.slice(0, 10)}</dd></div>
        </dl>
        <div className="report-masthead-actions screen-only">
          <button type="button" id="download-report" className="button button-primary" onClick={() => void savePackage()}>Download your package</button>
          <button type="button" className="button button-ghost" onClick={() => window.print()}>Print summary</button>
          <button type="button" className="button button-ghost" onClick={() => void saveBridgeCard()}>Save card</button>
          <small role="status">{actionStatus || "Focused documents plus ready-to-use code"}</small>
        </div>
      </header>

      {generated && <section className="generated-pack-banner" role="note" aria-label="Generated reference notice">
        <strong>Illustrative current-practice reference</strong>
        <p>{generatedBannerText}</p>
      </section>}

      {requirementCoverage.length > 0 && <section className="standing-band" aria-labelledby="standing-title">
        <h4 id="standing-title" className="visually-hidden">Where the evidence stands</h4>
        <div className="standing-headline">
          <p className="standing-count"><strong>{connectedCount}</strong><span>of {requirementCoverage.length}</span></p>
          <p className="standing-label">reviewed requirements already connect to {subjectLabel ? `${subjectLabel}'s` : "your"} evidence</p>
          <p className="standing-note">{notAssessedCount > 0 ? `${notAssessedCount} ${notAssessedCount === 1 ? "requirement was" : "requirements were"} not assessed from this evidence set.` : "Every reviewed requirement received an evidence-based conclusion."}</p>
        </div>

        <figure className="composition" aria-labelledby="composition-caption">
          <div className="composition-bar" role="img" aria-label={`Distribution across ${requirementCoverage.length} reviewed requirements: ${compositionSummary}.`}>
            {composition.map((slice) => (
              <span className="composition-slice" data-group={slice.group} style={{ flexGrow: slice.count }} key={slice.group}>
                <b aria-hidden="true">{slice.count}</b>
              </span>
            ))}
          </div>
          <figcaption id="composition-caption">
            <ul className="composition-legend">
              {composition.map((slice) => (
                <li data-group={slice.group} key={slice.group}>
                  <span className="legend-swatch" aria-hidden="true" />
                  <b>{slice.count}</b>
                  <span className="legend-name">{coverageLabel[slice.group]}</span>
                  <small>{coverageMeaning[slice.group]}</small>
                </li>
              ))}
            </ul>
          </figcaption>
        </figure>

      </section>}

      {bestMatch && <section className="role-match" aria-labelledby="role-match-title">
        <div className="section-intro">
          <p className="eyebrow">Where you land in this market</p>
          <h4 id="role-match-title">
            {`${roleMatches.length} role ${roleMatches.length === 1 ? "profile appears" : "profiles appear"} across the ${pack.sources.length} ${sourceNoun}. ${subjectLabel ? `${subjectLabel}'s` : "Your"} evidence reaches the most in ${bestMatch.profile.title.toLowerCase()}.`}
          </h4>
          <p>Each profile is a group of requirements that showed up together in {archetypes ? "representative roles" : "real postings"}, not a job title we invented. Select any profile to see what it asks for and what is still open.</p>
        </div>

        <div className="profile-tabs" role="tablist" aria-label="Role profiles">
          {roleMatches.map((match) => {
            const selected = match.profile.id === activeMatch.profile.id;
            return (
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                className={selected ? "profile-tab is-selected" : "profile-tab"}
                key={match.profile.id}
                onClick={() => setSelectedProfileId(match.profile.id)}
              >
                <span className="profile-tab-title">{match.profile.title}</span>
                <span className="profile-tab-score"><b>{match.connectedCount}</b> of {match.totalCount} reached</span>
                {match.profile.id === bestMatch.profile.id && <span className="profile-tab-flag">Closest fit</span>}
              </button>
            );
          })}
        </div>

        <div className="profile-detail">
          <div className="profile-summary">
            <p>{activeMatch.profile.summary}</p>
            <p className="profile-emphasis">{activeMatch.profile.emphasis}</p>
            <details className="profile-sources">
              <summary>Derived from {activeMatch.postingCount} {sourceUnit(activeMatch.postingCount)}</summary>
              <ul>
                {activeMatch.profile.sourceIds.map((sourceId) => {
                  const source = pack.sources.find((item) => item.id === sourceId);
                  if (!source) return null;
                  return <li key={sourceId}><a href={source.url} target="_blank" rel="noreferrer">{source.employer}, {source.roleTitle}</a><span>{source.location} · {observedVerb} {source.observedAt}</span></li>;
                })}
              </ul>
            </details>
          </div>

          <ol className="profile-requirements" aria-label={`What ${activeMatch.profile.title} asks for`}>
            {[...activeMatch.connected, ...activeMatch.bridges, ...activeMatch.open].map((row) => (
              <li data-group={row.group} key={row.requirementId}>
                <span className="profile-req-state" aria-hidden="true" />
                <div>
                  <strong>{row.name}</strong>
                  <small>{coverageLabel[row.group as CoverageGroup]} · named in {row.mentionCount} of {pack.sources.length} {sourcesWord}</small>
                </div>
              </li>
            ))}
          </ol>

        {activeMatch.open.length > 0 ? (
          <div className="gap-plan">
            <h5>What is still open for {activeMatch.profile.title.toLowerCase()}</h5>
            <table>
              <thead><tr><th scope="col">Not yet evidenced</th><th scope="col">What we recommend</th><th scope="col">Why we say that</th></tr></thead>
              <tbody>
                {activeMatch.open.map((row) => {
                  const phase = report.roadmap?.phases.find((item) => item.unlocksRequirementIds.includes(row.requirementId));
                  return (
                    <tr key={row.requirementId}>
                      <th scope="row">{row.name}<small>{coverageLabel[row.group as CoverageGroup]}</small></th>
                      <td>{phase ? <><b>Step {phase.order}. {phase.title}</b><span>{phase.buildArtifact}</span></> : row.recommendedAction ?? "Add a dated artifact for this requirement, then run the comparison again."}</td>
                      <td>{row.context}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="gap-plan-clear">Every requirement in this profile already connects to the evidence. The remaining work is depth rather than coverage.</p>
        )}
        </div>
      </section>}

      <section className="shortest-bridge" aria-labelledby="shortest-bridge-title">
        <div className="shortest-bridge-heading">
          <p className="eyebrow">Start here · the shortest bridge</p>
          <h4 id="shortest-bridge-title">{shortestBridge.title}</h4>
          <p>{shortestBridge.explanation}<span className="inline-citations">{markers([...shortestClaimReceipts, ...shortestRelationshipReceipts])}</span></p>
        </div>
        <ol className="bridge-flow" aria-label="How this bridge is crossed">
          <li className="bridge-flow-step" data-step="keep">
            <span className="bridge-flow-label">You already have</span>
            <p>{shortestBridge.existingCapability}<span className="inline-citations">{markers(shortestClaimReceipts)}</span></p>
          </li>
          <li className="bridge-flow-link" aria-hidden="true">
            <span>{shortestBridge.relationshipType ? humanize(shortestBridge.relationshipType) : "connects to"}</span>
          </li>
          <li className="bridge-flow-step" data-step="add">
            <span className="bridge-flow-label">What is actually new</span>
            <ul className="concept-chips">{shortestBridge.newConcepts.map((concept) => <li key={concept}>{concept}</li>)}</ul>
            {shortestRequirement && <small className="bridge-flow-demand">{shortestRequirement.mentionCount} of {pack.sources.length} {sourceNoun} ask for {shortestRequirement.name.toLowerCase()}<span className="inline-citations">{markers(shortestRelationshipReceipts)}</span></small>}
          </li>
          <li className="bridge-flow-link" aria-hidden="true">
            <span>prove it with</span>
          </li>
          <li className="bridge-flow-step" data-step="prove">
            <span className="bridge-flow-label">Smallest useful proof</span>
            <p>{shortestBridge.recommendedAction}</p>
          </li>
        </ol>
      </section>

      {requirementCoverage.length > 0 && <section className="requirement-map" aria-labelledby="requirement-map-title">
        <div className="section-intro">
          <p className="eyebrow">The full picture</p>
          <h4 id="requirement-map-title">Every reviewed requirement, one conclusion each</h4>
          <p>Bar length is how many of the {pack.sources.length} {sourceNoun} named that requirement. Colour is the conclusion drawn from {subjectLabel ? `${subjectLabel}'s` : "your"} evidence. Open a row for the reasoning behind it.</p>
        </div>
        <div className="requirement-rows">
          <div className="requirement-legend" aria-hidden="true">
            <span>Requirement</span>
            <span>Named in {sourceNoun}</span>
            <span>Conclusion</span>
          </div>
          {demandRows.map(({ coverage, requirement }) => {
            const finding = coverage.findingId ? report.findings.find((candidate) => candidate.id === coverage.findingId) : undefined;
            const share = (requirement.mentionCount / pack.sources.length) * 100;
            const demand = (
              <div className="demand-meter">
                <span className="demand-meter-track" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
                <small>{requirement.mentionCount}<i>/{pack.sources.length}</i></small>
              </div>
            );
            if (!finding) {
              return (
                <div className="requirement-row requirement-row-static" data-group="not_assessed" key={coverage.requirementId}>
                  <div className="requirement-row-head">
                    <div className="requirement-row-title"><strong>{requirement.name}</strong><small>Not assessed from this evidence set</small></div>
                    {demand}
                    <span className="demand-group" data-group="not_assessed">Not assessed</span>
                    <span className="row-chevron-slot" aria-hidden="true" />
                  </div>
                </div>
              );
            }
            const claims = finding.evidenceClaimIds.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
            const personalReceiptList = claimReceipts(finding.evidenceClaimIds);
            const marketAndTechnicalReceipts = relationshipReceipts(finding);
            const findingReceipts = uniqueReceipts([...personalReceiptList, ...marketAndTechnicalReceipts]);
            const artifactReceipt = finding.artifactReference ? citationLedger.byKey.get(personalReceiptKey(finding.artifactReference)) : undefined;
            return (
              <details className="requirement-row" id={`role-map-${finding.id}`} tabIndex={-1} data-group={finding.group} key={coverage.requirementId}>
                <summary>
                  <div className="requirement-row-head">
                    <div className="requirement-row-title"><strong>{requirement.name}</strong><small>{finding.title}</small></div>
                    {demand}
                    <span className="demand-group" data-group={finding.group}>{groupLabel[finding.group]}</span>
                    <span className="row-chevron" aria-hidden="true" />
                  </div>
                </summary>
                <div className="requirement-row-body">
                  <div className="requirement-columns">
                    <div className="requirement-column" data-side="yours"><span>{subjectLabel ? `What ${subjectLabel} has` : "What you have"}</span><p>{finding.existingCapability}<span className="inline-citations">{markers(personalReceiptList)}</span></p></div>
                    <div className="requirement-column" data-side="market"><span>{finding.relationshipType ? `Current practice — ${humanize(finding.relationshipType)}` : "Current practice"}</span><p>{finding.modernCounterpart}<span className="inline-citations">{markers(marketAndTechnicalReceipts)}</span></p></div>
                  </div>
                  {finding.newConcepts.length > 0 && <div className="requirement-new"><span>New to learn</span><ul className="concept-chips">{finding.newConcepts.map((concept) => <li key={concept}>{concept}</li>)}</ul></div>}
                  <div className="requirement-action"><span>Smallest useful proof</span><p>{finding.recommendedAction}</p></div>
                  <details className="finding-receipts">
                    <summary>Why this conclusion? · {findingReceipts.length} evidence {findingReceipts.length === 1 ? "item" : "items"} · {finding.confidence} confidence</summary>
                    <div className="finding-receipts-body">
                      <p className="finding-explanation">{finding.explanation}<span className="inline-citations">{markers(findingReceipts)}</span></p>
                      <div className="finding-evidence"><strong>{subjectLabel ? `Evidence from ${subjectLabel}'s materials` : "Evidence from your materials"}</strong>{claims.map((claim) => <div key={claim.id}><p><b>{claim.title}</b> {claim.statement}</p>{claim.references.map((reference) => <code key={`${claim.id}-${reference.locator.path}-${reference.locator.value}`}>{reference.locator.path} · {humanize(reference.locator.kind)}: {reference.locator.value}</code>)}</div>)}</div>
                      {finding.artifactReference && <blockquote className="finding-artifact"><p>&ldquo;{finding.artifactReference.excerpt}&rdquo; {artifactReceipt && <span className="inline-citations">{markers([artifactReceipt])}</span>}</p><cite>{finding.artifactReference.locator.path} · {humanize(finding.artifactReference.locator.kind)}: {finding.artifactReference.locator.value}</cite></blockquote>}
                      <div className="why-used"><strong>Why this practice is used</strong><p>{finding.whyItIsUsed}</p></div>
                      {finding.manualStepsChanged.length > 0 && <div className="manual-change"><strong>What the newer practice changes</strong><ul>{finding.manualStepsChanged.map((step) => <li key={step}>{step}</li>)}</ul></div>}
                      <div className="finding-provenance"><span className={`comparison-state state-${finding.comparisonState}`}>{finding.comparisonState}</span><div>{finding.relationshipEvidence.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.sourceId}>{source.sourceKind === "official_documentation" ? "Official documentation" : "Market source"}</a>)}</div></div>
                      <p className="finding-limit">Limit: {finding.limitations[0]}</p>
                    </div>
                  </details>
                </div>
              </details>
            );
          })}
        </div>
      </section>}

      {vocabulary.length > 0 && <section className="vocabulary" aria-labelledby="vocabulary-title">
        <div className="section-intro">
          <p className="eyebrow">Your words, their words</p>
          <h4 id="vocabulary-title">{equivalentCount} of these {vocabulary.length} are the same practice under a different name</h4>
          <p>Job posts are written in professional vocabulary. Most of what looks unfamiliar is something already in {subjectLabel ? `${subjectLabel}'s` : "your"} files. Where a term means more than what the evidence shows, this says so rather than flattering the match.</p>
        </div>
        <ul className="vocabulary-list">
          {vocabulary.map((term) => {
            const requirement = term.requirementId ? pack.requirements.find((item) => item.id === term.requirementId) : undefined;
            return (
              <li data-relation={term.relation} key={term.id}>
                <div className="vocabulary-pair">
                  <div className="vocabulary-yours">
                    <span>What you wrote</span>
                    <p>{term.yourTerm}</p>
                    <code>{term.sourcePath}</code>
                  </div>
                  <div className="vocabulary-link" aria-hidden="true"><i /></div>
                  <div className="vocabulary-theirs">
                    <span>What job posts call it</span>
                    <p><b>{term.industryTerm}</b></p>
                    {requirement && <code>{requirement.mentionCount} of {pack.sources.length} {sourcesWord}</code>}
                  </div>
                </div>
                <div className="vocabulary-note">
                  <span className="relation-chip" data-relation={term.relation}>{vocabularyRelationLabel[term.relation]}</span>
                  <p>{term.note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>}

      {codeBridges.length > 0 && <section className="code-bridges" aria-labelledby="code-bridges-title">
        <div className="section-intro">
          <p className="eyebrow">Your code, then and now</p>
          <h4 id="code-bridges-title">The same problem, written the way teams write it today</h4>
          <p>Every panel on the left is quoted from {subjectLabel ? `${subjectLabel}'s` : "your"} uploaded files with its path and line numbers. Panels on the right were written for this report and are labelled by how far they have been checked.</p>
        </div>
        <ol className="code-bridge-list">
          {codeBridges.map((bridge, index) => {
            const claim = ledger.claims.find((item) => item.id === bridge.claimId);
            const bridgeReceipts = claimReceipts([bridge.claimId]);
            const requirement = pack.requirements.find((item) => item.id === bridge.requirementId);
            const lineRange = bridge.observed.startLine
              ? `lines ${bridge.observed.startLine}${bridge.observed.endLine && bridge.observed.endLine !== bridge.observed.startLine ? `–${bridge.observed.endLine}` : ""}`
              : null;
            return (
              <li className="code-bridge" data-state={bridge.comparisonState} key={bridge.id}>
                <header className="code-bridge-head">
                  <span className="code-bridge-index" aria-hidden="true">{index + 1}</span>
                  <div>
                    <h5>{bridge.title}</h5>
                    {requirement && <p className="code-bridge-requirement">Answers <b>{requirement.name}</b>, named in {requirement.mentionCount} of {pack.sources.length} {sourceNoun}</p>}
                  </div>
                  <span className="relationship-chip" data-relationship={bridge.relationshipType}>{humanize(bridge.relationshipType)}</span>
                </header>

                <div className="code-bridge-grid">
                  <article className="code-side" data-side="observed">
                    <header>
                      <div>
                        <span className="code-side-label">{bridge.observed.label}</span>
                        <code className="code-side-path">{bridge.observed.path}{lineRange ? ` · ${lineRange}` : ""}</code>
                      </div>
                      <div className="code-side-tags">
                        {bridge.observed.date && <time dateTime={bridge.observed.date}>{bridge.observed.date}</time>}
                        <span className="code-lang">{codeLanguageLabel(bridge.observed.language)}</span>
                      </div>
                    </header>
                    <CodePanel code={bridge.observed.code} language={bridge.observed.language} startLine={bridge.observed.startLine} label={`${bridge.observed.path}, quoted from the uploaded file`} />
                    <div className="code-side-note">
                      <strong>What this proves</strong>
                      <p>{bridge.demonstrates}<span className="inline-citations">{markers(bridgeReceipts)}</span></p>
                      {claim && <small>Evidence class: {humanize(claim.evidenceClass)} · {claim.confidence} confidence</small>}
                    </div>
                  </article>

                  <div className="code-bridge-link" aria-hidden="true"><i /></div>

                  <article className="code-side" data-side="modern">
                    <header>
                      <div>
                        <span className="code-side-label">{bridge.modern.label}</span>
                        <code className="code-side-path">{pack.observedThrough} practice</code>
                      </div>
                      <div className="code-side-tags">
                        <span className={`comparison-state state-${bridge.comparisonState}`}>{bridge.comparisonState}</span>
                        <span className="code-lang">{codeLanguageLabel(bridge.modern.language)}</span>
                      </div>
                    </header>
                    <CodePanel code={bridge.modern.code} language={bridge.modern.language} label={`${bridge.modern.label}, written for this report`} />
                    <div className="code-side-note">
                      <strong>Why teams do it this way</strong>
                      <p>{bridge.whyItMatters}</p>
                      <small>{bridge.modern.caption}</small>
                    </div>
                  </article>
                </div>

                <div className="code-bridge-delta">
                  <div data-delta="transfers">
                    <strong>Transfers unchanged</strong>
                    <ul className="concept-chips">{bridge.whatTransfers.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                  <div data-delta="new">
                    <strong>Genuinely new</strong>
                    <ul className="concept-chips">{bridge.whatIsNew.map((item) => <li key={item}>{item}</li>)}</ul>
                  </div>
                </div>
                <p className="finding-limit">Limit: {bridge.limitations[0]}</p>
              </li>
            );
          })}
        </ol>
      </section>}

      <CurriculumProgram report={report} ledger={ledger} pack={pack} subjectLabel={subjectLabel} />

      <section className="upgrade-challenge" aria-labelledby="challenge-title">
        <div><p className="eyebrow">Use work you already have</p><h4 id="challenge-title">{report.upgradeChallenge.title}</h4><p>{report.upgradeChallenge.objective}</p></div>
        <ol>{report.upgradeChallenge.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      {report.walkthrough && <section className="walkthrough" aria-labelledby="walkthrough-title">
        <div className="walkthrough-heading">
          <div><p className="eyebrow">Straight from the project</p><h4 id="walkthrough-title">{report.walkthrough.title}</h4></div>
          <span className={`comparison-state state-${report.walkthrough.comparisonState}`}>{report.walkthrough.comparisonState}</span>
        </div>
        <div className="walkthrough-grid" role="group" aria-label="Dated project and current-practice comparison">
          <article className="walkthrough-observed">
            <header><span>{subjectLabel ? `In ${subjectLabel}'s project` : "In your project"}</span>{walkthroughSource?.date && <time dateTime={walkthroughSource.date}>{walkthroughSource.date}</time>}</header>
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
      </section>}

      {report.walkthroughUnavailableReason && <section className="walkthrough walkthrough-unavailable" aria-label="Project walkthrough unavailable"><p>{report.walkthroughUnavailableReason}</p></section>}

      <section className="openings" aria-labelledby="openings-title">
        <div className="section-intro">
          <p className="eyebrow">The actual openings behind the numbers</p>
          <h4 id="openings-title">Every {archetypes ? "representative role" : "posting"} in this comparison, scored against {subjectLabel ? `${subjectLabel}'s` : "your"} evidence</h4>
          <p>Requirement counts come from these {pack.sources.length} {sourcesWord}. Here they are individually, closest first, so the sample is something you can check rather than a number to trust. Reading a {archetypes ? "role and its live search" : "posting"} you already reach is the fastest way to see which words to use. The sample mixes experience levels, shown on each one, so a count is the direction the work is moving, not a checklist for a single entry-level role.</p>
        </div>
        <ol className="opening-list">
          {postings.map((posting) => {
            const within = posting.reached.length + posting.bridge.length;
            return (
              <li className="opening" key={posting.id}>
                <div className="opening-head">
                  <div className="opening-id">
                    <h5>{posting.employer}</h5>
                    <p>{posting.roleTitle}</p>
                    <small>{posting.location} · {seniorityText(posting.seniority)} · {observedVerb} {posting.observedAt}</small>
                  </div>
                  <div className="opening-score">
                    <span className="opening-score-count"><b>{within}</b>of {posting.total}</span>
                    <span className="opening-score-label">requirements reached</span>
                    <span className="opening-meter" aria-hidden="true">
                      {posting.reached.length > 0 && <i data-band="reached" style={{ flexGrow: posting.reached.length }} />}
                      {posting.bridge.length > 0 && <i data-band="bridge" style={{ flexGrow: posting.bridge.length }} />}
                      {posting.open.length > 0 && <i data-band="open" style={{ flexGrow: posting.open.length }} />}
                    </span>
                  </div>
                  <a className="opening-link" href={posting.url} target="_blank" rel="noreferrer">{archetypes ? "Open a live search" : "Open the posting"}</a>
                </div>
                <dl className="opening-requirements">
                  {posting.reached.length > 0 && <div data-band="reached"><dt>Already evidenced</dt><dd>{posting.reached.map((row) => row.name).join(", ")}</dd></div>}
                  {posting.bridge.length > 0 && <div data-band="bridge"><dt>One bridge away</dt><dd>{posting.bridge.map((row) => row.name).join(", ")}</dd></div>}
                  {posting.open.length > 0 && <div data-band="open"><dt>Still open</dt><dd>{posting.open.map((row) => row.name).join(", ")}</dd></div>}
                </dl>
              </li>
            );
          })}
        </ol>
        <p className="openings-limit">{openingsLimitText} Reaching every requirement in one is not a promise of an interview, and missing one is not a disqualification.</p>
      </section>

      <section className="shelf-life" aria-labelledby="shelf-life-title">
        <div className="shelf-life-body">
          <p className="eyebrow">Read the date on this</p>
          <h4 id="shelf-life-title">This plan expires. That is the point.</h4>
          <p>
            {`Everything above was measured against ${freshness.sourceCount} ${sourcesWord} ${observedVerb} on ${freshness.observedThrough}${archetypes ? "" : " and documentation checked around the same week"}. A fixed curriculum keeps teaching its original answer for years. This one is re-derived each time it runs, so the same files uploaded after ${freshness.nextReview} can produce a different shortest bridge, a different reading list, and a different set of hours.`}
          </p>
          <p>Nothing here claims your foundations expire. Those are the part that keeps. What moves is the tooling on top of them, and that is the only thing this document dates.</p>
        </div>
        <dl className="shelf-life-meta">
          <div><dt>Market pack</dt><dd>{freshness.datasetVersion}</dd></div>
          <div><dt>Sources observed</dt><dd>{freshness.observedThrough}</dd></div>
          <div><dt>Report age at generation</dt><dd>{freshness.ageDays === 0 ? "Same day" : `${freshness.ageDays} ${freshness.ageDays === 1 ? "day" : "days"}`}</dd></div>
          <div><dt>Next scheduled re-observation</dt><dd>{freshness.nextReview}</dd></div>
        </dl>
      </section>

      <section className="report-provenance" aria-label="How this result was checked">
        <p className="eyebrow">How this result was checked</p>
        <div className="provenance-grid">
          <details id="trust-claims"><summary>{ledger.claims.length} file-backed claims</summary><div><p>Each claim points to a source, stable locator, and exact excerpt. Unsupported conclusions remain unknown.</p><a href="#evidence-appendix">Inspect the evidence appendix</a></div></details>
          <details id="trust-market"><summary>{pack.sources.length} {archetypes ? "generated role archetypes" : webSearched ? "located job postings" : "dated market sources"}</summary><div><p>{trustMarketText}</p></div></details>
          <details id="trust-version"><summary>Reproducible inputs · {pack.datasetVersion}</summary><div><p>The report records its analysis version, schema version, market dataset, and generation date.</p></div></details>
          <details id="trust-validation"><summary>{report.analysisMode === "live_gpt_5_6" ? "GPT-5.6 plus validation" : "Prepared fixture plus validation"}</summary><div><p>Typed schemas, known claim IDs, dated market literals, and project locators are checked before display.</p></div></details>
          <details className="market-method"><summary>How the market comparison was produced</summary>
            <div className="market-method-body">
              <div><h5>Method</h5><ul>{pack.methodology.map((item) => <li key={item}>{item}</li>)}</ul></div>
              <div><h5>{archetypes ? "Representative roles (generated)" : webSearched ? "Located postings (generated)" : "Reviewed sources"}</h5><ul>{pack.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.employer}, {source.roleTitle}</a><span>{source.location} · {observedVerb} {source.observedAt}</span></li>)}</ul></div>
              <div><h5>Limits</h5><ul>{[...pack.limitations, ...report.limitations].map((item) => <li key={item}>{item}</li>)}</ul></div>
            </div>
          </details>
          <details className="difference-method screen-only"><summary>What makes this different from asking a chatbot</summary>
            <div><p>A chat can produce similar prose. NotZero adds an inspectable method and a keepable result.</p><ul><li><a href="#trust-claims">Claims resolve to submitted evidence.</a></li><li><a href="#trust-market">Market comparisons use a dated source pack.</a></li><li><a href="#evidence-appendix">Evidence classes separate demonstrated, inferred, and unknown.</a></li><li><a href="#shortest-bridge-title">The learning delta is explicit.</a></li><li><a href="#challenge-title">The result ends in a project-grounded proof task.</a></li><li><a href="#download-report">The same validated payload becomes the downloadable report.</a></li></ul></div>
          </details>
        </div>
      </section>

      {activeReceipt && <div className="receipt-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeReceipt(); }}>
        <aside className="receipt-panel" ref={receiptPanelRef} role="dialog" aria-modal="true" aria-labelledby="receipt-panel-title">
          <header><div><p className="eyebrow">Evidence {activeReceipt.number}</p><h4 id="receipt-panel-title">{activeReceipt.title}</h4></div><button type="button" ref={receiptCloseRef} onClick={closeReceipt} aria-label="Close evidence receipt">Close</button></header>
          <div className="receipt-panel-meta"><span>{activeReceipt.sourceName}</span>{activeReceipt.date && <span>{activeReceipt.date}</span>}{activeReceipt.evidenceClass && <span>{activeReceipt.evidenceClass}</span>}{activeReceipt.confidence && <span>{activeReceipt.confidence} confidence</span>}</div>
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
