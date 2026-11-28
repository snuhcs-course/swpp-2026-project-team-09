# 85: A Friend added to a meal already sent ends in a way forward

Parent: [P05 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: the main server and an app OTA update.

## What happens now

The user's phone on 2026-11-28 (released app, real server). He had sent a lunch invitation for 모레(월) 11:30. Then, in the same conversation, he added 함재현. The card read only "함재현은 12:33에야 도착해요" and "12:30 수업에 가려면 12:11엔 나서야 해요". The bar spanned the whole lunch, 11:30–14:30. The card had no button: no way to invite 함재현, and no 그대로 두기.

## Cause

1. Adding a Friend to the meal held pins the plan to that meal's Restaurant and start (P05 ticket 44). 함재현 arrives at 12:33 and the asker leaves at 12:11, so no plan has them both, and the answer has no plan.
2. With no plan, the time bar spans the whole meal window, and the card's words are the reasons alone.
3. The app's main button (`planActionOf`) returns nothing without a plan, though the answer names the Quest held (`planSet`) and the Friend added (`adding`). P05 ticket 44 meant this on purpose: "With adding.fits false, say plainly why they cannot join it, and offer nothing."

## What to build

- **Main server, `asHeld` (`meal-adding.ts`):** when no plan has the Friends added in it, the answer shows the meal as it is held. It is planned at its Restaurant and start for everyone in it but them. The reasons there was no plan become the answer's `note`, which names them: "지호는 이 점심에 시간이 안 돼요" when the reasons do not.
  - The span is the meal's again.
  - The press (`PUT /plans/:questId`) still invites them to that same Quest.
  - An answer with a plan, one adding nobody, and one whose meal cannot be planned as it is held either stay as they were.
- **The model's words:** `adding.fits` is false when the plan has no part of theirs, and `adding.why` gives the note then. The meal rule asks whether to invite them anyway, in place of offering nothing.
- **App, `planActionOf`:** an answer with no plan beside a Quest the User holds stands its reasons beside "파티 보기", where its people are changed, never alone. This covers a meal and a meeting alike.

Whether the people already in it are asked again: no. `PUT /plans/:questId` invites only the people the Quest does not have yet (`invitedAgain`). The meal keeps its time and place, so the Holders are not told of a move either (`movesMeal`). They already accepted that meal as it is, and nothing about it changed for them.

## Was and now (a Friend added or removed after sending)

| Kind | Case | Was | Now |
|---|---|---|---|
| Meal | Added, fits at the start | Plan, "지은이 초대 보내기", 그대로 두기 | Same |
| Meal | Added, fits only later | Plan moved, "12:58로 옮기고 … 초대 보내기", 그대로 두기 | Same |
| Meal | Added, cannot come in it | Reasons alone, bar over the whole meal, no button | The meal as held with why as its note, "… 초대 보내기", 그대로 두기 |
| Meal | Added, and the meal held cannot be planned either | Reasons alone, no button | Reasons beside 파티 보기 |
| Meal | Removed | Plan beside the held meal; not for its people, so "파티 보기" | Same |
| Meet | Added or removed, with a plan | "바꾸기" (in place) and 그대로 두기 | Same |
| Meet | Added, no time fits | Reasons alone, no button | Reasons beside 파티 보기 |
| Study together | Added or removed after sending | No Quest held is set aside: a new study answer, whose card has its own buttons | Same: not this fault |

## Acceptance criteria

- [x] `asHeld` by its partitions: reasons that name them; reasons that do not, before the answer's own note; an answer with a plan, one adding nobody, one whose meal cannot be held either. (Unit test, `meal-adding`.)
- [x] `addingWords`: not fitting, with why, when the plan has no part of theirs; fitting, with no why, when it has. (Unit test, `meal-adding`.)
- [x] A Friend who cannot come in the lunch: the lunch as it is held for the asker and 민수, its note naming them, `adding` kept; the press invites them, 민수 is neither asked again nor told. (Integration test, `assistant-meal-adding`.)
- [x] App: the note beside "지은이 초대 보내기" and 그대로 두기, and the press invites; with no plan, a lunch's and a meeting's reasons beside 파티 보기, which opens the 파티. (Integration test, `answer-added-after-sending`.)

## Comments
