# 31: A shared meal is changed in place, and a Quest is cancelled by words

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server, then the app's OTA update (P04): 바꾸기 for a shared meal goes through `PUT /plans/:questId`, and a new capability, `quest-cancel`, draws the cancel button.

## What happens now

This is ticket 17's slice 3: row 20 of its case table, then cancelling by words.

- **A shared meal.** "민수랑 점심 먹자", with the User's lunch with 민수 already made, sets that lunch aside (ticket 16). But `planSet.changeable` is false because the lunch is shared. The line says "바꾸려면 그 파티에서 바꿔요", and making one answers 409 `MEAL_ALREADY_SET`. `PUT /plans/:questId` already changes a meal Quest in place for its people, as it does a meeting.
- **Kept Quests.** `changeable` (findDay, `kept`, `related`) is false for every Quest shared with someone, including a meeting `PUT` changes.
- **Cancelling.** "저녁 약속 취소해 줘" has no tool. The User leaves a Quest only in its room (나가기, `DELETE /quests/:questId`). The last Holder leaving deletes the Quest, and when the Leader leaves, the earliest other Holder leads.

## The case table

Words:

- **The same meal** is ticket 16's: a Quest made from a meal's Plan for that meal and day, which the User holds.
- **Its people** are the same meeting's: the Leader, the other Holders and the waiting invitees. When every other declined, its people are the Leader and the ones who declined (row 6 of ticket 17).
- **A change in place** keeps everyone who is in (the 2026-11-22 rule).

### A shared meal

| # | Exists | Asked | Answer | 바꾸기 / making | Told |
|---|---|---|---|---|---|
| 20a | My lunch with 민수 (waiting or accepted) | 민수랑 점심 먹자 | Set aside, with `planSet.changeable` true. Line: "이미 민수와 12:16 302동식당 점심이 있어요. 바꿀까요?" | 바꾸기 = `PUT /plans/:questId` with the plan shown: the same Quest at a new time and place. `POST /plans` answers 409 `MEAL_ALREADY_SET` `{ questId }`, as now. | 민수, if a Holder, gets `step-changed`. If waiting, 민수 stays invited and the invitation shows the new time. |
| 20b | My lunch with 민수 | 점심 뭐 먹지? (me alone) | Set aside as now, but not changeable: the plan's people are not its people, so the `PUT` would refuse. Line, as now: "이미 민수와 12:16 302동식당 점심이 있어요. 바꾸려면 그 파티에서 바꿔요." | Making answers 409. | — |
| 20c | My lunch with 민수 | 민수랑 지은이랑 점심 먹자 (one more) | As 20b. | Making answers 409. | — |
| 20d | 민수's lunch, which I accepted | 민수랑 점심 먹자 | Set aside as now, not changeable. Line: "민수가 잡은 12:16 점심이 있어요. 바꾸려면 민수에게 말해 주세요." | Making answers 409. | — |
| 20e | My lunch, which 민수, its only invitee, declined | 민수랑 점심 먹자 | The same meal (row 6): set aside and changeable. Line: "민수가 거절한 12:16 점심이 있어요. 이 시간으로 다시 물어볼까요?" | 바꾸기 changes it in place and invites 민수 again (PR 443's path, the same for a meal). | 민수 gets the invitation's push. |
| 20f | My lunch with 민수 accepted and 지은 declined | 민수랑 점심 먹자 | Its people are me and 민수: changeable. Asked with 지은 too, it is not (row 7). | — | — |
| 20g | It has started or is over | — | Not changeable. | Making answers 409, as now. | — |
| 20h | My lunch alone | 점심 뭐 먹지? | As ticket 16: set aside and changeable. Making replaces it, as now. | — | — |
| 20j | My lunch with 민수, asked from an app without `plan-set` | 민수랑 점심 먹자 | Not changeable: that app has no 바꾸기, and its plan's button would make a second lunch beside the shared one. Line, as 20b. | Making is not refused for that app, as now. | — |
| 20i | My lunch alone | 민수랑 점심 먹자 | Set aside, but not changeable: the `PUT` is only for its people. Making replaces it, as ticket 16 does. Line: "혼자 먹기로 한 12:16 점심이 있어요. 만들면 이걸로 바뀌어요." | `POST /plans` replaces it. | 민수 is invited by the new Quest. |

One rule for the app: `planSet.changeable` is true exactly when `PUT /plans/:questId` with the plan shown would change it. So 바꾸기 always goes through `PUT`.

Kept Quests: `changeable` is true for a Quest the User leads, made from a meet's or a meal's Plan, not started, not for an event and not a seat. That holds whether it is shared or not, because `PUT /plans/:questId` changes it for its people. Any other shared Quest stays false. Asked about with nothing new (row 14), a meal the User may change is offered 시간 바꾸기, as a meeting is.

### Cancelling by words

| # | Exists | Asked | Answer | The button | Told |
|---|---|---|---|---|---|
| C1 | Mine, nobody else in it and nobody invited (also one taken alone) | 저녁 취소해 줘 | proposeCancel shows one button, 취소하기. Line: "내일 18:00 302동식당 저녁을 취소할까요?" | `DELETE /quests/:questId`: the last Holder leaves, and the Quest is deleted. | Nobody |
| C2 | Mine, with others in it | 민수랑 약속 취소해 줘 | The button is 나가기, because others hold it: it is left, not deleted. Line: "나가면 민수가 리더가 되고 약속은 남아요. 나갈까요?" | `DELETE`: the User leaves, and the earliest other Holder leads. | The Holders get `quests-changed`, as when leaving in the room. |
| C3 | Mine, with only waiting invitees | 약속 취소해 줘 | 취소하기. Line: "취소하면 민수에게 간 초대도 사라져요. 취소할까요?" | `DELETE`: deleted, and the invitations go with it. | Nobody is pushed. This is the room's own gap. |
| C4 | A Friend's, which I accepted | 민수 약속 빠질래 | 나가기. Line: "민수의 약속에서 빠질까요?" | `DELETE`: the User leaves. | As C2. |
| C5 | A Friend's, which I was invited to and have not answered | 취소해 줘 | No button: it is not held. Line: "초대는 초대 카드에서 거절해요." | — | — |
| C6 | Started | 지금 약속 취소해 줘 | As C1 to C4, since the room lets the User leave at any time. The line says it has started. | As C1 to C4. | As C1 to C4. |
| C7 | Over | — | Not cancelled: "이미 끝난 약속이에요." | — | — |
| C8 | A seat at 관정관 kept with its booking | 관정 예약 취소해 줘 | Not this tool. The library's own cancel (proposeLibraryCancel) cancels the booking. | — | — |
| C9 | A Quest for a Global Event | 그 행사 안 갈래 | As C1 to C4: leaving it is not going. | `DELETE` | As C2. |
| C10 | Several fit (two dinners) | 저녁 약속 취소해 줘 | The model shows them with findDay and asks which. proposeCancel takes one ref. | — | — |
| C11 | A Class | 수업 취소해 줘 | Not a Quest: Classes are not cancelled here. | — | — |
| C12 | No such Quest of the User's | — | `none`: say nothing of that is set. | — | — |
| C13 | The button is not pressed | — | Nothing changes. The model never says it was cancelled. | — | — |
| C14 | An app without `quest-cancel` | — | No button. Line: "파티 방에서 나가기로 취소해요." | — | — |

Privacy is as in PR 422:
- The User holds every Quest cancelled here, so its people may be named: the next Leader, and the invitees whose invitations go. Names go inside the delimiters.
- A Quest only invited to (C5) names only its Holders.

## What to build

- Meal: `planSet.changeable` is true for the set-aside meal the User leads, not started, when the asked people are its people and, when others are in it, the app says `plan-set` (from the review of PR 447: an app without it would make a second lunch). The words name `changeable` and the leader, and the meal rule asks "바꿀까요?" or says why not.
- `KeptQuest.changeable` as above. findDay's 시간 바꾸기 note covers a meal the User may change.
- A new tool, `proposeCancel`, with `ref`:
  - With `quest-cancel`, it answers `cancel-shown` with what pressing does (`deleted` or `left`, the next Leader, the invitations that go), and a reply offer `{ kind: 'leave-quest', label: '취소하기' | '나가기', questId }`, which the app sends as `DELETE /quests/:questId`.
  - It answers `invited`, `over`, `seat` or `none` with no button.
  - It clears the reply's Lookup and answer, so that its button stays.
  - Without `quest-cancel`, it answers `in-room`.
- A rule for cancelling by words.

## Acceptance criteria

- [x] 20a: a shared lunch is set aside changeable, and the plan's `PUT` changes it in place, with the Friend still in. 20b, 20d, 20i and 20j are not changeable. 20e invites again. (`assistant-shared-meal-change.integration.test.ts`)
- [x] Kept Quests: a shared lunch the User leads is changeable in findDay, which offers 시간 바꾸기. (the same file)
- [x] C1 to C5, C7, C8, C12 and C14 through proposeCancel, and the button's `DELETE` does what the answer said. (`assistant-cancel-quest.integration.test.ts`)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 11 minutes. This is an estimate: gaps under 5 minutes between transcript entries, summed. Drafting the case table, done earlier while ticket 30's test runs waited for a slot, is counted in ticket 30.
- Tokens: input 20,338,118 (cache reads 20,252,133, cache writes 85,873, uncached 112); output 54,193. Without cache reads, 85,985.
