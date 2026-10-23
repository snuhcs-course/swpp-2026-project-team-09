# 04: One marker for everything at one place

Parent: [P20 plan](../plan.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

When several things stand at the same place on the main map, their markers lie on top of each other. Only the top one can be pressed. A Global Event and a Party's Quest at the same building show this: one hides the other, and the hidden one can never be opened. After this ticket, everything at one place is reachable from one marker.

### Which markers group

- Group every place marker that stands at exactly the same coordinates:
  - Global Events,
  - Parties, and Shared Quests drawn as Parties,
  - a Quest the User holds alone,
  - restaurants, while the dining layer is on,
  - shuttle stops, while the shuttle layer is on.
- Markers that are only near each other are not merged.
- People (Friends, Party members, the User) and shuttle vehicles are Avatars. They move, so they stay out of the grouping and keep being drawn on top.

### What the group looks like

- **The marker.** One marker at the place: the usual circle, with a small circle inside it for each kind that is there, in that kind's colour and icon. For example, one for 행사 and one for 파티.
- **One kind only.** Where only one kind stands but more than one of it, the marker stays as it is today. Several Global Events at one point already show one pin with their count.
- **The card.** A press opens a card for the place. It has a chip for each kind there (행사, 파티, 식당, 셔틀 …) and lists the things of the chosen kind. A press on a row opens that thing's own card, as a press on its own marker would.
- **Selection.** While one thing in the group is selected, the group's marker is drawn selected, as the Global Event point is today.

### Today and where to start

- Only Global Events are grouped, into an event point whose card lists them, and each grouped event draws no marker of its own.
- Generalise that grouping to all place markers, running on the full list of the map's cards: the map's, the restaurants' and the shuttle's together.
- Plan item 3 says where each part lives.

## Acceptance criteria

- [x] **One marker per place.**
  - With a Global Event and a Party's Quest at the same coordinates, the map shows one marker there, with one small circle for each of the two kinds.
  - The same holds for any mix of the kinds above, including restaurants and shuttle stops while their layers are on.
  - Turning a layer off takes its kind out of the group, and a group left with one thing shows that thing's own marker again.
- [x] **Everything is reachable.**
  - Pressing the group's marker opens the place's card with a chip for each kind there.
  - Choosing a chip lists that kind's things, and pressing one opens its own card with its usual actions, such as 길찾기, 파티 열기, 참여하기, 메뉴 or 셔틀 노선.
- [x] **Unchanged where nothing overlaps.**
  - A thing alone at its place keeps its own marker and card.
  - People and shuttle vehicles are drawn and pressed as before.
  - Several Global Events at one point and nothing else still show one pin with their count.
- [x] **Screen reader.** The group's marker reads what is there, such as "행사 1개 · 파티 1개 · 301동".
- [x] **Tests:**
  - grouping: things at the same coordinates become one group across all place kinds, Avatars never join one, and a group of one is no group
  - the main screen: pressing a grouped marker shows the chips, and choosing a row opens that thing's card
  - the existing map, main-screen and event-point tests pass, updated where the event point's behaviour has moved into the general grouping
- [x] Checked on an Android phone with real overlapping things, or with mock data that puts them at one place. Write what was and was not checked under `## Comments`.

## Comments

### What was built (2026-10-22)

- **Grouping** in `mobile/src/features/map/place-groups.ts`, which replaces `event-points.ts`.
  - `groupedByPlace(cards)` runs in `useCards` of `screens/main/main-screen.tsx`, over the map's, the restaurants' and the shuttle's cards together. `toCards` no longer groups.
  - Every place marker at exactly the same coordinates joins: Global Events, Parties, Shared Quests, a Quest held alone, restaurants and shuttle stops. People and shuttle vehicles never join.
  - A group's card stands where its first thing was. Each thing keeps its card, marked `within` the group, so it draws no marker of its own but a row can still open it.
  - The group's id is `place:<lat>,<lng>`, so it stays the same while things come and go.
  - **One kind only** gives that kind's pin with the count, as the event point did ("공식 행사 2개 · 301동 대강당").
  - **Several kinds** give the new mark `{ type: 'group', kinds }`, read as "행사 1개 · 파티 1개 · <place>".
  - The place is named from the first thing that says where it is: an event's place, then a restaurant's Place, a Party's or Quest's place, then a stop.
- **Marker.** A new `group` look in `map/marker-looks.tsx`, drawn by `MapGroupPin` and `MapGroupDot` in `design-system/map-group-pin.tsx`.
  - Close up, it is the pin's white round with a small round per kind, in the kind's colour and icon from `map-pin`'s table. Three or more kinds widen it into a pill.
  - From far away, it is a white pill of coloured dots.
  - `useThings` draws it. A selected member draws the group's marker selected, as before.
- **Card and selection.** `screens/main/card-choices.tsx` holds the card's rows, moved out of `card.tsx`.
  - With several kinds it shows a chip per kind ("행사 1", "파티 1", …) and lists the chosen kind.
  - A row opens that thing's own card through `selection.select`. `use-selection.ts` did not change.
  - The head of a group's card shows the same small rounds.
- **Tests.**
  - New: `__tests__/features/place-groups-test.ts` and `__tests__/main-place-group-test.tsx`. The second uses the fake server: a Global Event at the point of the Shared Quest 저녁 약속 at 학생회관, plus 학생회관식당 when the 식당 layer is on.
  - `marker-looks-test.ts` gained the group look names.
  - `dining-layer-test.tsx` now answers no Quests, because its 저녁 약속 would join 학생회관식당. Those tests are about a restaurant alone.
  - `main-event-point-test.tsx` passes unchanged.

### What was checked, and what was not

- **Checked:** `pnpm lint`, `pnpm typecheck` and `pnpm format:check` in `mobile/` are clean. Typecheck was run with the locally generated `expo-env.d.ts` and `.expo/` moved aside. The whole mobile suite passes: 149 suites, 1,319 tests and 1 todo. The new main-screen tests fail on `origin/2.0/Main` and pass here.
- **Not checked on a device.** Nothing in this ticket was tried on a phone, so "One marker per place" stays unticked: the grouping is verified in tests, but the look of the small rounds has not been seen. The phone check is deferred until after ticket 06, against real data on the Dev Server; the app's mock data was left as it is.
- **Steps for the phone:**
  1. On the Dev Server, find a Global Event whose point is a Place, such as one at 301동, or note one's place.
  2. Make a 파티 whose 일정 place is that same Place, picked from the Place list so that the coordinates match exactly.
  3. On 지도, check there is one marker at that point with a small round for 행사 and one for 파티, read as "행사 1개 · 파티 1개 · …". Zoom out and check it becomes a pill of two coloured dots.
  4. Press it. The card should show the place, the chips 행사 1 and 파티 1, and 행사's row. Choose 파티 and press its row: the Party's own card should open with 파티 열기, and the marker should stay selected.
  5. If the Place has a restaurant (301동식당, 302동식당, 학생회관식당, …), turn 편의기능 → 식당 on. A 식당 round and chip should join, and its row's card should open 메뉴 보기. Turn the layer off: the restaurant leaves the group.
  6. Delete or move the 파티: the event's own marker should come back.
  7. Check that Friends, Party members and the shuttle bus are still drawn and pressed as before.
- **Left as they are:**
  - A group made only of Parties shows the count of Parties on the Party pin, where a single Party's pin counts its members. The same was already true of the event point.
  - A group's card that is open when a layer leaves only one thing in it closes, as any card whose thing leaves the map does. It does not switch to the thing that is left.

### Agent usage (2026-10-22)

- Agent time: about 1.5 hours in all, an estimate, in one session. About 8 minutes of it was the one full run of the mobile suite.
- Tokens: not measured exactly. The main session took roughly 5M input, almost all of it cache reads, with cache writes around 0.2M, and about 50k output. The two `/code-review` subagents used about 132k tokens together (58k and 74k); their split into input and output was not reported.

### Phone check (2026-10-23)

Checked by the person (Jaehyun0320) on an Android phone, a Galaxy S22 (SM-S901N), and reported as passing. The build was a debug build of all six P20 branches merged on `origin/2.0/Main` (a local branch, not pushed), against the servers in Docker with the demo profile. Not checked on iOS.

- **Checked on the phone:** with things the person made at one building themselves, the map showed one marker for them, and its card's chips reached each one. Places with nothing overlapping kept their own markers.
- **Not checked:** iOS.
