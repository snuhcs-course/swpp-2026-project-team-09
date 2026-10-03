# 26: Server: the Place at a position, and the code on a refused refresh

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Two small additions that the app waits for. 윤유상 builds them.

The main server already tells which Place a position is in or near, for its own features. A route serves that lookup to the app, which uses it to name a spot a User chose on the map (ticket 21).

A refresh refused because another sign-in ended the Session answers a plain 401 today, so an app whose access token has expired shows the sign-in screen without saying why. The refusal carries the code that the other routes already give.

## Acceptance criteria

- [ ] A route answers, for a latitude and a longitude and with a User's access token, the main server's own lookup: the Place and whether the position is inside it or near it, or nothing when no Place is within reach.
- [ ] Coordinates that are not a latitude and a longitude get 400 with the field named.
- [ ] A refresh token of a Session that a sign-in on another phone ended gets 401 with the code `SESSION_REPLACED`. Every other refused refresh keeps its one plain answer, so that the answer still does not tell which check failed.
- [ ] Tests at the API level: a position inside a Place, near one and far from all; invalid coordinates; a refresh after a replacing sign-in, and a refresh refused for another reason.
- [ ] The main server's README records the route and the refresh's new answer.
