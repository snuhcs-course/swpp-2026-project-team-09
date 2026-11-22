# 30: The time bar's words follow a dragged handle

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

From the use of Release `26.11.22-15` on a phone: while a handle of the time bar is dragged, the band moves under the finger, but the words over it ("12:33–12:59 · 식사 26분") keep the Plan's times until the finger lets go and the recalculation answers. While shortening the band, the User cannot tell what time the band now ends at.

## What to build

- While a handle is dragged, the words say the times and the length under the finger, at every five-minute step, on the folded and the unfolded bar.
- The dragged end's time is in the stronger weight (`font.bold` against the label's semi-bold), in the same colour.
- Once a handle is let go, the words keep the dropped times while the recalculation runs, as the band does; then they say the answer's words, or the Plan's again if the recalculation fails.
- A drag of the whole band is left as P02 ticket 25 set it: over someone's busy stretch the words say who cannot come, else they keep the Plan's own words.

## Acceptance criteria

- [x] A held start handle on the unfolded bar and a held end handle on the folded bar each change the words, the dragged time in bold. (Unit test.)
- [x] After letting go, the dropped times stay while the recalculation runs, then the new band's words, or the Plan's own after a failure. (Unit test.)
- [ ] A picture taken mid-drag on the emulator. (Emulator: one hold; the slow swipe had not moved the handle 2.2 s in.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 30 minutes in the map-first-answer session (an estimate from the transcript's timestamps), including one hold of the emulator. No subagents.
- Tokens: output about 50k; input about 17M, almost all cache reads, with about 95k cache writes.
