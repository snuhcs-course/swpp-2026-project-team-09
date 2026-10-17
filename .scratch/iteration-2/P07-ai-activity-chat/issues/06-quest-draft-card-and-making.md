# 06: A Quest draft card, and 만들기

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

A User writes "내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에". The Assistant shows a draft card listing the Quest's fields as rows. 만들기 makes the Quest exactly as the party form would. Nothing is made before 만들기.

This ticket covers the fields that need no resolving:
- title, description
- public or private
- join policy of a public Quest
- Board
- capacity
- start time

Friends, the Place and the Global Event come in ticket 07.

**Prefactor first.** The party form's making sequence runs inside the form screen. Move it where both the form and the chat's draft card can run it, without changing what the form does. The form's existing tests must stay green.

`draftQuest` is the drafter of the spec. It takes only concrete values, and the model converts "내일 점심" itself against the current time in the system prompt. It checks them against the same rules as the party form:
- a public Quest has a Board and a private one none
- capacity 2 to 8, and a private Quest takes 8
- a start in the past is refused

On failure it returns what is missing or wrong field by field, so that the model asks the User. When the User gave no description for a public Quest, which the form requires, the Assistant may propose a short one from the request. The User sees it on the card.

## Acceptance criteria

- [ ] **Prefactor.** The party form's making sequence is callable outside the form screen, and the form behaves as before (its existing tests pass unchanged).
- [ ] **`draftQuest`.**
  - It takes title, description, public or private, join policy, Board, capacity and start time.
  - It applies the party form's rules and returns either the draft or the failed fields with reasons.
  - It creates nothing.
- [ ] **Times.**
  - The system prompt gives the default times: 08:00 for 아침, 12:00 for 점심, 18:00 for 저녁, used when no time is given.
  - A start in the past is refused by the tool.
- [ ] **The draft in the reply.** A passing draft is added to the reply as at most one draft card, in the shape the party form fills from.
- [ ] **The draft card in the app.**
  - It lists title, public or private, Board, when, where, related Global Event, Friends to invite and capacity as rows. Fields this ticket does not fill show as empty.
  - It has 만들기 (primary) and 수정 (secondary). 수정 is ticket 08 and may be absent or disabled here.
- [ ] **만들기.**
  - It runs the making sequence with the draft and shows the made Quest's post.
  - A refusal from the server shows as the form shows it.
- [ ] **End-to-end tests with the scripted fake:**
  - a complete public draft passes into the reply
  - a public draft without a Board fails on that field
  - a private draft with a Board fails
  - a capacity outside the limits fails
  - a start in the past fails
  - nothing is created by drafting
- [ ] **Screen tests:**
  - a reply with a draft card shows its rows
  - 만들기 makes the Quest through the fake server and opens its post
