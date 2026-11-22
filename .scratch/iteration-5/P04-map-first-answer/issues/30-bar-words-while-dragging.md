# 30: The time bar's words follow a dragged handle; the card after "일정에 넣기" says what its buttons do

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

From the use of Release `26.11.22-15` on a phone: while a handle of the time bar is dragged, the band moves under the finger, but the words over it ("12:33–12:59 · 식사 26분") keep the Plan's times until the finger lets go and the recalculation answers. While shortening the band, the User cannot tell what time the band now ends at.

The card after "일정에 넣기" has "다시 고르기" and "닫기", and "닫기" starts route guidance; off campus it shows a "캠퍼스 밖에 있어요" toast instead.

## What to build

- While a handle is dragged, the words say the times and the length under the finger, at every five-minute step, on the folded and the unfolded bar.
- The dragged end's time is in the stronger weight (`font.bold` against the label's semi-bold), in the same colour.
- Once a handle is let go, the words keep the dropped times while the recalculation runs, as the band does; then they say the answer's words, or the Plan's again if the recalculation fails.
- The card after "일정에 넣기" (board 5 of the 2026-11-22 redesign): "확인", the main button, only closes the answer; "길 안내" starts the guidance, and is disabled with the reason under it when guidance cannot start (off campus, or without the location), with no toast; none when the User is there already. "다시 고르기" is a small text button.
- A drag of the whole band is left as P02 ticket 25 set it: over someone's busy stretch the words say who cannot come, else they keep the Plan's own words.

## Acceptance criteria

- [x] A held start handle on the unfolded bar and a held end handle on the folded bar each change the words, the dragged time in bold. (Unit test.)
- [x] After letting go, the dropped times stay while the recalculation runs, then the new band's words, or the Plan's own after a failure. (Unit test.)
- [x] "확인" closes without a route; "길 안내" guides; off campus "길 안내" is disabled with its reason and no toast. (Integration test.)
- [ ] A picture taken mid-drag on the emulator. (Emulator: one hold; the slow swipe had not moved the handle 2.2 s in.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 50 minutes in the map-first-answer session (an estimate from the transcript's timestamps), including one hold of the emulator. No subagents.
- Tokens: output about 80k; input about 28M, almost all cache reads, with about 150k cache writes.
