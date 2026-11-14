# 05: "이대로 초대" makes the Quest, and the card says how each Friend answered

Parent: [P02 spec](../spec.md) ("Inviting as it is")
Status: ready-for-agent
Blocked by: 03; the members of a Quest and the signals of an answer (P03 ticket 03) for the chips' states

## What to build

The card of a Plan with at least one Friend has its main button, "이대로 초대", between the arrows. A press makes the Quest from the Plan on screen and invites every Friend of it in one request (`POST /plans`), with the conditions and the Plan the User is looking at. The card then says that the Quest was made and the invitations were sent, lists the Quest's steps, and its person chips and the faces on the map say how each Friend stands: not seen yet, accepted, or declined. An answer to an invitation changes the chip while the User looks.

## Acceptance criteria

- [ ] **The main button.** A Plan with a Friend shows "이대로 초대" between the arrows, with the count after it; a Plan of the User alone shows none.
- [ ] **The press** sends the answer's `input`, the id and the start of the Plan on screen, and the User's position, with a key that a second press of the same Plan repeats. While it is on its way the button waits, and the chips, the handles, the arrows, and the swipe take nothing.
- [ ] **A Plan that changed** (409 `PLAN_CHANGED`): the answer is recalculated from the same conditions and shown as it is now, and a toast says that the Plan changed.
- [ ] **Any other failure** shows a toast and leaves the card as it was.
- [ ] **After inviting** the card says that the Quest was made and the invitations sent ("파티를 만들고 초대를 보냈어요", "답이 없어도 12:33에 가면 돼요"), and lists the Quest's steps in order; its chips are the conditions with each Friend's state ("민수 · 아직 안 봄", "지은 · 수락", "민수 · 거절", "민수 · 5분 늦음") and no ✕; the band, the arrows, the swipe, and "＋ 같이" are gone; "닫기" closes the answer.
- [ ] **The faces on the map** carry the state: a "?" for a Friend who has not answered, a ✓ for one who accepted.
- [ ] **An answer while the User looks**: the signal of an acceptance or a decline changes that Friend's chip and face at once, and the Quest's members, fetched again, confirm it.
- [ ] **Words** typed after inviting go to the Assistant as before.
- [ ] With the switch off nothing changes: no Quest is ever made from a Plan.
- [ ] **Tests**: unit tests for what the card shows from a Quest's members and a signal; integration tests at the main screen over the fake main server, down to the body and the key of `POST /plans`, for the press, a second press, each refusal, the states after inviting, and a signal.
- [ ] The app's README says how a Plan becomes a Quest from the card.
- [ ] The screen is run on an Android emulator, and the pull request carries the screens of the button and of the card after inviting.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Not in this ticket

"계획 바꾸기" and "카톡으로도 보내기" of the card after inviting; the flag of a Quest on the everyday map and the one line above the input after closing (ticket 07).

## Comments
