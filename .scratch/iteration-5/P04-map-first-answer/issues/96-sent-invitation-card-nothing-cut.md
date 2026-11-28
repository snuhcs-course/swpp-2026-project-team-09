# 96: The sent invitation's card cuts nothing and says nothing twice

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

The user's phone on 2026-11-28 (released app, real server). He sent a lunch invitation to 김태현 for 모레(월) 11:30 at 301동식당. The chat card then read:

- the chips "301동에서 | 13:00까지 | 김태현 · 아직 안 봄", cut at the card's edge;
- "김태현에게 점심 초대를 보냈어요" and "모레(월) 11:30 301동식당 · 수락하면 알려 드려요";
- a row "① 11:3  301동식당에서 식사", with the clock cut, saying the line above again.

His words: "UI 정렬 등이 별로야. 11:3 도 이상하고".

## Causes

- **The cut clock.** `QuestSteps` (`screens/main/answer/quest-steps.tsx`) set the start in a column 44 wide, in a row 28 high. At a large font, "11:30" in the body type is about 58 wide: it wrapped, and the row cut its second line. The plan stepper's count ("10/11") sat in the same kind of column, 44 wide.
- **The row that repeats.** A Quest made from a meal has one step, at the Plan's start and at its Restaurant: the card's second line already says both. A received invitation's title says its one step the same way.
- **The cut chips.** The sent card set its chips in a horizontal scroll; the meal answer's wrap.

## What to build

- **`QuestSteps`:**
  - nothing of a row has a fixed width or height any more: the number's circle, the start's column and the row are at least their former sizes, and a large font widens them rather than cutting them;
  - every start is "HH:MM" in tabular figures, so the titles still begin at one edge;
  - a step without a start holds an unseen "00:00".
- **`onlyRepeats(steps, startAt, place)`:** the steps only say the card's line again when they are one step, at the line's time, at the place the line names. The sent card and the received invitation card leave their step rows out then. Two or more steps, or one at another place (a meeting's "302동 앞에서 만나기"), keep them.
- **The sent card's chips** wrap onto more lines, as the meal answer's do.
- **The plan stepper's count** is at least 44 wide rather than 44.

## Acceptance criteria

- [x] A step row has no fixed width or height. A step without a start keeps its column. (Unit test, `quest-steps`.)
- [x] `onlyRepeats` by its partitions: the same step; another place; another time; two steps; a line with no place. (Unit test, `quest-steps`.)
- [x] The sent card of a meal leaves its one step out, and its chips wrap. (Integration test, `answer-invite`.)
- [x] A received invitation of one step at its title's time leaves the row out; one of two steps keeps both. (Unit test, `received-invitation-card`.)
- [x] The plan stepper's count is at least 44 wide, not 44. (Integration test, `answer-events`.)
- [ ] Pictures at font 1.0 and 1.3, before and after.

## Comments
