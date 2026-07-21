# NotZero submission draft

This is prepared copy, not a submission record. Replace every bracketed field and verify the final deployed behavior before pasting it into Devpost.

## Project name

NotZero

## Tagline

Your education is not outdated. NotZero shows how it connects to the work employers ask for now.

## Track

Education

Track fit: NotZero helps students and recent graduates interpret what their education already prepared them to do, then identifies the smallest evidence-backed bridge into current professional practice.

## Short description

NotZero connects dated academic work and past projects with reviewed current-practice requirements. It shows what remains current, what transfers, what needs a small bridge, what appears genuinely missing, and what cannot be concluded from the available evidence. The result ends with three prioritized next steps and one project-grounded proof challenge.

## Inspiration

Many professionals say that most of the tools they use were learned on the job. For students, that can make years of university feel disconnected from employment. A junior job listing compounds the problem by naming tools that were never mentioned in class.

The missing piece is often the relationship. A student may already understand configuration, dependency management, testing, data modeling, or deployment steps, while the job post names tools that standardize or automate those foundations. NotZero makes that relationship visible without treating education as useless or claiming that exposure proves mastery.

## What it does

The submitted vertical slice supports a recent software graduate targeting a junior backend, full-stack, or DevOps-adjacent role. The user provides dated curriculum evidence, supporting academic material, one bounded project or professional task, and a location. The field and closest target role are inferred from the evidence.

NotZero produces:

- a decision-first conclusion;
- supported foundations, transferable knowledge, small bridges, genuine gaps, and unknowns;
- exact citations into the user's evidence and dated market sources;
- a then-and-now project walkthrough when a stable locator supports one;
- three prioritized next moves that name reused knowledge, new learning, purpose, and proof; and
- one concrete challenge that upgrades work the user already completed.

The evidence mechanism is multidisciplinary, but each profession needs its own reviewed sources and safety rules. The current submission makes a complete claim only for the software scenario.

## How it was built

NotZero uses TypeScript, React, a Next-compatible App Router through Vinext, Vite, Cloudflare Workers, D1-backed operational controls, Zod runtime schemas, and the OpenAI Responses API.

GPT-5.6 is integrated in three typed, server-side stages. The first extracts evidence claims with exact source references. The second compares the validated ledger with a conservatively selected, versioned current-practice pack. The third writes the guided program: the vocabulary translation, code counterparts whose observed side is quoted server-side from verified references, and the phased curriculum. Strict JSON Schema output is validated again by deterministic application code. Unknown claim IDs, invented excerpts or locators, unsupported relationship references, unlisted learning resources, and misstated market dates or counts are rejected or repaired before display, with any repair recorded in the report limitations.

The prepared Alex scenario is deterministic and fictional so judges can complete the full experience without an account, private data, or model availability. The custom live path is bounded by file, token, request, cache, and spending limits and asks the visitor to provide an OpenAI API key before the build action is enabled.

## How Codex was used

Codex was the primary development collaborator throughout the build. It helped translate the product brief into domain contracts, implement and test both GPT-5.6 stages, design the evidence and relationship model, build the decision-first report, refine the landing animation, enforce privacy and operational limits, audit dependencies and repository contents, and publish dated working revisions.

The collaboration was not limited to code generation. Codex repeatedly reviewed the roadmap against the product north star, tested failure modes, challenged unsupported claims, and turned owner feedback into versioned implementation batches.

From the beginning, ChatGPT helped find reliable study-method research, shape the roadmap, and implement the product's core pillars. It also helped resolve blocking bugs during live testing, including unresolved evidence excerpts, unsupported source relationships, and oversized requests that stalled the analysis.

## Challenges

The hardest challenge was preventing a polished model response from becoming an untrustworthy assessment. NotZero separates model interpretation from server-owned facts. Evidence excerpts must resolve to normalized uploaded text. Project claims require stable locators. Market counts and dates must match a reviewed dataset exactly. Uncertainty remains visible, and missing evidence becomes an unknown instead of a fabricated conclusion.

The second challenge was information hierarchy. Early reports exposed all provenance at once. The final design leads with the decision, keeps evidence within two interactions, and preserves a complete appendix and downloadable report for users who want to inspect the method.

## Accomplishments

- A complete prepared judge path with no login, payment, API key, or private upload.
- Three schema-constrained GPT-5.6 stages behind typed server adapters, with a visitor-key path that keeps credentials out of the repository.
- Exact evidence, locator, date, and market-count validation.
- Evidence review before comparison and priority recomputation without re-uploading.
- Decision-first reports with citations, a project walkthrough, a PDF path, and a privacy-safe PNG summary card.
- Deterministic tests for successful, weak, summary-only, invented-citation, unsupported-market, schema-failure, transport-failure, cache, and rate-limit behavior.

## What we learned

Trust is part of the product behavior, not a disclaimer added afterward. The system became more useful when every recommendation was forced to answer four concrete questions: what does this reuse, what is actually new, why is it used, and what artifact will prove the bridge?

The project also showed why multidisciplinary expansion should happen through field-specific source packs and safety layers rather than one universal prompt. The evidence model can be shared. The authority, terminology, jurisdiction, and forbidden claims cannot.

## What's next

After validating the software vertical slice, the next expansion would add expert-reviewed packs and evaluation fixtures for fields such as accounting, law, nursing, and business. Product work would also study whether users complete the recommended bridge and whether their confidence becomes better calibrated over time.

## Links to insert

- Demo: https://notzero-graduate-bridge.cesaromar-reyesgut.chatgpt.site
- Repository: https://github.com/CesarReGu/NotZero
- Public YouTube video: [ADD URL]
- Primary Codex `/feedback` Session ID: [ADD SESSION ID]

The official requirements currently call for a working project, one track, a text description, a public YouTube demo no longer than three minutes with audio covering the product, Codex, and GPT-5.6, a repository URL, the required README material, and the primary Codex `/feedback` Session ID. Verify the [Official Rules](https://openai.devpost.com/rules) immediately before submission.
