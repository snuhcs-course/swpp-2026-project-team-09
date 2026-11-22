# 33: A Plan's travel takes the shuttle of its day and time

Parent: [P05 spec](../spec.md); a report from the released app (`26.11.22-17`): planning Monday's lunch on a Sunday, the times assumed walking, while on Monday the shuttle runs
Status: ready-for-human
Blocked by: nothing on the server; the app must read `mode` and `shuttle` before this reaches the phones (see below)

Native files: none. Releases: the main server, in the same Release as the app's reading of the fields.

## What happened

- A meal's or a meet's Plan worked out every way with the walking table alone (`gathering.ts` `minutes()`, typed `Pick<TravelProvider, 'walkingSeconds'>`). Nothing under `gathering/` read the shuttle or the day.
- The travel provider already weighs the shuttle at a departure time, by that day's weekday and hour, with the timing's average wait at the stop, and takes it only when it is at least 3 minutes faster (`SeedTravel.travel`). Only the free-time fit used it.

## What changes

- **Each person's own way to the place leaves at the person's `readyAt`, and the way on to their next item leaves at that item's start less the walk. Each is weighed by the provider at that departure.** A Monday lunch asked on Sunday is weighed on Monday's timetable. The wait is the average for that hour, since no shuttle is reported for another day.
- The shuttle is weighed only for a walk of 10 minutes or more, because a shorter walk can never be beaten by 3 minutes.
- **Meeting on the way stays on foot**: the merge test, the merging point, and a merged Friend's legs are walks, as before.
- `PersonPart` carries `by` (`walk` or `shuttle`) and `shuttle` (the stops boarded and got off at, by name), and so does its `next`. `walkMinutes` keeps its name and holds the minutes of the way.
- The Plan DTO's part sets `mode: 'shuttle'` (an existing field, absent for a walk) and a new `shuttle: { boardAt, getOffAt }`. The scene's routes of the 'me', 'friend', and 'next' roles carry `mode: 'shuttle'`.
- The server's words say "셔틀로 N분 (301동 정류장 → 경영대 정류장)" where they said "걸어서 N분" in the basis. The alone line is "셔틀로 N분이에요" or "셔틀로 N분 가고 HH:MM엔 나서야 해요".
- The model's plan tool result gives each person `by`: `'walk'`, or `{ shuttle: { boardAt, getOffAt } }`. The meal and meet rules let the sentence say the shuttle in a few words and never call a way by the shuttle 걸어서.
- The weighing lives in `gathering/gathering-travel.ts` and the model's words of a Plan in `gathering/plan-times.ts`, so that `gathering.ts` and `plan-tools.ts` stay within the line limit.
- A Quest's own way (`plans/own-way.ts`) uses the gathering only for the sides and keeps walking (`onFoot`).
- A party's Leader's `leave-by`, kept by `POST /plans`, says "셔틀로 N분" when the Leader's part is by the shuttle, as a Plan taken alone's already did.

## What the app must change (not in this ticket)

- Where a part's minutes are shown as "걸음 N분", show the shuttle when `mode === 'shuttle'`, with `shuttle.boardAt` and `shuttle.getOffAt`.
- Draw a route with `mode: 'shuttle'` as a shuttle leg. Do not ask for a walking route along the paths for it.

## Acceptance criteria

- [x] A Monday lunch planned on Sunday from 301동 to 58동 goes by the shuttle, 13 minutes against a 25-minute walk, with its stops, and the way on to a 301동 Class by the shuttle too.
- [x] The same lunch on a Saturday walks, 25 minutes.
- [x] A walk under 10 minutes never asks the provider about the shuttle.
- [x] The tests that pinned walking minutes on a Tuesday daytime are updated: `meal-answer.unit.test.ts` (302동식당 is now the User's shortest stay, 9 minutes), `meet-answer.unit.test.ts` and `assistant-meet.integration.test.ts` (a6: 302동 앞 from 14:04 for 86 minutes, 24동 앞 until 15:16), and the model's results in `assistant-meet` and `assistant-meal-plan` give `by`.
- [x] Lint, format, and types of the main server pass.

## Comments

### The fields the app reads (2026-11-22)

- A part by the shuttle: `mode: 'shuttle'` and `shuttle: { boardAt, getOffAt }` (stop names, "301동", "경영대"). A walk sends neither.
- Its `next`: `by: 'shuttle'` when the way on to the next item is by the shuttle, absent for a walk.
- A scene route of the 'me', 'friend', or 'next' role by the shuttle: `mode: 'shuttle'`, absent for a walk.

### Agent usage (2026-11-22)

- Agent time: about 40 minutes of one session, waits for the design's go and for test runs on a loaded Mac included. An estimate from the transcript's timestamps.
- Tokens: input about 31.6 million, of which about 31.2 million cache reads and 0.34 million cache writes; output about 61,000. One short web-reading subagent of the earlier ticket is not counted here. Measured from the session's transcript at the time of the pull request.
