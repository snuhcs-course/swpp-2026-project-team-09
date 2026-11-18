# P13: Accuracy of the timetable reading pipeline

Measured on 2026-10-18 by `mobile/__tests__/timetable-ocr-screenshots-test.ts` (`OCR_ACCURACY=1` prints the numbers),
on ML Kit's saved outputs of the four reference screenshots (`mobile/__tests__/fixtures/timetable-ocr/`, made on the
Android emulator in ticket 01) against the hand-written ground truth beside them (`<name>.truth.json`). The Places are
the main server's seed of campus buildings (`main-server/seed/campus-map-places.json`, 250 rows from map.snu.ac.kr),
as `GET /places` lists them.

## Update of 2026-11-18, review round (P15-52): covered grade cards, exact times, OpenRouter

The rules below (the 12- and 5-minute fits, the 4-minute median, the 20-minute start check, the fading-end rule) were
chosen on the same nine screenshots they are measured on; only the synthetic timetables are outside that set.

**The grade card covered.** `everytime-1`, `everytime-2` and `everytime-dark-1` showed 에브리타임's 학점계산기 card
(an average grade and earned credits). Each now has the card covered by a flat rectangle of the page's own background
(white, or 17,17,17 on the dark one), the picture's size unchanged; the pixel copies were made again from the covered
pictures, and the card's three text lines were taken out of `everytime-1.json`. The phone's grid on each is exactly the
saved one (every block at the same place, nothing found in the covered area), and the phone pipeline's tests hold
their numbers. h4's readings of the three were made again on the covered pictures, three each (USD 0.024): 14/14,
13/13 and 12/12 all right on every reading, every time exact. With them, h4 is still 345 of 345 all right, 0 wrong,
0 invented, 189 of 189 grouped right; median 8.0 s, 90th percentile 14.2 s (the readings replaced were 7.7 s and
12.3 s), about USD 0.0028 a reading.

**Exact times.** The score counts a time right within 5 minutes. A second score counts it only when its start and end
are exactly the true ones (the reading's times are snapped to 5 minutes, as the truth is). The fit now also refits once
more over the times within 5 minutes of its first line, so that times 5 to 12 minutes off no longer pull it. The saved
grid runs, re-scored (exact times of the times found):

| Run                    | First fit only | With the second refit |
| ---------------------- | -------------- | --------------------- |
| g1                     | 312/315        | 312/315               |
| g3                     | 338/344        | 344/344               |
| h1, synthetic fades    | 17/21          | 21/21                 |
| h1, the nine           | 88/102         | 88/102                |
| **h4 (chosen)**        | **345/345**    | **345/345**           |
| o1 (OpenRouter, below) | —              | 115/115               |

g3's six include the five of snutt-grey-1 read 10:55–12:10 for 11:00–12:15, which the 5-minute score counted right.
g1's three stay off by 5 minutes after the refit; h1's 14 are the times of its nine-screenshot readings that were
already wrong by more than 5 minutes. The unit test now holds h4 to exact times.

**OpenRouter.** Production's AI uses the key `llm.key` names, `default` (OpenRouter) unless set. The nine screenshots
were read once each with the same module through OpenRouter (`anthropic/claude-haiku-5.5`, run o1, `PROVIDER=openrouter`):

| Run               | Readings | All right | Wrong | Left out | Invented | Grouped | Median | USD a reading |
| ----------------- | -------- | --------- | ----- | -------- | -------- | ------- | ------ | ------------- |
| h4, Anthropic API | 27       | 345/345   | 0     | 0        | 0        | 189/189 | 8.0 s  | 0.0028        |
| o1, OpenRouter    | 9        | 115/115   | 0     | 0        | 0        | 63/63   | 9.3 s  | 0.0027        |

Thinking on that path: the request sends no thinking option (`reasoning-model.ts` turns thinking off only on the
Anthropic path, and only for the experiment's no-thinking variants), and OpenRouter's answers carried no reasoning text,
but every call reported reasoning tokens (1,750 to 3,400 a reading, as the Anthropic readings' 1,900 to 3,300): the
model thought first on both paths, by its own default. So the feature needs no particular `llm.key`; if OpenRouter
ever stops thinking by default, the layout's times would turn careless as in h2, and the median check would refuse the
grid for the whole picture.

**Bounds on one reading** (review): the phone may send at most 48 blocks (6 days with classes × 8 classes a day; the
app's own 15 classes × 3 meetings is 45; the nine hold at most 16); at most 3 fading ends are asked again (real
screenshots needed 0 or 1, the synthetic ones up to 3), the rest left out and counted; and one reading makes at most 7
model calls in all (layout and text, 3 fading ends, one re-read, one near-miss look), with one deadline over all of them
(24 s, under the phone's 25 s). A failed re-read or second look keeps the first reading, the unsure blocks left out and
counted. Measured on 27 h4 readings, the slowest took 22.8 s (one whose grid was refused for the whole picture).

This round cost about USD 0.048 (USD 0.024 on Anthropic, USD 0.024 on OpenRouter).

## Update of 2026-11-18, last round (P15-52): the text read alongside the layout, and a second look at fading ends

**Time.** g3 read the layout, then the text on the placed days and times: two calls one after the other, median
13.3 s. Measured on the nine, three readings each:

| Run             | Variant                                                                                                                                                                                                                 | All right   | Wrong                                                    | Left out | Median    | 90th pct.  | USD a reading |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------- | -------- | --------- | ---------- | ------------- |
| g3              | layout, then text on placed days and times                                                                                                                                                                              | 344/345     | 0                                                        | 1        | 13.3 s    | 18.3 s     | 0.0025        |
| h2              | g3 with the layout call not thinking (stopped after 4 readings)                                                                                                                                                         | —           | every reading of everytime-1 placed blocks 10–25 min off | —        | 9.6 s     | —          | 0.0021        |
| h3              | h2 with the text read at the same time (stopped after 3)                                                                                                                                                                | —           | the same                                                 | —        | 13.3 s    | —          | 0.0036        |
| **h4 (chosen)** | **the text read at the same time as the layout, blocks named by column and place, each with the start it read; a block whose start is more than 20 min from its placed start is read again on its placed day and time** | **345/345** | **0**                                                    | **0**    | **7.7 s** | **12.3 s** | **0.0028**    |

- Thinking off for the layout call made its rough times careless: the fitted line still found enough times within 12
  minutes, and every block came out 10 to 25 minutes off. So the fit now also refuses a line whose times have a median
  distance above 4 minutes from it (on g3's readings it was at most 1.8 minutes, on h2's 9 to 10); the reading then
  falls back to the whole picture. One reading of h1 (snutt-grey-1) had such a layout too, with thinking on, and is
  refused by this check.
- The text call named blocks by column and place (as g1 and g2 did) but did nothing else, and in h4's 27 readings it
  read every block at its start: the check re-read none. Its safeguard against g2's fault, text taken from the next
  block, is the start check, which a unit test covers.
- Shortening the layout's output was tried only by turning its thinking off, which is where its time goes, and that
  broke the fit. Streaming changes nothing here: the server needs the whole answer before it can place a block.
  Prompt caching: the fixed instructions are about 600 to 800 tokens, above Claude Haiku 5.5's 512-token minimum, and
  the server's Anthropic path already marks them with a cache breakpoint (`MODEL_CACHE=breakpoints`); a cache read
  would save under USD 0.0001 a call, and was not measured on time.

**The fading end.** A fading block whose end the layout call read differently from where its colour ends is now
asked about once more, alone ("where does this block end?", with no hint of the colour's end), and kept only if that
answer agrees within 5 minutes. Run h1: the three real fading screenshots 10 readings each and the two synthetic sets
10 each (two readings of the 30 real were refused by the median check above and are not counted):

| Rule                                                | Real fading blocks, 28            | Synthetic hidden ends, 46         |
| --------------------------------------------------- | --------------------------------- | --------------------------------- |
| model's end agrees with the colour's (g3)           | 25 right, 0 wrong, 3 left out     | 0 right, 0 wrong, 46 left out     |
| **the same, or a second look that agrees (chosen)** | **28 right, 0 wrong, 0 left out** | **0 right, 0 wrong, 46 left out** |
| model's end in a window (d4)                        | 25 right, 0 wrong, 3 left out     | 9 right, **27 wrong**             |
| colour's end at a usual minute                      | 28 right, 0 wrong                 | 8 right, **8 wrong**              |
| two readings agree                                  | 22 right, 0 wrong, 6 left out     | 7 right, **15 wrong**             |

The second look fired on 3 of snutt-2's 10 readings, each time reading 17:50 (right): about 3.5 s and USD 0.001 more
on those readings. On the synthetic hidden ends it answered "cannot be told" or the true end (21:50), never the
colour's end, so none was turned into a wrong time.

**The chosen design (h4, with the second look and the median check):** 345 of 345 all right, 0 wrong, 0 invented, 189
of 189 classes grouped right, on three readings of each of the nine screenshots; median 7.7 s, 90th percentile 12.3 s,
about USD 0.0028 a reading. h4 ran with the second look on; it never fired there (snutt-2's fading end agreed every
time). The experiments cost about USD 0.87 in all, of the USD 10 allowed.

## Update of 2026-11-18, later (P15-52): blocks found without any label, and the fading end

The design measured below (d4) placed the blocks with the hour and day labels ML Kit read on the phone, and on the five
new screenshots those labels were placed by hand, since no device run was made: the part that failed in use was the
part not measured. So the blocks are now found from the pixels alone, and the labels are read by the model.

**The label-free grid** (`mobile/src/features/timetable-ocr/grid-geometry.ts`, saved per screenshot in
`main-server/eval/timetable-reading/grids/`): the day columns from the evenly spaced vertical lines and block sides,
and every coloured block's column, top, bottom, colour and whether its bottom fades out. It uses no text: on the nine
screenshots it found all 115 blocks, and flagged the three that fade behind SNUTT's tab bar, from the 330-wide copy
alone (`__tests__/timetable-ocr-grid-geometry.unit.test.ts`). Finding the hour labels' positions from the pixels was
tried first (ink blobs in the strip left of the first column) and given up: light-grey labels, a card's edge, and
block edges bleeding into the strip in the scaled copy each broke the label run on some screenshot, and every fix was
tuned to one picture.

**Mapping without labels' positions** (`main-server/src/timetable-reading/grid-mapping.ts`): the model reads the hour
labels, each listed block's day label and its rough start and end; the code fits one line from pixels to minutes
through all those times by RANSAC over every pair (a time within 12 minutes counts; at least 4 and 60 % must agree), so
a few misread times cannot move it, and takes each block's start and end from the pixels on it, snapped to 5 minutes.
Each column takes the day most of its blocks were read with, the columns' days running on by one, so a hidden day
label (snutt-grey-1's 금) is filled in from the others; labels that disagree, or a week running past Sunday, refuse the
mapping, and the model then reads the whole picture.

| Run             | Split                                                                                                        | Readings | All right   | Wrong                                | Left out | Median time | USD a reading |
| --------------- | ------------------------------------------------------------------------------------------------------------ | -------- | ----------- | ------------------------------------ | -------- | ----------- | ------------- |
| g1              | label-free grid; one call: labels, rough times and text, blocks named "column C, block K"                    | 27       | 315/345     | 0                                    | 30       | 9.7 s       | 0.0017        |
| g2              | g1, blocks the model skipped asked again (stopped after 6 readings)                                          | 6        | —           | 9 names and rooms of the wrong block | —        | 19 s        | 0.0040        |
| **g3 (chosen)** | label-free grid; call 1 the layout (labels, days, rough times), call 2 the text on the placed days and times | 27       | **344/345** | **0**                                | **1**    | **13.3 s**  | **0.0025**    |

- g1: when the model answered every listed block, every one was right; but in 3 of 27 readings it answered only some
  numbers (everytime-1, snutt-1, everytime-dark-1), and those blocks were lost. g2 asked again for the missing ones and
  showed the deeper fault: naming a block by "column 3, block 2" let the model read the text of the next block in the
  column (영상예술의 이해 read as 자연언어처리 개론). A wrong name is worse than a lost one, so g2 was stopped.
- g3 separates the two: the layout call's rough times only fit the line (an outlier is dropped), and the text is then
  read on the placed day and time ("수 12:30–13:45"), the listing d4 read every name and room right with.

### The fading block

| Rule for a block whose bottom fades or runs under a bar                         | Real fading blocks (9 readings)  | Synthetic, end hidden (13)        |
| ------------------------------------------------------------------------------- | -------------------------------- | --------------------------------- |
| the model's end, from 5 min before to 90 min after the colour's end (d2–d4)     | 8 right, 0 wrong, 1 left out     | 2 right, **9 wrong**, 2 left out  |
| the colour's end when it lands on a usual end (:00, :15, :45, :50)              | 8 right, 0 wrong, 1 left out     | 2 right, **2 wrong**, 9 left out  |
| two readings agree on the model's end                                           | 7 right, 0 wrong, 2 left out     | 2 right, **5 wrong**, 6 left out  |
| **the colour's end, when the model's end agrees with it within 5 min (chosen)** | **8 right, 0 wrong, 1 left out** | **0 right, 0 wrong, 13 left out** |

The synthetic fades (`synthetic/make.py`: `synthetic-fades`, `synthetic-fades-2`) draw blocks whose class runs on past
where their colour stops: under an opaque bar, after a fade, and one whose colour stops at 20:50, a usual end, while the
class runs to 21:50. Every rule that trusts the model's end or a usual minute alone turned some of those into a wrong
time; only agreement between the model and the pixels gave none, at the price of leaving out a block whose end is truly
hidden. A crop of the block's lower part with the axis beside it (rule (a) of the brief) was not tried: the server has
no image library to crop a JPEG, and agreement already reaches zero wrong.

### The chosen design (g3), per screenshot over three readings

| Screenshot       | Before (phone pipeline)  | d4 (blocks from ML Kit's labels) | g3, readings 1 / 2 / 3 |
| ---------------- | ------------------------ | -------------------------------- | ---------------------- |
| everytime-1      | 14/14                    | 14/14 · 14/14 · 14/14            | 14/14 · 14/14 · 14/14  |
| snutt-1          | 16/16                    | 16/16 · 16/16 · 16/16            | 16/16 · 16/16 · 16/16  |
| snutt-2          | 12/13                    | 13/13 · 13/13 · 13/13            | 13/13 · 12/13 · 13/13  |
| snutt-3          | 6/7                      | 7/7 · 7/7 · 7/7                  | 7/7 · 7/7 · 7/7        |
| everytime-2      | text half not measurable | 13/13 · 13/13 · 13/13            | 13/13 · 13/13 · 13/13  |
| everytime-dark-1 | text half not measurable | 12/12 · 12/12 · 12/12            | 12/12 · 12/12 · 12/12  |
| snutt-4          | text half not measurable | 12/12 · 12/12 · 12/12            | 12/12 · 12/12 · 12/12  |
| snutt-dark-1     | text half not measurable | 14/14 · 14/14 · 14/14            | 14/14 · 14/14 · 14/14  |
| snutt-grey-1     | text half not measurable | 14/14 · 13/14 · 13/14            | 14/14 · 14/14 · 14/14  |

- **0 wrong, 0 invented, 344 of 345 all right, with no OCR'd label and no hand-placed one.** The 100 % bar is missed
  by one block on one reading: snutt-2's 물리학실험 1 (화 16:00–17:50), fading behind the tab bar, whose end the model
  read differently from where its colour ends, so it was left out and counted. Grouping: 188 of 189, the miss being
  that block's class.
- **Synthetic layouts:** 59 of 60 (the same `글쓰기의 / 기초` joined as `글쓰기의기초` once); the synthetic fades: 0 wrong.
- **Time and cost of one reading:** two calls, median 13.3 s, 90th percentile 18.3 s, slowest 20.1 s; about USD 0.0025 (about 9,500 input
  and 3,000 output tokens for the two calls together). Slower than d4 (5.6 s), which had ML Kit place the blocks first.
- **Joining wrapped name lines:** over every saved block with two or more name lines (888 across all runs), the
  model's own joining was right 887 times; joining without a space would have been right 419 times, with one 469. The
  one miss is the synthetic `글쓰기의기초`. Checking the model's name against its lines with spaces removed, or as the
  lines joined with at most one space at each break, accepted and refused exactly the same 2,723 names; the stricter
  check is kept, now in linear time (P15-52 review).
- **Spend:** about USD 0.63 for all experiments (a1 to g3), of the USD 10 allowed.

## Update of 2026-11-18 (P15-52): reading with the AI

Ticket: `.scratch/iteration-4/P15-app-cleanup/issues/52-timetable-image-reading.md`. Decision:
[ADR 0015](../../../docs/adr/0015-a-timetable-screenshot-is-read-by-the-ai-with-the-phones-blocks.md). The nine
screenshots are P13's four and the five of P15-52 (921 × 2000 iPhone screenshots, fixtures since 2026-11-18): **115
class times** in 63 classes. Every reading below is on Claude Haiku 5.5 through the Anthropic API unless it says
otherwise; the runs' answers are saved in `main-server/eval/timetable-reading/answers/<run>/` and re-scored with the
checks as they are now by `main-server/test/timetable-reading-answers.unit.test.ts`
(`READING_TABLE=1 RUNS=<runs>` prints the tables). A time is **all right** when it is found on its day with start and
end within 5 minutes, its name character-exact and its room character-exact; **wrong** counts times found with any of
those wrong plus anything invented; **left out** counts true times not returned, which the reader reported as left out.

### Stage 1: the phone pipeline (before)

| Screenshot       | Before: the phone pipeline                          | What could be measured                                     |
| ---------------- | --------------------------------------------------- | ---------------------------------------------------------- |
| everytime-1      | 14/14                                               | the whole pipeline, on the saved ML Kit output             |
| snutt-1          | 16/16                                               | the same                                                   |
| snutt-2          | 12/13 (faded block left out)                        | the same                                                   |
| snutt-3          | 6/7 (faded block left out)                          | the same                                                   |
| everytime-2      | pixel half: 13/13 blocks at the right times         | the pixel half only, with the day and hour labels stood in |
| everytime-dark-1 | pixel half: 12/12                                   | the same                                                   |
| snutt-4          | pixel half: 12/12                                   | the same                                                   |
| snutt-dark-1     | pixel half: 14/14                                   | the same                                                   |
| snutt-grey-1     | pixel half: 14/14 (the faded block flagged as such) | the same                                                   |

The text half (names and rooms from ML Kit) could not be measured on the five new screenshots: no emulator or device
was run, and the native module is the only source of ML Kit's output. The pixel half (`__tests__/timetable-ocr-new-
screenshots.unit.test.ts`) found every block of the five at its true time once the day letters and hour labels were
placed where the pictures show them, so the faults seen in use lie in the text half or in ML Kit's reading of
the labels, which could not be checked here. Removing ML Kit's confidence (requirement 4) changed nothing on P13's four:
their readings are equal with and without it. On 2026-11-18 the owner moved the work to stage 2.

### Stage 2: the variants measured

| Run             | Split                                                                             | Readings | All right   | Wrong | Left out | Median time | USD a reading |
| --------------- | --------------------------------------------------------------------------------- | -------- | ----------- | ----- | -------- | ----------- | ------------- |
| a1              | whole picture; prompt naming SNUTT and 에브리타임                                 | 27       | 343/345     | 1     | 1        | 10.0 s      | 0.0016        |
| a2              | a1 with edges followed to the axis, and "cut" only for an edge not seen           | 27       | 343/345     | 2     | 0        | 9.2 s       | 0.0017        |
| a3              | whole picture; generic prompt (any weekly grid), second look at near misses       | 25       | 311/317     | 6     | 0        | 9.7 s       | 0.0018        |
| s1              | a3 on Claude Sonnet 5.5, as a ceiling                                             | 9        | 113/115     | 1     | 1        | 5.9 s       | 0.0187        |
| b1              | the phone's blocks (day and times from pixels), the model reads their text only   | 27       | 339/345     | 0     | 6        | 3.1 s       | 0.0008        |
| d1              | b1 with the generic prompt, colours sent, second look at near misses              | 27       | 336/345     | 0     | 9        | 4.7 s       | 0.0010        |
| d2              | d1 with blocks that fade out sent too, the model reading their end                | 27       | 343/345     | 0     | 2        | 6.2 s       | 0.0012        |
| d3              | d2 with the colour's last row given as a hint (the three fading screenshots only) | 9        | 101/102     | 0     | 1        | 6.9 s       | 0.0012        |
| **d4 (chosen)** | d3 on all nine: the code in this pull request                                     | 27       | **343/345** | **0** | **2**    | **5.6 s**   | **0.0012**    |

Also measured from the saved answers, at no cost: two readings kept where they agree (a time stays only when both read
it alike) turns a2's 2 wrong into 4 more left out (341/345, 0 wrong) at twice the cost; on d4 it adds a left-out
(342/345). Not tried, and why: crops of single blocks (the server has no image library to crop with, and the block
split already reads every name and room character-exact); a tool call instead of structured output, or other thinking
budgets (the reading errors were all times read off the whole picture, which the block split removes, not text); image
scaling (the API reads a 921 × 2000 screenshot at 722 × 1568, where block text is legible: no misread character in any
block-split reading).

What went wrong where:

- **Whole picture (a1–a3, s1): times only.** Every wrong was a time read off the picture, on snutt-1's 15-hour axis
  an end an hour off (a1: 토 09:00–10:50 read 09:00–11:50; a2: 근장 16:00–18:00 read 16:00–17:00 on 수 and 목 in one
  reading), 2-hour blocks on the grid's bottom
  edge read as 1 hour (everytime-1, 19:00–21:00, in 2 of the 3 generic-prompt readings), and on Sonnet 5.5 an end 20
  minutes short (snutt-grey-1). Names and rooms were exact apart from one name cut with `…`, which the code now
  completes. A stronger model does not remove the time errors.
- **Blocks (b1–d4): no wrong at all** on the nine screenshots, over 117 readings. What is left out is the fading block: b1 and d1 left out all
  three (snutt-2's 물리학실험 1, snutt-3's 소프트웨어 개발의 원리와 실습, snutt-grey-1's 논리설계), since the phone does not
  trust an end it cannot see; from d2 the model reads their end, and the code takes it only within 5 minutes before
  to 90 minutes after where the colour ends.

### The chosen design (d4), per screenshot over three readings

| Screenshot       | Before                 | After stage 1 | Stage 2, readings 1 / 2 / 3 |
| ---------------- | ---------------------- | ------------- | --------------------------- |
| everytime-1      | 14/14                  | 14/14         | 14/14 · 14/14 · 14/14       |
| snutt-1          | 16/16                  | 16/16         | 16/16 · 16/16 · 16/16       |
| snutt-2          | 12/13                  | 12/13         | 13/13 · 13/13 · 13/13       |
| snutt-3          | 6/7                    | 6/7           | 7/7 · 7/7 · 7/7             |
| everytime-2      | text half not measured | not measured  | 13/13 · 13/13 · 13/13       |
| everytime-dark-1 | text half not measured | not measured  | 12/12 · 12/12 · 12/12       |
| snutt-4          | text half not measured | not measured  | 12/12 · 12/12 · 12/12       |
| snutt-dark-1     | text half not measured | not measured  | 14/14 · 14/14 · 14/14       |
| snutt-grey-1     | text half not measured | not measured  | 14/14 · 13/14 · 13/14       |

- **0 wrong, 0 invented, every class grouped right (189/189), 343 of 345 class times all right.** The 100 % bar is
  missed by one block on two readings: snutt-grey-1's 논리설계 on 월 19:00–20:50, which fades out behind SNUTT's floating
  tab bar. On two of three readings the model gave no end for it, or one outside the window, and the block was left
  out and counted ("1개는 넣지 못했어요"); it was never given a wrong end.
- **Time and cost of one reading:** median 5.6 s, 90th percentile 8.0 s, slowest 8.9 s, from this machine to the
  Anthropic API and back; about 5,200 input and 1,340 output tokens, USD 0.0012 on average and
  0.0020 at most (a second look doubles the call; it ran on snutt-1's readings, whose names did not change).
- **The experiments cost USD 0.45 in all** (a1–d4 and s1, of the USD 10 allowed).

### Generality: synthetic timetables

`main-server/eval/timetable-reading/synthetic/make.py` draws four weekly grids in layouts neither app uses (Pillow and
Noto Sans CJK, both on the machine): 월–토 with `09:00` labels and a professor's name in each block; English day labels
with a dark theme and `9 AM` labels; `오전 9시` / `오후 1시` labels with a class code under the room and names wrapped
inside a word; and a seven-day week from 8 to 21 with two classes back to back. 20 class times. On d1 all 60 of 60
were all right; on d4, 59 of 60: one reading of `synthetic-ampm` joined `글쓰기의 / 기초` without its space
(`글쓰기의기초`), the only wrong name in any block-split reading. That is a finding, outside the bar: a wrap at a space
on a narrow block can still be joined as one word.

### Not measured here

- ML Kit on the five new screenshots, so the blocks the phone sends there are those of its pixel half with the day and
  hour labels placed by hand; a phone check is owed.
- Pictures from other apps or a camera, and JPEG or HEIC album pictures (the server takes PNG, JPEG, WebP or GIF;
  anything else is read on the phone).
- OpenRouter as the path (`llm.key` naming an OpenRouter key): the same model and prompt, not run.

## Update of 2026-10-22 (`2.0/fix-timetable-ocr`)

The pipeline no longer uses ML Kit's confidence to keep or drop a class, a time, a name or a title, and it measures
the picture's background and grid instead of assuming a white screenshot (dark mode, pale blocks). The plan, with the
inventory of failure modes, is `.scratch/iteration-2/fix-timetable-ocr/plan.md`.

- **The four screenshots read the same: 48 of 50 times, 27 of 28 classes, nothing read that is not there, 29 rooms
  linked right, 0 wrong, 0 unlinked** — with Android's confidences and without them (iOS), which now give the same
  reading. Confidence had dropped nothing on these four, so the count could not rise; the two times left out are the
  faded blocks below, left out on purpose.
- **Room links keep one confidence floor**, `ROOM_CONFIDENCE` 0.5 (was 0.8), on Android only: the rooms read
  0.82–0.95, so the floor now has a margin of 0.32 instead of 0.02. On iOS a room must be read inside one whole OCR
  element. No building is linked wrongly, which stays a hard bar in the tests.
- **Dark mode** is covered by a synthetic copy of the user's dark-mode SNU timetable (1179 px wide), in
  `__tests__/timetable-ocr-pixels-test.ts`: 13 of its 14 times read with their times and rooms, the 14th (running off
  the picture's bottom) left out. **Pending:** the real screenshot and its ML Kit output as fixture `dark-1`, once a
  device run saves them; the screenshots test lists it as to do.
- **Out of scope:** photos of a screen (skew, perspective, moiré, glare), a professor's name printed inside a block
  (joined into the name), two classes overlapping in time drawn side by side at half width (not read: both are
  reported as left out, `too-narrow`, with their names, so the import's "N개는 넣지 못했어요" counts them).
- **Left out on the four:** only the two faded blocks below (`end-uncertain`); the tests hold this, so that nothing
  else (a widget below the grid, a header band) is counted as a class left out.
- **Run time** in Node: about 30–40 ms per screenshot (median of 5), as before.

The tables below are from 2026-10-18; their numbers hold, except where the thresholds table says otherwise.

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
| `ROOM_CONFIDENCE` (`building.ts`): a room is linked (Android)                             | ≥ 0.50 (0.80 until 2026-10-22) | Room lines read 0.82–0.95; all 29 linked, none wrongly. The only confidence check left                                                                                               |
| ~~`NAME_CONFIDENCE`~~                                                                     | removed 2026-10-22             | A class is kept when its name holds a letter or digit, whatever its confidence                                                                                                       |
| ~~Title words' confidence~~                                                               | removed 2026-10-22             | The chevron read as `<` falls out by the title's character filter                                                                                                                    |
| `FADE_DISTANCE` (`blocks.ts`): the rows above a block's bottom edge drift from its colour | > 12 (RGB)                     | The two faded SNUTT blocks drift 20 and 27; every other block less than 1                                                                                                            |
| Block pixel (`pixels.ts`, since 2026-10-22)                                               | chroma ≥ background's + 24     | The background is measured. Block chroma is 80 and up on the four; greys stay under 10                                                                                               |
| Hour labels' RANSAC (`hours.ts`)                                                          | within 0.2 h; ≥ 3 labels agree | 7 to 14 labels per screenshot, all agree                                                                                                                                             |
| `SHORT_NAME` (`classes.ts`): a name cut short joins its whole name                        | ≥ 6 characters, and cut        | `컴퓨터프로그래` (목, its `밍` not read by ML Kit; its line runs to the block's right edge) joins `컴퓨터프로그래밍`. A whole name that starts another (`…` and `…연습`) stays apart |

### To recheck on a device

- **The room floor** (0.5 since 2026-10-22) is far below the lowest room read (0.82); a device run should still confirm
  that rooms read well above it.
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
