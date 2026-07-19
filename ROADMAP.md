# NotZero roadmap

**Status:** Hackathon build plan  
**Last updated:** July 19, 2026
**Submission deadline:** July 21, 2026 at 5:00 p.m. Pacific Time  
**Track:** Education

## Definition of success

By the submission deadline, a judge can open NotZero, choose the prepared software-graduate scenario or submit supported evidence from another field, describe a bounded target context, and receive a trustworthy report that answers:

1. What knowledge is supported by the evidence?
2. Which foundations remain relevant?
3. How do those foundations connect to tools employers request now?
4. What small additions would create the most progress?
5. What is genuinely missing or cannot yet be determined?

The submitted judge path remains the software scenario. The underlying evidence model records field, target, location, and jurisdiction so the product does not confuse one profession's tools, rules, or sources with another's. The result must be specific, evidenced, understandable to a recent graduate, visually coherent, worth keeping as a downloaded document, and easy to demonstrate in under three minutes.

## Priority system

- **P0:** Required for eligibility, a working vertical slice, or judge access.
- **P1:** Strongly improves the judged experience but can be simplified.
- **P2:** Valuable after the submission or only if all P0 work is stable.

## Phase 0: Foundation and compliance

**Target:** July 17

- [x] Verify hackathon eligibility and submission rules.
- [x] Define the product's audience, emotional position, and MVP boundary.
- [x] Research direct and adjacent competitors.
- [x] Define the visual direction and anti-patterns.
- [x] Establish evidence, uncertainty, privacy, and accuracy rules.
- [x] Create repository guidance and roadmap documents.
- [ ] **P0:** Register/join on Devpost and verify the intended entrant/team identity.
- [ ] **P0:** Confirm the project will be submitted to the Education track.
- [ ] **P0:** Confirm access to GPT-5.6 through the product's server-side integration.
- [ ] **P0:** Preserve the primary Codex build thread for the required `/feedback` Session ID.
- [x] **P0:** Record the first repository commit within the submission period.

**Exit criterion:** The scope is frozen, compliance risks are known, and implementation can begin without reopening the product definition.

## Phase 1: Runnable shell and judge path

**Target:** July 17–18

- [x] **P0:** Scaffold the web application with TypeScript and a documented package manager.
- [x] **P0:** Add server-only configuration validation and `.env.example` without secrets.
- [x] **P0:** Create a persistent top navigation with NotZero, Method, Privacy, and Try the demo.
- [x] **P0:** Build the landing page around the approved message:
  - “You are not starting from zero.”
  - “The job post looks unfamiliar. Your knowledge doesn't.”
- [x] **P0:** Implement a prepared fictional software-graduate scenario that requires no upload or login.
- [x] **P0:** Build the intake stepper:
  1. Evidence
  2. Target role
  3. Review and analyze
- [x] **P0:** Add visible privacy guidance before upload.
- [x] **P1:** Add a restrained landing-page product preview built from real app components, not a decorative mockup.

**Exit criterion:** A clean visitor can reach a realistic prepared scenario and understand the value proposition without an explanation from the builder.

## Phase 2: Evidence ledger

**Target:** July 18

- [x] **P0:** Support one curriculum/study-plan document and up to three supporting documents within explicit size/type limits.
- [x] **P0:** Support one bounded final-project artifact, professional-task description, or selected set of readable source and configuration files.
- [x] **P0:** Apply an explicit source-file allowlist and ignore dependencies, build output, binaries, generated files, and obvious secret-bearing files.
- [x] **P0:** Capture dates and evidence type for each item.
- [x] **P0:** Extract and normalize text server-side, including text-based PDFs.
- [x] **P0:** Detect duplicate inputs using a normalized content hash.
- [x] **P0:** Implement a GPT-5.6 Responses API adapter for schema-constrained evidence claims. Live use requires the deployment secret and feature flag.
- [x] **P0:** Validate every model response before use and reject unresolved excerpts.
- [x] **P0:** Store provenance spans or source references for each claim, including repository-relative paths and symbols or lines when available.
- [x] **P0:** Label evidence as expected exposure, demonstrated, self-reported, inferred, or unknown.
- [x] **P0:** Implement incomplete-information and unsupported-file states.
- [x] **P1:** Reject obvious secrets and warn about likely personal contact information before analysis.

**Exit criterion:** The prepared fixture reliably becomes a structured, inspectable knowledge ledger with no unsupported mastery claims.

## Phase 3: Market comparison and Knowledge Bridge Graph

**Target:** July 18–19

- [x] **P0:** Define one supported current-practice pack for the judge scenario: junior backend/DevOps-adjacent development in its dated market context.
- [x] **P0:** Create a controlled, dated job-requirement dataset with licenses or permitted sources recorded.
- [x] **P0:** Normalize job requirements into concepts, practices, and tools.
- [x] **P0:** Build the relationship taxonomy:
  - foundation for;
  - automates;
  - standardizes;
  - encapsulates;
  - commonly used with;
  - modern implementation of;
  - alternative to;
  - successor to;
  - partial replacement; and
  - no direct equivalent.
- [x] **P0:** Require evidence and confidence for each relationship.
- [x] **P0:** Generate the five result groups:
  - current;
  - transferable;
  - small bridge;
  - genuine gap; and
  - insufficient evidence.
- [x] **P0:** Generate exactly three prioritized next steps and one existing-project upgrade challenge.
- [x] **P0:** Generate at least one project-grounded walkthrough for the prepared fixture, with an exact artifact reference, an observed implementation, and a labeled modern counterpart.
- [x] **P0:** Distinguish verified, illustrative, and conceptual comparisons in the schema and interface.
- [x] **P1:** Show job-demand frequency using counts and dates rather than unsupported “industry standard” claims.
- [x] **P1:** Add a method/source panel explaining how the comparison was produced.

**Exit criterion:** The prepared scenario produces several defensible bridges. At least one points to a real project artifact and explains a modern counterpart without claiming false equivalence.

## Phase 4: Report experience and trust polish

**Target:** July 19–20

- [x] **P0:** Build the report header around a specific reassuring conclusion rather than a generic score.
- [x] **P0:** Show counts of supported strengths, bridges, genuine gaps, and unknowns.
- [x] **P0:** Build expandable bridge rows/cards with:
  - what you already know;
  - evidence from your materials;
  - exact artifact location when available;
  - observed implementation and modern counterpart;
  - verified, illustrative, or conceptual status;
  - current market expectation;
  - relationship type;
  - what is actually new;
  - why it is used;
  - recommended proof task; and
  - confidence/source details.
- [x] **P0:** Provide distinct loading, empty, partial, error, limit-reached, and completed states.
- [x] **P0:** Test the full keyboard flow and visible focus states.
- [x] **P0:** Verify desktop and mobile layouts.
- [x] **P0:** Add a deletion/reset action for user materials and results.
- [x] **P1:** Add filters for result type without hiding the complete narrative.
- [x] **P1:** Print/export was initially excluded to avoid a second document surface. Superseded on July 19: owner review made a keepable, downloadable report part of the core product value, and Phase 6 now delivers it.

**Implementation note:** The first trust-rich report is complete, but owner review found that its evidence density prevents 15-second comprehension. Phase 6 keeps these contracts as foundations and replaces the presentation hierarchy.

## Phase 5: Cost, abuse, and operational controls

**Target:** July 20

- [x] **P0:** Keep all API keys and model calls server-side.
- [x] **P0:** Add request, file-count, file-size, token, and per-account/per-session analysis limits.
- [x] **P0:** Add a global spend circuit breaker.
- [x] **P0:** Cache the prepared scenario and identical safe inputs.
- [x] **P0:** Prevent repeated model and web calls for an unchanged analysis version.
- [x] **P0:** Ensure logs do not contain document bodies, secrets, or credentials.
- [x] **P0:** Prepare free judge access valid through August 5, 2026 at 5:00 p.m. PT.
- [x] **P0:** Verify the judge flow in a logged-out/private browser context.

**Exit criterion:** The public demo cannot create unbounded spend, and judges can exercise every submitted feature without payment or reconstruction.

## Phase 6: Decision-ready product and complete custom bridge

**Target:** July 19–20

**Product question:** Why should someone use NotZero instead of uploading the same documents to a general AI model?

NotZero must earn its place through a repeatable product contract. It connects bounded personal evidence to a controlled, dated current-practice pack; validates every important reference; distinguishes demonstrated knowledge from exposure and inference; calculates the smallest defensible learning delta; and turns one existing project into a concrete proof task. A fluent answer without those controls is not a NotZero result.

Stated as user-visible guarantees, the contract is:

1. Every capability claim resolves to a verbatim excerpt in the submitted files, checked by the server, or it is not shown.
2. Market expectations come from one dated, versioned practice pack with recorded counts and sources, never from model memory.
3. Expected exposure, demonstration, self-report, inference, and unknown remain distinct labels.
4. Recommendations name the existing evidence they reuse and keep the learning delta as small as the evidence allows.
5. One existing project becomes a concrete, checkable proof task.
6. The result is a versioned, reproducible document the user downloads and keeps.

A general chat answer can imitate the prose but not the guarantees. Phase 6 has two jobs: complete the live service that honors this contract for custom uploads, and rebuild the result presentation so the contract is visible without dominating the screen. Owner review of the first report found the reverse: the evidence receipts dominated, the conclusion was buried, and the primary copy was set at metadata sizes. The reader should meet a decision first and receipts on request.

**Review note (July 19):** this phase preserves the three earlier work groups (complete the real service, replace the report hierarchy, prove product value), tightens their acceptance criteria, and adds the previously missing work: the citation layer, the report visual system and reveal, honest quantification and chart decisions, downloadable outputs, and the judge-facing beats. It also reverses the Phase 4 decision that excluded print/export.

### Complete the real service

Verified state before this phase: stage one (GPT-5.6 evidence extraction with server-side provenance validation) is implemented and feature-flagged. There is no second analysis stage. The complete Knowledge Bridge report exists only as hand-written prepared content, the report schema restricts `analysisMode` to `prepared_fixture`, and the report component imports the software pack and the prepared scenario's name directly. A custom upload currently ends at an evidence ledger.

- [x] **P0:** Generalize the Knowledge Bridge report schema beyond the prepared fixture: widen the `prepared_fixture` and fixed analysis-version literals to include a live mode and versioned strings, make the walkthrough optional with a required plain-language reason when evidence cannot support one, and allow fewer than five findings when the evidence honestly supports fewer. Exactly three next steps remain required.
- [x] **P0:** Implement the second schema-constrained GPT-5.6 stage (prompt version `bridge-comparison.v1`). Input: the validated evidence ledger and the selected dated practice pack. Output under strict JSON Schema: findings with relationships, three prioritized next steps, one existing-project challenge, and a walkthrough when a real locator supports it. Enforce a server-side token ceiling and treat ledger text as untrusted data.
- [x] **P0:** Validate the second-stage output server-side:
  - every evidence claim ID resolves in the submitted ledger;
  - every requirement and market source resolves in the selected dated pack;
  - every market count or date restates pack data exactly;
  - every relationship uses the approved directional taxonomy;
  - project-specific claims contain a real locator from the submitted artifact;
  - comparison states remain verified, illustrative, or conceptual;
  - exactly three prioritized next steps are present, and with weak evidence they may direct the user to gather specific evidence instead of offering generic study advice; and
  - unsupported conclusions become unknown or insufficient evidence.
- [x] **P0:** Select the practice pack by conservatively matching the submitted field and target against the pack's declared scope. A matching custom software submission returns the complete report, not only an evidence ledger, in the same response.
- [x] **P0:** Keep unsupported fields honest. They may receive a validated evidence ledger, but no market bridge until an appropriate reviewed pack exists, and the interface says so plainly.
- [x] **P0:** Remove hard-coded names, locations, counts, and software-pack assumptions from reusable report components. Every person, place, count, and pack reference renders from the validated payload, selected by the report's recorded pack ID and dataset version.
- [x] **P0:** Show the real pipeline stages during analysis (reading evidence, building the ledger, comparing current requirements, constructing bridges, checking sources) as completed, current, and pending states. No invented percentages.
- [ ] **P0:** Add deterministic and mocked-model fixtures for a successful custom report, weak evidence, summary-only evidence, invented citations, missing market coverage, schema failure, and model failure.
- [x] **P0:** Extend the operational controls to the two-stage flow: both stages count against the live-analysis reservation and circuit breaker, the cache key includes both prompt versions and the report schema version, and the comparison stage gets its own OpenAI prompt cache key.
- [ ] **P0:** Configure the server-side deployment secret, enable the bounded live GPT-5.6 path, and verify one fictional custom upload from ingestion through the final downloaded report.
- [ ] **P1:** Accept an optional list of user-excluded claim IDs in the comparison stage, then add an evidence-review checkpoint between extraction and comparison so the user can reject an inferred claim and rerun only the comparison without re-uploading. The API support lands with the stage; the checkpoint interface ships when the P0 report experience is stable.

### Decision-first information architecture

Readers scan a result; they do not study it line by line. The report is restructured into three layers, each one intentional action away from the next:

1. **Decision brief:** the personal conclusion and what to do next. Fills the first viewport.
2. **Role map:** every finding as a scannable row. One click opens one finding.
3. **Evidence appendix:** numbered receipts, methodology, and limits. Opened from citations.

- [ ] **P0:** Put the decision brief before everything else. At a 1280 px viewport the first screen must answer, without scrolling:
  1. What useful foundation do I already have?
  2. What is the highest-leverage bridge for my target?
  3. What should I do next with work I have already completed?
- [ ] **P0:** Build the headline conclusion from validated fields only, phrased around the person's evidence, for example: “Your 2022 evidence already supports 5 of 8 reviewed requirements for this role. The shortest bridge is containerization.” When evidence is weak the headline states that honestly instead of reassuring by default.
- [x] **P0:** Create a compact `Your shortest bridge` section with three plain-language parts: **Keep**, **Add**, and **Prove**. Do not add a readiness percentage.
- [ ] **P0:** Place the three prioritized next moves and the existing-project challenge immediately after the decision brief, rendered as a numbered path where each step names the existing claim it builds on.
- [x] **P0:** Present the broader role map as collapsed one-line rows grouped into strengths, bridges, gaps, and unknowns. A collapsed row shows the title, group chip, relationship label, confidence dots, and citation markers. Nothing opens by default, including bridges.
- [ ] **P0:** Cap an expanded row at four always-visible blocks: what you already have, what the current practice changes, what is actually new, and the proof task. Excerpts, paths, market counts, confidence rationale, and methodology move into the citation layer.
- [x] **P0:** Move the evidence ledger out of its position above the report. It becomes the numbered evidence appendix at the end of the result, and the report cites into it.
- [ ] **P0:** Keep uncertainty visible in the collapsed state through a short plain-language chip, without showing every limitation and source receipt at once.
- [x] **P0:** Preserve the distinct loading, empty, partial, error, limit-reached, and completed states through the redesign, including the honest ledger-only states for unsupported fields.
- [x] **P0:** On mobile, keep a single-column order of brief, next moves, role map, then appendix, with no interaction that requires horizontal precision.

### Evidence as citations

Keep the trust layer, change its posture: the same pattern readers know from cited AI answers and reference works. Numbered markers in the text, a preview on hover or focus, the full receipt one interaction deeper.

- [x] **P0:** Number every evidence receipt once across the report in order of first appearance and render superscript citation markers after the sentences they support.
- [x] **P0:** On hover or keyboard focus, a marker shows a compact preview: source name, evidence class, date, and a one-line excerpt. Click, tap, or Enter opens the full receipt panel. Escape closes it and returns focus to the marker.
- [x] **P0:** The full receipt panel shows the verbatim excerpt, the path and locator in monospace, the evidence class, the confidence label with its basis, and the specific limitation. Market receipts show employer, role, location, observation date, and the source link.
- [x] **P0:** Keep every conclusion's evidence reachable within two interactions.
- [x] **P0:** Make markers and panels fully keyboard- and touch-operable, with accessible names such as “Evidence 3: study plan, 2022”. Hover-only behavior is not acceptable.
- [ ] **P0:** Add a one-line trust strip under the headline: claims verified against the submitted files, dated market sources used, pack version and observation window, and the analysis pipeline (GPT-5.6 plus server validation). Each segment opens the matching panel.
- [ ] **P1:** Add a `Why this conclusion?` control on the headline and on each next step that opens the combined reasoning receipt for that specific statement.

### Report visual system and the result reveal

The landing animation sets the quality bar for the product. The moment the result arrives must meet it, then settle into a calm, readable document. Motion explains the result once; it does not decorate the page.

- [x] **P0:** Apply the report type scale from the design direction, which the first report violated: conclusion headline 40–48 px, section titles 28–32 px, primary copy 16–18 px with line-height 1.5–1.6 and a 50–75 character measure, and stat numerals 48–64 px. Monospace appears only inside receipts at 12–13 px minimum. Interactive targets stay at 44 px or larger.
- [x] **P0:** Replace the four plain count boxes with stat tiles: a large numeral, a plain-language label, and a one-line meaning, with group color always paired with a text label.
- [x] **P0:** Build the result reveal: when analysis completes, one staged sequence plays in which the pipeline stages settle, the counts count up, the group tiles appear in turn, and the headline conclusion fades in. Total duration under six seconds, skippable, replayable, and replaced by a static completed layout under reduced-motion preferences. Reuse the existing hero animation vocabulary (scan line, staged captions, result cards) so the product feels continuous.
- [ ] **P0:** Draw the bridge connection as a graphic, not only prose: extend the existing landing bridge-card pattern into the report so each finding renders its left node (your evidence), labeled connecting rule (the relationship), and right node (the current requirement) as one visual unit, built with semantic HTML and CSS/SVG. No chart library. Collapses to stacked order on narrow screens.
- [ ] **P0:** Rebuild the walkthrough as a then-and-now comparison: side-by-side panels labeled “In your project” with its date and “Current practice” with its date, the observed excerpt on the user-material surface color, the counterpart on the generated-suggestion surface, and the illustrative or conceptual state chip always visible. Stacked in reading order on mobile.
- [ ] **P0:** Verify every group color and text pairing against WCAG contrast, and never encode a state by color alone.
- [ ] **P1:** Self-host Inter and IBM Plex Mono with recorded licenses if loading stays within performance budget; otherwise keep the system stacks and rely on the scale above.

Anti-goals: no scroll-jacked storytelling, no autoplaying loops after the reveal, no gauges, no decorative AI imagery, and nothing from the anti-generic-AI checklist in the design direction.

### Charts and quantitative graphics

The report earns charts only where they carry the reader faster than sentences. Two principles decide the set. In graphical-perception research, position and length judgments are consistently more accurate than angle judgments, so bars and unit strips are preferred and pie or donut forms are excluded. And NotZero's numbers are small, discrete, evidence-bound counts: a mark that shows “7 of 8” as countable units is honest, while a smooth proportional graphic implies precision the data does not have. The result is a small set of purposeful graphics, each placed where it answers a question, rather than a wall of charts.

| Data | Form | Location |
|---|---|---|
| Four result-group counts | Stat tiles, no chart | Decision brief |
| Standing across the reviewed requirements | Unit coverage strip | Decision brief |
| Market demand per requirement | Horizontal count bars with one emphasized bar | Role map header |
| Confidence per finding | One-to-three discrete dots with a text label | Collapsed rows |
| Concept-to-tool relationships | Bridge connection graphic | Findings and walkthrough |
| Claims by evidence class | Small unit strip | Evidence appendix header (P1) |

Rejected forms, recorded so they stay rejected: pie and donut charts (angle judgments are less accurate and these counts are small and close together), radar charts, gauges, percentage axes, dual-axis charts, and any continuous readiness meter.

- [x] **P0:** Build the requirement coverage strip in the decision brief: one cell per requirement in the selected pack (eight in the software pack), colored by the user's result group, separated by 2 px surface gaps, with a caption stating the derived count, for example “Supported foundations: 5 of 8 reviewed requirements.” Requirements without a finding render as neutral track cells labeled “not assessed.” Hover or focus shows the requirement, group, and evidence count; activating a cell moves to that finding row.
- [x] **P0:** Build the market demand chart at the head of the role map: one row per pack requirement, a solid hairline track for the denominator, a thin bar for the mention count with a rounded data end, and the exact count (“7 of 8”) at the bar end. All bars share one muted hue; only the requirement chosen as the shortest bridge uses the bridge accent, so the chart makes one point. Each row shows the requirement name and a group chip with a text label, activates its finding row, and its tooltip names the postings behind the count with observation dates, linking into the receipts.
- [x] **P0:** Quantify honestly everywhere: counts with visible denominators, discrete confidence dots, and no continuous percentage, gauge, composite readiness score, or radar chart anywhere in the product, including the PDF and the bridge card.
- [ ] **P0:** Fix the group palette before it appears in chart fills. A colorblind-safety and contrast check of the current five group colors on the light surface failed: the current-group green, the gap ochre, and the unknown slate are too gray to read as fills, the ochre and coral pair is too close under red-blind vision, and the ochre and slate pair is hard to separate even with full color vision. Re-step the gap color away from the coral accent, raise the chroma of the current-group green, render insufficient evidence as a neutral outlined or track style instead of a categorical fill, and re-validate adjacent-pair colorblind separation, grayness, and contrast before freezing. Group colors stay paired with text labels regardless.
- [x] **P0:** Implement all graphics as inline SVG or semantic HTML and CSS rendered from the validated report payload. No chart library, and no client-side aggregation that could drift from the validated counts.
- [ ] **P0:** Follow one mark and interaction standard: thin marks with rounded data ends anchored to the baseline, 2 px surface gaps between adjacent fills, solid hairline tracks and rules (never dashed), hit areas of at least 24 px, tooltips that enhance but never gate (every charted value also exists as text), keyboard focus reaching every interactive mark with the same information as hover, and Escape dismissing any open tooltip.
- [x] **P0:** Give every chart a text equivalent inside the document: a figure with a caption stating its conclusion, and the underlying counts reachable as text in the report or appendix. Charts render in the print stylesheet with exact colors and keep their captions in the PDF.
- [x] **P0:** Animate charts only inside the result reveal: cells fill and bars grow once, under 600 ms per element, with a static completed layout under reduced-motion preferences.
- [ ] **P1:** Add the evidence-mix strip to the appendix header: claims by evidence class as a small unit strip with counts, using the same construction and rules as the coverage strip.

### A report you keep

- [ ] **P0:** Add “Download your report (PDF)” using a print stylesheet and the browser's print-to-PDF path: a cover page with the decision brief and counts, the findings with citation numbers, the next moves and challenge, a numbered evidence-reference appendix, and a footer with analysis version, dates, pack version, and the standard disclaimer. Verified in Chrome and Edge at A4 and Letter sizes.
- [ ] **P0:** The downloaded document renders from the same validated payload as the screen, with no regeneration, so its conclusions match exactly.
- [ ] **P0:** Downloads work in the logged-out judge context and for the prepared scenario.
- [ ] **P1:** Add “Save your bridge card”: a 1200 by 630 pixel PNG rendered entirely client-side with the headline conclusion, counts, shortest bridge, and first next move. No excerpts, paths, or file names appear on the card, and nothing is uploaded anywhere.

### Prove product value

- [ ] **P0:** Evaluate Alex and one fictional custom upload against five value criteria:
  - exact grounding in the user's own work;
  - dated current-practice evidence;
  - validated and inspectable provenance;
  - a smaller learning delta than a generic gap list; and
  - a concrete proof task that reuses an existing project.
- [ ] **P0:** Require every recommended action to name the existing knowledge it reuses, the genuinely new concept, why the new practice is used, and what artifact will prove the bridge.
- [ ] **P0:** If the system cannot produce a project-grounded bridge, say what evidence is missing instead of filling the report with generic advice.
- [ ] **P0:** Align the landing page and demo copy with what the completed service actually delivers, and remove internal phase labels from user-facing copy.
- [ ] **P1:** Add a compact method panel titled “What makes this different from asking a chatbot”: the six contract guarantees, each linked to the live control that demonstrates it (a citation receipt, the pack version, an evidence-class label, the delta framing, the proof task, the download).
- [ ] **P1:** Let the user choose a different supported bridge priority and recompute the three-step plan without re-uploading unchanged evidence.

### Judge experience

- [ ] **P0:** Confirm the five demo beats read clearly in a 1080p screen recording: the reveal, the first-viewport decision brief, one citation receipt opening and closing, the then-and-now walkthrough, and the PDF download.
- [ ] **P0:** Verify the redesigned flow logged out, at desktop and mobile widths, keyboard-only, and with reduced motion enabled.
- [ ] **P1:** Add a short reviewer note to the README describing the fastest path through the redesigned result.

**Scope control:** if the July 20 freeze approaches with work remaining, cut in this order: the appendix evidence-mix strip, the bridge card PNG, the priority recompute, the method panel, self-hosted fonts, the market demand chart (fall back to the textual counts already in each row), reveal richness (fall back to a fade plus count-up), then the evidence-review checkpoint interface (keep the API exclusion support). Do not cut the second analysis stage, its server-side validation, the decision-first order, citation receipts, honest unsupported-field states, the coverage strip, or the PDF download.

**Exit criterion:** A fictional custom software upload produces the complete validated service promised on the homepage. Within 15 seconds of the reveal settling, a user can state what carries forward, the one bridge worth building first, and the concrete next action. Evidence stays within two interactions without dominating the default view, no primary copy renders below 16 px, the reveal respects reduced motion, and the user can leave with a downloaded report that matches the screen. Every chart derives from validated counts, uses the re-validated group palette with text labels, and keeps a text equivalent on screen and in the PDF.

## Phase 7: Final verification and submission

**Target:** July 20–21

The initial clean-environment, license, security, and README checks were completed early. Repeat affected checks after Phase 6 and do not record the video until the redesigned live result is frozen.

- [x] **P0:** Run lint, type-check, tests, and production build from a clean checkout.
- [x] **P0:** Follow the README from a clean environment and correct every missing step.
- [ ] **P0:** Confirm the deployed behavior matches the repository, description, and video.
- [x] **P0:** Audit licenses for dependencies, fonts, icons, sample data, and market data.
- [x] **P0:** Scan for secrets, private uploads, personal information, and malicious/unwanted files.
- [x] **P0:** Write the README sections required by the rules:
  - setup and run;
  - sample/judge scenario;
  - testing instructions;
  - architecture and key decisions;
  - how Codex accelerated the workflow;
  - where GPT-5.6 is integrated; and
  - what was built during the submission period.
- [ ] **P0:** Obtain the `/feedback` Session ID from the primary Codex build thread.
- [ ] **P0:** Prepare the public YouTube demo, no longer than three minutes, with English audio covering the product, Codex, and GPT-5.6.
- [ ] **P0:** Re-read the live Official Rules for amendments immediately before submitting.
- [ ] **P0:** Complete every Devpost field and select only Education.
- [ ] **P0:** Submit before July 21 at 5:00 p.m. PT and confirm receipt.
- [ ] **P0:** Archive the submitted commit hash, text, video URL, credentials/instructions, and confirmation.

**Exit criterion:** Devpost confirms a complete submission, and the archived artifacts reproduce exactly what judges will see.

## Suggested three-minute demo arc

| Time | Purpose | Content |
|---|---|---|
| 0:00–0:20 | Empathy | Open an intimidating junior job listing full of unfamiliar tools. Say, “The job post looks unfamiliar. Your knowledge doesn't.” |
| 0:20–0:35 | Input | Select the prepared graduate profile and target role. |
| 0:35–0:50 | Reveal | The pipeline stages complete and the result reveal plays: counts arrive, then the headline conclusion. |
| 0:50–1:15 | Decision brief | Read the conclusion, the coverage strip, the shortest bridge (Keep, Add, Prove), and the first recommended move. |
| 1:15–1:45 | Product depth | Scan the market demand chart, then open the containerization bridge: the connection graphic, the exact project artifact, and the then-and-now comparison. |
| 1:45–2:05 | Trust | Open one citation marker, show the verbatim receipt and locator, close it, and point at the trust strip. |
| 2:05–2:25 | Action and keep | Show the three-step path and the existing-project challenge, then download the PDF report. |
| 2:25–2:45 | GPT-5.6 | Explain the two schema-constrained stages, provenance validation, and uncertainty handling. |
| 2:45–3:00 | Codex and close | Describe how Codex helped build and refine the pipeline and interface. End with “You are not starting from zero.” |

## Post-hackathon backlog

Only begin after every P0 item above is stable:

- expert-reviewed current-practice packs for more professions and geographic markets;
- eight-to-twelve-document academic histories;
- historical curriculum discovery;
- live licensed labor-market feeds;
- authenticated longitudinal profiles;
- recurring change notifications;
- multiple target-role comparison;
- a density control letting returning users choose a brief or complete default view;
- an aggregate cross-finding bridge graph visualization;
- additional keepsake formats and bridge-card variants;
- institution and career-center offerings;
- learning-resource integrations;
- longitudinal validation with graduates and career advisers; and
- transparent evaluation benchmarks for bridge accuracy.

## Repository inclusion decision

`ROADMAP.md` and the product, design, and trust documents may be committed and included in the submitted repository after a public-writing review.

The hackathon rules neither require nor prohibit those filenames. They require a repository and a README that covers setup, key decisions, Codex collaboration, and GPT-5.6 use. Public planning documents can support that evidence when they are accurate and useful.

Keep `AGENTS.md` and `OPENAI_BUILD_WEEK_REQUIREMENTS.md` local and ignored. They contain working instructions and research notes rather than judge-facing project material. Confidential notes, raw private prompts, judge passwords, API keys, user uploads, and unrestricted logs also stay outside the repository. Credentials belong in the private Devpost testing instructions or deployment secret store, never in committed Markdown.
