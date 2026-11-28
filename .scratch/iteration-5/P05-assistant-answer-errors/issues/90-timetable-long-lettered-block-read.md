# 90: A timetable block covered by a long name is read, and nothing a reading leaves out is silent

Parent: [P05 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: the main server and an app OTA update.

## What happens now

On 2026-11-28 the user read his 에브리타임 timetable (dark theme, 1032 × 2000) from a screenshot, twice. The app said it could not add Friday's class. That is the only block on Friday: 13:00–15:50, teal, at the picture's right edge, with "인공지능특강(멀티모달 인공지능을 위한 파운데이션 모델과 피지컬 월…" over seven lines and the room 302-106. The other five classes were read rightly.

Production's log said only `A timetable was read from the grid: 5 classes, 1 blocks left out`, at level "log", with no reason and nothing about which block.

## Causes

Found by running the phone's grid finder and the server's reading on his picture.

1. **The phone never sent the block.** `gridGeometry` (app, `features/timetable-ocr/blocks.ts`) found it but skipped it as `start-uncertain`.
   - An edge counts as fading when the rows next to it are more than 12 (RGB) from the block's colour. That colour is the median of each row's *mean*.
   - The block's letters cover most of its rows. Their edges blend the teal with white, so the mean of most rows is lighter: (106, 197, 189) against the clean fill (93, 193, 184), about 14 apart.
   - So both its clean top and its clean bottom read as fading, and the block was dropped on the phone. The app counted it among what it could not add.
   - The same lightening cut Thursday's 공학수학 2 block in two (a colour change of 45 inside it). The server left out its "fading" upper part, which was the `1 blocks left out`; the class still came through from Tuesday.
2. **The server would have dropped it too.** With the phone fixed, the model reads the block rightly: friday 13:00–15:50, seven name lines, 302-106. `checkedReading` then left it out as `too-long`, because a block could have at most 6 name lines. Past that, its name (37 characters once the `…` is taken off) was longer than the 30 a class may have, which was also a reason to leave it out (`no-name`). The phone's own reader cuts such a name to 30 characters instead (`block-text.ts`).
3. **The log said nothing useful.** A left-out block was only counted, at level "log". A call whose failure left blocks out (a re-read, the second look, an end re-ask) was not logged at all.

The model is part of the reading, but no prompt changed: the model read the block rightly.

## What to build

- **App, `blocks.ts`:** a row's colour for the fade and colour-split checks is the *median* of its block pixels (`rowMedian`, `pixels.ts`), which letters' edges do not move while they cover under half the row. A fade is judged against the block's fill, the median of those rows. The colour a block is sent with stays as it was, so the nine saved grids are unchanged.
- **Main server, `reading-checks.ts`:**
  - A block may have up to 12 name lines: a three-hour block holds seven or eight.
  - A name past 30 characters is cut to 30, its `…` taken off (`fittedName`), after cut names are completed, as the phone does. It is no longer left out.
- **Main server, logging (`reading-log.ts`):**
  - Each block a reading leaves out is one WARN line with what diagnoses the drop: its day, its start and end, the reason and the numbers behind it ("name lines 14, at most 12").
  - The line never holds the words read, a name or a room. Production forwards every WARN to Slack, which keeps Users' data out, and the README says what was read is never logged. Those numbers stay in the log: the route's answer leaves them out (`servedLeftOut`).
  - The summary line is a WARN, with counts only, when anything is left out.
  - Each call whose failure leaves blocks out says so in a WARN line with its count and cause (`causeOf`: a name and a status, never a message): the re-read of blocks whose start did not agree, the second look at near-equal names, each failed end re-ask, and fading blocks past the 3 end re-asks.
  - `POST /timetable/readings` is in `BODILESS_ROUTES`, so neither its request nor its answer is written on its request line, on the error path too.
  - The phone sends no report of what it skipped, so nothing of that is logged.

## Acceptance criteria

- [x] A drawn block whose letters cover most of its rows, at the picture's right edge, 13:00–15:50 in a dark 에브리타임 grid, is sent whole, not fading, and nothing is skipped. The nine saved screenshots' grids are as saved. (Unit test, `timetable-ocr-grid-geometry`.)
- [x] A drawn block with a bold line over nearly half of its lower rows is one block, not cut in two where the letters begin. Both drawn cases fail with the row mean and pass with the median. (Unit test, `timetable-ocr-grid-geometry`.)
- [x] A block of seven name lines whose name is 37 characters, cut with `…`, is read as a class named with its first 30 characters. Two such blocks are one class. (Unit test, `timetable-reading-checks`.)
- [x] The line of a block left out names its day, start and end, the reason and its numbers. For every reason a block is left out, no line holds any of the words read or any room, and the route's answer has no numbers. (Unit test, `timetable-reading-log`.)
- [x] A failed re-read leaves its blocks out with a WARN that says why. (Unit test, `timetable-reading-call-failures`.)
- [x] On the user's picture, run locally and not committed: the phone's grid holds all 11 blocks with none skipped, Thursday's whole. The model then read every block rightly (Claude Haiku 5.5 through OpenRouter, the server's model), and the server's checks on that answer give all six classes with nothing left out, Friday's named "인공지능특강 (멀티모달 인공지능을 위한 파운데이션 모델" at 13:00–15:50 in 302-106. His picture is not a fixture: the fixtures README asks for the owner's agreement before a screenshot goes into this public repository.

## Later

- The words after an import name only a count today: "시간표를 만들었어요 · 1개는 넣지 못했어요" (`use-import-from-image.ts`). Naming the day and time of a block the phone skipped needs the server to place it, so the phone would send its skipped blocks with the grid. The route's schema is strict, so the server must take them before an app sends them. Proposed apart, for a decision on the words.

## Comments
