type BridgePreviewProps = {
  compact?: boolean;
};

export function BridgePreview({ compact = false }: BridgePreviewProps) {
  return (
    <article className={`bridge-card${compact ? " bridge-card-compact" : ""}`}>
      <div className="bridge-card-topline">
        <span className="status-label status-bridge">Small bridge</span>
        <span className="confidence">High confidence</span>
      </div>
      <div className="bridge-connection" aria-label="Environment configuration is a foundation for containerization">
        <div>
          <span className="bridge-overline">What Alex demonstrated</span>
          <strong>Environment configuration</strong>
        </div>
        <span className="connection-rule" aria-hidden="true"><i /><span>foundation for</span></span>
        <div>
          <span className="bridge-overline">Current practice</span>
          <strong>Containerization</strong>
        </div>
      </div>
      <p className="bridge-explanation">
        Alex&apos;s project separates runtime settings from application code.
        Containers standardize how those settings and dependencies travel between environments.
      </p>
      {!compact && (
        <div className="bridge-details">
          <div><span>Evidence</span><p><code>alex-api/src/config.ts</code> · <code>PORT</code> configuration key</p></div>
          <div><span>What is new</span><p>Image construction, container lifecycle, and reproducible packaging.</p></div>
          <div><span>Small proof task</span><p>Add an illustrative Dockerfile, then run the API from a clean environment.</p></div>
        </div>
      )}
      <p className="bridge-source">Academic artifact · 2022 <span aria-hidden="true">/</span> Prepared demo</p>
    </article>
  );
}
