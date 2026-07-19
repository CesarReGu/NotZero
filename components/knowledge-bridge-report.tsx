"use client";

import { useState } from "react";
import type { BridgeFinding, EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";
import { currentPracticePackById } from "@/lib/market/current-practice";

const groupLabel: Record<BridgeFinding["group"], string> = {
  current: "Current",
  transferable: "Transferable",
  small_bridge: "Small bridge",
  genuine_gap: "Genuine gap",
  insufficient_evidence: "Insufficient evidence",
};

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

export function KnowledgeBridgeReportView({ report, ledger, subjectLabel }: { report: KnowledgeBridgeReport; ledger: EvidenceLedger; subjectLabel?: string }) {
  const pack = currentPracticePackById(report.currentPracticePackId);
  const [filter, setFilter] = useState<FindingFilter>("all");
  if (!pack || pack.datasetVersion !== report.datasetVersion) return <section className="analysis-state analysis-error" role="alert"><strong>This report&apos;s dated market pack is unavailable.</strong><p>NotZero will not render conclusions against a different dataset version.</p></section>;
  const supportedStrengths = report.counts.current + report.counts.transferable;
  const possessive = subjectLabel ? `${subjectLabel}'s` : "Your";
  const shortestBridge = report.findings.find((finding) => finding.group === "small_bridge") ?? report.findings.find((finding) => finding.group === "transferable") ?? report.findings[0];
  const visibleFindings = filter === "all" ? report.findings : report.findings.filter((finding) => filterGroups[filter].includes(finding.group));
  const filterOptions: { id: FindingFilter; label: string; count: number }[] = [
    { id: "all", label: "All conclusions", count: report.findings.length },
    { id: "strengths", label: "Supported strengths", count: supportedStrengths },
    { id: "bridges", label: "Bridges", count: report.counts.smallBridge },
    { id: "gaps", label: "Genuine gaps", count: report.counts.genuineGap },
    { id: "unknowns", label: "Unknowns", count: report.counts.insufficientEvidence },
  ];

  return (
    <section className="bridge-report" aria-labelledby="bridge-report-title">
      <header className="bridge-report-header">
        <div>
          <p className="eyebrow">Knowledge Bridge Graph</p>
          <h3 id="bridge-report-title">{possessive} evidence supports {supportedStrengths} foundations and a practical bridge into this role.</h3>
          <p>NotZero compared the submitted evidence with {pack.sources.length} reviewed roles in {pack.locationScope}. The result separates supported foundations from genuine new learning and areas where more evidence would help.</p>
        </div>
        <span className="report-date">Market pack<br /><strong>{pack.observedThrough}</strong></span>
      </header>

      <div className="report-trust-strip" aria-label="How this result was checked">
        <span>{ledger.claims.length} claims checked against submitted files</span>
        <span>{pack.sources.length} dated market sources</span>
        <span>{pack.datasetVersion}</span>
        <span>{report.analysisMode === "live_gpt_5_6" ? "GPT-5.6 plus server validation" : "Prepared fixture plus server validation"}</span>
      </div>

      <div className="report-actions screen-only">
        <button type="button" className="button button-secondary" onClick={() => window.print()}>Download report (PDF)</button>
        <span>Choose Save as PDF in the print dialog. The downloaded report uses this validated result.</span>
      </div>

      <div className="report-counts" aria-label="Knowledge Bridge result counts">
        <div data-group="strengths"><strong>{supportedStrengths}</strong><span>Supported strengths</span><small>Useful foundations already visible</small></div>
        <div data-group="small_bridge"><strong>{report.counts.smallBridge}</strong><span>Practical bridges</span><small>Small additions with high leverage</small></div>
        <div data-group="genuine_gap"><strong>{report.counts.genuineGap}</strong><span>Genuine gaps</span><small>Important areas with no direct foundation</small></div>
        <div data-group="insufficient_evidence"><strong>{report.counts.insufficientEvidence}</strong><span>Unknowns</span><small>More evidence would change the answer</small></div>
      </div>

      <section className="shortest-bridge" aria-labelledby="shortest-bridge-title">
        <div className="shortest-bridge-heading"><p className="eyebrow">Your shortest bridge</p><h4 id="shortest-bridge-title">{shortestBridge.title}</h4><p>{shortestBridge.explanation}</p></div>
        <div className="shortest-bridge-path">
          <div><span>Keep</span><p>{shortestBridge.existingCapability}</p></div>
          <div><span>Add</span><p>{shortestBridge.newConcepts.join(", ") || shortestBridge.modernCounterpart}</p></div>
          <div><span>Prove</span><p>{shortestBridge.recommendedAction}</p></div>
        </div>
      </section>

      <section className="next-steps" aria-labelledby="next-steps-title">
        <p className="eyebrow">Your next moves</p>
        <h4 id="next-steps-title">Three steps, ordered by learning delta</h4>
        <ol>{report.nextSteps.map((step) => <li key={step.rank}><span>{step.rank}</span><div><strong>{step.title}</strong><p>{step.whyNow}</p><small>Proof: {step.proof}</small></div></li>)}</ol>
      </section>

      <section className="upgrade-challenge" aria-labelledby="challenge-title">
        <div><p className="eyebrow">Use work you already have</p><h4 id="challenge-title">{report.upgradeChallenge.title}</h4><p>{report.upgradeChallenge.objective}</p></div>
        <ol>{report.upgradeChallenge.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      <div className="bridge-findings">
        <p className="eyebrow">Role map</p>
        <h4>{report.findings.length} evidence-based conclusions</h4>
        <div className="finding-filters" aria-label="Filter conclusions">
          {filterOptions.map((option) => <button type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)} key={option.id}>{option.label}<span>{option.count}</span></button>)}
        </div>
        {filter !== "all" && <p className="filter-note" role="status">Showing {visibleFindings.length} of {report.findings.length} conclusions. Choose All conclusions to restore the complete narrative.</p>}
        <div className="filtered-findings">
        {visibleFindings.map((finding) => {
          const requirement = pack.requirements.find((item) => item.id === finding.currentRequirementId);
          const claims = finding.evidenceClaimIds.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
          const evidenceCount = claims.reduce((count, claim) => count + claim.references.length, 0) + finding.relationshipEvidence.length;
          return (
            <details className="bridge-finding" data-group={finding.group} key={finding.id}>
              <summary>
                <span className="finding-index" aria-hidden="true">{String(report.findings.indexOf(finding) + 1).padStart(2, "0")}</span>
                <div><span>{groupLabel[finding.group]}{finding.relationshipType ? ` · ${humanize(finding.relationshipType)}` : ""}</span><strong>{finding.title}</strong></div>
                <small aria-label={`${finding.confidence} confidence`}>{finding.confidence} confidence</small>
              </summary>
              <div className="finding-body">
                <div className="finding-connection">
                  <div><span>{subjectLabel ? `What ${subjectLabel} already knows` : "Your existing foundation"}</span><p>{finding.existingCapability}</p></div>
                  <strong>{finding.relationshipType ? humanize(finding.relationshipType) : "compare with"}</strong>
                  <div><span>Modern counterpart</span><p>{finding.modernCounterpart}</p></div>
                </div>

                <div className="learning-delta">
                  <div><span>What transfers</span><ul>{finding.transferableConcepts.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <div><span>What is actually new</span><ul>{finding.newConcepts.map((item) => <li key={item}>{item}</li>)}</ul></div>
                </div>

                <div className="finding-action"><span>Smallest useful proof</span><p>{finding.recommendedAction}</p></div>
                <details className="finding-receipts">
                  <summary>{evidenceCount} evidence items · Why this conclusion?</summary>
                  <div className="finding-receipts-body">
                    <p className="finding-explanation">{finding.explanation}</p>
                    <div className="finding-evidence"><strong>{subjectLabel ? `Evidence from ${subjectLabel}'s materials` : "Evidence from your materials"}</strong>{claims.map((claim) => <div key={claim.id}><p><b>{claim.title}</b> {claim.statement}</p>{claim.references.map((reference) => <code key={`${claim.id}-${reference.locator.path}-${reference.locator.value}`}>{reference.locator.path} · {humanize(reference.locator.kind)}: {reference.locator.value}</code>)}</div>)}</div>
                    {requirement && <div className="market-frequency"><strong>{requirement.mentionCount} of {pack.sources.length}</strong><span>reviewed postings explicitly mentioned {requirement.name.toLowerCase()}</span></div>}
                    {finding.artifactReference && <blockquote className="finding-artifact"><p>&ldquo;{finding.artifactReference.excerpt}&rdquo;</p><cite>{finding.artifactReference.locator.path} · {humanize(finding.artifactReference.locator.kind)}: {finding.artifactReference.locator.value}</cite></blockquote>}
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
        <div className="walkthrough-grid">
          <div className="walkthrough-observed"><span>{subjectLabel ? `Observed in ${subjectLabel}'s project` : "In your project"}</span><p>{report.walkthrough.observedImplementation}</p><code>{report.walkthrough.artifactReference.locator.path} · {report.walkthrough.artifactReference.locator.value}</code></div>
          <div className="walkthrough-counterpart"><span>Modern counterpart</span><p>{report.walkthrough.modernCounterpart}</p>{report.walkthrough.illustrativeSketch && <pre><code>{report.walkthrough.illustrativeSketch}</code></pre>}</div>
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

      <footer className="report-print-footer">
        <span>Analysis {report.analysisVersion}</span>
        <span>Generated {report.generatedAt.slice(0, 10)}</span>
        <span>Market pack {pack.datasetVersion}</span>
        <p>NotZero interprets the evidence and dated sources available to it. It does not certify mastery or guarantee job eligibility.</p>
      </footer>
    </section>
  );
}
