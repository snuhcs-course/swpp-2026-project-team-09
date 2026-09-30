# 02: Global Events: storage, states and collected Drafts

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: receive, store and serve)

## What to build

The main server stores Global Events with their states and receives collected events from the worker as Drafts. Each session of a post arrives as its own Draft with a link to its source and the original text. A session collected again stays one Draft. A Draft the Administrator has edited or published is not changed by later collections. A discarded event stays stored, so that the next collection does not bring it back. A User's app gets the published Global Events and never sees a Draft.

The administrative API that lists, edits, publishes, cancels and discards events belongs to P12; this ticket gives it the records and the rules it needs. The worker side is ticket 09.

## Acceptance criteria

- [ ] A Global Event has a title, a description, a start and an end (each may be absent), a place text, a position (absent until an Administrator sets it), a state, a source link, the original text as collected, and a version that changes on every edit, so that P12 can refuse an edit made from a stale copy.
- [ ] The states are Draft, published, cancelled and discarded. A collected event is always a Draft. Which state changes are allowed is P12's; the stored form supports each state.
- [ ] The start, end and place as collected are kept apart from the fields an Administrator edits, so that an edited Draft is still found by its collected values.
- [ ] A Draft is identified by its post, given by the source's post key, and the collected start and end of its session. A post whose time could not be read is identified by the post alone.
- [ ] The main server handles a request-and-response message that carries the events one collection read, following the conventions of ticket 01. A post in the message may hold several sessions, and each session becomes its own Draft. A message that does not match the schema is refused and nothing from it is stored.
- [ ] Storing is repeatable: the same session sent twice is one Draft. A Draft nobody has touched takes the newly collected values. An event that was edited, published, cancelled or discarded is left unchanged by later collections.
- [ ] A session collected with a new start or end arrives as a new Draft. The earlier Draft stays for the Administrator to discard.
- [ ] When the time or the place could not be read, the Draft is stored with the original text and is marked as not fully read, so that P12 can show where work is needed.
- [ ] A User's route returns the published Global Events with their title, description, start, end, place text, position and source link. Drafts, cancelled and discarded events are not returned. The route needs a User's access token.
- [ ] The README records the message's shape, the identity rule and the states.
- [ ] Tests at the message boundary: two sessions of one post are stored as two Drafts; the same message twice is stored once; a Draft edited in the meantime keeps its edits when the message comes again; a discarded event is not recreated; a post whose time could not be read is stored with its original text and marked as not fully read; a session with a new time arrives as a new Draft beside the old one; the User's route shows a published event and hides a Draft.
