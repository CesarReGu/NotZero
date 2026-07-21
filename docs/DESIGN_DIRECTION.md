# NotZero design direction

**Research date:** July 17, 2026  
**Research method:** Direct inspection of public competitor pages, including layout structure, computed colors, typography, buttons, navigation, section rhythm, and interaction patterns. This is pattern research, not a license to copy protected assets or branding.

## Desired impression

NotZero should feel like a thoughtful career adviser working over an annotated academic record: calm, precise, encouraging, and willing to show its reasoning.

It should not look like a generic AI startup. AI is the analysis engine, not the visual theme.

Desired attributes:

- credible;
- warm but not childish;
- editorial rather than promotional;
- structured but not bureaucratic;
- familiar to education and career users;
- transparent about evidence and uncertainty; and
- quietly optimistic.

## Competitor pattern findings

### SkillSync

[SkillSync](https://skillsync.lk/) is the closest conceptual competitor.

Observed public-page patterns:

- full-viewport dark hero and dark translucent navigation;
- 72px bold system-sans headline;
- blue primary palette with purple/pink accents;
- alternating dark, white, and warm-gray full-width sections;
- three-column problem framing and “Sync / Analyze / Grow” workflow;
- horizontally dense feature presentation;
- pricing and testimonial sections; and
- explicit Docker/job-gap messaging.

Useful lessons:

- a three-step workflow makes a complex analysis understandable;
- explicit student pain creates immediate relevance; and
- showing a product-like processing state is more persuasive than abstract AI claims.

Do not adopt:

- the dark blue/purple/pink AI-startup palette;
- a giant generic “bridge your skills” headline;
- broad recruiter/university/platform scope; or
- a feature wall that makes the product feel interchangeable.

### Lyra

[Lyra](https://www.justlyra.com/) provides the strongest emotional and editorial reference.

Observed patterns:

- warm paper background around `#F4F1EB` and near-black text around `#1A1A1A`;
- Instrument Serif display typography paired with Inter body text;
- terracotta, lavender, muted blue, and ochre supporting accents;
- large, low-weight serif headlines rather than generic heavy sans;
- restrained outlined and solid pill actions;
- visible reasoning, evidence receipts, transparent scores, and correctable conclusions;
- product cards embedded inside the story; and
- a human narrative before a feature inventory.

Useful lessons:

- warmth makes career anxiety easier to address;
- editorial typography differentiates the product from dashboard templates;
- explainability can be a primary interface feature; and
- the user should be able to see and correct what the system inferred.

Do not copy Lyra's typefaces, exact palette, card shapes, copy, or swipe mechanic.

### Lightcast

[Lightcast](https://lightcast.io/resources/blog/skillabi-press-release-june-3-2025) communicates labor-market authority.

Observed patterns:

- white background, black text, gray navigation, and a single saturated coral/pink action;
- custom grotesk body typography with monospaced metadata labels;
- square or minimally rounded actions;
- restrained shadows;
- conventional article/report hierarchy; and
- prominence of methodology, data scale, and institutional proof.

Useful lessons:

- market conclusions feel credible when methodology and sources are easy to find;
- monospaced metadata can distinguish evidence details from narrative copy; and
- not every action needs a rounded capsule.

### Coursera

[Coursera's Campus Skills Report](https://www.coursera.org/skills-reports/campus) is a familiar education reference.

Observed patterns:

- white and pale blue surfaces;
- strong blue primary action around `#0056D2`;
- Source Sans Pro across the experience;
- conventional 64px/48px heading hierarchy;
- 8px button corners;
- broad, predictable navigation; and
- clear report/methodology sections.

Useful lessons:

- educational credibility benefits from simple hierarchy and conservative controls;
- users recognize report and methodology patterns; and
- accessibility and legibility matter more than novelty in analysis views.

Do not make NotZero look like an LMS or institutional sales page.

### Teal

[Teal](https://www.tealhq.com/) demonstrates task-focused career tooling.

Observed patterns:

- white background, dark gray text, and a distinctive yellow primary action;
- Roobert sans typography;
- simple navigation centered on concrete tools;
- large 64px headline and 40px section headings;
- rounded primary buttons paired with outlined secondary controls; and
- strong claims supported by direct product demonstrations.

Useful lessons:

- career software benefits from plain, action-oriented language;
- one recognizable accent can carry the brand; and
- product tasks should be more prominent than AI mechanics.

### Handshake

[Handshake](https://joinhandshake.com/) uses a high-energy career-network aesthetic.

Observed patterns:

- near-black/dark-green hero with bright lime accent;
- 86px custom display headline;
- compact 14px navigation controls with 8px corners;
- clear audience segmentation; and
- familiar log-in/sign-up hierarchy.

Useful lessons:

- bold contrast can make the first action obvious; and
- career audiences understand conventional navigation and account actions.

Do not use its lime-on-dark identity or high-energy recruiting tone for an anxiety-sensitive analysis product.

## NotZero visual concept

### Metaphor

Use the visual language of an annotated academic record and a bridge map:

- paper-like main surface;
- marginal notes and evidence references;
- thin connecting rules;
- relationship labels;
- source/date metadata;
- highlighted but not fluorescent annotations; and
- progressive movement from “what you did” to “what it means now.”

Avoid literal bridge illustrations. The bridge should exist in the information architecture.

### Color tokens

Proposed starting palette:

| Token | Value | Use |
|---|---:|---|
| Surface | `#F6F7FB` | Main background |
| Surface raised | `#FFFFFF` | Cards and dialogs |
| Ink | `#11162A` | Primary text and high-contrast bands |
| Muted ink | `#5B6278` | Secondary text |
| Rule | `#D9DDEA` | Borders and connectors |
| Cobalt | `#3347E8` | Primary actions and translation layer |
| Cobalt dark | `#1727B4` | Hover and pressed primary state |
| Bridge coral | `#EF654E` | Transfer and bridge labels |
| Bridge soft | `#FFF0ED` | Bridge callouts |
| Unknown slate | `#697085` | Insufficient-evidence state |
| Focus | `#147FC4` | Keyboard focus ring |

Verify all text/background combinations against WCAG contrast before freezing the palette. Never rely on color alone; pair state colors with labels and icons.

### Typography

Recommended open-source direction:

- **Display and interface:** Inter or a clear system sans stack with a wide weight range.
- **Body:** Inter or the system sans stack.
- **Evidence metadata/code:** IBM Plex Mono.

Self-host only properly licensed font files and record their licenses. If font setup threatens the deadline, use the system sans stack rather than introducing an unverified dependency.

Type scale at desktop:

- Hero: 64–72px, serif, medium/regular weight
- Page title: 40–48px
- Section title: 28–32px
- Card title: 18–20px
- Body: 16–18px
- Metadata: 12–13px monospaced or compact sans

Reduce responsibly at mobile widths; do not preserve oversized marketing typography at the expense of comprehension.

### Shape and depth

- Use 6–10px radii for most controls and cards.
- Reserve full pills for compact status filters, not every button.
- Use 1px rules and surface contrast before shadows.
- Allow at most one subtle shadow level for elevated overlays or the principal report card.
- Avoid nested cards inside cards whenever a section and divider will work.

## Information architecture

### Public landing page

Navigation:

- NotZero
- How it works
- Method
- Privacy
- Try the demo

Hero:

- eyebrow: `For students, recent graduates, and people returning to their field`
- headline: `Your field moved forward. Your education still carries.`
- supporting line: `NotZero reads what you studied and built, connects it to current practice in your field, and shows the smallest useful next step.`
- primary action: `See Alex's knowledge bridge`
- secondary action: `See how conclusions are made`
- visible product fragment: one real evidence transformation with software selected by default and short law and accounting examples that demonstrate multidisciplinary scope without claiming those field packs are complete.

Narrative sequence:

1. The intimidating job-post moment
2. Foundations versus tools
3. The three-step process
4. One complete bridge example
5. Evidence and privacy method
6. Final demo action

Do not add pricing, testimonials, recruiter messaging, or invented institution logos to the hackathon landing page.

### Intake flow

Use a three-step horizontal stepper on desktop and a compact progress header on mobile:

1. Evidence
2. Target context
3. Review

The first choice should be visible immediately:

- `Try a prepared graduate profile` (recommended and fastest)
- `Use my own documents`

The custom path should use one combined file picker. Show supported types, limits, privacy behavior, and removable file rows. Explain that NotZero classifies files provisionally during validation, so people do not have to organize their materials before uploading. Missing context should be accepted and explained rather than treated as failure.

For custom evidence, capture field, target role or practice, location, and jurisdiction where relevant. Do not force every profession into software-role terminology.

### Analysis progress

Show real pipeline stages:

- Reading evidence
- Building knowledge ledger
- Comparing current requirements
- Constructing bridges
- Checking sources and uncertainty

Do not use fake percentages. If no reliable progress measure exists, mark completed/current/pending stages.

### Report layout

Desktop:

- compact report header with a human conclusion;
- evidence summary strip with counts;
- left-side or top filters for Current, Transferable, Bridge, Gap, and Unknown;
- main linear list of findings;
- expandable evidence/source panel; and
- sticky or clearly repeated “Your next three moves” section.

Mobile:

- single-column narrative;
- summary, next moves, then detailed findings;
- evidence expands inline; and
- no horizontal comparison table that requires precision scrolling.

Recommended summary language:

> You already have the foundations for several tools in this role. We found 9 supported strengths, 4 practical bridges, 2 genuine gaps, and 3 areas where more evidence would help.

Do not present an unexplained “72% job ready” score.

### Knowledge Bridge component

Collapsed state:

- current requirement;
- relationship label;
- existing foundation;
- one-sentence explanation;
- confidence; and
- `See the evidence` action.

Expanded state:

- evidence excerpt/source and date;
- artifact path and symbol, line, or section when available;
- market source and retrieval date;
- observed implementation or process;
- modern counterpart labeled verified, illustrative, or conceptual;
- manual steps removed, standardized, or encapsulated;
- what transfers;
- what is new;
- why teams use it;
- upgrade challenge; and
- uncertainty/limitations.

For a project-grounded bridge, add a `See it in your project` view. At desktop width, the observed excerpt and modern counterpart may sit side by side. Stack them in reading order on mobile. Keep the cited source visible, use syntax highlighting sparingly, and distinguish user material from generated suggestions through labels and surface color.

Use a diff only when the product is showing a real proposed change to the same artifact. A conceptual comparison should use separate panels instead. Never imply that an illustrative snippet was executed.

## Interaction principles

- One primary action per view.
- Keep browser back behavior and URL state sensible where practical.
- Never hide an important limitation behind a tooltip alone.
- Allow users to correct or remove an inferred claim.
- Confirm destructive deletion, but make it easy to complete.
- Use skeletons only when they match the eventual layout; prefer pipeline status for long analysis.
- Motion should clarify state change, remain short, and respect reduced-motion preferences.
- Error messages must explain what was retained, what failed, and what the user can do next.

## Copy principles

Voice:

- direct;
- calm;
- specific;
- respectful;
- non-clinical; and
- never patronizing.

Prefer:

- “We found evidence that…”
- “This foundation transfers to…”
- “What is actually new…”
- “A small next step…”
- “We cannot determine this from the available material.”

Avoid:

- “You lack…”
- “Your education is obsolete.”
- “AI discovered your true potential.”
- generic promises about transformation or future potential;
- inflated career claims; and
- repeated references to the product being powered by AI.

## Anti-generic-AI checklist

- No purple-blue gradient hero.
- No glowing orb, robot, brain, network globe, or sparkle logo.
- No glass panels over a dark gradient.
- No wall of identical rounded feature cards.
- No arbitrary readiness gauge.
- No chatbot occupying the primary screen.
- Do not repeat AI labels across the page.
- No fabricated metrics, employer logos, testimonials, or social proof.
- No default icon library used decoratively on every heading.
- No copy that could describe any AI career product.

## Accessibility and quality bar

- Semantic headings and landmarks
- Keyboard-operable controls
- Visible `:focus-visible` state
- Sufficient contrast
- 44px minimum touch targets where practical
- Labels and descriptions for file inputs
- Status announcements for long-running analysis
- Reduced-motion support
- Errors associated with their fields
- No information conveyed only by color
- Test at approximately 360px, 768px, 1280px, and a large desktop width
