import type { ExtractedSource } from "../../lib/evidence/files";

const hash = (character: string) => character.repeat(64);

export const customSoftwareSources: ExtractedSource[] = [
  {
    metadata: {
      id: "custom-study-plan",
      name: "study-plan.md",
      sourceType: "curriculum",
      date: "2023-05-20",
      mimeType: "text/markdown",
      sizeBytes: 82,
      contentHash: hash("1"),
      normalizedHash: hash("a"),
      characterCount: 81,
    },
    normalizedText: "Coursework: web development, databases, operating systems, and computer networks.",
  },
  {
    metadata: {
      id: "custom-project-config",
      name: "inventory-api/config.ts",
      sourceType: "source_file",
      date: "2023-04-10",
      mimeType: "text/typescript",
      sizeBytes: 55,
      contentHash: hash("2"),
      normalizedHash: hash("b"),
      characterCount: 54,
    },
    normalizedText: "export const port = Number(process.env.PORT ?? 4000);",
  },
];

export const successfulEvidenceOutput = {
  claims: [
    {
      id: "claim-custom-foundations",
      title: "Systems and web foundations",
      statement: "The curriculum records expected exposure to web, operating-system, database, and networking concepts.",
      evidenceClass: "expected_exposure",
      references: [{ sourceId: "custom-study-plan", excerpt: "web development, databases, operating systems, and computer networks", locator: { path: "study-plan.md", kind: "section", value: "Coursework", startLine: 1, endLine: 1 } }],
      confidence: "high",
      limitations: ["A curriculum records expected exposure, not mastery."],
    },
    {
      id: "claim-custom-runtime",
      title: "External runtime configuration",
      statement: "The project reads its port from the environment and provides a local default.",
      evidenceClass: "demonstrated",
      references: [{ sourceId: "custom-project-config", excerpt: "process.env.PORT ?? 4000", locator: { path: "inventory-api/config.ts", kind: "configuration_key", value: "PORT", startLine: 1, endLine: 1 } }],
      confidence: "high",
      limitations: ["This does not demonstrate container lifecycle knowledge."],
    },
  ],
  warnings: [],
  limitations: ["The evidence supports bounded claims and does not establish professional mastery."],
};

export function successfulBridgeOutput(claimId = "claim-custom-runtime") {
  return {
    findings: [{
      id: "finding-custom-container",
      title: "Runtime configuration is close to containerization",
      group: "small_bridge",
      existingCapability: "The project already keeps runtime configuration outside application logic.",
      evidenceClaimIds: [claimId],
      currentRequirementId: "containerization",
      relationshipType: "standardizes",
      relationshipSourceIds: ["job-lingaro-backend-mx", "docs-docker-overview"],
      artifactClaimId: claimId,
      observedImplementation: "The service reads PORT from its environment.",
      modernCounterpart: "A container image standardizes the runtime boundary while configuration remains external.",
      comparisonState: "illustrative",
      manualStepsChanged: ["Install the runtime separately"],
      transferableConcepts: ["external configuration", "ports"],
      newConcepts: ["image construction", "container lifecycle"],
      whyItIsUsed: "Teams use containers to make runtime setup reproducible across environments.",
      explanation: "The existing configuration boundary reduces the learning delta to packaging and lifecycle concepts.",
      recommendedAction: "Add and run an illustrative Dockerfile for the existing inventory API.",
      confidence: "high",
      limitations: ["The proposed container setup has not been executed."],
    }],
    nextSteps: [1, 2, 3].map((rank) => ({
      rank,
      title: `Container proof step ${rank}`,
      buildsOn: [claimId],
      reuses: "External runtime configuration.",
      newConcept: "Container image construction and lifecycle.",
      whyItIsUsed: "Teams use containers to standardize runtime setup.",
      whyNow: "It reuses the demonstrated external runtime configuration.",
      proof: `Complete bounded container proof ${rank}.`,
    })),
    upgradeChallenge: {
      id: "challenge-custom-container",
      title: "Package the inventory API",
      basedOnClaimIds: [claimId],
      objective: "Run the existing service from a documented container boundary.",
      acceptanceCriteria: ["The service starts", "PORT remains configurable"],
      comparisonState: "illustrative",
    },
    walkthrough: {
      title: "From PORT to a container boundary",
      claimId,
      observedImplementation: "The project reads PORT from its environment.",
      modernCounterpart: "The image declares the runtime boundary while PORT remains configurable.",
      relationshipType: "standardizes",
      comparisonState: "illustrative",
      illustrativeSketch: "ENV PORT=4000",
      whatTransfers: ["External configuration"],
      whatIsNew: ["Image construction"],
      limitations: ["The sketch has not been executed."],
    },
    walkthroughUnavailableReason: null,
    limitations: ["This comparison uses a small, dated market pack."],
  };
}

export const weakEvidenceOutput = {
  claims: [{
    id: "claim-weak-cloud",
    title: "Possible hosted deployment exposure",
    statement: "The summary suggests possible exposure to hosted deployment, but it does not describe an implementation.",
    evidenceClass: "inferred",
    references: [{ sourceId: "weak-summary", excerpt: "helped publish a class project online", locator: { path: "project-summary.md", kind: "section", value: "Deployment", startLine: 1, endLine: 1 } }],
    confidence: "low",
    limitations: ["No configuration, source file, or deployment record was provided."],
  }],
  warnings: ["The project evidence is a short summary."],
  limitations: ["The material is too limited to support a demonstrated deployment claim."],
};

export const weakSummarySource: ExtractedSource = {
  metadata: { id: "weak-summary", name: "project-summary.md", sourceType: "project_artifact", date: "2022-11-04", mimeType: "text/markdown", sizeBytes: 47, contentHash: hash("3"), normalizedHash: hash("c"), characterCount: 46 },
  normalizedText: "I helped publish a class project online.",
};

export function weakBridgeOutput() {
  const base = successfulBridgeOutput("claim-weak-cloud");
  return {
    ...base,
    findings: [{
      ...base.findings[0],
      id: "finding-observability-unknown",
      title: "Production observability needs stronger evidence",
      group: "insufficient_evidence",
      currentRequirementId: "observability",
      relationshipType: "no_direct_equivalent",
      relationshipSourceIds: ["job-idt-devops-latam", "docs-opentelemetry-overview"],
      artifactClaimId: null,
      existingCapability: "The summary mentions helping publish a project online.",
      observedImplementation: "No implementation detail is available.",
      modernCounterpart: "Current roles may expect evidence of production observability practices.",
      manualStepsChanged: [],
      transferableConcepts: [],
      newConcepts: ["telemetry signals", "instrumentation"],
      whyItIsUsed: "Teams use observability signals to investigate production behavior.",
      explanation: "The available summary is too weak to determine whether the requirement is supported.",
      recommendedAction: "Provide monitoring configuration or describe the exact telemetry and investigation work performed.",
      confidence: "low",
      limitations: ["The summary does not identify telemetry, configuration, or individual contribution."],
    }],
    walkthrough: null,
    walkthroughUnavailableReason: "The submitted summary does not include a stable implementation locator.",
  };
}

export function modelResponse(output: unknown) {
  return new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }] }), { status: 200, headers: { "content-type": "application/json" } });
}
