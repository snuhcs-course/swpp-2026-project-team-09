# 07: A Quest made from a Plan stays on the everyday map after the answer is closed

Parent: [P02 spec](../spec.md) ("Inviting as it is")
Status: ready-for-agent
Blocked by: 05

## What to build

A User who invited Friends from a Plan and closed the answer still sees the Quest on the everyday map: a flag at its Place with its start and how many accepted ("12:33 점심 · 수락 1/2"), and one line above the input that says the same. A press on either opens the answer frame's card of that Quest again, as it was after inviting.

## Acceptance criteria

- [ ] With the switch on, a Quest the User leads that was made from a Plan and has not ended is drawn on the everyday map as a flag at its destination step's Place, with that step's start and the number of Friends who accepted out of those invited.
- [ ] One line above the input says the same, and gives way while the keyboard is up or another answer is shown.
- [ ] A press on the flag or on the line shows the card after inviting for that Quest, with its members' states, and the Quest's steps; the map draws what the Quest holds (its Places and the User's own position), and nobody's location.
- [ ] The flag and the line follow the Quest: an acceptance changes the count at once, and they go when the Quest ends, is left, or is deleted.
- [ ] With the switch off nothing is drawn.
- [ ] Tests at the main screen over the fake main server for each of the above, and the app's README.
- [ ] The screen is run on an Android emulator, and the pull request carries its screen.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments
