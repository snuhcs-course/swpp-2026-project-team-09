# 05: Search results say why each candidate matched and how to narrow a broad search

Status: done

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-05-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The after set measures this PR at a fixed commit on `p12-x`, never on `3.0/Main`. So the PR may merge before the after set is recorded. Before merging, it is updated from `3.0/Main`, and ticket 06 records any change between the measured commit and what lands. Heavy jobs take the shared lock (spec, Measurement).

**What to build:** The recruiting and Global Event searches give the model what it needs to pick cards and to narrow a search.

- **Candidate fields.** Each candidate gains:
  - `matched`: the words of `words` found in its title or description. They come from the same expressions that rank candidates by word count today.
  - `window`: `starts` if it starts in the asked window, `underWay` if it began before and overlaps it.
  - `join`: `open` or `askToJoin`, from its Join Policy.
- **Two picking lines.** The chat rules gain two lines:
  - a candidate that is `underWay` is in the window like one that `starts`;
  - with an activity asked, a candidate with no `matched` word is shown only when its title is clearly that activity.

  The prompt is not otherwise restructured.
- **`narrowBy`.** When a search has more candidates than it returns, the result keeps `more: true` and adds `total` and `narrowBy`:
  - counts by Board;
  - counts by day of the start, in the world's time zone;
  - counts by word of `words`.

  The counts use the same filters as the search. No paging argument is added.

Spec: `../spec.md`, "CD-3" and "CD-4".

**Blocked by:** None (can start immediately).

**Merge 주의:** 02 changes the same search tools' results (the `placeId` note) and the reply handling. Whichever lands second merges the other in.

## Target cases and expected result (written before implementing)

- E7 (R1: small 238/282, large 352/432): `search-h-*`, the Quests for an exhibition already under way, should be kept by the `underWay` line.
- E1 (R1: small 394/422, large 693/770): `search-t1-01` (7 unmatched cards) and `large-n-02` (19) should show fewer cards with no `matched` word. E1 should not fall.
- E4 (large 123/177): `large-v-*`, questions about a time alone, should improve partly.
- E9 (large 54/141): the runs with `more: true` (38 of the 50 "not among candidates" runs in R1) should narrow by Board, day or word. Only a slight rise is expected. The alias dictionary that E9's target needs is out of scope.
- The trace should show `matched`, `window` and `narrowBy` in the results the model read, and a second, narrower search after `more: true`.

## Acceptance criteria

- [x] Assistant-over-HTTP integration tests with the model scripted:
  - [x] `matched` lists exactly the words found;
  - [x] a candidate matching no word has an empty `matched`, and its rank is unchanged from today;
  - [x] `window` is `underWay` for a Quest or Global Event that began before the window and overlaps it, and `starts` otherwise;
  - [x] `join` follows the Join Policy;
  - [x] with more candidates than the limit, `total` and every count in `narrowBy` equal the counts of the full filtered set;
  - [x] with fewer candidates, no `narrowBy` is given.
- [x] Adding the fields changes neither which candidates are returned nor their order: the existing search tests pass unchanged.
- [ ] The large world's server-recall test in CI still passes.
- [x] The two prompt lines are general and use no held-out case's words.

## Comments

### Decisions (2026-11-05)

- Built on `3.0/P12-05-search-fields-and-narrow-by`, from the tag `p12-x`, with ticket 02's head `0776393b` (#212) merged first, since both change the search tools' results.
- `matched` is selected from the same per-word ILIKE expressions that `moreWordsFirst` adds for the ranking (`wordsHeld` in `common/search-sql.ts`), with the words as parameters. A word given twice counts once and is listed as first given. `matched` is left out when the search was given no words, and `window` when no window was asked, to keep the result short.
- `window` compares the candidate's start with the window's start: before it is `underWay`, otherwise `starts`. The searches' filters already keep only candidates that overlap the window.
- `join` is on Quest candidates only, since a Global Event has no Join Policy. `joinPolicy` stays beside it, because the ticket says candidates gain the field (the owner agreed to keep both).
- `narrowBy` comes from a second query, run only when `more` is true, over the same FROM and WHERE as the search, uncut. It counts by Board (Quests only), by start day in Asia/Seoul and by word, and leaves out empty groups. A candidate already under way is counted on its start day, as the spec says, even when that day is before the window (the owner agreed).
- The second picking line applies only to a search that was given words ("When the User asked for an activity and the search was given words, …"). Without words, `matched` is absent, and the line would otherwise drop candidates that fit, such as those of a search made with only a Board. The reviewer raised this on #214, and the owner agreed to the change.
- The two tool descriptions each gained one sentence on `matched`, `window` and `narrowBy`, so that the model knows to search again by them. The owner agreed to keep these sentences. The chat rules gained only the ticket's two lines.
- `searchPublished` and `searched` (used by resolveGlobalEvent and the free-time candidates) are unchanged.
- Two existing exact-shape expectations (`assistant-recruiting-quests`, `assistant-global-events`) gained the new fields. Every existing test keeps its candidates and their order unchanged.
- No real model run was made. Ticket 06 measures the bundle.

### Agent usage (2026-11-05)

- Agent time: about 30 minutes (estimate), one session plus two review subagents. Time spent waiting for answers, CI and the shared lock is not counted.
- Tokens, main session plus the two `/code-review` subagents:
  - input: 168 uncached;
  - output: 59,217;
  - cache reads: 7,927,972;
  - cache writes: 270,941.
