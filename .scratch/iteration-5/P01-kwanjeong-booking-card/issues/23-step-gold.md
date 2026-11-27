# 23: The chosen step's span is gold, with a caret on the time card

Parent: [P01 spec](../spec.md); the several-requests screen page the user approved on 2026-11-27, choice 다-1 ("모두 권장대로 진행해줘.")
Status: done
Blocked by: [22](22-top-stops.md)

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

On an answer to several requests the steps card draws the chosen step's words and span in blue, and the time card under it draws its band in gold. Nothing says that the time card is the chosen span made large.

## What changes

- The steps card draws the chosen step in the time card's gold: its words in `color.quest`, its span filled `color.questSoft` with a 2-wide `color.quest` border, as the time card's band.
- The time card carries a caret on its top edge, under the chosen span's centre: a small white square turned 45°, half over the card, pointing at the span.
- Pressing a step's words on the steps card, or its flag on the map, moves both the gold and the caret.
- The caret is part of the time card: it moves with the card's grip, and the card's place and height do not change.
- A step with no time card (a seat or a room) has its span in gold and no caret.

## Acceptance criteria

- [x] The chosen step's span and words are gold, the others not. (Integration test `answer-steps-gold`.)
- [x] The caret stands under the chosen span's middle, at the share of the bar's range that middle takes. (Unit test `steps-caret`; the same integration test.)
- [x] A press on another step's flag moves the gold; at a seat step there is no caret. (The same integration test.)
- [x] The caret is drawn outside the card's layout (absolute, `time-card-strip.tsx`), so the card's place and told height are as before.
- [ ] Pictures at 1.0 and 1.3 with ① and with ② chosen. (Waiting on the emulator.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 6 min in this session, from #686's push to this ticket's (an estimate: active time with gaps over 5 minutes left out). The design was shared with ticket 22 and is counted there.
- Tokens: input 70 uncached, with 39,000 cache writes and 6,900,000 cache reads; output 22,000. No subagents.
