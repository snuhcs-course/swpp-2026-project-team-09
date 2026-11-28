# 25: A step's card, words, spans and flags work as the answer alone

Parent: [P03 spec](../spec.md). Builds on ticket 21 (each step shows its own answer) and ticket 23 (the chosen step's top card).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an app OTA update.

## Why

The user tried the released app 26.11.28-7 on his phone with "관정에서 공부하다가 저녁 먹을래": the steps were ① 자리 11:00–17:00 and ② 저녁 17:03–18:03. He raised four points, which are built as dictated:

1. The pager. With ② chosen and the card raised, "‹ 1/2 ›" stood under the meal's list. A plain "저녁" answer has none: "여러 요청의 경우에는 채팅 카드 하단에 화살표가 있고, 평범하게 저녁을 물은 경우에는 없어. 없는 것으로 통일해야 하지 않을까?"
2. The step's word: "자리라는 텍스트 보다는 공부가 낫지 않을까?"
3. The flags' "›". With ② chosen, 학생회관식당's flag lost its "›": "계속 있게 하든 해야 할 것 같아."
4. The steps card's bar: "시간바도 클릭해서 변경할 수 있으면 좋을듯?"

## What changes

- **The pager gives way to a list in the card** (`plan-stepper.tsx`). "‹ 1/2 ›" stands only where the other Plans are nowhere else in sight. It is hidden when the candidates are flagged on the map, as before, and now also when the card lists them (`mealCard`: a meal's list, or a study answer's alone). A step is now the same as the answer alone. Before, the pager was hidden only by the flags, and a step's flags stand in for the candidates', so in a step it showed under the list. An events, Quests, new-Quest or meet answer has no list. It keeps its pager in a step and alone: it is the only way through its Plans there.
- **The step's word** (`wordOf` in `steps-bar.tsx`). The app writes it, not the main server, so no server change is needed. Before:
  - a seat read "자리";
  - a room read "방";
  - a study plan's step read the last word of its title ("공부", of the main server's "…에서 공부");
  - any other step reads the last word of its title, as before ("저녁").

  Now a seat, a room and a study plan all read "공부". The word says what the User does then; the step's flag and its card say where. "방" or "자리" told the kind of booking, which the card under the map already shows. So nothing is lost.
- **The flags' "›" and the press are one rule** (`stepPressOf` in `screens/main/step-press.ts`, new). The flag's "›" and its press read the same function (`use-made-scene-map.ts`):
  - another step's flag chooses that step;
  - the chosen step's flag, when it is the booking on screen, opens its card, as before;
  - the chosen step's flag, shown as an answer, does what that answer's chosen place does alone (`withMealMenu`). For a meal with menus that is the restaurant's menu, and for a study place alone its spaces; otherwise it opens the pick's card (`MarkRows`, which `OpenMark` now opens for a step's answer flag even while a booking is on screen);
  - a step not done, or a card not on screen, does nothing and carries no "›".

  Before, the chosen step's flag did nothing unless it was the booking, so the meal lost its "›". A meal whose menus are not known now keeps it too, and opens the pick's card, as alone.
- **A press on a step's span chooses that step** (`Track` in `steps-bar.tsx`). It uses the same handler as the step's words. Each span is a press 44 high over its own width: the 24 drawn, the bar's 8 above, up to the words, and 12 below, the bar's padding or the day's line, which takes no touch. It is a box of its own, not a hit slop, because Android sends no touch to a child outside its parent's bounds. The track stays where it was drawn. The gaps between spans take no press. A screen reader reaches the step through its words, so the span is not a second element for it.

## Each kind of step, swept

| Step | Its word | "›" not chosen | "›" chosen, and the press | The pager |
| ---- | -------- | -------------- | ------------------------- | --------- |
| seat | 공부 (was 자리) | yes, chooses it | yes, opens the booking's card | none |
| room | 공부 (was 방) | yes, chooses it | **none: open point.** A room's booking is not drawn on the map (ticket 23), so its flag has no card to open | none |
| study plan, alone | 공부 | yes, chooses it | yes, opens the place's spaces | none: its list |
| study plan, together | 공부 | yes, chooses it | yes, opens the pick's card | kept: no list |
| meal with menus | 저녁, 점심 … | yes, chooses it | yes, opens the menu (was none) | none: its list (was shown) |
| meal without menus | 저녁, 점심 … | yes, chooses it | yes, opens the pick's card (was none) | none: its list (was shown) |
| events, Quests, a new Quest, meet | its title's last word | yes, chooses it | yes, opens the pick's card (was none) | kept: no list |
| a step not done | as its kind | yes, chooses it | none | none |

## Acceptance criteria

- [x] With ② chosen and the card raised, the meal's list stands with no pager, as a meal alone; it failed before the fix. (Integration test, `answer-steps-press`; the existing steps tests now browse with the list's rows: `answer-frame-steps`, `answer-steps-live`, `answer-steps-own-answers`.)
- [x] The steps card reads "1번 공부" for the seat; it failed before the fix. (Integration test, `answer-steps-press`.)
- [x] Both flags carry "›" with ① chosen and with ② chosen, and the chosen meal's flag opens its menu, or its pick's card without menus; it failed before the fix. (Integration test, `answer-steps-press`; the one rule for every kind, unit test `step-press`.)
- [x] A press on a span chooses its step, over a touch 44 high; it failed before the fix. (Integration test, `answer-steps-press`.)

## Comments

### Agent usage (2026-11-28)

- Agent time: about 1 hour, an estimate: one session's active time from the user's four points to the PR, much of it test runs on a loaded machine.
- Tokens: input about 62.0M in all: 316 uncached, cache writes about 1.11M, cache reads about 60.9M. Output about 98K. No subagents.
