# NotZero product brief

## One-sentence definition

NotZero connects academic knowledge and past projects with current professional practice. It shows what already transfers and what the user should learn next.

## Central message

Primary message:

> You are not starting from zero.

Recommended pitch line:

> The job post looks unfamiliar. Your knowledge doesn't.

Supporting product line:

> NotZero connects what you studied and built with the tools employers use now. Then it shows the smallest useful next step.

Supporting explanation:

> Ask a working graduate where they learned the job. Often, the answer is: at work.

Use the job-post line in the hero. The observation about learning at work belongs in the narration, founder story, or demo opening.

## Problem narrative

A recent graduate opens a junior job listing and sees Docker, Jenkins, Kubernetes, CI/CD, observability, cloud platforms, and other unfamiliar terms. The list makes years of study feel irrelevant.

Often, the person is not missing every underlying concept. Their education may have taught the difficult, explicit version of a process: configuring environments manually, deploying step by step, managing dependencies directly, writing low-level implementations, or testing outside an automated pipeline. Employers name tools that package, automate, standardize, or scale those processes.

The graduate cannot see that relationship. A vocabulary gap becomes an identity crisis: “I know none of this; I must begin again.”

NotZero makes the transfer visible. It respects foundational education, identifies what is genuinely new, and produces a small, credible bridge instead of a demoralizing inventory of missing keywords.

## Primary user and job to be done

### Product audience

NotZero is designed for students, recent graduates, and people returning to a field whose earlier education or work can be compared with dated current practice. The shared mechanism is multidisciplinary: extract what the evidence supports, preserve its provenance, then compare it through a field-specific source and safety layer.

The hackathon MVP does not claim validated current-practice coverage for every profession. Its complete judge path remains software development. Law, accounting, nursing, business, and other fields require their own authoritative sources, jurisdiction rules, forbidden claims, and expert-reviewed evaluation fixtures before their comparisons can be presented as product results.

### Primary user

A recent computer-science, software-engineering, or related graduate applying for a junior backend, full-stack, or DevOps-adjacent role.

### Secondary user

A developer returning after time away whose underlying knowledge remains useful but whose tool vocabulary is dated.

### Job to be done

> When a job listing makes me feel unqualified, help me understand what I already know, what maps to current practice, and the smallest set of additions that would make me credibly ready.

## Product promise

NotZero does not promise a job, certification, mastery score, or perfect labor-market forecast. It promises a transparent interpretation of available evidence:

- what the evidence supports;
- how that knowledge relates to current requirements;
- what is actually new;
- what remains unknown; and
- what action would most efficiently reduce the gap.

## Core product object: the Knowledge Bridge

A Knowledge Bridge connects an existing capability to a current professional expectation.

Each bridge contains:

1. Existing concept or practice
2. Evidence source, date, and artifact location
3. Current tool/practice and dated market evidence
4. Relationship type
5. Transferable knowledge
6. Genuinely new knowledge
7. Why teams use the current approach
8. A comparison between the observed process and the current approach
9. A concrete proof task using the user's existing project
10. Confidence and limitations

Example:

> Your project shows that you configured dependencies, ports, and runtime settings manually. Containers standardize and automate part of that work. You already understand the underlying environment problem; what is new is image construction, container lifecycle, and reproducible packaging. Prove the bridge by adding a Dockerfile and running the same project from a clean machine.

### Project evidence walkthrough

The strongest Knowledge Bridge starts inside the user's own work. It points to a specific file, symbol, configuration block, document section, or implementation decision and explains:

1. what the artifact demonstrates;
2. which underlying concept transfers;
3. how a current tool handles the same concern;
4. which manual steps the tool removes, standardizes, or encapsulates;
5. what the user still needs to learn; and
6. how to prove the bridge by upgrading the existing project.

For example, NotZero might identify manual environment setup in a REST API project, show the relevant configuration, and provide a small Docker-based implementation sketch for that project. The explanation should name the steps containerization standardizes and the Docker concepts that remain new. It must not describe the two implementations as identical.

This walkthrough is an explanation and learning aid. A generated configuration or code sample must be labeled as illustrative until it has been run and verified. When source code is unavailable, the product may explain a conceptual bridge but cannot invent a file, line, or implementation detail.

## Result structure

### Still current

Knowledge and practices directly supported by evidence and still requested or foundational today.

### Transferable

Capabilities expressed differently in professional language or applied through a current tool.

### Small bridge

Existing foundations that need one bounded modern layer.

### Genuine gap

Important requirements for which the submitted evidence provides no meaningful foundation.

### Insufficient evidence

Areas where the product cannot responsibly reach a conclusion.

## MVP inputs

- one curriculum or study-plan document;
- up to three supporting course, assignment, or project documents;
- one bounded final-project artifact, professional-task description, selected source files, or repository-derived description;
- dates for each item;
- a field, target role or practice, location, and jurisdiction when relevant; and
- a controlled collection of recent job requirements.

The prepared judge scenario must be available without an upload, account, or live external-data dependency.

## MVP outputs

- a structured evidence ledger;
- result counts rather than a mysterious readiness score;
- the five result groups above;
- expandable evidence and market sources;
- at least one project-grounded evidence walkthrough when source material supports it;
- three prioritized next steps; and
- one project-upgrade challenge.

## Non-goals

The MVP is not:

- an applicant-tracking system;
- a résumé optimizer;
- a job marketplace;
- a recruiter screening tool;
- a course-selling engine;
- a university curriculum-management platform;
- a formal skill assessment;
- a replacement for an instructor or career adviser; or
- a guarantee that a user meets an employer's expectations.

It is also not a single generic model that applies software-market logic to every profession. Cross-field expansion happens through reviewed current-practice packs, not through renamed software keywords.

## Differentiation

The surrounding category is real and crowded:

- [SkillSync](https://skillsync.lk/) connects students, repositories, curriculum analytics, job matching, and industry demand.
- [Lightcast Skillabi](https://lightcast.io/resources/blog/skillabi-press-release-june-3-2025) maps learning content to labor-market demand for institutions.
- [Lyra](https://www.justlyra.com/) maps projects and experience to roles and explainable gaps.
- [Coursera Career Graph](https://www.coursera.org/business/career-graph) maps jobs, skills, and learning content for organizations.

NotZero must not compete on “AI skill-gap analysis.” Its differentiated mechanism is:

- evidence before claims;
- translation before deficiency;
- explicit concept-to-tool relationship types;
- taught versus demonstrated distinctions;
- a minimum learning delta;
- an existing-project proof task; and
- emotionally constructive language grounded in uncertainty.

## Demo scenario

Prepare a fictional 2022 software-engineering graduate named Alex who completed:

- programming fundamentals and data structures;
- databases and web development;
- operating-systems and networking coursework;
- manual deployment instructions;
- unit tests run locally; and
- a final REST API project with environment configuration and dependencies.

The prepared project fixture should contain a small, fictional source tree with manual setup instructions, explicit environment configuration, and local test commands. It must contain no real credentials or personal data.

Target role: junior backend engineer with DevOps-adjacent responsibilities.

The report should demonstrate:

- environment configuration → foundation for containerization;
- manual deployment → foundation for CI/CD;
- local unit testing → foundation for pipeline testing;
- operating-systems/network knowledge → transferable container/cloud foundations;
- Docker and pipeline syntax → small bridges;
- production observability → likely genuine gap; and
- insufficient evidence where the academic materials are silent.

At least one bridge should open the relevant project file, identify the observed setup, and show a labeled Docker-based counterpart. The walkthrough should explain what becomes reproducible, which manual steps disappear, and which container concepts Alex still needs to learn.

Do not assert that Jenkins, GitHub Actions, Docker, or Kubernetes are universal replacements for older methods. Explain their specific relationship in this scenario.

## Success signals

For the hackathon, success means:

- a user understands the central promise within 10 seconds;
- the prepared report contains at least three surprising but defensible bridges;
- at least one bridge is grounded in an exact project artifact and a clearly labeled modern counterpart;
- every conclusion exposes evidence or uncertainty;
- a judge can complete the flow without assistance;
- the result produces a bounded next action rather than an overwhelming curriculum; and
- GPT-5.6 is materially responsible for structured interpretation and bridge reasoning, not decorative copy.

## Future business direction

Start with an individual, free readiness/bridge report. Potential later paths include recurring personal monitoring and university career-center licensing. Do not add two-sided marketplace or institutional complexity to the hackathon build.
