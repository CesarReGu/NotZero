import {
  knowledgeBridgeReportSchema,
  type EvidenceLedger,
  type KnowledgeBridgeReport,
} from "@/lib/domain/schemas";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { alexPhaseCurriculum } from "@/lib/fixtures/alex-curriculum";
import {
  marketSourceById,
  requirementById,
  softwareBackendPracticePack,
  technicalSourceById,
} from "@/lib/market/current-practice";
import { deriveRequirementCoverage } from "@/lib/bridge/coverage";

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

/**
 * The trust boundary for a prepared report: every claim, requirement, market
 * source, quoted excerpt, vocabulary entry, role profile, and roadmap phase must
 * resolve to something that actually exists before the report can be displayed.
 */
export function validateReportReferences(report: KnowledgeBridgeReport, ledger: EvidenceLedger) {
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
  if (report.walkthrough && !claimIds.has(report.walkthrough.claimId)) throw new Error(`Unknown walkthrough claim ${report.walkthrough.claimId}.`);

  // Each code bridge must quote a claim that exists and target a reviewed
  // requirement, so the "observed" panel can never show invented code.
  for (const bridge of report.codeBridges ?? []) {
    const claim = ledger.claims.find((item) => item.id === bridge.claimId);
    if (!claim) throw new Error(`Unknown code bridge claim ${bridge.claimId}.`);
    if (!requirementIds.has(bridge.requirementId)) throw new Error(`Unknown code bridge requirement ${bridge.requirementId}.`);
    if (!claim.references.some((reference) => reference.locator.path === bridge.observed.path)) {
      throw new Error(`Code bridge ${bridge.id} quotes ${bridge.observed.path}, which claim ${bridge.claimId} does not reference.`);
    }
  }

  // A vocabulary entry renames something the user demonstrably wrote, so it
  // must point at a real claim and at the file that claim cites.
  for (const term of report.vocabularyBridges ?? []) {
    const claim = ledger.claims.find((item) => item.id === term.claimId);
    if (!claim) throw new Error(`Unknown vocabulary claim ${term.claimId}.`);
    if (!claim.references.some((reference) => reference.locator.path === term.sourcePath)) {
      throw new Error(`Vocabulary ${term.id} cites ${term.sourcePath}, which claim ${term.claimId} does not reference.`);
    }
    if (term.requirementId && !requirementIds.has(term.requirementId)) throw new Error(`Unknown vocabulary requirement ${term.requirementId}.`);
  }

  // A role profile must be a cluster actually observed in the reviewed
  // postings: every requirement it names has to appear in at least one of the
  // postings it was derived from.
  const packSourceIds = new Set(pack.sources.map((source) => source.id));
  for (const profile of report.roleProfiles ?? []) {
    const observed = new Set<string>();
    for (const sourceId of profile.sourceIds) {
      if (!packSourceIds.has(sourceId)) throw new Error(`Role profile ${profile.id} cites unknown posting ${sourceId}.`);
      for (const requirementId of marketSourceById(pack, sourceId).requirementIds) observed.add(requirementId);
    }
    for (const requirementId of profile.requirementIds) {
      if (!requirementIds.has(requirementId)) throw new Error(`Role profile ${profile.id} names unknown requirement ${requirementId}.`);
      if (!observed.has(requirementId)) {
        throw new Error(`Role profile ${profile.id} claims ${requirementId}, which none of its cited postings mention.`);
      }
    }
  }

  const resourceIds = new Set(pack.learningResources.map((resource) => resource.id));
  for (const phase of report.roadmap?.phases ?? []) {
    for (const claimId of phase.startsFromClaimIds) if (!claimIds.has(claimId)) throw new Error(`Roadmap phase ${phase.order} starts from unknown claim ${claimId}.`);
    for (const requirementId of phase.unlocksRequirementIds) if (!requirementIds.has(requirementId)) throw new Error(`Roadmap phase ${phase.order} unlocks unknown requirement ${requirementId}.`);

    // A curriculum decides what a person does not have to study. Every topic
    // that removes or reduces work has to name the claim it rests on, and every
    // topic that adds work has to name something the reader can go and read.
    for (const curriculumModule of phase.modules ?? []) {
      for (const topic of curriculumModule.topics) {
        for (const claimId of topic.claimIds) {
          if (!claimIds.has(claimId)) throw new Error(`Curriculum topic ${topic.id} cites unknown claim ${claimId}.`);
        }
        for (const resourceId of topic.resourceIds) {
          if (!resourceIds.has(resourceId)) throw new Error(`Curriculum topic ${topic.id} cites unknown learning resource ${resourceId}.`);
        }
      }
    }
  }
  return report;
}

export function buildPreparedBridgeReport(ledger: EvidenceLedger = alexEvidenceLedger) {
  const serverReference = claimReference(ledger, "claim-rest-endpoints");
  const schemaReference = claimReference(ledger, "claim-relational-schema");
  const configReference = claimReference(ledger, "claim-runtime-config");
  const testReference = claimReference(ledger, "claim-local-test");
  const loggingReference = claimReference(ledger, "claim-request-logging");

  const reportWithoutCoverage = knowledgeBridgeReportSchema.parse({
    id: "bridge-alex-backend-2026-v2",
    schemaVersion: "knowledge-bridge-report.v2",
    analysisVersion: "phase-4",
    analysisMode: "prepared_fixture",
    ledgerId: ledger.id,
    currentPracticePackId: pack.id,
    datasetVersion: pack.datasetVersion,
    generatedAt: "2026-07-18T23:30:00.000Z",
    findings: [
      {
        id: "finding-api-current",
        title: "The API you built is still built that way",
        group: "current",
        existingCapability: "Alex's project defines four REST routes that validate input by hand and return specific HTTP status codes for success, rejection, and missing records.",
        evidenceClaimIds: ["claim-rest-endpoints", "claim-web-foundations"],
        currentRequirementId: "api-design",
        relationshipType: "foundation_for",
        relationshipEvidence: [marketEvidence("api-design", "job-hopper-backend-latam")],
        artifactReference: serverReference,
        observedImplementation: "Routes check types and lengths before touching the database, then answer with 201, 400, 404, or 500 depending on the outcome.",
        modernCounterpart: "Six of eight reviewed roles named backend services, APIs, or API integrations. The request-validate-respond shape in those roles is the shape already in this project.",
        comparisonState: "verified",
        manualStepsChanged: [],
        transferableConcepts: ["HTTP status semantics", "input validation before persistence", "resource-oriented route design", "error responses"],
        newConcepts: ["shared validation schemas", "API versioning", "authentication and authorization"],
        whyItIsUsed: "Teams use explicit API conventions so behavior stays predictable across consumers, deployments, and maintainers.",
        explanation: "This is not a gap dressed up as a strength. The endpoint structure, validation order, and status codes in the 2022 project match what the reviewed postings describe. What a team would add is shared validation and auth, which the project seminar placed out of scope.",
        recommendedAction: "Keep this project as a portfolio artifact and be ready to explain the validation order in POST /tasks.",
        confidence: "high",
        limitations: ["One capstone API demonstrates the pattern. It does not establish experience with production traffic or a team codebase."],
      },
      {
        id: "finding-database-current",
        title: "Schema design and safe queries transfer unchanged",
        group: "current",
        existingCapability: "The schema declares a foreign key with a cascading delete and an index chosen for the query the API runs, and every user value reaches PostgreSQL through numbered placeholders.",
        evidenceClaimIds: ["claim-relational-schema", "claim-parameterized-queries", "claim-connection-pool"],
        currentRequirementId: "relational-databases",
        relationshipType: "foundation_for",
        relationshipEvidence: [marketEvidence("relational-databases", "job-devsavant-backend-latam")],
        artifactReference: schemaReference,
        observedImplementation: "schema.sql creates teams and tasks with a referential constraint and an index on tasks.team_id. server.ts passes user input as $1 and $2 rather than concatenating SQL.",
        modernCounterpart: "Three of eight reviewed postings named PostgreSQL, SQL, or schema design. Parameterized queries remain the standard defense against injection.",
        comparisonState: "verified",
        manualStepsChanged: [],
        transferableConcepts: ["normalization and referential integrity", "indexing for a known access pattern", "injection-safe queries", "connection pooling"],
        newConcepts: ["migration tooling", "query plan analysis under load", "pool sizing from measured throughput"],
        whyItIsUsed: "Constraints and parameterized queries keep data correct and keep untrusted input out of the query itself.",
        explanation: "The index on tasks.team_id was chosen for the listing query, not added by habit. That reasoning is the part employers are testing for. The missing piece is applying schema changes repeatably: the README applies this file by hand with psql.",
        recommendedAction: "Convert schema.sql into two numbered migration files so a schema change can be replayed on a clean database.",
        confidence: "high",
        limitations: ["The schema is small. It does not demonstrate performance work on a large dataset."],
      },
      {
        id: "finding-testing-current",
        title: "Your testing tools are the current ones",
        group: "current",
        existingCapability: "Alex wrote an eight-case test plan with expected results and automated the health check with Jest and Supertest.",
        evidenceClaimIds: ["claim-local-test", "claim-manual-test-plan"],
        currentRequirementId: "automated-testing",
        relationshipType: "foundation_for",
        relationshipEvidence: [marketEvidence("automated-testing", "job-devsavant-backend-latam")],
        artifactReference: testReference,
        observedImplementation: "One automated case imports the Express app in memory and asserts status and body. Seven cases were executed by hand in Postman, about ten minutes per run.",
        modernCounterpart: "Jest and Supertest are still in current use for this exact purpose. Two of eight reviewed postings named testing explicitly.",
        comparisonState: "verified",
        manualStepsChanged: [],
        transferableConcepts: ["assertion writing", "expected-result test plans", "testing an app without opening a port"],
        newConcepts: ["database fixtures and test isolation", "running the suite automatically on every change"],
        whyItIsUsed: "Automated assertions catch a regression at the moment it is introduced rather than during a manual pass before delivery.",
        explanation: "The assignment already names the blocker precisely: the seven manual cases write to the database, and the course never covered resetting test data between runs. The cases are written down. What is missing is the setup mechanism, not the testing judgment.",
        recommendedAction: "Automate TC-3 and TC-5 from the test plan, since both reject bad input and never reach the database.",
        confidence: "high",
        limitations: ["One of eight cases is automated. That is a real coverage limit, distinct from a knowledge limit."],
      },
      {
        id: "finding-ci-transfer",
        title: "A test you run by hand transfers into CI",
        group: "transferable",
        existingCapability: "Alex runs npm test locally before each manual release and records the result in a delivery document.",
        evidenceClaimIds: ["claim-local-test", "claim-manual-test-plan", "claim-manual-deployment"],
        currentRequirementId: "ci-cd",
        relationshipType: "automates",
        relationshipEvidence: [
          marketEvidence("ci-cd", "job-lingaro-backend-mx"),
          documentationEvidence("docs-github-actions-ci", "GitHub documents CI workflows that automatically build and test repository changes."),
        ],
        artifactReference: testReference,
        observedImplementation: "The README puts npm test at step 4 of the local sequence, and the instructor's note says running checks automatically was outside the program.",
        modernCounterpart: "A CI workflow runs the same command on each proposed change and records the result where the team can see it.",
        comparisonState: "illustrative",
        manualStepsChanged: ["Remembering to run the test before a release", "Reporting the result manually", "Discovering a broken release after someone notices"],
        transferableConcepts: ["the test command itself", "pass or fail as a release signal", "checking before shipping"],
        newConcepts: ["workflow triggers", "hosted runner environments", "required status checks on a pull request"],
        whyItIsUsed: "CI gives every proposed change the same check and leaves a visible result before the change is merged.",
        explanation: "CI does not replace testing knowledge, and it is not a new kind of test. It moves when and where the existing command runs. The instructor's feedback on the assignment describes this exact step as the industry practice the program did not cover.",
        recommendedAction: "Run the existing health test in one GitHub Actions workflow triggered by pull requests.",
        confidence: "high",
        limitations: ["The suggested workflow has not been executed against the fictional fixture and remains illustrative."],
      },
      {
        id: "finding-container-bridge",
        title: "Manual environment setup is one step from a container",
        group: "small_bridge",
        existingCapability: "Alex keeps runtime configuration outside application logic and documents a repeatable setup sequence that every teammate follows by hand.",
        evidenceClaimIds: ["claim-manual-deployment", "claim-runtime-config", "claim-connection-pool"],
        currentRequirementId: "containerization",
        relationshipType: "standardizes",
        relationshipEvidence: [
          marketEvidence("containerization", "job-lingaro-backend-mx"),
          documentationEvidence("docs-docker-overview", "Docker documents containers as a way to package an application with what it needs and run it consistently across environments."),
        ],
        artifactReference: configReference,
        observedImplementation: "The README asks each developer to install Node 16 and PostgreSQL 13, create an environment file, set DATABASE_URL and PORT, load the schema, test, and start the API.",
        modernCounterpart: "A Dockerfile records the runtime, dependency installation, working directory, startup command, and exposed port as versioned build instructions, while configuration stays outside the image.",
        comparisonState: "illustrative",
        manualStepsChanged: ["Installing the runtime directly on each host", "Repeating dependency installation by hand", "Reconstructing the environment file from personal notes"],
        transferableConcepts: ["external configuration", "port selection", "dependency installation order", "repeatable startup"],
        newConcepts: ["image layers", "build context", "container lifecycle", "runtime secret injection"],
        whyItIsUsed: "Containers make the runtime and setup sequence reproducible across developer machines, CI runners, and deployment targets.",
        explanation: "The capstone report names setup differences between teammates as a cost of several hours over the semester. That is the exact problem containers address. Alex already separates configuration from code, which is the harder habit; what remains is a packaging and lifecycle model.",
        recommendedAction: "Write and run one Dockerfile for the existing API, keeping DATABASE_URL outside the image.",
        confidence: "high",
        limitations: ["The evidence set includes the entry point but not the package manifest, so the suggested Dockerfile cannot be confirmed as runnable without it."],
      },
      {
        id: "finding-observability-gap",
        title: "One log line is a start, not observability",
        group: "genuine_gap",
        existingCapability: "Middleware writes a timestamp, method, and URL to the console for every request. Alex states the project emits no metrics and that the output cannot be searched or aggregated.",
        evidenceClaimIds: ["claim-request-logging", "claim-observability-limits"],
        currentRequirementId: "observability",
        relationshipType: "foundation_for",
        relationshipEvidence: [
          marketEvidence("observability", "job-latamcent-deployment-latam"),
          documentationEvidence("docs-opentelemetry-overview", "OpenTelemetry describes instrumentation for generating, collecting, and exporting traces, metrics, and logs."),
        ],
        artifactReference: loggingReference,
        observedImplementation: "A single console.log call per request, printed to standard output on whichever machine happens to be running the process.",
        modernCounterpart: "Structured events, metrics, and traces are emitted in a defined format and sent somewhere they can be queried, correlated, and alerted on.",
        comparisonState: "conceptual",
        manualStepsChanged: ["Reading raw console output on the server to reconstruct what happened"],
        transferableConcepts: ["the instinct to record every request", "choosing what is worth recording"],
        newConcepts: ["structured fields instead of a printed string", "metrics and traces", "correlation across requests", "alert conditions"],
        whyItIsUsed: "Operational signals let a team investigate behavior that only appears while the service is running, after it has already happened.",
        explanation: "The logging line shows the right instinct and is a real starting point for one of three signals. Aggregation, metrics, tracing, and alerting have no counterpart anywhere in the submitted evidence, and Alex says so directly in the report. This stays a genuine gap rather than a small bridge.",
        recommendedAction: "Replace the console.log line with one structured log call carrying method, path, status, and duration.",
        confidence: "high",
        limitations: ["No runtime or deployment evidence was supplied, so this conclusion is limited to the submitted artifacts."],
      },
      {
        id: "finding-cloud-unknown",
        title: "Cloud capability cannot be concluded either way",
        group: "insufficient_evidence",
        existingCapability: "Operating systems and networking appear in the curriculum. Alex states the project has only run on a laptop and a faculty server.",
        evidenceClaimIds: ["claim-web-foundations", "claim-no-hosted-deployment"],
        currentRequirementId: "cloud-platform",
        relationshipType: "foundation_for",
        relationshipEvidence: [marketEvidence("cloud-platform", "job-restaurant365-devops-mx")],
        observedImplementation: "The release sequence ends at scp, ssh, and a process kept alive inside screen on a faculty machine.",
        modernCounterpart: "Seven of eight reviewed postings named AWS, Azure, or Google Cloud in their role context.",
        comparisonState: "conceptual",
        manualStepsChanged: [],
        transferableConcepts: ["process lifecycle on a remote host", "networking and port concepts", "the difference between a build artifact and a running process"],
        newConcepts: ["provider identity and access", "managed services", "cloud networking", "cost and operational controls"],
        whyItIsUsed: "Cloud platforms provide managed infrastructure and deployment primitives, but their value depends on the system being operated.",
        explanation: "Alex tells us where the project ran. That says nothing about what Alex understands. Running a process on a remote machine over SSH is a genuine foundation, and NotZero will not convert a missing artifact into a missing ability. This stays unknown until there is evidence either way.",
        recommendedAction: "Deploy the container from step one to any free hosting tier and save the URL and the commands used.",
        confidence: "high",
        limitations: ["No cloud artifact was included, and the self-report describes the project rather than the person's knowledge."],
      },
    ],
    counts: { current: 3, transferable: 1, smallBridge: 1, genuineGap: 1, insufficientEvidence: 1 },
    nextSteps: [
      {
        rank: 1,
        title: "Containerize the project you already built",
        buildsOn: ["claim-manual-deployment", "claim-runtime-config"],
        reuses: "External configuration, dependency installation, ports, and the documented startup sequence.",
        newConcept: "Image construction, build context, container lifecycle, and runtime secret injection.",
        whyItIsUsed: "A container makes the project's runtime reproducible across developer machines, CI, and deployment targets.",
        whyNow: "It reuses the strongest project evidence and answers a requirement named in seven of eight reviewed postings.",
        proof: "Run the API from a clean container while injecting DATABASE_URL at runtime, and document the commands used.",
      },
      {
        rank: 2,
        title: "Move the existing health test into CI",
        buildsOn: ["claim-local-test", "claim-manual-test-plan"],
        reuses: "The health endpoint test and the pass or fail signal you already rely on before a release.",
        newConcept: "Workflow triggers, hosted runners, and visible pull-request checks.",
        whyItIsUsed: "CI repeats the same verification for every proposed change and makes the result visible to collaborators.",
        whyNow: "The test already exists and runs in under two seconds. The learning delta is the workflow file, not the testing.",
        proof: "A pull request automatically runs the health test and shows a passing or failing check.",
      },
      {
        rank: 3,
        title: "Turn your log line into a structured event",
        buildsOn: ["claim-request-logging"],
        reuses: "The middleware that already runs on every request and the decision about what is worth recording.",
        newConcept: "Structured fields, a duration measurement, and one operational question the signal answers.",
        whyItIsUsed: "A structured event can be filtered and counted after the fact. A printed string cannot.",
        whyNow: "It addresses the genuine gap by changing one existing line rather than adopting a monitoring stack.",
        proof: "Emit method, path, status, and duration as fields, then answer one question using only that output.",
      },
    ],
    upgradeChallenge: {
      id: "challenge-container-ci",
      title: "Turn the 2022 API into a reproducible build",
      basedOnClaimIds: ["claim-manual-deployment", "claim-runtime-config", "claim-local-test"],
      objective: "Package the existing API in a container and run its existing health test in CI, without placing DATABASE_URL in the image or the repository.",
      acceptanceCriteria: [
        "The image build documents the runtime and dependency-installation steps.",
        "DATABASE_URL is injected at runtime and is absent from the image and repository.",
        "The API starts with its documented port behavior in a clean container.",
        "A pull-request workflow runs the existing health test and reports the result.",
      ],
      comparisonState: "illustrative",
    },
    codeBridges: [
      {
        id: "code-bridge-container",
        title: "Environment setup by hand becomes a build file",
        claimId: "claim-runtime-config",
        requirementId: "containerization",
        relationshipType: "standardizes",
        comparisonState: "illustrative",
        observed: {
          label: "What Alex wrote",
          language: "typescript",
          code: "const port = Number(process.env.PORT ?? 3000);\nconst databaseUrl = process.env.DATABASE_URL;\n\nif (!databaseUrl) {\n  // The README explains how to create .env by hand before starting.\n  throw new Error(\"DATABASE_URL is not set. Copy .env.example to .env first.\");\n}",
          path: "alex-api/src/config.ts",
          startLine: 1,
          endLine: 7,
          date: "2022-04-14",
        },
        demonstrates: "Configuration is read from the environment, never hard-coded, with a required value that fails loudly and an optional value with a default. That separation is the prerequisite for running the same code in more than one place.",
        modern: {
          label: "Current practice",
          language: "dockerfile",
          code: "FROM node:22-alpine\nWORKDIR /app\n\nCOPY package*.json ./\nRUN npm ci --omit=dev\n\nCOPY . .\n\n# PORT keeps its default; DATABASE_URL is injected at run time,\n# so no connection string is baked into the image.\nENV PORT=3000\nEXPOSE 3000\nCMD [\"node\", \"dist/server.js\"]",
          caption: "The README's install-and-start steps, written once as build instructions instead of repeated by each teammate.",
          filename: "Dockerfile",
        },
        whyItMatters: "The capstone report records that setup differences between teammates cost several hours across the semester. A build file removes that class of problem by making the runtime part of the artifact.",
        whatTransfers: ["Reading configuration from the environment", "Choosing a port default", "Knowing the dependency-installation order", "Keeping secrets out of the repository"],
        whatIsNew: ["Image layers and build caching", "Build context and what gets copied", "Container lifecycle and restart behavior", "Injecting secrets at run time"],
        limitations: ["This Dockerfile was not executed. The evidence set has no package manifest, and the start command assumes the compiled output path from the README's build step."],
      },
      {
        id: "code-bridge-ci",
        title: "A test you remember to run becomes a test that always runs",
        claimId: "claim-local-test",
        requirementId: "ci-cd",
        relationshipType: "automates",
        comparisonState: "illustrative",
        observed: {
          label: "What Alex wrote",
          language: "typescript",
          code: "import request from \"supertest\";\nimport { app } from \"../src/server\";\n\n// Run with `npm test` before every manual release (see README).\ntest(\"health endpoint\", async () => {\n  const response = await request(app).get(\"/health\");\n  expect(response.status).toBe(200);\n  expect(response.body).toEqual({ status: \"ok\" });\n});",
          path: "alex-api/tests/health.test.ts",
          startLine: 1,
          endLine: 9,
          date: "2022-04-14",
        },
        demonstrates: "A working integration test: the app is imported in memory rather than started on a port, the request is real, and both status and body are asserted. The comment shows the test is already tied to the release decision.",
        modern: {
          label: "Current practice",
          language: "yaml",
          code: "name: CI\non: pull_request\n\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@v4\n        with:\n          node-version: 22\n      - run: npm ci\n      - run: npm test",
          caption: "The same npm test command, moved from a step in the README to a check that runs on every pull request.",
          filename: ".github/workflows/ci.yml",
        },
        whyItMatters: "The test does not change. What changes is that nobody has to remember it. The instructor's feedback on the assignment names this exact step as the practice the program did not cover.",
        whatTransfers: ["The test file, unmodified", "The npm test command", "Treating a failure as a reason not to release"],
        whatIsNew: ["Workflow triggers and events", "Hosted runners and their setup steps", "Required checks that block a merge"],
        limitations: ["This workflow was not executed. It runs only the automated case; the seven manual cases in the test plan would still need database fixtures."],
      },
      {
        id: "code-bridge-observability",
        title: "A printed line becomes a signal you can query",
        claimId: "claim-request-logging",
        requirementId: "observability",
        relationshipType: "foundation_for",
        comparisonState: "conceptual",
        observed: {
          label: "What Alex wrote",
          language: "typescript",
          code: "// Simple request log so I can see what happened during the demo.\napp.use((req, _res, next) => {\n  console.log(new Date().toISOString(), req.method, req.url);\n  next();\n});",
          path: "alex-api/src/server.ts",
          startLine: 8,
          endLine: 12,
          date: "2022-04-14",
        },
        demonstrates: "Middleware that runs on every request, and a decision about which three facts are worth recording. The placement and the choice of fields are both correct; the output format is what limits it.",
        modern: {
          label: "Current practice",
          language: "typescript",
          code: "app.use((req, res, next) => {\n  const startedAt = process.hrtime.bigint();\n  res.on(\"finish\", () => {\n    logger.info({\n      method: req.method,\n      path: req.route?.path ?? req.url,\n      status: res.statusCode,\n      durationMs: Number(process.hrtime.bigint() - startedAt) / 1e6,\n    });\n  });\n  next();\n});",
          caption: "The same middleware position, emitting named fields after the response finishes so status and duration are known.",
          filename: "src/request-logging.ts",
        },
        whyItMatters: "Fields can be filtered, counted, and graphed. A printed string cannot answer \"how many requests returned 500 in the last hour\" without someone reading the console by hand.",
        whatTransfers: ["Logging as middleware on every request", "Choosing method and path as the identifying fields", "The habit of recording what happened"],
        whatIsNew: ["Named fields instead of positional text", "Waiting for the response to record status and duration", "Sending output somewhere queryable", "Metrics and traces as separate signals"],
        limitations: ["This sketch was not executed and assumes a logger the project does not currently include. It covers the logging signal only, not metrics, tracing, or alerting."],
      },
    ],
    vocabularyBridges: [
      {
        id: "vocab-config",
        claimId: "claim-runtime-config",
        yourTerm: "Reading PORT and DATABASE_URL from the environment, with a .env file each developer creates by hand",
        industryTerm: "Externalized configuration",
        relation: "equivalent",
        note: "This is the same practice under its professional name. Postings that ask for it assume exactly what config.ts already does: settings live outside the code so the same build runs in more than one place.",
        sourcePath: "alex-api/src/config.ts",
        requirementId: "containerization",
      },
      {
        id: "vocab-validation",
        claimId: "claim-rest-endpoints",
        yourTerm: "Checking the request body by hand before touching the database",
        industryTerm: "Request validation",
        relation: "equivalent",
        note: "Hand-written checks and a validation library solve the same problem in the same place. The library removes the boilerplate; the decision about what counts as valid stays yours.",
        sourcePath: "alex-api/src/server.ts",
        requirementId: "api-design",
      },
      {
        id: "vocab-parameterized",
        claimId: "claim-parameterized-queries",
        yourTerm: "Passing values as $1 and $2 instead of building the SQL string",
        industryTerm: "Parameterized queries, also called prepared statements",
        relation: "equivalent",
        note: "The term in the job posting is the term for what the code already does. No translation is needed here beyond knowing both names.",
        sourcePath: "alex-api/src/server.ts",
        requirementId: "relational-databases",
      },
      {
        id: "vocab-integrity",
        claimId: "claim-relational-schema",
        yourTerm: "A foreign key with ON DELETE CASCADE, plus an index on the column the listing query filters",
        industryTerm: "Referential integrity and an indexing strategy",
        relation: "equivalent",
        note: "Choosing an index for a query you actually run is the whole of what \"indexing strategy\" means at this level. The schema already shows the reasoning.",
        sourcePath: "alex-api/sql/schema.sql",
        requirementId: "relational-databases",
      },
      {
        id: "vocab-pooling",
        claimId: "claim-connection-pool",
        yourTerm: "One shared pg Pool with max set to 10",
        industryTerm: "Connection pooling",
        relation: "equivalent",
        note: "The named practice and the code are the same thing. What a team would add is choosing the number from a measurement rather than a sensible guess.",
        sourcePath: "alex-api/src/db.ts",
        requirementId: "relational-databases",
      },
      {
        id: "vocab-test-cases",
        claimId: "claim-manual-test-plan",
        yourTerm: "The written plan of TC-1 through TC-8 with steps and expected results",
        industryTerm: "Test cases, and their expected results are acceptance criteria",
        relation: "equivalent",
        note: "A team would recognize this document immediately. The format is the industry format; only the execution is manual.",
        sourcePath: "quality-assurance-assignment.md",
        requirementId: "automated-testing",
      },
      {
        id: "vocab-premerge",
        claimId: "claim-local-test",
        yourTerm: "Running npm test on your laptop before each release",
        industryTerm: "A pre-merge check",
        relation: "narrower",
        note: "The check is the same. The industry term implies it runs automatically on every proposed change, not when someone remembers. That difference is the learning delta, and it is small.",
        sourcePath: "alex-api/tests/health.test.ts",
        requirementId: "ci-cd",
      },
      {
        id: "vocab-supervision",
        claimId: "claim-manual-deployment",
        yourTerm: "Copying dist/ with scp and restarting the process inside screen so it survives logout",
        industryTerm: "Release process and process supervision",
        relation: "narrower",
        note: "You are solving the real problem: getting a build onto a host and keeping it alive. The professional versions add repeatability and automatic restart, but the problem you identified is the right one.",
        sourcePath: "alex-api/README.md",
        requirementId: "cloud-platform",
      },
      {
        id: "vocab-logging",
        claimId: "claim-request-logging",
        yourTerm: "One console.log line per request with time, method, and URL",
        industryTerm: "Structured logging",
        relation: "related",
        note: "These are close but not the same, and it would be unfair to tell you otherwise. You have the right instinct and the right position in the request path. What the industry term adds is named fields that can be searched and counted afterwards.",
        sourcePath: "alex-api/src/server.ts",
        requirementId: "observability",
      },
    ],
    // The three profiles are clusters observed in the reviewed postings, so they
    // ship with the market pack and are shared by every report built against it.
    roleProfiles: pack.roleProfiles,
    roadmap: {
      title: "Four builds, in the order that reuses the most of what you already have",
      premise: "Each step starts from something already in the 2022 project and adds exactly one new idea. Nothing here asks you to relearn a fundamental you have already demonstrated, and every step ends in a file or a URL you can show someone.",
      phases: [
        {
          order: 1,
          title: "Package the project so it runs anywhere",
          goal: "Turn the README's setup instructions into a build file, so a clean machine can run the API without anyone following steps by hand.",
          startsFromClaimIds: ["claim-manual-deployment", "claim-runtime-config"],
          vocabularyIds: ["vocab-config"],
          newConcepts: ["Image layers and build caching", "Build context", "Container lifecycle", "Injecting secrets at run time"],
          buildArtifact: "A Dockerfile committed at the root of the project.",
          checkpoint: "The API answers on its documented port from a clean container, with DATABASE_URL passed in at run time and absent from the image.",
          scope: "One new file. One command to verify.",
          unlocksRequirementIds: ["containerization"],
        },
        {
          order: 2,
          title: "Make the check run without you",
          goal: "Move the health test you already run before each release into a workflow that runs on every proposed change.",
          startsFromClaimIds: ["claim-local-test", "claim-manual-test-plan"],
          vocabularyIds: ["vocab-premerge", "vocab-test-cases"],
          newConcepts: ["Workflow triggers and events", "Hosted runners", "Required checks on a pull request"],
          buildArtifact: "A .github/workflows/ci.yml that installs dependencies and runs the existing test.",
          checkpoint: "Opening a pull request shows a passing or failing check without anyone running a command.",
          scope: "One new file. The test itself does not change.",
          unlocksRequirementIds: ["ci-cd", "automated-testing"],
        },
        {
          order: 3,
          title: "Put it somewhere other than your laptop",
          goal: "Run the container from step one on a hosted platform, so deployment stops being a private sequence on one faculty server.",
          startsFromClaimIds: ["claim-manual-deployment", "claim-no-hosted-deployment"],
          vocabularyIds: ["vocab-supervision"],
          newConcepts: ["Provider identity and access", "Managed database services", "Cloud networking basics", "Cost and shutdown controls"],
          buildArtifact: "A running URL plus a short deployment note recording the exact commands and settings used.",
          checkpoint: "Someone else can open the URL and get a response, and you can redeploy from the same notes.",
          scope: "One free hosting tier. The container from step one is the input.",
          unlocksRequirementIds: ["cloud-platform"],
        },
        {
          order: 4,
          title: "Make the running service explain itself",
          goal: "Replace the console line with structured fields, so questions about the running system can be answered from its own output.",
          startsFromClaimIds: ["claim-request-logging", "claim-observability-limits"],
          vocabularyIds: ["vocab-logging"],
          newConcepts: ["Named fields instead of positional text", "Recording status and duration after the response", "Sending output somewhere queryable"],
          buildArtifact: "The request middleware, rewritten to emit method, path, status, and duration as fields.",
          checkpoint: "You can answer how many requests returned a server error in the last hour using only the service's own output.",
          scope: "One existing function, rewritten. No new monitoring stack.",
          unlocksRequirementIds: ["observability"],
        },
      ],
    },
    limitations: [
      "This deterministic report demonstrates NotZero's trust and comparison experience for one fictional software scenario. It does not certify mastery or job eligibility.",
      "Market counts come from eight manually reviewed postings observed on July 18, 2026 and are not a representative labor-market survey.",
      "Modern counterparts labelled illustrative or conceptual were written for this report and have not been executed against the project.",
    ],
  });

  // The syllabus is kept beside the roadmap rather than inside it so the phase
  // list stays readable as a plan. Both halves are validated together below.
  const roadmap = reportWithoutCoverage.roadmap && {
    ...reportWithoutCoverage.roadmap,
    phases: reportWithoutCoverage.roadmap.phases.map((phase) => ({ ...phase, ...(alexPhaseCurriculum[phase.order] ?? {}) })),
  };

  const report = knowledgeBridgeReportSchema.parse({
    ...reportWithoutCoverage,
    roadmap,
    requirementCoverage: deriveRequirementCoverage(reportWithoutCoverage.findings, pack),
  });
  return validateReportReferences(report, ledger);
}

export const alexBridgeReport = buildPreparedBridgeReport();
