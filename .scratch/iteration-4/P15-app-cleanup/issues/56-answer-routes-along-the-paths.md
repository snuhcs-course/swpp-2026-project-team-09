# 56: An answer's walking routes follow the paths, not a straight line

Parent: [P15 spec](../spec.md), item 56; a tester's report of 2026-11-18 using the released app: "AI에선 길찾기가 직선으로 뜸" (when the AI Assistant answers with a way to a place, the route is a straight line)
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: the owner's decision under "Open questions for the owner" (Kakao's rule)

Native files: none. Releases: an app OTA update only (no main-server Release, no native Release). No board: the canvas draws no route line for this, so the pull request shows no boards.

## What happens now

- The main server's `MapScene.routes` carry each route's two ends, its minutes and, for a shuttle's ride, its mode: `userId`, `role`, `from`, `to`, `minutes`, `mode?: 'walk' | 'shuttle'`, absent for a walk (`main-server/src/assistant/dto/answer.dto.ts:139-146`; the app's copy `mobile/src/api/assistant-types.ts:300-307`). No path.
- The app draws each route as a line of two points, from its start to its end (`mobile/src/features/assistant/answer-marks.ts:259-263`, `points: [from, to]`), and `useDrawnMap` hands those lines to the map as they are (`mobile/src/screens/main/use-answer-map.ts:276`). This holds for an answer's Plan, a Lookup and a received invitation's way, which all draw a scene through `useDrawnMap`.
- The everyday map's route instead asks `GET /walking-route` (`apiClient.findWalkingRoute`) and draws the line it gives (`mobile/src/screens/main/use-route.ts:91` and `:96-99`).
- The straight line was recorded as a stand-in by P02's spec: "One straight line for each route of the scene, from its start to its end" (`.scratch/iteration-4/P02-agentic-map-answer-screen/spec.md:115`) and "A straight line stands for a route: the scene gives a route's two ends and its minutes, not its path" (`:271`). Nothing scheduled replaced it.
- Kakao's rule, as written: "A route is never stored or cached, because Kakao's operating policy does not allow it … The team's Kakao app has a free quota of 1,000 routes a day … so the app asks for a route when the User does, never on every position" (`main-server/README.md:1863-1866`; the quota is shared with 길 안내 and the party room, `README.md:285`).

## What changes (option (가), as built, pending the owner's decision)

- Where a scene's lines reach the map (`useDrawnMap`), the app asks `GET /walking-route` for the walks of the scene on screen: routes whose `mode` is absent or `'walk'`. A shuttle's ride, and any other mode, is never asked and stays straight.
- **Asked less often.**
  - Only the scene on screen: the Plan on screen, the Lookup on screen, or the received invitation's way. Another candidate's walks are asked only when the User shows it.
  - At most `WALKS_PER_SCENE` = 3 walks a scene: the people's ways to the place first (the User's, then the Friends'), the way on to the next Class after them, so a Plan of three people draws all three people's ways. The others stay straight.
  - Each pair of ends once: two walks with the same two ends share one request and one path.
  - A recalculation whose ends did not move (a drag of the time band alone) asks nothing: the requests are keyed by the two ends. The scene changes only when a recalculation answers, which a drag asks for when the finger is let go, so a drag that moves the place asks then, not while dragging.
- **Nothing is stored.** A path is held only while the answer that draws it is on screen, in the running app's memory (a key of its own, `answer-walk`, apart from the everyday route's; P04 ticket 75). A scene of that answer shown again asks nothing; a new answer or a closed one asks again.
- **Cancelled when replaced.** A scene that leaves the screen, such as by "다음 후보", gives up its requests still on their way: the query's `signal` reaches `fetch` (`findWalkingRoute`'s new `signal`, through `http.ts`'s `send`).
- **Failures.** A failed walk is retried once, as the everyday route's request is (the app's query client), and not again on mount while it is still known (`retryOnMount: false`). Its line stays straight, and the other walks of the scene are drawn whatever it did.
- A found path is joined onto the walk's two ends where it stops short of them (Kakao snaps each end to the nearest walkway), and drawn in the route's own colour, width and style. The line keeps its id (`answer:route:<index>`).
- The line stays straight while its request is on its way, when the request fails, and when the service finds no path (any status but `OK`, or a line of fewer than two points).
- **The everyday route** keeps its asking only while it is drawn too (`gcTime: 0` in `useWalkingRoute`). Its request is not given up when replaced: it is one request the User asked for, and its many tests count the calls by their two ends.
- `native-map.tsx` hands the lines to the native module only when they change (memoized), since a walk along its path now carries many points.
- `main-server/README.md`, the root `README.md`, `mobile/README.md` and the P07 spec's sentence say what is true of (가) as built, marked as pending the owner's decision. The rule itself is left as written.

### What an answer costs now

Kakao routes asked by the walks, each counted once (a failure may add its one retry):

| Answer shown | Routes |
| --- | --- |
| One person, one Plan looked at (the User's way, the way on to the next Class) | 2 (1 without a next Class) |
| Two people, one Plan (the User's, the Friend's, the next Class) | 3 (2 when the Friend is already there, as in the stored "민수랑 같이" Plan 1) |
| Three people, one Plan (the User's and two Friends'; the next Class stays straight) | 3 |
| Arrowing through three Plans of a two-person answer | 6 to 9 |
| Back to a Plan already seen | 2 to 3 more (nothing is kept) |
| A recalculation that moves the place | 2 to 3 more, once the finger is let go |
| A drag of the time band that moves no end | 0 |

Against the quota of 1,000 routes a day, shared with 길 안내 and the party room: an answer browsed through its three Plans costs about 6 to 9, so the quota covers about 110 to 160 such answers a day across all Users before anything else.

## Open questions for the owner

- (가) **As built:** an answer's walks are asked for by themselves, within the bounds above. This asks Kakao when the answer is shown rather than when the User asks for a way, which the written rule does not allow as it stands.
- (나) **The written rule kept:** the straight line stays until the User presses the answer's 길 안내; then one request, the everyday route's, as the rule says. This ticket would then be closed without the change (the everyday route's `gcTime: 0` and cancel could stay).

## What stays as it is

- The minutes the card and the marks show stay the main server's (`minutes`, the tags such as "나 · 3분", the chips "{name} 도보 N분"). They are not replaced with the route service's duration: the server's minutes are what the Plan was worked out with.
- The camera fits the scene's points as before (the routes' two ends, not the path), so the camera does not move again when a path comes.
- A shuttle's ride stays a straight line beside the walks that bend: the service gives only walking paths.
- The everyday route's look and when it is asked.
- No main-server change and no native change.

## Acceptance criteria

- [x] With an answer on screen, the walks of the scene on screen, at most 3, each pair of ends once, are drawn along the line `GET /walking-route` gives, joined onto their ends, in the route's own colour and width.
- [x] A shuttle's ride is never asked and stays a straight line.
- [x] While a walk's request is on its way its line is not drawn (P04 ticket 75); after it fails and when no path is found, its line stays straight; a failed walk does not keep the others from being drawn.
- [x] A scene that leaves the screen gives up its requests on their way, and a scene of the answer on screen shown again asks nothing: its paths are held only while that answer is on screen.
- [x] The minutes on the card and the marks stay the server's.
- [x] The request counts are written here and in the pull request, beside the quota.
- [x] Tests, by ADR 0007: a unit test of the pure parts (`walksOf`, `walksToAsk`, `linesAlongPaths`); integration tests over the fake main server for a found path, a failing request, no path, the cap, the dedupe and the ride, a failure among found walks, a Plan left while its requests are on their way, and a Plan shown again; one over the mocks where the mock's answer draws the mock's walking line.
- [ ] The owner chooses (가) or (나).
- [ ] On a phone: an answer from the Assistant draws its walks along the paths (left to a person, see the pull request).

## Comments

### Notes from the implementation (2026-11-18)

- The swap sits in `useDrawnMap`, which all three scene drawings share, so a Lookup's route and a received invitation's way follow their paths too, not only a Plan's.
- The first version asked every walk of the scene, three at a time, and kept the paths for five minutes (`staleTime: Infinity`, the default `gcTime`). fyoon46's review of #362 showed that a failed walk never freed its slot (the hook read the cache instead of subscribing to it), that a failure came back unbounded, that duplicate ends made duplicate keys, and that keeping the paths and asking by itself goes against the written Kakao rule. The rolling window is gone: at most three walks a scene are asked at once, all together, so no slot waits for another.
- `answer-lookup`'s test of 길 안내 without a position asserted that `findWalkingRoute` was never called toward 문화관; the Lookup's own walk now is, so it asserts that 길 안내 asks nothing more after the answer is drawn.
- The unit tests of the answer and Lookup hooks (`answer-map-hook`, `lookup-map-hook`) render without a query client: they stand in for `useAnswerWalks` as they stand in for the marker images.
- The fake main server answers `GET /walking-route` with `ROUTE_RESULT_NOT_FOUND` by default, so the older answer tests over it still see straight lines; the mock client's curved line needed no change.
- The phone check is left to a person: ask the Assistant "배고파, 민수랑 같이" (or any question whose answer draws a way) and see the navy line bend along the walkways a moment after the straight one; press "다음 후보" and back; turn the network off and ask again: the straight line stays.

### Agent usage (2026-11-18)

Estimates; a VM restart at 17:04 cut the first session short, and its few minutes are included:

- Agent time: about 2 hours 15 minutes, in two sessions of one Opus 5.5 agent, most of it waiting on single-file Jest runs, including the rework after the review.
- Tokens: output about 75,000. Input about 13 million: about 12.5 million cache reads, 0.5 million cache writes and a few thousand uncached.
