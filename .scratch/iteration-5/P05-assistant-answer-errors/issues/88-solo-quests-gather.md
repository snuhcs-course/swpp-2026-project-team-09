# 88: Every Quest taken alone but a seat's stay gathers by a later invitation

Parent: [P05 spec](../spec.md). Follows [ticket 87](87-solo-quest.md). The user's rule of 2026-11-28: "초대할 수 있지 왜 없어", and "어시스턴트 계획은 초대할 수도 있지 않나? 열람실 자리는 굉장히 애매하기는 한데, 얘만 예외하면 되나?".
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server; the app's room follows. No migration: a seat's stay is told apart by `quests.seat_stay`, which it already holds.

## What was wrong

P03 ticket 17 refused any invitation into a Quest taken alone, and any change of its settings, with 409 `QUEST_TAKEN_ALONE`. A to-do made alone (ticket 87) or a Plan taken alone could never take a Friend later.

## What changes

- **The rule.** A Quest taken alone gathers, its time and place as they are, in two ways:
  - an invitation from its Leader (`POST /quests/:questId/invitations`): it is no longer taken alone, takes capacity 4, its `leave-by` goes as attending gathers it, the Leader is told (`quests-changed`), `party_creation_completed` is sent, then the invitation goes as usual;
  - a change of its capacity to more than one (`PATCH /quests/:questId`): it is no longer taken alone, takes the capacity given, and its `leave-by` goes. A change of its title alone keeps it taken alone.

  This holds whether it was made with `POST /quests/own` or from a Plan.
- **The exception.** A seat's stay (`seatStay`) is one person's booking, so an invitation and a change of its settings are still refused with `QUEST_TAKEN_ALONE`. While taken alone, a Quest still switches no Party on. The Assistant's "+ 같이" (`better-plan`) is unchanged.
- **Docs.** P03 ticket 17's rule 5 and the README's `takenAlone` and usage sections say so. The refusal reads "This Quest taken alone gathers nobody."

## A Plan's Quest once it gathers (for a decision on their look)

- **The room.** The app's room hides "수정" for a Quest taken alone (`room-screen.tsx` reads `QUEST_TAKEN_ALONE`), so the way to invite needs the room to offer it again, but for a seat's stay.
- **The answer card.** It reads `takenAlone` (`use-plan-invitation.ts`, `tracked-requests.ts`) to tell a Plan taken alone from a shared one, and reads the gathered Quest as shared from then on.
- **The meal's steps.** They stay as one person's: "학생회관식당에서 식사", with no meeting step, since the time and place stay as they are.
- **The words.** The asker's `leave-by` goes, as for attending. The invited Friend gets the usual invitation, with no words of the Plan's.

## Tests

- `solo-quests.integration`: a Quest made alone gathers by an invitation (204, `takenAlone: false`, capacity 4), and by a change of capacity to 3; a title alone keeps it taken alone. 11 of 11.
- `plans-alone-guards.integration`: a Quest taken alone from a Plan gathers by an invitation, its Sub Quests' starts as they were and its `leave-by` gone, and by a change of settings to a 파티 on a board. The seat built in the database for the old test now holds `seatStay`, as a seat's stay is made. 7 of 7.
- `seat-stays.integration`: a seat's stay takes no invitation and no change of its settings. 4 of 4.
- Before: the four gathering tests failed with 409 `QUEST_TAKEN_ALONE`; the seat's refusal passed.
- Also passing: `invitation-inviter-and-full` 4, `invitation-push` 10, `own-quests` 19. main-server's lint, types and format pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 30 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 87.
