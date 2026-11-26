# 07: The study answer together: a 관정 group study room at everyone's free time

Parent: [P10 spec](../spec.md) § With Friends
Status: ready-for-human
Blocked by: 02, 03

## What to build

- **Its own capability, `study-group`** (2026-11-27), apart from `study-plan`:
  - its own tool `planStudyGroup(friendIds?, date?, firstDay?, lastDay?, from?, until?, minutes?)` and rules `STUDY_GROUP_RULES`, joined by `withStudyGroup` as `withStudyPlan` joins planStudy;
  - for such an app, `proposeStudyRoom` and its rule line are not offered, and the library rules route studying together to `planStudyGroup`;
  - an app with only `study-group` asking alone gets today's 관정 seat card; one with both gets `planStudy` alone and `planStudyGroup` together; one with neither, and one with only `study-plan`, is unchanged;
  - `POST /assistant/answers` answers a study input together only for `study-group`, and one alone only for `study-plan`; otherwise 422.
- **`StudyInput.together`**: the group answer is given when it is true or the input holds Friends. "같이 공부할 자리 있어?" with nobody named is the group plan for the asker alone: the smallest room that books, the asker's own free time, `people: 1`, `moreNeeded: 3`, no `key`. The app opens its picking of Friends from it.
- A study input together (1 to 8 people) answers one plan, `관정관`, a 관정 group study room. The input alone stays 03's.
- **The time** is today's `pickStudyTime`, read as `proposeStudyRoom` reads it:
  - everyone's items of the day, and the constraints the asker set (`notBefore`, `leaveBy`, `from`);
  - the room kind's hours, in 30-minute steps;
  - the walks to and from 62-1;
  - `window` as bounds, and `minutes` as the length (`window`'s span, else 180, by default).
- **The room kind** is `studyRoomFor`'s, or `chosen.roomSpaceId` while it fits. `study.group.rooms` lists every kind with `fits` and its reason.
- `parts` has each person with their arrival, and `band.lanes` everyone's busy time. `band.others` lists the asker's other Friends, together and alone.
- **2 or 3 people:** `moreNeeded`, no `key`; the sentence is "그룹스터디룸은 네 명부터예요. 한 명만 더 부르면 돼요."
- **No plan:** `no-shared-time` when nobody can be together for 30 minutes; `no-fit` above 8 or with no room for the head count, in today's words.
- **A day past the booking window** (up to 14 days): `opens`, and a `key` ending in `:wait`.
- **The words:** one sentence ("네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요."); the wordless net makes it too.
- **The recalculation** with Friends added or removed reruns it. With every Friend removed, an answer started together stays together at `moreNeeded: 3`; `together: false` gives 03's answer alone again, with `chosen.seatSpaceId` and `window` kept.
- **A `study-group`-only app's seat card "+ 같이"** sends a study input built from the card (spec § With Friends); the card's key holds all the server needs.

## Acceptance criteria

- [x] 4 people with free time tomorrow afternoon get one plan at the pick `pickStudyTime` gives, in the room `studyRoomFor` gives, with a `key` that `POST /library/room-requests` accepts. (Unit and integration tests.)
- [x] 3 people get `moreNeeded: 1` and no `key`; 9 get `no-fit`; people with no common 30 minutes get `no-shared-time`. (Unit tests.)
- [x] Nobody named gets `people: 1` and `moreNeeded: 3`; one Friend, `moreNeeded: 2`. (Unit and integration tests.)
- [x] A day 5 days ahead gets `opens` and a `:wait` key. (Unit test.)
- [x] Removing every Friend with `together: false` gives the answer alone, with the seat space and the window chosen before, and its time cards list the Friends. (Integration test.)
- [x] Each kind of app (neither, `study-plan` only, `study-group` only, both) gets its own tools, and the recalculation needs the capability of the answer. (Unit and integration tests.)
- [x] The cached prefix (tools and system) of the plain chat, the 8 sets that draw answers and the 8 that also say `study-plan` is unchanged.

## Built (2026-11-27)

- `lookup/study-group.ts` picks the room and the time (`studyGroupTime`), `lookup/study-group-parts.ts` builds the plan (`studyGroupAnswer`), `lookup/study-group-words.ts` its sentence and what the model is told, and `lookup/study-group.service.ts` reads the people (checked by the meal's `friendsOf`), their days and the other Friends. `StudyPlanService` hands it every input together.
- `lookup/study-group-tools.ts` holds `planStudyGroup`, `STUDY_GROUP_RULES` and `withStudyGroup`; `chat/chat-studies.ts` joins the study tools and picks the library rules (`LIBRARY_GROUP_RULES`, `LIBRARY_STUDY_GROUP_RULES`). With both capabilities, the study-plan rules name "혼자 공부할 곳" in the place of "같이 공부할 곳" and leave studying together to `planStudyGroup`.
- `assistant.service.ts` builds a chat for each of the 32 drawings in a loop.
- The controller refuses a study input with 422 when the app does not say its capability, and lets a day together reach 14 days ahead.
- The fixtures gain `together` (false alone, true together), `band.others` on every plan of the answer alone, and, together, the origins, routes, lanes, notes and second line the code gives.
- Before and after, the cached prefix of the plain chat and of the 16 non-group sets that draw answers was hashed: all 17 hashes were equal.
- Eval cases in `eval/cases/study-group.yaml`, with the capability sets `study-group-app` and `study-both-app`, written and not run, as there is no model key.
