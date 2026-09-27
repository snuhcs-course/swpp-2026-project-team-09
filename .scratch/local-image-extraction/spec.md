# Local image extraction

Status: ready-for-agent
State: API/mobile integrated; real-model evaluation and Android document-import UI verified; OCR quality limitations remain
Updated: 2026-09-27

## Approved scope

User approved native local Ollama + qwen3-vl:2b-instruct-q4_K_M on the current M1/16GiB Mac. Timetable and poster extraction return editable drafts, never automatic domain writes. Existing Google, NAVER map and Prisma ownership remain. Full Kakao migration is a separate pending decision.

## First implementation

Authenticated POST /v1/me/image-extractions proxies to internal worker POST /v1/internal/image-extractions. Request: kind timetable/event, mimeType image/jpeg or image/png, canonical imageBase64 (decoded <=2MiB). Worker validates image headers/dimensions and output schema, invokes the pinned local model with one active request and bounded timeout, and returns {kind,model,draft,warnings,durationMs}. No raw-image persistence, queued image payloads, new DB tables or public image URLs. Concurrent requests receive an explicit busy response. This synchronous single-worker initial flow has no durable resume or cross-replica admission lock; evaluate latency before adding a job protocol.

Timetable drafts have optional semester dates and entries with title, weekday, minute boundaries and optional location. Event drafts have title, description, optional start/end timestamps and optional location; no guessed coordinates. Missing dates stay empty for review. Mobile explicitly applies to editable forms, then uses existing versioned save APIs. Images are untrusted source content, not instructions.

## Acceptance

- Real local model responses for controlled Korean fixtures and an available official poster; record accuracy and elapsed time without claiming representative performance.
- Main authorization; worker internal authorization; bounded input, busy/timeout/configuration/model-output failures.
- Owner/session-safe mobile image picking, preview, correction, explicit saving; cancelled imports cannot overwrite state.
- Existing source data untouched by evaluation; no silent model fallback or paid API calls.
- Build/typecheck/regression tests, APK install and UI inspection.

## Evaluation distinctions

Controlled fixtures are explicitly synthetic algorithm inputs, never external campus data. Real poster source URL and exact known truth are recorded separately. A small smoke set cannot establish broad OCR accuracy, real timetable screenshot quality or production latency.

## Integration evidence

- Main51/51 database-enabled tests, mobile44/44 tests, worker12/12 tests; no skips. Both server builds and mobile typecheck passed.
- Main and worker Docker image builds passed. Android ARM64 release-variant build passed in2m23s, with existing development signing identity.
- Full service E2E passed including an opt-in real-model request through authenticated main→worker, unchanged timetable and zero extra quest/private-event writes. Temporary databases/processes/Redis namespaces cleaned.
- Root reviewed authorization, local-only model/destination, bounded image/response handling, deterministic schedule parser, cancellation/session isolation, source image comparison, timetable version conflicts and imported-coordinate clearing.
- Android API36 emulator: optional document picker → selected synthetic poster → live local model → editable event draft and original enlargement verified. Default PhotoPicker and its legacy GET_CONTENT route ANRed on this emulator; the optional ACTION_OPEN_DOCUMENT path was added and checked instead. See [Android verification](android-verification.md).
- Final ARM64 APK build passed in48s, installed with existing app data/signing preserved. No database migration required by this feature; UI evaluation does not save synthetic domain records.
