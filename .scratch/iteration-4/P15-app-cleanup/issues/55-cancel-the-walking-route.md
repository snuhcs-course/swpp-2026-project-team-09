# 55: A tap on the map clears the walking route

Parent: [P15 spec](../spec.md), item 55; a tester's report of 2026-11-18 using the released app: "길찾기 취소 기능 (선이 안 사라짐)" (after a route is shown there is no way to cancel it, and the line stays)
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: none

Native files: none. Releases: an app OTA update only (no main-server Release, no native Release). No board: the canvas draws no way to cancel a route, so the pull request shows no boards.

## What happens now

- The everyday map has one walking route (`mobile/src/screens/main/use-route.ts`). It is drawn by 길찾기 on a thing's card (`main-screen.tsx:155`), by 길찾기 on a building's card (`place-card.tsx:188`), by a Lookup's 길 안내 in the answer frame (`useChatSheet`'s `start`, `chat-sheet.tsx:104`), and once by itself toward the User's next Quest when the screen first has a position on campus (`use-route.ts:62-66`).
- It is dropped only when the screen is left: it loses the focus or closes (`useLeaving`, `use-route.ts:67-71`). No ✕, tap, back or "새 대화" drops it. `useLines` adds `route.line` whenever it is not null (`main-screen.tsx:209`).
- `useWalkingRoute` already has a `clear`, whose comment expects a dismiss that was never built ("A screen calls it when the route is dismissed or the screen is left", `features/map/use-walking-route.ts:23`).
- A tap on the map is told in JavaScript (`tutorial/use-map-tap.ts`): a short touch of one finger that no marker's press keeps. The building press uses it (`usePlaceTap`, `use-pressed-place.ts:53`) and asks `GET /places/at` for the Place under it (`:73`), opening its card when there is one and doing nothing when there is none.

## What changes

- **A tap on empty map clears the walking route.** Empty means: a tap the building press counts (no marker, face or the User's dot kept it; a card, a control, the lists and the AI input are not on the map's View, so their presses never reach it), on the everyday map, where `GET /places/at` finds no Place or cannot answer. The route has no label of its own to tap.
- The clear is one named callback in the existing tap path: `usePressedPlace` takes `onEmptyTap`, which `usePlaceTap` calls where it would have done nothing; `useMapView` passes `clearRoute` there only while the everyday map is shown; `MainScreen` passes `route.clear`. No second touch watcher.
- `useRoute` gives `clear`. It drops the line, whoever drew it, a failure toast still to come for it, and the opening route if it was still to come.
- **The route drawn by itself** toward the next Quest is cleared by such a tap too, and is not drawn again: it is drawn once each time the screen starts, and the screen stays mounted while the app runs, so after a tap it comes back only when the app starts again. A new position, the next Quest changing, or leaving and coming back to the tab draws nothing (leaving already dropped it for good). 길찾기 and 길 안내 draw again as before.

## What stays as it is

- **A tap that opens a card leaves the route.** A marker's or face's press opens its card, and a tap on a building opens the Place's card, as before, and the route stays under it. That card's own 길찾기 then replaces the route, so the tap never takes away a route the User is about to replace or still follows while reading about a building. A long press is no tap and does nothing, as before.
- **Another 길찾기 or 길 안내 replaces the route**, as before (one route at a time).
- **"새 대화" and closing the answer frame leave the route.** Reading the code, the route a Lookup's 길 안내 draws is the screen's one route, started through the same `routeTo` as a card's 길찾기, and 길 안내 leaves the frame the moment it starts (`useChatSheet`), so the route outlives the answer by design. While the frame is shown again the route gives way to the answer's drawing, and it comes back when the frame closes, whether by ✕ or by "새 대화". It goes, like any other, by a tap on empty map.
- While an answer, a Lookup, a received invitation's way or a made Quest's card is drawn, a tap clears nothing: the route is not drawn then, and those taps belong to them ("여기면 어때?" keeps its own building press).
- **The keyboard.** No `Keyboard.dismiss` is added. With TaeHyun79's keyboard fix (#361, P15-09), while the AI input's keyboard is up a scrim over the map takes the first press and only puts the keyboard down; the next tap on empty map clears the route. Without #361 the map takes the tap as it does today.
- Leaving the screen still drops the route.

## Acceptance criteria

- [x] After 길찾기 on a card draws the route, a tap on empty map removes the `walking-route` line, and no card opens.
- [x] The route drawn by itself when the screen opens is removed by a tap on empty map, and does not come back with a new position.
- [x] A tap where `GET /places/at` fails also removes it.
- [x] A marker's press (with its touch) opens its card and leaves the route; `GET /places/at` is not asked.
- [x] A tap on a building opens the Place's card and leaves the route.
- [x] After a tap cleared it, 길찾기 draws a route again.
- [x] No `Keyboard.dismiss` and no second touch watcher.
- [x] Tests, by ADR 0007: an integration test over the mocks (`main-route-clear.integration.test.tsx`) for each criterion above; the building press, route and tutorial pin integration tests still pass.
- [ ] On a phone: 길찾기, then a tap on an empty part of the map clears the line (left to a person, see the pull request).

## Comments

### Notes from the implementation (2026-11-18)

- The clear runs when `GET /places/at` has answered (or failed), not at the touch: a tap only knows whether it lands on a building once that answer comes, so the line goes about a round trip after the tap.
- `MainScreen` hands the clear to `useMapView` as `clearRoute` in `Everyday`, next to `lines`, both from `useRouteLines` (formerly `useLines`), so that `MainScreen` stays within the 50-line function limit.
- A tap with a card open clears the route too when it lands on empty map; the card stays open, as before.
- With #359 (the 새내기 튜토리얼 on the map) a trial merge (`git merge-tree`) gives three one-line conflicts. In `main-screen.tsx`, the import from `./use-map-view` takes both names (`type Everyday, type MapView`), and where #359 moves `MainScreen`'s hooks into `useMainParts` and calls `useLines`: there `const lines = useLines(shuttle, route)` becomes `const { lines, clearRoute } = useRouteLines(shuttle, route)` and `clearRoute` joins the `Everyday` object it passes to `useMapView` (`{ me, pin, lines, clearRoute, cards, selection, guide }`). In `use-map-view.ts` both add a field to `Everyday`'s destructuring in `useMapView`'s parameters; that line takes both (`{ me, pin, lines, cards, selection, clearRoute, guide }`). With #361 (the keyboard scrim) and with #362 (ticket 56) the trial merge is clean.
- The phone check is left to a person: press 길찾기 on a Quest's card, then tap a spot of the map with no building or marker: the dotted line goes. Tap a marker or a building: its card opens and the line stays. Open the app on campus with a Quest today: the line to it shows; tap empty map: it goes and does not come back while walking.

### Agent usage (2026-11-18)

Estimates, for this ticket alone:

- Agent time: about 1 hour, in one session of one Opus 5.5 agent, most of it waiting on single-file Jest runs.
- Tokens: output about 30,000. Input about 6 million: about 5.8 million cache reads, 0.2 million cache writes and a few thousand uncached.
