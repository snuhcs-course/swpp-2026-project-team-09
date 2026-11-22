# 30: A 파티 already made is changed in place from the Assistant

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server, then the app's OTA update (P04), which says `party-change`, draws 바꾸기 for a Proposal with `change`, and opens the room for a `quest` offer.

## What happens now

After ticket 18, "방금 만든 파티 19시로" after 만들기 gets no second card: proposeQuest answers `made`, and the line says the 파티 is already posted and is changed with 수정 in its room. Nothing changes it from the Assistant. Ticket 17's slice 2 is to change it in place: the made-파티 rows 30 to 38 of its case table, as decided on 2026-11-22.

## What to build

- A new capability, `party-change`. Without it, proposeQuest answers `made` as now.
- With it, proposeQuest given a made 파티 (`[Proposal made: …]`, or `[Proposal change shown: …]` for a change not pressed yet) changes only its time and place:
  - The reply's Proposal is the 파티 with the new time or place and a `change`: `{ questId, subQuestId, step, told }`. Its 바꾸기 sends `step` unchanged to the room's 일정 수정, `PUT /quests/:questId/sub-quests/:subQuestId`. That call keeps everyone who is in, tells each other Holder with `step-changed`, and forgets the old times to leave (ticket 21). `told` counts the other Holders.
  - The model is told `told` and `waiting`, and says it before the change: "바꾸면 참여한 2명에게 알림이 가요". The app says it after.
  - The 파티's own step is never a clash with its new time.
  - A time or a place left out, or given as the made Proposal's, keeps the step's own. The step may have changed since 만들기, in the room or in the card's 수정 form, and only what the User asked for moves it.
- Not changed here:
  - Row 34: a change to anything else (title, capacity, Join Policy, Board, description, event, invited Friends) answers `in-room`. The reply has no card, and has a `quest` offer, 파티 수정하기, which opens the room.
  - Row 35: started or over answers `started`.
  - Row 36: gone (cancelled, or the User left it) answers `gone`, and proposing it again takes `another: true`.
  - Row 37: led by another answers `led-by-other`, with the leader's name.
- Row 38, a 파티 for a Global Event: only its meeting step changes, and never to a time after the event (proposeQuest's existing check).
- Rows 32 and 33:
  - Join requests stay, and requesters are not told: this is the room's own gap (ticket 21).
  - An invited Friend who has not answered stays invited, and the invitation shows the new time.
- The rule for `[Proposal made: …]` no longer forbids calling proposeQuest. It says to call proposeQuest with the made values and only the change, and to say what its answer says.

## Acceptance criteria

- [x] Rows 30 to 33 each show a change whose step `PUT` takes. Nobody leaves, requests and invitations stay, and the counts are right. (`assistant-made-party-change.integration.test.ts`. Before the change, Main refuses `party-change` with 400.)
- [x] A place change keeps the time, and a time change keeps the place, each as the step has it now, after a change in the room.
- [x] Rows 34 to 37 answer `in-room` with the room's offer, `started`, `gone` and `led-by-other`, with no card.
- [x] An app without `party-change` gets `made`, as before.
- [x] A change shown and sent back is read as `[Proposal change shown: …]` and changed again.
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 22 minutes. This is an estimate: gaps under 5 minutes between transcript entries, summed. It includes drafting ticket 31's case table while this ticket's test runs waited for a slot.
- Tokens: input 26,351,662 (cache reads 26,091,277, cache writes 260,149, uncached 236); output 102,656. Without cache reads, 260,385.
