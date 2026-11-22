# 24: A Quest cancelled by words

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none (the main server's side, P05 ticket 31, is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

"저녁 약속 취소해 줘" is answered in words only. The main server can now offer one button for it, `{ kind: 'leave-quest', label, title, startsAt, questId }`, but only to an app that sends `quest-cancel` in `clientCapabilities`. The app's reply guard refuses a reply with an offer kind it does not know, so the app must learn the kind before it sends the capability.

## What to build

- Send `quest-cancel` with every request that sends the capabilities.
- The reply guard, the types, and the mock API take the `leave-quest` offer.
- The offer is its own full-width row in the dock, between the line and the input, with a danger outline: what it cancels at the left in the text colour, the Quest's title (cut in the middle when long) and its start with the weekday, never cut ("저녁 약속 · 오늘(일) 18:00"), and its `label` at the right in the danger colour (취소하기 when nobody else holds the Quest, 나가기 when others do). No main button stands beside the input then. The raised card shows the same row under the words.
- One press does it: the model's question and the row that names the Quest are the confirmation, with no second dialog.
- The reply docks with the model's question as its line, even when the question has no question mark.
- A press sends `DELETE /quests/{questId}`, as the room's 나가기 does. While it is on its way the row says "취소하는 중이에요" or "나가는 중이에요" and takes no press.
- Taken (204, or 404 for a Quest already gone): the line says "‘저녁 약속’ 취소했어요." or "‘저녁 약속’에서 나왔어요.", the row goes and does not come back for that answer, and the User's Quests are fetched again.
- Refused: the line says "취소하지 못했어요. 다시 눌러 주세요." or "나가지 못했어요. 다시 눌러 주세요.", and the row stays.

## Acceptance criteria

- [ ] The app sends `quest-cancel`. (Integration test.)
- [ ] The guard keeps a `leave-quest` offer with its label, title, start, and id, and refuses one without its id. (Integration test.)
- [ ] The row stands in the dock with its label, the title, and the start, with no main button beside the input; for a Quest tomorrow it names the day. (Integration test.)
- [ ] A press sends the `DELETE`; taken or already gone, the line says so and the row goes; refused, the line says so and the row stays. (Integration test.)
- [ ] The mock build answers "저녁 약속 취소해 줘" with the button, and the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
