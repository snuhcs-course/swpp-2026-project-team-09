# 06: A Proposal card for an Open or Approval Quest, and 만들기

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01; P06-04 (`.scratch/iteration-2/P06-party-quest-ui/issues/04-making-and-editing-form.md`, #81)

## What to build

A User writes "내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에". The Assistant shows a Proposal card listing the Quest's fields as rows. 만들기 makes the Quest exactly as the party form would and ends where the form ends. Nothing is made before 만들기. The next message can change one field ("시간만 1시로") and keep the rest.

This ticket covers **Open and Approval Quests only**, with the fields that need no resolving:
- title, description
- Open or Approval
- Board
- capacity
- start time

A Closed Quest needs at least one invited Friend, so it comes in ticket 07 with the Friend resolver, together with the Place and the Global Event.

This ticket waits for P06-04, which rewrites the party form and its making (photo, tags, the event picker, capacity for a Closed Quest). It builds on the form as P06-04 leaves it.

**Prefactor first.** The making sequence already lives outside the form screen, but it shows the form's toast and moves the router itself. Free it from both, so that the form and the Proposal card each decide what to show and where to go, without changing what the form does. The form's existing tests must stay green.

**`proposeQuest`** is the proposer of the spec. It takes only concrete values, and the model converts "내일 점심" itself against the current time in the system prompt.

It checks the Proposal against **the party form's rules as they stand**:
- **Capacity and the shape of a Quest** come from the main server's own rules for making a Quest, not from numbers restated in the tool. If P06-04 has moved capacity to 1 to 8, the Proposal follows by itself.
- **The form's readiness rule for an Open or Approval Quest** is written in the tool: it has a Board and a description. When the User gave no description, the Assistant may propose a short one from the request, and the User sees it on the card.
- **A start in the past** is refused.

On failure it returns what is missing or wrong field by field, so that the model asks the User.

P06's photo and tags are not part of a Proposal. The card leaves them empty, and the User adds them through 수정 (ticket 08).

## Acceptance criteria

- [ ] **Prefactor.** The making sequence is callable without the form's toast and router, and the form behaves as before (its existing tests pass unchanged).
- [ ] **`proposeQuest`.**
  - It takes title, description, Open or Approval, Board, capacity and start time.
  - It applies the main server's rules for making a Quest and the form's readiness rule (Board and description), and returns either the Proposal or the failed fields with reasons.
  - It creates nothing.
  - No capacity number is written in the tool.
- [ ] **Times.**
  - The system prompt gives the default times: 08:00 for 아침, 12:00 for 점심, 18:00 for 저녁, used when no time is given.
  - A start in the past is refused by the tool.
- [ ] **The Proposal in the reply.** A passing Proposal is added to the reply as at most one Proposal card, in the shape the party form fills from.
- [ ] **Proposals over several messages.**
  - The app sends the last Proposal back with the history as its values.
  - `proposeQuest` accepts them and checks them again.
  - A one-field change keeps the other fields.
- [ ] **The Proposal card in the app.**
  - It lists title, 공개 or 비공개, Board, when, where, related Global Event, Friends to invite and capacity as rows. Fields this ticket does not fill show as empty, and photo and tags are not shown.
  - It has 만들기 (primary) and 수정 (secondary). 수정 is ticket 08 and may be absent or disabled here.
- [ ] **만들기.**
  - It runs the making sequence with the Proposal, and afterwards the app goes where the form goes after making.
  - A refusal from the server shows as the form shows it.
- [ ] **End-to-end tests with the scripted fake:**
  - a complete Open Proposal passes into the reply
  - an Open Proposal without a Board fails on that field
  - an Open Proposal without a description fails on that field
  - a capacity outside the server's limits fails
  - a start in the past fails
  - a Proposal sent back in the history with a new time passes with the other fields unchanged
  - nothing is created by proposing
- [ ] **Screen tests:**
  - a reply with a Proposal card shows its rows
  - 만들기 makes the Quest through the fake server and ends where the form ends
