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

- The not-running line comes first whenever the shuttle was asked about and is not running.
- `findWay` takes a date; for an item on another day it sets out from the item that ends before it that day, or from the location when there is none.
- The particle follows the last sounded syllable ("24동은").

## Acceptance criteria

- [ ] A shuttle question with a deadline while the shuttle is not running gives the not-running line first. (Unit test, fails before the fix.)
- [ ] A Monday 13:00 Class after a Class in 301동 sets out from 301동. (Unit test, fails before the fix.)
- [ ] "자연과학관6(24동)" takes 은. (Unit test, fails before the fix.)
- [ ] Lint, format and types of the main server pass.

## Comments
