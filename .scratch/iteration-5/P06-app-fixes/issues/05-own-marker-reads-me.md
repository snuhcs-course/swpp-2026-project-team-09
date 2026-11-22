# 05: The User's own marker reads "나"

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received: "지도에 내 위치가 카카오맵처럼 파란 점으로 표시되는데, 친구 위치 표시하는 것처럼 디자인 요소를 하나 넣어서 내 위치라는 인식이 더 잘되게 수정" (`references/05-1-own-dot-now.webp`, the dot at the middle left under "서울대학교 관악캠퍼스").

- Our own JavaScript draws the User's marker, not the Kakao SDK. `use-me.ts:36` asks for the looks `{ kind: 'me' }` and `{ kind: 'me', small: true }`; `useMarkerImages` (`src/map/marker-images.tsx`) draws them into pictures and hands them to the map as a `MapAvatar`. The native module (`modules/snu-now-map`) only places the pictures it gets.
- The look is `MapPin kind="me"` (`src/design-system/map-pin.tsx:116-127`, styles :303-321, sizes :182-185): a 48 pt `halo.me` circle around a 16 pt `color.me` dot with a white border of 3, three quarters of that while the whole campus is in view. Its screen reader name is "내 위치".
- A Friend is `{ kind: 'person' }` (`use-things.ts:57`), drawn by `MapPerson` (`src/design-system/map-person.tsx`): a 36 pt teardrop in the status's colour holding a 28 pt Avatar, their name as the map's text under it.
- `marker-looks.tsx` names the look (`lookName`, :162-165, `'me'` and `'me:small'`) and anchors it at its centre (:237). Pictures are kept by look name for as long as the app runs.
- `MapPin kind="me"` also stands on the answer map (`design-system/map-answer.tsx:73`), in the map check (`screens/map-check-screen.tsx:52`) and in the catalogue (`catalogue/basics.tsx:198-199`).

## What to build

Decided 2026-11-22: option B of the three shown (`references/05-3-options-shown.png`), with "나" in place of the User's initials and smaller than shown (`references/05-2-own-marker-chosen.png`):

- `MapPin kind="me"` becomes a round marker: a 28 pt circle (the Avatar's small size) filled `blue100` with "나" in `snuBlue` in the Avatar's initials style, a white ring of 2 and a `color.me` ring of 3 outside it, over the 48 pt `halo.me` halo as now. Three quarters of that while the whole campus is in view, as now.
- Neither the User's name nor their photo: the picture holds nothing of the User, so one picture serves every User and its look name can stay.
- Friends stay teardrops, so shape tells the User from a Friend.
- The screen reader name stays "내 위치". The marker stays anchored at its centre, on the User's position.
- The answer map, the map check and the catalogue show the new look, since they draw the same `MapPin`.

## Must not break

- The User's marker lies under Friends' faces and takes a press that opens the User's own card on the everyday map (`pressableMe`, `use-me.ts:27`, order −1); elsewhere it takes none.
- It glides to each new position and changes size at the overview.
- P04 ticket 13 changed `marker-looks.tsx` (merged); start from the newest `5.0/Main`.
- Tests: `design-system/map-pin.unit`, `marker-looks.unit`, `marker-images.unit`, `main-position`, `main-location`, `main-markers`, `map-check`, `catalogue` (`.integration`).

## Acceptance criteria

- [ ] `MapPin kind="me"` draws the ring with "나" at both sizes, named "내 위치". (Unit test, which fails before the change.)
- [ ] The main map, the answer map and the map check draw it, and a press on it still opens the User's card on the main map. (Integration tests.)
- [ ] The map close up and at the overview, beside a Friend, on a phone with the mock build; the screens go to the orchestrator before the PR, and to the design review. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
