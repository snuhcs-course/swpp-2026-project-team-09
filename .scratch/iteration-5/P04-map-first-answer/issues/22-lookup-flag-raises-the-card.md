# 22: A Lookup's flag raises its card

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([18](18-words-beside-a-lookup.md), merged, left this for the next pull request).

Native files: none. Releases: an app OTA update only.

## What happens now

A Lookup the map draws (a way, a place, a study area) docks with its line, or with no line when the model said nothing. Its card, with its chips and its basis, opens from the line or, when there is no line, from a "근거 ›" chip in the dock. Nothing on the map takes a press while a Lookup is shown, so the flag that names the place is the one thing the User cannot press.

## What to build

From the feedback of 2026-11-22:

- **The flag raises the card:** a press on one of the Lookup's own marks, its flag first, raises the card as "근거 ›" did, with the earlier turns folded. Each of them says so with "›" after its title ("문화관(73동) ›"), as a Plan's flag that opens a card does in the spec. The everyday Friends' faces under it still take no press.
- **"근거 ›" goes:** the dock holds the line, the offers, 다시 시도, and the folded chips. A way with no words and nothing folded docks with nothing above the input but 길 안내 beside it.
- The line still raises the card, and the card's own handle still does.

## Acceptance criteria

- [ ] A way Lookup with no words has no 근거 › in the dock, and a press on its flag raises its card with its chips, its basis, and 닫기. (Integration test.)
- [ ] With the model's words, a press on the flag raises the card too. (Integration test.)
- [ ] The dock's rest of a Lookup has no `basis`; a Lookup's titles end with "›", its names as they were. (Unit test.)
- [ ] A way Lookup's flag pressed on a phone with the mock build; the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 40 minutes in this session (an estimate from the transcript's timestamps, over 12:47–14:16, which it shared with the merges of PRs 442 and 444 and with ticket 23): the flag's press and the card's raised state test-first, the "›" from the screen review, two rounds of phone screens, and a rebase onto 444. No subagents.
- Tokens: about 45% of this session's use over that stretch, an estimate: output about 80k; input about 47.7M, of which about 47.5M cache reads, 160k cache writes, and about 250 uncached.
