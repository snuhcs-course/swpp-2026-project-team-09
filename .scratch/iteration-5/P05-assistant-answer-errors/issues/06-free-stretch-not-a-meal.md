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

- A meal line says the hours and what ends it, as clock times: "11:30–13:30 · 13:53엔 16동으로 나서요" when a next item ends it first, and the hours alone when the closing does.
- A meet line says until when both are free only when someone's next item ends it ("민수 15:00 수업 전까지"); when the end is the day's limit it says that neither has anything after.
- Minutes stay where they are a length a person acts on: walks, and the time left together when an item ends it and it is under two hours.

## Acceptance criteria

- [ ] No meal, menu or meet line holds "식사 N분" or "N분 먹을 수 있어요". (Unit tests, fail before the fix.)
- [ ] A meet that runs to 22:00 says nothing of 780 minutes. (Unit test, fails before the fix.)
- [ ] A meal ended by a Class says the leave-by time and the Class's building. (Unit test.)
- [ ] Lint, format and types of the main server pass.

## Comments
