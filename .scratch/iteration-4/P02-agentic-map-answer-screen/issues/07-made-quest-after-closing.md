# 07: A Quest made from a Plan stays on the everyday map after the answer is closed

Parent: [P02 spec](../spec.md) ("Inviting as it is", "A made Quest after closing")
Status: ready-for-agent
Blocked by: 05

## What to build

A User who invited Friends from a Plan and closed the answer still sees the Quest on the everyday map: a flag at its Place with its start and how many accepted ("12:33 점심 · 수락 1/2"), and one line above the input that says the same. A press on either opens the answer frame's card of that Quest again, as it was after inviting.

## Acceptance criteria

- [x] With the switch on, a Quest the User leads that was made from a Plan and has not ended is drawn on the everyday map as a flag at its destination step's Place, with that step's start and the number of Friends who accepted out of those invited.
- [x] One line above the input says the same, and gives way while the keyboard is up or another answer is shown.
- [x] A press on the flag or on the line shows the card after inviting for that Quest, with its members' states, and the Quest's steps; the map draws what the Quest holds (its Places and the User's own position), and nobody's location.
- [x] The flag and the line follow the Quest: an acceptance changes the count at once, and they go when the Quest ends, is left, or is deleted.
- [x] With the switch off nothing is drawn.
- [x] Tests at the main screen over the fake main server for each of the above, and the app's README.
- [ ] The screen is run on an Android emulator, and the pull request carries its screen.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

### Decisions (2026-11-15)

1. **Which Quests count.** Nothing the main server sends marks a Quest as made from a Plan: `POST /plans` makes a Closed Quest on no Board, led by the asker as its one Holder, with the Plan's title and steps and an invitation for each Friend (main-server `plans/plans.service.ts`). With the switch on a Quest counts when the User leads it, it is Closed and no Class Quest, its members hold someone besides the User, and its destination has not ended. A 비공개 Quest made by hand with invited Friends counts too: it is still a Quest the User leads and waits on.
2. **The destination** is the last step not cancelled that has a start and a point, since a Plan writes its meeting steps before the meal. It has ended when the server marks it `ended` or its end (its start without one) is not after now, the clock read when the Quests are read, as the Quest list reads it: nothing ticks between two reads.
3. **The words** are "HH:MM <meal> · 수락 n/m": the destination's start in Korea time; the meal, the title's words after its last "에서 ", as the server writes a Plan's title "<Restaurant>에서 <meal>", or else the whole title; n the Friends accepted or late, m every Friend among the members, one who declined included, since they were invited. A Friend who left or whose invitation was taken back is no longer among the members and leaves m.
4. **How each Friend stands** is ticket 05's rule (`friendStandings`), with the members but the User as the invited and the Quests' `dataUpdatedAt` as the time they were read; the signals of an answer are heard while the switch is on, each with its time, so that an acceptance counts at once and the members count once read after it. `friendStandings` takes any Quest with the user ids invited to it, the reply of `POST /plans` among them.
5. **The flag takes the place of the Quest's own card.** With the switch on, the Quest's card `party:<id>` is replaced by a card of kind `made-quest` with the same id, at the destination, outside the place groups (`features/map/made-quest-cards.ts`), so that nothing is drawn twice and an address or a selection of the Quest finds it: `/main?card=party:<id>`, as a leave-by Notification's, then opens the card after inviting. With the switch off the card stays as today, and nothing is subscribed: the Quests' observer of `useMadeQuests` has `subscribed: false` and no signal is listened to.
6. **The flag's look** is the answer's pick: the dot in the Quest colour without a number, with the words in the pick's label above it, at every level of detail. Its name read aloud is the words.
7. **The line** stands at the left above the row of buttons, and above the tutorial's start button and the line that asks for interests when they are shown, as `InterestsHint` does: 34 high and 8 above them, with the flag icon and the words in the Quest colour. It says the first made Quest's words, by the destination's start; each made Quest has its own flag. It gives way while the keyboard is up, while a card or the shuttle's notice takes the bottom, and while the answer frame or a card nobody asked for is shown, and the map's credit and the friend list's rows make room for it (`layout.ts`, `Room.madeLine`).
8. **The card opened again is a card nobody asked for**, as a received invitation's: the frame's card without a pill, the input, or the tab bar; "닫기" and Android's back button close it; it is shown only while the answer frame is not; and a press on the map does nothing meanwhile.
9. **It is built from the Quest, with no old answer kept** (`answer/made-quest-frame.tsx`): a person chip for each Friend among the members, by the name the members give, with the state; no chip of where from or until when, since the Quest keeps no conditions; "답이 없어도 12:15에 가면 돼요" with the destination's start; and the Quest's steps. `InvitedCard` takes the steps in place of the reply of `POST /plans`, and the answer's card passes its Quest's.
10. **The map under it** (`madeQuestScene`, drawn with `drawingOfScene` and the camera of a received invitation, `useInvitationMap`) holds the destination as the pick, labelled with its Place's label and the flag's words under it, a dark flag with the start and the title at each other step's Place, and the User's own dot, "나", where the phone was when the card opened; no route and no Avatar. A later move of the phone moves no camera; a signal that changes the words draws the scene again.
11. **The mock** lists the Quest its `POST /plans` made among its Quests from then on: the stored reply's Quest with the mock's User as its asker, its leader, its one Holder, and its accepted member, so that the flag shows on the emulator after "이대로 초대" and "닫기". `startFresh` empties the list; the reply of `POST /plans` stays the stored copy.
12. **The tests sign in as the stored answer's asker**, 유상, who leads the stored reply's Quest of `POST /plans`, in place of the fake main server's own User.
