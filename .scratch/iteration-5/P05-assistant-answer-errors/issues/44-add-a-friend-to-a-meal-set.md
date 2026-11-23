# 44: A Friend added to a meal already made as a Quest

Parent: [P05 spec](../spec.md); fault 5 of the meal checklist report
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server. The app's button words are the Cards session's, in PR 514.

## What happened

- After a lunch with a Friend was made as a Quest, "지은이도 추가해 줘" was a dead end: the plan was for other people than the Quest's, so it was not changeable, and the answer sent the User to the 파티 ("바꾸려면 그 파티에서 바꿔요").
- A lunch the User held alone, asked for with a Friend, was replaced by a new Quest, at whatever Restaurant and time came first.
- A User who only held an invitation to a lunch, asking for it with another Friend, was planned a second lunch beside it.

## What changes

| User types / presses                                           | Assistant answers                                                   | On the press                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A shared lunch the User leads: "지은이도 추가해 줘"            | "지은이도 12:16 302동식당에 올 수 있어요. 초대할까요?"              | 바꾸기 (to read "지은이 초대 보내기"): the same Quest, 지은 invited; the others are told nothing  |
| 지은 can come only later, but a later start works for everyone | "지은이는 12:58에야 와요. 12:58로 옮기고 초대할까요?"               | the same Quest moved to 12:58 and 지은 invited; the Holders are told of the move (`step-changed`) |
| 지은 cannot come in the meal at all                            | why, with no plan and no button                                     | —                                                                                                 |
| 지은 already in it, or invited and not answered                | "지은이는 이미 같이 먹어요." / "지은이에게는 이미 초대를 보냈어요." | —                                                                                                 |
| 지은 declined it                                               | as the first row                                                    | 지은 invited again                                                                                |
| Two Friends of that name                                       | which one (as before; "@" picks one)                                | —                                                                                                 |
| A lunch a Friend leads                                         | "민수가 잡은 … 민수에게 말해 주세요." (as before)                   | 파티 보기                                                                                         |
| A lunch the User holds alone                                   | as the first row                                                    | the same Quest, no longer taken alone (capacity 4), 지은 invited                                  |
| The User only holds an invitation to 민수's lunch              | names its Holders only; nothing is planned or drawn                 | —                                                                                                 |
| Removing a Friend                                              | not in this ticket                                                  | —                                                                                                 |

- **The input** (`gathering/meal-adding.ts`): planMeal asked for a Friend new to the meal held takes everyone of it too. A plan for everyone of it and someone more is planned at its Restaurant, from its meal step's start (`pinnedTo`), and the answer carries `adding: { friends: [{ userId, name }], startAt, movesTo }`, `movesTo` null when the start is kept.
- **Changeable** (`meal-plan-parts.ts`): the plans are for the meal's people when everyone of it is asked for, Friends more allowed.
- **The press** (`plans/better-plan.service.ts`): `PUT /plans/{questId}` invites the Friends new to the Quest, decliners again, and refuses one that leaves someone out (400 `PLAN_PEOPLE_CHANGED`). A Quest taken alone gathers others (`gatheringFrom`); the capacity holds the plan's people. The Holders are told only when the meal's step moves.
- **The model** is told `adding` (`friends`, `movesTo`, `fits`), `alreadyIn`, and, for a meal the User only holds an invitation to, `invitedTo` with its Holders, by new lines of `PLAN_RULES`.
- **The app's contract** for the button's words (Cards session, PR 514): with `answer.adding` and `answer.planSet.changeable`, 바꾸기 reads "<names> 초대 보내기", or "<HH:MM of movesTo>로 옮기고 <names> 초대 보내기" when `movesTo` is set. Until then it reads 바꾸기, and the press works the same.

## Acceptance criteria

- [x] Each row of the table above but the last two, at a pinned clock on Tuesdays of 2101: nothing is sent before the press, the same Quest id after it, the others told only on a move, a decliner invited again, a Holder or an invited Friend not added. (`assistant-meal-adding.integration.test.ts`, `meal-adding.unit.test.ts`)
- [x] Row 20i of ticket 17 (a lunch held alone, asked for with a Friend) is now changeable in place; `PLAN_PEOPLE_CHANGED` is for a plan that leaves someone out. (`assistant-shared-meal-change`, `better-plan` integration tests)
- [x] The shared meal change, better plan, plan change tells, own meal Quest, related Quests, meal plan and new Quest integration tests pass.
- [x] README; lint, format, and types of the main server.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 50 minutes of one session, the case table included. An estimate from the transcript's timestamps.
- Tokens: input about 50.6 million, of which about 50.2 million cache reads and 0.46 million cache writes; output about 120,000. No subagents. Measured from the session's transcript at the time of the pull request.
