# 05: "이대로 초대" makes the Quest, and the card says how each Friend answered

Parent: [P02 spec](../spec.md) ("Inviting as it is")
Status: ready-for-agent
Blocked by: 03; the members of a Quest and the signals of an answer (P03 ticket 03) for the chips' states

## What to build

The card of a Plan with at least one Friend has its main button, "이대로 초대", between the arrows. A press makes the Quest from the Plan on screen and invites every Friend of it in one request (`POST /plans`), with the conditions and the Plan the User is looking at. The card then says that the Quest was made and the invitations were sent, lists the Quest's steps, and its person chips and the faces on the map say how each Friend stands: not seen yet, accepted, or declined. An answer to an invitation changes the chip while the User looks.

## Acceptance criteria

- [ ] **The main button.** A Plan with a Friend shows "이대로 초대" between the arrows, with the count after it; a Plan of the User alone shows none.
- [ ] **The press** sends the answer's `input`, the id and the start of the Plan on screen, and the User's position, with a key kept for each Plan while its answer is on screen: a second press, a press after a failure, and a press after coming back from another Plan repeat it; another answer takes a new one. One request is on its way at a time: the button of whatever Plan is on screen waits, and the chips, the handles, the arrows, and the swipe take nothing. A Quest made after its answer left the screen is told with the toast "파티를 만들고 초대를 보냈어요".
- [ ] **A Plan that changed** (409 `PLAN_CHANGED`): the answer is recalculated from the same conditions and shown as it is now, and a toast says that the Plan changed.
- [ ] **Any other failure** shows a toast and leaves the card as it was.
- [ ] **After inviting** the card says that the Quest was made and the invitations sent ("파티를 만들고 초대를 보냈어요", "답이 없어도 12:33에 가면 돼요"), and lists the Quest's steps in order; its chips are the conditions with each Friend's state ("민수 · 아직 안 봄", "지은 · 수락", "민수 · 거절", "민수 · 5분 늦음", "민수 · 빠짐") and no ✕; the band, the arrows, the swipe, and "＋ 같이" are gone; "닫기" closes the answer.
- [ ] **The faces on the map** carry the state: a "?" for a Friend who has not answered, a ✓ for one who is in (accepted or late), none for one who declined or is dropped.
- [ ] **An answer while the User looks**: the latest word counts. The signal of an acceptance or a decline changes that Friend's chip and face at once; the Quest's members, read after it, give the state again, and a Friend no longer among them reads "빠짐".
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
2. The keys belong to one answer object, one for each Plan id, and are dropped when another answer object is on screen. The made Quest and the signals heard belong to the answer and the Plan on screen and are dropped when either changes. Whether a request is on its way belongs to the hook, whatever is on screen.
3. A Quest that comes after its answer or Plan left the screen is not shown on the card and is told with the toast "파티를 만들고 초대를 보냈어요"; a refusal that comes then is dropped, and its toast is not shown.
4. On `PLAN_CHANGED` the recalculation goes through the card's own `change`, with conditions equal to the answer's and a new object; it is a change that is no drag, so the first Plan of the new answer is shown. While another recalculation is on its way, `change` ignores it as it ignores any second change.
5. "이대로 초대" takes no press while a recalculation is on its way either: it would send a Plan about to be replaced.
6. The card after inviting is a read-only component of its own (`answer/invited-card.tsx`), not a mode of `ConditionChips`: no chip there takes a press. Its chips are `ReadOnlyChip` of `condition-chips.tsx`, so that both rows draw one chip. A person's chip in the accepted state takes the person chip's blue; the others the plain chip's look.
7. The Quest's steps read the start in Korea time and the title as the reply gave them; a step without a start reads its title alone.
8. A Friend's state comes, per invitation of the reply, from the later of the last signal heard for that Quest and Friend (timed by the phone's clock when heard) and the Quest's members in the User's Quests (timed by the query's `dataUpdatedAt`): the signal only when heard strictly after the read, else the member of that id, or dropped when the members are known without it; with neither, invited. Only the reply's invitations are listed: the User is never given a state.
9. The members are read with the app's own Quests query while a Quest is made; nothing fetches it on purpose, since the signals and `quests-changed` already fetch the Quests again.
10. A face on the map carries the state in its label and its screen-reader name as the chip does ("민수 · 아직 안 봄", "민수 · 수락", "민수 · 거절", "민수 · 5분 늦음"), in place of the tag the scene gave, as the wireframe of the card after inviting shows. The badge is "?" on a grey round for invited and "✓" on a Friend-green round for accepted and for late, 14 points, at the symbol box's upper right; declined and dropped have none.
11. While "이대로 초대" is on its way and after the Quest is made, a press on the map (a candidate or a Friend's Avatar) does nothing: the Plan is sent.
12. "닫기" is the frame's own close, the same as ✕ and Android's back button: it forgets the conversation.
