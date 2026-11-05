# 05: Search results say why each candidate matched and how to narrow a broad search

Status: ready-for-agent

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-05-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges only after ticket 06's after set is recorded. Heavy jobs take the shared lock (spec, Measurement).

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

- [ ] Assistant-over-HTTP integration tests with the model scripted:
  - [ ] `matched` lists exactly the words found;
  - [ ] a candidate matching no word has an empty `matched`, and its rank is unchanged from today;
  - [ ] `window` is `underWay` for a Quest or Global Event that began before the window and overlaps it, and `starts` otherwise;
  - [ ] `join` follows the Join Policy;
  - [ ] with more candidates than the limit, `total` and every count in `narrowBy` equal the counts of the full filtered set;
  - [ ] with fewer candidates, no `narrowBy` is given.
- [ ] Adding the fields changes neither which candidates are returned nor their order: the existing search tests pass unchanged.
- [ ] The large world's server-recall test in CI still passes.
- [ ] The two prompt lines are general and use no held-out case's words.
