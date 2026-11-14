# 03: Correcting the answer: the chips, the Friends, the time band, and words

Parent: [P02 spec](../spec.md) ("Correcting the answer", "What the changes to a `PlanInput` are")
Status: ready-for-agent
Blocked by: 02

## What to build

A User looking at a Plan corrects it where it is shown. The card's chips say the conditions the answer used. The ✕ on a Friend's chip takes the Friend out; "＋ 같이" lists the other Friends in the card, and a press on one, or on a Friend's face on the map, adds them; the chip of where the User sets out from opens the map view of 장소 선택. The time band shows everyone's busy stretches and the Plan's band with a handle at each end, and letting go of a dragged handle fixes that bound. Each of these sends the changed conditions to the recalculation endpoint, which answers without the language model, and the map and the card are drawn again. After a drag, the band's old place stays as a dashed outline, and "되돌리기" goes back. Words typed in the card go to the Assistant with the Plan on screen as their context.

## Acceptance criteria

- [ ] **The chips** of the answer are shown in the card's first row, with "근거" at its right, and "＋ 같이" after them.
- [ ] **Taking a Friend out.** The ✕ on a person's chip sends the conditions without that person, and the answer that comes back replaces the one on screen: the map, the card, and the chips.
- [ ] **Adding a Friend.** "＋ 같이" shows, in the card, the User's Friends who are not in the Plan, each with the line the Friend list shows, one whose position is not known included, and a way to close the list. A press on a Friend, or on a Friend's Avatar on the map while a Plan is shown, sends the conditions with that Friend added, without constraints.
- [ ] **Where the User sets out from.** The chip opens the map view of 장소 선택. A Place chosen there is sent as the User's own `from` constraint, in place of an earlier one; a point that is no Place sends nothing and shows a toast.
- [ ] **The chip of the time** puts the focus on the band's end handle and opens nothing.
- [ ] **The time band** draws, from the Plan's band: a lane for each person with their busy stretches, the line of now, the band with a handle at each end, the two ends of the range, and the band's words.
- [ ] **A drag.** A handle moves in steps of five minutes, inside the range, and no nearer than 15 minutes to the other handle. Letting go of the start handle sends its time as the window's `from`, and of the end handle as the window's `until`, with the other bound as the conditions hold it. Each handle is also an adjustable control, five minutes a step.
- [ ] **While a recalculation is on its way** the band stays where it was dropped, and the chips, the handles, and the arrows take no press.
- [ ] **After a drag** the band's place before it is drawn as a dashed outline, and "되돌리기" brings back the answer shown before the drag without a request. Another change of the conditions drops the outline.
- [ ] A busy stretch inside the window the User fixed is drawn in the warning colour.
- [ ] **Which Plan is shown** after a recalculation: the one with the same id when the new answer has it, otherwise the first. An answer without a Plan shows its lines, keeps the chips, and keeps "되돌리기" after a drag.
- [ ] **A failed recalculation** shows a toast and leaves the answer on screen as it was.
- [ ] **Words.** A message sent while a Plan is on screen carries the conditions and the Plan's id in the request context. The reply's answer replaces the one on screen.
- [ ] **The mock client** answers a recalculation from the stored copies of real answers: the answer for the User alone when only the User is in the conditions, the answer for three people when three or more are, the answer with a fixed start when a window is fixed, and otherwise the first copy; each with the conditions it was given.
- [ ] **Unit tests** for the changes to the conditions and for the band's arithmetic, with the boundaries of the spec's Testing Decisions, and for the mock's choice of a copy.
- [ ] **Integration tests** at the main screen over the fake main server, each down to the body of the request: a Friend taken out, a Friend added from the list and from the map, the chosen Place, each handle, "되돌리기", the chip of the time, a failed recalculation, an answer without a Plan, and words with the Plan's context.
- [ ] The app's README says how an answer is corrected.
- [ ] The screen is run on an Android emulator with Kakao's map, and the pull request carries the screens of the chips, the time band, and a recalculated Plan.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The answer on screen stays while a follow-up waits for its reply or has failed**: it is the answer of the conversation's last reply, and a failure and the app's own bubble are no reply. So the Plan stays on the map while the Assistant works, and "다시 시도" sends the same context as the first try. A reply without an answer, or ✕, leaves none.
2. **The hook keeps the reply's own answer (`source`) apart from the one on screen.** A new source replaces everything; the frame's card is drawn for the bubble whose answer is the source.
3. **A late recalculation is told by an epoch** that counts the sources: an answer or a failure that comes after the source changed is dropped, and no toast is shown for it.
4. **The failure's toast is given to the hook** (`useShownAnswer(bubbles, { location, onFailed })`), which the chat control fills with `useToast`, so that the hook needs no toast provider.
5. **The outline of a drag is kept when the drag's answer comes**, as the band of the Plan shown just before it; a failed drag adds none and keeps the one there.
6. **"되돌리기" takes no press while a recalculation is on its way**, and it closes the basis.
7. **For an answer without a Plan, "근거" stays in the row of chips** (the component always draws it) but opens nothing.
8. **The time chip draws the end handle in focus for two seconds**, a press anew starting the two seconds again; the screen reader's focus is not moved.
9. **The Friends of "＋ 같이" are those `useFriends` gives**, so the list is empty, "더 넣을 친구가 없어요", while they load or fail.
10. **A press on the map adds a Friend when the marker id is `friend:<userId>`** and the conditions do not hold that user; it goes through the same `change`, which ignores it while a recalculation is on its way.
11. **The design system's `IconButton` takes `disabled`**, for the arrows while a recalculation is on its way.
12. **A handle takes a touch 44 wide** (14 of `hitSlop` at each side of its 16), and its pan begins after 10 points sideways and fails after 10 points up or down.
13. **The request context reads the answer on screen from a ref** that is set after each render, so that a message sent after a recalculation carries the recalculated conditions.
14. **The mock does not answer a fixed window with the fixed-start copy**: the existing mock test sends a window fixed at 12:40 and expects the first copy, so only the User alone, three or more people, and the User's own start choose another copy.
15. **Taking 민수 out from the first Plan keeps 302동식당 on screen** (the fourth Plan of the answer for the User alone), by the rule that the Plan with the same id stays.
