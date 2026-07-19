"use client";

import { useState } from "react";
import type { BridgeFinding, EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";
import { softwareBackendPracticePack } from "@/lib/market/current-practice";

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

export function KnowledgeBridgeReportView({ report, ledger }: { report: KnowledgeBridgeReport; ledger: EvidenceLedger }) {
  const pack = softwareBackendPracticePack;
  const [filter, setFilter] = useState<FindingFilter>("all");
  const supportedStrengths = report.counts.current + report.counts.transferable;
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
          <h3 id="bridge-report-title">Alex already has {supportedStrengths} supported strengths and a practical bridge into this role.</h3>
          <p>NotZero compared dated evidence with {pack.sources.length} reviewed roles in Mexico and remote Latin America. The result separates supported foundations from genuine new learning and areas where more evidence would help.</p>
        </div>
        <span className="report-date">Market pack<br /><strong>{pack.observedThrough}</strong></span>
      </header>

      <div className="report-counts" aria-label="Knowledge Bridge result counts">
        <div data-group="strengths"><strong>{supportedStrengths}</strong><span>Supported strengths</span></div>
        <div data-group="small_bridge"><strong>{report.counts.smallBridge}</strong><span>Small bridge</span></div>
        <div data-group="genuine_gap"><strong>{report.counts.genuineGap}</strong><span>Genuine gap</span></div>
        <div data-group="insufficient_evidence"><strong>{report.counts.insufficientEvidence}</strong><span>Unknown</span></div>
      </div>

      <div className="bridge-findings">
        <h4>Five evidence-based conclusions</h4>
        <div className="finding-filters" aria-label="Filter conclusions">
          {filterOptions.map((option) => <button type="button" aria-pressed={filter === option.id} onClick={() => setFilter(option.id)} key={option.id}>{option.label}<span>{option.count}</span></button>)}
        </div>
        {filter !== "all" && <p className="filter-note" role="status">Showing {visibleFindings.length} of {report.findings.length} conclusions. Choose All conclusions to restore the complete narrative.</p>}
        <div className="filtered-findings">
        {visibleFindings.map((finding) => {
          const requirement = pack.requirements.find((item) => item.id === finding.currentRequirementId);
          const claims = finding.evidenceClaimIds.map((id) => ledger.claims.find((claim) => claim.id === id)).filter((claim) => claim !== undefined);
          return (
            <details className="bridge-finding" data-group={finding.group} key={finding.id} open={finding.group === "small_bridge"}>
              <summary>
                <span className="finding-index" aria-hidden="true">{String(report.findings.indexOf(finding) + 1).padStart(2, "0")}</span>
                <div><span>{groupLabel[finding.group]}</span><strong>{finding.title}</strong><p>{finding.explanation}</p></div>
                <small>{finding.confidence} confidence</small>
              </summary>
              <div className="finding-body">
                <div className="finding-connection">
                  <div><span>What Alex already knows</span><p>{finding.existingCapability}</p></div>
                  <strong>{finding.relationshipType ? humanize(finding.relationshipType) : "compare with"}</strong>
                  <div><span>Modern counterpart</span><p>{finding.modernCounterpart}</p></div>
                </div>

                <div className="finding-evidence">
                  <strong>Evidence from Alex&apos;s materials</strong>
                  {claims.map((claim) => <div key={claim.id}><p><b>{claim.title}</b> {claim.statement}</p>{claim.references.map((reference) => <code key={`${claim.id}-${reference.locator.path}-${reference.locator.value}`}>{reference.locator.path} · {humanize(reference.locator.kind)}: {reference.locator.value}</code>)}</div>)}
                </div>

                {requirement && (
                  <div className="market-frequency">
                    <strong>{requirement.mentionCount} of {pack.sources.length}</strong>
                    <span>reviewed postings explicitly mentioned {requirement.name.toLowerCase()}</span>
                  </div>
                )}

                {finding.artifactReference && (
                  <blockquote className="finding-artifact">
                    <p>&ldquo;{finding.artifactReference.excerpt}&rdquo;</p>
                    <cite>{finding.artifactReference.locator.path} · {humanize(finding.artifactReference.locator.kind)}: {finding.artifactReference.locator.value}</cite>
                  </blockquote>
                )}

                <div className="learning-delta">
                  <div><span>What transfers</span><ul>{finding.transferableConcepts.map((item) => <li key={item}>{item}</li>)}</ul></div>
                  <div><span>What is actually new</span><ul>{finding.newConcepts.map((item) => <li key={item}>{item}</li>)}</ul></div>
                </div>

                <div className="why-used"><strong>Why this practice is used</strong><p>{finding.whyItIsUsed}</p></div>

                {finding.manualStepsChanged.length > 0 && <div className="manual-change"><strong>What the newer practice changes</strong><ul>{finding.manualStepsChanged.map((item) => <li key={item}>{item}</li>)}</ul></div>}

                <div className="finding-action"><span>Smallest useful proof</span><p>{finding.recommendedAction}</p></div>
                <div className="finding-provenance">
                  <span className={`comparison-state state-${finding.comparisonState}`}>{finding.comparisonState}</span>
                  <div>{finding.relationshipEvidence.map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.sourceId}>{source.sourceKind === "official_documentation" ? "Official documentation" : "Market source"}</a>)}</div>
                </div>
                <p className="finding-limit">Limit: {finding.limitations[0]}</p>
              </div>
            </details>
          );
        })}
        </div>
      </div>

      <section className="walkthrough" aria-labelledby="walkthrough-title">
        <div className="walkthrough-heading">
          <div><p className="eyebrow">Project-grounded walkthrough</p><h4 id="walkthrough-title">{report.walkthrough.title}</h4></div>
          <span className={`comparison-state state-${report.walkthrough.comparisonState}`}>{report.walkthrough.comparisonState}</span>
        </div>
        <div className="walkthrough-grid">
          <div className="walkthrough-observed"><span>Observed in Alex&apos;s project</span><p>{report.walkthrough.observedImplementation}</p><code>{report.walkthrough.artifactReference.locator.path} · {report.walkthrough.artifactReference.locator.value}</code></div>
          <div className="walkthrough-counterpart"><span>Modern counterpart</span><p>{report.walkthrough.modernCounterpart}</p>{report.walkthrough.illustrativeSketch && <pre><code>{report.walkthrough.illustrativeSketch}</code></pre>}</div>
        </div>
        <div className="walkthrough-delta"><div><strong>What transfers</strong><ul>{report.walkthrough.whatTransfers.map((item) => <li key={item}>{item}</li>)}</ul></div><div><strong>What remains new</strong><ul>{report.walkthrough.whatIsNew.map((item) => <li key={item}>{item}</li>)}</ul></div></div>
        <p className="finding-limit">Limit: {report.walkthrough.limitations[0]}</p>
      </section>

      <section className="next-steps" aria-labelledby="next-steps-title">
        <p className="eyebrow">Prioritized path</p>
        <h4 id="next-steps-title">Three next steps, ordered by learning delta</h4>
        <ol>{report.nextSteps.map((step) => <li key={step.rank}><span>{step.rank}</span><div><strong>{step.title}</strong><p>{step.whyNow}</p><small>Proof: {step.proof}</small></div></li>)}</ol>
      </section>

      <section className="upgrade-challenge" aria-labelledby="challenge-title">
        <div><p className="eyebrow">Existing-project challenge</p><h4 id="challenge-title">{report.upgradeChallenge.title}</h4><p>{report.upgradeChallenge.objective}</p></div>
        <ol>{report.upgradeChallenge.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ol>
      </section>

      <details className="market-method">
        <summary>How the market comparison was produced</summary>
        <div className="market-method-body">
          <div><h5>Method</h5><ul>{pack.methodology.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div><h5>Reviewed sources</h5><ul>{pack.sources.map((source) => <li key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.employer}, {source.roleTitle}</a><span>{source.location} · reviewed {source.observedAt}</span></li>)}</ul></div>
          <div><h5>Limits</h5><ul>{[...pack.limitations, ...report.limitations].map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      </details>
    </section>
  );
}
