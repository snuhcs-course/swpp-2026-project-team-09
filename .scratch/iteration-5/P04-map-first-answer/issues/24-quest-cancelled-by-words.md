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
- The offer is the answer's main button beside the input. It reads its `label` (취소하기 when nobody else holds the Quest, 나가기 when others do) over what it cancels: the Quest's title and its start with the weekday ("저녁 약속 · 오늘(일) 18:00").
- The reply docks with the model's question as its line, even when the question has no question mark.
- A press sends `DELETE /quests/{questId}`, as the room's 나가기 does. While it is on its way the button says "취소하는 중이에요" or "나가는 중이에요" and takes no press.
- Taken (204, or 404 for a Quest already gone): the line says "‘저녁 약속’ 취소했어요." or "‘저녁 약속’에서 나왔어요.", the button goes, and the User's Quests are fetched again.
- Refused: the line says "취소하지 못했어요. 다시 눌러 주세요." or "나가지 못했어요. 다시 눌러 주세요.", and the button stays.

## Acceptance criteria

- [ ] The app sends `quest-cancel`. (Integration test.)
- [ ] The guard keeps a `leave-quest` offer with its label, title, start, and id, and refuses one without its id. (Integration test.)
- [ ] The button stands beside the input with its label, the title, and the start; for a Quest tomorrow it names the day. (Integration test.)
- [ ] A press sends the `DELETE`; taken or already gone, the line says so and the button goes; refused, the line says so and the button stays. (Integration test.)
- [ ] The mock build answers "저녁 약속 취소해 줘" with the button, and the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
