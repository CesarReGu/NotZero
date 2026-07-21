import type { CurrentPracticePack, EvidenceLedger, KnowledgeBridgeReport } from "@/lib/domain/schemas";
import { matchRoleProfiles } from "@/lib/bridge/role-match";
import type { ZipEntry } from "@/lib/export/zip";

const groupLabel: Record<string, string> = {
  current: "Already current",
  transferable: "Transfers",
  small_bridge: "Small bridge",
  genuine_gap: "Genuine gap",
  insufficient_evidence: "Not enough evidence",
  not_assessed: "Not assessed",
};

const relationLabel: Record<string, string> = {
  equivalent: "Same practice, their word",
  narrower: "Same idea, wider scope",
  related: "Close, not the same",
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * One stylesheet shared by every exported document. Sized for A4 so a browser's
 * "Print to PDF" produces a clean few-page document rather than a long scroll.
 */
const documentStyles = `
:root{--ink:#11162a;--muted:#5b6278;--rule:#d9ddea;--paper:#fff;--cobalt:#3347e8;--coral:#ef654e;--coral-soft:#fff0ed;--cobalt-soft:#e9ecff;--current:#009e73;--transfer:#0072b2;--bridge:#d55e00;--gap:#882255;--slate:#697085;}
*{box-sizing:border-box}
body{margin:0;background:#f6f7fb;color:var(--ink);font:16px/1.6 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.sheet{max-width:820px;margin:0 auto;background:var(--paper);padding:44px 52px 56px}
header.doc{border-bottom:3px solid var(--ink);padding-bottom:20px;margin-bottom:28px}
.brand{display:flex;align-items:baseline;justify-content:space-between;gap:16px;flex-wrap:wrap}
.brand b{color:var(--cobalt);font-size:15px;font-weight:800;letter-spacing:.14em}
.brand span{color:var(--muted);font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10.5px;letter-spacing:.06em;text-transform:uppercase}
h1{margin:16px 0 8px;font-size:30px;font-weight:750;letter-spacing:-.035em;line-height:1.15}
.lede{margin:0;color:var(--muted);font-size:14.5px;line-height:1.6;max-width:62ch}
h2{margin:34px 0 12px;font-size:19px;font-weight:750;letter-spacing:-.02em;break-after:avoid}
h3{margin:0 0 6px;font-size:15.5px;font-weight:750}
p{margin:0 0 10px}
small{color:var(--muted);font-size:12px;line-height:1.5}
code{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11.5px;color:#414a68}
.eyebrow{color:var(--muted);font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;margin:0 0 4px}
.card{border:1px solid var(--rule);border-radius:8px;padding:16px 18px;margin-bottom:12px;break-inside:avoid}
.card.accent{border-left:3px solid var(--coral)}
table{width:100%;border-collapse:collapse;margin:8px 0 18px;font-size:13px}
th,td{border:1px solid var(--rule);padding:9px 11px;text-align:left;vertical-align:top}
thead th{background:#f3f5fa;font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted)}
tbody th{font-weight:750;width:24%}
tbody th small{display:block;font-weight:600;margin-top:2px}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 0;padding:0;list-style:none}
.chips li{border:1px solid #c9d0ed;border-radius:999px;background:var(--cobalt-soft);padding:3px 10px;color:#1727b4;font-size:11.5px;font-weight:700}
.chips.warm li{border-color:#e4c2ae;background:var(--coral-soft);color:#8f3f00}
.state{display:inline-block;border:1px solid var(--rule);border-left-width:3px;border-radius:3px;padding:2px 7px;font-size:11px;font-weight:800}
.state[data-g="current"]{border-left-color:var(--current);color:#00664c}
.state[data-g="transferable"]{border-left-color:var(--transfer);color:#005987}
.state[data-g="small_bridge"]{border-left-color:var(--bridge);color:#8f3f00}
.state[data-g="genuine_gap"]{border-left-color:var(--gap);color:#701a46}
.state[data-g="insufficient_evidence"],.state[data-g="not_assessed"]{border-left-color:var(--slate);color:#555c70}
.phase{display:grid;grid-template-columns:38px 1fr;gap:16px;margin-bottom:18px;break-inside:avoid}
.phase-num{width:32px;height:32px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font-weight:780;font-size:14px}
.phase-body{border:1px solid var(--rule);border-radius:8px;padding:15px 17px}
.kv{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--rule);border:1px solid var(--rule);border-radius:6px;overflow:hidden;margin:10px 0}
.kv>div{background:#fbfcfe;padding:9px 11px}
.kv span{display:block;color:var(--muted);font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:3px}
.kv p{margin:0;font-size:13px;line-height:1.5}
.vocab{border:1px solid var(--rule);border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}
.vocab-row{display:grid;grid-template-columns:1fr 26px 1fr;align-items:center;gap:10px;padding:13px 15px}
.vocab-row span{display:block;color:var(--muted);font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:9.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px}
.vocab-row p{margin:0;font-size:13.5px;line-height:1.45}
.arrow{color:var(--coral);font-weight:800;text-align:center;font-size:15px}
.vocab-note{border-top:1px solid var(--rule);background:#fbfcfe;padding:11px 15px;font-size:12.5px;color:#454c63;line-height:1.55}
pre{margin:0;background:var(--ink);color:#e8ecfb;padding:13px 15px;border-radius:6px;font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;line-height:1.6;white-space:pre-wrap;overflow-wrap:break-word}
.code-pair{display:grid;gap:12px;margin:10px 0}
.code-block h4{margin:0 0 6px;font-size:12.5px;font-weight:800}
.code-block h4 em{font-style:normal;font-weight:600;color:var(--muted);font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10.5px}
footer.doc{margin-top:36px;border-top:1px solid var(--rule);padding-top:14px;color:var(--muted);font-size:11px;line-height:1.55}
ul.plain{margin:6px 0 0;padding-left:18px;font-size:13px;line-height:1.6}
.limit{border-left:3px solid var(--slate);background:#f5f6fa;padding:9px 12px;margin:10px 0 0;font-size:11.5px;color:#4a5270;border-radius:0 4px 4px 0}
@media print{
  @page{margin:15mm}
  body{background:#fff}
  .sheet{max-width:none;padding:0}
  .card,.phase,.vocab,.code-block,table{break-inside:avoid}
  h2{break-after:avoid}
  a{color:var(--ink);text-decoration:underline}
  pre,.state,.chips li,.phase-num{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

function shell(title: string, subtitle: string, body: string, report: KnowledgeBridgeReport, pack: CurrentPracticePack) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · NotZero</title><style>${documentStyles}</style></head>
<body><div class="sheet">
<header class="doc">
  <div class="brand"><b>NOTZERO</b><span>Knowledge Bridge · market pack ${escapeHtml(pack.datasetVersion)}</span></div>
  <h1>${escapeHtml(title)}</h1>
  <p class="lede">${escapeHtml(subtitle)}</p>
</header>
${body}
<footer class="doc">
  <p>Generated ${escapeHtml(report.generatedAt.slice(0, 10))} from ${pack.sources.length} employer postings reviewed ${escapeHtml(pack.observedThrough)}. Analysis ${escapeHtml(report.analysisVersion)}.</p>
  <p>NotZero interprets the evidence and dated sources available to it. It does not certify mastery or guarantee job eligibility. Suggested code marked illustrative or conceptual has not been executed.</p>
</footer>
</div></body></html>`;
}

function roadmapDocument(report: KnowledgeBridgeReport, ledger: EvidenceLedger, pack: CurrentPracticePack) {
  const roadmap = report.roadmap;
  if (!roadmap) return "";
  const phases = roadmap.phases.map((phase) => {
    const startsFrom = phase.startsFromClaimIds
      .map((id) => ledger.claims.find((claim) => claim.id === id)?.title)
      .filter(Boolean).join(" and ");
    const terms = phase.vocabularyIds
      .map((id) => report.vocabularyBridges?.find((item) => item.id === id)?.industryTerm)
      .filter(Boolean);
    const unlocks = phase.unlocksRequirementIds
      .map((id) => pack.requirements.find((item) => item.id === id)?.name)
      .filter(Boolean);
    return `<div class="phase">
  <div class="phase-num">${phase.order}</div>
  <div class="phase-body">
    <h3>${escapeHtml(phase.title)}</h3>
    <p>${escapeHtml(phase.goal)}</p>
    <p class="eyebrow" style="margin-top:12px">Starts from work already in the project</p>
    <p style="font-size:13px">${escapeHtml(startsFrom)}</p>
    <div class="kv">
      <div><span>You build</span><p>${escapeHtml(phase.buildArtifact)}</p></div>
      <div><span>Done when</span><p>${escapeHtml(phase.checkpoint)}</p></div>
    </div>
    <p class="eyebrow">New in this step</p>
    <ul class="chips warm">${phase.newConcepts.map((c) => `<li>${escapeHtml(c)}</li>`).join("")}</ul>
    <p style="margin-top:12px"><small><b>Scope.</b> ${escapeHtml(phase.scope)}${terms.length ? ` &nbsp;·&nbsp; <b>Now you can say:</b> ${escapeHtml(terms.join(", "))}` : ""}${unlocks.length ? ` &nbsp;·&nbsp; <b>Answers:</b> ${escapeHtml(unlocks.join(", "))}` : ""}</small></p>
  </div>
</div>`;
  }).join("\n");

  return shell(
    roadmap.title,
    roadmap.premise,
    `<h2>The route</h2>${phases}
<div class="limit">Each step is ordered so it reuses the previous one. Doing them out of order still works, but step 3 assumes the container from step 1 exists.</div>`,
    report,
    pack,
  );
}

function roleMatchDocument(report: KnowledgeBridgeReport, pack: CurrentPracticePack) {
  const matches = matchRoleProfiles(report, pack);
  if (matches.length === 0) return "";
  const best = matches[0];

  const profileSections = matches.map((match) => {
    const rows = [...match.connected, ...match.bridges, ...match.open].map((row) => `<tr>
  <th scope="row">${escapeHtml(row.name)}</th>
  <td><span class="state" data-g="${row.group}">${escapeHtml(groupLabel[row.group] ?? row.group)}</span></td>
  <td>${row.mentionCount} of ${pack.sources.length} postings</td>
</tr>`).join("");
    const sources = match.profile.sourceIds.map((id) => {
      const source = pack.sources.find((item) => item.id === id);
      return source ? `<li>${escapeHtml(source.employer)}, ${escapeHtml(source.roleTitle)} &mdash; ${escapeHtml(source.location)}, reviewed ${escapeHtml(source.observedAt)}<br><code>${escapeHtml(source.url)}</code></li>` : "";
    }).join("");
    return `<div class="card${match.profile.id === best.profile.id ? " accent" : ""}">
  <p class="eyebrow">${match.profile.id === best.profile.id ? "Closest fit" : "Alternative"} · ${match.connectedCount} of ${match.totalCount} requirements reached</p>
  <h3>${escapeHtml(match.profile.title)}</h3>
  <p style="font-size:13.5px">${escapeHtml(match.profile.summary)}</p>
  <p style="font-size:13px;color:#5b6278">${escapeHtml(match.profile.emphasis)}</p>
  <table><thead><tr><th>Requirement</th><th>Your standing</th><th>Market demand</th></tr></thead><tbody>${rows}</tbody></table>
  <p class="eyebrow">Derived from these reviewed postings</p>
  <ul class="plain">${sources}</ul>
</div>`;
  }).join("\n");

  const gapRows = best.open.map((row) => {
    const phase = report.roadmap?.phases.find((item) => item.unlocksRequirementIds.includes(row.requirementId));
    return `<tr>
  <th scope="row">${escapeHtml(row.name)}<small>${escapeHtml(groupLabel[row.group] ?? row.group)}</small></th>
  <td>${phase ? `<b>Step ${phase.order}. ${escapeHtml(phase.title)}</b><br>${escapeHtml(phase.buildArtifact)}` : escapeHtml(row.recommendedAction ?? "Add a dated artifact for this requirement.")}</td>
  <td>${escapeHtml(row.context)}</td>
</tr>`;
  }).join("");

  return shell(
    "Where your evidence lands in this market",
    `${matches.length} role profiles appear across the ${pack.sources.length} reviewed postings. Each is a group of requirements that showed up together, not a job title invented for this report. The closest fit is ${best.profile.title.toLowerCase()}, reaching ${best.connectedCount} of ${best.totalCount} requirements.`,
    `<h2>What is still open for the closest fit</h2>
${best.open.length > 0
      ? `<table><thead><tr><th>Not yet evidenced</th><th>What we recommend</th><th>Why we say that</th></tr></thead><tbody>${gapRows}</tbody></table>`
      : `<p>Every requirement in this profile already connects to the evidence. The remaining work is depth rather than coverage.</p>`}
<h2>All three profiles</h2>
${profileSections}
<div class="limit">A profile is a pattern in a small reviewed sample, not a hiring standard. Reaching every requirement in a profile does not guarantee an interview, and missing one does not disqualify anyone.</div>`,
    report,
    pack,
  );
}

function vocabularyDocument(report: KnowledgeBridgeReport, pack: CurrentPracticePack) {
  const terms = [...(report.vocabularyBridges ?? [])].sort((a, b) => {
    const order = { equivalent: 0, narrower: 1, related: 2 };
    return order[a.relation] - order[b.relation];
  });
  if (terms.length === 0) return "";
  const equivalent = terms.filter((term) => term.relation === "equivalent").length;

  const body = terms.map((term) => {
    const requirement = term.requirementId ? pack.requirements.find((item) => item.id === term.requirementId) : undefined;
    return `<div class="vocab">
  <div class="vocab-row">
    <div><span>What you wrote</span><p>${escapeHtml(term.yourTerm)}</p><code>${escapeHtml(term.sourcePath)}</code></div>
    <div class="arrow">&rarr;</div>
    <div><span>What job posts call it</span><p><b>${escapeHtml(term.industryTerm)}</b></p>${requirement ? `<code>${requirement.mentionCount} of ${pack.sources.length} postings</code>` : ""}</div>
  </div>
  <div class="vocab-note"><b>${escapeHtml(relationLabel[term.relation])}.</b> ${escapeHtml(term.note)}</div>
</div>`;
  }).join("\n");

  return shell(
    "Your words, their words",
    `${equivalent} of these ${terms.length} entries are the same practice under a different name. Job posts are written in professional vocabulary; most of what looks unfamiliar is already in the submitted files. Where a term covers more than the evidence shows, this document says so instead of flattering the match.`,
    `<h2>The translation</h2>${body}
<div class="limit">Knowing the word is not the same as having done the work at scale. These entries record that the underlying practice is present in the submitted files, with its professional name attached.</div>`,
    report,
    pack,
  );
}

function codeWalkthroughDocument(report: KnowledgeBridgeReport, ledger: EvidenceLedger, pack: CurrentPracticePack) {
  const bridges = report.codeBridges ?? [];
  if (bridges.length === 0) return "";
  const body = bridges.map((bridge, index) => {
    const claim = ledger.claims.find((item) => item.id === bridge.claimId);
    const requirement = pack.requirements.find((item) => item.id === bridge.requirementId);
    const lines = bridge.observed.startLine
      ? `lines ${bridge.observed.startLine}${bridge.observed.endLine && bridge.observed.endLine !== bridge.observed.startLine ? `–${bridge.observed.endLine}` : ""}`
      : "";
    return `<div class="card">
  <p class="eyebrow">${index + 1} of ${bridges.length}${requirement ? ` · answers ${escapeHtml(requirement.name)}, named in ${requirement.mentionCount} of ${pack.sources.length} postings` : ""}</p>
  <h3>${escapeHtml(bridge.title)}</h3>
  <div class="code-pair">
    <div class="code-block">
      <h4>What you wrote <em>${escapeHtml(bridge.observed.path)}${lines ? ` · ${lines}` : ""}${bridge.observed.date ? ` · ${escapeHtml(bridge.observed.date)}` : ""}</em></h4>
      <pre>${escapeHtml(bridge.observed.code)}</pre>
    </div>
    <div>
      <p class="eyebrow">What this proves</p>
      <p style="font-size:13.5px">${escapeHtml(bridge.demonstrates)}</p>
      ${claim ? `<small>Evidence class: ${escapeHtml(claim.evidenceClass.replaceAll("_", " "))} · ${escapeHtml(claim.confidence)} confidence</small>` : ""}
    </div>
    <div class="code-block">
      <h4>${escapeHtml(bridge.modern.label)} <em>${escapeHtml(bridge.modern.filename)} · ${escapeHtml(bridge.comparisonState)}</em></h4>
      <pre>${escapeHtml(bridge.modern.code)}</pre>
      <small>${escapeHtml(bridge.modern.caption)}</small>
    </div>
    <div>
      <p class="eyebrow">Why teams do it this way</p>
      <p style="font-size:13.5px">${escapeHtml(bridge.whyItMatters)}</p>
    </div>
  </div>
  <div class="kv">
    <div><span>Transfers unchanged</span><ul class="chips">${bridge.whatTransfers.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>
    <div><span>Genuinely new</span><ul class="chips warm">${bridge.whatIsNew.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul></div>
  </div>
  <div class="limit"><b>Limit.</b> ${escapeHtml(bridge.limitations[0])}</div>
</div>`;
  }).join("\n");

  return shell(
    "The submitted code, and how the same idea is written now",
    "Each comparison quotes your own file with its path and line numbers, states what the code demonstrates, then shows a current-practice counterpart. The counterparts were written for this report and are labelled by how far they have been checked. None of them were executed.",
    `<h2>Three comparisons</h2>${body}`,
    report,
    pack,
  );
}

function readme(report: KnowledgeBridgeReport, pack: CurrentPracticePack, owner: string, files: string[]) {
  return `NotZero Knowledge Bridge
========================

Prepared for: ${owner}
Generated: ${report.generatedAt.slice(0, 10)}
Market pack: ${pack.datasetVersion} (${pack.sources.length} employer postings reviewed ${pack.observedThrough})
Analysis version: ${report.analysisVersion}

What is in this package
-----------------------

${files.join("\n")}

How to read it
--------------

Start with 01-roadmap.html. It is the plan: four builds in the order that
reuses the most of what you already have.

02-role-match.html explains which role profile your evidence fits best and
what is still open for it. 03-vocabulary.html is the translation between the
words in your own files and the words job posts use. 04-code-walkthrough.html
shows your code beside a current-practice counterpart.

The files under code/ are ready to adapt into your project. Each one carries a
header comment recording where it came from and what has not been verified.

Every HTML document is formatted for printing. Open one in a browser and use
Print to PDF if you want a PDF copy.

What this is not
----------------

This package interprets the evidence and dated sources available to it. It does
not certify mastery, guarantee job eligibility, or represent the whole labour
market. Code marked illustrative or conceptual has not been executed. Role
profiles are patterns in a small reviewed sample, not hiring standards.
`;
}

function codeFile(report: KnowledgeBridgeReport, bridgeId: string) {
  const bridge = report.codeBridges?.find((item) => item.id === bridgeId);
  if (!bridge) return null;
  const comment = bridge.modern.language === "sql" ? "--" : bridge.modern.language === "dockerfile" || bridge.modern.language === "yaml" || bridge.modern.language === "shell" ? "#" : "//";
  const header = [
    `${comment} ${bridge.modern.label} for: ${bridge.title}`,
    `${comment} Generated by NotZero from ${bridge.observed.path}.`,
    `${comment} Status: ${bridge.comparisonState}. This file has not been executed.`,
    `${comment} Limit: ${bridge.limitations[0]}`,
    "",
  ].join("\n");
  return { path: `code/${bridge.modern.filename}`, text: header + bridge.modern.code + "\n" };
}

export function buildPackageEntries(
  report: KnowledgeBridgeReport,
  ledger: EvidenceLedger,
  pack: CurrentPracticePack,
  subjectLabel?: string,
): ZipEntry[] {
  // The documents address the reader directly. The subject name appears only in
  // the README, which keeps the prose free of name-and-verb agreement bugs.
  const owner = subjectLabel ?? "you";
  const entries: ZipEntry[] = [];

  const roadmap = roadmapDocument(report, ledger, pack);
  if (roadmap) entries.push({ path: "01-roadmap.html", text: roadmap });

  const roleMatch = roleMatchDocument(report, pack);
  if (roleMatch) entries.push({ path: "02-role-match.html", text: roleMatch });

  const vocabulary = vocabularyDocument(report, pack);
  if (vocabulary) entries.push({ path: "03-vocabulary.html", text: vocabulary });

  const walkthrough = codeWalkthroughDocument(report, ledger, pack);
  if (walkthrough) entries.push({ path: "04-code-walkthrough.html", text: walkthrough });

  for (const bridge of report.codeBridges ?? []) {
    const file = codeFile(report, bridge.id);
    if (file) entries.push(file);
  }

  // The validated payload itself, so the result stays inspectable and
  // reproducible outside the browser.
  entries.push({ path: "notzero-result.json", text: JSON.stringify({ report, ledger, marketPack: { id: pack.id, datasetVersion: pack.datasetVersion, observedThrough: pack.observedThrough, sources: pack.sources } }, null, 2) });

  const manifest = entries.map((entry) => {
    const purpose: Record<string, string> = {
      "01-roadmap.html": "The plan. Four builds in order, each with what you build and how you know it is done.",
      "02-role-match.html": "Which role profile your evidence fits, what is still open, and the postings behind it.",
      "03-vocabulary.html": "Your own words mapped to the words job posts use.",
      "04-code-walkthrough.html": "Your code beside a current-practice counterpart, with what transfers and what is new.",
      "notzero-result.json": "The validated result as data, including every claim, source, and locator.",
    };
    return `  ${entry.path.padEnd(28)} ${purpose[entry.path] ?? "Ready-to-adapt counterpart file for your project."}`;
  });

  entries.unshift({ path: "README.txt", text: readme(report, pack, owner, manifest) });
  return entries;
}
