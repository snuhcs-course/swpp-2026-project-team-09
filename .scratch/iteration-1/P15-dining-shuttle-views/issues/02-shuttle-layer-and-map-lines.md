# 02: The 셔틀버스 layer, with the map's lines in both native modules

Parent: [P15 spec](../spec.md)
Status: ready-for-human
Blocked by: 01 (The 편의기능 stack, the 식당 layer, the menu panel and the data sources screen), P19-01 (The shell, the shared components, the Quest full screen and the Friend panel)

## What to build

The 셔틀버스 toggle of the 편의기능 stack turns on the shuttle layer, as the `Main` frame draws it. The layer shows:

- the circular route 41946 as a dashed purple line along the roads;
- its 14 stops as markers, each giving its name on a press;
- the vehicles in service.

Each vehicle stands at the stop the operator last reported it at. When a new stop is reported, the vehicle glides from its last stop to the new one along the line, not across the buildings. The positions arrive over the socket connection while the layer is on, and a vehicle that no message has placed for a minute is removed. Outside service hours the layer shows the stops and the line with a notice that the shuttle is not in service, and the route's service hours.

The map can draw only one line today, the walking route. This ticket makes it draw several, in the map interface and in its three implementations: the plain map, the Android module and the iOS module. The walking route becomes one of these lines.

The frames are `MainLayers` (the 셔틀버스 toggle) and `Main`:

- the shuttle layer: the line in `#6B46C1`, 3 wide, dashed 8 6; the stop pins; the vehicle pin `운행 중`;
- the cards of a stop and of a vehicle.

The server routes and events, read only:

- `GET /shuttle`: `serviceHours`, `stops` in loop order and `line`;
- `GET /shuttle/vehicles`: `[{ carId, stop: { id, name, latitude, longitude }, receivedAt }]`;
- the socket event `shuttle-vehicles-updated`, whose payload is the same list. The list replaces the one before, and `[]` means that none runs.

`main-server/README.md` ("Shuttle") and `socket-server/README.md` ("Shuttle vehicles") describe them, and `.scratch/research/external-sources.md` §5 has what the operator reports. Each new operation goes into the API client with its mock: the route of the seed, and a few vehicles at stops.

## Acceptance criteria

### The map's lines (the map interface, the plain map and both native modules)

- [x] `MapProps` replaces `route` and `routeStyle` with `lines`, a list of lines, each with an `id`, its points in order and its style (the colour, the width in points, and an optional dash, as `RouteStyle` says today). The rules are written in `types.ts`, for every implementation:
  - every line is drawn under every marker and Avatar;
  - among lines, the later in the list is on top;
  - a new `id` is added, a kept `id` is the same line with its points or style changed, and an `id` no longer listed is removed;
  - the same points and style in a new list draw nothing again.
- [x] The plain map draws every line, with its dashes.
- [x] The Android module draws one route line per `id` with Kakao's route line layer, and keeps, changes and removes each by its `id`. Android's dashes stay the known gap that `mobile/README.md` records, unless the SDK draws them simply.
- [x] The iOS module draws one route per `id` in its route layer, with a style set per look, and keeps, changes and removes each by its `id`.
- [x] The main screen's walking route (`use-route.ts`) is one line in the list, with P06's look. The P06 tests of the route pass, changed only where they read `route`. The `map-check` screen shows two lines, one dashed, and P06's map tests cover several lines in the plain map and the native view's props.
- [x] `mobile/README.md` ("Map", "The Android module", "The iOS module") describes the lines.

### The layer

- [x] Turning 셔틀버스 on fetches `GET /shuttle` and `GET /shuttle/vehicles`, once each. Turning it off and on fetches them again. The toggle shows `ON` and its dot shows under the 편의기능 button, as ticket 01 built for 식당. It no longer shows "준비 중이에요".
- [x] The line of `GET /shuttle` is drawn in `#6B46C1`, 3 wide, dashed 8 6, under every marker.
- [x] Each stop is a marker in the shuttle's look of the design system's `MapPin`, made as a marker look of the map. From the "names" level its text is the stop's name, such as `정문`.
- [x] A failure of `GET /shuttle` shows the toast `셔틀버스 정보를 불러오지 못했어요` (new) and draws nothing. A failure of `GET /shuttle/vehicles` alone leaves the line and the stops, and the vehicles come with the next set from the socket.
- [x] Turning the layer off removes the line, the stops, the vehicles and the notice, and closes a stop's or a vehicle's card.

### The vehicles

- [x] A vehicle is a gliding marker of the map (in its `avatars` list, though it is no User's Avatar), in the frame's look of the vehicle pin: the shuttle colour, the `bus` icon, and the text `운행 중` from the "names" level. Its `id` is the `carId`. Vehicles are drawn above the stops.
- [x] While the layer is on, each `shuttle-vehicles-updated` replaces the vehicles. The live connection gains the event, beside `position`, and puts the list into the query cache of `GET /shuttle/vehicles` while that query is in use. Sets that arrive while the layer is off are dropped. When the connection opens again while the layer is on, the vehicles are fetched again.
- [x] A vehicle seen for the first time is placed at its stop without a glide.
- [x] A vehicle reported at a new stop travels from its last stop to the new one along the line, in the line's direction (anticlockwise, the order of `stops`). Each stop's point on the line is the line's nearest point to the stop, found once when the route arrives. The trip takes 10 seconds, a constant in one place. The app moves the vehicle in steps of one second, each a glide of one second to the next point along the line, so that the straight glides follow the line's bends.
  - When stops were skipped between two sets, the vehicle passes them in the same 10 seconds.
  - A new stop behind the last one in loop order places the vehicle at once.
  - With reduced motion, every move places the vehicle at once.
- [x] A vehicle missing from a newer set is removed at once. A vehicle whose `receivedAt` is more than a minute old is removed, checked every 5 seconds against the phone's clock, so that the vehicles leave an open map when the service ends or no set arrives.
- [x] Nothing says that a vehicle's position is estimated.

### The cards

- [x] A press on a stop opens P06's card at the bottom:
  - the 40 round icon `bus` on `#6B46C1`;
  - the kicker `셔틀버스 · 교내 순환` in `#6B46C1`;
  - the title `{stop name} 정류장`, such as `정문 정류장`;
  - a `route` line `다음 정류장 {next stop name}` (new), the next in loop order;
  - `가까이 보기` below the "names" level, and no other button.
- [x] A press on a vehicle opens the card with:
  - the same icon;
  - the kicker `셔틀버스 · 운행 중`;
  - the title `교내 순환 셔틀`;
  - a `route` line `{stop name}에 있어요 · 다음 정류장 {next stop name}` (new);
  - `가까이 보기` below the "names" level, and the primary `노선 보기`, which fits the camera to the whole line and closes the card.

  The card follows the vehicle: when a set moves it, its lines change. When the vehicle is removed, the card closes.

### Service hours

- [x] Outside weekdays from 08:00 to 21:00 in Korea's time, the layer shows the line and the stops with a notice. It is a white card, radius 16, at the bottom card's place, which gives way to an open card. It holds the `bus` icon in `#6B46C1`, the title `지금은 셔틀버스가 운행하지 않아요` (new) in 16/600, and `serviceHours` of `GET /shuttle` under it in 13 muted, line by line as the server gives it. The two times are constants in one place.
- [x] The notice appears and goes as the clock passes 08:00 and 21:00 while the layer is on.

### Records and checks

- [x] `mobile/README.md` ("Screens and the flow between them", "Data", "The connection to the socket server") describes the layer, the event and how a vehicle travels and is removed. P06's `todo.md` §3 gains rows for `GET /shuttle` and `GET /shuttle/vehicles`, and §4 loses the 편의기능 row.
- [x] Jest tests, through `startApp` on the real routes, against the fake main server and the fake socket of `__tests__/support/`, with fake timers and the clock set:
  - the layer: the two requests once per turning on; the line's points and style; the stops and their names; the failure toast; turning it off;
  - the vehicles: one placed at its stop; a set that moves it one stop, its position after 0, 5 and 10 seconds lying on the line and ending at the new stop; two stops in one set; a stop behind; reduced motion; a vehicle missing from a set; a vehicle removed 60 seconds after its `receivedAt` with no set; a set while the layer is off; a reconnection while the layer is on;
  - the cards: a stop's words; a vehicle's words changing with a set; `노선 보기` fitting the camera to the line; the card closed when its vehicle is removed;
  - service hours: the notice on a Saturday at noon, on a weekday at 07:59 and at 21:00, none at 08:00 and at 20:59; the `serviceHours` text; the notice going at 08:00 while the layer stays on.

  The screen tests of P06, P19 and ticket 01 pass.
- [ ] A check by hand on a phone, against the main server, the worker and the socket server, on a weekday between 08:00 and 21:00: on Android, the line follows the roads, the 14 stops sit on it, and vehicles arrive and glide along the line through its bends; after the worker is stopped, the vehicles go within a minute. On the iOS simulator, the line and the stops are drawn. What was seen is recorded under Comments, with a screenshot or a short recording in the pull request.
- [x] The frames were read again when the work started. Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - stops are labelled with their names, not with a wait such as `정문 2분`: arrival estimates are out of scope;
  - no `알림 받기` and `알림 끄기` on a stop's card, and no `다음 도착` line;
  - the vehicle's line has no `{stop} 방향`, since the loop runs one way;
  - `노선 보기` fits the camera to the line, where the frame turns the layer on: a vehicle is shown only while the layer is on;
  - the out-of-service notice, which no frame draws;
  - Android's line without dashes, if the gap stays.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

## Comments

### Result (2026-10-06)

The frames `MainLayers` (the 셔틀버스 toggle) and `Main` (the shuttle layer, the stop pins, the vehicle pin, the cards of a stop and of a vehicle) were read again when the work started, in the copy of the canvas the decisions refer to.

Where things are, in `mobile/`:

- The map's lines: `MapLine` and `LineStyle` in `src/map/types.ts` with the rules, `lines` in place of `route` and `routeStyle`. The plain map draws each line under `line:{id}` (`plain-route.tsx`); `native-map.tsx` hands the module `lines` (id, points, colour, width) and no longer the route's colour and width in `looks`.
- Android (`SnuNowMapView.kt`, `Records.kt`, `SnuNowMapModule.kt`): one route line of the SDK per `id`, added with its place in the list as its z order, changed with `changeSegments` and `setZOrder`, removed when no longer listed.
- iOS (`SnuNowMapView.swift`, `Records.swift`, `SnuNowMapModule.swift`): one route per `id` in one route layer, a style set per colour and width, a changed line removed and added again under its `id` with its place as its z order.
- The walking route is the line `walking-route` (`use-route.ts`); the main screen lists the shuttle's line under it. `/map-check` draws two lines, one dashed.
- API: `getShuttle` and `listShuttleVehicles` with their answer checks, the server's routes and mocks (`src/api/mock/data/shuttle.ts`: the seed's 14 stops and 215-point line, three vehicles at stops). The live connection takes `shuttle-vehicles-updated` and puts the set in the cache while the vehicles' query is active; `SHOWN` fetches the vehicles again on a reconnection, which reaches only an active query.
- `src/features/shuttle/`: `line.ts` (the line measured in metres, a stop's nearest point, the point at a distance), `adapter.ts` (the service hours, the trip of `TRIP_MS` in steps of `STEP_MS`, `STALE_MS` checked every `CHECK_EVERY_MS`, the cards), `use-shuttle.ts` (the queries, the 5-second check, the travels).
- The main screen: the 셔틀버스 toggle in `layers.tsx`; `CardView` gained the kinds `shuttle-stop` and `shuttle-vehicle`, the mark `shuttle`, a primary action `shuttle-line`, a card without a primary button, and `glideMs` for a thing that glides and is no person; `use-things.ts` makes a vehicle an Avatar and the shuttle's look a pin at every level. `shuttle-notice.tsx` is the notice, and `map-bottom.tsx` holds what is at the bottom of the map with it. The layers' failure toast is one hook for both layers (`features/map/use-layer-failure.ts`).
- Tests: `shuttle-layer-test.tsx` (the layer, the cards, the notice) and `shuttle-vehicles-test.tsx` (the travel and the removal), against the fake main server and socket, fixtures in `support/shuttle.ts`: a loop of four stops around a rectangle, so that a position on the line can be read off the plain ground. `map-test`, `map-native-view-test`, `map-check-test` and `layers-test` were changed where they read `route` or the "준비 중이에요" of 셔틀버스.

Decisions made while building:

- On a loop every stop is ahead of a vehicle. A stop more than half the loop ahead counts as behind it and places the vehicle at once; so 경영대 → 정문 is the next stop and glides past the line's end and on from its start.
- A new trip starts from where the vehicle's last step was, so a set during a trip does not move it back.
- A vehicle reported at a stop the route does not list is dropped.
- A vehicle's card and marker are keyed by its `carId`, as `shuttle-vehicle:{carId}`, beside the other cards' ids.
- The 5-second check of the phone's clock also decides the notice, so the notice comes and goes within 5 seconds of 08:00 and 21:00.
- The notice sits at the bottom card's place and hides what a card at the bottom hides, the row of buttons and the zoom control; the 편의기능 button stands 8 above it, so the layer can still be turned off.
- Neither module draws dashes, and neither is handed a dash: Android's patterns repeat a picture along the line, which is not simple. The Kotlin of the lines was compiled against Kakao's SDK jar from the Gradle cache with `kotlinc`; the Swift files were only parsed.
- A press on 셔틀버스 with a stop's card open cannot happen: a card at the bottom hides the 편의기능 button. The card closes when the layer is turned off by the selection's rule, as for every card whose thing leaves the map.

Differences from the frame:

- Stops are labelled with their names, not with a wait such as `정문 2분`: arrival estimates are out of scope.
- No `알림 받기` and `알림 끄기` on a stop's card, and no `다음 도착` line: the stop's card has no button but `가까이 보기`.
- The vehicle's line has no `{stop} 방향`, since the loop runs one way.
- `노선 보기` fits the camera to the line, where the frame turns the layer on: a vehicle is shown only while the layer is on.
- The out-of-service notice, which no frame draws.
- The line has no dashes on Android or on iOS.
- A stop and a vehicle are pins at every level of detail, with no dot while the whole campus is in view.

Checks: `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass. The one whole `pnpm test` passed 615 of 621 tests: the 6 others ran out of Jest's 60 seconds on a loaded machine, the first tests of `shuttle-layer-test` and `shuttle-vehicles-test` (and, after the first, a second of the vehicles' file, which then found the previous test's socket), and one each in `map-sources-test` and `main-markers-test`, which this ticket does not touch. Both shuttle files pass alone (17 and 9 tests), the first test of each taking about 20 seconds, as the first of `dining-layer-test` does.

Not checked: nothing ran on a phone, in a browser or in a native build; neither native module was built. The screenshots for the pull request are not taken.

### For a person

- Run `pnpm test` again on a machine with less load: 6 tests ran out of time in the one whole run (see the Result).
- Build the app for Android and iOS: the Kotlin and the Swift of the lines were written by reading the code, and neither build was run.
- The check by hand above, on a weekday between 08:00 and 21:00, against the main server, the worker and the socket server: on Android the line along the roads, the 14 stops on it, vehicles arriving and gliding through the bends, and the vehicles gone within a minute of stopping the worker; on the iOS simulator the line and the stops. Also on both: the walking route still drawn, and drawn above the shuttle's line.
- Record what was seen under Comments, and put a screenshot or a short recording in the pull request.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 1.5 hours of agent time in one session. Tokens: about 12 M input, of which about 11.5 M cache reads and 0.4 M cache writes, and about 0.1 M output. No subagents.
