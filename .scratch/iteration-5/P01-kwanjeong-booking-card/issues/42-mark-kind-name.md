# 42: A mark's picture is named by its kind too

Parent: ticket 41 (one colour means one thing), released in 26.11.28-6.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an app OTA update.

## What was wrong

- Since ticket 41 a map mark takes its kind's colour (`DotSymbol.kind`, `AnswerLabel.kind`), but the name its picture is kept under (`lookName`) left the kind out. Two marks that match in all else but their kind share one picture: the first one made is drawn for both, in the first one's colour.
- A candidate's tag held at a point another mark holds gives way to its number alone when its minutes do not fit (`numberOnly`). That number kept its tone and number only, so it lost its kind, its study colour and its fading, and was drawn in the meal's coral whatever the answer.

## What changes

- `answerName` (moved to `map/answer-look-name.ts` for `marker-looks.tsx`'s length) names a dot's and a label's `kind`. Every other field that changes the picture was already in the name: the dot's role, number, `faded`, `meal`, `study`; the face's name, dashed, badge, exact; the label's side, tone, title, line, number, shift, sub, note, action, `faded`, `meal`, `study`, `clock`.
- `numberOnly` keeps `kind`, `study`, `meal` and `faded`.
- The meal rounds made ahead on the everyday map (`LOOKS_AHEAD`) carry the meal's kind, as a meal answer's rounds do, so a first meal answer still finds them made.

## Acceptance criteria

- [x] Two looks that differ only in their kind have different names, for a dot and for a label. (Unit test, new; fails on Main.)
- [x] A tag shrunk to its number keeps its kind, study colour and fading. (Unit test, new; fails on Main.)
- [x] The rounds made ahead are a meal answer's own rounds. (Unit tests changed: `marker-images-order`; `answer-candidate-capsule` passes.)
- [x] No native file changes; lint, format and types pass on the app.

## Comments
