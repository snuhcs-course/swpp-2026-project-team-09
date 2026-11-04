# 02: The 공부공간 layer, with restricted spaces in grey and 관정관's live seats

Parent: [P13 spec](../spec.md) ("The 공부공간 layer")
Status: ready-for-human
Blocked by: none

## What to build

The 편의기능 stack becomes 식당 · 셔틀버스 · 공부공간, as in the wireframe, and the 메뉴 tile goes. Study Spaces come from a server file beside the Places seed, one rounded-square pin per building, merged as "공부공간 N곳 묶음" while the whole campus is in view. A pin's card lists its Study Spaces with their hours. 관정관's card shows its free and total seats, read by the phone through the User's own Library Session. A Study Space open only to a college, a department or graduate students is grey for a User whose 내 정보 does not qualify or does not say, and tapping it says who may use it.

The data is `references/study-spaces.md`'s spaces of confidence 높음 or 중간, without dormitories or cafés (the spec's table). The department → college table is built from the app's department list and is reviewed on this ticket's PR.

## Acceptance criteria

- [ ] `main-server/seed/study-spaces.json` holds the spec's buildings and spaces, in the spec's shape, each space with its `hours` (or `null`), `restriction`, `link`, `source` and `confidence`; conflicts between sources are in `note`. 중앙도서관 and 관정관 are one entry each.
- [ ] `main-server/seed/department-colleges.json` maps every department of `mobile/src/screens/onboarding/departments.ts` (`UNDERGRADUATE` and `GRADUATE`) to its college, or to `null`; the PR shows the table for review.
- [ ] `main-server/src/study-spaces/` reads both files at start (a Place number the seed lacks, or a restriction naming an unknown college or department, stops the start) and serves `GET /study-spaces` to a signed-in User: the buildings with their Place, and each space with `usable` and `restrictedTo`, by the spec's rules. An empty or unknown department, or no 소속 where `graduateOnly` needs it, is not usable. A building is `usable` when any of its spaces is.
- [ ] `layers.tsx`: three toggles from the bottom up, 식당, 셔틀버스, 공부공간 (`book`, `color.svcStudy`); `toggleStudy`; `MenuTile` and `onMenus` removed (also from `map-bottom.tsx`); the button's label "편의기능 (식당 · 셔틀버스 · 공부공간)". 메뉴 보기 on a 식당 pin still opens the menus.
- [ ] With 공부공간 on, one rounded-square `library` pin per building; a building that is not `usable` is translucent grey; at the overview level, overlapping study pins merge into one rounded-square cluster with its count and the label "공부공간 N곳 묶음 · 눌러서 확대", which zooms in when tapped. A building with other things follows the one-marker-per-place rule.
- [ ] The card shows the building's name and 동, one row per space with its name and hours ("운영 시간 확인 필요" for `null`) and its link, and the primary button 좌석 현황 (관정관) or 길찾기 (others).
- [ ] A row that is not usable is translucent grey; tapping it shows "{restrictedTo} 학생만 사용할 수 있어요" ("대학원생만 사용할 수 있어요" for 대학원).
- [ ] 관정관 with a Library Session: "남은 좌석 k / 전체 n", summed by the phone over the catalogue's seat sectors bookable now (8B for 대학원생 only), free being STATUS 1 and USECNT 0, STATUS 9 not counted. Without a session: "로그인하면 좌석 현황을 볼 수 있어요", and the card makes no library request and opens no login. A failed read shows the hours only. No count reaches our server.
- [ ] 좌석 현황 opens the chat and sends "관정도서관 좌석 현황 보여줘".
- [ ] The API mock serves buildings that are all usable, mixed, all restricted, and 관정관.
- [ ] `GLOSSARY.md` gains **Study Space**, _Avoid: Library Space_.
- [ ] Tests, named by ADR 0007: `main-server/test/study-spaces-file.unit.test.ts`, `main-server/test/study-spaces.integration.test.ts` (a 경영학과, a 국어국문학과, a 화학생물공학부 and a graduate User; an empty department; no 소속), `mobile/__tests__/department-colleges.unit.test.ts` (every department of the app's list has an entry), `mobile/__tests__/study-layer.integration.test.tsx` (toggle, pins, cluster, card, grey row and its words, grey building, 관정관 with the fake library logged in and logged out, with no request when logged out), and `layers.integration.test.tsx` and `dining-layer.integration.test.tsx` updated (no 메뉴 tile; 메뉴 보기 opens the menus).
- [ ] Screenshots of the stack, the pins, a mixed card and a grey card, from the web target, in the PR.
- [ ] Left for a person (the reason for ready-for-human): 관정관's count on a real phone with a real Library Session against the real site, compared with the library app's count, recorded in the PR.
- [ ] No native file changes (CLAUDE.md § The app's native files).

## Comments
