# 39: A building's card takes the shuttle when it is 3 minutes faster

Parent: [P02 spec](../spec.md), ticket 22 (a pressed building's card); a tester's report of 2026-11-18 using the released app: in the card of a pressed building the shuttle was plainly 3 minutes or more faster than walking, and the card still recommended walking
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: a main-server Release only; the app is unchanged.

## What happened

- The card (`POST /assistant/taps`, `main-server/src/assistant/lookup/place-lookup.ts`) works out the same way as `findWay` (`wayOf` in `way.ts`), and that way already says whether the shuttle is taken: it arrives at least 3 minutes before the walk, the wait at the stop included.
- The card never read that. Its headline was always "걸어서 N분 · HH:MM 도착", its "가는 길" always led to the building, and its basis took the line written for a walk the shuttle does not beat. That line ended in "셔틀은 N분으로 걷기보다 3분 이상 빠르지 않아 걸어요" even when the shuttle was 11 minutes faster.
- Reproduced on the seed: 58동 pressed from inside 301동 on a Tuesday at 10:00, with no shuttle reported, is 25 minutes on foot (10:25) and 14 minutes by the shuttle with the average wait (10:14). The card said "걸어서 25분 · 10:25 도착".
- The comparison itself was right. Where the User sets out from (the "302동에서" chip) is the same Place `findWay` uses. The screenshot of the report was taken at 23:54, when the shuttle does not run, so it shows the walk as it should.

## What changes

- **The card.** When the shuttle is taken, the headline is "셔틀로 N분 · HH:MM 도착" (the minutes from setting out to the arrival, as the shuttle answers count them), and the next line names the stop: "301동 정류장에서 타요 · 기다림 약 4분" with no shuttle reported, or "16:52에 나서 301동 정류장에서 16:54 셔틀" with one reported. The basis is the shuttle answer's: the walk to the stop and the wait, the ride, the walk it beats, and the 3-minute rule. The stay before the next item counts from the shuttle's arrival.
- **"가는 길" and "길 안내" lead to the boarding stop when the shuttle is taken**, in the building's card, in `findWay`'s answer, and in a Quest's way. The app's route guidance is a walk, so leading to the building drew the walk the answer had just turned down.
- Otherwise, and when the shuttle does not run, the card is the walk, as before.

## Acceptance criteria

- [x] 58동 pressed from 301동 on a weekday at 10:00 says the shuttle, its arrival, and the stop, rests on the shuttle's legs, and guides to the 301동 stop.
- [x] With a shuttle reported 3 minutes faster, the card takes it and says when to set out; 1 minute faster, it walks.
- [x] At 22:00 the card walks and says the shuttle is not running.
- [x] `findWay`'s shuttle answer (board q4) and a Quest's way by the shuttle (board q12) guide to the boarding stop; a Quest's way on foot still guides to the place.

## Decisions for review

1. **"가는 길" leads to the stop, not the building.** The app's guidance draws one walking route from where the User is, so the boarding stop is the only target that matches a shuttle answer. Getting off and walking the last minute is said in the card and the basis.
2. **The card's headline counts the shuttle's minutes from setting out**, as "셔틀로 N분" does in the existing shuttle answers. With a shuttle reported, setting out may be a few minutes away, which the second line says.
3. **The card's map is unchanged.** The pressed building's scene is only the pick, and the app draws none of a card's routes, so the stops are named in words.

## Comments

### Checked on an emulator (2026-11-19)

No screen attached. The card's words come from the main server, and the emulator's builds either use the mock answers or talk to the deployed servers, so showing this case needs the app signed in against a local main-server on the emulator, which holds a real account. The shuttle was also not running at the time of the check (03:40). The tests that prove it: `main-server/test/place-card-shuttle.unit.test.ts` (the card on both sides of the 3-minute line and when the shuttle does not run), `test/way-shuttle.unit.test.ts`, `test/quest-way.unit.test.ts`, and `test/assistant-quest-way.integration.test.ts`.

### Agent usage (2026-11-19)

- Agent time: about 25 minutes of one session. An estimate from the transcript's timestamps.
- Tokens: input about 14 million, of which about 13.8 million cache reads and 0.2 million cache writes; output about 45,000. No subagents. Measured from the session's transcript at the time of the pull request.
