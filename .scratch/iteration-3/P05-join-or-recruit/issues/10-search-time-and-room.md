# 10: Search by time and room

**What to build:** The Assistant's search tools take a time window, and the server drops Quests that are Full, out of time or that the reader cannot enter, before the list is cut, so that "11/2 17:00 이후" returns the evening and every Quest shown can be entered. Spec: `../spec-chat.md`, "A Quest's time and place" and "Search tools".

**Blocked by:** 02, 02b, 10a

**Status:** ready-for-agent

- [x] Both tools take `after` and `before` (date and time in Asia/Seoul); with only `after`, the window ends at 23:59 of that day.
- [x] An event is returned when its span overlaps the window; one without an end lasts until the end of its start's day.
- [x] A Quest's start is its first Sub Quest's start; a Sub Quest attending a Global Event takes the event's time and place as it is now.
- [x] A Quest for a Global Event is returned while the event's span overlaps the window and until the event ends; any other Quest is returned when its start is in the window, and never once its start has passed.
- [x] Full Quests, Quests for a Global Event of which the reader holds a Shared Quest, and Quests the reader already asked to join are never returned.
- [x] `minPlacesLeft` (default one) and an exact capacity are optional inputs; each Quest in a result keeps its places left, Join Policy and number of Holders.
- [x] Every filter runs in the database query, before the list is cut, not over every Quest read into memory; a test checks that adding a condition only ever narrows the result.
- [x] The Boards keep their listing unchanged.
- [x] Integration tests with the scripted model cover each rule; the large world's server recall test now passes for the cases this ticket enables.
- [x] This ticket has no full evaluation run of its own (P05 owner, 2026-11-01). Its cases may be checked with `pnpm eval --case`, and the full run comes at the end of the bundle, in ticket 12a.

## Comments

### Decisions (2026-11-02)

- `before` alone starts the window at 00:00 of its day, as the large world's generator reads it. A time overrides the day of its end, so `after` with `from` and `to` runs from that time to the end of `to`.
- A Quest for a cancelled event is never returned, though the Boards may still list it for another Sub Quest ahead. The spec does not say; such a Quest counts as its event, which is gone.
- An event ending at the very minute a window starts does not overlap it, as `searched()` already read a period. `eval/p5/large-world/answers.ts` reads that case as overlapping (`end >= from`). No large-world case's recall depends on it, and the small world was not checked for it.
- Ties in start order go by title in code points, then id. The spec names no tie rule, the database's own collation does not sort Hangul in 가나다 order, and random ids made the list differ between seedings. `large-v-05` holds only by this order: its card is one of three tied candidates across the twentieth place. Ticket 11's ranking replaces this for cases with words.
- `after` and `before` also take a time with a zone, read in that zone (PR review, 2026-11-02). Without it, `+09:00`, the form of a candidate's time, was refused, and `Z` passed the schema and was read 9 hours off.
- A Quest whose first Sub Quest has no start is gone once that Sub Quest's end has passed, even with a later Sub Quest ahead (PR review, 2026-11-02). It goes by its first Sub Quest like any other, and the filter stays before the cut.
- The Quest search takes no `words` or Place yet (ticket 11), so the intended calls' `words` and `placeId` are dropped by the input schema. The 16 cases this ticket frees hold on the window alone; their `until` is now null. The other 49 marks are as they were.
- The prompt is unchanged, so the model learns `after` and `before` only from the tool descriptions. Whether it uses them is measured in R1 (ticket 12a).

### Agent usage (2026-11-02)

- Agent time: about 48 minutes (estimate), one session with two review subagents, summed from the transcript with gaps capped at 5 minutes, through the reviews' fixes. Waiting for CI and for people is capped the same way, so a little of it is counted.
- Tokens, subagents included: input 140, with 10,040,403 cache reads and 400,558 cache writes shown apart; output 123,827. Counted before this commit.
- No eval model calls.
