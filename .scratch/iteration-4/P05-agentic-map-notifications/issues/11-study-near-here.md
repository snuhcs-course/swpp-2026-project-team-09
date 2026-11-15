# 11: "이 근처 조용히 공부할 곳" finds the study spaces of the visible map area (main server)

Parent: [P05 spec](../spec.md); the design's row 6, "지도에서 묻기", board a9 and note (6). The server half of package B's P02 ticket 23 ("이 근처"), as the row-6 contract fixes it.
Status: ready-for-agent
Blocked by: None (P01-17, #284, which moved the answer types, is on `4.0/Main`). P02 ticket 23 draws the answer and sends the area; until then the app sends no `viewport` and the tool answers none.
Native files: no

## What to build

A User whose app says `area` asks "이 근처 조용히 공부할 곳" with the map moved over a part of campus. The app sends the visible area as the request context's `viewport` (the field exists). A new tool finds the Study Spaces whose building's Place lies in that area, read for the asker through `StudySpacesService` (`usable`, `restrictedTo`), picks the one the User may use where they can stay longest before their next item, and draws a Lookup of kind `study`: the pick with its space and hours, the rooms open only to others faded, the walk there, and, when 관정관 is outside the area, a flag at the area's edge pointing to it. The model gets names and minutes, never the area. No model call of the server's own, no schema change.

## Behaviour

- **The capability.** `area` joins the server's `CLIENT_CAPABILITIES` and the app's `ANSWER_CAPABILITIES`. With `answer` (and with or without `events`), the chat gains the tool `findStudyNearby` and the rules `STUDY_RULES`; without `area`, or without `answer`, the prompt and the tools are those of today, character for character.
- **The tool's input** is what the User asked for: `quiet` (library and reading rooms, chip "조용한 곳"), `group` (group rooms, "같이 공부할 곳"), `pc` (PC rooms, "컴퓨터 쓸 곳"), or `any` (every kind, "공부할 곳").
- **The spaces of the area**: the spaces of that kind whose building's Place point lies in the area, its edges included. Those the User may use are the candidates; the others are drawn faded.
- **The longest stay.**
  1. *Ready*: now, rounded up to the whole minute; or, when an item is under way, its end (the start of the User's first stretch of Free Time today, as ticket 03's arrival reads it).
  2. *From*: when ready later, the Place of the item under way; otherwise where a way starts (`startOf`): the main gate when the location is off campus, the Place of the location, else the Place of the last item that has ended today. Unknown without any of these.
  3. *Next*: the item that ends that stretch of Free Time, the first item after the User is ready; none when nothing follows today.
  4. *Walk there* and *walk on*: the walking table's minutes, rounded up; 0 within one building, and 0 on for a next item without a Place.
  5. *Arrival* = ready + walk there; *leave by* = the next item's start − walk on; *stay* = leave by − arrival, in minutes.
  6. *The pick*: the longest stay; of equal stays the shorter walk there, then the first in the study-space list. With nothing to follow, the shortest walk.
  For a free User this is the stay a pressed building's card gives (P01-17).
- **The Lookup** (`kind: 'study'`):
  - `chips`: "{start}에서" (`origin`), "{next}까지" (`until`, "13:00 수업까지"; none when nothing follows), "보는 범위" (new kind `area`), and the kind asked (new kind `what`).
  - `lines`: "보는 범위에선 **{building}**", "빈 자리 수는 관정만 알 수 있어요".
  - `basis`: "지도에 보이는 범위 안의 공부공간만 찾았어요"; "학과 전용 열람실은 흐리게 두었어요" when a room is faded; the gate's line when the walk starts at the main gate.
  - `scene`: the User (as a way draws them); the pick, its building's point labelled "{building}({number}동)", role `pick`, tag "{space} · {the hours' first part}"; each restricted space of the kind as `dropped` at its building, tag "{space} · {restrictedTo}"; the User's route to the pick when the walk is more than 0; a `place` flag at the pick, "걸어서 N분 · HH:MM까지 N분" (without the walk inside the building; "머물 시간이 없어요" for a stay of 0 or less; the walk alone when nothing follows); and, when 관정관 lies outside the area, a flag of the new role `away` where the line from the area's centre to 관정관 leaves the area, "↑ 관정" (↑ ↓ ← → by the side; through a corner, north or south), with the new optional `placeId` set to 관정관's Place.
  - `band: null`; `actions`: `guide` to the pick (left out when the walk is 0), then `ask` "관정 보기" with "관정 지금 자리 있어?".
- **The free seats** are never sent to the server; the app adds them to the `away` flag whose `placeId` is 관정관's (P02 ticket 23).
- **What the model is given**: `result: 'found'` with `building`, `space`, `hours`, `from`, `walkMinutes`, `next` ("13:00 수업" or null), `leaveBy`, `stayMinutes`, `restricted` (building, space, `openTo`), and `kwanjeong` ("in the visible area" or "outside the visible area"); or `result: 'none'` with the reason: no area sent, no space of that kind in the area, every one open only to others (with `restricted`), or no known start. Nothing is drawn with none.

## Files

Create (each with the AI-generated box):
- `main-server/src/assistant/lookup/study-near.ts`: the area, its edge towards a Place, the User's ready time, start, and next item, the stay at a space, and the longest stay. Pure.
- `main-server/src/assistant/lookup/study-lookup.ts`: the kinds asked, the Lookup and the model's words. Pure.
- `main-server/src/assistant/lookup/study.service.ts`: `StudyAreaService`, which reads the way's facts and the study spaces for the asker.
- `main-server/src/assistant/lookup/study-tools.ts`: `findStudyNearby`, `STUDY_RULES`, and `withStudyArea`.
- `main-server/test/study-near.unit.test.ts`, `main-server/test/study-lookup.unit.test.ts`, `main-server/test/study-area-example.ts`, `main-server/test/assistant-study-area.integration.test.ts`.
- `mobile/src/api/mock/data/study-lookup.ts` and `.json`: the mock's copy of a9; `mobile/__tests__/api/study-lookups.unit.test.ts`.

Change (package A's files, these lines only):
- `main-server/src/assistant/dto/answer.dto.ts`: `ConditionChip.kind` gains `area` and `what`; `FlagRole` gains `away`; a flag gains `placeId?`.
- `main-server/src/assistant/dto/lookup.dto.ts`: `Lookup.kind` gains `study`.
- `main-server/src/assistant/feature.ts`: `CLIENT_CAPABILITIES` gains `area`.
- `main-server/src/assistant/chat/chat-assistant.ts`: the service, the option `drawsArea`, and `withStudyArea` around the planned tools.
- `main-server/src/assistant/assistant.service.ts`: the service, and the chats with `area`.
- `main-server/src/assistant/assistant.module.ts`: imports `StudySpacesModule`, provides `StudyAreaService`.
- `main-server/src/assistant/lookup/way-naming.ts`: `me` takes only the start.
- `main-server/src/study-spaces/study-spaces.module.ts`: exports `StudySpacesService`.
- App: `api/lookup-types.ts` (kind), `api/scene-roles.ts` (`away`), `api/assistant-types.ts` (chip kinds, `placeId?`, `ANSWER_CAPABILITIES`), `api/server/plan-answers.ts` (`isChip`; its map-scene checks, with `isFlagRole` and `isFlag`, moved to a new `api/server/scene-answers.ts`), `api/server/lookup-answers.ts` (`isLookup`), `api/mock/assistant.ts` (a9's words), and the tests that pin the capabilities sent.
- `main-server/README.md` (the chat's tools) and `mobile/README.md` (the capabilities a request with a context carries).

## Must not change

- For an app without `area`: the system prompt, and every tool's description, input, and answers.
- `main-server/eval/`, the schema, and the app's drawing (P02 ticket 23).
- Native files.

## Acceptance criteria

- [x] Unit tests of the area and its edge (inside, on the edge, each side's arrow and point, a corner), the ready time, start, and next item (free now, rounded up, a Class under way, nothing later, no start, off campus), the stay (board a9's 8 + 8 minutes: 12:18 to 12:52, 34; 421 seconds as 8 minutes; in the building; a Class under way, 32; a next item without a Place; nothing to follow), and the pick (the longer stay over the nearer space, ties by walk then order, the nearest with nothing to follow, the least short when none fits), with values worked out by hand.
- [x] Unit tests of board a9 on the seed: the chips, lines, basis, scene (pick, two faded department rooms, route, the `place` flag "걸어서 8분 · 12:52까지 34분", the `away` flag "↑ 관정" at the north edge with 관정관's Place), actions, and the model's words without coordinates; a 컴퓨터공학부 student picks 301동's own room (35 minutes); an area holding 관정관 has no `away` flag; `any`; the gate; nothing to follow; and each none.
- [x] Integration test at the endpoint with the scripted model: a9 drawn, what the model is given (no coordinate of the area or the User), none without `viewport`; an app without `area` gets the same prompt and tools but for `findStudyNearby` and its rules; `area` without `answer` gets neither; `events` with `area` gets both, and so does `meet` with `area` (`planMeet` beside `findStudyNearby`).
- [x] App: the check passes the stored a9 copy and refuses an unknown chip kind, a non-text `placeId`, and an unknown flag role; a flag without `placeId` still passes; the mock answers "이 근처 … 공부" with a context by the stored copy.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass in both projects; the touched tests pass.

## Comments

### Decisions (2026-11-15)

Details the contract left to the implementation, listed so that any of them can be vetoed.

1. **The kinds asked** are four (`quiet`, `group`, `pc`, `any`), with the chip words above; "조용한 곳" takes library and reading rooms. Lounges are taken only by `any`.
2. **The longest stay** is defined in Behaviour. It reads the item under way as ticket 03's arrival does, and agrees with the pressed building's card for a User free now.
3. **The building** is called by the study-space list's name, as the 공부공간 layer's card titles it: "공대 신양학술정보관", which tells it from 인문대's. Board a9's "신양학술정보관" is the Place's name; P02 ticket 23 should read the line as the server writes it. Its point is labelled "{name}({number}동)", as a way labels a Place gone to.
4. **The pick's tag** is the space and the first part of its hours ("학기 중 24시간" of "학기 중 24시간 · 방학 08:00–24:00"), since a label on the map is one line. The hours are display text and are not read as times, so a space closed now can be picked; the model gets the whole hours.
5. **Faded rooms** are the restricted spaces of the kind asked in the area, each at its building's point, also when that is the pick's building. "학과 전용 열람실은 흐리게 두었어요" is said whenever one is faded, a college's room included.
6. **The `away` flag** stands exactly on the area's edge, where the line from the centre to 관정관's Place point leaves it, latitude and longitude taken as plane coordinates; the app may draw it inside. It is left out when 관정관 lies in the area. 관정관 is the building whose seats the phone reads (`liveSeats`).
7. **Route guidance** is left out when the walk is 0 (the User sets out from the pick's building); "관정 보기" is always there.
8. **The gate's line** joins the basis when the walk starts at the main gate, as in the way Lookup.
9. **None is drawn** without an area, without a space of the kind in it, with only rooms open to others (the model is told which, to whom), or without a known start.
10. **The chats** are built once per kind of app: an app with `answer` and `area` gets the chat of `answer` (or `events`, each with or without P01-18's `meet`) with the tool and its rules added last, so that removing them gives today's prompt and tools exactly.
11. **`WayNaming.me`** takes only the start, so that the Lookup draws the User as a way does without a whole way.
12. **The app announces `area`** in `ANSWER_CAPABILITIES` from this change on. It sends no `viewport` until P02 ticket 23, so the tool answers none and nothing new is drawn. The tests that pin the capabilities sent were updated.
13. **The mock's copy** of a9 was written by `studyAnswer` over the seed for a student of 경제학부 with the mock's User id, and the mock answers it for any area the app sends.
14. **`AssistantService`'s constructor** went over oxlint's 50-line limit with the one new injected service, and carries a `max-lines-per-function` exception that gives the reason: one parameter per service the chat's tools call. Raising the limit for injected constructors in the lint configuration would replace it.
15. **The app's map-scene checks** moved from `api/server/plan-answers.ts` to `api/server/scene-answers.ts` when the merge with P01-18 took the file over 300 lines; `plan-answers.ts` re-exports `isScene` and `isPlacePoint`, so no importer changed.

### Found while building (2026-11-15)

- The main server refuses a request whose `clientCapabilities` holds a value it does not know (`z.enum(CLIENT_CAPABILITIES)`, 400). An app that sends `area` therefore needs a main server with this change: the server must be deployed with or before the app's update, or every request with a context fails. The server and the APK are released together from the same Main, so a Release meets this.
