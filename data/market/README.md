# Current-practice dataset

The Phase 3 judge pack is a small, controlled comparison set for junior backend and DevOps-adjacent work in Mexico and remote Latin America.

## Source and permission record

The dataset stores factual requirement labels, employer and role names, observation dates, and links to publicly accessible employer postings. It does not reproduce job descriptions. Every source record states the usage basis. Official Docker, GitHub, and OpenTelemetry documentation supports tool-behavior relationships.

NotZero's normalized dataset and software are distributed under the repository's MIT License. Employer names, role titles, linked pages, and product names remain the property of their respective owners. Links do not imply endorsement.

## Method

- Eight postings were manually reviewed on July 18, 2026.
- Sources were selected for Mexico or remote Latin America relevance.
- Explicit requirement mentions are counted. Implied requirements are not counted.
- Similar terms are normalized conservatively. Docker and Kubernetes, for example, remain distinct aliases within the broader containerization concept.
- The sample mixes experience levels and is not a statistical labor-market survey.

Refreshes must create a new dataset version, preserve the prior version used for submitted results, and revalidate every source and count.

## Generated references for uncovered fields

This directory holds only human-reviewed packs. When a custom analysis names a field no reviewed pack covers, NotZero synthesizes a current-practice reference for that field at request time with GPT-5.6 (`lib/market/practice-pack-adapter.ts`) and assembles it into the same pack shape, validated by the same rules. Generated packs are marked `generated: true`, are never written to this directory, and are labeled illustrative in the report: their sources are representative role archetypes linked to live job-board searches rather than individually reviewed postings, and no finding drawn against them may claim the verified comparison state. A reviewed pack for a field always takes precedence over generation.
