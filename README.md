# NotZero

NotZero connects academic knowledge and past projects with current professional practice. It shows what the available evidence supports, how that foundation transfers, and the smallest useful next step.

> You are not starting from zero.

## Current status

Phase 3 is complete for the deterministic software judge path. The runnable application includes:

- a public landing page with the approved product message;
- persistent navigation to Method, Privacy, and the prepared demo;
- a fictional 2022 software-graduate scenario that requires no account or upload;
- a functional Evidence, Target context, Review and analyze stepper;
- visible privacy guidance before upload;
- a deterministic, provenance-aware evidence ledger and complete Knowledge Bridge Graph;
- a multidisciplinary field context containing field, target, location, and optional jurisdiction;
- a custom evidence path for one curriculum, up to three supporting documents, and one bounded project or professional task;
- server-side PDF and text extraction, normalized hashing, duplicate detection, source allowlists, limits, and secret checks;
- a typed GPT-5.6 Responses API adapter using strict structured output;
- validation that rejects malformed model output, unknown sources, and excerpts that cannot be resolved in the submitted material;
- a dated current-practice pack built from eight manually reviewed employer postings for Mexico and remote Latin America;
- normalized market requirements with exact mention counts, source links, observation dates, and usage records;
- five result groups: current, transferable, small bridge, genuine gap, and insufficient evidence;
- relationship evidence from the market pack and official Docker, GitHub, and OpenTelemetry documentation;
- exactly three prioritized next steps and one existing-project upgrade challenge;
- a project-grounded walkthrough with an exact artifact locator and an explicitly illustrative Dockerfile;
- visible verified, illustrative, and conceptual comparison states;
- server-only environment validation and a safe health endpoint;
- shared Zod contracts for field context, evidence sources, claims, provenance, evidence classes, and tool relationships; and
- route-level production tests.

The prepared software scenario remains deterministic for reliable judging. Custom files are validated and extracted in the hosted app. Live GPT-5.6 claims remain disabled until the deployment has both a server-side API key and `NOTZERO_ENABLE_LIVE_ANALYSIS=true`. When disabled, the interface returns a source receipt and makes no capability claims.

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

No OpenAI API key is needed for the prepared judge demo. A server-side key is required only for live claims from user-supplied evidence.

## Judge scenario

1. Open the landing page and select **Try the graduate demo**.
2. Review Alex Rivera's fictional academic and project evidence.
3. Continue to the single supported junior backend role.
4. Build the prepared evidence ledger and expand a claim to inspect its exact source receipt and limitation.
5. Inspect all five result groups, the bridge from runtime configuration to containerization, and the exact fictional artifact locator.
6. Review the three next steps, the existing-project challenge, and the expandable market methodology.

The secondary path accepts bounded evidence from other fields. It records field, target, location, and jurisdiction before analysis. This does not imply that the current release contains validated market-comparison packs for law, nursing, accounting, or other regulated professions.

The checked-in fixture lives in `fixtures/alex/`. It contains no real credentials or personal data.

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

The route tests render the production worker and verify the landing, demo, Method, Privacy, and health routes.

## Architecture

```text
app/                 Routes, metadata, and the server-only health endpoint
components/          Reusable product interface and the interactive demo
data/market/          Versioned current-practice dataset and source-use record
lib/config/          Server-only environment validation
lib/domain/          Runtime-validated evidence and relationship contracts
lib/evidence/        File validation, extraction, hashing, limits, and GPT-5.6 adapter
lib/bridge/          Deterministic comparison and report validation
lib/market/          Current-practice pack validation and lookup helpers
lib/fixtures/        Parsed deterministic scenario data
fixtures/alex/       Fictional source artifacts used by the prepared scenario
tests/               Production-rendered route tests
worker/              Cloudflare-compatible application entry point
```

The shared domain contracts use the evidence classes defined in the trust standard: expected exposure, demonstrated, self-reported, inferred, and unknown. Relationship values are restricted to the approved directional taxonomy. The Phase 3 report validates every claim, requirement, relationship source, comparison state, next-step rank, and project reference before display.

## GPT-5.6 integration

Phase 2 includes a typed server-side Responses API adapter for `gpt-5.6`. It requests strict JSON Schema output, then independently validates the result with Zod. The server also verifies that every cited source exists and that every quoted excerpt resolves inside the normalized submitted text. Uploaded text is marked as untrusted data in the model instructions and cannot change the extraction contract.

GPT-5.6 performs the substantive interpretation of bounded academic, project, or prior-task evidence. Its validated claims become the input to the relationship and market-comparison layer. Deterministic server logic owns file limits, source types, hashes, secret checks, allowed evidence classes, market-pack versions, schema validation, provenance verification, and the prepared judge result. The implementation follows OpenAI's [Structured Outputs guidance](https://developers.openai.com/api/docs/guides/structured-outputs) and uses the Responses API.

## Codex collaboration

Codex was used to read and reconcile the product brief, design direction, trust standard, roadmap, and hackathon requirements before implementation. It then scaffolded the application, separated the domain and server boundaries, built the Phase 1 experience, created deterministic fixtures and tests, and inspected the rendered flow at desktop and mobile widths.

The primary Codex task should be preserved for the required `/feedback` Session ID. Dated commits provide the repository record of work completed during the submission period.

## Key decisions

- The prepared demo works without authentication, uploads, or external services.
- The judge fixture does not simulate a live model call. It exposes a labeled deterministic result.
- Custom evidence can come from any field. The complete current-practice comparison is deliberately limited to the reviewed software pack until later profession-specific packs are available.
- The marketing site uses a cool white surface, high-contrast sans typography, cobalt actions, coral bridge states, and structured evidence graphics. The direction is meant to read as an education-to-career product rather than an organic retail brand.
- The hero includes a replayable evidence transformation that maps a fictional 2022 final project into demonstrated knowledge, a small modernization bridge, and an explicit unknown. It uses CSS motion, lightweight React controls, and a static reduced-motion state.
- System sans and monospaced stacks avoid an unnecessary font dependency during the hackathon.
- User uploads are processed in memory for the current request. No document storage or longitudinal profile is implemented.

## Privacy and data handling

The application accepts a bounded evidence set and does not write uploaded bytes or extracted text to application storage. `.env` files, uploads, private data, caches, and generated analysis data are ignored by Git. The prepared scenario is fictional.

Do not add real academic records, employer-owned code, credentials, private fixtures, or judge credentials to the repository.

## Dependency and asset notes

The application uses the open-source dependencies recorded in `package-lock.json`. `unpdf` provides MIT-licensed, serverless-compatible PDF text extraction. `tsx` is an MIT-licensed development dependency used for typed adapter and report tests. The interface uses system fonts. The social preview image was generated specifically for NotZero during this build and is stored at `public/og.png`.

The market pack stores factual requirement labels and links from publicly accessible employer postings. It does not redistribute job descriptions. Official technical documentation is summarized and linked. Source and use details are recorded in `data/market/README.md` and the versioned JSON pack.

Product, design, trust, and roadmap context is available in `docs/` and `ROADMAP.md`.

## License

NotZero is available under the [MIT License](LICENSE).
