# 03: The nightly level's failing app tests test the app as it is

Parent: [A01 spec](../spec.md)
Status: ready-for-agent
Pull request: #610
Blocked by: None

Native files: none. Releases: none; only test files change.

## What happens now

The nightly-level CI run on 5.0/Main at 2d0cb5ba9 (run 45807726226) failed two app integration tests in shard 1/4. It also failed three more in shards 2–4, which were cut at the job's 45-minute limit. The app's integration tests run only at the nightly level, so a pull request's own CI never runs them. Each of the five tests is out of date or was wrong when written; the app does what each one means to check.

- `answer-sheet-high`: wrong since PR 553, which added it.
  - The test fired a layout on `time-bar`, a view with no layout handler, so the testing library passed it to the stage's handler. The stage's height became 116 and high became 90.
  - It fails at PR 553's own commit and at every app commit since.
- `main-first-run-answers` › the Timetable card: wrong since PR 516, which changed its way back from 시간표 to "답 닫기", the answer's close button.
  - 시간표's way back is "뒤로". The Class was saved and the first-run card had passed on to interests.
- `room-typed-place` › words naming more than one Place: out of date since PR 459 (2026-11-22), which loads the places list on the map screen.
  - The test gave the server two "제1공학관" places only after the words were typed, by which time the app held the list in which the words name one Place.
- `party-mine` › a Quest whose step started yesterday: out of date since PR 562 (2026-11-25), whose thin 내 파티 card puts the date and the place on one line.
  - The PR moved the file's other checks to that line but not this one.
- `ask-for-push`: its cases take 20 to 60 seconds each under load, and now and then one passes Jest's 60-second limit.
  - Run alone twice, one case failed each time, a different one each run (61.5 and 62.3 seconds).
  - In the shard, the cases after it failed with it.
  - The slowest case, "closes on 나중에" (it signs out, signs in, and sends again), passes alone in 47 to 101 seconds, so it is slow, not stuck. On CI the whole file passed in 415 to 435 seconds on 2026-11-23.

Two more tests fired the same layout on `time-bar` and passed without testing what they mean to:

- `answer-sheet-steady` told its fractional heights to the stage, not the time card.
- `answer-time-bar-height`'s `layBar` calls moved only the stage.

## What to build

1. The time card's height is told through its folded parts (`layFolded`), never a layout on `time-bar`. `layBar` goes.
2. The Timetable card's test goes back from 시간표 by "뒤로".
3. The places with two "제1공학관" are the server's answer before the room opens.
4. The yesterday Quest's date is matched at the start of the card's line, as PR 562 matched "내일 12:00".
5. `ask-for-push` allows each case 150 seconds, as the app's other long files do.

## Acceptance criteria

- [x] `answer-sheet-high`, `main-first-run-answers`, `room-typed-place`, and `party-mine` pass, each run alone.
- [ ] `ask-for-push` passes at the next nightly level. On a Mac under a load of about 30, the 나중에 case once passed even 150 seconds.
- [x] `answer-sheet-steady` and `answer-time-bar-height` pass with the time card laid out through its parts.
- [x] No test fires a layout on `time-bar`.
- [x] No app source or native file changes; lint, format, and types pass on the app.

## Comments

Built in PR #610 from a triage of nightly-level run 45807726226. Each file was run alone on 5.0/Main or this branch with `--maxWorkers=2`. `answer-sheet-high` was bisected over every app commit since PR 553. Its stage height was found by logging the sheet's inputs.

### Agent usage (2026-11-26)

- Agent time: about 1.2 hours in one session, test runs and the bisect included (an estimate).
- Tokens, to the PR's opening: input 25,195,098 (cache reads 24,968,101, cache writes 226,731, uncached 266); output 72,181. No subagents.
