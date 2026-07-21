import Link from "next/link";
import { BridgePreview } from "@/components/bridge-preview";
import { EvidenceTransform } from "@/components/evidence-transform";
import { NotZeroMark } from "@/components/notzero-mark";

export default function Home() {
  return (
    <main id="main-content">
      <section className="home-hero">
        <div className="page-shell home-hero-grid">
          <div className="hero-copy">
            <p className="hero-category">For students, recent graduates, and people returning to their field</p>
            <h1><span className="hero-line">Your field moved forward.</span> <span>Your education still carries.</span></h1>
            <p className="hero-lede">
              NotZero reads what you studied and built, then connects it to
              current practice in your field. See what still transfers, what
              needs an update, and the smallest useful next step.
            </p>
            <div className="button-row">
              <Link className="button button-primary" href="/demo">See Alex&apos;s knowledge bridge</Link>
              {/* Native anchor so the browser's smooth scroll handles this
                  same-page glide instead of the router. */}
              <a className="button button-secondary" href="#how-it-works">How NotZero works</a>
            </div>
            <p className="hero-note">Prepared fictional example. No account or upload required.</p>
          </div>

          <EvidenceTransform />
        </div>
      </section>

      <section className="recognition-section">
        <div className="page-shell recognition-grid">
          <div className="overheard-card" data-animate="1">
            <p>What graduates hear</p>
            <blockquote>“Almost everything I use at work, I learned on the job.”</blockquote>
          </div>
          <div className="recognition-copy" data-animate="2">
            <p className="eyebrow">The thought that follows</p>
            <h2>Then what were those years at university for?</h2>
            <p>
              For the principles underneath current practice: how to reason,
              investigate, build, test, communicate, and solve unfamiliar
              problems. Every field adds new tools, standards, and rules. Your
              foundation does not disappear when professional practice changes.
            </p>
            <p className="recognition-answer">You are not starting from zero.</p>
          </div>
        </div>
      </section>

      <section className="page-shell translation-section" id="how-it-works">
        <div className="section-heading translation-heading" data-animate="1">
          <p className="eyebrow">What the product actually does</p>
          <h2>It translates your education into the language of current practice.</h2>
          <p>One evidence trail connects what you learned, what employers name, and the smallest useful next step.</p>
        </div>
        <div className="translation-map" data-animate="2">
          <div className="translation-column source-column">
            <p className="column-label">01 · Your evidence</p>
            <div className="artifact-row"><span>Course</span><strong>Web application development</strong></div>
            <div className="artifact-row"><span>Project</span><strong>API with environment config</strong></div>
            <div className="artifact-row"><span>Project</span><strong>Automated test suite</strong></div>
          </div>
          <div className="translation-core">
            <span className="translation-pulse" aria-hidden="true"><NotZeroMark /></span>
            <p>Evidence-backed<br />relationship map</p>
          </div>
          <div className="translation-column outcome-column">
            <p className="column-label">02 · Current practice, decoded</p>
            <div className="outcome-row current"><span>Transfers</span><strong>REST APIs</strong><small>demonstrated</small></div>
            <div className="outcome-row bridge"><span>Small bridge</span><strong>Docker</strong><small>high confidence</small></div>
            <div className="outcome-row unknown"><span>No evidence yet</span><strong>Cloud deployment</strong><small>unknown</small></div>
          </div>
        </div>
        <ol className="process-list">
           <li data-animate="1"><span>01</span><h3>Bring what you have</h3><p>Upload the study plan, academic files, project description, report, or readable source files you already have. NotZero sorts the evidence for you.</p></li>
          <li data-animate="2"><span>02</span><h3>Choose where you are going</h3><p>NotZero compares your evidence with a bounded, dated set of current professional requirements.</p></li>
          <li data-animate="3"><span>03</span><h3>Build the smallest bridge</h3><p>Get three priorities and one project upgrade that reuses what you already know.</p></li>
        </ol>
      </section>

      <section className="method-band living-band">
        <div className="page-shell method-band-grid">
          <div data-animate="1"><p className="eyebrow">Why re-running it matters</p><h2>The answer carries a date, because the market it reads does.</h2></div>
          <div data-animate="2">
            <p>Most study plans get written once and then age quietly on a page. NotZero measures your evidence against dated job postings and documentation, each carrying the day it was observed, and it re-derives the answer every run: the reviewed software pack is re-observed on a schedule, and a field without a reviewed pack is compared against postings located live at that moment. Bring the same project back once the sources have moved and the shortest bridge can change, because the tools teams reach for will have moved. A fixed course cannot do that. It repeats the answer it was given, long after the answer stopped being current.</p>
            <p className="living-band-close">This is the part a static website cannot copy: a plan built from what your field is asking for today, dated so you always know how fresh it is.</p>
          </div>
        </div>
      </section>

      <section className="evidence-section">
        <div className="page-shell evidence-grid">
          <div className="evidence-heading" data-animate="1">
            <p className="eyebrow">A transition problem, not a wasted degree</p>
            <h2>Employers still value higher education. They also expect a learning curve.</h2>
          </div>
          <div className="stat-grid">
            <div data-animate="2"><strong>75%</strong><p>say a college degree will be as or more important in five years.</p></div>
            <div data-animate="3"><strong>69%</strong><p>say recent graduates need moderate or substantial additional training.</p></div>
          </div>
          <p className="evidence-source" data-animate="4">
            U.S. employers, 2026. Source: <a href="https://www.gallup.com/file/analytics/702833/Lumina-Foundation-Gallup-SOHE_Employer-Report.pdf" target="_blank" rel="noreferrer">Gallup and Lumina Foundation, Aligning Education and Work</a>.
          </p>
        </div>
      </section>

      <section className="page-shell section bridge-section">
        <div className="section-heading bridge-heading" data-animate="1">
        <div><p className="eyebrow">The software judge example</p><h2>“Docker” becomes a bounded learning task.</h2></div>
          <p>NotZero does not call two tools equivalent. It shows the relationship, the source evidence, what transfers, and what remains new.</p>
        </div>
        <div data-animate="2">
          <BridgePreview />
        </div>
      </section>

      <section className="method-band">
        <div className="page-shell method-band-grid">
          <div data-animate="1"><p className="eyebrow">Confidence needs receipts</p><h2>No readiness score pulled from thin air.</h2></div>
          <div data-animate="2">
            <p>Every conclusion is labeled as demonstrated, expected exposure, self-reported, inferred, or unknown. Project claims point back to a file, symbol, line, or configuration key when the evidence supports it.</p>
            <div className="text-link-row">
              <Link className="text-link" href="/method">Read the method <span aria-hidden="true">&rarr;</span></Link>
              <Link className="text-link" href="/privacy">Read the privacy approach <span aria-hidden="true">&rarr;</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell final-cta" data-animate="1">
        <p className="eyebrow">The job post looks unfamiliar. Your knowledge doesn&apos;t.</p>
        <h2>See what Alex&apos;s 2022 software degree still carries forward.</h2>
        <Link className="button button-primary" href="/demo">Start the prepared demo</Link>
      </section>
    </main>
  );
}
