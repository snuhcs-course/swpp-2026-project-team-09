# 09: Main screen: markers, cards and the route

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 08 (Main screen: the map, my position and the bottom navigation)

## What to build

The map shows the people, the Global Event, the Party and the Shared Quest of the `Main` frame. A User presses one, reads its card, looks closer, and asks for the way there. The frames are `Main`, `MapOverviewSelect` and `MapZoomed`. Everything shown is mock data from the client of ticket 02.

## Acceptance criteria

- [x] What the frame shows is on the map. Avatars: the Friends who can be seen and a member of the User's Party. Markers: a Global Event, a Party, and the User's Shared Quest "저녁 약속", drawn as a Party's marker as the frame draws it. A Friend whose position is not known has no marker. The frame's Private Event is left out.
- [x] A Friend and a member of the User's Party are the frame's teardrop at every zoom, never a dot: small (24) while the whole campus is in view, 36 from the "pins" level, and with the given name under it from the "names" level. A Friend's teardrop has the status colour: free `#0B7A55`, class `#001A72`, moving `#9A5200`, off `#8A90A3`. A member of the Party who is not a Friend has `#B63A07`. The colours are tokens.
- [x] A place's detail follows the camera's zoom as in the frames: a dot while the whole campus is in view, a pin with its count from the "pins" level, and a pin with a short name from the "names" level. A Party's count is its members; a Global Event has a count only when more than one Party goes to it. A short name is the title cut at a word's end within 8 characters ("AI 커리어 설명회" is "AI 커리어"). The levels are those of the spec, counted from the fit zoom: "pins" +0.68, "names" +1.26.
- [x] A press on a marker opens its card with what the frame shows for its kind: the leading mark (the kind's icon in a round of 40, or the person's Avatar), the sub-label, the title, the lines and the buttons. A selected marker looks selected and is drawn above the others. A press on another marker replaces the card; a press beside the markers leaves it open.
- [x] The card's X closes it, and so does Android's back button.
- [x] "가까이 보기" is offered below the "names" level and brings the camera to the "close" level on the marker, keeping the card.
- [x] While a card is open the zoom control is hidden, and the screen tells its other parts that a card is open.
- [x] "길찾기", which only the Shared Quest's card has, closes the card, draws the route line from the User's position to the place, fits the map to both ends and shows "<title>까지 길 안내". Another "길찾기" replaces the line, and leaving the screen drops it.
- [x] The route line is the frame's: dashed, `#865600`, 3 wide, a dash of 2 and a gap of 6, with round ends.
- [x] A route to the User's next Quest by time (the class 자료구조 in the mock, not the frame's fixed "저녁 약속") is drawn when the screen opens, once, as soon as the app has a position inside the campus rectangle; without one, none is drawn.
- [x] When the app has no position to start from, "길찾기" moves the map to the place and says "캠퍼스 밖에 있어요" off campus, or shows the explanation before the location prompt when the permission is missing.
- [x] The card's other buttons show the "준비 중이에요" toast: 같이 갈 사람 찾기, 참여하기, 파티 만들기 and 파티 열기.
- [x] The Global Event's title in the mock is "AI 커리어 설명회", as the frame's.
- [x] Jest tests: the markers by their names at each level of detail, a card's content for each kind, the card closed and replaced, "가까이 보기", a route asked for and replaced, the opening route with and without a position, "길찾기" without a position, and each not-ready button's toast.
- [x] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots are in the pull request under Test Results, each compared with its frame: of the web target with a card open, and, once ticket 07 is merged, of the emulator at each of the three levels of detail, with a card open and with a route.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

The frames `Main`, `MapOverviewSelect` and `MapZoomed` were read again when the work started, in the copy of the canvas at version `1791129072-d0ec`, and are unchanged since the spec: 148106, 760 and 856 bytes.

The two zoom levels where the detail changes are the spec's, named once in `ZOOM_OFFSET` of `mobile/src/map/campus.ts`: "pins" from the frame's z 1.6 (fit zoom + 0.68) and "names" from z 2.4 (+1.26). "가까이 보기" goes to "close", z 2.6 (+1.38).

Where things are, in `mobile/`:

- `src/screens/main/`: `use-things.ts` (the cards as the map's markers and Avatars at a level of detail), `use-selection.ts` (what is selected, the open card, Android's back button), `card.tsx` (the card), `use-route.ts` (the opening route, "길찾기", the line's look), `main-screen.tsx` (the parts together, and `SelectedCard`, what the card's buttons do), `layout.ts` (`CARD`, `ROUTE_PADDING`), `use-me.ts` (`offCampus`, `sayWhyNotHere()`), `use-main-map.ts` (`fitTo`).
- `src/features/map/adapter.ts`: `CardView` gained `mark`, `marker` and the kind `shared-quest`; `cardId` makes a card's id. `short-name.ts`: a place's short name and a person's given name. `src/features/quests/`: `toNextQuest` and `useNextQuest()`.
- `src/design-system/`: `MapPerson` (the teardrop), the `selected` form of `MapDot`, the tokens `presence`, `halo.selectedDot`, `shadow.mapCard`, `shadow.markerTurned` and `shadow.dot`. Both are in the catalogue's `MapPin` section.
- `src/map/`: `marker-looks.tsx` (the look `person`, a pin's `count`, `selected`), `types.ts` (`routeStyle`, a padding for each edge in `fitTo`), `projection.ts` (the fit with such a padding), `plain-route.tsx` (the plain ground's line, solid or dashed).
- Tests: `__tests__/main-markers-test.tsx`, `main-card-test.tsx`, `main-route-test.tsx` with `__tests__/support/markers.ts`, `__tests__/design-system/map-person-test.tsx`, and additions to the map camera's and the adapters' tests.

Decisions made while building:

- A name under a marker is the map's own text (`text` of a marker), as the spec says, not part of the marker's picture: a person's given name and a place's short name are handed to the map from the "names" level. So no look holds a label, and the pictures stay few.
- A marker is read as the frame reads it: "<name> · <detail>" for a person, "<kind> · <title>" for a place ("공식 행사 · AI 커리어 설명회", "파티 · 저녁 약속").
- The look that replaced a Friend's Avatar with the friend ring is `person`. No look of the kind `friend` is left; the design system's `MapPin` of the kind `friend` stays for the screens that use it.
- A selected teardrop is laid out at 1.18 times its size, not scaled by a transform, so that its box still ends at its tip and its picture holds all of it.
- A Quest of the User's that no Party names has the card kind `shared-quest`. Held with others it is worded and drawn as the frame's "비공개 파티"; held alone it is worded "퀘스트" and drawn with the Quest's icon and colour.
- A Shared Quest's card has the frame's third line, "활성화에 참여하면 서로 위치가 공유돼요".
- The Party's short name is cut from its title as every place's is, so it is "AI 커리어", where the frame writes "AI 파티".
- The Global Event's pin has no count in the mock: one Party goes to it. The frame draws 3.
- The route that opens with the screen is drawn without a toast and without moving the map. It is asked once: a position that comes later draws it then, and a "길찾기" before that takes its place for good.
- "길찾기" fits both ends into what the controls of the whole frame leave of the map: 288 from the top, 142 from the bottom, 24 from the left and 78 from the right (`ROUTE_PADDING`). The frame instead goes to z 1.6 on the middle of the two.
- Without a position to start from, "길찾기" draws nothing and keeps the card, so that the User can try again. With the permission and no position yet it says "위치를 찾는 중이에요" and brings the map to the place. The map goes to the place at the "pins" level, or stays closer.
- A way that is not found, or a failed question, says "길을 찾지 못했어요". The words are in the spec's table. The opening route fails without a word.
- Leaving the screen drops the route when the screen loses the focus, and the opening route is not drawn again on return.
- The shared Toast no longer lets the end of one toast take away another that was shown at that very moment.

Differences from the frame:

- A Friend's card writes the department without the year, and every Friend shows the name's letters, as `todo.md` section 6 records.
- The Party member's card has no second line "301동까지 도보 15분": no answer holds a member's distance.
- The Party's card has "파티 열기" for the Party the User is in, where the frame has "참여하기", and leaves out "#AI커리어 관심사가 겹쳐요".
- The Shared Quest's place is "학생회관 (63동)", the Quest's own label, where the frame's card writes "학생회관 (63동) 식당".
- The route line follows the points of the walking route's answer, which in the mock is a curve of twelve stretches; the frame draws one curve of its own.
- The teardrop's shadow is a box shadow under the fill, not a drop shadow of the whole shape, and the card's sub-label and title are the design system's caption and title styles.
- The name under a marker on the plain ground is the plain ground's pill; on a native map it is the SDK's text.
- The lists and the other controls of the frame are ticket 10.

Not checked: nothing ran in a browser, on a phone or in a native build. So the teardrop's shape and shadow, the selected looks, the dashed line, the card's place above the AI input's and the fit of a route between the controls were not seen. No screenshot was taken.

What ticket 07 must know:

- New looks, each a picture under its name: `person:<small|full>:<free|class|moving|off|member>:<name>:<photo>` and the same with `:selected`; a place's `<kind>:dot`, `<kind>:pin`, `<kind>:pin:<count>`, each also with `:selected`. A person's marker and a pin stand on their tip, which `anchor` says; a dot sits on its middle. The room around a look on the stage is 12 now, for a selected pin's ring and a pin's count.
- The main screen asks for every unselected look of its cards when the cards come, about thirty pictures in the mock. A selected look is asked when something is selected: until its picture is there, the marker keeps its last picture.
- A press on a marker swaps its image and raises its `order` to 2; the User's own Avatar is 1. Neither restarts a glide.
- `MapProps` gained `routeStyle?: { color, width, dash?: [length, gap] }`: the line's colour, its width in points on the screen and its dashes, measured as SVG's `stroke-dasharray`, with round ends, the same at every zoom. Without it the line is the map's own. `native-map.tsx` passes it on with the other properties.
- `fitTo`'s `padding` is one number or `{ top, right, bottom, left }`. With unequal sides the points' middle comes to the middle of what is left of the view.
- Friends and the member of the Party are Avatars with `glideMs` 5000. Their positions do not move in the mock.
