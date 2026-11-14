# 05: "이대로 초대" makes the Quest, and the card says how each Friend answered

Parent: [P02 spec](../spec.md) ("Inviting as it is")
Status: ready-for-agent
Blocked by: 03; the members of a Quest and the signals of an answer (P03 ticket 03) for the chips' states

## What to build

The card of a Plan with at least one Friend has its main button, "이대로 초대", between the arrows. A press makes the Quest from the Plan on screen and invites every Friend of it in one request (`POST /plans`), with the conditions and the Plan the User is looking at. The card then says that the Quest was made and the invitations were sent, lists the Quest's steps, and its person chips and the faces on the map say how each Friend stands: not seen yet, accepted, or declined. An answer to an invitation changes the chip while the User looks.

## Acceptance criteria

- [x] **The main button.** A Plan with a Friend shows "이대로 초대" between the arrows, with the count after it; a Plan of the User alone shows none.
- [x] **The press** sends the answer's `input`, the id and the start of the Plan on screen, and the User's position, with a key kept for each Plan while its answer is on screen: a second press, a press after a failure, and a press after coming back from another Plan repeat it; another answer takes a new one. One request is on its way at a time: the button of whatever Plan is on screen waits, and the chips, the handles, the arrows, and the swipe take nothing. A Quest made after its answer left the screen is told with the toast "파티를 만들고 초대를 보냈어요".
- [x] **A Plan that changed** (409 `PLAN_CHANGED`): the answer is recalculated from the same conditions and shown as it is now, and a toast says that the Plan changed.
- [x] **Any other failure** shows a toast and leaves the card as it was.
- [x] **After inviting** the card says that the Quest was made and the invitations sent ("파티를 만들고 초대를 보냈어요", "답이 없어도 12:33에 가면 돼요"), and lists the Quest's steps in order; its chips are the conditions with each Friend's state ("민수 · 아직 안 봄", "지은 · 수락", "민수 · 거절", "민수 · 5분 늦음", "민수 · 빠짐") and no ✕; the band, the arrows, the swipe, and "＋ 같이" are gone; "닫기" closes the answer.
- [x] **The faces on the map** carry the state: a "?" for a Friend who has not answered, a ✓ for one who is in (accepted or late), none for one who declined or is dropped.
- [x] **An answer while the User looks**: the latest word counts. The signal of an acceptance or a decline changes that Friend's chip and face at once; the Quest's members, read after it, give the state again, and a Friend no longer among them reads "빠짐".
- [x] **Words** typed after inviting go to the Assistant as before.
- [x] With the switch off nothing changes: no Quest is ever made from a Plan.
- [x] **Tests**: unit tests for what the card shows from a Quest's members and a signal; integration tests at the main screen over the fake main server, down to the body and the key of `POST /plans`, for the press, a second press, each refusal, the states after inviting, and a signal.
- [x] The app's README says how a Plan becomes a Quest from the card.
- [x] The screen is run on an Android emulator, and the pull request carries the screens of the button and of the card after inviting.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

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
10. A face on the map carries the state in its screen-reader name as the chip does ("민수 · 아직 안 봄", "민수 · 수락", "민수 · 거절", "민수 · 5분 늦음"), in place of the tag the scene gave, as the wireframe of the card after inviting shows. Its label follows ticket 03's rule for a face's tag: the state alone beside a face that shows the whole name, which is two characters or fewer ("아직 안 봄"), and the name with the state for a longer one ("강도윤 · 아직 안 봄"). The badge is "?" on a grey round for invited and "✓" on a Friend-green round for accepted and for late, 14 points, at the symbol box's upper right; declined and dropped have none.
11. While "이대로 초대" is on its way and after the Quest is made, a press on the map (a candidate or a Friend's Avatar) does nothing: the Plan is sent.
12. "닫기" is the frame's own close, the same as ✕ and Android's back button: it forgets the conversation.
13. "이대로 초대" is the design system's primary button at its medium height in what the last row's middle leaves after "되돌리기", and "보내는 중이에요" takes the same place and width, so that the count in its own box before "›" never moves (fix 4 of the design review of 2026-11-15).
14. The card after inviting draws the Quest's steps with `QuestSteps` (`answer/quest-steps.tsx`), the component of ticket 06's card of a received invitation: each step a row 28 high and 8 apart, of the number in a circle of 22, the start in a column 44 wide that stays empty without a start, and the title alone on one line, so that every title begins at one edge.
15. A step's number is white on navy (`color.onPrimary` on `color.snuBlue`), not in the Quest colour the design review proposed: a step's number counts the Quest's steps, while the Quest colour's numbers on the map count the answer's Plans, and the wireframe draws the step's number navy.
16. "닫기" is the design system's secondary button across the card's content, in the place "이대로 초대" had.

### Checked on an emulator (2026-11-15)

A development build on an Android emulator (API 36, 1080 by 2400, Kakao's map), answering from the stored copies of real replies, with the switch on and "배고파, 민수랑 같이" asked:

- **The main button**: the card's last row reads "‹", "이대로 초대", "1/5", "›".
- **A press** makes the Quest (the mock answers with the stored reply of `POST /plans`), and the card becomes the invited Quest's: the chips "301동에서", "13:00 수업까지", and "민수 · 아직 안 봄", none of which takes a press; "파티를 만들고 초대를 보냈어요" and "답이 없어도 12:15에 가면 돼요"; the step "12:15 302동식당에서 식사" with its number; and "닫기". The band and the arrows are gone, and the map shows the whole Plan above the shorter card.
- **On the map** 민수's face carries a "?" at its upper right, and its label reads "민수 · 아직 안 봄".
- **"닫기"** brings the everyday map back.

Not tried on the emulator, and covered by tests: an acceptance or a decline heard while the card is shown, the Quests read again, a Plan that changed, a failure and the press after it, and a Quest that comes after the answer was closed (the mock has no socket and answers at once).

For a person to check on two phones, as steps 4 to 7 of the first path's check: the press against the real main server after a Google sign-in, the invitation arriving on the other phone, and the chip turning to "수락" on the first phone when the other accepts.

### Agent usage (2026-11-15)

From the opening of ticket 03's pull request to the opening of this one. One session with four subagents for this ticket (the implementation, two reviewers, and the reviews' fixes). The session's own time in that stretch also holds the merge of the iteration branch into ticket 03's pull request, the spec's new sections and tickets 05 to 07, and the brief of ticket 06.

- Agent time: about 54 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 221,498; input 82,870,008, of which 82,131,841 were cache reads, 737,639 cache writes, and 528 uncached. Without cache reads: 959,665.
