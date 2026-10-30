# 10: Search by time and room

**What to build:** The Assistant's search tools take a time window, and the server drops Quests that are Full, have started or that the reader cannot enter, before the list is cut, so that "11/2 17:00 이후" returns the evening and every Quest shown has room. Spec: `../spec-chat.md`, "Search tools".

**Blocked by:** 02, 02b

**Status:** ready-for-agent

- [ ] Both tools take `after` and `before` (date and time in Asia/Seoul); with only `after`, the window ends at 23:59 of that day.
- [ ] An event is returned when its span overlaps the window; one without an end lasts until the end of its start's day.
- [ ] A Quest's start is its first Sub Quest's start; a Quest is returned when its start is in the window, and never once its start has passed.
- [ ] Full Quests are never returned; `minPlacesLeft` (default one) and an exact capacity are optional inputs.
- [ ] Quests for a Global Event of which the reader holds a Shared Quest are not returned.
- [ ] Every filter runs before the list is cut; each Quest keeps its places left and Join Policy.
- [ ] The Boards keep their listing unchanged.
- [ ] The fixed test of the Full `아침 러닝 크루` changes to the new behaviour.
- [ ] Tests over HTTP with the scripted model cover each rule.
