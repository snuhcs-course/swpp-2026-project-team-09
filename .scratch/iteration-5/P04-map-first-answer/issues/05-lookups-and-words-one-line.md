# 05: Lookups, refusals, and words take the same bottom

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [04](04-plan-bottom-without-text.md) for the bottom's layout.

Native files: none. Releases: an app OTA update only.

## What to build

One rule decides every case: the bottom hides only what the map already says; where the map does not carry the answer, the answer stands open below without a press.

- **A Lookup whose answer the map draws** (a way, a place: the flag and the route say the name and the minutes) rests in ticket 04's dock: its main action beside the input ("길 안내", "가는 길"), its other asks as chips, no lines; its band on the time bar.
- **A Lookup whose answer is words the map does not show** (the shuttle is not running, a menu before ticket 08 puts it on the mark, a study area's state): its headline is the one line in the dock, and a press raises the rest. A Lookup of the User's day keeps its card open.
- **A refusal, a question back (offers), a failure:** the first line is the one line in the dock (board 8), its offers and 다시 시도 are chips in the same row, and a press on the line raises the whole text. The grid of "which Friend?" stays an open card.
- **A reply with nothing to draw** (a procedure, a rule) keeps its card open, as tall as its text up to today's highest, with the input under it: the text is the whole answer (decision 3).
- **A reply with cards** (events, Quests, a restaurant, a library card, a Proposal) keeps its card open until tickets 06 to 08 put its kind on the map.
- "지난 답 N개" and the note are dock chips, as in ticket 04.
- The dock is one row: the line keeps at least half of it, is cut, and ends with "›"; the chips after it scroll sideways.
- Found on the phone screens: a Lookup's flag is always whole inside the screen (near an edge, where neither below nor above fits, it takes the left or the right), and a raised card is as tall as its content, up to under the pill (from ticket 14, item 5).

## What happens now

- `LookupCard`, `RefusalReply`, `OfferedWords`, `FailedLines`, and Markdown words fill the card with their own lines and buttons.

## What changes

- The one line's function of ticket 04 covers Lookups, refusals, offers, and failures; words without a scene fall back to the model's text.
- Their buttons go to the chip row above the input (다시 시도, an offer's choices, a Lookup's button).

## Must not break

- 다시 시도 and 그만 (`answer-failure-and-waiting`), a refusal's asks (`answer-refusal`), offered words (`answer-offered-words`), study areas (`answer-study-area`), Lookup bands and recalculation (`answer-lookup`), Markdown (`answer-frame-markdown`).

## Acceptance criteria

- [ ] A way Lookup shows its marks and the one line, no card text. (Integration test.)
- [ ] A refusal shows its line and its asks above the input. (Integration test.)
- [ ] A failure shows its line and 다시 시도. (Integration test.)
- [ ] A shuttle Lookup that says the shuttle is not running shows that line in the dock; a press raises the rest. (Integration test.)
- [ ] A procedure answer and a reply with cards keep their card open. (Integration test.)
- [ ] A Lookup's flag near the right edge takes its left, and near the left edge its right. (Unit test of the labels.)
- [ ] Raised, the card is as tall as its content, up to the pill. (Integration test.)
- [ ] A Lookup and a procedure answer on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
