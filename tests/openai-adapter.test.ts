import assert from "node:assert/strict";
import test from "node:test";
import { extractWithGpt56 } from "../lib/evidence/openai-adapter";
import type { ExtractedSource } from "../lib/evidence/files";

const source: ExtractedSource = {
  metadata: {
    id: "source-1",
    name: "project.md",
    sourceType: "project_artifact",
    date: "2023-04-10",
    mimeType: "text/markdown",
    sizeBytes: 80,
    contentHash: "a".repeat(64),
    normalizedHash: "b".repeat(64),
    characterCount: 78,
  },
  normalizedText: "Mapped a purchasing workflow and documented approval controls and cycle times.",
};

function responseFor(output: unknown) {
  return new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: JSON.stringify(output) }] }] }), { status: 200, headers: { "content-type": "application/json" } });
}

const validOutput = {
  claims: [{
    id: "claim-1",
    title: "Process mapping",
    statement: "The artifact demonstrates a documented purchasing workflow.",
    evidenceClass: "demonstrated",
    references: [{ sourceId: "source-1", excerpt: "Mapped a purchasing workflow", locator: { path: "project.md", kind: "line", value: "line 1", startLine: 1, endLine: 1 } }],
    confidence: "high",
    limitations: ["The artifact does not show the workflow running in production."],
  }],
  warnings: [],
  limitations: ["Evidence extraction does not establish professional mastery."],
};

test("GPT-5.6 adapter sends a strict schema request and validates provenance", async () => {
  let requestBody: Record<string, unknown> | undefined;
  const ledger = await extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    fieldContext: { field: "Business administration", targetTitle: "Operations analyst", location: "Mexico", jurisdiction: "Mexico" },
    sources: [source],
    inputWarnings: [],
    fetcher: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return responseFor(validOutput);
    },
  });
  assert.equal((requestBody?.text as { format: { strict: boolean } }).format.strict, true);
  assert.equal(requestBody?.prompt_cache_key, "notzero-evidence-extraction-v1");
  assert.equal(ledger.analysisMode, "live_gpt_5_6");
  assert.equal(ledger.claims[0].references[0].locator.path, "project.md");
});

test("GPT-5.6 adapter rejects malformed schema output", async () => {
  await assert.rejects(() => extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    fieldContext: { field: "Business administration", targetTitle: "Operations analyst", location: "Mexico" },
    sources: [source],
    inputWarnings: [],
    fetcher: async () => responseFor({ claims: "not-an-array", warnings: [], limitations: [] }),
  }));
});

test("GPT-5.6 adapter rejects an invented excerpt", async () => {
  const invented = structuredClone(validOutput);
  invented.claims[0].references[0].excerpt = "A sentence that does not exist in the source";
  await assert.rejects(() => extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    fieldContext: { field: "Business administration", targetTitle: "Operations analyst", location: "Mexico" },
    sources: [source],
    inputWarnings: [],
    fetcher: async () => responseFor(invented),
  }), /does not resolve/);
});
