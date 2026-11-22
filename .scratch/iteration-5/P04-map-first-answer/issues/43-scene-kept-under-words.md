# 43: An answer's scene stays under a follow-up answered with words alone

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

From a hands-on pass on the study answer: with a seat card on the map (its bar, the room, the flag on the library), a follow-up typed in "이어서 말하기" that the Assistant answered with words alone (a refusal such as "당일만 예약돼요", a question back, or the demo's cannot-answer line) took the whole scene away: no bar, no flag, no seat, no 예약하기. The User was going on with that answer and lost it. A meal's answer does the same.

## What to build

- When the newest turn of a conversation draws nothing of its own (words alone, a refusal, a failure, or a reply still on its way), the map's scene comes from the latest turn that drew one: its bar, its marks and chosen place, its booking, and its main button stay.
- The card says the new words and the caption shows the new question. The earlier answer's cards (a seat card) stay in the card, docked as before, so that its seat and 예약하기 go on working; their words are not repeated.
- A reply with a scene of its own (an answer, a Lookup, cards, a Proposal, several requests, a map button) replaces the scene, as before. "←" and back still close the whole answer.
- A recalculation (a drag, a press that asks again) makes a new answer, whose own words then come back.

## Acceptance criteria

- [x] The rule over turns: words alone, a reply on its way, several words-only follow-ups, a reply with its own card, no scene at all. (Unit test.)
- [x] A seat card under a words-only follow-up keeps its flag, its bar, and 예약하기. (Integration test.)
- [x] A meal's answer under a words-only follow-up keeps its Plan, its bar, and its main button; one with its own cards replaces it. (Integration test.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 50 minutes in the map-first-answer session (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 30k; input about 12M, almost all cache reads, with about 80k cache writes.
