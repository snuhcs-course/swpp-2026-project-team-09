# 88: Numbers centred in their rounds, no ring when a place is chosen, and a capsule's clock time in gold

Parent: [P04 spec](../spec.md)
Status: ready-for-human

Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

- **Off-centre numbers.** On the user's Samsung phone (5.0/Main dd569505f), the numbers in a meal answer's soft coral candidate rounds sit low and to the right. The chosen place's number and the list's badges look centred; on the emulator every number looked centred.
  - The phone draws text larger than the emulator: its capsule words fill about 0.43 of the capsule's height against 0.32 on the emulator, a font size of about 1.3 (the emulator's is 1.0).
  - A round has a fixed size, and its number grew with the font size:
    - the soft ground's inside is 13 points, and the number's line was 14 points at 1.0 and about 18 at 1.3;
    - its text box overflowed the round, and Android drew the digit off its middle, with its own font padding on top.
  - The same holds for any round or badge with a number, at a font size large enough: the pick's round, a label's badge, the list's badges, and the opened Restaurant's number.
- **The ring.** When an answer comes or another place is chosen, the pick's round pops and a ring spreads from it twice (`useChoosingRing`, board E2).

## What to build

1. A number in a round or badge of a fixed size (`RoundNumber`):
   - it keeps its size at any font size, as the round does (`allowFontScaling={false}`);
   - its box is the round's inside, with the line as high as the box;
   - it is centred both ways, with no font padding.

   This covers:
   - every numbered round on the map (the pick, a candidate navy or coral, the round inside a capsule);
   - a label's number badge;
   - the meal list's badges and the opened Restaurant's number.

2. The user's decision (2026-11-26), "의미 없는 효과": the ring and the pop go, for every answer's pick, on arrival and on choosing. No answer kind gives them a meaning: they marked the new pick, which its colour and label already do. `useChoosingRing`, the `ring` and `pop` of a dot, their styles, and the ring pictures made for every pick go with them.

3. **A capsule's clock time in gold.** The user's decision (2026-11-26): a clock time in a candidate's capsule is gold, as every other clock time; walking minutes stay ink.
   - When the capsule says a time: `addedWalk` is null, that is, the User's start is not known (no `walkMinutes` on their part) and no fixed thing follows the meal (no `next` route). The capsule then says the Plan's start ("17:00"); a screen reader says "17:00 도착".
   - The old pill said the same since P04 ticket 31 (#474, 2026-11-22), in ink: the capsule took the pill's ink for its words, which no one chose for a time.
   - The time's picture is named by its words and a `clock` mark, so one picture serves every candidate with the same time and side.

## Acceptance criteria

- [ ] Every number in a round or badge does not scale with the font, and its box is the round's inside, centred, without font padding.
- [ ] No pick pops or spreads a ring, and no ring picture is made.
- [ ] A capsule's clock time is gold, and walking minutes are ink.
- [ ] Confirmed on the user's phone (the preview build): the numbers centred at his font size.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 35 minutes in the p04-58 session, an estimate. No emulator run: the emulator's font size is 1.0, where the numbers were already centred. No subagents.
- Tokens, from the ticket's start (07:34 UTC) to this entry: input 134 uncached, with cache reads 51,021,113 and cache writes 101,686; output 60,498.
