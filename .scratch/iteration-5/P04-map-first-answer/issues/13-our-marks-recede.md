# 13: Our own marks recede while an answer is up

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [05](05-lookups-and-words-one-line.md), so that every answer draws on the map the same way first.

Native files: none. Releases: an app OTA update only.

## What to build

While an answer is up, only the answer's place, its route, and its people stand out on the map. Everything else the app draws itself gives way in weight, not in words: other candidate places keep their tags with the number, the name, and the arrival time where the Plan has one ("2 자하연식당 12:35", boards 3, 20, and 21), so places can be compared without pressing each; a press on a tag makes it the pick and the old pick becomes a tag again. The routes to candidates that are not picked are not drawn; only the pick's route is. The Friends who are not in the answer and the campus labels of the everyday map are faded. Kakao's own base map is not changed: a wash or a muted style of it needs a change to the native map module and a native Release, and is not built now.

## What happens now

- Candidates are numbered dots with their place's name beside them ("후보 2 · 301동식당"); ticket 04 gives the tag the look of boards 20 and 21 (a navy number, the name in bold, a navy border). The arrival time on the tag comes here: a wider tag changes where the labels' sides fall, so the label layout tests (`answer-marks`, `answer-label-edges`) are revisited with it.
- Candidate routes are drawn in grey beside the pick's.
- Two candidates in one building (two restaurants of one 동, such as 자하연식당 2층 and 3층) stand at one point. Their labels take different sides of it (`answer-labels`), and each label is part of its own mark's picture, so a press on a label picks that candidate; when the room is short and a label is left out, that candidate cannot be pressed. Whether such candidates instead go to a chip in the bottom row, as the floors of one building do (board 5), is to be decided before this ticket is built.
- Friends outside the answer are drawn as on the everyday map, unless one stands near one of the answer's own marks.

## What changes

- The candidate's tag keeps its number, name, and time; the routes to candidates not picked leave the drawing.
- The everyday Avatars outside the answer take a lighter style while an answer is up.
- The everyday map's campus labels are faded or left out while an answer is up.

## Must not break

- A press on a candidate shows its Plan; a press on a Friend's face with + adds them.
- The camera's fit and the labels' placement (`answer-labels`, `answer-camera-kept`).

## Acceptance criteria

- [ ] A meal answer with five Plans: candidates 2 to 5 keep number, name, and time; only the pick's route is drawn; a press on candidate 2 makes it the pick and candidate 1 a tag. (Integration test, from the map's markers and lines.)
- [ ] The Avatars outside the answer and the campus labels have the faded style. (Unit test of the drawing.)
- [ ] The answer on a phone with the mock build, next to the same answer before. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
