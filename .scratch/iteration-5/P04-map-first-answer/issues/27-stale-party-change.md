# 27: A made 파티's change refused once its step changed

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([25](25-made-party-changed-in-place.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

A change of a made 파티 (ticket 25) sends the main server's step as it was worked out when the reply came. When the step changed in between, in the room's 일정 수정 or by another change, 바꾸기 quietly undoes that edit. The reply does not carry the step the change was worked out from.

With a Place, the change's Proposal also stands on the map (ticket 06), and its button beside the input says 만들기, though it changes the 파티.

## What to build

- When a reply with a change comes, read the step (`GET /quests/{questId}`, its Sub Quest `subQuestId`) and keep its time, end, and place.
- On 바꾸기, read it again. When it differs, send nothing: the toast says "파티가 그사이 바뀌었어요. 다시 물어봐 주세요", and the card's 바꾸기 takes no more presses. When it is the same, or could not be read either time, send the change as before; the main server's own checks decide.
- The button beside the input for a change on the map says the card's words: 바꾸기, 바꾸는 중, 바꿨어요.

## Acceptance criteria

- [ ] A step changed between the reply and 바꾸기: no `PUT`, the toast, and 바꾸기 disabled. (Integration test.)
- [ ] A step unchanged: the `PUT` is sent. (Integration test.)
- [ ] A change with a Place: 바꾸기 beside the input, no 만들기. (Integration test.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 20 minutes in the session of tickets 24 to 26 (an estimate from the transcript's timestamps), including the wait for PR 457 to merge. No subagents.
- Tokens: an estimate: output about 20k; input about 9M, almost all cache reads, with about 60k cache writes.
