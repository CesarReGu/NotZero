import Link from "next/link";
import { BridgePreview } from "@/components/bridge-preview";

export default function Home() {
  return (
    <main id="main-content">
      <section className="hero page-shell">
        <div className="hero-copy">
          <p className="eyebrow">Education <span aria-hidden="true">→</span> current practice</p>
          <h1>The job post looks unfamiliar. Your knowledge doesn&apos;t.</h1>
          <p className="hero-lede">
            NotZero reads what you studied and built, connects it to the tools
            employers ask for now, and shows the smallest useful next step.
          </p>
          <div className="button-row">
            <Link className="button button-primary" href="/demo">Try the graduate demo</Link>
            <Link className="button button-secondary" href="/method">See how conclusions are made</Link>
          </div>
          <p className="hero-note">No account or upload is needed for the prepared demo.</p>
        </div>
        <div className="hero-preview" aria-label="Example knowledge bridge">
          <BridgePreview compact />
        </div>
      </section>

      <section className="statement-section">
        <div className="page-shell statement-grid">
          <p className="section-kicker">You are not starting from zero.</p>
          <div>
            <h2>Tools often package work you already understand.</h2>
            <p>
              A new name can hide a familiar problem. NotZero separates the
              foundation that transfers from the modern layer you still need to learn.
            </p>
          </div>
        </div>
      </section>

      <section className="page-shell section" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">A short, inspectable path</p>
          <h2>From academic evidence to a practical next step</h2>
        </div>
        <ol className="process-list">
          <li><span>01</span><h3>Bring the evidence</h3><p>Use a curriculum, supporting work, and a bounded project artifact.</p></li>
          <li><span>02</span><h3>Choose the role</h3><p>Compare it with a controlled, dated set of current requirements.</p></li>
          <li><span>03</span><h3>Inspect the bridge</h3><p>See what transfers, what is new, and the evidence behind each conclusion.</p></li>
        </ol>
      </section>

      <section className="page-shell section bridge-section">
        <div className="section-heading narrow-heading">
          <p className="eyebrow">One complete example</p>
          <h2>A vocabulary gap becomes a bounded learning task.</h2>
        </div>
        <BridgePreview />
      </section>

      <section className="method-band">
        <div className="page-shell method-band-grid">
          <div>
            <p className="eyebrow">Evidence before claims</p>
            <h2>Every conclusion should show its work.</h2>
          </div>
          <div>
            <p>
              NotZero distinguishes expected exposure, demonstrated work,
              self-reported experience, careful inference, and unknowns. It does
              not certify mastery or turn missing evidence into a personal judgment.
            </p>
            <div className="text-link-row">
              <Link className="text-link" href="/method">Read the method <span aria-hidden="true">→</span></Link>
              <Link className="text-link" href="/privacy">Read the privacy approach <span aria-hidden="true">→</span></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="page-shell final-cta">
        <p className="eyebrow">Prepared fictional scenario</p>
        <h2>See what Alex&apos;s 2022 software degree still carries forward.</h2>
        <Link className="button button-primary" href="/demo">Start the prepared demo</Link>
      </section>
    </main>
  );
}
