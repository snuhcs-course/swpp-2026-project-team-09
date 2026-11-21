# 02: The place's flag says what and when, and opens a card

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-time-bar-on-top.md) for the day words.

Native files: none. Releases: an app OTA update only.

## What to build

The chosen place's flag keeps the place and its time, and says the day before the time when the Plan is not today ("학생회관식당" / "내일(수) 12:15 점심"), so that where and when stay on the map. A tap on the flag opens a card attached to it (board 11): the Plan's title; for a Plan with Friends, what "이대로 초대" will make (공개 범위, 정원, 초대); for every Plan, the basis lines that "근거" opens today. A tap elsewhere on the map, a camera move by the User, a new reply, or closing the answer closes the card.

## What happens now

- The pick's label says the place and the server's place flag ("12:33 식사"), without a date.
- The basis opens in the bottom card from "근거".
- The main server makes a Quest from a Plan with the Plan's title, Closed (비공개), and a size of the Plan's people at least the least size; a new recruiting Quest is Open (공개).

## What changes

- The pick's label words: the day from the helper of ticket 01, before the time.
- An attached-card overlay for marks, placed at the mark's point at the answer's camera, under it or over it clear of its label: one open at a time, closed by the events above. A press beside it closes it, so the map takes no gesture while it is open. Its rows only say what will be made: the request that makes a Quest takes no title, visibility, or size (spec, Out of Scope). Later tickets reuse it for faces, my start, a Proposal, a booking, a restaurant, and an event.
- The flag's card for a Plan: title, visibility, size (at least 4, as the main server makes it), invited Friends' names (a Plan alone shows only the title), then the basis lines.
- "근거" stays in the bottom card in this ticket; ticket 04 removes it.

## Must not break

- A tap on a candidate's dot still shows its Plan.
- The map's other presses (faces, the everyday map's marks) and the camera's fit.
- "이대로 초대" and "여기로" send what they send today.

## Acceptance criteria

- [x] A meal Plan with 민수 for tomorrow: the flag reads "302동식당 · 내일(화) 12:15 점심". (Integration and unit tests, from the map's markers.)
- [x] A tap on the flag opens the card with the title, 공개 범위 비공개, 정원 4명, 초대 민수, and the basis lines. (Integration test.)
- [x] A press beside the card closes it; a new reply or a closed frame closes it too (the hook's reset), and Android's back closes it first. (Integration test for the press.)
- [x] A Plan alone shows its title and basis, without 공개 범위, 정원, or 초대. (Integration test.)
- [x] The flag and its card on a phone with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Emulator check (2026-11-21)

The debug app with Metro from this branch in mock mode. A Friend's card, 만나고 싶다, then a press on the pick's flag "302동 앞 · 12:15 만남": the card opened over the flag, clear of its label, with 제목 "302동 앞에서 만나기", 공개 범위 비공개, 정원 4명, 초대 민수, and the three basis lines; a press beside it closed it. The mock build has no answer for another day, so the flag's day words were checked in the tests only.

### Agent usage (2026-11-21)

- Agent time: about 25 minutes in the same session as ticket 01, from its pull request to this one (an estimate from the transcript's timestamps), with the emulator check.
- Tokens: output 34k; input 23.2M, of which 23.1M cache reads, 62k cache writes, and 112 uncached. No subagents.
