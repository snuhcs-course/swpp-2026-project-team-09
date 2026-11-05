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

- [x] Unit tests of the time reader fix each pattern above, written in new words, never a held-out post's line:
  - `1. 3월 9일(화) 오후 2–5시` reads as 3월 9일 alone, never 1월 3일;
  - `12. ` is handled like `1. `;
  - a date that really starts a line is still read.
- [x] `오후 2–5시` gives a start of 14:00 that `hasTimeOfDay` and `timeAgrees` accept, and the same holds for `~` and `-`. `오전 9–11시` gives 09:00.
- [x] A quoted line that differs from the post only by U+00AD, U+200B or U+FEFF passes `linesInPost`.
- [x] A publication-step integration test with a scripted Judgement shows a post written in each of these ways published. The same test with a wrong date still fails the date check, so the fix lets nothing wrong through.
- [x] Existing Judgement unit and integration tests pass unchanged.
- [x] The replay measurement above is recorded.

## Comments

### Replay of the saved Judgements (2026-11-05)

A development reading, not a held-out result: the target cases are held-out posts the failure analysis read (spec, Measurement). Run on a clean tree at `57e1ad3a` with

```sh
pnpm eval:collection --run judgement --part held-out --from eval/results/collection-held-out-judgement-464ea9c5.json --no-model
```

| | `464ea9c5` (saved) | `57e1ad3a` (replay) |
|---|---:|---:|
| C1 published without an Administrator | 27/64 | 35/64 |
| C2 wrong publications | 0/27 | 0/35 |
| C3 wrong places (published sessions) | 0 | 0 |
| C3 diagnostic (sessions failing a check too) | 0 | 0 |

C1 rose by 8, as expected; C2 and C3 stayed 0. The first commit, `30c63670`, gave the same numbers. The result files are not committed.

### Decisions (2026-11-05)

- **List numbers.** `writtenDays` and `rangesEndIn` drop a leading `N. ` (one or two digits, then a space) only when a day follows it. They keep it when what follows is a day written with dots (`9. 2`), because the number is then that day's month or year. So `11. 2.(월)`, `3. 9. 2시` and `26. 11. 2.(월)` keep their dates. The review found the dotted case, which the first commit got wrong (`3. 9. 2시` read as 9월 2일).
- **Known gaps, unchanged.**
  - `1.3월 9일`, with no space after the number, still reads as 1월 3일.
  - `11. 2. 3시` already read as 2011-02-03 before this ticket, because the `DAY` rule takes `11.` for a year. It is not changed here.
- **오전/오후 N–M시.** `isWrittenClock` reads `오전 N–M시` and `오후 N–M시`, with `–`, `~` or `-`, as if they were written `오후 N시–M시`.
  - Only 오전 and 오후 are read this way, and only those three dashes, as the spec says.
  - A following `시간` is not taken for a clock, so `오후 1-2시간` holds no 13:00.
  - M keeps its existing reading as a daytime hour.
- **Invisible characters.** `normalised` drops U+00AD, U+200B and U+FEFF before it collapses spaces.
  - The post lines and the quotes both go through `normalised`. So do the place checks (`placeInLines`, `matchedPlace`) and the `newSession` key, which now ignore these characters too.
  - JS's `\s` already matched U+FEFF, so a BOM between words was already handled. The change matters for one inside a word or number.
- **Tests.**
  - The time reader cases are in `judgement-time.unit.test.ts`.
  - The check-level cases are in a new `judgement-checks-time-reading.unit.test.ts`, because `judgement-checks.unit.test.ts` is near the 300-line limit.
  - The seam test is `judgement-time-reading.integration.test.ts`. It sets the CLOCK to 2081-01-15, so that a day without a year is read in 2081.
  - Every new case fails on `origin/3.0/Main`'s source.
- **The eval scorer.** `eval/collection/score-a.ts` also calls `writtenDays`, to find application lines, so it now drops list numbers too.
- **Full run.** The first full `pnpm test` had 32 files fail on timeouts (hooks over 60 s, tests over 5 s) while the Mac was loaded. Those 32 files passed when rerun with `--maxWorkers=2` (614 tests), and the other 198 had passed. The unit project passes (1,021 tests), as do `tsc`, `oxlint` and `prettier`.

### Agent usage (2026-11-05)

- Agent time: about 35 minutes in one session, up to the PR. This is an estimate, and it includes the test runs and the lock waits.
- Tokens, main session and its two `/code-review` subagents together:
  - Input: 178 uncached, plus 7,752,181 cache reads and 225,987 cache writes.
  - Output: 50,377.
  - The two subagents' share: 34 uncached input, 644,645 cache reads, 103,567 cache writes and 9,472 output.

