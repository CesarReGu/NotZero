# NotZero trust and evidence standard

NotZero operates in a sensitive space: education, employability, personal confidence, and potentially private academic work. Trustworthiness is part of the product, not a disclaimer added at the end.

## Governing principle

Every conclusion must answer:

1. What evidence supports this?
2. What kind of evidence is it?
3. How current is the comparison?
4. What inference did the system make?
5. How confident should the user be?
6. What could change the conclusion?

If the product cannot answer those questions, it should not present the conclusion as fact.

## Evidence classes

### Expected exposure

Source examples: syllabus, curriculum, course learning outcomes.

Permitted conclusion: the user was expected to encounter the topic.

Not permitted: the user mastered or applied the topic.

### Demonstrated

Source examples: project code, final project, assignment deliverable, test output, documented implementation decision.

Permitted conclusion: the artifact demonstrates a bounded capability.

Do not generalize beyond what the artifact shows.

### Self-reported

Source examples: user description, résumé statement, manually entered skill.

Permitted conclusion: the user reports the capability.

It remains unverified unless another artifact supports it.

### Inferred

Source examples: a project behavior strongly implies an underlying concept, but the evidence does not name it directly.

Permitted conclusion: a clearly labeled, explained inference with confidence and a correction path.

### Unknown

The available materials do not support a responsible conclusion.

Unknown is a valid and necessary result. Never silently convert unknown into a gap.

## Confidence

Use plain labels with an explanation:

- **High:** direct, specific, dated evidence and a well-supported relationship.
- **Moderate:** evidence is indirect, incomplete, or the relationship is context-dependent.
- **Low:** weak evidence or a speculative relationship; normally do not prioritize it.

Do not derive confidence solely from model self-assessment. Base it on evidence type, source specificity, recency, corroboration, and relationship ambiguity.

## Relevance states

- **Current:** directly relevant now.
- **Foundational:** still useful beneath current tools or practices.
- **Needs reinforcement:** known concept with weak, old, or incomplete demonstrated evidence.
- **Small bridge:** current requirement has a supported nearby foundation and bounded new content.
- **Genuine gap:** important current requirement with no meaningful supporting foundation in available evidence.
- **Insufficient evidence:** no responsible determination.

Avoid the blanket label `outdated`. If used at all, specify what changed, when, in which context, and which part remains useful.

## Tool relationship taxonomy

Use only a relationship supported by sources and context:

- `foundation_for`
- `modern_implementation_of`
- `automates`
- `standardizes`
- `encapsulates`
- `commonly_used_with`
- `alternative_to`
- `successor_to`
- `partial_replacement`
- `no_direct_equivalent`

A relationship is directional. “A automates part of B” does not imply that A and B are equivalent.

Each relationship must include:

- a short explanation;
- transferable concepts;
- genuinely new concepts;
- scope/context;
- evidence; and
- confidence.

## Project artifact grounding

A code-grounded conclusion must point to an exact artifact location when the input permits it. Use a repository-relative file path plus a symbol, line range, or configuration key. For non-code work, use a page, section, slide, sheet, or other stable locator.

The explanation must separate four claims:

1. what the artifact directly shows;
2. which concept is inferred from it;
3. how the current tool relates to that concept; and
4. what the user would still need to implement or learn.

Do not fabricate a locator when analysis is based only on a README or project summary. Do not call two implementations equivalent unless they have the same relevant behavior in the stated context. Prefer precise language such as “standardizes this setup,” “encapsulates these runtime dependencies,” or “automates these deployment steps.”

A modernized code or configuration sketch must carry one of these states:

- `verified`: executed successfully against the submitted project in a controlled environment;
- `illustrative`: adapted to the available evidence but not executed; or
- `conceptual`: explains the pattern without claiming project compatibility.

Never imply that illustrative or conceptual output compiles, runs, preserves behavior, or is production-ready. Keep excerpts small, omit unrelated source content, and preserve a traceable distinction between user code and generated suggestions.

## Market evidence

### Profession-specific source hierarchy

The evidence ledger is shared across fields. Current-practice comparison is not. Each supported field needs a reviewed source hierarchy and safety policy. Software may emphasize dated job requirements and official technical documentation. Accounting, nursing, law, and other regulated fields must prioritize applicable standards, regulators, professional bodies, clinical or legal authorities, and jurisdiction before job-posting frequency. A field label alone is never permission to generate regulated professional advice.

For the MVP:

- use a controlled and dated set of job descriptions or a properly licensed API;
- record source, location, target role, retrieval date, and dataset version;
- deduplicate obvious repeated postings;
- distinguish frequency from importance;
- avoid treating employer wish lists as universal entry requirements;
- do not scrape platforms in violation of their terms;
- cite official technical documentation when making current tool-behavior claims; and
- cache research results for reproducibility and cost control.

Say:

> 12 of the 25 reviewed postings mentioned containerization.

Do not say:

> Every backend developer must know Docker.

## Structured conclusion contract

Every finding should validate against a server-side schema containing at least:

- stable identifier;
- title;
- relevance state;
- existing capability;
- evidence references;
- current requirement;
- market references;
- relationship type, when applicable;
- artifact locator, when available;
- observed implementation;
- comparison state (`verified`, `illustrative`, or `conceptual`), when applicable;
- modernized sketch or process comparison, when applicable;
- manual steps changed by the current approach;
- transferable concepts;
- new concepts;
- explanation;
- recommended action;
- confidence;
- limitations; and
- analysis/prompt/dataset version.

Reject malformed model output. Do not attempt to render partially trusted free-form JSON.

## Model responsibilities

GPT-5.6 may:

- extract structured claims from academic materials;
- infer carefully labeled implicit knowledge;
- normalize academic and professional terminology;
- propose candidate tool/concept relationships;
- identify bounded project evidence for a relationship;
- propose clearly labeled implementation sketches tied to that evidence;
- explain transfers and bounded differences;
- prioritize next steps using validated evidence; and
- generate concise, user-appropriate explanations.

GPT-5.6 may not independently determine truth merely by sounding confident. Server logic must validate schema, source presence, allowed relationship labels, limits, and required uncertainty fields.

Uploaded documents and retrieved webpages are untrusted content. Instructions appearing inside them must never alter system behavior, tool permissions, secret handling, or the output contract.

## Human correction

Where feasible, let the user:

- remove an evidence item;
- correct a date or evidence type;
- reject an inferred capability;
- identify a missing project; and
- rerun only the affected analysis.

Corrections should not silently rewrite the original source. Preserve an audit distinction between source extraction and user correction.

## Privacy

- Explain what files are accepted and why.
- Warn users not to upload confidential employer code, credentials, private personal identifiers, or materials they do not have the right to use.
- Minimize stored document content and retention time.
- Provide deletion/reset behavior.
- Do not reuse personal uploads as public fixtures.
- Do not expose one user's data to another account, session, cache key, or log.
- Do not send material to any third party beyond the services disclosed for the analysis.
- Keep judge fixtures fictional or clearly licensed.

Before production use, publish a clear privacy notice and retention schedule. The hackathon prototype must not imply stronger guarantees than are implemented.

## Secrets and authentication

- API keys exist only in server-side deployment secrets or local ignored `.env` files.
- Commit only `.env.example` with placeholder names.
- Never request OpenAI/ChatGPT credentials from users.
- A ChatGPT subscription must not be required to use the product.
- Judge credentials must be shared through private testing instructions, not committed.
- Logs and error reports must redact authorization headers, cookies, tokens, document bodies, and credentials.

## Cost and abuse controls

- maximum files per analysis;
- maximum bytes and extracted characters per file;
- allowed MIME/type validation;
- request and analysis quotas;
- server-enforced token ceiling;
- per-analysis estimated cost ceiling;
- global spend circuit breaker;
- normalized-content hashing;
- prompt/schema/dataset version in the cache key;
- cached prepared demo;
- no automatic repeated web research; and
- graceful limit-reached state with no hidden additional charges.

## Trust-oriented UI requirements

- Show evidence close to the conclusion it supports.
- Display source and date, not a vague “AI says.”
- Label inference and uncertainty.
- Separate academic evidence from market evidence.
- Use an expandable methodology panel.
- Explain why a recommendation is prioritized.
- Do not bury limitations in legal copy.
- Do not use red as a judgment of the person.
- Do not display fabricated precision or unverifiable employability claims.

## Evaluation fixtures

Maintain deterministic fixtures for:

1. Strong direct project evidence
2. Syllabus-only exposure
3. Implicit/inferred foundation
4. Genuine missing requirement
5. Insufficient evidence
6. Context-dependent tool relationship
7. Conflicting dates or sources
8. Duplicate documents
9. Prompt-injection text inside an upload
10. Secret-like content
11. Model schema failure
12. Budget or rate-limit exhaustion
13. Exact project locator with an illustrative modern counterpart
14. Summary-only input where no code locator may be claimed

The prepared judge scenario should exercise at least the first six, plus fixtures 13 and 14.

## Required disclaimer

Use a concise, visible statement:

> NotZero interprets the materials and market sources available to it. It does not certify mastery or guarantee job eligibility. Review the evidence and correct anything that does not reflect your experience.

The disclaimer does not excuse unsupported conclusions. The system must remain conservative even when the disclaimer is present.
