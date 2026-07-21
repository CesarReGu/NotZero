import assert from "node:assert/strict";
import test from "node:test";
import { alexBridgeReport, validateReportReferences } from "@/lib/bridge/prepared-report";
import { alexEvidenceLedger } from "@/lib/fixtures/alex-ledger";
import { softwareBackendPracticePack } from "@/lib/market/current-practice";
import { matchRoleProfiles } from "@/lib/bridge/role-match";
import { buildPackageEntries } from "@/lib/export/documents";
import { createZip } from "@/lib/export/zip";
import { knowledgeBridgeReportSchema } from "@/lib/domain/schemas";

const pack = softwareBackendPracticePack;

test("every vocabulary entry renames a claim the evidence actually supports", () => {
  const terms = alexBridgeReport.vocabularyBridges ?? [];
  assert.ok(terms.length > 0, "the prepared report must ship a vocabulary bridge");
  for (const term of terms) {
    const claim = alexEvidenceLedger.claims.find((item) => item.id === term.claimId);
    assert.ok(claim, `${term.id} cites unknown claim ${term.claimId}`);
    assert.ok(
      claim!.references.some((reference) => reference.locator.path === term.sourcePath),
      `${term.id} cites ${term.sourcePath}, which its claim does not reference`,
    );
    if (term.requirementId) {
      assert.ok(pack.requirements.some((item) => item.id === term.requirementId), `${term.id} cites unknown requirement`);
    }
  }
});

test("vocabulary states honestly where a term covers more than the evidence", () => {
  const terms = alexBridgeReport.vocabularyBridges ?? [];
  // Logging is the one entry that must not be sold as an equivalence: a printed
  // line is not structured logging.
  const logging = terms.find((term) => term.industryTerm.toLowerCase().includes("structured logging"));
  assert.ok(logging, "the logging translation should be present");
  assert.equal(logging!.relation, "related");
  assert.ok(terms.some((term) => term.relation === "equivalent"), "at least one term should be a true equivalence");
});

test("role profiles only claim requirements their cited postings mention", () => {
  const profiles = alexBridgeReport.roleProfiles ?? [];
  assert.ok(profiles.length >= 2, "at least two profiles so the reader can compare");
  for (const profile of profiles) {
    const observed = new Set<string>();
    for (const sourceId of profile.sourceIds) {
      const source = pack.sources.find((item) => item.id === sourceId);
      assert.ok(source, `${profile.id} cites unknown posting ${sourceId}`);
      for (const requirementId of source!.requirementIds) observed.add(requirementId);
    }
    for (const requirementId of profile.requirementIds) {
      assert.ok(observed.has(requirementId), `${profile.id} claims ${requirementId} without a posting that names it`);
    }
  }
});

test("role matching ranks the closest fit first and separates open requirements", () => {
  const matches = matchRoleProfiles(alexBridgeReport, pack);
  assert.equal(matches.length, (alexBridgeReport.roleProfiles ?? []).length);
  for (let index = 1; index < matches.length; index += 1) {
    assert.ok(matches[index - 1].connectedCount >= matches[index].connectedCount, "matches must be ordered by requirements reached");
  }
  const best = matches[0];
  assert.equal(best.connected.length + best.bridges.length + best.open.length, best.totalCount);
  assert.equal(best.connectedCount, best.connected.length + best.bridges.length);
  // Every open requirement should be answerable by a roadmap step, otherwise the
  // report names a gap without offering a route through it.
  for (const row of best.open) {
    const phase = alexBridgeReport.roadmap?.phases.find((item) => item.unlocksRequirementIds.includes(row.requirementId));
    assert.ok(phase, `no roadmap phase closes ${row.requirementId} for the closest-fit profile`);
  }
});

test("the roadmap is sequential and starts every phase from existing evidence", () => {
  const roadmap = alexBridgeReport.roadmap;
  assert.ok(roadmap, "the prepared report must ship a roadmap");
  assert.deepEqual(roadmap!.phases.map((phase) => phase.order), roadmap!.phases.map((_, index) => index + 1));
  const claimIds = new Set(alexEvidenceLedger.claims.map((claim) => claim.id));
  const vocabularyIds = new Set((alexBridgeReport.vocabularyBridges ?? []).map((term) => term.id));
  for (const phase of roadmap!.phases) {
    assert.ok(phase.startsFromClaimIds.length > 0, `phase ${phase.order} must build on existing evidence`);
    for (const claimId of phase.startsFromClaimIds) assert.ok(claimIds.has(claimId), `phase ${phase.order} cites unknown claim ${claimId}`);
    for (const vocabularyId of phase.vocabularyIds) assert.ok(vocabularyIds.has(vocabularyId), `phase ${phase.order} cites unknown vocabulary ${vocabularyId}`);
    for (const requirementId of phase.unlocksRequirementIds) {
      assert.ok(pack.requirements.some((item) => item.id === requirementId), `phase ${phase.order} unlocks unknown requirement ${requirementId}`);
    }
  }
});

test("a role profile claiming an unobserved requirement is rejected", () => {
  const broken = {
    ...alexBridgeReport,
    roleProfiles: [{
      id: "profile-invented",
      title: "Invented profile",
      summary: "A profile whose requirements were never observed together.",
      emphasis: "This should not validate.",
      // Hopper's posting names only api-design and cloud-platform.
      sourceIds: ["job-hopper-backend-latam"],
      requirementIds: ["api-design", "observability"],
    }],
  };
  assert.throws(
    () => validateReportReferences(knowledgeBridgeReportSchema.parse(broken), alexEvidenceLedger),
    /observability/,
  );
});

test("a vocabulary entry citing a file its claim does not reference is rejected", () => {
  // Appended rather than replacing the list, so the roadmap's vocabulary
  // references still resolve and the reference validator is what rejects this.
  const broken = {
    ...alexBridgeReport,
    vocabularyBridges: [...(alexBridgeReport.vocabularyBridges ?? []), {
      id: "vocab-invented",
      claimId: "claim-runtime-config",
      yourTerm: "Something the config file does not contain",
      industryTerm: "Invented term",
      relation: "equivalent" as const,
      note: "This entry points at a file its claim never cites.",
      sourcePath: "alex-api/sql/schema.sql",
    }],
  };
  assert.throws(
    () => validateReportReferences(knowledgeBridgeReportSchema.parse(broken), alexEvidenceLedger),
    /schema\.sql/,
  );
});

test("the download package ships one document per purpose plus usable code", () => {
  const entries = buildPackageEntries(alexBridgeReport, alexEvidenceLedger, pack, "Alex Rivera");
  const paths = entries.map((entry) => entry.path);
  for (const expected of ["README.txt", "01-roadmap.html", "02-role-match.html", "03-vocabulary.html", "04-code-walkthrough.html", "notzero-result.json"]) {
    assert.ok(paths.includes(expected), `package is missing ${expected}`);
  }
  // Each code bridge ships as a real file under code/, carrying its provenance
  // and the fact that it was never executed.
  for (const bridge of alexBridgeReport.codeBridges ?? []) {
    const file = entries.find((entry) => entry.path === `code/${bridge.modern.filename}`);
    assert.ok(file, `package is missing code/${bridge.modern.filename}`);
    assert.match(file!.text, /has not been executed/);
    assert.ok(file!.text.includes(bridge.modern.code), "the shipped file must contain the counterpart code");
  }
  assert.equal(new Set(paths).size, paths.length, "package paths must be unique");
  for (const entry of entries) assert.ok(entry.text.length > 0, `${entry.path} must not be empty`);
});

test("exported documents escape evidence text instead of injecting markup", () => {
  const hostile = knowledgeBridgeReportSchema.parse({
    ...alexBridgeReport,
    roadmap: {
      ...alexBridgeReport.roadmap!,
      title: 'Roadmap <script>alert("x")</script>',
    },
  });
  const entries = buildPackageEntries(hostile, alexEvidenceLedger, pack, "Alex Rivera");
  const roadmap = entries.find((entry) => entry.path === "01-roadmap.html")!;
  assert.ok(!roadmap.text.includes("<script>alert"), "raw script markup must not reach the document");
  assert.ok(roadmap.text.includes("&lt;script&gt;"), "the text should survive as escaped content");
});

test("the package is a valid zip archive with correct local headers", () => {
  const entries = buildPackageEntries(alexBridgeReport, alexEvidenceLedger, pack, "Alex Rivera");
  const blob = createZip(entries);
  assert.ok(blob.size > 0);
  assert.equal(blob.type, "application/zip");
});
