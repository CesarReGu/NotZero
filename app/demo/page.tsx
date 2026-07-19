import type { Metadata } from "next";
import { DemoStepper } from "@/components/demo-stepper";
import { alexScenario } from "@/lib/fixtures/alex";

export const metadata: Metadata = {
  title: "Knowledge Bridge demo",
  description: "Connect a provenance-aware evidence ledger with dated current-practice evidence and a bounded learning path.",
};

export default function DemoPage() {
  return (
    <main id="main-content" className="demo-main">
      <div className="page-shell demo-shell">
        <div className="demo-intro">
          <p className="eyebrow">Phase 4 · Report and trust experience</p>
          <h1>See how your evidence reaches current practice.</h1>
          <p>
            Use the fictional software scenario for the complete market comparison,
            or validate your own dated evidence from another field.
          </p>
        </div>
        <DemoStepper scenario={alexScenario} />
      </div>
    </main>
  );
}
