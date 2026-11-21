# 11: Ways: the shuttle line and a Class on another day

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server.

## What happens now

- The way lookup says "셔틀은 지금 다니지 않아요" only when the question has no deadline. Asked about the shuttle with a 13:00 Class, it gave the same lines as the walk before it.
- `findWay` reads only today's items. Asked "월요일 24동 수업에 늦나?", it set out from the User's location, not from the building of the Monday Class before it.
- "자연과학관6(24동)는": the particle after a name ending in a number in brackets takes the number's sound wrongly.

## What to build

- The not-running line comes first whenever the shuttle was asked about and is not running. With a deadline, the second line is when to set out ("22:29에 나서면 22:40에 맞아요").
- `findWay` takes a `date` for an item on another day. That day's way sets out from the item that ends before it, at its end, never from where the phone is now; the deadline is `by`, or the first item at the Place. The rules tell the model to give it.
- A particle after a word that ends in a digit follows the digit's sound ("자연과학관6은", "인문관2는").

## Acceptance criteria

- [x] A shuttle question with a Class due while the shuttle is not running gives the not-running line first. (Unit test, fails before the fix.)
- [x] A Monday 13:00 Class after a Class in 301동, asked on Saturday night, sets out from 301동. (Unit test, fails before the fix.)
- [x] "자연과학관6" takes 은. (Unit test, fails before the fix.)
- [x] The way's integration tests pass unchanged.
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 5 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 18k; input 13.7M, of which 13.6M cache reads, 35k cache writes and 58 uncached. No subagents.
