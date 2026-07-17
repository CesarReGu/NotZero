import type { Metadata } from "next";
import { DemoStepper } from "@/components/demo-stepper";
import { alexScenario } from "@/lib/fixtures/alex";

export const metadata: Metadata = {
  title: "Prepared graduate demo",
  description: "Walk through a fictional software graduate's evidence and target role.",
};

export default function DemoPage() {
  return (
    <main id="main-content" className="demo-main">
      <div className="page-shell demo-shell">
        <div className="demo-intro">
          <p className="eyebrow">Prepared graduate demo</p>
          <h1>See what the evidence already supports.</h1>
          <p>
            This fictional scenario exercises the intake path without an account,
            upload, or live external dependency.
          </p>
        </div>
        <DemoStepper scenario={alexScenario} />
      </div>
    </main>
  );
}
