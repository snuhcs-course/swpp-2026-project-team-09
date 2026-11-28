# 97: A recalculated answer keeps a sentence, for every kind

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

The user's phone on 2026-11-28: he moved the bar of a meal answer. The card's words became "302동식당 · 11:30 · 걸음 4분 · 목살김치찌개 외 5 · 6,500원", the list's own row again, in place of a sentence. That happens in a fresh conversation too, whenever a meal answer is recalculated: moving the bar, "＋ 같이", a chip, the bar's other meal.

## Cause

P04 ticket 61's rule, for a meal and a study alone only (`mealWordsOf`): the model's words while the Plans on screen are the reply's, else the chosen place's row. The main server sends no words with a recalculation (POST /assistant/answers). Every other kind kept the reply's words after a recalculation, even when they named a place no longer first.

## What to build

One rule for every kind, `recalculatedWords` (`features/assistant/recalculated-words.ts`). It replaces P04 ticket 61's row line:

- The reply's sentence stays through recalculations, unless it names a place of its answer that the recalculated answer no longer has first, or the time the first started at, which moved.
- Then, or with no model's words at all, one plain sentence in the model's tone: "302동식당을 추천해요.", with the time when the first starts at another one ("12:30에 …"), and whom with ("김민수와 …", "김민수 외 2명과 …").
- `mealWordsOf` uses it for a meal and a study alone. The one-place-left sentence stays. `PlanCard` uses it for every other kind once recalculated.

## Acceptance criteria

- [x] By its partitions: not recalculated; the same first place; another first place named; no place named; the first's time moved, named or not; no words; no Plan. (Unit test, `features/recalculated-words`.)
- [x] The meal words: the reply's while its Plans are on screen; the sentence, never the row, without words or after a recalculation; the Friends in the sentence. (Unit test, `meal-words`.)
- [x] Taking 민수 out recalculates the answer, and its words are "11:50에 301동식당을 추천해요.", not the row. (Integration test, `answer-meal-list`.)

## Comments
