# 10: Search by time and room

**What to build:** The Assistant's search tools take a time window, and the server drops Quests that are Full, out of time or that the reader cannot enter, before the list is cut, so that "11/2 17:00 이후" returns the evening and every Quest shown can be entered. Spec: `../spec-chat.md`, "A Quest's time and place" and "Search tools".

**Blocked by:** 02, 02b

**Status:** ready-for-agent

- [ ] Both tools take `after` and `before` (date and time in Asia/Seoul); with only `after`, the window ends at 23:59 of that day.
- [ ] An event is returned when its span overlaps the window; one without an end lasts until the end of its start's day.
- [ ] A Quest's start is its first Sub Quest's start; a Sub Quest attending a Global Event takes the event's time and place as it is now.
- [ ] A Quest for a Global Event is returned while the event's span overlaps the window and until the event ends; any other Quest is returned when its start is in the window, and never once its start has passed.
- [ ] Full Quests, Quests for a Global Event of which the reader holds a Shared Quest, and Quests the reader already asked to join are never returned.
- [ ] `minPlacesLeft` (default one) and an exact capacity are optional inputs; each Quest in a result keeps its places left, Join Policy and number of Holders.
- [ ] Every filter runs in the database query, before the list is cut, not over every Quest read into memory; a test checks that adding a condition only ever narrows the result.
- [ ] The Boards keep their listing unchanged.
- [ ] Integration tests with the scripted model cover each rule; the large world's server recall test now passes for the cases this ticket enables.
- [ ] R1 is run (this change alone) in both worlds and recorded beside R0, with a failure analysis.
