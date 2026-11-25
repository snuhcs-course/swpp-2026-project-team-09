# 75: Choosing a place draws its walking path once, with no straight line first

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: #577
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

Choosing a Restaurant draws a straight line that turns into the walking path a moment later, every time, even for a place chosen a moment before.

- The app asks the main server's `GET /walking-route` (Kakao's walking route) for each walk of the scene on screen, and kept a path only while its scene was drawn (`gcTime: 0` in `use-answer-walks.ts`). A place chosen again asked again.
- While a path was on its way, the walk's straight line stood in for it.

## What to build

1. A walk's path is held, once per pair of ends, only while the answer that draws it is on screen, in the running app's memory and never on disk. Kakao's operating policy allows caching only to improve the User's experience, kept current, and the API's free quota is 1,000 calls a day.
   - Choosing between the answer's places, going back to one already seen, and the keyboard taking the card away and back reuse its paths: no request, and the path is drawn at once.
   - A new answer and the answer closed (✕, back, a layer, route guidance) drop the paths of the one before. Shown again, it asks again.
   - The same holds for a Lookup's walks and for a received invitation's or made Quest's card.
2. A walk's line is not drawn while its path is on its way; it appears when the path comes. A failure, or no path found, draws the straight line as before, and so does a request held while the phone is offline.
3. The minutes pills and the marks do not wait for the path.
4. Nothing is asked ahead: another candidate's walks are asked only when it is chosen.
5. The everyday route (`use-walking-route.ts`) does not share the fault: it draws nothing until its route comes, and each "길찾기" asks from where the User is then. It is unchanged.

## Acceptance criteria

- [x] A place of the answer on screen chosen again asks `GET /walking-route` nothing and draws its path at once.
- [x] The answer closed and shown again asks again.
- [x] While a walk's path is on its way, no line is drawn for it, a shuttle leg's walks included.
- [x] A failed request and no path found draw the straight line.
- [x] ADR 0010, the comments, and the docs say a path is held only while the answer that draws it is on screen.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

Built in PR #577. A walk's query keeps its path with no timeout, and `useWalksHeldWhile`, called in the map view after the hooks that ask for walks, drops every path no scene draws once the answer, the Lookup, or the card on screen changes or closes. `useWalkPaths` also gives the lines still on their way, fetching with no answer yet, which `linesOn` and a shuttle leg's lines leave out until their paths come. ADR 0010, the READMEs, and P15 ticket 56 say a path is held only while the answer that draws it is on screen.

### Agent usage (2026-11-26)

- Agent time: about 25 minutes in one session, the first read of the fault included (an estimate).
- Tokens: input 15,253,079 (cache reads 15,081,071, cache writes 171,854, uncached 154); output 49,724. One subagent, included.
