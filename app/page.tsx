import Link from "next/link";
import { BridgePreview } from "@/components/bridge-preview";
import { EvidenceTransform } from "@/components/evidence-transform";

export default function Home() {
  return (
    <main id="main-content">
      <section className="home-hero">
        <div className="page-shell home-hero-grid">
          <div className="hero-copy">
            <p className="hero-category">For software graduates facing the first job search</p>
            <h1>You learned the foundation. <span>The job post changed the vocabulary.</span></h1>
            <p className="hero-lede">
              NotZero reads your curriculum and projects, then maps them to the
              tools entry-level roles ask for now. See what already transfers,
              what needs a small bridge, and what is genuinely new.
            </p>
            <div className="button-row">
              <Link className="button button-primary" href="/demo">See Alex&apos;s knowledge bridge</Link>
              <Link className="button button-secondary" href="#how-it-works">How NotZero works</Link>
            </div>
            <p className="hero-note">Prepared fictional example. No account or upload required.</p>
          </div>

          <EvidenceTransform />
        </div>
      </section>

      <section className="recognition-section">
        <div className="page-shell recognition-grid">
          <div className="overheard-card">
            <p>What graduates hear</p>
            <blockquote>“Almost everything I use at work, I learned on the job.”</blockquote>
          </div>
          <div className="recognition-copy">
            <p className="eyebrow">The thought that follows</p>
            <h2>Then what were those years at university for?</h2>
            <p>
              For the concepts underneath the tools: data structures, systems,
              APIs, testing, databases, and the practice of solving unfamiliar
              problems. The market keeps adding new layers. Your foundation did
              not disappear when the vocabulary changed.
            </p>
            <p className="recognition-answer">You are not starting from zero.</p>
          </div>
        </div>
      </section>

      <section className="page-shell translation-section" id="how-it-works">
        <div className="section-heading translation-heading">
          <p className="eyebrow">What the product actually does</p>
          <h2>It translates your education into the language of the role.</h2>
          <p>One evidence trail connects what you learned, what employers name, and the smallest useful next step.</p>
        </div>
        <div className="translation-map">
          <div className="translation-column source-column">
            <p className="column-label">01 · Your evidence</p>
            <div className="artifact-row"><span>Course</span><strong>Web application development</strong></div>
            <div className="artifact-row"><span>Project</span><strong>API with environment config</strong></div>
            <div className="artifact-row"><span>Project</span><strong>Automated test suite</strong></div>
          </div>
          <div className="translation-core">
            <span className="translation-pulse" aria-hidden="true">NZ</span>
            <p>Evidence-backed<br />relationship map</p>
          </div>
          <div className="translation-column outcome-column">
            <p className="column-label">02 · The role, decoded</p>
            <div className="outcome-row current"><span>Transfers</span><strong>REST APIs</strong><small>demonstrated</small></div>
            <div className="outcome-row bridge"><span>Small bridge</span><strong>Docker</strong><small>high confidence</small></div>
            <div className="outcome-row unknown"><span>No evidence yet</span><strong>Cloud deployment</strong><small>unknown</small></div>
          </div>
        </div>
        <ol className="process-list">
          <li><span>01</span><h3>Bring what you studied</h3><p>A curriculum, a few supporting documents, and one project are enough for the focused flow.</p></li>
          <li><span>02</span><h3>Choose a target role</h3><p>NotZero compares your evidence with a bounded, dated set of current job requirements.</p></li>
          <li><span>03</span><h3>Build the smallest bridge</h3><p>Get three priorities and one project upgrade that reuses what you already know.</p></li>
        </ol>
      </section>

      <section className="evidence-section">
        <div className="page-shell evidence-grid">
          <div className="evidence-heading">
            <p className="eyebrow">A transition problem, not a wasted degree</p>
            <h2>Employers still value higher education. They also expect a learning curve.</h2>
          </div>
          <div className="stat-grid">
            <div><strong>75%</strong><p>say a college degree will be as or more important in five years.</p></div>
            <div><strong>69%</strong><p>say recent graduates need moderate or substantial additional training.</p></div>
          </div>
          <p className="evidence-source">
            U.S. employers, 2026. Source: <a href="https://www.gallup.com/file/analytics/702833/Lumina-Foundation-Gallup-SOHE_Employer-Report.pdf" target="_blank" rel="noreferrer">Gallup and Lumina Foundation, Aligning Education and Work</a>.
          </p>
        </div>
      </section>

      <section className="page-shell section bridge-section">
        <div className="section-heading bridge-heading">
          <div><p className="eyebrow">See one real translation</p><h2>“Docker” becomes a bounded learning task.</h2></div>
          <p>NotZero does not call two tools equivalent. It shows the relationship, the source evidence, what transfers, and what remains new.</p>
        </div>
        <BridgePreview />
      </section>

      <section className="method-band">
        <div className="page-shell method-band-grid">
          <div><p className="eyebrow">Confidence needs receipts</p><h2>No readiness score pulled from thin air.</h2></div>
          <div>
            <p>Every conclusion is labeled as demonstrated, expected exposure, self-reported, inferred, or unknown. Project claims point back to a file, symbol, line, or configuration key when the evidence supports it.</p>
            <div className="text-link-row">
              <Link className="text-link" href="/method">Read the method <span aria-hidden="true">&rarr;</span></Link>
              <Link className="text-link" href="/privacy">Read the privacy approach <span aria-hidden="true">&rarr;</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell final-cta">
        <p className="eyebrow">The job post looks unfamiliar. Your knowledge doesn&apos;t.</p>
        <h2>See what Alex&apos;s 2022 software degree still carries forward.</h2>
        <Link className="button button-primary" href="/demo">Start the prepared demo</Link>
      </section>
    </main>
  );
}
