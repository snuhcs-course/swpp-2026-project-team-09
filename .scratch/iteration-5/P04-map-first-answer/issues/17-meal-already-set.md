# 17: A Quest already set is changed, not doubled

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: P05's PRs 417 (`mealSet`), 422 (`planSet`, `KeptQuest`), and 434 (a meeting set aside, `PUT /plans/{questId}`, the 409s, and the `plan-set` capability); [04](04-plan-bottom-without-text.md) for the main action beside the input. A main server without PR 434 refuses `plan-set` (400), so this app's bundle is published after that server is on Production, as an `all` Release does.

Native files: none. Releases: an app OTA update only.

## What to build

With a lunch already put in the schedule (일정에 넣기), "점심 뭐 먹지?" is answered with plans as if that lunch were not there, and the answer says so: "이미 12:16 302동식당 점심이 있어요. 바꿀까요?"

- **The line and 그대로 두기:** the model's line is the dock's one line, and 그대로 두기 is a chip in the same row. 그대로 두기 drops the new Plan and the line: the answer closes and the map goes back to what it showed.
- **A Quest the User may change** (`mealSet` with `shared: false`): 바꾸기 is the one main button beside the input. A press makes the new Plan; the main server drops the held Quest and its leave-by reminder in the same step, so there are never two lunches.
- **A shared Quest** (`shared: true`: another holder, or an invitation not yet answered): no 바꾸기; 파티 보기 beside the input opens that 파티. The line says to change it there.
- A `POST /plans` that answers 409 `MEAL_ALREADY_SET` (the Quest became shared after the answer) says to change it in its 파티 and makes nothing; `PLAN_ALREADY_SET` and `PLAN_SET_BY_FRIEND` (a second meeting refused) say that a meeting is already set, the User's or a Friend's, and never "초대하지 못했어요. 잠시 후 다시 시도해 주세요".
- **A meeting** (`planSet` with `kind: 'meet'`): 바꾸기 changes that Quest in place (`PUT /plans/{questId}`, which tells its Holders). The answer then stays and shows the meeting as it now stands, as it stays after 만들고 초대 보내기: the flag at the new time, no main button, no 그대로 두기, and the line "약속을 15:00으로 바꿨어요. 김민수에게 알렸어요" (two Friends by name; more: "<first> 외 N명에게").
- **The capability:** the app says it can draw all this (`plan-set` in `clientCapabilities`) with the chat request, `POST /plans`, `PUT /plans/{questId}`, and `POST /assistant/answers`; only then does the main server set a Quest aside or refuse a second one.
- **From the screen review:** a Plan that has been made (만들고 초대 보내기, 일정에 넣기) or a meeting changed draws only itself: the other candidates and the places that did not fit go, from the answer and from the Plan's own scene, and the bar of a changed meeting has no handles.
- **From PR 441's review:** after a failed send, the kept request and its Idempotency-Key hold while the Plan on screen keeps its id, day, start, place, and people, whatever the answer object (a kind chip makes a new one); a different Plan or changed conditions start fresh, so a retry never makes the Quest a second time.
- **Next (its own pull request):** the place of what is set marked on the map with "잡힌 점심 12:16" or "잡힌 약속 15:00", a grey outline without a number, apart from the candidates (both when it is one), from `KeptQuest.point` (P05's PR 439).
- **General from the start:** the line, the chip, and the buttons are drawn from one shape that names a Quest (title, time, place, people, shared, whether this answer may change it), `SetQuest`, with `mealSet` as its first source. P05's next ticket makes "already set" a property of every planner's answer (meal, meeting, event, seat) and adds changing and cancelling a Quest by words; the general field is agreed with P05 then, and `setQuestOf` reads it.
- **Left room for, not built:** a question about what is already set ("민수랑 약속 몇 시였지?") is answered by showing that Quest on the map, its flag and its time on the bar, with no new plan. Its shape is agreed with P05 first.

## What happens now

- The held Quest fills the meal's window, and the answer is `noPlan` 'no-shared-time' (fixed on the main server by P05 ticket 16).
- The main action of a meal Plan is 일정에 넣기 (`planActionOf`); a 409 from `POST /plans` other than `PLAN_CHANGED` and `SHARED_QUEST_HELD` says only that inviting failed.

## What changes

- `setQuestOf(answer)` (`features/assistant/set-quest.ts`): the `SetQuest` an answer stands beside, from `planSet` first and else `mealSet`; `inPlace` for a meeting; `changedLineOf` for the line after a meeting's 바꾸기.
- `usePlanChange` (`features/assistant/use-plan-change.ts`): the meeting's 바꾸기 by `PUT /plans/{questId}`, and the line the answer then holds.
- `ANSWER_CAPABILITIES` gains `plan-set`; `POST /plans`, `PUT /plans/{questId}`, and `POST /assistant/answers` send `clientCapabilities` too.
- `planActionOf` reads 바꾸기 for a Quest the User may change, and 파티 보기 for a shared one.
- The dock: a Plan beside a set Quest rests as the model's line with 그대로 두기 (`setQuestRestOf`), which leaves the answer as ✕ does.
- The make request's 409 `MEAL_ALREADY_SET` is told as "같이 정한 약속이라 그 파티에서 바꿔 주세요".
- The mock answers 배고파 beside a lunch its User made from a Plan with `mealSet` and the main server's line, so the mock build shows both states.

## Must not break

- 일정에 넣기 and 초대 of a meal answer without `mealSet` (`answer-plan-bottom`, `answer-taken-alone`, `answer-here-alone`, `answer-invite-after`).
- The dock at rest: one row over the input and one main button.

## Acceptance criteria

- [ ] A meal answer with an own `mealSet`: the line and 그대로 두기 in the dock, 바꾸기 beside the input; a press sends `POST /plans`; 그대로 두기 closes the answer and sends nothing. (Integration test.)
- [ ] With `shared: true`: no 바꾸기; 파티 보기 opens that 파티. (Integration test.)
- [ ] A 409 `MEAL_ALREADY_SET` on 바꾸기 says to change it in its 파티 and makes nothing. (Integration test.)
- [ ] A meeting's 바꾸기 sends `PUT /plans/{questId}`; the answer stays with the changed line and no button. (Integration test.)
- [ ] `plan-set` goes with the chat request and `POST /plans`; `PLAN_ALREADY_SET` and `PLAN_SET_BY_FRIEND` are worded as what they are. (Integration test.)
- [ ] The changed line for one, two, more, and no Friends. (Unit test.)
- [ ] A made or changed Plan draws no other candidate; a changed meeting's bar has no handles. (Integration test.)
- [ ] After a failure, the same Plan in a new answer object with the same conditions keeps its key; a changed start gets a new one. (Unit test.)
- [ ] `setQuestOf` for none, a Quest held alone, and a shared one. (Unit test.)
- [ ] The mock's 배고파 beside a lunch held alone and one shared with 민수. (Unit test.)
- [ ] A meal and a meeting already set on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 2 hours in this session (an estimate from the transcript's timestamps, over three stretches it shared with PR 419's fixes and tickets 18 and 19, of which about half to two thirds is counted here: the meal, the capability and the meeting agreed with P05, the code and tests, two rounds of phone screens, and the screen review's changes), plus 25 minutes of a subagent that updated 21 test files for the request bodies' `clientCapabilities`.
- Tokens: this session output 110k; input 119.2M, of which 118.7M cache reads, 170k cache writes, and 359 uncached. The subagent output 32k; input 7.6M, of which 7.25M cache reads, 322k cache writes, and 128 uncached.
