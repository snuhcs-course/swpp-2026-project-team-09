# 44: The hours marked under a time card's long range, a whole move on the ten minutes, and the head following it

Parent: ticket 43 (a time card's range from now to the place's closing, at most 16 hours).
Status: ready-for-human
Blocked by: nothing. Merges after the user checks the feel on his phone in the preview build.

Native files: none. Releases: an app OTA update.

## What was wrong

- With ticket 43, a time card's bar can run 16 hours, but only its two end times are written under it. 07:00 cannot be found on a bar from 01:00 to 17:00.
- A whole move went by five-minute steps of the distance dragged, keeping the band's own minutes: from 01:12 it went 01:17, 01:22 and so on, so it never stood at 07:00 exactly.
- While the band was moved whole over nobody's busy time, its words over the bar stayed at its own times. The User could not see when 07:00 was reached.

## What changes

- `hourMarksOf` (`features/assistant/hour-marks.ts`) gives the whole hours of Korea's clock to mark between the end times.
  - The step is the shortest of 1, 2, 3, 4, 6, 8 or 12 hours that marks at most four.
  - No mark stands within an eighth of the range of either end, where the end times stand.
  - A range shorter than four hours has none: its two end times say enough, and the small card grows no line for one label (the meal's folded 12:00–13:15 keeps its height).
  - For 01:00–17:00 it gives 04:00, 08:00 and 12:00; for 10:00–23:30, 12:00, 15:00, 18:00 and 21:00.
- `HourNotches` and `HourMarks` (`band-hour-marks.tsx`) draw a notch on the track at each mark and its time on a line under the track.
- `bandMoved` puts the band's start on the clock's ten minutes, or on its rules' own longer step (a seat's half hours).
  - Less than five minutes moves nothing, as before.
  - Halfway between two ten minutes, the one nearer the band's own place is taken, so the band never moves further than the finger.
- `wordsOf` says the times a band moved whole is at, its length kept, unless it lies over someone's busy stretch.
- The stored mock answers carry ticket 43's ranges: the meets, the study answer, the group study and the study in several requests.

## Acceptance criteria

- [x] The hours marked, by partition: 16, 13, 10 and 4 hours, 3½ hours and a meal's 1¼ (none), past midnight, and the share of each. (Unit test, new; fails on Main.)
- [x] The hours stand under a long range's track, and a range shorter than four hours has no line of marks. (Unit test, new.)
- [x] A whole move stands on the ten minutes, takes the nearer of two at halfway, and moves nothing for less than five minutes. (Unit test changed; fails on Main.)
- [x] A band moved whole says its times, or who cannot come. (Unit test, new; fails on Main.)
- [x] The drag tests over the stored meet and meal follow the ten minutes. (Integration tests changed.)
- [x] Pictures at 1.0 and 1.3: a study at night, a study by day, a seat and a meal, and a recording of one drag to 07:00. The marks' look was settled on the pictures: as drawn, on ranges of four hours or more.
- [ ] The user checks the feel on his phone in the preview build before merge.
- [x] No native file changes; lint, format and types pass on the app.

## Comments
