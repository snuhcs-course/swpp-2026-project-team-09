# 05: Walking route through Kakao

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User asks for a walking route between two points on campus, and the app draws the line. The main server calls Kakao's walking route API with the server's key and returns the line, the distance and the duration. When Kakao answers with one of its failure statuses, the app is told that there is no route, so that it never draws a wrong one. A route is never stored or cached, because Kakao's policy does not allow it, and Kakao is called only when a User asks.

The API has not been called yet, so the ticket starts with one real call: the answers the tests use come from it, not from the documentation. The key is a person's to supply. The agent adds the setting, asks for the value and waits, as P05's note on keys says.

## Acceptance criteria

- [x] Before the route is built, one real call is made by hand with the key, from the main gate to the central library, and one that Kakao refuses, such as the same point twice. The answers, without the key, are saved as the tests' answers and recorded under Comments, with whatever differs from P05's note.
- [x] A User's route takes a start and an end as coordinates and returns the line as a list of coordinates, the distance in metres and the duration in seconds. It needs a User's access token. Coordinates that are not a latitude and a longitude get 400 with the field named, before Kakao is called.
- [x] Each of Kakao's failure statuses (`SAME_POINT`, `START_LINK_NOT_FOUND`, `END_LINK_NOT_FOUND`, `TOO_MANY_SEARCH_LINK`, `TOO_FAR_AWAY`, `ROUTE_RESULT_NOT_FOUND`) is answered as "no route", with the status named. An answer that is neither a route nor one of those, such as a quota or key error, is an error the app can tell apart from "no route".
- [x] The REST API key is a setting with the name P05 chose. It is listed in the example settings file with a one-line comment on where it comes from, the server stops at startup and names it when it is missing, and the value never appears in the code, the tests or the ticket.
- [x] Nothing about a route is stored or cached, and Kakao is called once per request, only on a User's request.
- [x] Tests never call Kakao: the call is replaced at the fetch boundary with the saved answers of the real calls, and with answers shaped like them for the failure statuses that were not called and for an error. A request without a User's access token is refused, and invalid coordinates get 400.
- [x] The main server's README records the route, the "no route" answer and the key.

## Comments

### The real calls (2026-10-02)

Made by hand at 15:46 KST, before any code of the route, once each: `curl` with the key from the main checkout's `main-server/.env`, read into a shell variable inside the one command and never printed, and the project's User-Agent (`SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)`). Both asked `GET https://dapi.kakao.com/v2/routing/walk` with `Authorization: KakaoAK` and the four required parameters only, at P05's coordinates (`.scratch/research/external-sources.md` §7.4).

| Call | Query | Answer | Saved as, in `main-server/test/answers/` |
|---|---|---|---|
| The main gate to the central library | `start_x=126.9486&start_y=37.4664&end_x=126.9524&end_y=37.4592` | HTTP 200 in 0.25 s, `OK`: 1,105 m and 1,216 s, one leg of six steps | `kakao-walk-main-gate-to-central-library-2026-10-02.json` |
| The main gate to itself | `start_x=126.9486&start_y=37.4664&end_x=126.9486&end_y=37.4664` | HTTP 200 in 0.10 s, `SAME_POINT` | `kakao-walk-same-point-2026-10-02.json` |

The answers are saved byte for byte as Kakao sent them, and kept out of Prettier, as the worker's saved pages are. Only the bodies were written; a search of them and of every changed file for the key found nothing. The response headers named no quota: `content-type: application/json`, `vary: Accept-Encoding` and an `x-request-id`.

What differs from P05's note:

- `totalDistance`, `totalTime` and `landingUrl` are under `route.properties`, not directly under `route`. Each leg has `properties` (`distance`, `time`) and `steps`, and each step has its line in `path.points` as `[x, y]`, with its `distance`, `time`, `guidance` (`121m 이동`, `횡단보도 이용`, `계단이용`) and first point (`x`, `y`) under `properties`.
- `route` is not present only with `OK`: `SAME_POINT` came with `"route":{"legs":[],"properties":{"totalDistance":0,"totalTime":0}}`, without `landingUrl`. The status, not the presence of a route, says whether there is one.
- P05's judgement that the other statuses arrive with HTTP 200 holds for `SAME_POINT`. The other five were not met.
- Each step's line begins with the point where the one before it ended, so the six steps hold 35 points, 30 of them distinct.
- The line begins and ends on the path nearest to each point asked for, 28 m and 29 m from them.

No call was made after the route was built: the ticket asks for none, and the tests use the saved answers only. Two calls of the day's free 1,000 were used.

### Decisions (2026-10-02)

- **`GET /walking-route?startLatitude=…&startLongitude=…&endLatitude=…&endLongitude=…`.** It changes nothing, like `GET /menus`. Four named fields leave no doubt about the order, which Kakao's `x` and `y` reverse, and a 400 names the one that is wrong. The line is a list of `{ latitude, longitude }`, the spec's words for a position.
- **"No route" is an answer, 200 `{ status, route: null }`; anything else is 502.** The ticket calls the first an answer and the second an error. A route is `{ status: 'OK', route: { line, distance, duration } }`, so the app reads `route` and shows `status` when it is `null`. 502, not 500, says that Kakao failed, not the server.
- **Kakao's answer is read by what it says, whatever its HTTP status**: a route with `OK`, no route with one of the six statuses, an error otherwise, a quota or key error included, since those carry no `status`. Only `SAME_POINT` was seen to come with 200.
- **A coordinate is read only when written as a decimal number.** `Number('')` is 0, so an empty field would otherwise ask for a walk from the equator. A latitude lies in -90 to 90 and a longitude in -180 to 180, which also catches the two swapped.
- **The line drops the repeated point where two steps meet** (30 points, not 35): the steps are Kakao's directions, which are out of scope, and the app draws one line.
- **The answer carries `Cache-Control: no-store`**, so that the app's HTTP client and any cache on the way keep no route either. P06 already says the app never keeps one after the screen is left.
- **A failure is logged as a warning with Kakao's HTTP status and answer.** Nest logs no HTTP error, and without the line a wrong key or a used-up quota would leave no trace on the server. The key is replaced by its setting's name in the line, in case an error of Kakao's quotes it.
- **The setting checks only that the key is there.** A check of its form, 32 hexadecimal characters as it has, would rest on nothing Kakao documents.
- **No timeout of the server's own**, as in ticket 01's worker: Node's `fetch` gives up after 300 seconds without an answer. A User would wait that long only if Kakao hung; a timeout can be added with the app's handling of the 502.
- **The server's call sends no project User-Agent.** The key names the app to Kakao. The hand calls sent it, as the rule for saved answers asks.
- **`FETCH` is the main server's fetch boundary**, provided by `WalkingRouteModule`, as `FETCH` is the worker's under `PageFetcher`. `startApp` replaces it in every test file with a call that fails, unless the test gives a `KakaoStub`, so that no test can reach Kakao.
- Nothing is stored, so the ticket has no migration.

### Tests (2026-10-02)

At the seam agreed with the user, a User's route, with Kakao replaced at the fetch boundary: `main-server/test/walking-route.e2e-spec.ts`, 21 tests.

- With the saved answers of the real calls: the route from the main gate to the central library, its 30 points, distance and duration; the one request Kakao gets, with the longitudes as `x`, the latitudes as `y` and the key; `SAME_POINT` as no route.
- With answers shaped like them: the other five statuses, each the saved `SAME_POINT` answer with its status changed, as no route; and, after Kakao's error documentation (external-sources.md §7.5), a used-up quota (429), a refused key (401), a status Kakao does not list, a page instead of JSON and Kakao unreachable, each 502.
- No cache: the same walk asked twice asks Kakao twice, and the answer carries `Cache-Control: no-store`.
- A request without an access token gets 401, and five kinds of invalid coordinates get 400 naming the field; none asks Kakao.
- Each test was written first and seen to fail, except these, which earlier slices had already made true: the 401 (the global guard), a missing latitude and a longitude that is not a number (refused by the first form of the query schema), and the page instead of JSON, added after the 502.
- The setting's startup check has no test, since the route is the one seam agreed. It was checked by hand with the built server and throwaway settings: without the key it stops with `Config validation error: KAKAO_REST_API_KEY: Invalid input: expected string, received undefined`, and with an empty one with `KAKAO_REST_API_KEY: Too small: expected string to have >=1 characters`.
- The whole suite passes: 21 files and 252 tests. `lint`, `format:check` and `typecheck` pass.
