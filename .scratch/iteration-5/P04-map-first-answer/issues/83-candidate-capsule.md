# 83: A candidate's number and minutes as one capsule

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

On a meal answer's map, a candidate with minutes is drawn as two objects:

- a navy dot without its number;
- a separate white pill beside it, "③ 12분", with the number as a badge inside the pill and a navy border.

One place reads as two things, and one must look twice to see whose minutes they are. A candidate without minutes is a navy round with its number in it.

## What to build

The user's decision (2026-11-26), drawn on the right-hand board of the candidate marks proposal (`notes-ko/handoff/candidate-marks-proposal`):

1. **A candidate with minutes:** the same navy numbered round that a candidate without minutes has, at one end of a white capsule that also holds "12분" in ink.
   - The round keeps its size, stays centred on the place, and has a white number. The number shows once.
   - The capsule runs to the right of the round. It runs to the left when the right has no room; the round is then its right end.
   - When neither side has room, the minutes drop and the numbered round stays.
   - The round never changes or moves between these three cases.
2. **Unchanged:**
   - a candidate without minutes;
   - the chosen place (gold round, white label box);
   - the path, the stops, and the dark end pills;
   - the list.

   No tail, no new colour, no icon. The capsule's edge is the light border colour (`color.border`).

3. **Images stay shared.** The round is the numbered round made ahead on the everyday map (P04 ticket 81). The minutes are their own picture, named by their words and side alone, drawn under the round so that the two read as one capsule. No picture is made per number and minutes.
4. **Pressing the capsule anywhere chooses that place,** as the pill does today.
5. **No native change.**

## Acceptance criteria

- [ ] A tagged meal candidate shows its number once, on its round. Its minutes picture carries no number.
- [ ] The capsule is at the right when there is room, at the left when only the left has room, and absent when neither has. The round's look is the same in all three.
- [ ] Two candidates with the same minutes on the same side share one minutes picture.
- [ ] A press on the minutes chooses the candidate's Plan.
- [ ] Other answer kinds keep their look.
- [ ] The first answer's marks arrive no later than before: timings before and after on the emulator in the PR.

## Comments

### Decisions on the screens (2026-11-26)

- A candidate without a round of its own takes the same capsule with its numbered round inside, beside the spot. That covers the second Restaurant of a building, and a candidate on the User's spot or the next Class's. Without room for its minutes it is the numbered round alone, beside the spot. No candidate's navy-bordered pill is left on a meal map. One picture is made at answer time for each of these few.
- The rule that leaves out every later candidate's minutes once an earlier one has no room stays here. Each candidate losing its minutes on its own is a ticket of its own.

### Agent usage (2026-11-26)

- Agent time: about 1 hour 50 minutes in the p04-58 session, an estimate. It includes about 40 minutes of emulator runs and the test runs, slowed by a machine load of 13 to 21. No subagents.
- Tokens, from the ticket's start (03:53 UTC) to this entry: input 424 uncached, with cache reads 95,278,072 and cache writes 701,736; output 171,990.
