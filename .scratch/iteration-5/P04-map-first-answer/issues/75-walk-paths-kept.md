# 75: Choosing a place draws its walking path once, with no straight line first

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet.
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

Choosing a Restaurant draws a straight line that turns into the walking path a moment later, every time, even for a place chosen a moment before.

- The app asks the main server's `GET /walking-route` (Kakao's walking route) for each walk of the scene on screen, and kept a path only while its scene was drawn (`gcTime: 0` in `use-answer-walks.ts`). A place chosen again asked again.
- While a path was on its way, the walk's straight line stood in for it.

## What to build

1. A walk's path stays in the running app's memory once per pair of ends: for 30 minutes after its last scene leaves the screen (`WALK_KEPT_MS`), and never on disk. Choosing a place again within that time asks nothing and draws its path at once. Kakao's policy keeps a route from being stored; a path is never stored beyond the running app's memory.
2. A walk's line is not drawn while its path is on its way; it appears when the path comes. A failure, or no path found, draws the straight line as before, and so does a request held while the phone is offline.
3. The minutes pills and the marks do not wait for the path.
4. Nothing is asked ahead: another candidate's walks are asked only when it is chosen.
5. The everyday route (`use-walking-route.ts`) does not share the fault: it draws nothing until its route comes, and each "길찾기" asks from where the User is then. It is unchanged.

## Acceptance criteria

- [x] A place chosen again within 30 minutes asks `GET /walking-route` nothing and draws its path at once.
- [x] While a walk's path is on its way, no line is drawn for it, a shuttle leg's walks included.
- [x] A failed request and no path found draw the straight line.
- [x] The comments and docs say a path is never stored beyond the running app's memory.
- [x] No native file changes; lint, format, and types pass on the app.
