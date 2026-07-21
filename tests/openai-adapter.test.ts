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
  field: "Operations management",
  targetTitle: "Operations analyst",
  fieldRationale: "The artifact maps a purchasing workflow with approval controls and cycle times.",
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
    locationContext: { location: "Mexico", jurisdiction: "Mexico" },
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
  // The field and target are inferred by the model, not supplied, and flow into
  // the ledger; the request never contains them.
  assert.equal(ledger.fieldContext.field, "Operations management");
  assert.equal(ledger.fieldContext.targetTitle, "Operations analyst");
  assert.equal(ledger.fieldContext.location, "Mexico");
  assert.ok(!String(requestBody?.input).includes("Operations analyst"));
});

test("combined evidence extraction stays bounded by batching files before the model call", async () => {
  const sources: ExtractedSource[] = Array.from({ length: 4 }, (_, index) => ({
    metadata: {
      id: `source-${index + 1}`,
      name: `evidence-${index + 1}.md`,
      sourceType: index === 0 ? "curriculum" : "supporting_document",
      mimeType: "text/markdown",
      sizeBytes: 80,
      contentHash: String(index).repeat(64),
      normalizedHash: String(index + 1).repeat(64),
      characterCount: 70,
    },
    normalizedText: `Evidence batch ${index + 1} contains a documented workflow and its outcome.`,
  }));
  let calls = 0;
  const ledger = await extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.4-nano",
    locationContext: { location: "Mexico" },
    sources,
    inputWarnings: [],
    fetcher: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { input: string };
      const firstEvidence = JSON.parse(body.input).evidence[0] as { id: string; name: string; contentWithLineNumbers: string };
      const output = structuredClone(validOutput);
      output.claims[0].id = "claim-1";
      output.claims[0].references[0] = {
        sourceId: firstEvidence.id,
        excerpt: firstEvidence.contentWithLineNumbers.replace(/^1:\s*/, ""),
        locator: { path: firstEvidence.name, kind: "line", value: "line 1", startLine: 1, endLine: 1 },
      };
      return responseFor(output);
    },
  });
  assert.equal(calls, 2);
  assert.equal(ledger.sources.length, 4);
  assert.equal(ledger.claims.length, 2);
  assert.equal(ledger.claims[0].id, "claim-1");
  assert.equal(ledger.claims[1].id, "batch-2-claim-1");
  assert.ok(ledger.limitations.some((limitation) => /bounded batches/i.test(limitation)));
});

test("GPT-5.6 adapter rejects malformed schema output", async () => {
  await assert.rejects(() => extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    locationContext: { location: "Mexico" },
    sources: [source],
    inputWarnings: [],
    fetcher: async () => responseFor({ claims: "not-an-array", warnings: [], limitations: [] }),
  }));
});

test("GPT-5.6 adapter omits an invented excerpt without failing the evidence ledger", async () => {
  const invented = structuredClone(validOutput);
  invented.claims[0].references[0].excerpt = "A sentence that does not exist in the source";
  const ledger = await extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    locationContext: { location: "Mexico" },
    sources: [source],
    inputWarnings: [],
    fetcher: async () => responseFor(invented),
  });
  assert.equal(ledger.claims.length, 0);
  assert.match(ledger.warnings.at(-1) ?? "", /could not be verified/);
  assert.match(ledger.limitations.at(-1) ?? "", /affected claims were omitted/);
});

test("line-number prefixes are removed from model excerpts before provenance validation", async () => {
  const numbered = structuredClone(validOutput);
  numbered.claims[0].references[0].excerpt = "1: Mapped a purchasing workflow";
  const ledger = await extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    locationContext: { location: "Mexico" },
    sources: [source],
    inputWarnings: [],
    fetcher: async () => responseFor(numbered),
  });
  assert.equal(ledger.claims[0].references[0].excerpt, "Mapped a purchasing workflow");
});

// The domain schema caps a reference excerpt at 800 characters, but the strict
// output schema cannot express that, so the model can occasionally quote more,
// especially from a code file. This is the exact failure a real upload hit: a
// raw "too_big" validation error reached the reader. The overflow must be
// trimmed to a still-verbatim prefix, not turned into a failed analysis.
const longText = "The service reads each configuration value from the environment and validates it before start up. ".repeat(12);
const longSource: ExtractedSource = {
  metadata: { id: "long-source", name: "config.md", sourceType: "project_artifact", date: "2023-04-10", mimeType: "text/markdown", sizeBytes: longText.length, contentHash: "c".repeat(64), normalizedHash: "d".repeat(64), characterCount: longText.length },
  normalizedText: longText,
};

test("an over-long excerpt is trimmed to the limit instead of failing the analysis", async () => {
  const output = structuredClone(validOutput);
  output.claims[0].references[0] = { sourceId: "long-source", excerpt: longText.slice(0, 900), locator: { path: "config.md", kind: "line", value: "line 1", startLine: 1, endLine: 1 } };
  const ledger = await extractWithGpt56({
    apiKey: "test-key",
    model: "gpt-5.6",
    locationContext: { location: "Mexico" },
    sources: [longSource],
    inputWarnings: [],
    fetcher: async () => responseFor(output),
  });
  const excerpt = ledger.claims[0].references[0].excerpt;
  assert.ok(excerpt.length <= 800, "the excerpt is clamped to the schema limit");
  // The clamped excerpt is a prefix of the quote, so it still resolves verbatim.
  assert.ok(longSource.normalizedText.includes(excerpt));
});

test("a malformed extraction surfaces a clean retryable message, not a raw validation dump", async () => {
  const output = structuredClone(validOutput) as unknown as { claims: Array<{ title?: unknown }> };
  // A field that violates the schema in a way clamping does not touch.
  output.claims[0].title = 42;
  await assert.rejects(
    () => extractWithGpt56({ apiKey: "test-key", model: "gpt-5.6", locationContext: { location: "Mexico" }, sources: [source], inputWarnings: [], fetcher: async () => responseFor(output) }),
    (error: Error) => error.message.includes("did not match the required shape") && !error.message.includes("code"),
  );
});
