# 52: "←" leaves the time bar, and the docked card takes a drag down

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone test (2026-11-23, on 5.0/Main 87aa3554):

1. The button that goes back to the main map stands inside the time bar's head, which looks out of place.
2. Dragging the card down goes back to the main map only while the card lists the earlier questions. From the docked card (the caption chip, the sentence, the input, and the main button) nothing happens, and the docked card shows no handle.

Cause of 2: the docked form of the card drew no handle and attached no gesture. Only the open card's handle had the drag, and the open card is what shows while the earlier questions are listed.

## What to build

- "←" is never inside the time bar. On every answer it is one round button over the map at the top left: where it stands today when the answer has no time, and directly under the bar's card, at the map's usual left margin, when there is a bar. The bar's head gets the space back: its words start at its left edge, a seat's band and the several requests' words too.
- The raised card stops under "←", so that it stays in sight.
- The docked card shows the same handle as the raised card; a press on it raises the card. The whole docked card takes a drag, except the input and the main button beside it, which are outside the card. A press on a chip or the line stays a press. A drag down past half the card closes the answer and keeps the conversation, as "←" and Android's back do, with the hint "놓으면 지도 화면으로 돌아가요". A drag up raises the card.
- A drag down takes away one layer, as back does: the list of earlier questions, a mark's card, or a restaurant's menu go first, with no hint. Then a raised card is lowered, and only then is the answer closed.

## Acceptance criteria

- [x] With a time bar, "←" is the round button directly under it at the map's left margin, and the bar's words have no room on their left. (Integration test.)
- [x] The docked card shows the handle; a drag down past half closes the answer and keeps the conversation; a short one leaves it; a drag up raises it. (Integration test.)
- [x] With the list of questions open, a drag down takes the list away and leaves the answer. (Integration test.)
- [x] The bar's head and "←" read at a font scale of 1.3: the button holds no text, and the head's words still shorten by their measured lines.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 35 minutes in the map-first-answer session (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 30k; input about 10M, almost all cache reads, with about 100k cache writes.
