import assert from "node:assert/strict";
import test from "node:test";
import { EvidenceInputError, extractEvidenceFile } from "../lib/evidence/files";
import { EVIDENCE_LIMITS } from "../lib/evidence/limits";
import { classifyCombinedFiles } from "../lib/evidence/classify";

test("the combined uploader assigns only provisional routing hints", () => {
  const result = classifyCombinedFiles([
    new File(["Courses and learning outcomes"], "study-plan.md"),
    new File(["A project report"], "capstone-report.md"),
    new File(["print('hello')"], "train.py"),
  ]);
  assert.deepEqual(result.files.map((item) => item.sourceType), ["curriculum", "project_artifact", "source_file"]);
  assert.ok(result.warnings.some((warning) => /provisional routing hints/i.test(warning)));
});

test("readable bounded evidence is accepted and normalized", async () => {
  const result = await extractEvidenceFile(
    new File(["Mapped a purchasing workflow and documented approval controls."], "project.md", { type: "text/markdown" }),
    "project_artifact",
    0,
  );
  assert.equal(result.source.metadata.name, "project.md");
  assert.equal(result.source.metadata.sourceType, "project_artifact");
  assert.equal(result.source.metadata.normalizedHash.length, 64);
});

test("oversized, secret-bearing, and ignored evidence is rejected before analysis", async () => {
  await assert.rejects(
    () => extractEvidenceFile(new File([new Uint8Array(EVIDENCE_LIMITS.fileBytes + 1)], "large.md"), "project_artifact", 0),
    (error: unknown) => error instanceof EvidenceInputError && error.code === "file_size",
  );
  await assert.rejects(
    () => extractEvidenceFile(new File(["api_key=fictional-value-for-rejection-test"], "notes.md"), "project_artifact", 0),
    (error: unknown) => error instanceof EvidenceInputError && error.code === "secret_detected",
  );
  await assert.rejects(
    () => extractEvidenceFile(new File(["private configuration"], ".env"), "project_artifact", 0),
    (error: unknown) => error instanceof EvidenceInputError && error.code === "rejected_filename",
  );
});
