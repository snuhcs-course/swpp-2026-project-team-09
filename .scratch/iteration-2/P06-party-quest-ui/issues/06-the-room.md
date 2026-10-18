# 06: The room (파티 열기)

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (The mocked parts of a Quest)

## What to build

The room follows `PartyDetail` and `PartyLeave`. A private Quest's room reads as a private plan, a member's line says how far they are on foot, the Leader sees a request's note and who has not answered an invitation, a step of the plan is deleted at once, and the members talk in `파티 채팅`.

The walking time comes from the members' positions and the walking route the app already asks for (`GET /walking-route`, one call per sharing member). It is computed again only when a member has moved more than 100 m since the last route, and at most once a minute per member, and only while the room is open. A request's note and 파티 채팅 have mock adapters, added here; messages stay on the phone.

## Acceptance criteria

- [x] `모집글 보기` only for a public Quest; a private one shows its text only.
- [x] Tags under the text; the event card below the activation box.
- [x] A sharing member's line reads `위치 공유 중 · {place}까지 도보 {n}분`, or `{place}에 있어요` when there; the route is asked again only under the limits above.
- [x] A join request shows its note; the build connected to the server shows none until the server keeps one.
- [x] An invited Friend reads `응답 대기` with `초대 취소`.
- [x] Deleting a step needs no confirm sheet and has no undo, as `PartyDetail` draws it.
- [x] The Leader's ending sheet says `파티가 사라져요.` for a private Quest and `파티가 사라지고 모집글도 내려가요.` for a public one, and adds `활성화 중이라 위치 공유도 바로 멈춰요.` while switched on.
- [x] The sheet for switching to another Party follows the frame's text.
- [x] `파티 채팅` lists messages and sends with `파티에 메시지 보내기`.
- [x] What the frame does not draw stays: `수정`, `내 위치 공유`, marking a step done, handing over the Leader's role, tapping a member to the map.
- [x] Jest covers each item above.
- [ ] Screenshots beside `PartyDetail` and `PartyLeave`, under Test Results; the walking time on a phone.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 1 h 20 min of active work by one subagent in its own worktree over two rounds (building, the Jest tests and two web screenshots of the mock build; then the self-review's fixes and a merge of `2.0/Main`), plus about 15 minutes of a review subagent and the main session. It is an estimate; about 20 more minutes went to waiting for other agents' Jest and Gradle runs, which is not counted, and the full Jest suite was not run because those runs did not end.
- Tokens, from the transcripts of the implementing subagent and one review subagent: input 37,852,775, of which 36,198,920 cache reads, 1,653,495 cache writes and 360 uncached; output 15,101. The main session's tokens are not split per ticket and are not included.
