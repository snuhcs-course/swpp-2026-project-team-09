# P13: Accuracy of the timetable reading pipeline

Measured on 2026-10-18 by `mobile/__tests__/timetable-ocr-screenshots-test.ts` (`OCR_ACCURACY=1` prints the numbers),
on ML Kit's saved outputs of the four reference screenshots (`mobile/__tests__/fixtures/timetable-ocr/`, made on the
Android emulator in ticket 01) against the hand-written ground truth beside them (`<name>.truth.json`). The Places are
the main server's seed of campus buildings (`main-server/seed/campus-map-places.json`, 250 rows from map.snu.ac.kr),
as `GET /places` lists them.

## How it is counted

- The unit is a **class time**: one coloured block, one day, one start and end. The ground truth has 50 of them in 28
  classes.
- A time read is **matched** to a true time when they overlap by more than a third and the name is read with at most
  half its characters wrong; the same day is preferred. **Recall** is matched times over true times, **precision**
  matched times over times read. The same is given per class: a true class is found when one of its times is matched,
  a class read is real when one of its times is.
- **Day**, **start and end within 5 minutes**, **name**, **room** and **building** are counted over the matched times.
- **Name CER**: character edits over the true name's characters, spaces removed; the same with spaces kept is given
  too, since a name joined from wrapped lines loses the space at the wrap (see below).
- **Room exact**: the building and room read, joined with `-`, equal the room printed; a time with no room linked
  counts as not exact.
- **Building**: linked to the right Place with the right room, linked wrongly, or left unlinked, over the matched
  times whose truth has a building.

## Results (Android, with ML Kit's confidences)

| Screenshot   | Times read / true | Recall   | Precision | Classes found / true | Day   | Start ±5 | End ±5 | Name CER (no spaces / spaces) | Room exact | Buildings right / wrong / unlinked |
| ------------ | ----------------- | -------- | --------- | -------------------- | ----- | -------- | ------ | ----------------------------- | ---------- | ---------------------------------- |
| everytime-1  | 14 / 14           | 100 %    | 100 %     | 7 / 7                | 14/14 | 14/14    | 14/14  | 0 % / 0.9 %                   | 2/2        | 2 / 0 / 0                          |
| snutt-1      | 16 / 16           | 100 %    | 100 %     | 10 / 10              | 16/16 | 16/16    | 16/16  | 0 % / 2.0 %                   | 9/9        | 9 / 0 / 0                          |
| snutt-2      | 12 / 13           | 92 %     | 100 %     | 7 / 8                | 12/12 | 12/12    | 12/12  | 2.9 % / 4.6 %                 | 12/12      | 12 / 0 / 0                         |
| snutt-3      | 6 / 7             | 86 %     | 100 %     | 3 / 3                | 6/6   | 6/6      | 6/6    | 0 % / 9.4 %                   | 6/6        | 6 / 0 / 0                          |
| **All four** | **48 / 50**       | **96 %** | **100 %** | **27 / 28**          | 48/48 | 48/48    | 48/48  | **0.6 % / 3.6 %**             | **29/29**  | **29 / 0 / 0**                     |

Classes read are all real (27 of 27). The titles are read as the screenshots show them: `2025년 여름학기`, `hi`,
`연습1`, and none for snutt-3, whose title is drawn as two circles that ML Kit reads as nothing (the version is then
`새 시간표 N`).

### What was left out, and why

| Screenshot | Time                                          | Why                                                                                            |
| ---------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| snutt-2    | 물리학실험 1, 화 16:00–17:50, 26-302          | `end-uncertain`: the block fades out behind the floating tab bar's blur, so its end is unknown |
| snutt-3    | 소프트웨어 개발의 원리와 실습, 수 19:00–20:50 | `end-uncertain`: the same fade                                                                 |

Both are left out on purpose (spec, "Leaving out what is uncertain"); the class of the second keeps its other two
times, and 물리학실험 1 is the one class lost. Nothing else was left out, and nothing was read that is not there.

The three 19:00 blocks of everytime-1 end on the bottom edge of 에브리타임's grid card, which the app draws at the
last class's end (21:00); there is no tab bar or fade there, so their end is certain and they are kept. They read
19:00–21:00, as the screenshot shows.

### What was read wrongly

- **snutt-2, 대학영어 2: 말하기** (화, 목): ML Kit reads `말하가` (0.67), above the name threshold, so the name is
  `대학영어 2: 말하가`. This is the only character read wrongly over the four screenshots (the 2 edits of the CER).
- **Spaces at a line wrap**: wrapped lines join with a space when either side of the join is a Latin letter or a
  digit (`대학영어` + `2: 말하기`), and Korean to Korean without one, which suits a word broken inside (`하드웨어시스`
  - `템설계`) but loses the space where SNUTT or 에브리타임 wrapped between Korean words: `인공지능 이론및 응용 세미나`,
    `정보 보호 및블록체인 개론`, `(공유)학부생연구 인턴`, `컴퓨터신기술 특강`, `소프트웨어개발의 원리와실습`, `컴퓨터의
개념및 실습`. That is the gap between the two CERs; the letters themselves are right. Telling the two kinds of
    Korean wrap apart needs the line's width against the block's, which the four screenshots do not pin down well
    enough.
- **Names cut with `…`** are kept as read, as the spec asks: `컴퓨팅 살펴` (snutt-1). The ground truth holds the part
  shown, since the screenshot does not show the rest.

## Without confidence (iOS)

The same outputs with every confidence set to null, as iOS's ML Kit gives them (ticket 01), run through the stricter
rules of the spec: a room is linked only when its line is one whole OCR element and the building is a Place; a time
needs a line that is not a room; a name needs at least two characters.

| Screenshot   | Times read / true | Precision | Buildings right / wrong / unlinked |
| ------------ | ----------------- | --------- | ---------------------------------- |
| everytime-1  | 14 / 14           | 100 %     | 2 / 0 / 0                          |
| snutt-1      | 16 / 16           | 100 %     | 9 / 0 / 0                          |
| snutt-2      | 12 / 13           | 100 %     | 12 / 0 / 0                         |
| snutt-3      | 6 / 7             | 100 %     | 6 / 0 / 0                          |
| **All four** | **48 / 50**       | **100 %** | **29 / 0 / 0**                     |

Every number is the same as on Android: on these four screenshots every room line is a single element read whole, and
no name is a single character, so the stricter rules leave out nothing more, and the confidence thresholds left out
nothing on Android either. The difference would show on noisier screenshots; the unit tests check that a one-letter
name and a room split over two elements are left out without confidence.

## Thresholds

Chosen on the four screenshots; each is named in the code.

| Threshold                                                                                 | Value                          | On the four screenshots                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ROOM_CONFIDENCE` (`building.ts`): a room line is linked                                  | ≥ 0.80                         | Room lines read 0.82–0.95; all 29 linked, none wrongly. The margin is thin: 0.82 is `302-311-1` and `8-408` (see below)                                                              |
| `NAME_CONFIDENCE` (`read-timetable.ts`): a block's name, for its time and its class       | ≥ 0.50                         | Names read 0.56 (`근장`) and up, weighted by characters, so a wrapped syllable read at 0.20 (`밍`) does not sink its name                                                            |
| Title words (`title.ts`)                                                                  | ≥ 0.30                         | Leaves out the chevron read as `<` (0.06) next to `시간표`                                                                                                                           |
| `FADE_DISTANCE` (`blocks.ts`): the rows above a block's bottom edge drift from its colour | > 12 (RGB)                     | The two faded SNUTT blocks drift 20 and 27; every other block less than 1                                                                                                            |
| Block pixel (`mask.ts`)                                                                   | saturation ≥ 0.25, value ≥ 80  | Block colours are 0.40–0.62 saturated; white, the grid and the grey background are below 0.1                                                                                         |
| Hour labels' RANSAC (`hours.ts`)                                                          | within 0.2 h; ≥ 3 labels agree | 7 to 14 labels per screenshot, all agree                                                                                                                                             |
| `SHORT_NAME` (`classes.ts`): a name cut short joins its whole name                        | ≥ 6 characters, and cut        | `컴퓨터프로그래` (목, its `밍` not read by ML Kit; its line runs to the block's right edge) joins `컴퓨터프로그래밍`. A whole name that starts another (`…` and `…연습`) stays apart |

### To recheck on a device

- **The room threshold's margin is thin**: the lowest room line read 0.82 against `ROOM_CONFIDENCE` 0.80. Another
  phone, another ML Kit build or another screenshot scale may read rooms lower, and a room under the threshold is
  left unlinked (never linked wrongly). The threshold must be rechecked on 함재현's device run before P13-04 ships.
- **The 2-second run time on the emulator** (ticket 02's last criterion) stays open until a device run measures it;
  only the Node time below is measured.

## Run time

The whole pipeline on one screenshot, in Node 24 under Jest on the shared x86_64 Linux machine (other agents' Jest
runs alongside): about **30–70 ms** (median of 5 runs after a warm-up), most of it decoding the 330 × 717 copy and
closing the mask. The ticket's target is under 2 seconds on the emulator, which has not been measured: Hermes on a
phone runs such loops slower than Node's optimising compiler, but this leaves room for a factor of about 30. Ticket
04, which calls the pipeline from the app, is where the emulator timing belongs.

## What the four screenshots exercise

- 12-hour labels (에브리타임) and 24-hour labels (SNUTT) by one path; the `9` label missing in all three SNUTT
  screenshots and the `7` read as `기`, glued to a name, in everytime-1; the labels `2` and `5` glued to names
  (`2자료구조`, `5자연언어처리`), used as labels and cut from the names.
- The day header read with low confidence (`월` 0.23–0.45), placed by position. Without the header the grid lines give
  the same columns within 1.5 pixels: 에브리타임's lines survive in the small copy, SNUTT's one-pixel lines mostly do not,
  and the sides of the blocks stand in for them. The pipeline reads the same 48 times without the header.
- One OCR line across three columns (`기컴퓨터프로그래 시스템프로그래 컴퓨터프로그래`), split by its words' boxes.
- Same-coloured blocks side by side (근장 on 수 and 목, snutt-1), cut at the column edge; a class with four times
  (근장), and with times on three days (컴퓨터프로그래밍).
- Rooms with a building of one, two and three parts (`8-408`, `43-1-304`, `43-2-B101`, `500-L308`, `43-1` alone), with
  look-alikes among the Places (`25-1` beside `25-105`, `56-1` beside `56-105`, `43` beside `43-1`).
- Stacked same-coloured blocks with no gap do not occur in the four; they are covered by unit tests on drawn
  timetables only.

## Not measured here

- A larger set and synthetic screenshots (Iteration 3).
- The emulator's run time (above), and a real phone (함재현).
- iOS's own ML Kit output: its text may differ from Android's, not only its confidence.
