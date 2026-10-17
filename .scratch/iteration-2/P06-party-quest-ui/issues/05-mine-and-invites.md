# 05: 내 파티 and 초대

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Retire the Meetup), 02 (The mocked parts of a Quest)

## What to build

`내 파티` and `초대` follow `PartyMine` and `PartyInvites`. A User tells public and private Quests apart, sees how many invitations still wait and how the activation stands, declines an activation from the card and finds it again under `다른 활성 파티`, and looks back at past plans. An invitation shows when and where it is and who else comes.

Declining is kept on the phone, as today. Past Quests and an invitation's time, place and companions have mock adapters, added here.

## Acceptance criteria

### 내 파티

- [ ] The kind is an icon with `공개 파티` or `비공개 파티`.
- [ ] The status reads `멤버 {n}명`, `모집 중 · {n}/{cap}명 · 초대 {k}명 대기`, `{n}명 · 초대 {k}명 대기` for a private one, and `활성화 중 · {n}명 위치 공유` or `응답 대기` while switched on.
- [ ] The activation strip has `거절` and `참여`; a declined one reads `활성화 중 · 참여하지 않는 중` with `참여`.
- [ ] The group `다른 활성 파티` holds declined activations, after `활성화 중` and `활성화 알림`.
- [ ] The group `지난 일정` holds past Quests, last.

### 초대

- [ ] Each card shows `{when} · {where} · {names} 함께`; the build connected to the server leaves out `{names} 함께` until the server gives the companions.
- [ ] The header is `받은 초대 · {n}` and there is no `보낸 초대`.

### Tests and PR

- [ ] Jest covers each status, declining and coming back, and both new groups.
- [ ] Screenshots beside `PartyMine` and `PartyInvites`, under Test Results.
