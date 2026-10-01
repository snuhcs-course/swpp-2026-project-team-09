# 02: Global Events: states and collected Drafts

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: the first Collection, stored as lines)

## What to build

The main server stores Global Events with their states, Draft, published, cancelled and discarded, and receives collected events from the worker as Drafts. Four times a day the worker lists the university's events from today on, asks the main server which of the listed posts it already stores, reads the detail page of the others only, and sends each as one Draft: the title, the body as text, the start and end when the rules read them, the place text, the post number and the source link. A post is one Draft, identified by its post number. A post whose time or place could not be read is still a Draft, with its text, for the Administrator to fill in. A discarded Draft stays stored, so that the next Collection does not bring it back. A Draft the Administrator has edited or published is never changed by a Collection.

The administrative API and the User-facing list of published Global Events belong to P12. This ticket gives P12 the records and the rules it needs, and serves no events to Users.

## Acceptance criteria

- [ ] A Global Event record holds what P12 edits and publishes: a title, a description, a start, an optional end, a place text, an optional position that an Administrator sets, a state (Draft, published, cancelled or discarded), and a version for P12's edit check. A collected one also holds the post number and the source link; one an Administrator creates by hand has neither.
- [ ] The main server answers the worker's question, which of these post numbers do you store, with the stored ones in any state, so that a discarded or published post is not read again.
- [ ] The main server stores a collected post as a Draft once: the same post sent twice leaves one record, and a post already stored, in any state, is left exactly as it is.
- [ ] The worker lists the events from today on with the list's date filter, page by page until the list says there is nothing more, and reads only the detail pages the main server does not store. It asks for one page at a time, four times a day. The Source's Collection status is recorded as ticket 01 does, and a failure leaves the stored Drafts as they are.
- [ ] The parser reads the title, the body as text, the start and end from the body's time line or the header's date, the place from the body's place line, the post number and the link. Spacing and no-break spaces inside the labels do not matter. When the time or the place cannot be read, the Draft is still sent with the text. An application period or deadline is not read; it stays in the description.
- [ ] The rules are the team's own: no code, pattern list or keyword list from Haengsha.
- [ ] Parser tests with saved pages: a post with a time and a place, a post with a date range, a post whose time cannot be read, a post with an application deadline, a list page with its date filter, and the page past the end of the list.
- [ ] Message-boundary tests: the question about stored posts answered for a stored, a discarded and an unknown post; a valid Draft stored with its text; the same post twice stored once; a post already published or edited left as it is; an invalid message refused; a failure recorded.
- [ ] The main server's README records the Global Event states, what a collected Draft carries, and the rule that a Collection never changes a stored post, for P12.
