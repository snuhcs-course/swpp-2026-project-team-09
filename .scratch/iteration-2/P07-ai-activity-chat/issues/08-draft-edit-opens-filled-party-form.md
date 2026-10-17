# 08: 수정 on a draft opens the party form filled with it

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 07

## What to build

When the Assistant got a field wrong, a User presses 수정 on the draft card. The party form opens with every field of the draft filled in:
- title, description
- public or private, join policy
- Board, capacity
- when, where
- related Global Event
- Friends to invite

The User corrects what they need and makes the Quest from the form as usual. Nothing in the form changes for a User who opens it the usual way.

## Acceptance criteria

- [ ] **수정 on the draft card.**
  - It closes the sheet and opens the party form with the draft's fields filled in.
  - Friends to invite appear as already chosen.
  - The Global Event appears as the chosen 관련 행사.
- [ ] Making the Quest from the filled form behaves as making it from an empty form with the same values.
- [ ] Opening the party form the usual ways (new Quest, from a Global Event, editing a Quest) is unchanged, and its existing tests pass.
- [ ] Returning from the form without making leaves the chat's conversation as it was.
- [ ] **Screen tests:**
  - 수정 opens the form with every field filled from a canned draft, Friends and Global Event included
  - making from it sends the same requests as the form would
