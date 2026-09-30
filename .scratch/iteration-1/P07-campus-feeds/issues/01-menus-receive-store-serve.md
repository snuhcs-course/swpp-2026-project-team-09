# 01: Menus: receive, store and serve

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server receives its first messages from the worker server and stores what they carry. A collector on the worker sends the menus it read as a request-and-response message. The main server checks the message against a schema, refuses one that does not match, stores the menus once however many times the same message arrives, and answers. A User's app then gets one day's menus grouped by restaurant and then by meal, each with its price when the page gave one, each restaurant's operating hours as the original line of text, and the time the menus were last collected. When a collection fails, the worker reports it: the failure is recorded with its time, and the menus already stored stay and are still served.

This ticket sets the conventions every later worker message follows: how a message is named and shaped, how it is validated, what an invalid message gets back, how a source's collection status is recorded, and how a test sends a message to the server. The worker side is ticket 07.

## Acceptance criteria

- [ ] A menu entry has a restaurant, a date, a meal (breakfast, lunch or dinner), a menu name and an optional price. Operating hours are kept per restaurant and day as the original line of text, or absent. Dates are calendar days in Asia/Seoul.
- [ ] The main server handles a request-and-response message that carries the menus one collection read: the source, the time of collection, and the entries and operating hours per restaurant and day. It validates the message against a schema. A message that does not match is refused with an answer that names the problem, and nothing from it is stored.
- [ ] Storing is repeatable: the same message sent twice results in one set of records. A later collection of the same restaurant and day replaces that restaurant's entries for that day, so a menu the site changed or removed does not linger. This rule is recorded in the README.
- [ ] The main server records, per source, when it was last collected successfully and, separately, the last failure with its time and its message. A successful collection sets the collected time. A failure message from the worker records the failure and leaves every stored record as it is.
- [ ] A User's route returns the menus of one requested day, grouped by restaurant and then by meal, with each entry's name and price, each restaurant's operating hours text, and the time menus were last collected. A day with nothing stored returns an empty list, not an error, so the app can ask for each of the coming days. The route needs a User's access token.
- [ ] Nothing in a response invents a price: an entry without one is returned without one.
- [ ] The README of the main server records the worker message conventions: the name and shape of the message, how it is validated, what a refused message gets back, how the collection status is kept, and how a test sends a message. Later tickets follow this note.
- [ ] Tests at the message boundary, sending messages over the test Redis as the worker would: a valid message is stored and served; an invalid message is refused and nothing is stored; the same message twice is stored once; a changed menu for the same restaurant and day replaces the earlier one; a failure message records the failure and the earlier menus are still served; the collected time is served; a day without menus returns an empty list.
