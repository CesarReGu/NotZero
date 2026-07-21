import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { alexScenario } from "@/lib/fixtures/alex";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { alexBridgeReport } from "@/lib/bridge/prepared-report";

const evidenceRoot = fileURLToPath(new URL("../public/alex-evidence/", import.meta.url));

// Mirrors normalizeText() in lib/evidence/files.ts so the fixture is compared
// the same way an uploaded file would be.
function normalizeText(value: string) {
  return value
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function readSource(name: string) {
  return normalizeText(readFileSync(evidenceRoot + name, "utf8"));
}

/** Collapses wrapped prose so a quotation spanning a line break still matches. */
function flatten(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

test("every prepared evidence file referenced by the scenario exists on disk", () => {
  for (const item of alexScenario.evidence) {
    assert.ok(item.file, `${item.id} must expose a downloadable file`);
    const name = item.file!.url.replace("/alex-evidence/", "");
    const raw = readFileSync(evidenceRoot + name);
    assert.equal(raw.length, item.file!.bytes, `${name} byte count must match the scenario`);
    assert.equal(name, item.file!.name, `${name} url and name must agree`);
  }
});

test("ledger sources match the bytes and character counts of the real files", () => {
  for (const source of alexEvidenceLedger.sources) {
    const raw = readFileSync(evidenceRoot + source.name);
    assert.equal(raw.length, source.sizeBytes, `${source.name} size must match`);
    assert.equal(normalizeText(raw.toString("utf8")).length, source.characterCount, `${source.name} character count must match`);
  }
});

test("every claim excerpt is quoted verbatim from its cited file", () => {
  for (const claim of alexEvidenceLedger.claims) {
    for (const reference of claim.references) {
      const source = alexEvidenceLedger.sources.find((item) => item.id === reference.sourceId);
      assert.ok(source, `${claim.id} cites unknown source ${reference.sourceId}`);
      assert.equal(source!.name, reference.locator.path, `${claim.id} locator path must match its source`);
      const text = readSource(source!.name);
      assert.ok(
        flatten(text).includes(flatten(reference.excerpt)),
        `${claim.id} excerpt was not found in ${source!.name}`,
      );
    }
  }
});

test("every claim line range resolves to the quoted excerpt", () => {
  for (const claim of alexEvidenceLedger.claims) {
    for (const reference of claim.references) {
      const { startLine, endLine, path } = reference.locator;
      if (!startLine) continue;
      const source = alexEvidenceLedger.sources.find((item) => item.id === reference.sourceId)!;
      const lines = readSource(source.name).split("\n").slice(startLine - 1, endLine ?? startLine).join("\n");
      assert.ok(
        flatten(lines).includes(flatten(reference.excerpt)),
        `${claim.id} lines ${startLine}-${endLine ?? startLine} of ${path} do not contain the excerpt`,
      );
    }
  }
});

test("code bridges quote real project code and cite a claim on the same file", () => {
  const bridges = alexBridgeReport.codeBridges ?? [];
  assert.ok(bridges.length > 0, "the prepared report must ship at least one code bridge");
  for (const bridge of bridges) {
    const claim = alexEvidenceLedger.claims.find((item) => item.id === bridge.claimId);
    assert.ok(claim, `${bridge.id} cites unknown claim ${bridge.claimId}`);
    assert.ok(
      claim!.references.some((reference) => reference.locator.path === bridge.observed.path),
      `${bridge.id} quotes ${bridge.observed.path} but its claim does not reference that file`,
    );
    const text = readSource(bridge.observed.path);
    assert.ok(
      flatten(text).includes(flatten(bridge.observed.code)),
      `${bridge.id} observed code was not found verbatim in ${bridge.observed.path}`,
    );
    const { startLine, endLine } = bridge.observed;
    if (startLine) {
      const lines = text.split("\n").slice(startLine - 1, endLine ?? startLine).join("\n");
      assert.ok(
        flatten(lines).includes(flatten(bridge.observed.code)),
        `${bridge.id} lines ${startLine}-${endLine ?? startLine} do not contain the quoted code`,
      );
    }
  }
});

test("modern counterparts are never presented as executed", () => {
  for (const bridge of alexBridgeReport.codeBridges ?? []) {
    assert.notEqual(bridge.comparisonState, "verified", `${bridge.id} must not claim a verified modern counterpart`);
    assert.ok(bridge.limitations.length > 0, `${bridge.id} must state a limitation`);
  }
});

test("the prepared evidence set stays inside the documented upload limits", () => {
  const counts = alexScenario.evidence.reduce<Record<string, number>>((totals, item) => {
    const key = item.sourceType === "curriculum" ? "curriculum" : item.sourceType === "supporting_document" ? "supporting" : "project";
    totals[key] = (totals[key] ?? 0) + 1;
    return totals;
  }, {});
  assert.equal(counts.curriculum, 1, "exactly one curriculum document");
  assert.ok(counts.supporting <= 3, "no more than three supporting documents");
  assert.ok(counts.project >= 1 && counts.project <= 5, "between one and five project files");
});

test("the prepared fixture contains no credential-shaped content", () => {
  const patterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
    /\bsk-[A-Za-z0-9_-]{20,}\b/,
    /\bAKIA[0-9A-Z]{16}\b/,
  ];
  for (const source of alexEvidenceLedger.sources) {
    const text = readSource(source.name);
    for (const pattern of patterns) {
      assert.ok(!pattern.test(text), `${source.name} must not contain credential-shaped content`);
    }
  }
});
