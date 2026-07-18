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

test("server-renders the NotZero landing page and persistent judge path", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>NotZero \| Map your degree to today(?:&#x27;|')s software roles<\/title>/i);
  assert.match(html, /You learned the foundation\./);
  assert.match(html, /The job post looks unfamiliar\. Your knowledge doesn/);
  assert.match(html, /You are not starting from zero\./);
  assert.match(html, /See Alex(?:&#x27;|')s knowledge bridge/);
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

  assert.match(html, /Prepared graduate demo/);
  assert.match(html, /Evidence/);
  assert.match(html, /Target role/);
  assert.match(html, /Review and analyze/);
  assert.match(html, /Alex Rivera/);
  assert.match(html, /Before using your own materials/);
  assert.match(html, /fictional data only/);
});

test("server-renders method and privacy explanations", async () => {
  const [method, privacy] = await Promise.all([render("/method"), render("/privacy")]);
  assert.equal(method.status, 200);
  assert.equal(privacy.status, 200);

  assert.match(await method.text(), /Unknown is not converted into a gap/);
  assert.match(await privacy.text(), /Personal document upload is not enabled in Phase 1/);
});

test("health route exposes safe configuration state without secrets", async () => {
  const response = await render("/api/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body, {
    status: "ok",
    analysisVersion: "phase-1",
    liveAnalysisEnabled: false,
  });
  assert.equal("hasOpenAIKey" in body, false);
});
