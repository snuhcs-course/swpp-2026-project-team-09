# 11: Search ranking and nearby Places

**What to build:** Search words rank results instead of filtering them, the model sees more candidates, and a Quest search can ask for a Place and its surroundings, so that "공연" finds "콘서트" and "301동 근처" finds 302동. Spec: `../spec-chat.md`, "A Quest's time and place" and "Search tools".

**Blocked by:** 10

**Status:** ready-for-agent

- [x] The Quest search gains a `words` input; in both searches, candidates holding more of the words come first, ties in start order, and the rest of the window fills the places left; no candidate is dropped for lacking a word, and the server does not order by Holders.
- [x] Searches return up to 30 candidates, with descriptions cut at 150 characters.
- [x] The tool descriptions tell the model to give related words and to correct a typo in the User's question; the instructions say to search Quests without a Board when unsure of one, and to leave out only candidates that are clearly different.
- [x] The instructions say that a question naming neither 행사 nor 파티 ("뮤지컬 있어?") searches both Global Events and Quests, and that a question about an event's Quests ("그 행사 파티 있어?", "사진전 가는 파티 있어?") also takes Quests with no Global Event for the same activity within the event's span. The cases `search-l-02`, `search-l-06`, `search-t1-07`, `search-o-05` and `join-17` measure it.
- [x] The Quest search takes a Place and a radius (300 m, as the rules of the P05 suite read "about 300 m"), measured between positions: a Place's, a point's, or a Global Event's for a Quest attending one. A Quest with words only is left out when a Place is given.
- [x] Integration tests with the scripted model cover ranking, the limits and the radius; the large world's server recall test passes for the cases this ticket enables.
- [x] The instructions say not to repeat, in the last step, what was already written beside a tool call. R0a: of 40 joined replies read, 5 said the same answer almost word for word twice and 18 repeated part of it (`main-server/eval/p5/r0a.md`, "합친 글"). Measured by reading a sample of the bundled run's joined replies, since no metric sees it.
- [x] This ticket has no full evaluation run of its own (P05 owner, 2026-11-01). Its cases may be checked with `pnpm eval --case`, and the full run comes at the end of the bundle, in ticket 12a.

## Comments

### Decisions (2026-11-02)

- `words` in both searches may hold ten, not five. 공연 and its four related words are five already, and a typo's correction or a broad word such as 운동 goes past that; a call over the limit is refused and costs the model a step, while a word costs the query two ILIKEs. No intended call gives more than five.
- `searchGlobalEvents` has its own raw query (`global-events/ranked-search.ts`), since Prisma cannot order by how many words a row holds. `searchPublished` keeps only `period`, `title` and `take`, and its order, so `resolveGlobalEvent` and the free-time candidates behave as before. The event search's `place` stays a filter, as this ticket does not take it up, and now reads `%`, `_` and a backslash as themselves.
- A word given twice counts once, ignoring case. The spec does not say; otherwise repeating a word would raise a candidate.
- A Quest's words are its title and description, as the large world's simulation reads them, and the whole description ranks, not only the 150 characters the model sees. A Sub Quest's title and place do not.
- `radius` is an optional input with a default of 300, and any positive value is taken; given without `placeId` it is refused. Ticket 12 tells the model when to use a Place. The tool descriptions tell it now to take `placeId` from `resolvePlace`; the prompt's list of rules was not changed for that.
- A `placeId` that names no Place answers "none", as a Place with nothing around it does. `globalEventId` reads the same way, and neither must come from a resolver in the same message.
- The reason for "none" of the event search no longer names the words, since they filter nothing.
- All 41 `until: 11` marks held on the real server, as the simulation said, so none differs from it. They are now null: 72 hold, and the 8 marked `search stage 1` still miss a card.
- `resolvePlace`'s description also says it serves a search near a Place, since `placeId` must come from it.
- The instruction not to repeat a step is in; this ticket stops at the instruction. Whether it worked is read from a sample of R1's joined replies in ticket 12a, since no metric sees it.

### Agent usage (2026-11-02)

- Agent time: about 18 minutes (estimate), one session with two review subagents running alongside it, summed from the transcript with gaps capped at 5 minutes. Waiting for CI and people is capped the same way, so a little of it is counted.
- Tokens, subagents included: input 108, with 5,961,837 cache reads and 381,966 cache writes shown apart; output 106,195. Counted before this commit.
- No eval model calls.
