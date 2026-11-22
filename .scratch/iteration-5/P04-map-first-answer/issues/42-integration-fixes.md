# 42: The answer's integration tests that 5.0/Main's own code fails

PR 493 carried this ticket as 40, which ticket 40 (the crowded mock's words) also took; it is 42 since.

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

PR CI runs the unit tests only; the integration tests run nightly. Run on 5.0/Main, two fail:

- `answer-frame-library-room-window`: the room-window Notification opens the answer with the app's own words, "예약 창이 열렸어요". The caption (ticket 35) takes a turn without a question of the User's as its first bubble's words, so it repeats that line above the same words in the card. The User asked nothing. **The app is wrong** (the frame's caption).
- `answer-frame-cards` ("draws the first Plan…"): it expects no model sentence in the docked card, but since ticket 32 (#477, board E1) a meal answer docks as the Assistant's sentence. **The test is outdated.**

## What to build

- The caption shows nothing for a turn the app opened with its own words; a building asked about, or the User's question, still shows.
- `answer-frame-cards` reads the docked sentence.
- Every other `answer-*` integration file is run once and each failure classed: outdated test, wrong app, or load only.

## Acceptance criteria

- [x] No caption for a turn the app opened. (Integration test.)
- [x] `answer-frame-cards` and `answer-frame-library-room-window` pass. (Integration tests, run locally.)
- [ ] Every other `answer-*` integration file run once, each failure classed. (Run locally.)
- [x] No native file changes; lint, format, and types pass on the app.
