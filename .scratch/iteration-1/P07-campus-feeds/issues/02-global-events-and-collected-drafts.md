# 02: Global Events: states and collected events

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: the first Collection, stored as lines), 03 (Buildings and the Campus Boundary)

## What to build

The main server stores Global Events with their states, Draft, published, cancelled and discarded, and receives collected events from the worker. Four times a day, and once when it starts, the worker lists the university's events from today on, asks the main server which of the listed posts it already stores, reads the detail page of the others only, and sends each as one event: the title, the body as text, the start and end when the rules read them, the place text, the post number and the source link. A post is one event, identified by its post number.

The main server publishes a collected event when the rules read its start from the body's time line, with a time of day, and its place matches exactly one entry of the building list (ticket 03). The event's position is that entry's, so it can go on the map without a person. Every other collected event is a Draft, with its text, for the Administrator to fill in or discard: an event online or off campus, one whose place matched no entry or several, and a post that is not an event. A discarded event stays stored, so that the next Collection does not bring it back. No Collection changes a stored event, whatever its state.

The administrative API and the User-facing list of published Global Events belong to P12. This ticket gives P12 the records and the rules it needs, and serves no events to Users.

## Acceptance criteria

- [ ] A Global Event record holds what P12 edits and publishes: a title, a description, an optional start, an optional end, a place text, an optional position as a latitude and a longitude, a state (Draft, published, cancelled or discarded), and a version for P12's edit check. A published event has a title, a start and a position. A collected one also holds the post number and the source link; one an Administrator creates by hand has neither.
- [ ] The main server answers the worker's question, which of these post numbers do you store, with the stored ones in any state, so that a discarded or published post is not read again.
- [ ] The main server stores a collected post once: the same post sent twice leaves one record, and a post already stored, in any state, is left exactly as it is.
- [ ] A collected event is stored as published when its start came from the body's time line with a time of day and its place text matches exactly one entry of the building list, by building number (`302동 105호`, `(63동)`) or by name. Its position is that entry's coordinates. Otherwise it is stored as a Draft, with whatever was read. A start read only from the header's date does not publish: that date is often the application period.
- [ ] The worker lists the events from today on with the list's date filter, page by page until the list says there is nothing more, and reads only the detail pages the main server does not store. It asks for one page at a time, four times a day, and at its start as ticket 01 sets. The Source's Collection status is recorded as ticket 01 does, a page without the expected structure is a failed Collection as there, and a failure leaves the stored events as they are.
- [ ] The parser reads the title, the body as text, the start and end from the body's time line or the header's date, saying which, the place from the body's place line, the post number and the link. Spacing and no-break spaces inside the labels do not matter. When the time or the place cannot be read, the event is still sent with the text. An application period or deadline is not read; it stays in the description.
- [ ] The rules are the team's own: no code, pattern list or keyword list from Haengsha.
- [ ] Parser tests with saved pages: a post with a time and a place, a post with a date range, a post whose time cannot be read, a post with an application deadline, a list page with its date filter, the page past the end of the list, and the firewall's block page.
- [ ] Message-boundary tests: the question about stored posts answered for a stored, a discarded and an unknown post; an event with a start time and one matching building stored as published with that building's position; a place with a building number the list does not hold, a place that matches several entries, a place online and a start from the header's date alone each stored as a Draft; the same post twice stored once; a post already published, edited or discarded left as it is; an invalid message refused; a failure recorded.
- [ ] The main server's README records the Global Event states, what a collected event carries, when a collected event is published, and the rule that a Collection never changes a stored post, for P12.
