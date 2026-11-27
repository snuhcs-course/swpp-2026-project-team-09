# 30: A pick's label with its time keeps its time at a large font

Parent: P01 (the 관정 booking card on the map) and P04 ticket 74 (the meal's chosen place)
Status: ready-for-agent

Native files: none.

## What to build

A pick's label with its time is the label of a meal answer's chosen place ("302동식당 › 12:15") and of a 관정 booking's room or seat ("관정 4층 그룹스터디룸 › 15:00"). Its words grow with the phone's font scale, but its width stopped at 200 points at every scale. So at font scale 1.3, on an app started at that scale, the time was cut: "관정 4층 그룹스터디룸..".

- The cap is 200 at font scale 1, as today, and grows with the font scale the label is drawn at: 260 at 1.3.
- It stops at 320, so that the label stays inside the narrowest phone's map (360 less its margins).
- The measured box (`answerLabelBox`), which the camera and the labels' sides read, and the label as drawn (`MapAnswerLabel`) use the same cap.

Found on the emulator while taking P10 ticket 11's pictures. An app whose font scale changed while it ran kept the labels' pictures drawn at the old scale (the map's marker images are kept by their look), which hid it until the app was started cold at 1.3.

## How it is built

- `pickTimeMax(fontScale)` in `design-system/map-answer-box.ts`: 200 × the font scale, at most `PICK_TIME_CEILING` (320).
- `widestOf` takes the font scale `answerLabelBox` already has.
- `MapAnswerLabel` reads the window's font scale (`useWindowDimensions`) and sets the label's `maxWidth` from it.

## Acceptance criteria

- [x] At font scale 1 the label is as wide as before; at 1.3 "관정 4층 그룹스터디룸 15:00" is whole; a long title stops at 200, 260 and 320 at 1, 1.3 and 2. (Unit tests of the box and of the drawn label.)
- [x] The labels' placement tests pass, the meal answer at 1.3 included: no label covers another.
- [x] Pictures of a meal answer and a seat answer at font scale 1.3, the app started cold, before and after.
- [x] Whole lint, format and types.

## Comments

### Follow-ups

- A map marker's picture is kept by its look's name (`lookName`) alone. When the font scale changes while the app runs, labels of the old scale stay until a cold start. The name should carry the font scale.

### Agent usage (2026-11-27)

- Agent time: about 18 minutes (an estimate) in one session from 02:41 UTC, a few minutes of it uploading #655's pictures; no subagents.
- Tokens: input 164 uncached, cache reads 61,426,639, cache writes 89,479; output 51,783.
