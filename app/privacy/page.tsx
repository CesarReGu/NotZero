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
        <p className="page-lede">The prepared demo uses fictional files. NotZero can validate a bounded evidence set without an account and keeps retention deliberately short.</p>

        <section data-animate="1">
          <h2>Before any upload</h2>
          <ul className="plain-list"><li>Remove credentials, tokens, private keys, and connection strings.</li><li>Do not submit confidential employer material, patient or client information, or personal identifiers.</li><li>Use only work you own or have permission to analyze.</li><li>Prefer the smallest artifact that can support the intended conclusion.</li></ul>
        </section>

        <section data-animate="1">
          <h2>Prototype boundary</h2>
          <p>The current prototype enforces request, file-count, type, size, extracted-text, duplicate, and obvious-secret checks on the server. Uploaded bytes and complete extracted documents are not written to application storage.</p>
          <p>A normalized input hash and the validated evidence ledger may be cached for up to 30 minutes so an unchanged safe request does not trigger another model call. The cache contains the result and its cited excerpts, never the complete uploaded document. Choosing the reset action deletes cached results associated with the anonymous session.</p>
          <p>When live analysis is enabled, extracted text is sent to OpenAI for the requested evidence analysis. The prepared judge path remains deterministic and sends no fixture documents to an external model.</p>
          <p>An anonymous session cookie enforces daily request limits. It does not contain uploaded content, a name, an email address, or an account identifier.</p>
        </section>

        <section data-animate="1">
          <h2>What the analysis can claim</h2>
          <p>NotZero interprets the submitted evidence and controlled market sources. It does not certify mastery, guarantee job eligibility, or treat missing material as proof that a learner lacks a capability.</p>
        </section>

        <div className="page-callout" data-animate="1"><p>Explore the product with fictional material first.</p><Link className="button button-primary" href="/demo">Use the prepared profile</Link></div>
      </div>
    </main>
  );
}
