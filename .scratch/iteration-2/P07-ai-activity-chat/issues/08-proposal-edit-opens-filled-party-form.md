# 08: 수정 on a Proposal opens the party form filled with it

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 07; P06-04 (`.scratch/iteration-2/P06-party-quest-ui/issues/04-making-and-editing-form.md`, #81)

## What to build

When the Assistant got a field wrong, a User presses 수정 on the Proposal card. The party form opens with every field of the Proposal filled in:
- title, description
- 공개 or 비공개, Open or Approval
- Board, capacity
- when, where
- related Global Event
- Friends to invite

Photo and tags (P06-04) start empty, as in a new Quest, for the User to add. The User corrects what they need and makes the Quest from the form as usual. Nothing in the form changes for a User who opens it the usual way.

This ticket builds on the form as P06-04 leaves it.

**If time runs short.** P7 is planned at 10 hours. This ticket is the first to move to Iteration 3 P5. Without it, the Proposal card still makes Quests with 만들기, and 수정 stays absent or disabled as ticket 06 allows.

## Acceptance criteria

- [ ] **수정 on the Proposal card.**
  - It closes the sheet and opens the party form with the Proposal's fields filled in.
  - Friends to invite appear as already chosen.
  - The Global Event appears as the chosen 관련 행사.
  - Photo and tags start empty.
- [ ] Making the Quest from the filled form behaves as making it from an empty form with the same values.
- [ ] Opening the party form the usual ways (new Quest, from a Global Event, editing a Quest) is unchanged, and its existing tests pass.
- [ ] Returning from the form without making leaves the chat's conversation as it was.
- [ ] **Screen tests:**
  - 수정 opens the form with every field filled from a canned Proposal, Friends and Global Event included
  - making from it sends the same requests as the form would
