# NotZero

NotZero connects academic knowledge and past projects with current professional practice. It shows what the available evidence supports, how that foundation transfers, and the smallest useful next step.

> You are not starting from zero.

## Current status

The software-graduate vertical slice now includes the decision-ready report, evidence receipts, dated market comparison, project-grounded code bridges, and print-to-PDF path. The remaining release work is deployment configuration and final submission verification. The runnable application currently includes:

- a public landing page with the approved product message;
- persistent navigation to Method, Privacy, and the prepared demo;
- a fictional 2022 software-graduate scenario that requires no account or upload;
- a functional Evidence, Target context, Review and analyze stepper;
- a fully inspectable evidence ledger where each extracted claim shows its evidence class, confidence, and the exact excerpt it rests on, so every conclusion traces back to the file it came from;
- visible privacy guidance before upload;
- a deterministic, provenance-aware evidence ledger and complete Knowledge Bridge Graph;
- a location-only intake: the visitor supplies only where they are (and an optional jurisdiction), and the field and target role are inferred from the evidence itself, so the person never has to already know the name of the field they are moving toward;
- a custom evidence path for one curriculum, up to three supporting documents, and one bounded project or professional task;
- server-side PDF and text extraction, normalized hashing, duplicate detection, source allowlists, limits, and secret checks;
- three typed GPT-5.6 Responses API stages using strict structured output: evidence extraction, bridge comparison, and a guided-program stage that writes the vocabulary translation, code counterparts, and phased curriculum;
- a bring-your-own-key path: a visitor can add their OpenAI API key in the interface, it travels only with their analysis requests, is never written to the database or logs, and is held in the browser tab and (while a job is running) in process memory only, then dropped when the job finishes or on reset;
- validation that rejects malformed model output, unknown sources, and excerpts that cannot be resolved in the submitted material;
- a dated current-practice pack built from eight manually reviewed employer postings for Mexico and remote Latin America;
- an illustrative current-practice reference for any other field, so the product is domain-agnostic in form: GPT-5.6 locates job postings for the field and location by web search and the counts are counts over those located postings (or representative role archetypes when a live search finds too few). Only software has a human-reviewed pack; every generated reference is labeled generated, capped at illustrative, and never verified, and regulated fields such as law, nursing, and accounting need their own reviewed sources and safety rules before their conclusions can be relied on;
- a country to region to city location picker that structures where the visitor is, so the market comparison and live posting search target the right jurisdiction;
- normalized market requirements with exact mention counts, source links, observation dates, and usage records;
- five result groups: current, transferable, small bridge, genuine gap, and insufficient evidence;
- relationship evidence from the market pack and official Docker, GitHub, and OpenTelemetry documentation;
- exactly three prioritized next steps and one existing-project upgrade challenge;
- combined reasoning receipts for the headline and each next step, plus an instant supported-priority selector;
- up to three side-by-side code bridges that quote the user's own source with its path and line numbers, then show a labelled current-practice counterpart, what transfers, and what is genuinely new (the Alex scenario produces three; a report may include fewer, or none when the evidence is summary-only);
- a vocabulary bridge translating the user's own words into the terms job posts use, marked `equivalent`, `narrower`, or `related` so a near match is never sold as the same thing;
- role profiles derived from clusters of requirements observed together in the reviewed postings, each citing the postings it came from, with the closest fit computed as a count and any profile selectable for comparison;
- a gap table pairing each unevidenced requirement with the roadmap step that closes it and the dated source behind the conclusion;
- a phased roadmap (two to five phases; the Alex scenario has four) where every phase starts from an existing claim, names one new idea, and ends in a build artifact with a checkpoint;
- a download package of focused documents plus ready-to-adapt code files, built in the browser with a dependency-free ZIP writer;
- visible verified, illustrative, and conceptual comparison states;
- a decision-first report with a validated conclusion, a coverage composition chart, the shortest bridge as a three-stop flow, and the next actions before the detailed role map;
- a market-demand bar chart over all eight reviewed requirements, coloured by the conclusion drawn from the user's evidence and generated from server-validated findings;
- collapsed conclusions that reveal the connection and learning delta first, with evidence receipts, exact locators, counts, sources, and limits on demand;
- numbered citation markers with hover and keyboard previews, plus a focused receipt panel for submitted evidence, dated market observations, and reviewed technical sources;
- an end-of-report evidence appendix instead of a permanent wall of provenance text;
- a print action that renders a genuine summary (verdict, role match, roadmap, proof task, method) rather than every expanded panel;
- a client-generated 1200 by 630 PNG bridge card containing summary fields only, with no evidence excerpts, paths, or file names;
- result filters that preserve the complete narrative as the default view;
- distinct loading, empty, partial, error, limit-reached, and completed states;
- keyboard focus management, visible focus indicators, responsive report layouts, and a clear reset action;
- durable anonymous-session request and live-analysis limits backed by the hosted D1 database;
- a deployment-wide live-analysis circuit breaker with a configurable hard ceiling;
- analysis-versioned, session-scoped result caching with a 30-minute default lifetime;
- a server-side cache deletion endpoint connected to the user-facing reset action;
- separate OpenAI prompt cache keys for the reusable extraction and bridge-comparison prefixes;
- no-store API responses and application logging that excludes document bodies, credentials, and extracted text;
- server-only environment validation and a safe health endpoint;
- shared Zod contracts for field context, evidence sources, claims, provenance, evidence classes, and tool relationships; and
- route-level production tests.

The prepared software scenario remains deterministic for reliable judging and does not consume a live-analysis allowance. For a conservatively matched software target, the custom path validates extracted evidence, runs the bridge-comparison and guided-program stages, reconstructs every citation and count from server-owned data, and returns a complete report with the same structure as the prepared one: verdict, role match, requirement map, vocabulary, code bridges, curriculum roadmap, and download package. For a field that no curated pack covers, a fourth stage generates a current-practice reference for that exact field with GPT-5.6, so any field — machine learning, accounting, law, or otherwise — returns the same full report, labeled as an illustrative generated reference rather than a reviewed dataset. Without a key, or if generation fails, the analysis stops at an honest evidence ledger.

Live analysis runs when either key is available: the deployment's own server-side key (requires `NOTZERO_ENABLE_LIVE_ANALYSIS=true`, bounded by the session and global circuit breakers) or a visitor-supplied key entered in the interface (spends only the visitor's OpenAI account and can be disabled with `NOTZERO_ALLOW_USER_KEYS=false`). Without any key, the interface returns a source receipt and makes no capability claims.

The custom path runs as a persistent server-side job. Uploading the evidence starts it, and it proceeds through extraction, current-practice comparison, and the guided program with no further action from the reader: the interface only shows each stage completing. Every stage is checkpointed as it finishes, so nothing is lost if the reader navigates away, refreshes, or closes the tab: returning restores the current progress or the finished report and resumes from the last completed stage. Between visits the job also advances on a best-effort basis, reliably with the deployment's own key; a visitor key is held only in memory, so if the tab is closed and the process recycles, the analysis simply resumes on the reader's next poll once the key is re-supplied. A stage that fails is recorded and can be retried, and a retry resumes from the last checkpoint rather than repeating work that already succeeded or spending its tokens again.

The hosted judge demo is publicly reachable without an account, payment, API key, or ChatGPT subscription. It must remain available through August 5, 2026 at 5:00 p.m. PT under the official judging-period requirement.

## Technology

- TypeScript
- React 19 with a Next-compatible App Router through Vinext
- Vite
- Cloudflare Workers-compatible server output
- Zod for runtime contracts and configuration validation
- npm with the committed `package-lock.json`

This stack keeps browser code, domain contracts, server configuration, and the future model adapter separable. It also supports a low-friction hosted judge path.

## Requirements

- Node.js 22.13 or newer
- npm

## Local setup

1. Install dependencies:

   ```bash
   npm ci
   ```

2. Create local configuration:

   ```bash
   cp .env.example .env.local
   ```

   On Windows PowerShell, use:

   ```powershell
   Copy-Item .env.example .env.local
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open `http://localhost:3000`.

No OpenAI API key is needed for the prepared judge demo. Live claims from user-supplied evidence need a key from either side: a visitor can add their own key in the upload flow (used per request, never written to the database or logs, held in memory only while the job runs), or the deployment can set `OPENAI_API_KEY` with `NOTZERO_ENABLE_LIVE_ANALYSIS=true` in `.env.local`. Keys never belong in the repository.

## Judge scenario

1. Open the landing page and select **See Alex's bridge**.
2. Review Alex Rivera's fictional academic and project evidence.
3. Continue to the single supported junior backend role.
4. Build the Knowledge Bridge. Read the first-screen conclusion, shortest bridge, and first action.
5. Open one numbered citation to inspect its exact source receipt and limitation.
6. Read the three then-and-now code bridges and the vocabulary translation, switch role profiles to compare what each asks for, then take **Download your package** for the roadmap, role-match report, vocabulary sheet, code walkthrough, and ready-to-adapt files.

The secondary path accepts bounded evidence from any field. The visitor records only their location and optional jurisdiction; the field and the closest current target role are inferred from the evidence during extraction, so the answer is never typed into the input. When a human-reviewed market pack covers the inferred field (currently the reviewed software pack), it is used as the authoritative comparison. When none does, NotZero generates a current-practice reference for the field with GPT-5.6 and runs the same comparison against it; the report then carries a visible banner and limitations stating it is a model-generated, illustrative reference — its "roles" are representative archetypes linked to live job-board searches, not individually reviewed postings, and no finding may claim the verified state. This does not imply that the current release contains human-reviewed market packs for law, nursing, accounting, or other regulated professions.

The checked-in fixture lives in `public/alex-evidence/`. It is a complete fictional 2022 capstone project (nine files: a study plan, a capstone report, a graded testing assignment, a README, four source files, and a schema) that visitors can open and download from the demo. It contains no real credentials or personal data. The evidence ledger's hashes and line numbers are computed from these exact files, so editing one requires recomputing its entry in `lib/fixtures/alex-ledger.ts`.

## Verification

Run the complete production test:

```bash
npm test
```

Run individual checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Run the complete release verification, including dependency-license metadata and tracked-file safety checks:

```bash
npm run verify
```

The route tests render the production worker and verify the landing, demo, Method, Privacy, and health routes. Adapter tests also run deterministic mocked-model scenarios for a complete custom report, weak evidence, summary-only evidence, invented citations, missing market coverage, malformed schema output, and model transport failure.

For a release candidate, clone the repository into a clean directory, follow **Local setup**, run `npm run verify`, and exercise the hosted demo without an authenticated session. The deployment must return the same prepared findings and source receipts as the checked-in fixture.

## Architecture

```text
app/                 Routes, metadata, and the server-only health endpoint
components/          Reusable product interface and the interactive demo
data/market/          Versioned current-practice dataset and source-use record
lib/config/          Server-only environment validation
lib/domain/          Runtime-validated evidence and relationship contracts
lib/evidence/        File validation, extraction, hashing, limits, and the fast-model adapter
lib/bridge/          Deterministic comparison, role matching, and report validation
lib/export/          Download package: focused documents, code files, ZIP writer
lib/market/          Current-practice pack validation and lookup, low-cost web-search scan, and grounded/archetype pack generation
lib/operations/      Anonymous sessions, durable limits, cache, and circuit breaker
lib/fixtures/        Parsed deterministic scenario data
db/                  Runtime D1 schema definitions
drizzle/             Hosted D1 migrations
public/alex-evidence/ Fictional 2022 capstone artifacts served to the prepared scenario
tests/               Production-rendered routes and deterministic model scenarios
worker/              Cloudflare-compatible application entry point
```

The shared domain contracts use the evidence classes defined in the trust standard: expected exposure, demonstrated, self-reported, inferred, and unknown. Relationship values are restricted to the approved directional taxonomy. The report contract validates every claim, requirement, relationship source, comparison state, use rationale, next-step field, and project reference before display. Operational controls bound the staged analysis.

## GPT-5.6 integration

The typed server-side Responses API adapters route each stage to the smallest model that still fits the job: `gpt-5.4-nano` for evidence extraction, `gpt-5.4-mini` for optional posting search, and `gpt-5.6-luna` for the comparison and guided program. Reasoning effort is configurable per route, with medium for Luna and low for the fast/search models by default. The visitor-facing live flow remains a sequence of schema-constrained calls:

1. `evidence-extraction.v1` reads the validated, line-numbered evidence text and returns a conservative claim ledger. It also infers, from the evidence alone, the professional field the material belongs to and the closest current target role — the visitor supplies only their location, so the model is never handed the answer it is meant to deduce. Every excerpt is checked against the submitted material; an unverifiable model reference is omitted with a limitation, so incomplete evidence produces an honest ledger instead of failing the whole analysis.
2. `bridge-comparison.v2` receives only the validated ledger and one conservatively selected, dated practice pack, and returns the five result groups, three next steps, and the upgrade challenge. The server repairs a model response that omits its matching market source or cites a technical document for an unsupported relationship, preserving valid findings while recording the limitation.
3. `solution-layer.v1` writes the guided program: the vocabulary translation, up to three code bridges, and the phased curriculum roadmap with modules and exercises. The observed side of every code bridge is assembled server-side from an already-verified ledger reference, so the model can never misquote the person's own code. If this stage fails validation, the report degrades to the validated market comparison with an explicit limitation instead of failing.

For a field no curated pack covers, a preceding pack stage generates the current-practice reference the two stages above compare against, and it is what makes NotZero domain-agnostic in form. It first runs `job-postings-scan.v1`, a GPT-5.4 mini call with the Responses API web-search tool that locates job postings for the field, target, and location (employer, role, link, and stated requirements). A second call, `practice-pack-grounded.v1`, normalizes those postings into canonical requirements and role clusters without searching again. The server assembles the full pack deterministically from the located postings — computing reciprocal source/requirement mappings and mention counts rather than trusting them — so a graduate in a field such as data science or graphic design sees counts over located postings with working links, in the same shape as the curated software pack, but labeled illustrative rather than reviewed. NotZero validates only the format of those links, not that a listing still exists or that its stated requirements are accurate, so a generated pack is a labeled starting point, never a verified source. When the search finds too few postings, or web search is unavailable, the pack falls back to `practice-pack.v1`, which builds representative role archetypes whose links open live job-board searches. Both tiers run the same strict validators a curated pack passes, are flagged `generated` with a `grounding` of `web_search` or `model_archetypes`, and finalize the report so no finding, code bridge, walkthrough, or challenge may claim the verified state, with explicit provenance limitations attached. Software is the only human-reviewed pack; regulated fields such as law, nursing, and accounting can be generated too, but the reference stays explicitly illustrative and is not professional guidance, and a dependable pack for them needs its own reviewed sources and safety rules. Curated packs, when they match, are always preferred over generation, and `NOTZERO_ENABLE_JOB_SEARCH=false` disables the live search for model tiers without the web-search tool.

All stages enforce output-token ceilings sized for reasoning models, prompt-cache keys, strict JSON Schema output, and a bounded upstream request timeout before independent Zod validation. The temporary demo diagnostics log records only redacted lifecycle and model-response metadata. It omits prompts, uploaded text, response content, API keys, and cookies.

GPT-5.6 performs the substantive interpretation of bounded academic, project, or prior-task evidence, then proposes the smallest supported bridges into current practice. Deterministic server logic owns file limits, source types, hashes, secret checks, allowed evidence classes, market-pack selection and versions, role-profile clusters, schema validation, URLs, dates, and market counts, and it verifies that every quoted excerpt resolves verbatim in the cited file. Unknown claim IDs, unsupported relationships, excerpts that do not appear in the cited file, unlisted learning resources, and misstated pack data are rejected before display. A structurally valid comparison that contains an inconsistent source list is repaired by dropping the unsupported reference and attaching the matching dated market source from the server-owned pack; the repair is disclosed in the report limitations. Each claim's locator (path, line, or symbol) is preserved for inspection beside its verified excerpt; NotZero confirms the excerpt is genuinely present in the file, not that the line number or symbol is exact. The implementation follows OpenAI's [Structured Outputs guidance](https://developers.openai.com/api/docs/guides/structured-outputs) and uses the Responses API.

The API key for the staged calls comes from one of two places, in order: a visitor key sent with that request from the in-app panel (never written to the database or logs, held in the visitor's browser tab and, while a job is running, in a process-memory map that is swept within the hour and dropped when the job finishes or on reset), or the deployment's server-side `OPENAI_API_KEY` when live analysis is enabled. Deployment spending limits and the circuit breaker apply only to the server key; visitor keys spend the visitor's own account and remain subject to per-session request limits.

## Codex collaboration

The entrant directed the product scope, emotional story, multidisciplinary positioning, visual critique, use-case animation, roadmap priorities, and decision to keep software graduates as the validated MVP. Codex translated that direction into implementation plans, challenged scope that would weaken the evidence standard, and kept the repository, tests, deployment, and documentation synchronized.

Codex read and reconciled the product brief, design direction, trust standard, roadmap, and hackathon requirements before implementation. It accelerated the engineering work by scaffolding the runnable site, separating domain rules from presentation and model access, implementing each roadmap phase, writing deterministic fixtures and tests, and inspecting the rendered flow at desktop and mobile widths. The entrant reviewed each phase in the hosted product and requested the major revisions that shaped the final experience.

The primary Codex task should be preserved for the required `/feedback` Session ID. Dated commits provide the repository record of work completed during the submission period.

## Build Week development record

NotZero was created during the Build Week submission period. The first repository commit is dated July 17, 2026. The dated history records the runnable judge path, marketing redesign, evidence transformation, multidisciplinary positioning, evidence ledger, Knowledge Bridge Graph, report experience, operational controls, and final verification work as separate milestones.

The final product and engineering decisions remain the entrant's. Codex provided implementation leverage and analysis inside the primary build task. GPT-5.6 is the product's substantive evidence-interpretation engine through the server-side adapter described above. The deterministic fixture keeps the core judge walkthrough reliable and does not pretend to be a live model result.

## Key decisions

- The prepared demo works without authentication, uploads, or external services.
- The judge fixture does not simulate a live model call. It exposes a labeled deterministic result.
- The live path takes a visitor's own OpenAI key through the interface, so the public repository and the free demo never contain credentials, and judges can run a real analysis with a key provided privately.
- Role profiles live in the versioned market pack rather than in any single report: they are clusters observed in the reviewed postings, so every report compared against the same pack shares the same profiles.
- Custom evidence can come from any field. A curated current-practice pack (currently the reviewed software pack) is used when the field matches one; otherwise NotZero generates a labeled, illustrative current-practice reference for that field with GPT-5.6 so the full report is still produced. Generated references never claim the verified state, count representative role archetypes rather than reviewed postings, and disclose that they were model-synthesized. Curated packs remain the authoritative path, and more can be added over time.
- The visitor never types the field or target role. These are inferred from the evidence during extraction — so the model is never handed the answer it is meant to deduce, which is the point of the product — and the detected field is shown back to the reader. The intake asks only for location and an optional jurisdiction.
- User-uploaded evidence carries no self-reported date. A file date is unverifiable and could bias the analysis for or against the content, so it is never collected, sent to the model, stored, or displayed; currency is judged from the content itself and from the dated market pack. The prepared fixture and the market pack keep their authored and server-owned dates.
- The marketing site uses a cool white surface, high-contrast sans typography, cobalt actions, coral bridge states, and structured evidence graphics. The direction is meant to read as an education-to-career product rather than an organic retail brand.
- The hero includes a replayable evidence transformation that maps a fictional 2022 final project into demonstrated knowledge, a small modernization bridge, and an explicit unknown. It uses CSS motion, lightweight React controls, and a static reduced-motion state.
- Inter and IBM Plex Mono are self-hosted as SIL Open Font License WOFF2 files under `public/fonts/`. The report then renders in its intended typefaces on any machine and prints to PDF with embedded, selectable text, rather than falling back to restricted system fonts that browsers outline (which distorted thin glyphs such as the lowercase l and hyphens).
- Uploaded file bytes are read and validated in the request that receives them and are never stored. A live analysis then runs as a persistent job whose extracted evidence text and validated stage results are held server-side only for the analysis window (30 minutes by default), so the job can resume and be retried, and they are deleted on reset. No longitudinal profile is kept.
- A visitor OpenAI key is held only in the browser tab and, for the duration of an in-flight job, in server memory so a background driver can keep the job moving. It is never written to the database, a log, or a cache.
- Cache keys contain a one-way anonymous session hash, the analysis version, normalized input hashes, source types, location context, and model configuration. They do not contain uploaded document bodies or self-reported dates.
- Cached evidence ledgers and live-job records expire after 30 minutes by default and can be deleted immediately through reset. Original uploaded file bytes are never persisted.
- The live-analysis circuit breaker limits total calls for an analysis version. OpenAI project usage limits remain the final account-level backstop.

## Privacy and data handling

The application accepts a bounded evidence set and never writes original uploaded file bytes to storage. A live analysis runs as a persistent job so it can survive a refresh, resume after the reader navigates away, and be retried without repeating completed work. To make that possible, the extracted evidence text and each validated stage result are held server-side only for the analysis window (30 minutes by default). That job state is deleted on reset and expires on its own, and OpenAI keys are never part of it. `.env` files, uploads, private data, caches, and generated analysis data are ignored by Git. The prepared scenario is fictional.

Do not add real academic records, employer-owned code, credentials, private fixtures, or judge credentials to the repository.

## Dependency and asset notes

The application uses the open-source dependencies recorded in `package-lock.json`. `unpdf` provides MIT-licensed, serverless-compatible PDF text extraction. `tsx` is an MIT-licensed development dependency used for typed adapter and report tests. The interface self-hosts the Inter and IBM Plex Mono typefaces (SIL Open Font License 1.1) as WOFF2 files under `public/fonts/`, with each font's license text stored beside it. The social preview image was generated specifically for NotZero during this build and is stored at `public/og.png`. The complete review record and repeatable audit procedure are in [`docs/THIRD_PARTY_NOTICES.md`](docs/THIRD_PARTY_NOTICES.md).

The market pack stores factual requirement labels and links from publicly accessible employer postings. It does not redistribute job descriptions. Official technical documentation is summarized and linked. Source and use details are recorded in `data/market/README.md` and the versioned JSON pack.

Product, design, trust, and roadmap context is available in `docs/` and `ROADMAP.md`.

Submission copy, the demo narration plan, and the final owner checklist are maintained in [`docs/SUBMISSION.md`](docs/SUBMISSION.md). The file contains no credentials or private submission identifiers.

## License

NotZero is available under the [MIT License](LICENSE).
