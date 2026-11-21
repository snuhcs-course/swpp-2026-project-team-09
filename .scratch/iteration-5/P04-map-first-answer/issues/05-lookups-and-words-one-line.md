# 05: Lookups, refusals, and words take the same bottom

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [04](04-plan-bottom-without-text.md) for the bottom's layout.

Native files: none. Releases: an app OTA update only.

## What to build

Every other reply takes the bottom of ticket 04, so that no answer still shows the old card. A Lookup (a way, a shuttle, a study area, a place, my day) shows its marks and, when it has one, its time on the bar; its line that names no place or time is the one line. A refusal, an offer (a question back), and a failure are the one line, with their buttons in the chip row. A reply with nothing to draw (a procedure, a rule) shows the model's text folded to one line, and a tap raises the card with the whole text (board 8: "김민수가 먼저 일어나야 해요. 저녁으로 바꿀까요? ›").

## What happens now

- `LookupCard`, `RefusalReply`, `OfferedWords`, `FailedLines`, and Markdown words fill the card with their own lines and buttons.

## What changes

- The one line's function of ticket 04 covers Lookups, refusals, offers, and failures; words without a scene fall back to the model's text.
- Their buttons go to the chip row above the input (다시 시도, an offer's choices, a Lookup's button).
- Reply cards (event, Quest, restaurant, library, Proposal) stay in the raised card until tickets 06 to 08 put them on the map: a reply with cards shows the one line "카드 N개 ›" that raises the card.

## Must not break

- 다시 시도 and 그만 (`answer-failure-and-waiting`), a refusal's asks (`answer-refusal`), offered words (`answer-offered-words`), study areas (`answer-study-area`), Lookup bands and recalculation (`answer-lookup`), Markdown (`answer-frame-markdown`).

## Acceptance criteria

- [ ] A way Lookup shows its marks and the one line, no card text. (Integration test.)
- [ ] A refusal shows its line and its asks above the input. (Integration test.)
- [ ] A failure shows its line and 다시 시도. (Integration test.)
- [ ] A procedure answer shows one line; a tap raises the whole text. (Integration test.)
- [ ] A reply with cards shows "카드 N개 ›", and a tap shows the cards. (Integration test.)
- [ ] A Lookup and a procedure answer on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
