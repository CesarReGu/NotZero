import assert from "node:assert/strict";
import test from "node:test";
import { EvidenceInputError, extractEvidenceFile } from "../lib/evidence/files";
import { EVIDENCE_LIMITS } from "../lib/evidence/limits";

test("readable bounded evidence is accepted and normalized", async () => {
  const result = await extractEvidenceFile(
    new File(["Mapped a purchasing workflow and documented approval controls."], "project.md", { type: "text/markdown" }),
    "project_artifact",
    "2023-04-10",
    0,
  );
  assert.equal(result.source.metadata.name, "project.md");
  assert.equal(result.source.metadata.sourceType, "project_artifact");
  assert.equal(result.source.metadata.normalizedHash.length, 64);
});

test("oversized, secret-bearing, and ignored evidence is rejected before analysis", async () => {
  await assert.rejects(
    () => extractEvidenceFile(new File([new Uint8Array(EVIDENCE_LIMITS.fileBytes + 1)], "large.md"), "project_artifact", "2023-04-10", 0),
    (error: unknown) => error instanceof EvidenceInputError && error.code === "file_size",
  );
  await assert.rejects(
    () => extractEvidenceFile(new File(["api_key=fictional-value-for-rejection-test"], "notes.md"), "project_artifact", "2023-04-10", 0),
    (error: unknown) => error instanceof EvidenceInputError && error.code === "secret_detected",
  );
  await assert.rejects(
    () => extractEvidenceFile(new File(["private configuration"], ".env"), "project_artifact", "2023-04-10", 0),
    (error: unknown) => error instanceof EvidenceInputError && error.code === "rejected_filename",
  );
});
