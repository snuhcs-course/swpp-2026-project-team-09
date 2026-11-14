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

### Decisions (2026-11-15)

1. `drawingOfScene(scene, setting)` in `answer-marks.ts` draws a bare scene; `drawingOf` calls it with the Plan's number on the pick and the answer's Plans as candidates. An invitation's pick carries no number, as the wireframe draws it.
2. The invitation's card position is the campus's centre (`centreOf(CAMPUS_BOUNDS)`): the list of received invitations gives the Quest's Place only as a label, with no position.
3. Invitation cards stand apart from the Place groups and the study clusters, and `useThings` draws no marker for them. The main screen counts its cards ready once the invitations are known too while the switch is on, so that an address waits for them.
4. The card shows only while the answer frame is not shown, as every selected card; the frame wins, and the card appears once the frame is closed.
5. While the card is shown a press on the map opens no card, as while the frame is shown.
6. The read takes the User's on-campus position at the moment of the read; a later move of the phone does not read the card again.
7. The destination step is the step that starts at the gathering's start at the gathering's Place; without one the title line falls back to the Quest's title after the time.
8. 수락 and 거절 reuse the 파티 tab's `usePartyActions`, whose `accept` and `decline` now give whether the main server did it. The tab's own words are kept: "파티에 참여했어요" after an acceptance (not "파티에 들어왔어요"), and its refusal words, "요청하지 못했어요. 다시 시도해 주세요" for an unknown failure (not "처리하지 못했어요. 잠시 후 다시 시도해 주세요"). The tab says nothing after a decline, so the card says "초대를 거절했어요".
9. Any 404 of the read counts as an invitation that waits no more. A failure of the main server's own is asked once more before "초대를 불러오지 못했어요", as every query of the app is.
10. The tab bar's giving way moved from `useMainLayers` to the main screen, which knows both the frame and the invitation's card.
11. The steps' list of the card after inviting moved to `answer/quest-steps.tsx`, which both cards draw.
12. Android's back button needed nothing new: the selection's own back handler closes the invitation's card.
13. To keep the main screen within lint's 50 lines a function, `useThings` is called inside `useMapView`, and `useRoute` inside the screen's `useLines`; `useFramed` (beside `useReceivedInvitation`) gives the invitation and whether the frame or its card is shown.
