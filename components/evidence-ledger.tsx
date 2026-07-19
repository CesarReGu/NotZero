import type { EvidenceLedger } from "@/lib/domain/schemas";

function label(value: string) {
  return value.replaceAll("_", " ");
}

export function EvidenceLedgerView({ ledger }: { ledger: EvidenceLedger }) {
  return (
    <section className="ledger" aria-labelledby="ledger-title">
      <div className="ledger-header">
        <div>
          <p className="eyebrow">Evidence ledger</p>
          <h3 id="ledger-title">What the submitted material can support</h3>
        </div>
        <span className="ledger-mode">{label(ledger.analysisMode)}</span>
      </div>

      <div className="ledger-summary" aria-label="Evidence ledger summary">
        <div><strong>{ledger.sources.length}</strong><span>Dated sources</span></div>
        <div><strong>{ledger.claims.length}</strong><span>Supported claims</span></div>
        <div><strong>{ledger.warnings.length}</strong><span>Review warnings</span></div>
      </div>

      <div className="ledger-sources">
        <h4>Source receipt</h4>
        <ul>
          {ledger.sources.map((source) => (
            <li key={source.id}>
              <div><strong>{source.name}</strong><span>{label(source.sourceType)} · {source.date}</span></div>
              <small>{source.characterCount.toLocaleString("en-US")} characters{source.pageCount ? ` · ${source.pageCount} pages` : ""}</small>
            </li>
          ))}
        </ul>
      </div>

      {ledger.claims.length > 0 ? (
        <div className="ledger-claims">
          <h4>Evidence claims</h4>
          {ledger.claims.map((claim) => (
            <details key={claim.id} className="ledger-claim">
              <summary>
                <div><span>{label(claim.evidenceClass)}</span><strong>{claim.title}</strong><p>{claim.statement}</p></div>
                <small>{claim.confidence} confidence</small>
              </summary>
              <div className="ledger-claim-details">
                {claim.references.map((reference) => (
                  <blockquote key={`${claim.id}-${reference.sourceId}-${reference.locator.value}`}>
                    <p>“{reference.excerpt}”</p>
                    <cite>{reference.locator.path} · {label(reference.locator.kind)}: {reference.locator.value}</cite>
                  </blockquote>
                ))}
                <div className="claim-limitations"><strong>What this does not prove</strong><ul>{claim.limitations.map((item) => <li key={item}>{item}</li>)}</ul></div>
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="ledger-empty" role="note">
          <strong>Files validated. No capability claims were generated.</strong>
          <p>{ledger.limitations[0]}</p>
        </div>
      )}

      {(ledger.warnings.length > 0 || ledger.limitations.length > 0) && (
        <details className="ledger-method">
          <summary>Warnings and limits</summary>
          <ul>{[...ledger.warnings, ...ledger.limitations].map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
    </section>
  );
}
