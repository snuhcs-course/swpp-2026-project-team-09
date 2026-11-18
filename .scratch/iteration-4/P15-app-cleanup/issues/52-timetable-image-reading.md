# 52: Reading a timetable image works on any SNUTT or 에브리타임 screenshot

Parent: [P15 spec](../spec.md), item 52; from the owner on 2026-11-18, with four screenshots that the app read badly in use. The pipeline is P13's (`.scratch/iteration-2/P13-timetable-ocr/`).
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: none. Ticket [03](03-timetable-card.md) changes where the import comes back to, in `use-import-from-image.ts`; whichever merges second takes the other in.

## What happens now

- `이미지로 불러오기` reads a screenshot on the phone: the native module (`modules/snu-now-ocr`, ML Kit Text Recognition v2, Korean) returns the lines and a small copy of the picture, and the pipeline (`mobile/src/features/timetable-ocr/read-timetable.ts`) finds the grid, the coloured blocks and each block's name and room. Whatever is uncertain is left out. The image never leaves the phone.
- On P13's four reference screenshots it reads 48 of 50 class times (`accuracy.md`). In use it did much worse: real screenshots came out with classes missing or wrong.
- Room links still use ML Kit's confidence on Android (`ROOM_CONFIDENCE` in `building.ts`), which iOS does not give.

## The five new screenshots

921 × 2000 copies of iPhone screenshots, now fixtures in `mobile/__tests__/fixtures/timetable-ocr/`:

| File                   | App                              | What makes it hard                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `everytime-2.png`      | 에브리타임, light                | The hour axis is a 12-hour clock: 9, 10, 11, 12, 1 … 6. Names top-left in the block, the room under them. A 학점계산기 card (covered in the fixture) and a friend search below the grid. Blocks that end between hour lines (12:15, 13:45).                 |
| `snutt-4.png`          | SNUTT, light, "연습3"            | The axis is 9–18 with half-hour lines. Names wrap over two lines ("대학영어 / 2: 말하기", "컴퓨터의 개념 / 및 실습"). The floating tab bar covers the bottom.                                                                                               |
| `snutt-dark-1.png`     | SNUTT, dark, "1"                 | Dark background, 9–21. A block with a name and no room ("축구"). The same name with two rooms ("프로그래밍연습" in 301-118 and 302-105). A tall block spanning 14:00–16:50.                                                                                 |
| `everytime-dark-1.png` | 에브리타임, dark, "2023년 2학기" | A 12-hour axis 9 … 4. Blocks that start and end between hour lines (공학수학 2 9:30–10:45, 컴퓨터구조 15:30–16:45). A name wrapped inside a word ("프로그래밍의 원 / 리"). The 학점계산기 card (covered in the fixture) and a friend search below the grid. |
| `snutt-grey-1.png`     | SNUTT, grey, "수면"              | The phone's focus-mode overlay covers the title and the day header (flashlight and camera buttons, a "수면" badge). The last block fades behind the tab bar. Names wrap in the middle of a word ("컴퓨터프로그래 / 밍").                                    |

Their owner agreed on 2026-11-18 that the five may be committed to this public repository, as P13's four were. The 학점계산기 card (an average grade and earned credits) is covered in the three 에브리타임 screenshots, `everytime-1` among them (the fixtures' README).

## What the reading must do

1. **Any form of timetable, not only SNUTT's or 에브리타임's.** The model is told what any weekly timetable grid is (a row of day labels, an hour axis on one side, coloured blocks holding a name and maybe a room and other text), not the two apps' specifics, and no rule keys on an app's name, theme, fonts, pixel positions, or a fixed set of days or hours. Days may be 월–금, 월–토, 월–일 or English; the axis may be 12-hour or 24-hour, start at any hour, and label hours as `9`, `09`, `9:00`, `오전 9시` or `9 AM`. Code derives the day columns from the day labels' positions, the time scale from the axis labels' positions (a line fitted through them), and 12-hour → 24-hour from the labels' order; a block's start and end are read against it to five minutes. A block may hold extra lines (a professor's name, a class code), which are not the name.
2. **One class per name, never two.** Grouping is done by code over normalised names: wrapped lines joined, whitespace and Unicode (NFC) normalised, equal names grouped; each time keeps its own room. The same class read slightly differently on two days (a near miss: one or two characters apart, of one colour) is looked at again rather than left as two classes, and names that are genuinely different ("수학 1" and "수학연습 1", "물리학 1" and "물리학실험 1", "프로그래밍연습" and "프로그래밍의 원리") are never merged. Unit tests cover both directions.
3. **The text is right, character for character.** Names and rooms are read as printed and measured character-exact, not "close enough": a name wrapped over lines is joined as it reads ("컴퓨터프로그래밍", "대학 글쓰기 2: 과학기술글쓰기"), and a room keeps its form (`302-311-1`, `500-L309`, `26-B102`, `43-1-403`). A block without a room has none.
4. **No confidence scores.** Nothing is kept, dropped or linked by ML Kit's confidence. What is kept is decided by what is on the picture.
5. **Nothing invented.** A class that is not on the picture is never returned, and a time that cannot be read is left out and counted, as now. The app's own furniture (title, 학점, the cards below the grid, the tab bar, a system overlay) is not a class.

## How it is done

### Stage 1: the pipeline's numbers, as the before column

On 2026-11-18 the owner narrowed stage 1 to recording the pipeline's numbers on the nine screenshots where they can be measured, as the "before" column, and moved the work to stage 2 without trying further to rescue the phone pipeline's text half.

- A hand-written truth file for each new screenshot, as P13's (`mobile/__tests__/fixtures/timetable-ocr/README.md`): every block's day, start, end, name and room.
- What can be measured on this machine: the pipeline's pixel half (background, grid, axis lines, blocks) runs in Node on the PNG alone. Its text half needs ML Kit's output, which only a phone or an emulator gives; no emulator is run for this ticket. So stage 1 measures how many blocks and times the pixel half gets on the five new screenshots, and reports plainly that the text half is not measured on them.
- The decision: if the pixel half cannot find every block and its times on all nine screenshots after a reasonable try, or the text half's known faults (wrapped names, rooms, confidence) are not fixable without new ML Kit runs, stage 2 is taken. The owner agreed on 2026-11-18 that the agent takes it without asking again.

### Stage 2: a small reader on Claude Haiku

The owner decided on 2026-11-18 that the reading may move to the model if the pipeline does not get there. This reverses P13's rule that the image never leaves the phone, so:

- **The route.** The phone sends the picture to the main server; the server calls Claude Haiku 5.5 through the AI's chosen key (`llm.key`, so the provider follows the admin's choice) and answers with the classes in the shape the pipeline returns today. Signed-in Users only, with a size limit and a per-User rate limit. The picture is not stored and not logged, and the User is told before the first use that the picture is sent to be read.
- **A simple module, with what we know built in.** The model is not left to guess the format:
  - The request says what a SNUTT and an 에브리타임 timetable look like: the day header, the hour axis on the left (12-hour or 24-hour), blocks whose first lines are the name and whose last line is the room, the furniture to ignore.
  - The answer is structured (a tool call or a JSON schema): the axis's hours as read, and per block its day, start, end, name lines and room.
  - Code, not the model, does the rest: a 12-hour axis becomes 24-hour (hours that fall after 12 go on), times snap to five minutes and are checked against the axis, a room is checked against the room pattern, wrapped name lines are joined, equal names are grouped into one class, and a room is linked to a building as now. A block that fails a check is left out and counted, not repaired by guessing.
  - Where the picture's pixels give the geometry more exactly than the model does, the code may find the blocks' rectangles and the axis lines itself and ask the model only for the text; which split reads best is decided by the measurement.
- **Experiments, broadly.** Different prompts, different splits between model and code (whole picture; numbered blocks found by code; crops), image scaling, structured output or a tool call, with or without thinking, Claude Haiku 5.5 first and one stronger model only as a ceiling. Every variant is recorded with its numbers and cost (`accuracy.md`), and none is rerun for a nicer number. Budget: up to USD 10 (the owner, 2026-11-18); stop and report before passing it.
- **Generality.** A few synthetic timetables in other layouts (a Saturday column, a 12-hour axis with 오전/오후, a professor's line in the blocks, English day labels) are read too; they are a check, outside the bar, and a failure on them is a finding.
- **Measured** on all nine screenshots, each read at least three times with the chosen variant, on the Anthropic API: class times found, times right to five minutes, names and rooms character-exact, classes grouped right, anything invented, what was left out (apart from what was wrong), and the cost and the time of one reading.
- **Accepted** at 100 %: on every one of the nine and on each reading, every class time is found with its day, start and end right to five minutes, its name and room character-exact and its class grouped right, and nothing is invented. A block the reader cannot be sure of is still left out and counted, not guessed; if the chosen variant falls short, exactly which blocks fail, how often and why is listed, and the bar is not lowered.
- **The phone's own reader** stays as the fallback when the server cannot be reached or refuses, with its confidence rule removed (4 above); if the numbers show it does more harm than good as a fallback, it is removed and the import says that it needs a connection.

## What stays as it is

- The screen flow of `이미지로 불러오기`, which is ticket 03's, apart from the one notice that the picture is sent.
- The timetable versions and how an imported one is named.
- The native module. A change to it would need a native Release and is out of this ticket. The app's change is JavaScript only and reaches Users over the air; the route needs a Release of the main server, and the app must work against a server that does not have it yet (it falls back to the phone's reader).

## Acceptance criteria

- [x] Truth files exist for the five new screenshots, and `accuracy.md` gives the pipeline's numbers on them before any change, saying what could and could not be measured.
- [x] The hours come from the axis: a 12-hour axis (`everytime-2`) and 24-hour axes to 18 and to 21 are read right. A unit test covers each.
- [x] Equal names, after NFC and whitespace normalisation, are one class with all their times and each time's room; a near miss is looked at again; unequal names stay apart. Unit tests cover "프로그래밍연습" in two rooms, "수학 1" beside "수학연습 1", and a near miss in both directions.
- [x] No code path reads ML Kit's confidence. (The developers' `/ocr-check` screen still prints it beside each line; nothing decides by it.)
- [x] The decision between the stages is in the ticket's Comments with the numbers it was taken on.
- [x] If stage 2 is taken: the route, its limits, the notice, the module's checks and the fallback are there; the nine screenshots' numbers over three readings, the cost and the time are in `accuracy.md` and the pull request; the 100 % bar above is met or what fails is listed (it is missed by one fading block on two of three readings, listed in `accuracy.md`); the synthetic timetables' numbers are reported.
- [x] The four reference screenshots read as before or better, and no building is linked wrongly.
- [x] Tests by ADR 0007. The model is not called in a test: the module's checks are unit-tested on saved answers, and the route is tested with a fake model.
- [x] `mobile/README.md`, `main-server/README.md` and the P13 spec's line "the image never leaves the phone" say what is true now. A decision that reverses P13's is recorded as an ADR.

## Comments

### Notes from the implementation (2026-11-18)

- **Stage 1, the before column.** On P13's four, the phone pipeline reads 48 of 50 class times (the two faded blocks
  left out), with and without ML Kit's confidence. On the five new screenshots only the pixel half could run (no
  device or emulator here): with the day letters and hour labels placed where the pictures show them, it found all 65
  blocks at their true times, so the faults seen in use are in the text half or in ML Kit's reading of the labels,
  which could not be measured here.
- **The decision.** Stage 2 was taken first on the agreed rule (the text half could not be measured or fixed without
  ML Kit runs), and then on the owner's direction of 2026-11-18 to go to the model-based reader. Numbers it was settled
  on: the whole picture read by the model gets names and rooms right but times wrong now and then (a1 1, a2 2 of 345
  class times; the generic prompt a3 6 of 317; Claude Sonnet 5.5 1 of 115), while the phone's blocks with the model
  reading only their text got no time, name or room wrong in 117 readings. So the design is: the phone sends the
  blocks it finds (day, 24-hour times, colour, and whether the block fades out) with the picture, and the model reads
  their text, and the end of a fading block; without blocks, the model reads the whole picture.
- **Numbers decided on.** Daily limit 10 readings per User (`TIMETABLE_READING_DAILY`); 60 s and 8,000 output tokens
  per model call; body limit 7 MB on this route only (pictures up to 5 MB, the API's per-image limit); a near miss is
  two names of equal length, one character in four apart (at most two), with equal digits and Latin letters and, where
  known, colours within 24 in RGB; a fading block's end is taken from 5 minutes before to 90 minutes after where its
  colour ends.
- **Name versus other lines.** The model returns the name's lines without the room and without other lines such as a
  professor's name or a class code (the synthetic timetables carry both, and none reached a name); the code keeps a
  name only when it is those lines joined with or without a space at each break, and a room only when it matches the
  room pattern.
- **The 100 % bar is missed by one block**: snutt-grey-1's 논리설계 (월 19:00–20:50), which fades out behind SNUTT's
  floating tab bar, is left out on two of three readings (the model gave no end in the window), never read wrong. On
  the synthetic timetables, one reading joined `글쓰기의 / 기초` as `글쓰기의기초`: the only wrong name in any block
  reading.
- **Cost.** One reading: about USD 0.0012, median 5.6 s. All experiments: about USD 0.45 of the USD 10 allowed.
- **The notice**, before the first send, as a dialog (its words changed in the second review, below): title
  "시간표 사진을 서버에서 읽어요", body "더 정확하게 읽도록 사진을 서버의 AI에 보내요. 사진은 읽기만 하고 저장하지
  않아요.", buttons "휴대폰에서 읽기" and "보내기". A yes is remembered on the phone; a no reads on the phone and asks
  again next time.
- **Releases.** The app's change is JavaScript only (over the air). The route needs a Release of the main server; until
  then the app gets 404 and reads on the phone as before.
- **Owed:** a phone check of the notice, the send and the fallback, and an ML Kit run on the five new screenshots to see
  the blocks the phone really sends there.

### Notes from the implementation, later the same day (2026-11-18)

- **The design changed to blocks found from the pixels alone.** The first design placed the blocks with the hour and
  day labels ML Kit read, which for the five new screenshots were placed by hand: the part that failed in use was not
  measured. Now the phone sends a label-free grid (`grid-geometry.ts`: day columns and each block's column, top,
  bottom, colour and fade), the model reads the layout (labels, each block's day and rough times) in one call and the
  text on the placed days and times in a second, and the code fits the pixels to the model's times
  (`grid-mapping.ts`). On the nine screenshots, three readings each: 344 of 345 all right, 0 wrong, 0 invented.
- **Numbers decided on:** a model time counts for the fit within 12 minutes of the line; at least 4 times and 60 % must
  agree; 60 % of the read day labels must agree on the columns' days. A fading block keeps the end where its colour is
  last seen only when the model's end agrees within 5 minutes (the rule with no wrong time on synthetic hidden ends;
  `accuracy.md`). Bounds on the model's answer (review): 80 blocks, 6 name lines of 60 characters, 25 hour labels of 20
  characters, 6,000 output tokens per call (the most seen was about 4,900).
- **Still short of 100 %:** snutt-2's 물리학실험 1, fading behind the tab bar, left out on one reading of three.
- **Tried and dropped:** hour labels found as ink in the pixels (fragile per screenshot); one call naming blocks as
  "column C, block K" (blocks skipped, and when asked again, the next block's text read); the model's own fading end
  (9 wrong of 13 synthetic hidden ends).
- **Cost:** a reading is two calls, median 13.3 s, about USD 0.0025. All experiments: about USD 0.63 of the USD 10.
- **Review, round 1:** the name check is linear and the answer is bounded; blocks the phone finds and does not
  send are counted in the toast; the lint failures are fixed.

### Notes from the implementation, last round (2026-11-18)

- **Faster, and 100 % on the nine.** The text is now read at the same time as the layout, the blocks named by column
  and place, each with the start it read; a block whose start is more than 20 minutes from its placed start is read
  again on its placed day and time. On the nine screenshots, three readings each: 345 of 345 all right, 0 wrong, 0
  invented, 189 of 189 grouped right; median 7.7 s (was 13.3 s), 90th percentile 12.3 s, about USD 0.0028 a reading.
- **The fading end:** when the layout's end does not agree with where the colour ends, one more call asks where that
  block alone ends, and the end is kept only if that answer agrees within 5 minutes. Real fading blocks: 28 of 28 right
  (25 without it); synthetic hidden ends: 0 wrong of 46. When it fires, a reading takes about 3.5 s and USD 0.001 more.
- **A new check:** the fit is refused when the model's times have a median distance of more than 4 minutes from the
  line (the layout read without thinking placed every block 10 to 25 minutes off while passing the old checks); the
  reading then falls back to the whole picture.
- **Numbers decided on:** 20 minutes for the text call's start check; 4 minutes for the fit's median.
- **Review, round 2:** the phone's colours reach the near-miss check only when the answer is on the grid's
  blocks (no colour on the whole picture's fallback, where names alone ask for a second look); the route says
  `usedGrid`, and the phone counts the blocks it kept back only when it is true.
- **Review, round 3:** the layout and text calls are now observed from the start
  (`Promise.allSettled`); a failed layout aborts the text call and the reading fails with 503 (the phone then reads
  the picture); a failed text call leaves the text to be read after the layout; a layout that places nothing refuses
  the grid for the whole picture; a failed fading re-ask reads as no end. Unit tests check that no rejection is left
  unhandled in each case.
- **Spend:** about USD 0.87 for all experiments.

### Notes from the second review (2026-11-18)

- **The grade card.** The 학점계산기 card is covered in `everytime-1`, `everytime-2` and `everytime-dark-1` with a flat
  rectangle of the page's background, the pictures' size kept; the pixel copies are made again, and the card's three
  lines (`학점계산기`, `평균 학점 3.46/4.3`, `5 a 62/130`) are out of `everytime-1.json`. The phone's grid on each is the
  saved one, and the phone pipeline's tests hold their numbers. The three were read again three times each on the
  covered pictures (all right every time). The pictures as they were remain in this branch's earlier commits until the
  branch is deleted, and `everytime-1`'s in `4.0/Main`'s history; no history was rewritten.
- **Bounds.** At most 3 fading ends asked again per reading (`MOST_END_REASKS`), the rest left out and counted; at most
  7 model calls per reading in all (`MOST_MODEL_CALLS`, a hard stop before a call is sent); at most 48 blocks from the
  phone (6 days × 8 classes; the app's 15 classes × 3 meetings is 45; the nine hold at most 16); one deadline of 24 s
  over a reading's calls (`TIMETABLE_READING_TIMEOUT_MS`, was 60 s per call), and the phone gives up after 25 s and
  reads the picture itself. A failed re-read or second look keeps the first reading, those blocks left out.
- **The fallback.** When the server's reading is `none` or has no class, the phone's own reading is taken if it has
  one; with neither, 시간표를 찾지 못했어요 as before.
- **Exact times.** The fit refits once more over the times within 5 minutes of its first line; a second score counts a
  time right only when exact. g3 went from 338 to 344 exact of 344, h4 stays 345 of 345 (`accuracy.md`).
- **OpenRouter.** The nine read once each through OpenRouter: 115 of 115 all right, 0 wrong, 0 left out, median 9.3 s,
  USD 0.0027 a reading; the model reported reasoning tokens there as on the Anthropic API, so it thinks first on both
  paths and the feature needs no particular `llm.key`.
- **The notice** now reads: title "시간표 사진을 AI로 읽어요", body "더 정확하게 읽도록 사진을 서버를 거쳐 외부 AI 서비스에
  보내요. 우리 서버에는 저장하지 않아요.", buttons "휴대폰에서 읽기" and "보내기". The yes is forgotten at a sign-out
  and at the end of a Session.
- **Spend:** this round about USD 0.048 (Anthropic USD 0.024, OpenRouter USD 0.024); about USD 0.92 for all
  experiments.
- **Owed:** a phone or emulator run of the notice, the send, the fallback (including the 25 s give-up), and the import
  of a server reading, with screens.

### Agent usage (2026-11-18)

- Agent time: about 2 hours 10 minutes, one session (an estimate), including waiting for the shared test lock.
- Tokens (estimate, one agent, no subagents): input about 28 million, of which about 26.5 million cache reads and 1.3
  million cache writes; output about 140 thousand.
- Later the same day: about 2 hours 30 minutes more (an estimate), the same agent; tokens about 35 million more input
  (about 33.5 million cache reads, 1.4 million cache writes) and 160 thousand more output, no subagents.
- Last round the same day: about 1 hour 30 minutes more (an estimate), the same agent; tokens about 22 million more
  input (about 21 million cache reads, 0.9 million cache writes) and 90 thousand more output, no subagents.
