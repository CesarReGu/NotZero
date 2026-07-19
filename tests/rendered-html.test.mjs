import assert from "node:assert/strict";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function request(pathname, init) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}-${Math.random()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${pathname}`, init), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the NotZero landing page and persistent judge path", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>NotZero \| Connect your education to current practice<\/title>/i);
  assert.match(html, /Your field moved forward\./);
  assert.match(html, /The job post looks unfamiliar\. Your knowledge doesn/);
  assert.match(html, /You are not starting from zero\./);
  assert.match(html, /See Alex(?:&#x27;|')s knowledge bridge/);
  assert.match(html, /Software development/);
  assert.match(html, /Law/);
  assert.match(html, /Accounting/);
  assert.match(html, /Upload a final project/);
  assert.match(html, /Final Project/);
  assert.match(html, /Already demonstrated/);
  assert.match(html, /No evidence found yet/);
  assert.match(html, /Gallup and Lumina Foundation/);
  assert.match(html, /href="\/method"/);
  assert.match(html, /href="\/privacy"/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("server-renders the complete prepared-demo intake shell", async () => {
  const response = await render("/demo");
  assert.equal(response.status, 200);
  const html = await response.text();

  assert.match(html, /Private, bounded evidence analysis/);
  assert.match(html, /Evidence/);
  assert.match(html, /Target context/);
  assert.match(html, /Review and analyze/);
  assert.match(html, /Alex Rivera/);
  assert.match(html, /Before using your own materials/);
  assert.match(html, /Use my own documents/);
});

test("server-renders method and privacy explanations", async () => {
  const [method, privacy] = await Promise.all([render("/method"), render("/privacy")]);
  assert.equal(method.status, 200);
  assert.equal(privacy.status, 200);

  const methodHtml = await method.text();
  assert.match(methodHtml, /Unknown is not converted into a gap/);
  assert.match(methodHtml, /eight employer postings reviewed on July 18, 2026/i);
  assert.match(await privacy.text(), /bounded evidence set/);
});

test("health route exposes safe configuration state without secrets", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    status: "ok",
    analysisVersion: "phase-6",
    liveAnalysisEnabled: false,
    operationalControls: {
      sessionRequestLimit: 8,
      sessionLiveLimit: 3,
      globalLiveLimit: 25,
      cacheTtlSeconds: 1800,
    },
  });
  assert.equal("hasOpenAIKey" in body, false);
});

test("prepared fixture becomes a provenance-aware evidence ledger", async () => {
  const form = new FormData();
  form.set("mode", "prepared");
  const response = await request("/api/evidence-ledger", { method: "POST", body: form });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "completed");
  assert.equal(body.ledger.analysisMode, "prepared_fixture");
  assert.equal(body.ledger.sources.length, 4);
  assert.equal(body.ledger.claims.length, 4);
  assert.equal(body.ledger.claims[2].references[0].locator.path, "alex-api/src/config.ts");
  assert.equal(body.report.schemaVersion, "knowledge-bridge-report.v1");
  assert.equal(body.report.analysisVersion, "phase-4");
  assert.equal(body.report.findings.length, 5);
  assert.ok(body.report.findings.every((finding) => finding.whyItIsUsed.length > 0));
  assert.deepEqual(body.report.nextSteps.map((step) => step.rank), [1, 2, 3]);
  assert.equal(body.report.walkthrough.artifactReference.locator.path, "alex-api/src/config.ts");
});

test("prepared evidence can be reviewed before the comparison without another upload", async () => {
  const reviewForm = new FormData();
  reviewForm.set("mode", "prepared");
  reviewForm.set("deferComparison", "true");
  const reviewResponse = await request("/api/evidence-ledger", { method: "POST", body: reviewForm });
  assert.equal(reviewResponse.status, 200);
  const review = await reviewResponse.json();
  assert.equal(review.status, "review");
  assert.equal(review.report, undefined);
  assert.ok(review.ledger.claims.length > 1);

  const compareForm = new FormData();
  compareForm.set("action", "compare");
  compareForm.set("analysisId", review.analysisId);
  compareForm.set("excludedClaimIds", JSON.stringify([review.ledger.claims[0].id]));
  const compareResponse = await request("/api/evidence-ledger", { method: "POST", body: compareForm });
  assert.equal(compareResponse.status, 200);
  const compared = await compareResponse.json();
  assert.equal(compared.status, "completed");
  assert.equal(compared.ledger.claims.some((claim) => claim.id === review.ledger.claims[0].id), false);
  assert.ok(compared.report.findings.every((finding) => !finding.evidenceClaimIds.includes(review.ledger.claims[0].id)));
});

function customEvidenceForm() {
  const form = new FormData();
  form.set("mode", "custom");
  form.set("field", "Business administration");
  form.set("targetTitle", "Operations analyst");
  form.set("location", "Mexico");
  form.set("jurisdiction", "Mexico");
  form.set("projectType", "project_artifact");
  form.append("curriculum", new File(["Operations management, accounting, statistics, and organizational behavior."], "study-plan.md", { type: "text/markdown" }));
  form.append("project", new File(["Mapped a purchasing workflow and documented approval controls and cycle times."], "process-project.md", { type: "text/markdown" }));
  form.set("curriculumDates", JSON.stringify(["2023-05-20"]));
  form.set("supportingDates", JSON.stringify([]));
  form.set("projectDates", JSON.stringify(["2023-04-10"]));
  return form;
}

test("custom evidence is validated without inventing claims when live analysis is disabled", async () => {
  const response = await request("/api/evidence-ledger", { method: "POST", body: customEvidenceForm() });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "validated");
  assert.equal(body.ledger.analysisMode, "preflight_only");
  assert.equal(body.ledger.fieldContext.field, "Business administration");
  assert.equal(body.ledger.sources.length, 2);
  assert.equal(body.ledger.claims.length, 0);
  assert.equal(response.headers.get("x-notzero-cache"), "miss");

  const cookie = response.headers.get("set-cookie")?.split(";", 1)[0];
  assert.ok(cookie?.startsWith("notzero_session="));
  const cachedResponse = await request("/api/evidence-ledger", { method: "POST", body: customEvidenceForm(), headers: { cookie } });
  assert.equal(cachedResponse.status, 200);
  assert.equal(cachedResponse.headers.get("x-notzero-cache"), "hit");
  assert.equal((await cachedResponse.json()).status, "cached");

  const deleteResponse = await request("/api/evidence-ledger", { method: "DELETE", headers: { cookie } });
  assert.equal(deleteResponse.status, 200);
  assert.equal((await deleteResponse.json()).status, "cleared");
  const afterDelete = await request("/api/evidence-ledger", { method: "POST", body: customEvidenceForm(), headers: { cookie } });
  assert.equal(afterDelete.headers.get("x-notzero-cache"), "miss");
});

test("duplicate and unsupported evidence are rejected before model analysis", async () => {
  const duplicate = customEvidenceForm();
  const same = "Repeated content that is long enough for safe deterministic text extraction.";
  duplicate.set("curriculum", new File([same], "study-plan.md", { type: "text/markdown" }));
  duplicate.set("project", new File([same], "project.md", { type: "text/markdown" }));
  const duplicateResponse = await request("/api/evidence-ledger", { method: "POST", body: duplicate });
  assert.equal(duplicateResponse.status, 409);
  assert.equal((await duplicateResponse.json()).error, "duplicate_input");

  const unsupported = customEvidenceForm();
  unsupported.set("project", new File(["This executable-like file should be rejected before any analysis call."], "project.exe", { type: "application/octet-stream" }));
  const unsupportedResponse = await request("/api/evidence-ledger", { method: "POST", body: unsupported });
  assert.equal(unsupportedResponse.status, 400);
  assert.equal((await unsupportedResponse.json()).error, "unsupported_file");
});
