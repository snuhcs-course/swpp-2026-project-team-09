# 06: The card of a received invitation shows the invitee's own way

Parent: [P02 spec](../spec.md) ("A received invitation")
Status: ready-for-agent
Blocked by: 03; the invitee's own way (`GET /quest-invitations/:id`, P03 ticket 02); a Notification's address opening its card (P05 ticket 02, P04 ticket 04)

## What to build

A User whose phone has the switch on opens an invitation, from "알림" or from a push, and sees it in the answer frame's shape: their own way on the map (where they set out from, the line to the Place where everyone is together, the Merging Point when it lies on their way, and the Place of what follows), and one card at the bottom with whose Quest it is, when and where, with whom, when to set out, the Quest's steps, and "수락" and "거절". Nothing of anyone else's location is drawn.

## Acceptance criteria

- [ ] **The card's id.** Each invitation the User received is a card of the main screen with the id `invitation:<invitationId>`, so that the address `/main?card=invitation:<invitationId>` opens it; with the switch off no such card exists, and the address opens the "파티" tab's invitations as today.
- [ ] **The map** draws the scene the server gives for the invitee: their own dot, one line for each leg of their way, the flags at the Merging Point and at the destination, and the Place of what follows, by the marks and the camera of an answer; the everyday map's things give way as for a Plan.
- [ ] **The card** shows: whose invitation ("유상의 파티 초대"), the time and the title of the destination step, who is in so far, the way's lines as the server wrote them, the steps in order, "수락" as the main button and "거절" beside it, and the line that says that only the User's own way is shown.
- [ ] **A way that cannot be drawn** (off campus, busy, or unknown): the card shows the server's line, or none, and the map draws what the scene holds.
- [ ] **수락** accepts the invitation; the card then says so and closes to the everyday map with the Quest among the User's Quests. **거절** declines it and closes the card. Each takes one press, and a failure shows a toast and leaves the card.
- [ ] **An invitation that waits no more** (cancelled, or answered elsewhere): the card says so and closes.
- [ ] The phone's position goes with the request only while the User is on campus, as a recalculation sends it.
- [ ] **Tests**: unit tests for the card's lines from the stored copies of the server's real replies; integration tests at the main screen over the fake main server: the address opening the card, the marks, both buttons down to their requests, a failure, and an invitation that waits no more.
- [ ] The app's README says how a received invitation is shown.
- [ ] The screen is run on an Android emulator, and the pull request carries the screen of a received invitation.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments
