# NotZero

NotZero connects academic knowledge and past projects with current professional practice. It shows what the available evidence supports, how that foundation transfers, and the smallest useful next step.

> You are not starting from zero.

## Current status

Phase 1 is complete. The runnable application includes:

- a public landing page with the approved product message;
- persistent navigation to Method, Privacy, and the prepared demo;
- a fictional 2022 software-graduate scenario that requires no account or upload;
- a functional Evidence, Target role, Review and analyze stepper;
- visible privacy guidance before the future upload path;
- a deterministic, evidence-grounded Knowledge Bridge preview;
- server-only environment validation and a safe health endpoint;
- shared Zod contracts for evidence classes and tool relationships; and
- route-level production tests.

The prepared preview is intentionally deterministic. Live GPT-5.6 analysis is not enabled in Phase 1. The interface says this directly so the current prototype does not overstate its implementation.

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

No OpenAI API key is needed for the Phase 1 prepared demo.

## Judge scenario

1. Open the landing page and select **Try the graduate demo**.
2. Review Alex Rivera's fictional academic and project evidence.
3. Continue to the single supported junior backend role.
4. Review the evidence boundary and open the prepared result.
5. Inspect the bridge from runtime configuration to containerization, including its exact fictional artifact locator and bounded learning task.

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
lib/config/          Server-only environment validation
lib/domain/          Runtime-validated evidence and relationship contracts
lib/fixtures/        Parsed deterministic scenario data
fixtures/alex/       Fictional source artifacts used by the prepared scenario
tests/               Production-rendered route tests
worker/              Cloudflare-compatible application entry point
```

The shared domain contracts use the evidence classes defined in the trust standard: expected exposure, demonstrated, self-reported, inferred, and unknown. Relationship values are restricted to the approved directional taxonomy. Later model output must pass these server-side contracts before it can be shown.

## GPT-5.6 integration plan

Phase 2 will add a typed server-side adapter for GPT-5.6. It will extract schema-constrained evidence claims, retain provenance, reject malformed output, and keep uploaded content isolated from system instructions. Live analysis will remain disabled unless both `NOTZERO_ENABLE_LIVE_ANALYSIS=true` and a server-side `OPENAI_API_KEY` are present.

This future integration is substantive product behavior. GPT-5.6 will interpret bounded academic and project evidence, while deterministic server logic validates source references, evidence classes, relationship labels, limits, and required uncertainty fields.

## Codex collaboration

Codex was used to read and reconcile the product brief, design direction, trust standard, roadmap, and hackathon requirements before implementation. It then scaffolded the application, separated the domain and server boundaries, built the Phase 1 experience, created deterministic fixtures and tests, and inspected the rendered flow at desktop and mobile widths.

The primary Codex task should be preserved for the required `/feedback` Session ID. Dated commits provide the repository record of work completed during the submission period.

## Key decisions

- The prepared demo works without authentication, uploads, or external services.
- Phase 1 does not simulate a live model call. It exposes a labeled deterministic result.
- The design uses a warm paper surface, editorial type, evergreen actions, amber bridge states, restrained geometry, and evidence metadata.
- Georgia and system fonts avoid an unnecessary font dependency during the hackathon.
- User uploads remain outside Phase 1 until server-enforced validation, limits, deletion, and retention behavior are ready.

## Privacy and data handling

The Phase 1 application does not accept or retain user documents. `.env` files, uploads, private data, caches, and generated analysis data are ignored by Git. The prepared scenario is fictional.

Do not add real academic records, employer-owned code, credentials, private fixtures, or judge credentials to the repository.

## Dependency and asset notes

The application uses the open-source dependencies recorded in `package-lock.json`. The interface uses system fonts. The social preview image was generated specifically for NotZero during this build and is stored at `public/og.png`.

Product, design, trust, and roadmap context is available in `docs/` and `ROADMAP.md`.
