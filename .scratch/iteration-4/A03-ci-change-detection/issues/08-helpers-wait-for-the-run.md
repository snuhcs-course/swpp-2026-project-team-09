# 08: The judgement and same-event tests' helpers wait for the step they start

Parent: [A03 spec](../spec.md)
Status: done
Blocked by: None

## What to build

The helpers of `JudgementWorld` (`main-server/test/judgements.ts`) and `SameEventWorld` (`main-server/test/same-event.ts`), which 15 integration test files use, send a Collection message and then wait only for its posts: `nextCollection` did not wait at all, `collected` waited until the post was finished or its Judgement left for another try, and `through` until its posts were finished. The step after the message goes on after that: a post's `stepFinishedAt` is set inside its own transaction, and a run may still have other posts or calls ahead of it. Such a run could call `judgePost`, `publishPost` or `overLinks` after its test ended, inside the next test's spy, which is how a merge queue build timed out (ticket 07). Three other tests have a spy that the first call uses up, and passed only because the tests before them happen to leave no such call.

`collected`, `nextCollection` and `through` now send through `sent`. On the judging server, `sent` spies on that server's `PublicationStepService.run` (calling through), waits for the run the message starts, and returns once every run started meanwhile has returned. A message to another server of a test is sent as before, since its step is another object that no spy of these files watches.

## Acceptance criteria

- [x] `JudgementWorld.sent` waits for the step's run after a message to the judging server; `collected`, `nextCollection` and `SameEventWorld.through` use it, and what each waits for afterwards is unchanged.
- [x] Each of the 15 integration files that use these worlds, the seven `judgement-*` files and the eight `same-event-*` files, passes locally with the change.
- [x] Lint, format and typecheck of `main-server` pass.

## Comments

### Decisions (2026-11-16)

- `sent` takes the step instance from the world (`world.step`), not a class looked up on the app, since each `startApp` loads the modules anew and an app's classes are its own.
- A message to a test's other server (`notPublishing`, `notJudging`, `turnedOff` and the like) still returns once sent: no spy of these files is on those servers' steps.

### Local runs (2026-11-16)

The Mac was shared with other sessions' test runs, which slowed it greatly.

- All 15 files together, twice. First: 12 files passed, and one test each in `same-event-choice`, `same-event-queue` and `same-event-races` ran out of its 5 seconds. Second: 11 files passed; `judgement-settings`, `same-event-judged` and `same-event-unplaced` ran out of their 60 seconds while starting their servers, before any test, and one test in `same-event-detach` ran out of its 5 seconds.
- Each file that failed there passed when run again with the change: `same-event-choice`, `same-event-queue` and `same-event-races` together 36 of 36, and `same-event-detach` 10 of 10. The other three had passed in the first run. With the helpers of `4.0/Main`, the same runs gave the same results at about the same times; "makes one call for one post" took 2.4 s with the change and 2.6 s without.
- No time-out was in a step of the helpers: the starting hooks call none of them, and the change waits only for a run that the files' tests already wait for through its posts.

### Agent usage (2026-11-16)

The A03 session did this ticket alone, without subagents.

- Agent time: about 20 minutes, an estimate from the transcript's timestamps; most of the rest was waiting for the shared test lock.
- Tokens: output 26,291; input 24,577,504, of which 24,535,419 were cache reads, 42,011 cache writes, and 74 uncached. Without cache reads: 68,376.
