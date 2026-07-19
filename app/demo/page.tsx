import type { Metadata } from "next";
import { DemoStepper } from "@/components/demo-stepper";
import { alexScenario } from "@/lib/fixtures/alex";

export const metadata: Metadata = {
  title: "Evidence ledger demo",
  description: "Build a provenance-aware evidence ledger from a prepared software scenario or your own bounded materials.",
};

export default function DemoPage() {
  return (
    <main id="main-content" className="demo-main">
      <div className="page-shell demo-shell">
        <div className="demo-intro">
          <p className="eyebrow">Phase 2 · Evidence ledger</p>
          <h1>See what the evidence already supports.</h1>
          <p>
            Use the fictional software scenario for the complete judge path, or
            validate your own dated evidence from another field.
          </p>
        </div>
        <DemoStepper scenario={alexScenario} />
      </div>
    </main>
  );
}
