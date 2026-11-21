# 13: Our own marks recede while an answer is up

Parent: [P04 spec](../spec.md)
Status: in-progress
Blocked by: [05](05-lookups-and-words-one-line.md), so that every answer draws on the map the same way first.

Native files: none. Releases: an app OTA update only.

## What to build

While an answer is up, only the answer's place, its route, and its people stand out on the map. Everything else the app draws itself gives way in weight, not in words: other candidate places keep their tags with the number, the name, and the arrival time where the Plan has one ("2 자하연식당 12:35", boards 3, 20, and 21), so places can be compared without pressing each; a press on a tag makes it the pick and the old pick becomes a tag again. In a meal answer a candidate's tag has a second line, its first dish, the count of the rest, and its lowest price ("뚝배기불고기 외 2 · 5,000원부터", board 22): the first dish is the menu's first line (a dish that fits a wish the User stated, such as "더 가벼운 걸로", would need the wish as an input of the meal's planning, which the main server does not have; it is not part of this ticket); the pick's flag says its own first dish and the count ("–12:59 · 눈꽃치즈닭갈비 외 2"). A restaurant is chosen by dish and price, and without arrows the User would otherwise press each candidate to see them. A price shows only where the data has one. The routes to candidates that are not picked are not drawn; only the pick's route is. The Friends who are not in the answer and the campus labels of the everyday map are faded. Kakao's own base map is not changed: a wash or a muted style of it needs a change to the native map module and a native Release, and is not built now.

## What happens now

- Candidates are numbered dots with their place's name beside them ("후보 2 · 301동식당"); ticket 04 gives the tag the look of boards 20 and 21 (a navy number, the name in bold, a navy border). The arrival time on the tag comes here: a wider tag changes where the labels' sides fall, so the label layout tests (`answer-marks`, `answer-label-edges`) are revisited with it.
- Candidate routes are drawn in grey beside the pick's.
- A meal Plan's dishes reach the phone only as words: its line "오늘 부대짬뽕&군만두 외 4" and, for a buffet, a basis line "뷔페 6,500원: …". Dishes with their prices (`MenuLine.price`) reach it only in a restaurant card or a menu Lookup (`Lookup.menu`), not in a Plan. The tags need each meal Plan's dishes with their prices as a field: `Plan.menu?: { dishes: { name: string; price: number | null }[] }`, the same shape as `Lookup.menu`'s dishes, from P05 (the main server owns what a reply holds): main corner only, in the menu's order, absent when nothing was collected for that restaurant. Until it arrives, the second line is left out.
- Two candidates in one building (two restaurants of one 동, such as 자하연식당 2층 and 3층) stand at one point. Their labels take different sides of it (`answer-labels`), and each label is part of its own mark's picture, so a press on a label picks that candidate. This stays; no chip in the bottom row for this case.
- Friends outside the answer are drawn as on the everyday map, unless one stands near one of the answer's own marks.

## What changes

- The candidate's tag keeps its number, name, and time; the routes to candidates not picked leave the drawing.
- The everyday Avatars outside the answer take a lighter style while an answer is up.
- The labels of candidates that share a point are never the ones left out when room is short: they outrank the campus labels and the labels of candidates standing alone, so every candidate can always be pressed.
- The everyday map's campus labels are faded or left out while an answer is up.

## Must not break

- A press on a candidate shows its Plan; a press on a Friend's face with + adds them.
- The camera's fit and the labels' placement (`answer-labels`, `answer-camera-kept`).

## Decided while building (2026-11-22)

- More than five candidates: every candidate keeps its numbered dot. Where room is short the tags of candidates standing alone in the view are left out from the lowest rank upward, never a higher-ranked one before a lower-ranked one; the pick always keeps its flag; a dot without a tag still takes the press and gets its flag when pressed.
- A candidate without a menu: one line (number, name, time). A buffet (`Plan.menu.price`): its price once, without 부터 ("나가사키꼬치어묵 외 1 · 6,500원"); dishes of equal price: one price without 부터.
- The faces of Friends the answer does not draw are faint (opacity 0.55); the face whose add is on its way is lit. The app's own campus marks are already replaced while an answer is up; Kakao's base labels stay.
- Every candidate's tag carries its number, and its dot at the place keeps it too (screen review: a tag read alone says which candidate it is, the number the list of ticket 15 uses). Two-line tags and the pick's flag may grow to 260 points.
- A screen reader reads a candidate as its tag reads ("후보 2 · 301동식당 · 12:18 · 부대짬뽕&군만두 외 4 · 5,000원부터").

## Acceptance criteria

- [x] A meal answer with five Plans: candidates 2 to 5 keep number, name, and time; only the pick's route is drawn; a press on candidate 2 makes it the pick and candidate 1 a tag. (Integration test, from the map's markers and lines.)
- [x] The Avatars outside the answer have the faded style; the campus labels are the app's markers, which an answer already replaces. (Unit test of the drawing.)
- [x] With `Plan.menu`, a meal candidate's tag reads its first dish, the count of the rest, and its lowest price; a dish without a price shows no price; without `Plan.menu` the tag has one line. (Unit test of the marks.)
- [x] Two candidates at one point keep both labels when room is short, and a press on each picks it. (Unit test of the labels; integration test of the presses.)
- [x] The answer on a phone with the mock build, next to the same answer before. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 1.5 hours, an estimate: one session built tickets 13, 15, and 16 together from 01:47 to 05:09 (3.4 hours, most of it waiting on tests and an emulator slowed by the Mac's load; waits for the screen review not counted), and this ticket took about 45% of it. No subagents.
- Tokens: the whole session (13, 15, and 16) output 262k; input 221.4M, of which 220.7M cache reads, 691k cache writes, and 1.1k uncached. This ticket's share is about 45% of each.
