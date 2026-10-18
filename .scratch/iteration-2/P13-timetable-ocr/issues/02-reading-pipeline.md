# 02: Reading a timetable screenshot into classes, and its accuracy on the four screenshots

Parent: [P13 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (for the saved outputs; the pure steps can start at once with hand-made inputs)

## What to build

Given what ticket 01's module returns for a screenshot, the app works out the classes in it: names, days, start and end times, rooms and buildings. Whatever is uncertain is left out rather than guessed. The pipeline is plain TypeScript with no React and no native code, as the spec's "Reading pipeline", "Linking a room to a building" and "Leaving out what is uncertain" describe:

1. **The grid.** The day header gives the columns, with grid lines as the fallback. The hour labels sit in the left strip, below the header. 12-hour labels are unfolded, and pixels are fitted to times with RANSAC.
2. **The blocks.** A saturation mask, closed, is split into connected components. Components are cut at column edges, the header, label strip, tab bar and tiny components are dropped, and stacked same-colour blocks are split.
3. **The times.** A block's top and bottom become times, rounded to 5 minutes. A time whose end is uncertain is left out.
4. **Name and room.** A block's lines are read top to bottom. A line that matches the room pattern is the room; the others are joined into the name. A name cut with `…` is kept as it was read.
5. **One class.** Blocks with the same name become one class with several times, unless two of its times would cross on the same day.
6. **The title.** The screenshot's title names the new version, or `새 시간표 N` when there is none.
7. **The building.** The longest leading run of the room's segments that is a campus Place's number. Only a room line that matches the pattern on its whole length, above the confidence threshold, is linked. Anything else leaves the time without a building or a room.

The four reference screenshots get a hand-written ground truth. Jest runs the pipeline on ticket 01's saved outputs and writes the measured accuracy to `accuracy.md` in the task folder.

## Acceptance criteria

- [x] The pipeline's output has the spec's `ReadClass` shape: a name and, for each time, weekday, start, end, room or null, and placeId or null.
- [x] 12-hour and 24-hour hour labels give the same fit; a single misread label does not move the fit by more than 5 minutes.
- [x] Columns come from the day header, `월`–`금` or `월`–`토`, with grid lines as the fallback when the header is missing.
- [x] Two same-coloured blocks side by side become two blocks, as 근장 on 수 and 목 does.
- [x] A block that runs under the tab bar or fades out at the bottom is left out, as the 수 19–20 block of the first screenshot is.
- [x] Rooms such as `302-311-1`, `43-2-B101`, `500-L308`, `43-1` and `26-404` are read as rooms; `43-1-304` links to building `43-1` with room `304`. A cut or messy room line links nothing.
- [x] No time is linked to a wrong building on the four screenshots.
- [x] A name cut with `…` is kept as read, without the `…`.
- [x] Each step has unit tests: unfolding, RANSAC with a wrong label, cutting at a column edge, splitting stacked blocks, the room pattern, the building lookup, merging a class's times, the title.
- [x] One Jest test per reference screenshot compares the result with its ground truth.
- [x] `accuracy.md` reports per screenshot and in total:
  - classes found (recall) and classes found that are real (precision);
  - the day, and the start and end within 5 minutes;
  - the name's character error rate;
  - the room exact;
  - buildings linked correctly, linked wrongly and left unlinked;
  - what was left out and why.
- [x] The confidence thresholds are chosen from the four screenshots and named in `accuracy.md`.
- [ ] Running the whole pipeline on one screenshot takes under 2 seconds on the emulator.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 45 min, an estimate: one implementing agent on branch `2.0/P13-02-reading-pipeline`, from reading
  the spec and the fixtures through the ground truth, the pipeline, the tests, `accuracy.md` and the self-review. The
  coordinating session is not counted here.
- Tokens, from the transcripts of the implementing subagent and one review subagent: input 36,390,469, of which 35,309,577 cache reads, 1,080,560 cache writes and 332 uncached; output 77,455. The main session's tokens are not split per ticket and are not included.
- Not done here: the run time on the emulator. In Node the pipeline takes about 30–70 ms per screenshot (see
  `accuracy.md`); the emulator's number comes with ticket 04, which calls the pipeline from the app, so the last box
  stays open.
