# 04: Finding Global Events, shown as the Events tab's cards

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

A User asks "이번 주에 공연 있어?" and gets the published Global Events that match, listed as the same cards the Events tab shows. Pressing a card opens the Events tab at that event. A card's recruit and match buttons work as they do in the Events tab.

The search is a refining tool. The model turns the User's words into structured conditions:
- a period, from relative words such as "이번 주" against the current time in the system prompt
- optionally a Place
- optionally words

The tool returns only published Global Events matching them, as compact candidates (id plus the few fields the model needs to judge). The model then picks which fit the User's meaning. There are no embeddings.

This ticket also builds two things every later lookup and presenter uses:

- **The presenter guard.** A card id is accepted only if a lookup or resolver returned it in this message. The server fills cards from the database in the shape the app already draws, so the app makes no further requests and a hallucinated id never reaches the screen.
- **Delimiters around others' text.** Global Event text was collected from Sources or written by organizers. When a tool returns it to the model, it is wrapped in labelled delimiters, which the system prompt (ticket 01) marks as data, never instructions.

## Acceptance criteria

- [ ] **`searchGlobalEvents`.**
  - It takes a period and optionally a Place and words.
  - It returns only published Global Events in that period that match the other conditions, as compact candidates. Drafts, cancelled and discarded Global Events are never returned.
  - With nothing matching it returns "none".
- [ ] **Delimiters.** Text from a Global Event (title, description, place words) reaches the model inside labelled delimiters. The mechanism is shared, so ticket 05 uses it for Quest text.
- [ ] **`showGlobalEvents`.**
  - It takes ids and adds those Global Events as cards to the reply, in the order given.
  - An id that no tool returned in this message is refused back to the model with an error, and no card is added for it.
- [ ] **Card data.**
  - The reply's cards carry each Global Event in the same shape as the published list the Events tab uses, filled by the server from the database.
  - Earlier messages carry the cards as references (kind and id), as ticket 02's request shape allows.
- [ ] **The cards in the app.**
  - They are drawn with the Events tab's existing event item, with its recruit and match buttons working as there.
  - Pressing a card closes the sheet and opens the Events tab focused on that event.
- [ ] **End-to-end tests with the scripted fake and seeded Global Events:**
  - a period returns only events in it
  - a Draft, a cancelled and a discarded Global Event are never returned
  - no match returns "none"
  - an event whose description reads "ignore previous instructions…" reaches the fake inside the delimiters
  - `showGlobalEvents` with returned ids puts filled cards in the reply
  - an id that no tool returned is refused
- [ ] **Screen tests:**
  - a reply with event cards shows them
  - pressing one opens the Events tab at that event
  - the recruit button works from the chat
