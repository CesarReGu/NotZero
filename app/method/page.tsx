import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Method",
  description: "How NotZero distinguishes evidence, inference, relationships, and uncertainty.",
};

export default function MethodPage() {
  return (
    <main id="main-content" className="content-page">
      <div className="page-shell prose-shell">
        <p className="eyebrow">Method</p>
        <h1>Conclusions should be inspectable.</h1>
        <p className="page-lede">NotZero connects academic evidence with current professional practice. It keeps the source, inference, relationship, and uncertainty visible.</p>

        <section>
          <h2>Evidence classes</h2>
          <div className="definition-list">
            <div><h3>Expected exposure</h3><p>A curriculum says the learner was expected to encounter a topic. It does not prove mastery.</p></div>
            <div><h3>Demonstrated</h3><p>A bounded artifact shows a specific capability. The conclusion stays within what the artifact supports.</p></div>
            <div><h3>Self-reported</h3><p>The learner reports a capability that has not yet been verified by another artifact.</p></div>
            <div><h3>Inferred</h3><p>A project behavior suggests an underlying concept. The reasoning and confidence must be visible.</p></div>
            <div><h3>Unknown</h3><p>The available material does not support a responsible conclusion. Unknown is not converted into a gap.</p></div>
          </div>
        </section>

        <section>
          <h2>Relationship before equivalence</h2>
          <p>Current tools can automate, standardize, encapsulate, or build on earlier work. Each bridge names the directional relationship, the concepts that transfer, and the concepts that remain new.</p>
          <div className="method-example"><span>environment configuration</span><strong>foundation for</strong><span>containerization</span></div>
        </section>

        <section>
          <h2>What every finding must answer</h2>
          <ol className="numbered-prose"><li>What evidence supports it?</li><li>What kind of evidence is it?</li><li>How current is the comparison?</li><li>What inference was made?</li><li>How confident should the reader be?</li><li>What could change the conclusion?</li></ol>
        </section>

        <div className="page-callout"><p>See the method applied to a fictional graduate with exact project references.</p><Link className="button button-primary" href="/demo">Try the prepared demo</Link></div>
      </div>
    </main>
  );
}
