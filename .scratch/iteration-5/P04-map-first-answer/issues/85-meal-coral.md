# 85: A meal answer's Restaurants in coral

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: 83 and 84.

Native files: none. Releases: an app OTA update.

## What happens now

A meal answer's chosen place is gold (`color.quest`), and its other candidates are navy rounds. Navy is also the colour of the path, so a candidate reads as part of the way. In the list, the numbers are navy and the chosen row is gold.

## What to build

The user's choice (2026-11-26): "3안" of the candidate marks proposal, the right-hand screen. It applies to meal answers only.

- **The chosen place on the map:** the same round, filled solid coral with a white number. The white label box's border is coral; the time inside it stays gold. A meal pick without a round of its own has a coral number badge in its label.
- **Other candidates on the map:**
  - a soft coral ground, a coral rim of 1.5, and a coral number, inside the white outer ring;
  - in the capsule, the minutes stay ink;
  - the round inside a capsule is the same.
- **The ring and pop** when the answer comes and when another place is chosen: coral.
- **The list:**
  - number badges in the same two looks: soft coral with a coral rim and number, and the chosen row's solid coral with a white number;
  - the chosen row's ground soft coral with a coral border, in place of gold;
  - times and "걸음 N분" keep their colour.
- **The opened Restaurant's number** (from the list or a menu question): solid coral, as the chosen place; its time stays gold.
- **Unchanged:**
  - the path (navy) and rides (purple);
  - the time card and every time (gold);
  - buttons (navy);
  - every other answer kind's pick (a booking, a proposal, a pressed place), which stays gold.

  The colour is a meal flag on the round (`AnswerSymbol.meal`) and on the meal pick's label (its time), not a change of the pick's role.

- **Tokens:** `meal` #C4452C and `mealSoft` #FCEBE6, the values PR 572 gives `svcDining` and `svcDiningSoft`. `svcDining` (today's magenta #B8336A) is not touched, so 572 merges without a clash of meaning.
- The rounds made ahead on the everyday map are the coral ones.

## Checks (2026-11-26)

- **Contrast (WCAG):**
  - coral number on the soft ground: 4.29:1, just under 4.5:1 for small text, above 3:1 for graphics;
  - white number on solid coral: 4.96:1;
  - gold time on the chosen row's soft coral: 5.43:1, against 5.59:1 on the gold ground before.
- **On the pale map:**
  - the soft ground alone sinks into the campus ground (#D1E3EE, #DCE9F1, 1.07 to 1.14:1);
  - the coral rim stands out at 3.76 to 4.32:1 against the campus ground and grey building fills;
  - the white ring at 1.2 to 1.3:1 only frames it.
- **Faded candidate (45%):** the rim drops to about 1.8:1 and the number to about 1.9:1 against the ground. That is the intent of a candidate that does not fit, but it is fainter than a faded navy round.
- **Everyday dining pins** cannot show beside these: with an answer up, the map draws only the answer's marks and the Friends' faces (`use-map-view.ts`).

## Acceptance criteria

- [ ] On a meal answer, the pick's round is solid coral with a white number, its label's border coral, and its time gold.
- [ ] A meal candidate's round has a soft coral ground, a coral rim and number, and a white ring.
- [ ] The ring of a meal pick just chosen is coral.
- [ ] The list's badges and chosen row are coral, and so is an opened Restaurant's number; times keep their colour.
- [ ] Every other answer's pick stays gold.

## Comments

### Decisions (2026-11-26)

- The orchestrator, on the screens: map and list match the board; the faded candidate and the coral number at 4.29:1 stay as they are.
- The opened Restaurant's number was gold in the first screens; it is the chosen place, so it is coral too.

### Agent usage (2026-11-26)

- Agent time for tickets 84 and 85 together: about 1 hour 40 minutes in the p04-58 session, an estimate, including about 35 minutes of emulator runs. No subagents.
- Tokens for tickets 84 and 85 together, from ticket 83's agent usage entry (05:55 UTC) to this entry: see the PR's last comment, counted once both PRs are open.
