# NotZero roadmap

**Status:** Hackathon build plan  
**Last updated:** July 17, 2026  
**Submission deadline:** July 21, 2026 at 5:00 p.m. Pacific Time  
**Track:** Education

## Definition of success

By the submission deadline, a judge can open NotZero, choose a prepared academic scenario or submit supported evidence, choose a target software role, and receive a trustworthy report that answers:

1. What knowledge is supported by the evidence?
2. Which foundations remain relevant?
3. How do those foundations connect to tools employers request now?
4. What small additions would create the most progress?
5. What is genuinely missing or cannot yet be determined?

The result must be specific, evidenced, understandable to a recent graduate, visually coherent, and easy to demonstrate in under three minutes.

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

- [ ] **P0:** Support one curriculum/study-plan document and up to three supporting documents within explicit size/type limits.
- [ ] **P0:** Support one bounded final-project artifact, repository-derived description, or selected set of source and configuration files.
- [ ] **P0:** Apply an explicit source-file allowlist and ignore dependencies, build output, binaries, generated files, and obvious secret-bearing files.
- [ ] **P0:** Capture dates and evidence type for each item.
- [ ] **P0:** Extract and normalize text server-side.
- [ ] **P0:** Detect duplicate inputs using a normalized content hash.
- [ ] **P0:** Use GPT-5.6 to return schema-constrained evidence claims.
- [ ] **P0:** Validate every model response before use.
- [ ] **P0:** Store provenance spans or source references for each claim, including repository-relative paths and symbols or lines when available.
- [ ] **P0:** Label evidence as expected exposure, demonstrated, self-reported, inferred, or unknown.
- [ ] **P0:** Implement incomplete-information and unsupported-file states.
- [ ] **P1:** Redact or warn about obvious secrets and sensitive content before analysis.

**Exit criterion:** The prepared fixture reliably becomes a structured, inspectable knowledge ledger with no unsupported mastery claims.

## Phase 3: Market comparison and Knowledge Bridge Graph

**Target:** July 18–19

- [ ] **P0:** Define one supported target scenario, preferably junior backend/DevOps-adjacent development.
- [ ] **P0:** Create a controlled, dated job-requirement dataset with licenses or permitted sources recorded.
- [ ] **P0:** Normalize job requirements into concepts, practices, and tools.
- [ ] **P0:** Build the relationship taxonomy:
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
- [ ] **P0:** Require evidence and confidence for each relationship.
- [ ] **P0:** Generate the five result groups:
  - current;
  - transferable;
  - small bridge;
  - genuine gap; and
  - insufficient evidence.
- [ ] **P0:** Generate exactly three prioritized next steps and one existing-project upgrade challenge.
- [ ] **P0:** Generate at least one project-grounded walkthrough for the prepared fixture, with an exact artifact reference, an observed implementation, and a labeled modern counterpart.
- [ ] **P0:** Distinguish verified, illustrative, and conceptual comparisons in the schema and interface.
- [ ] **P1:** Show job-demand frequency using counts and dates rather than unsupported “industry standard” claims.
- [ ] **P1:** Add a method/source panel explaining how the comparison was produced.

**Exit criterion:** The prepared scenario produces several defensible bridges. At least one points to a real project artifact and explains a modern counterpart without claiming false equivalence.

## Phase 4: Report experience and trust polish

**Target:** July 19–20

- [ ] **P0:** Build the report header around a specific reassuring conclusion rather than a generic score.
- [ ] **P0:** Show counts of supported strengths, bridges, genuine gaps, and unknowns.
- [ ] **P0:** Build expandable bridge rows/cards with:
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
- [ ] **P0:** Provide distinct loading, empty, partial, error, limit-reached, and completed states.
- [ ] **P0:** Test the full keyboard flow and visible focus states.
- [ ] **P0:** Verify desktop and mobile layouts.
- [ ] **P0:** Add a deletion/reset action for user materials and results.
- [ ] **P1:** Add filters for result type without hiding the complete narrative.
- [ ] **P1:** Add print/export only if it does not destabilize the core flow.

**Exit criterion:** A judge can understand the result in 15 seconds and inspect the evidence for any conclusion in one interaction.

## Phase 5: Cost, abuse, and operational controls

**Target:** July 20

- [ ] **P0:** Keep all API keys and model calls server-side.
- [ ] **P0:** Add request, file-count, file-size, token, and per-account/per-session analysis limits.
- [ ] **P0:** Add a global spend circuit breaker.
- [ ] **P0:** Cache the prepared scenario and identical safe inputs.
- [ ] **P0:** Prevent repeated model and web calls for an unchanged analysis version.
- [ ] **P0:** Ensure logs do not contain document bodies, secrets, or credentials.
- [ ] **P0:** Prepare free judge access valid through August 5, 2026 at 5:00 p.m. PT.
- [ ] **P0:** Verify the judge flow in a logged-out/private browser context.

**Exit criterion:** The public demo cannot create unbounded spend, and judges can exercise every submitted feature without payment or reconstruction.

## Phase 6: Verification and submission

**Target:** July 20–21

- [ ] **P0:** Run lint, type-check, tests, and production build from a clean checkout.
- [ ] **P0:** Follow the README from a clean environment and correct every missing step.
- [ ] **P0:** Confirm the deployed behavior matches the repository, description, and video.
- [ ] **P0:** Audit licenses for dependencies, fonts, icons, sample data, and market data.
- [ ] **P0:** Scan for secrets, private uploads, personal information, and malicious/unwanted files.
- [ ] **P0:** Write the README sections required by the rules:
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
| 0:40–1:45 | Product | Open one exact project artifact. Show what it demonstrates, a labeled modern counterpart, one genuine gap, and the evidence behind each finding. |
| 1:45–2:20 | Action | Show the learning delta and the project upgrade challenge. |
| 2:20–2:45 | GPT-5.6 | Explain structured evidence extraction, relationship reasoning, provenance, and uncertainty. |
| 2:45–3:00 | Codex and close | Describe how Codex helped build and refine the pipeline and interface. End with “You are not starting from zero.” |

## Post-hackathon backlog

Only begin after every P0 item above is stable:

- more professions and geographic markets;
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
