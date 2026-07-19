# Product value evaluation

This evaluation asks whether NotZero produces a more useful and inspectable result than sending the same files with a general prompt. It uses deterministic fixtures so the checks remain repeatable without a live model or private upload.

## Evaluated scenarios

- **Alex Rivera:** the prepared judge scenario. It includes dated curriculum evidence, a README, a source-file locator, and a controlled junior-backend market pack.
- **Fictional custom upload:** the mocked successful custom scenario in `tests/fixtures/model-scenarios.ts`. It exercises the live two-stage contract with a different ledger ID and model-produced report.

## Results

| Value criterion | Alex | Fictional custom upload | Control that makes the result defensible |
|---|---|---|---|
| Grounded in the person's work | Pass. The walkthrough resolves to `alex-api/src/config.ts` and the `PORT` configuration key. | Pass. The accepted report resolves to `inventory-api/config.ts`; invented source IDs and locators are rejected in separate tests. | Evidence claims retain source IDs, stable locators, and exact excerpts. The comparison validator accepts only claim IDs present in the ledger. |
| Dated current-practice evidence | Pass. Requirements and counts resolve to the recorded software practice pack observed through July 18, 2026. | Pass. The custom comparison receives the same versioned pack through conservative scope matching. | Requirement IDs, source IDs, dates, and counts must resolve exactly to the selected pack. |
| Validated and inspectable provenance | Pass. Numbered citations open full receipts with evidence class, confidence basis, locator, excerpt, date, and limitation. | Pass. The model fixture cannot add a URL or citation outside the server-owned ledger and pack. | Strict model output schema followed by independent domain validation and a citation ledger built from validated data. |
| Smaller learning delta than a generic gap list | Pass. The first action reuses external configuration, ports, dependencies, and startup order before adding container lifecycle concepts. | Pass. Every next step must name what it reuses, what is new, and why the practice is used. | The next-step schema requires `reuses`, `newConcept`, `whyItIsUsed`, and `proof`; the UI presents these fields together. |
| Concrete proof task reusing an existing project | Pass. The challenge containerizes Alex's API and moves its existing health test into CI. | Pass. A walkthrough or a plain-language missing-evidence reason is mandatory. | The report requires one existing-project challenge and rejects a fabricated project walkthrough. |

## Boundary cases

Weak or summary-only evidence does not earn a fabricated code location. Unsupported fields receive a validated evidence ledger and a plain explanation that a reviewed market pack is unavailable. A schema failure, invented citation, missing market coverage, or model failure becomes a controlled error instead of an unvalidated report.

The evaluation establishes the product contract for the current software MVP. It does not claim measured learning outcomes, job readiness, or support for unreviewed professions.
