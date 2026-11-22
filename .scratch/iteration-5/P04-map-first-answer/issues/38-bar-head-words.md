# 38: The time bar's words shorten before they are cut, clear of "＋ 같이"

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([35](35-frame-navigation.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

From a phone 360 wide on Release 26.11.22-17: the time bar's words ("내일(월) 점심 11:03–12:15 · 식사 …") ran under "＋ 같이". Since ticket 35 the words keep a fixed room for the chip, but on a narrow screen the longest words ("내일(월) 점심 11:03–12:15 · 식사 1시간 12분", about 280 points against about 196) are cut with "…", and a larger text size widens the chip past that fixed room.

## What to build

- In the bar's head, words too long for one line drop the length first ("· 식사 1시간 12분"), then the meal's name after the day ("점심"), and only then are they cut. A dragged end's time stays, and words that say who cannot come keep their tail.
- The words' room at the right is the chip's own laid-out width, so a larger text size keeps them apart; the chip stays inside the bar's box.

## Acceptance criteria

- [x] The steps: whole, without the length, without the meal's name. (Unit test.)
- [x] The bar's words step down while a hidden copy of them takes two lines. (Unit test.)
- [x] The words' right room follows the chip's width. (Integration test.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 40 minutes in the map-first-answer session, with ticket 37 (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 40k; input about 15M, almost all cache reads, with about 100k cache writes.
