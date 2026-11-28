# 13: The logger's text test passes whatever second its two lines are written in

Parent: [A02 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: none; a test only.

## What happens now

`main-server/test/logger.unit.test.ts`, "text, in a request → the same text as outside one", fails now and then. On 2026-11-28 it failed in the merge queue's run for PR 722 (run 46043452250), which changed no source file, and took that PR out of the queue:

```text
- [Nest] 4257  - 11/27/2026, 5:40:09 PM    WARN [WalkingRouteService] Kakao did not answer: timeout
+ [Nest] 4257  - 11/27/2026, 5:40:10 PM    WARN [WalkingRouteService] Kakao did not answer: timeout
```

## Cause

The test writes the same two lines outside a request and inside one and compares them after `fromLevel` cuts "the process ID and the time" off each line. `fromLevel` looked for the level followed by a space (`WARN `). NestJS's `ConsoleLogger` colours the level, so a colour code stands between the level and the space, the pattern never matched, and nothing was cut. The whole lines were compared, time included: equal when both were written within one second, different when the clock passed a second between them.

The test was wrong, not the logger. It has been so since ticket 12 (PR 542).

## What to build

- `fromLevel` takes the colour codes off (`stripVTControlCharacters`) before it cuts the process ID and the time.
- The test writes its two sets of lines one second apart, with the clock set, so that it fails every time with the old `fromLevel` and passes every time with the new one.

## The class

Every test file that reads the logger's lines or `LOG_FORMAT` was read: `logger.unit.test.ts`, `settings-log-format.unit.test.ts`, `request-logs.ts`, `global-setup.ts`. Only this one test compares two writes of text lines; the others read JSON lines by field or check that no line is JSON.

## Acceptance criteria

- [x] With the old `fromLevel` and the two writes a second apart, the test fails (run locally: 1 failed, 10 passed).
- [x] With the new `fromLevel`, `logger.unit.test.ts` passes (11 of 11).
- [x] main-server `pnpm lint`, `pnpm format:check` and `pnpm typecheck` pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 15 minutes, in the orchestrating session, including one install and the two runs. An estimate.
- Tokens: not measured apart from the orchestrating session's turn; an estimate of 120k input (about 100k cache reads, 20k cache writes) and 6k output. No subagent.
