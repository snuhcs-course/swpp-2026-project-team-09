# 06: A free stretch is not called a meal or time together

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-restaurant-hours-with-two-counters.md) for the right hours in the examples; the change works without it.

Native files: none. Releases: the main server.

## What happens now

A plan's `togetherMinutes` is the whole stretch from the start to the first end: a restaurant's closing, someone's next item, or the day's limit of 22:00. The answers print it as a length of eating or of time together:

- "점심 301동식당 · 11:00–14:30 · 식사 210분" (meal answer, its map flag and the unmet words);
- "13:53까지 173분 먹을 수 있어요" (menu answer: 13:53 is the leave-by for a 14:00 Class);
- "22:00까지 함께 780분이에요" (meet answer, a stretch to the day's limit).

## What to build

- Minutes are said only up to two hours, a stay a person can act on. The designed lines for short stays stay as they are ("식사 22분", "12:45까지 55분 먹을 수 있어요", "12:43까지 함께 28분이에요").
- A longer meal stretch is said by its end: "13:53엔 나서요" when someone's next item ends it, "14:30에 닫아요" when the Restaurant's own hours do, "14:30까지" when only the meal's general window does. The band shows the times alone.
- A longer menu stretch is said as "11:00부터 · 13:53엔 나서요", or as the times alone when nothing follows.
- A longer meet says "15:20까지 함께할 수 있어요" when someone's next item ends it, and "그 뒤로는 일정이 없어요" when only the day's 22:00 limit does.

## Acceptance criteria

- [x] A meal stretch over two hours has no "식사 N분" in its lines or band. (Unit test, fails before the fix.)
- [x] A menu stretch of 160 minutes is said by its times, not "160분 먹을 수 있어요". (Unit test, fails before the fix.)
- [x] A meet that runs to 22:00 says that nothing follows, with no minutes. (Unit test, fails before the fix.)
- [x] Stays of two hours or less keep their minutes. (The existing unit and integration tests, unchanged.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 6 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 22k; input 11.1M, of which 11.1M cache reads, 41k cache writes and 58 uncached. No subagents.
