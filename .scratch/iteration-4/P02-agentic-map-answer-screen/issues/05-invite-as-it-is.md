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

### Decisions (2026-11-15)

1. The Quest made from a Plan is held by `usePlanInvitation` (`src/features/assistant/use-plan-invitation.ts`) beside the answer on screen, in `useChatSheet`, and reaches the card and the map as `invitation` of the chat control.
2. The key, the request on its way, and the made Quest belong to one answer object and one Plan id; when either changes on screen they are dropped at once, so that going back to the same Plan later takes a new key.
3. A reply or a refusal that comes after the answer or the Plan on screen changed is dropped, and its toast is not shown.
4. On `PLAN_CHANGED` the recalculation goes through the card's own `change`, with conditions equal to the answer's and a new object; it is a change that is no drag, so the first Plan of the new answer is shown. While another recalculation is on its way, `change` ignores it as it ignores any second change.
5. "이대로 초대" takes no press while a recalculation is on its way either: it would send a Plan about to be replaced.
6. The card after inviting is a read-only component of its own (`answer/invited-card.tsx`, with its own chip row), not a mode of `ConditionChips`: no chip there takes a press, and keeping `ConditionChips` as it is keeps both simple. A person's chip in the accepted state takes the person chip's blue; the others the plain chip's look.
7. The Quest's steps read the start in Korea time and the title as the reply gave them; a step without a start reads its title alone.
8. A Friend's state comes, per invitation of the reply, from the last signal heard for that Quest and Friend, else the Quest's member of that id in the User's Quests, else invited. Only the reply's invitations are listed: the User is never given a state.
9. The members are read with the app's own Quests query while a Quest is made; nothing fetches it on purpose, since the signals and `quests-changed` already fetch the Quests again.
10. A face on the map carries the state in its label and its screen-reader name as the chip does ("민수 · 아직 안 봄", "민수 · 수락", "민수 · 거절", "민수 · 5분 늦음"), in place of the tag the scene gave, as the wireframe of the card after inviting shows. The badge is "?" on a grey round for invited and "✓" on a Friend-green round for accepted, 14 points, at the symbol box's upper right.
11. While "이대로 초대" is on its way and after the Quest is made, a press on the map (a candidate or a Friend's Avatar) does nothing: the Plan is sent.
12. "닫기" is the frame's own close, the same as ✕ and Android's back button: it forgets the conversation.
