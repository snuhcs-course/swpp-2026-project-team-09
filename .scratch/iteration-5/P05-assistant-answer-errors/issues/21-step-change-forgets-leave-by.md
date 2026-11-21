# 21: A changed step forgets the time to leave kept for it

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server.

## What happens now

A Holder's time to leave (`leave-by`) is a Notification kept for a fixed moment from their own Plan. When the Leader changes the Quest's step in the room (일정 수정), every other Holder is told with `step-changed`, but their `leave-by` stays: a Holder still gets "지금 나서요" for the old time.

Ticket 17's change in place from the Assistant meets the same fault, and a change must mean the same whether typed or tapped. One rule holds for both: a change in place keeps everyone who is in, tells each Holder with `step-changed`, and forgets the time to leave kept for the old steps. Recomputing each Holder's time to leave from their own day is not part of it.

## What to build

- Where `SubQuestsService` sends `step-changed` (a step added, edited or cancelled that has not ended), it also forgets every Holder's `leave-by` for the Quest, the changer's included, before it answers. A failure to forget never fails the change.
- The Assistant's change in place (ticket 17, slice 2) keeps the asker's own time to leave again for the new plan after it.

## Acceptance criteria

- [ ] The Leader edits the step of a party an invited User accepted: the invited User's `leave-by` is gone, `step-changed` is there, and the Leader has no `leave-by`. (`invitee-time-to-leave.integration.test.ts`, which fails before the change.)
- [ ] Lint, format and types of the main server pass.

## Known gap

Join requesters of an Approval 파티 are not Holders: a step change tells them nothing, in the room and from the Assistant alike (ticket 17's row 32).
