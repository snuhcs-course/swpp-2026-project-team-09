# Repository instructions

## Agent skills

### Issue tracker

Issues and specs are tracked locally as Markdown files under `.scratch/<feature>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default triage roles as `Status:` values in local issue files. See `docs/agents/triage-labels.md`.

### Domain docs

Use a single-context layout: root `CONTEXT.md` and `docs/adr/`. See `docs/agents/domain.md`.

## Collaboration

Keep `AGENTS.md` and `CLAUDE.md` synchronized. Whenever repository instructions change, update both files together with the same content.

For implementation, use separate Git worktrees for parallel agents. The user requested GPT-6 Astra with medium reasoning for implementation subagents; the coordinating agent reviews alignment and integration before squash-merging each approved implementation branch into `0.0/Main`. Do not push without a user request. Prioritize delivery speed within the agreed scope over speculative infrastructure.

Completion objective (2026-09-27): deliver the full agreed MVP across event participation, friend meetups, and campus convenience. A runnable APK, admin login, or one implementation iteration is a milestone, not completion. Track remaining implementation, external dependencies, user decisions and end-to-end acceptance in `.scratch/mvp-completion/spec.md`. Anticipate account/configuration requirements together and keep independent implementation moving while credentials are prepared. Proposed features or providers in that document are not approved merely by being listed.

Execution status must be literal: unfinished MVP work is not the same as actively running development. Report whether the coordinating turn or delegated agents are actually working, and never imply that work continues after a final response unless a real authorized background workflow remains active.

Discuss broad project decisions with the user before implementing them. This includes repository/folder structure, application and service boundaries, major technology choices, and substantial scope changes. Present a concrete proposal and its tradeoffs, record the user's decision, then implement within that agreed boundary. A recommendation or silence is not agreement. Routine implementation details within an agreed design do not require repeated approval.

## Agreed project boundaries

Place `main-server/`, `socket-server/`, `worker-server/`, and `admin-frontend/` at the repository root, with separate application manifests. Group NestJS features under `src/modules/`. The admin frontend uses Next.js. Admin business APIs belong to the main-server codebase and data owner; run the same main-server image as separately configured public and admin runtime pools. Kubernetes is optional: the user's mention of pods expresses runtime separation, not a platform requirement. Do not create a separate admin-backend or schedule-server project without a new user decision. Use Docker Compose for local orchestration with the user-approved root filename `docker-compose.yml` and default Compose file discovery; do not add a root convenience package.json or silently reintroduce a root workspace. Remaining architectural choices are tracked in `.scratch/architecture-planning/` and require discussion where unresolved.

Use Redis where it reduces concrete workload; the user wants load reduction to be a measurable technical contribution. Preserve durable consent and final membership invariants in the owning database. Redis topology, search capabilities, queue technology, and AI model choices still need concrete design; do not claim unmeasured performance improvements.

Implementation start (2026-09-27): the user requested development after the proposed starting defaults. Use React Native with an Expo development build in `mobile/`, PostgreSQL with PostGIS, BullMQ with separate cache and queue Redis containers, and local Docker Compose. Include the requested independent `match-server/` at the root. Each application has its own package.json and lockfile. Main owns users, events, relationships, parties and quests; match owns matching requests; worker owns source collection; other services must not write main tables directly. Keep original application branding out of the prototype. Never substitute fake external data for a real integration. Missing credentials must produce a clear configuration-required state. See `docs/prototype-api.md` for the initial shared API contract.

Development authentication (2026-09-27): the user explicitly permits bypassing login when it blocks development. Use an explicitly enabled, isolated development test identity/session; keep it disabled in ordinary/release configuration and never grant a test identity administrator access or impersonate a real user. This is not evidence of successful Google authentication, which remains a separate MVP acceptance check. Do not repeatedly stop independent development to request login.

ORM decision (2026-09-27): the user selected Prisma. Use service-owned Prisma schemas and migrations in main-server and match-server; retain existing PostgreSQL/PostGIS and data ownership. Preserve existing data during adoption, with verified baselining where required; do not reset databases. Prefer Prisma model queries for ordinary CRUD and parameterized Prisma raw SQL where spatial operations, locking or invariants need SQL. Do not introduce Prisma into Redis-only services without a database need.

Map provider decision (2026-09-27): the user delegated the choice based on current Korea coverage and implementation fit, with a personal preference for Naver. Use Naver's native Maps SDK through `@mj-studio/react-native-naver-map` for the mobile app. Configure `NAVER_MAP_CLIENT_ID`; no Naver Client Secret belongs in the app. Keep Google Sign-In independent of the map provider. Do not treat map rendering as evidence that walking routes or all consumer Naver Maps features are available through the SDK.

External provider decisions (2026-09-27): the user selected Firebase Cloud Messaging for push, asked to prioritize NAVER APIs alongside the existing NAVER map, and wants a free model for initial AI image extraction. Do not treat OpenAI paid image inference or Kakao adoption as approved. Budget is undecided and no existing server is available. The user approved initial implementation/evaluation with native local Ollama and qwen3-vl:2b-instruct-q4_K_M, returning editable extraction drafts. The user asked to consider moving the whole map to Kakao if NAVER lacks walking support; neither full migration nor the separate walking provider is decided yet; selecting a provider does not mean its credentials or delivery have been verified. Record current preparation and evidence in `.scratch/provider-selection/` and `.scratch/mvp-completion/`.
