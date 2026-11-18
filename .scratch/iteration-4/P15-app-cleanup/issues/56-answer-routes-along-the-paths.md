# 56: An answer's walking routes follow the paths, not a straight line

Parent: [P15 spec](../spec.md), item 56; a tester's report of 2026-11-18 using the released app: "AI에선 길찾기가 직선으로 뜸" (when the AI Assistant answers with a way to a place, the route is a straight line)
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: none

Native files: none. Releases: an app OTA update only (no main-server Release, no native Release). No board: the canvas draws no route line for this, so the pull request shows no boards.

## What happens now

- The main server's `MapScene.routes` carry each route's two ends, its minutes and, for a shuttle's ride, its mode: `userId`, `role`, `from`, `to`, `minutes`, `mode?: 'walk' | 'shuttle'`, absent for a walk (`main-server/src/assistant/dto/answer.dto.ts:139-146`; the app's copy `mobile/src/api/assistant-types.ts:300-307`). No path.
- The app draws each route as a line of two points, from its start to its end (`mobile/src/features/assistant/answer-marks.ts:259-263`, `points: [from, to]`), and `useDrawnMap` hands those lines to the map as they are (`mobile/src/screens/main/use-answer-map.ts:276`). This holds for an answer's Plan, a Lookup and a received invitation's way, which all draw a scene through `useDrawnMap`.
- The everyday map's route instead asks `GET /walking-route` (`apiClient.findWalkingRoute`) and draws the line it gives (`mobile/src/screens/main/use-route.ts:91` and `:96-99`).
- The straight line was recorded as a stand-in by P02's spec: "One straight line for each route of the scene, from its start to its end" (`.scratch/iteration-4/P02-agentic-map-answer-screen/spec.md:115`) and "A straight line stands for a route: the scene gives a route's two ends and its minutes, not its path" (`:271`). Nothing scheduled replaced it.

## What changes

- Where a scene's lines reach the map (`useDrawnMap`), the app asks `GET /walking-route` for each walked route of the scene on screen: a route whose `mode` is absent or `'walk'`. A shuttle's ride, and any other mode, is never asked and stays straight.
- The line of a walk that is found is drawn along the path the service gave, in the route's own colour, width and style. The line keeps its id (`answer:route:<index>`).
- The line stays straight while its request is on its way, when the request fails (after the app's one retry), and when the service finds no path (any status but `OK`, or a line of fewer than two points).
- Only the routes of the scene on screen are asked: the Plan on screen, the Lookup on screen, or the received invitation's way. Another candidate's routes are asked when the User shows that candidate.
- At most `WALKS_AT_ONCE` = 3 walks are asked at once, in the scene's order (the User's way first); the next is asked when one is answered. A Plan of two people has two to four walks (each person's way, and the way on to the next Class), so three asks the User's way and a Friend's together; a scene of a whole Party (one way a person, and their next Classes) does not send a burst of requests, each of which the main server passes on to Kakao and may wait up to 5 seconds for.
- Answers go through react-query (`useQueries`), keyed by the two ends under the walking route's key (`['walking-route', 'walk', …ends]`), so a walk is asked once while it stays in the cache, and showing a candidate again draws its path at once. The everyday route's key carries an asking count and no start, so the two never share an entry.

## What stays as it is

- The minutes the card and the marks show stay the main server's (`minutes`, the tags such as "나 · 3분", the chips "{name} 도보 N분"). They are not replaced with the route service's duration: the server's minutes are what the Plan was worked out with.
- The camera fits the scene's points as before (the routes' two ends, not the path), so the camera does not move again when a path comes.
- The everyday route (`use-route.ts`), its key and its look.
- No main-server change and no native change.

## Acceptance criteria

- [x] With an answer on screen, each walked route of the Plan on screen is drawn along the line `GET /walking-route` gives for its two ends, in the route's own colour and width.
- [x] A shuttle's ride is never asked and stays a straight line.
- [x] While a walk's request is on its way, after it fails, and when no path is found, its line stays straight.
- [x] At most `WALKS_AT_ONCE` (3) walks are asked at once; every walk of the scene is asked in the end.
- [x] The minutes on the card and the marks stay the server's.
- [x] Tests, by ADR 0007: a unit test of the pure line swap (`linesAlongPaths`, `walksOf`); integration tests over the fake main server where a found path is drawn, where a failing request and a path not found keep the straight line, and where five walks are asked three at a time and a shuttle's ride not at all; and one over the mocks where the mock's answer draws the mock's walking line.
- [ ] On a phone: an answer from the Assistant draws its walks along the paths (left to a person, see the pull request).

## Comments

### Notes from the implementation (2026-11-18)

- The swap sits in `useDrawnMap`, which all three scene drawings share, so a Lookup's route and a received invitation's way follow their paths too, not only a Plan's.
- The scene gives no path, only the two ends, and the walking route service's line may start and end a few metres from them, at the nearest walkway. The line is drawn as the service gives it, as the everyday route's is.
- Answers are kept in the app's memory only (react-query's cache, `staleTime: Infinity`, dropped five minutes after no scene shows them), which Kakao's rule that no cache along the way keeps a route (`walking-route.controller.ts`) is about HTTP caches; the everyday route keeps its line in memory the same way.
- The fake main server answers `GET /walking-route` with `ROUTE_RESULT_NOT_FOUND` by default, so the older answer tests over it still see straight lines; the mock client's curved line needed no change.
- The phone check is left to a person: ask the Assistant "배고파, 민수랑 같이" (or any question whose answer draws a way) and see the navy line bend along the walkways a moment after the straight one; turn the network off and ask again: the straight line stays.

### Agent usage (2026-11-18)

Estimates; a VM restart at 17:04 cut the first session short, and its few minutes are included:

- Agent time: about 1 hour 20 minutes, in two sessions of one Opus 5.5 agent, most of it waiting on single-file Jest runs.
- Tokens: output about 45,000. Input about 7 million: about 6.7 million cache reads, 0.3 million cache writes and a few thousand uncached.
