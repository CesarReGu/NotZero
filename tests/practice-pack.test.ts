import assert from "node:assert/strict";
import test from "node:test";
import { assembleGeneratedPack, finalizeGeneratedReport, generatePracticePackWithGpt56 } from "../lib/market/practice-pack-adapter";
import { validatePracticePack } from "../lib/market/current-practice";
import { extractWithGpt56 } from "../lib/evidence/openai-adapter";
import { compareWithGpt56 } from "../lib/bridge/openai-adapter";
import { alexBridgeReport } from "../lib/bridge/prepared-report";
import type { ExtractedSource } from "../lib/evidence/files";
import { modelResponse } from "./fixtures/model-scenarios";

const hash = (character: string) => character.repeat(64);
const mlContext = { field: "Machine learning", targetTitle: "Machine learning engineer", location: "Mexico · Remote-friendly" };
const at = new Date("2026-07-20T00:00:00Z");

// A compact reference for a field the curated software pack does not cover. One
// requirement (vector-databases) is intentionally referenced by no archetype, so
// the deterministic assembly must drop it rather than emit an unreciprocated pack.
const mlPackModel = {
  roleArchetypes: [
    { id: "role-ml-engineer", title: "Machine Learning Engineer", sector: "Fintech (representative)", seniority: "early_career" as const, requirementIds: ["model-training", "model-serving", "experiment-tracking", "feature-engineering"] },
    { id: "role-data-scientist", title: "Data Scientist", sector: "E-commerce (representative)", seniority: "mixed" as const, requirementIds: ["model-training", "model-evaluation", "feature-engineering"] },
    { id: "role-mlops", title: "MLOps Engineer", sector: "Platform (representative)", seniority: "mixed" as const, requirementIds: ["model-serving", "experiment-tracking", "model-monitoring"] },
    { id: "role-applied-scientist", title: "Applied Scientist", sector: "Healthtech (representative)", seniority: "senior" as const, requirementIds: ["model-evaluation", "model-training"] },
    { id: "role-junior-ml", title: "Junior ML Engineer", sector: "Startup (representative)", seniority: "entry" as const, requirementIds: ["feature-engineering", "model-training", "model-evaluation"] },
  ],
  requirements: [
    { id: "model-training", name: "Model training", kind: "practice" as const, aliases: ["supervised learning"], context: "Fitting a model to a labeled training set and selecting hyperparameters." },
    { id: "model-evaluation", name: "Model evaluation", kind: "practice" as const, aliases: ["metrics"], context: "Measuring a model with held-out data and appropriate metrics." },
    { id: "feature-engineering", name: "Feature engineering", kind: "practice" as const, aliases: [], context: "Preparing and encoding inputs for a model." },
    { id: "model-serving", name: "Model serving", kind: "tool" as const, aliases: ["inference API"], context: "Exposing a trained model behind an interface applications can call." },
    { id: "experiment-tracking", name: "Experiment tracking", kind: "tool" as const, aliases: [], context: "Recording runs, parameters, and metrics so results are reproducible." },
    { id: "model-monitoring", name: "Model monitoring", kind: "practice" as const, aliases: ["drift detection"], context: "Watching a deployed model for degradation over time." },
    { id: "vector-databases", name: "Vector databases", kind: "tool" as const, aliases: [], context: "Storing embeddings for retrieval." },
  ],
  roleProfiles: [
    { id: "profile-ml-engineer", title: "ML Engineer", summary: "Builds and ships models into applications.", emphasis: "Serving and reproducibility over pure modeling.", archetypeIds: ["role-ml-engineer", "role-mlops"], requirementIds: ["model-serving", "experiment-tracking", "model-training"] },
    { id: "profile-data-scientist", title: "Data Scientist", summary: "Frames problems and builds models from data.", emphasis: "Modeling and evaluation depth.", archetypeIds: ["role-data-scientist", "role-applied-scientist", "role-junior-ml"], requirementIds: ["model-training", "model-evaluation", "feature-engineering"] },
  ],
  technicalSources: [
    { id: "docs-sklearn", title: "scikit-learn User Guide", publisher: "scikit-learn", url: "https://scikit-learn.org/stable/user_guide.html", supports: ["modern_implementation_of" as const, "foundation_for" as const], usageBasis: "Documents the estimator and evaluation APIs used across the field." },
    { id: "docs-mlflow", title: "MLflow Tracking", publisher: "MLflow", url: "https://mlflow.org/docs/latest/tracking.html", supports: ["standardizes" as const, "automates" as const], usageBasis: "Documents experiment tracking and model packaging." },
  ],
  learningResources: [
    { id: "read-sklearn-eval", title: "Model evaluation", publisher: "scikit-learn", url: "https://scikit-learn.org/stable/modules/model_evaluation.html", kind: "official_documentation" as const, readingMinutes: 40, covers: "Metrics beyond accuracy for imbalanced classification." },
    { id: "read-mlflow", title: "MLflow quickstart", publisher: "MLflow", url: "https://mlflow.org/docs/latest/quickstart.html", kind: "official_documentation" as const, readingMinutes: 30, covers: "Tracking runs and registering a model." },
    { id: "read-fastapi", title: "FastAPI", publisher: "FastAPI", url: "https://fastapi.tiangolo.com/", kind: "official_documentation" as const, readingMinutes: 35, covers: "Serving a function behind an HTTP endpoint." },
    { id: "read-evidently", title: "Data and model drift", publisher: "Evidently", url: "https://docs.evidentlyai.com/", kind: "reference" as const, readingMinutes: 25, covers: "Detecting drift in a deployed model." },
  ],
  methodology: ["Synthesized from common machine-learning role expectations for the given location."],
  limitations: ["An illustrative sketch of current practice, not a market survey."],
};

test("a generated pack is assembled into a valid, reciprocal, field-specific pack", async () => {
  const pack = await generatePracticePackWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", fieldContext: mlContext, now: at, fetcher: async () => modelResponse(mlPackModel) });

  assert.equal(pack.generated, true);
  assert.equal(pack.field, "Machine learning");
  assert.equal(pack.targetScope, "Machine learning engineer");
  // The unreferenced requirement is dropped; the six emphasized ones remain.
  assert.equal(pack.requirements.length, 6);
  assert.ok(!pack.requirements.some((requirement) => requirement.id === "vector-databases"));
  // Reciprocity and counts hold, so the strict pack validator accepts it.
  for (const requirement of pack.requirements) {
    assert.equal(requirement.mentionCount, requirement.sourceIds.length);
    for (const sourceId of requirement.sourceIds) {
      assert.ok(pack.sources.find((source) => source.id === sourceId)?.requirementIds.includes(requirement.id));
    }
  }
  assert.doesNotThrow(() => validatePracticePack(pack));
});

test("generated role sources link to real job-board searches, not fabricated postings", () => {
  const pack = assembleGeneratedPack(mlPackModel, mlContext, at);
  assert.equal(pack.sources.length, 5);
  for (const source of pack.sources) {
    assert.match(source.url, /^https:\/\/www\.linkedin\.com\/jobs\/search\/\?keywords=/);
    assert.equal(source.observedAt, "2026-07-20");
    assert.match(source.usageBasis, /not an individually reviewed posting/i);
  }
  assert.match(pack.datasetVersion, /^generated-machine-learning-2026-07-20-/);
  assert.ok(pack.methodology.some((line) => /generated by GPT-5\.6/i.test(line)));
});

test("assembly drops role profiles that lose their minimum of two observed requirements", () => {
  const thin = structuredClone(mlPackModel);
  // Point a profile at requirements none of its archetypes emphasize.
  thin.roleProfiles[0].archetypeIds = ["role-applied-scientist"];
  thin.roleProfiles[0].requirementIds = ["model-serving", "experiment-tracking"];
  const pack = assembleGeneratedPack(thin, mlContext, at);
  assert.ok(!pack.roleProfiles.some((profile) => profile.id === "profile-ml-engineer"));
  assert.doesNotThrow(() => validatePracticePack(pack));
});

test("a report against a generated pack cannot claim the verified state and is labeled generated", () => {
  const pack = assembleGeneratedPack(mlPackModel, mlContext, at);
  const withVerified = {
    ...alexBridgeReport,
    findings: alexBridgeReport.findings.map((finding, index) => (index === 0 ? { ...finding, comparisonState: "verified" as const } : finding)),
    upgradeChallenge: { ...alexBridgeReport.upgradeChallenge, comparisonState: "verified" as const },
  };
  const finalized = finalizeGeneratedReport(withVerified, pack);

  assert.ok(finalized.findings.every((finding) => finding.comparisonState !== "verified"));
  assert.equal(finalized.upgradeChallenge.comparisonState, "illustrative");
  assert.ok(finalized.limitations.some((limit) => /generated by GPT-5\.6/i.test(limit)));
  assert.ok(finalized.limitations.some((limit) => /representative role archetypes/i.test(limit)));
});

const mlSources: ExtractedSource[] = [
  {
    metadata: { id: "ml-study-plan", name: "study-plan.md", sourceType: "curriculum", date: "2020-06-01", mimeType: "text/markdown", sizeBytes: 120, contentHash: hash("1"), normalizedHash: hash("a"), characterCount: 119 },
    normalizedText: "Coursework: probability and statistics, linear algebra, data mining, and pattern recognition.",
  },
  {
    metadata: { id: "ml-train", name: "src/train.py", sourceType: "source_file", date: "2020-05-15", mimeType: "text/x-python", sizeBytes: 200, contentHash: hash("2"), normalizedHash: hash("b"), characterCount: 150 },
    normalizedText: "clf = RandomForestClassifier(n_estimators=300)\nclf.fit(X_train, y_train)\nproba = clf.predict_proba(X_test)[:, 1]\nprint(roc_auc_score(y_test, proba))",
  },
];

const mlEvidenceOutput = {
  field: "Machine learning",
  targetTitle: "Machine learning engineer",
  fieldRationale: "The project trains, tunes, and evaluates a classifier with scikit-learn.",
  claims: [
    { id: "claim-ml-foundations", title: "Statistics and ML math foundations", statement: "The curriculum records expected exposure to statistics, linear algebra, and data mining.", evidenceClass: "expected_exposure", references: [{ sourceId: "ml-study-plan", excerpt: "probability and statistics, linear algebra, data mining", locator: { path: "study-plan.md", kind: "section", value: "Coursework", startLine: 1, endLine: 1 } }], confidence: "high", limitations: ["A curriculum records expected exposure, not mastery."] },
    { id: "claim-ml-training", title: "Trains and scores a classifier", statement: "The project fits a classifier on a training split and scores it with a ranking metric.", evidenceClass: "demonstrated", references: [{ sourceId: "ml-train", excerpt: "clf.fit(X_train, y_train)", locator: { path: "src/train.py", kind: "symbol", value: "fit", startLine: 2, endLine: 2 } }], confidence: "high", limitations: ["One model trained once on a static dataset."] },
  ],
  warnings: [],
  limitations: ["The evidence supports bounded claims."],
};

function mlBridgeOutput() {
  return {
    findings: [{
      id: "finding-ml-serving",
      title: "A trained model is one bridge from model serving",
      group: "small_bridge",
      existingCapability: "The project already trains and scores a classifier end to end.",
      evidenceClaimIds: ["claim-ml-training"],
      currentRequirementId: "model-serving",
      relationshipType: "standardizes",
      relationshipSourceIds: ["role-ml-engineer", "docs-mlflow"],
      artifactClaimId: "claim-ml-training",
      observedImplementation: "A script fits a classifier and prints a metric.",
      modernCounterpart: "Current roles expect the trained model behind a served inference endpoint.",
      comparisonState: "verified",
      manualStepsChanged: ["Run predictions from a script by hand"],
      transferableConcepts: ["training", "evaluation"],
      newConcepts: ["inference endpoint", "model packaging"],
      whyItIsUsed: "Teams serve models so predictions are available to applications.",
      explanation: "The trained model is the direct input to a serving layer.",
      recommendedAction: "Wrap the saved model in a small inference endpoint.",
      confidence: "high",
      limitations: ["The serving layer has not been built."],
    }],
    nextSteps: [1, 2, 3].map((rank) => ({ rank, title: `Serving proof step ${rank}`, buildsOn: ["claim-ml-training"], reuses: "Training and evaluation.", newConcept: "Model serving.", whyItIsUsed: "Applications call served models.", whyNow: "It reuses the trained model.", proof: `Complete serving proof ${rank}.` })),
    upgradeChallenge: { id: "challenge-ml-serving", title: "Serve the trained model", basedOnClaimIds: ["claim-ml-training"], objective: "Expose the trained model behind an endpoint.", acceptanceCriteria: ["It returns a prediction", "The model file is loaded once"], comparisonState: "verified" },
    walkthrough: { title: "From training script to endpoint", claimId: "claim-ml-training", observedImplementation: "The script fits and scores a classifier.", modernCounterpart: "The model is loaded once and served behind a request handler.", relationshipType: "standardizes", comparisonState: "verified", illustrativeSketch: "POST /predict", whatTransfers: ["Training"], whatIsNew: ["Serving"], limitations: ["The sketch has not been executed."] },
    walkthroughUnavailableReason: null,
    limitations: ["This comparison uses a model-generated current-practice reference."],
  };
}

function incompleteResponse() {
  // A response truncated by the output-token ceiling: no output_text, and a
  // status the reader must recognize instead of failing opaquely. This is the
  // failure that left the machine-learning field with no comparison in
  // production, so recovery from it is covered explicitly.
  return new Response(JSON.stringify({ status: "incomplete", incomplete_details: { reason: "max_output_tokens" }, output: [] }), { status: 200, headers: { "content-type": "application/json" } });
}

test("pack generation recovers from a truncated first response instead of degrading", async () => {
  let attempts = 0;
  const fetcher: typeof fetch = async () => {
    attempts += 1;
    return attempts === 1 ? incompleteResponse() : modelResponse(mlPackModel);
  };
  const pack = await generatePracticePackWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", fieldContext: mlContext, now: at, fetcher });

  assert.equal(attempts, 2);
  assert.equal(pack.generated, true);
  assert.equal(pack.field, "Machine learning");
  assert.equal(pack.sources.length, 5);
});

test("pack generation does not retry a rejected key or spending limit", async () => {
  for (const status of [401, 403, 429]) {
    let attempts = 0;
    const fetcher: typeof fetch = async () => { attempts += 1; return new Response("no", { status }); };
    await assert.rejects(() => generatePracticePackWithGpt56({ apiKey: "bad", model: "gpt-5.6-luna", fieldContext: mlContext, now: at, fetcher }), new RegExp(`status ${status}`));
    assert.equal(attempts, 1);
  }
});

test("a non-software field runs the real stage-two validator against its generated pack", async () => {
  const pack = assembleGeneratedPack(mlPackModel, mlContext, at);
  const ledger = await extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", locationContext: { location: mlContext.location }, sources: mlSources, inputWarnings: [], fetcher: async () => modelResponse(mlEvidenceOutput) });
  const base = await compareWithGpt56({ apiKey: "test-key", model: "gpt-5.6-luna", ledger, pack, analysisVersion: "phase-7", fetcher: async () => modelResponse(mlBridgeOutput()) });
  const report = finalizeGeneratedReport(base, pack);

  assert.equal(report.currentPracticePackId, pack.id);
  assert.equal(report.findings[0].currentRequirementId, "model-serving");
  assert.equal(report.findings[0].comparisonState, "illustrative");
  assert.equal(report.walkthrough?.comparisonState, "illustrative");
  assert.equal(report.roleProfiles?.length, pack.roleProfiles.length);
  // The auto-generated market summary describes representative roles, not postings.
  assert.ok(report.findings[0].relationshipEvidence.some((source) => /representative roles/i.test(source.summary)));
});
