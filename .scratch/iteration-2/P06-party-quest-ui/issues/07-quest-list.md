# 07: The Quest list on the map and `MainQuests`

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The Quest list on the map and its full screen follow `Main` and `MainQuests`. A Quest looks public or private by its own Join Policy and keeps its own title, whether or not its Party is switched on. Its line counts its Holders, says `· 활성화 중` while switched on, and a Quest without a time is not in the list.

## Acceptance criteria

- [x] Tone and icon come from the Quest's Join Policy: public with the users icon, private with the lock.
- [x] The title is the Quest's, not its Party's.
- [x] `공개 파티 · {n}명` counts the Quest's Holders; a private one reads `비공개 파티 · {name}` or `{name} 외 {n}명`.
- [x] `· 활성화 중` is added for public and private while the Quest's Party is switched on.
- [x] Quests without a time are left out of the list on the map, `MainQuests` and their counts; the group `시간 미정` goes from these two. `내 파티` keeps its own `시간 미정` group.
- [x] Jest covers each row kind and the leaving out.
- [ ] Screenshots beside `Main` and `MainQuests`, under Test Results.
