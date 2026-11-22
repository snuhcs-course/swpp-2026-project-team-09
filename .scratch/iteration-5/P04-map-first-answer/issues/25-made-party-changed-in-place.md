# 25: A 파티 already made, changed in place

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [24](24-quest-cancelled-by-words.md), whose pull request this one builds on. The main server's side (P05 tickets 30 and 31) is merged.

Native files: none. Releases: an app OTA update only.

## What happens now

"방금 만든 파티 19시로" is told the 파티 is already posted. The main server can now answer with the made 파티 changed, a Proposal with `change: { questId, subQuestId, step, told }`, and a `quest` offer (파티 수정하기) for a change it cannot make, but only to an app that sends `party-change`. A changeable meal the User leads with Friends now comes as a `planSet` that 바꾸기 changes in place (`PUT /plans/{questId}`), as a meeting is.

## What to build

- Send `party-change` with every request that sends the capabilities. The guard, the types, and the mock API take `change` and the `quest` offer.
- A Proposal with `change` draws the same card, its kicker "파티 바꾸기", its buttons 파티 보기 (opens the room) and 바꾸기.
- 바꾸기 sends `step` as it is to `PUT /quests/{questId}/sub-quests/{subQuestId}`, the room's 일정 수정. Taken, the button says 바꿨어요, the toast says "파티를 바꿨어요. 참여한 2명에게 알렸어요" (without the second sentence when `told` is 0), and the Proposal goes back with `madeQuestId` and without `change`. Refused, the toast gives the room's refusal words and 바꾸기 stays; the Proposal goes back with its `change`, as shown.
- A `quest` offer is the main button beside the input, its label as given, and opens the 파티's room.
- 바꾸기 for any changeable `planSet`, a meal's as a meeting's, sends `PUT /plans/{questId}` through the meeting's path and its refusal words; its line names the kind ("점심을 12:30으로 바꿨어요. 민수에게 알렸어요").

## Acceptance criteria

- [ ] The app sends `party-change`. (Integration test.)
- [ ] A made 파티's change shows 파티 바꾸기 with 파티 보기 and 바꾸기; 파티 보기 opens the room. (Integration test.)
- [ ] 바꾸기 sends the step, toasts whom it told, and sends the 파티 back with `madeQuestId` and no `change`; refused, it keeps 바꾸기 and sends the change back. (Integration test.)
- [ ] 파티 수정하기 stands beside the input and opens the room. (Integration test.)
- [ ] A shared lunch's 바꾸기 sends `PUT /plans/{questId}` and says the lunch moved. (Integration test.)
- [ ] The mock build answers "방금 만든 파티 19시로" with the change, and the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
