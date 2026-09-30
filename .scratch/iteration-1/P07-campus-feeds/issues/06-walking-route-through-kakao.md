# 06: Walking route through Kakao

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User asks for a walking route between two points on campus and the app draws the line. The main server calls Kakao's walking route API with the server's key and returns the line, the distance and the duration. When Kakao answers with one of its failure statuses, the app is told that there is no route, so that it never draws a wrong one. A route is never stored or cached, because Kakao's policy does not allow it, and Kakao is called only when a User asks.

## Acceptance criteria

- [ ] The Kakao REST API key is the setting `KAKAO_REST_API_KEY` in the main server: in the settings schema, in the example settings file with a comment saying what it is and where it comes from, and in the test settings. The server refuses to start without it. The person fills the value into their own settings file, as `.scratch/research/external-sources.md` describes; the agent asks for it and waits.
- [ ] A User's route takes a start and an end as coordinates and returns the route as a list of coordinates, the distance in metres and the duration in seconds. It needs a User's access token, so that the daily quota is not open to anyone.
- [ ] A request with missing or malformed coordinates gets 400 naming the field.
- [ ] Each of Kakao's failure statuses, such as no route found, the two points being the same or a point too far from a road, is returned to the app as "no route", in one form the app can tell from a success.
- [ ] A failure to reach Kakao, a timeout, or a quota answer is returned as a server-side error distinct from "no route", so that the app can tell "try again later" from "no route exists".
- [ ] No route is stored, cached or written to a log.
- [ ] Kakao is called through one boundary that the tests replace with saved responses. The real API is never called in tests.
- [ ] The API is called once by hand with the real key, along the check in the research document, to confirm the key and the response format. The outcome is recorded under `## Comments` in this ticket, and the saved responses used in the tests come from real answers.
- [ ] The README documents the route and that it counts against Kakao's daily quota.
- [ ] Tests through the API: a successful answer gives the line, the distance and the duration; each failure status gives "no route"; malformed coordinates get 400; an unreachable Kakao gives the server-side error; a request without a User's access token gets 401.
