# 01: The time checks read list numbers, `오후 N–M시` and invisible characters correctly

Status: ready-for-agent

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-01-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges as soon as it is approved; ticket 06's after set measures its head at approval, before it takes in `3.0/Main` (spec, Measurement, changed plan). Heavy jobs take the shared lock (spec, Measurement).

**What to build:** A session whose time the Judgement read correctly is no longer held back because the server's time checks misread its line. Three ways of writing a time are affected:

- A list number at the start of a line (`N. M월 D일(요일) 오후 H–H시`) is not read as part of the date.
- In `오전 N–M시` and `오후 N–M시`, written with `–`, `~` or `-`, N counts as a written clock with that 오전 or 오후.
- A soft hyphen (U+00AD), a zero-width space (U+200B) or a byte-order mark (U+FEFF) in the post does not stop a quoted line from matching the post.

Spec: `../spec.md`, "AB-1: time parsing".

**Blocked by:** None (can start immediately).

**Merge 주의:** 04 also changes the Judgement time reader and the text normaliser, for `timesConsistent`. Whichever lands second merges the other in; neither waits for the other.

## Target cases and expected result (written before implementing)

- a-058 session 6, a-064 session 1, a-029 sessions 1 and 2: every other check already passes, so each should become published. C1 is expected to rise from 27/64 to about 35/64, with C2 and C3 still 0.
- Measured alone by replaying the saved Judgements of `collection-held-out-*-464ea9c5`, at no model cost. The replay's C1, C2 and C3 are recorded under `## Comments` before ticket 06's after run, as a development reading: these cases are held-out posts the failure analysis read (spec, Measurement).

## Acceptance criteria

- [ ] Unit tests of the time reader fix each pattern above, written in new words, never a held-out post's line:
  - `1. 3월 9일(화) 오후 2–5시` reads as 3월 9일 alone, never 1월 3일;
  - `12. ` is handled like `1. `;
  - a date that really starts a line is still read.
- [ ] `오후 2–5시` gives a start of 14:00 that `hasTimeOfDay` and `timeAgrees` accept, and the same holds for `~` and `-`. `오전 9–11시` gives 09:00.
- [ ] A quoted line that differs from the post only by U+00AD, U+200B or U+FEFF passes `linesInPost`.
- [ ] A publication-step integration test with a scripted Judgement shows a post written in each of these ways published. The same test with a wrong date still fails the date check, so the fix lets nothing wrong through.
- [ ] Existing Judgement unit and integration tests pass unchanged.
- [ ] The replay measurement above is recorded.
