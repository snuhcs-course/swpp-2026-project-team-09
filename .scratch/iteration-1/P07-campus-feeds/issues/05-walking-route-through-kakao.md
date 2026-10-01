# 05: Walking route through Kakao

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User asks for a walking route between two points on campus, and the app draws the line. The main server calls Kakao's walking route API with the server's key and returns the line, the distance and the duration. When Kakao answers with one of its failure statuses, the app is told that there is no route, so that it never draws a wrong one. A route is never stored or cached, because Kakao's policy does not allow it, and Kakao is called only when a User asks.

The API has not been called yet, so the ticket starts with one real call: the answers the tests use come from it, not from the documentation. The key is a person's to supply. The agent adds the setting, asks for the value and waits, as P05's note on keys says.

## Acceptance criteria

- [ ] Before the route is built, one real call is made by hand with the key, from the main gate to the central library, and one that Kakao refuses, such as the same point twice. The answers, without the key, are saved as the tests' answers and recorded under Comments, with whatever differs from P05's note.
- [ ] A User's route takes a start and an end as coordinates and returns the line as a list of coordinates, the distance in metres and the duration in seconds. It needs a User's access token. Coordinates that are not a latitude and a longitude get 400 with the field named, before Kakao is called.
- [ ] Each of Kakao's failure statuses (`SAME_POINT`, `START_LINK_NOT_FOUND`, `END_LINK_NOT_FOUND`, `TOO_MANY_SEARCH_LINK`, `TOO_FAR_AWAY`, `ROUTE_RESULT_NOT_FOUND`) is answered as "no route", with the status named. An answer that is neither a route nor one of those, such as a quota or key error, is an error the app can tell apart from "no route".
- [ ] The REST API key is a setting with the name P05 chose. It is listed in the example settings file with a one-line comment on where it comes from, the server stops at startup and names it when it is missing, and the value never appears in the code, the tests or the ticket.
- [ ] Nothing about a route is stored or cached, and Kakao is called once per request, only on a User's request.
- [ ] Tests never call Kakao: the call is replaced at the fetch boundary with the saved answers of the real calls, and with answers shaped like them for the failure statuses that were not called and for an error. A request without a User's access token is refused, and invalid coordinates get 400.
- [ ] The main server's README records the route, the "no route" answer and the key.
