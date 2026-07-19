import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "The privacy boundary for the NotZero prototype and prepared demo.",
};

export default function PrivacyPage() {
  return (
    <main id="main-content" className="content-page">
      <div className="page-shell prose-shell">
        <p className="eyebrow">Privacy</p>
        <h1>Bring only material you can safely share.</h1>
        <p className="page-lede">The prepared demo uses fictional files. NotZero can validate a bounded evidence set without an account and processes it only for the current request.</p>

        <section>
          <h2>Before any upload</h2>
          <ul className="plain-list"><li>Remove credentials, tokens, private keys, and connection strings.</li><li>Do not submit confidential employer material, patient or client information, or personal identifiers.</li><li>Use only work you own or have permission to analyze.</li><li>Prefer the smallest artifact that can support the intended conclusion.</li></ul>
        </section>

        <section>
          <h2>Prototype boundary</h2>
          <p>The current prototype enforces file-count, type, size, extracted-text, duplicate, and obvious-secret checks on the server. Uploaded bytes and extracted text are not written to application storage. The browser offers a reset action that clears its selected files and result.</p>
          <p>When live analysis is enabled, extracted text is sent to OpenAI for the requested evidence analysis. The prepared judge path remains deterministic and sends no fixture documents to an external model.</p>
        </section>

        <section>
          <h2>What the analysis can claim</h2>
          <p>NotZero interprets the submitted evidence and controlled market sources. It does not certify mastery, guarantee job eligibility, or treat missing material as proof that a learner lacks a capability.</p>
        </section>

        <div className="page-callout"><p>Explore the product with fictional material first.</p><Link className="button button-primary" href="/demo">Use the prepared profile</Link></div>
      </div>
    </main>
  );
}
