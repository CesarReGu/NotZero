import { evidenceLedgerSchema } from "@/lib/domain/schemas";
import { alexScenario } from "@/lib/fixtures/alex";

const hash = (character: string) => character.repeat(64);

export const alexEvidenceLedger = evidenceLedgerSchema.parse({
  id: "ledger-alex-2022-v1",
  schemaVersion: "evidence-ledger.v1",
  promptVersion: "evidence-extraction.v1",
  analysisMode: "prepared_fixture",
  fieldContext: alexScenario.fieldContext,
  sources: [
    { id: "alex-study-plan", name: "study-plan.md", sourceType: "curriculum", date: "2022-05-20", mimeType: "text/markdown", sizeBytes: 492, contentHash: hash("1"), normalizedHash: hash("a"), characterCount: 477 },
    { id: "alex-readme", name: "alex-api/README.md", sourceType: "supporting_document", date: "2022-04-14", mimeType: "text/markdown", sizeBytes: 712, contentHash: hash("2"), normalizedHash: hash("b"), characterCount: 684 },
    { id: "alex-config", name: "alex-api/src/config.ts", sourceType: "source_file", date: "2022-04-14", mimeType: "text/typescript", sizeBytes: 233, contentHash: hash("3"), normalizedHash: hash("c"), characterCount: 220 },
    { id: "alex-test", name: "alex-api/tests/health.test.ts", sourceType: "source_file", date: "2022-04-14", mimeType: "text/typescript", sizeBytes: 254, contentHash: hash("4"), normalizedHash: hash("d"), characterCount: 240 },
  ],
  claims: [
    {
      id: "claim-web-foundations",
      title: "Web and database foundations",
      statement: "The curriculum records expected exposure to web development, databases, operating systems, and networking. It does not establish mastery by itself.",
      evidenceClass: "expected_exposure",
      references: [{ sourceId: "alex-study-plan", excerpt: "Databases, Web Application Development, Operating Systems, Computer Networks", locator: { path: "study-plan.md", kind: "section", value: "Course record" } }],
      confidence: "high",
      limitations: ["A course listing supports expected exposure, not demonstrated ability."],
    },
    {
      id: "claim-manual-deployment",
      title: "Manual deployment sequence",
      statement: "The project documentation shows a repeatable manual sequence for dependency installation, environment configuration, testing, and startup.",
      evidenceClass: "demonstrated",
      references: [{ sourceId: "alex-readme", excerpt: "Install dependencies, create the environment file, run the tests, then start the API.", locator: { path: "alex-api/README.md", kind: "section", value: "Run locally" } }],
      confidence: "high",
      limitations: ["The fixture documents the steps but does not prove they were executed in a production environment."],
    },
    {
      id: "claim-runtime-config",
      title: "External runtime configuration",
      statement: "The project reads runtime settings outside application logic and applies a documented port default.",
      evidenceClass: "demonstrated",
      references: [{ sourceId: "alex-config", excerpt: "const port = Number(process.env.PORT ?? 3000);", locator: { path: "alex-api/src/config.ts", kind: "configuration_key", value: "PORT", startLine: 1, endLine: 1 } }],
      confidence: "high",
      limitations: ["This demonstrates configuration handling, not container lifecycle knowledge."],
    },
    {
      id: "claim-local-test",
      title: "Automated local health check",
      statement: "The project contains a bounded automated test for the API health endpoint.",
      evidenceClass: "demonstrated",
      references: [{ sourceId: "alex-test", excerpt: "test(\"health endpoint\"", locator: { path: "alex-api/tests/health.test.ts", kind: "symbol", value: "health endpoint" } }],
      confidence: "high",
      limitations: ["The evidence does not show that the test runs in a hosted pipeline."],
    },
  ],
  warnings: [],
  limitations: ["This deterministic ledger describes a fictional software graduate fixture. It does not certify mastery or job eligibility."],
});
