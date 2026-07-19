import assert from "node:assert/strict";
import test from "node:test";
import { deriveEvidenceMix } from "@/lib/evidence/mix";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";

test("evidence mix preserves the complete class order and exact claim count", () => {
  const mix = deriveEvidenceMix(alexEvidenceLedger);
  assert.deepEqual(mix.map((item) => item.evidenceClass), ["demonstrated", "expected_exposure", "self_reported", "inferred", "unknown"]);
  assert.equal(mix.reduce((total, item) => total + item.count, 0), alexEvidenceLedger.claims.length);
});
