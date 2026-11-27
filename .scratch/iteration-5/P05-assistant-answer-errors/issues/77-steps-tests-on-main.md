# 77: The steps' event tests plan their own event, whatever else the shared database holds

Parent: [P05 spec](../spec.md). Found on 2026-11-28: the full CI of `5.0/Main` at 1d858cf90 (run 46036763990, job main-server) failed three tests that [74](74-steps-over-all-answers.md) added.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: none; tests only.

## What was wrong

Three integration tests of ticket 74 failed in the full run and passed alone:

- `assistant-steps-chain` > Dinner and then an event at a fixed time > both tests: the steps were `[events, meal]`, not `[meal, events]`.
- `assistant-steps-follow-ups` > A follow-up that moves dinner later: the reply's answer had the key `events 2088-03-09`, not `meal 2088-03-09 dinner`.

The tests called `planEvents` with a date and no `eventIds`, so the answer was every published Global Event on 2088-03-09, and assumed theirs was the only one. `interest-topics.integration.test.ts` stores three published events from 2000-01-01 to 2099-01-01 (아직 읽는 설명회, 테니스 원데이 클래스, 테니스 동아리 설명회) and never removes them. Every later file sees them as events of any day. The events answer orders the longest stay first, so one of them became the answer's first plan, under way from 10:52, and its step came before dinner. The follow-up then sent `context.answers` as `[dinner, events]` while the steps on screen were `[events, meal]`. The server pairs the keys on screen with the conditions by order, as ticket 74 says, so the dinner planned again took the events key.

Evidence, from two full local integration runs (`--maxWorkers=4`) on `origin/5.0/Main` 52af5e320: the first failed the follow-up test, the second both chain tests. A dump of the second run's reply showed the events answer's plans as 아직 읽는 설명회, 테니스 동아리 설명회 and 테니스 원데이 클래스 (10:52 to 24:00), then 동아리 정기공연. Storing one 2000–2099 event in the stage before each test reproduced all three failures exactly, with both files run alone. Each file run alone otherwise passed. Nothing depends on the wall clock, the weekday or the order of object keys. #716 changes only the model's per-request line. #703 and #700 are not involved: the code did what ticket 74 says.

## Which side was wrong

The tests. The code's events of the day, longest stay first, and its pairing by order are the documented behaviour. A request like "공연 가자" is a search and then `planEvents` with the ids it returned, as the tool's rules say.

## Fix

| | Was | Now |
|---|---|---|
| The event in the three tests | `planEvents` with the date only: every published event that day, other files' included | `searchGlobalEvents` for 공연 that day, then `planEvents` with the test's own id (`eventPlanned` in `steps-stage.ts`) |
| `context.answers` in the follow-up | `[dinner, events]`, fixed | the answers' conditions in the order of the steps on screen, as the app sends them |
| The 2000–2099 events of `interest-topics` | stored and never removed: an event of every day for every later file | removed when their test ends (`storeLongEvent`) |
| The assertions | unchanged | unchanged |

## Sweep

- Integration tests that #710 and #703 added, run once each: `assistant-steps-chain`, `assistant-steps-follow-ups`, `assistant-several-answers` (its dinner-and-event test checks with `toContain` and the order planned, so other events do not change it) and `assistant-plan-steps`.
- Unit tests that #710 and #703 added: `all-steps`, `steps-added-between`, `steps-follow-ups`, `steps-of-a-message`, `several-answers-reply` and `presented`. None reads the clock or the database. `assistant-study-then-meal` does not exist.
- Other tests that plan a day's events without ids (`assistant-events`, `assistant-left-out-class`) use dates of their own. They would have met the 2000–2099 events too, and `interest-topics` now removes them.

## Tests

- With one 2000–2099 event stored before each test: the old three tests fail exactly as in CI, and the new ones pass.
- `interest-topics`, `assistant-steps-chain`, `assistant-steps-follow-ups` and `assistant-several-answers` pass together (30 tests).

## Acceptance criteria

- [x] The three tests plan their own event and pass whatever other published events the day has.
- [x] main-server's lint, types and format pass.
- [ ] The full CI of `5.0/Main` passes the steps' tests after the merge.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 75 minutes, an estimate, one session (two full local integration runs of about 12 minutes each included).
- Tokens: not measured in the session; roughly input 2.5M, mostly cache reads (about 2.3M) with about 0.15M cache writes, and output 30k, an estimate.
