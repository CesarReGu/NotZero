# NotZero roadmap

**Status:** Hackathon build plan  
**Last updated:** July 18, 2026
**Submission deadline:** July 21, 2026 at 5:00 p.m. Pacific Time  
**Track:** Education

## Definition of success

By the submission deadline, a judge can open NotZero, choose the prepared software-graduate scenario or submit supported evidence from another field, describe a bounded target context, and receive a trustworthy report that answers:

1. What knowledge is supported by the evidence?
2. Which foundations remain relevant?
3. How do those foundations connect to tools employers request now?
4. What small additions would create the most progress?
5. What is genuinely missing or cannot yet be determined?

The submitted judge path remains the software scenario. The underlying evidence model records field, target, location, and jurisdiction so the product does not confuse one profession's tools, rules, or sources with another's. The result must be specific, evidenced, understandable to a recent graduate, visually coherent, and easy to demonstrate in under three minutes.

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
- [x] **P1:** Keep print/export out of the hackathon flow because it adds a second document surface without improving the judge path.

**Implementation note:** The first trust-rich report is complete, but user review found that its evidence density prevents 15-second comprehension. Phase 6 keeps these contracts as foundations and replaces the presentation hierarchy.

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

### Complete the real service

- [ ] **P0:** Generalize the Knowledge Bridge report schema beyond `prepared_fixture`, Alex-specific identifiers, and hard-coded prepared findings.
- [ ] **P0:** Implement a second schema-constrained GPT-5.6 stage that compares a validated evidence ledger with one supported current-practice pack and proposes findings, relationships, next steps, and a project challenge.
- [ ] **P0:** Validate the second-stage output server-side:
  - every evidence claim ID resolves in the submitted ledger;
  - every requirement and market source resolves in the selected dated pack;
  - every relationship uses the approved directional taxonomy;
  - project-specific claims contain a real locator from the submitted artifact;
  - comparison states remain verified, illustrative, or conceptual;
  - exactly three prioritized next steps are present; and
  - unsupported conclusions become unknown or insufficient evidence.
- [ ] **P0:** Make the custom software path return the complete report, not only an evidence ledger, when the field and target match the supported software pack.
- [ ] **P0:** Keep unsupported fields honest. They may receive a validated evidence ledger, but no market bridge until an appropriate reviewed pack exists.
- [ ] **P0:** Remove hard-coded names, locations, counts, and software-pack assumptions from reusable report components.
- [ ] **P0:** Add deterministic and mocked-model fixtures for a successful custom report, weak evidence, summary-only evidence, invented citations, missing market coverage, schema failure, and model failure.
- [ ] **P0:** Configure the server-side deployment secret, enable the bounded live GPT-5.6 path, and verify one fictional custom upload from ingestion through final report.

### Replace the report hierarchy

- [ ] **P0:** Put the decision brief before the evidence ledger. The first viewport must answer:
  1. What useful foundation do I already have?
  2. What is the highest-leverage bridge for my target?
  3. What should I do next with work I have already completed?
- [ ] **P0:** Create a compact `Your shortest bridge` section with three plain-language parts: **Keep**, **Add**, and **Prove**. Do not add a readiness percentage.
- [ ] **P0:** Place the three prioritized next moves and existing-project challenge immediately after the decision brief.
- [ ] **P0:** Present the broader role map as scannable collapsed rows for strengths, bridges, gaps, and unknowns. Nothing opens by default solely because it is a bridge.
- [ ] **P0:** Move the evidence ledger, raw excerpts, paths, market counts, confidence rationale, and methodology into progressive disclosure.
- [ ] **P0:** Use citation-like evidence controls such as `2 evidence items` or `Why this conclusion?` that reveal an inline panel or drawer. Keep evidence reachable within two interactions.
- [ ] **P0:** Keep uncertainty visible in the collapsed state without showing every limitation and source receipt at once.
- [ ] **P0:** Use readable primary copy at normal body size. Reserve small monospaced text for source metadata inside expanded evidence views.
- [ ] **P0:** Add an evidence-review checkpoint where the user can reject an inferred claim or correct source context before the market comparison runs.

### Prove product value

- [ ] **P0:** Evaluate Alex and one fictional custom upload against five value criteria:
  - exact grounding in the user's own work;
  - dated current-practice evidence;
  - validated and inspectable provenance;
  - a smaller learning delta than a generic gap list; and
  - a concrete proof task that reuses an existing project.
- [ ] **P0:** Require every recommended action to name the existing knowledge it reuses, the genuinely new concept, why the new practice is used, and what artifact will prove the bridge.
- [ ] **P0:** If the system cannot produce a project-grounded bridge, say what evidence is missing instead of filling the report with generic advice.
- [ ] **P1:** Let the user choose a different supported bridge priority and recompute the three-step plan without re-uploading unchanged evidence.

**Exit criterion:** A fictional custom software upload produces the complete validated service promised on the homepage. Within 15 seconds, a user can explain what carries forward, the one bridge worth building first, and the concrete next action. Evidence remains available on demand without dominating the result.

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
- [ ] **P0:** Complete every Devpost field and select only Education.
- [ ] **P0:** Submit before July 21 at 5:00 p.m. PT and confirm receipt.
- [ ] **P0:** Archive the submitted commit hash, text, video URL, credentials/instructions, and confirmation.

**Exit criterion:** Devpost confirms a complete submission, and the archived artifacts reproduce exactly what judges will see.

## Suggested three-minute demo arc

| Time | Purpose | Content |
|---|---|---|
| 0:00–0:20 | Empathy | Open an intimidating junior job listing full of unfamiliar tools. Say, “The job post looks unfamiliar. Your knowledge doesn't.” |
| 0:20–0:40 | Input | Select the prepared graduate profile and target role. |
| 0:40–1:05 | Decision brief | Show what already carries, the shortest bridge, and the recommended proof task. |
| 1:05–1:40 | Product | Open one bridge, reveal its exact project artifact, and compare it with a labeled modern counterpart. |
| 1:40–2:00 | Trust | Open the citation-like evidence control, show one source receipt, then close it to restore the simple report. |
| 2:00–2:20 | Action | Show the three-step learning delta and the existing-project upgrade challenge. |
| 2:20–2:45 | GPT-5.6 | Explain structured evidence extraction, relationship reasoning, provenance, and uncertainty. |
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
- institution and career-center offerings;
- learning-resource integrations;
- longitudinal validation with graduates and career advisers; and
- transparent evaluation benchmarks for bridge accuracy.

## Repository inclusion decision

`ROADMAP.md` and the product, design, and trust documents may be committed and included in the submitted repository after a public-writing review.

The hackathon rules neither require nor prohibit those filenames. They require a repository and a README that covers setup, key decisions, Codex collaboration, and GPT-5.6 use. Public planning documents can support that evidence when they are accurate and useful.

Keep `AGENTS.md` and `OPENAI_BUILD_WEEK_REQUIREMENTS.md` local and ignored. They contain working instructions and research notes rather than judge-facing project material. Confidential notes, raw private prompts, judge passwords, API keys, user uploads, and unrestricted logs also stay outside the repository. Credentials belong in the private Devpost testing instructions or deployment secret store, never in committed Markdown.
