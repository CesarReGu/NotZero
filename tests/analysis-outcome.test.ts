import assert from "node:assert/strict";
import test from "node:test";
import { classifyAnalysisResult, isLimitFailure } from "../lib/analysis/outcome";
import { alexBridgeReport } from "../lib/bridge/prepared-report";
import { alexEvidenceLedger } from "../lib/fixtures/alex-ledger";

test("analysis outcomes distinguish completed, partial, and empty results", () => {
  assert.equal(classifyAnalysisResult(alexEvidenceLedger, alexBridgeReport), "completed");
  assert.equal(classifyAnalysisResult(alexEvidenceLedger), "partial");
  assert.equal(classifyAnalysisResult({ ...alexEvidenceLedger, claims: [] }), "empty");
});

test("documented evidence and request limits use a distinct outcome", () => {
  assert.equal(isLimitFailure(413), true);
  assert.equal(isLimitFailure(429), true);
  assert.equal(isLimitFailure(400, "total_size"), true);
  assert.equal(isLimitFailure(400, "unsupported_file"), false);
  assert.equal(isLimitFailure(502, "analysis_failed"), false);
});
