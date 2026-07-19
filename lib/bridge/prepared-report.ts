import {
  knowledgeBridgeReportSchema,
  type EvidenceLedger,
  type KnowledgeBridgeReport,
} from "@/lib/domain/schemas";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import {
  marketSourceById,
  requirementById,
  softwareBackendPracticePack,
  technicalSourceById,
} from "@/lib/market/current-practice";

const pack = softwareBackendPracticePack;

function marketEvidence(requirementId: string, sourceId: string) {
  const requirement = requirementById(pack, requirementId);
  const source = marketSourceById(pack, sourceId);
  return {
    sourceId,
    sourceKind: "market_dataset" as const,
    summary: `${requirement.mentionCount} of ${pack.sources.length} reviewed postings mentioned ${requirement.name.toLowerCase()}. This source is one item in that count.`,
    url: source.url,
  };
}

function documentationEvidence(sourceId: string, summary: string) {
  const source = technicalSourceById(pack, sourceId);
  return { sourceId, sourceKind: "official_documentation" as const, summary, url: source.url };
}

function claimReference(ledger: EvidenceLedger, claimId: string) {
  const claim = ledger.claims.find((item) => item.id === claimId);
  if (!claim) throw new Error(`Evidence claim ${claimId} was not found.`);
  return claim.references[0];
}

function validateReportReferences(report: KnowledgeBridgeReport, ledger: EvidenceLedger) {
  const claimIds = new Set(ledger.claims.map((claim) => claim.id));
  const sourceIds = new Set([...pack.sources.map((source) => source.id), ...pack.technicalSources.map((source) => source.id)]);
  const requirementIds = new Set(pack.requirements.map((requirement) => requirement.id));
  const expectedGroups = ["current", "transferable", "small_bridge", "genuine_gap", "insufficient_evidence"] as const;
  const actualGroups = new Set(report.findings.map((finding) => finding.group));

  if (expectedGroups.some((group) => !actualGroups.has(group))) throw new Error("The prepared report must exercise all five result groups.");
  if (report.nextSteps.map((step) => step.rank).join(",") !== "1,2,3") throw new Error("Prepared next steps must have ranks 1, 2, and 3.");

  for (const finding of report.findings) {
    if (!requirementIds.has(finding.currentRequirementId)) throw new Error(`Unknown requirement ${finding.currentRequirementId}.`);
    for (const claimId of finding.evidenceClaimIds) if (!claimIds.has(claimId)) throw new Error(`Unknown claim ${claimId}.`);
    for (const evidence of finding.relationshipEvidence) if (!sourceIds.has(evidence.sourceId)) throw new Error(`Unknown relationship source ${evidence.sourceId}.`);
  }
  for (const claimId of report.upgradeChallenge.basedOnClaimIds) if (!claimIds.has(claimId)) throw new Error(`Unknown challenge claim ${claimId}.`);
  if (!claimIds.has(report.walkthrough.claimId)) throw new Error(`Unknown walkthrough claim ${report.walkthrough.claimId}.`);
  return report;
}

export function buildPreparedBridgeReport(ledger: EvidenceLedger = alexEvidenceLedger) {
  const configReference = claimReference(ledger, "claim-runtime-config");
  const testReference = claimReference(ledger, "claim-local-test");

  const report = knowledgeBridgeReportSchema.parse({
    id: "bridge-alex-backend-2026-v1",
    schemaVersion: "knowledge-bridge-report.v1",
    analysisVersion: "phase-3",
    analysisMode: "prepared_fixture",
    ledgerId: ledger.id,
    currentPracticePackId: pack.id,
    datasetVersion: pack.datasetVersion,
    generatedAt: "2026-07-18T23:30:00.000Z",
    findings: [
      {
        id: "finding-api-current",
        title: "Backend foundations remain current",
        group: "current",
        existingCapability: "Alex's coursework records expected exposure to web development, databases, operating systems, and networking.",
        evidenceClaimIds: ["claim-web-foundations"],
        currentRequirementId: "api-design",
        relationshipType: "foundation_for",
        relationshipEvidence: [marketEvidence("api-design", "job-hopper-backend-latam")],
        observedImplementation: "The curriculum supports expected exposure to the foundations used in backend work. It does not demonstrate production API design by itself.",
        modernCounterpart: "Six of eight reviewed roles named backend services, APIs, or API integrations.",
        comparisonState: "conceptual",
        manualStepsChanged: [],
        transferableConcepts: ["HTTP and networking", "data modeling", "server-side application structure"],
        newConcepts: ["production API operations", "service-level reliability", "team delivery conventions"],
        explanation: "The vocabulary in current postings is more specific, but the academic foundations remain relevant. Project evidence would be needed to raise this from expected exposure to demonstrated capability.",
        recommendedAction: "Add one bounded API behavior and its test to the existing project so the foundation becomes demonstrable evidence.",
        confidence: "medium",
        limitations: ["Course titles establish expected exposure, not mastery or recent production experience."],
      },
      {
        id: "finding-test-transfer",
        title: "A local test transfers into CI",
        group: "transferable",
        existingCapability: "Alex's project contains a bounded automated health-check test.",
        evidenceClaimIds: ["claim-local-test"],
        currentRequirementId: "ci-cd",
        relationshipType: "automates",
        relationshipEvidence: [
          marketEvidence("ci-cd", "job-lingaro-backend-mx"),
          documentationEvidence("docs-github-actions-ci", "GitHub documents CI workflows that automatically build and test repository changes."),
        ],
        artifactReference: testReference,
        observedImplementation: "The health check is run locally before a manual release.",
        modernCounterpart: "A CI workflow can run that same bounded test on each proposed change and record the result.",
        comparisonState: "illustrative",
        manualStepsChanged: ["Remembering to run the test before release", "Reporting the result manually"],
        transferableConcepts: ["test assertions", "repeatable checks", "failure as a release signal"],
        newConcepts: ["workflow triggers", "runner environments", "pipeline permissions and status checks"],
        explanation: "CI does not replace testing knowledge. It automates when and where the existing check runs, then makes the result visible to the team.",
        recommendedAction: "Run the existing health test in one GitHub Actions workflow triggered by pull requests.",
        confidence: "high",
        limitations: ["The suggested workflow has not been executed against the fictional fixture and remains illustrative."],
      },
      {
        id: "finding-container-bridge",
        title: "Manual environment setup is close to containerization",
        group: "small_bridge",
        existingCapability: "Alex separates runtime configuration from application logic and documents a repeatable manual setup sequence.",
        evidenceClaimIds: ["claim-manual-deployment", "claim-runtime-config"],
        currentRequirementId: "containerization",
        relationshipType: "standardizes",
        relationshipEvidence: [
          marketEvidence("containerization", "job-lingaro-backend-mx"),
          documentationEvidence("docs-docker-overview", "Docker documents containers as a way to package an application with what it needs and run it consistently across environments."),
        ],
        artifactReference: configReference,
        observedImplementation: "The README asks a developer to install dependencies, create an environment file, set DATABASE_URL and PORT, test, and start the API manually.",
        modernCounterpart: "A Dockerfile can standardize the runtime image, dependency installation, working directory, startup command, and exposed port while configuration remains external.",
        comparisonState: "illustrative",
        manualStepsChanged: ["Installing the runtime directly on each host", "Repeating dependency installation by hand", "Reconstructing the startup environment"],
        transferableConcepts: ["external configuration", "ports", "dependencies", "repeatable startup order"],
        newConcepts: ["image layers", "build context", "container lifecycle", "volume and network boundaries"],
        explanation: "Containerization standardizes part of the setup Alex already understands. It adds a packaging and lifecycle model, so it is a small bridge rather than an equivalent skill.",
        recommendedAction: "Create and run one illustrative Dockerfile for the existing API, keeping DATABASE_URL outside the image.",
        confidence: "high",
        limitations: ["The fixture omits its package manifest and entry point, so the suggested Dockerfile cannot be verified as runnable."],
      },
      {
        id: "finding-observability-gap",
        title: "Observability is a genuine new area",
        group: "genuine_gap",
        existingCapability: "The submitted project includes a health assertion but no evidence of emitted metrics, traces, structured operational logs, dashboards, or alerts.",
        evidenceClaimIds: ["claim-local-test"],
        currentRequirementId: "observability",
        relationshipType: "no_direct_equivalent",
        relationshipEvidence: [
          marketEvidence("observability", "job-latamcent-deployment-latam"),
          documentationEvidence("docs-opentelemetry-overview", "OpenTelemetry describes instrumentation for generating, collecting, and exporting traces, metrics, and logs."),
        ],
        observedImplementation: "A local test checks one expected response before release.",
        modernCounterpart: "Operational instrumentation emits runtime signals that help teams understand behavior after deployment.",
        comparisonState: "conceptual",
        manualStepsChanged: [],
        transferableConcepts: ["defining expected behavior", "failure detection"],
        newConcepts: ["runtime instrumentation", "metrics and traces", "correlation", "alert conditions"],
        explanation: "A test and observability serve different moments. The test checks a known condition; telemetry helps investigate a running system. The available evidence supports no direct equivalence.",
        recommendedAction: "Instrument one request count and one latency measurement, then describe what question each signal answers.",
        confidence: "high",
        limitations: ["No runtime or deployment evidence was supplied, so this conclusion is limited to the prepared artifacts."],
      },
      {
        id: "finding-cloud-unknown",
        title: "Cloud experience cannot be concluded",
        group: "insufficient_evidence",
        existingCapability: "Operating systems and networking appear in the curriculum, but no submitted artifact shows cloud deployment or infrastructure management.",
        evidenceClaimIds: ["claim-web-foundations"],
        currentRequirementId: "cloud-platform",
        relationshipType: "foundation_for",
        relationshipEvidence: [marketEvidence("cloud-platform", "job-restaurant365-devops-mx")],
        observedImplementation: "The available project instructions stop at local startup and a manual release sequence.",
        modernCounterpart: "Seven of eight reviewed postings named AWS, Azure, or Google Cloud in their role context.",
        comparisonState: "conceptual",
        manualStepsChanged: [],
        transferableConcepts: ["operating-system basics", "networking concepts"],
        newConcepts: ["provider identity and access", "managed services", "cloud networking", "cost and operational controls"],
        explanation: "The curriculum may provide useful foundations, but NotZero found no evidence that Alex has applied them on a cloud platform. That is an unknown, not proof of a gap in ability.",
        recommendedAction: "Add a deployment record or a small hosted exercise before drawing a cloud-readiness conclusion.",
        confidence: "high",
        limitations: ["No cloud artifact or self-report was included in the prepared evidence set."],
      },
    ],
    counts: { current: 1, transferable: 1, smallBridge: 1, genuineGap: 1, insufficientEvidence: 1 },
    nextSteps: [
      {
        rank: 1,
        title: "Containerize the project you already built",
        buildsOn: ["claim-manual-deployment", "claim-runtime-config"],
        whyNow: "It reuses the strongest project evidence and addresses a requirement named in seven of eight reviewed postings.",
        proof: "Run the API from a clean container while injecting DATABASE_URL at runtime and document the commands used.",
      },
      {
        rank: 2,
        title: "Move the existing health test into CI",
        buildsOn: ["claim-local-test"],
        whyNow: "The test already exists. The learning delta is limited to workflow triggers, runners, and visible results.",
        proof: "A pull request automatically runs the health test and shows a passing or failing check.",
      },
      {
        rank: 3,
        title: "Add one observable runtime signal",
        buildsOn: ["claim-local-test"],
        whyNow: "It addresses a genuine gap without asking Alex to adopt a full monitoring stack at once.",
        proof: "Record request count or latency and explain one operational question the signal can answer.",
      },
    ],
    upgradeChallenge: {
      id: "challenge-container-ci",
      title: "Turn the 2022 API into a reproducible build",
      basedOnClaimIds: ["claim-manual-deployment", "claim-runtime-config", "claim-local-test"],
      objective: "Package the existing API in a container and run its existing health test in CI without placing DATABASE_URL in the image or repository.",
      acceptanceCriteria: [
        "The image build documents the runtime and dependency-installation steps.",
        "DATABASE_URL is injected at runtime and is absent from the image and repository.",
        "The API starts with its documented port behavior in a clean container.",
        "A pull-request workflow runs the existing health test and reports the result."
      ],
      comparisonState: "illustrative",
    },
    walkthrough: {
      title: "From PORT configuration to a container boundary",
      claimId: "claim-runtime-config",
      artifactReference: configReference,
      observedImplementation: "The project reads DATABASE_URL and PORT from its environment. The README asks each developer to construct that environment and start the process manually.",
      modernCounterpart: "A Dockerfile describes the runtime and startup environment as versioned build instructions. Runtime secrets and environment-specific values remain outside the image.",
      relationshipType: "standardizes",
      comparisonState: "illustrative",
      illustrativeSketch: "FROM node:22-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nENV PORT=3000\nCMD [\"npm\", \"start\"]",
      whatTransfers: ["Alex already understands external configuration, port selection, dependencies, and startup order."],
      whatIsNew: ["Alex still needs image construction, build context, container lifecycle, and safe runtime secret injection."],
      limitations: ["This sketch was not executed. The fixture has no package manifest or application entry point, so commands may require adaptation."],
    },
    limitations: [
      "This deterministic report demonstrates the Phase 3 comparison method for one fictional software scenario. It does not certify mastery or job eligibility.",
      "Market counts come from eight manually reviewed postings observed on July 18, 2026 and are not a representative labor-market survey.",
      "Illustrative and conceptual comparisons have not been executed against a complete project."
    ],
  });

  return validateReportReferences(report, ledger);
}

export const alexBridgeReport = buildPreparedBridgeReport();
