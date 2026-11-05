# 02: The Assistant picks the Board itself, keeps the Place it found, and says how Approval Quests are entered

Status: ready-for-agent

Parent: `../spec.md` (P12)

Branch and PR: its own branch from `3.0/Main` after the spec merges, merging the tag `p12-x` (X) once it exists and nothing newer (`3.0/P12-02-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges only after ticket 06's after set is recorded. Heavy jobs take the shared lock (spec, Measurement).

**What to build:** Three small changes to what the Assistant's tools and replies tell the model and the User.

- **Board refusal.** When `proposeQuest` refuses a Quest with no Board, the refusal names the four Boards (식사, 진로, 취미, 공연) and tells the model to choose the one the activity plainly fits and propose at once, asking the User only when it fits none or more than one. The chat rules' clause becomes "When proposeQuest refuses fields, ask the User for those, all in one question, except a Board the activity plainly gives". A missing time is always asked.
- **`placeId` note.** When `resolvePlace` returned one Place in a message and a recruiting or Global Event search is then called without `placeId`, the search result carries a note that `placeId` was not given.
- **Approval line.** After the loop, the server adds one sentence to the reply when both of these hold:
  - the cards shown include a Quest whose Join Policy is Approval;
  - the reply holds fewer than two of 승인, 수락 and 신청.

  The sentence is along the lines of "승인제 파티는 참여 신청 후 방장이 수락하면 참여돼요." It is in English when the User's last message has no Hangul. It sits with the reply-text handling that adds the fixed sentence for cards, and it applies to every feature that shows Quest cards. The eval trace records the model's own reply and whether the line was added.

Spec: `../spec.md`, "CD-1: two contract fixes" and "CD-2: the Approval line". `resolvePlace` and the system prompt are not changed here.

**Blocked by:** None (can start immediately).

**#170:** Agreed with 윤유상 on #170 (2026-11-05): the wording lands here in P12, not in #170, since P12's after set runs on X, which does not hold #170. #170 changes neither the Board refusal nor the clause "When proposeQuest refuses fields, ask the User for those, all in one question". Merge note: both PRs edit the chat rules' bullet that starts "To propose a 파티". Whichever lands second keeps #170's Join Policy and capacity wording at its start and P12's refusal clause at its end.

**Merge 주의:** 05 changes the same search tools' results and the chat rules. Whichever lands second merges the other in.

## Target cases and expected result (written before implementing)

- `join-36`: the model should choose the Board from the activity and propose without asking. Expected to pass where R1 failed.
- `join-31` (0/3 in R1): the model should search again with `placeId` after seeing the note. This is uncertain: it depends on the model reading the note.
- J9 (2/21 in R1), on the final reply: expected to pass its floor on most runs, not all. A reply holding 승인 and 수락 but no 신청 gets no line and still fails J9's `신청` check; that is accepted, since such a reply already tells the User. The trace should show the server's sentence on every run with an Approval card where the model did not say it.
- J9 on the model's own reply: not expected to move, since the prompt is not changed for it. It is the number compared with the before set.
- The P4 suite: replies with no Approval card should be unchanged. Any Approval card there gets the line, and that is expected.

## Acceptance criteria

- [x] Assistant-over-HTTP integration tests with the model scripted:
  - [x] `proposeQuest` with no Board returns the new refusal, which names the four Boards and says to choose from the activity, asking only when none or more than one fits.
  - [x] The chat rules hold the clause with the Board exception, and no other rule tells the model to ask for a Board the activity plainly gives.
  - [x] After `resolvePlace` returns one Place, a search without `placeId` carries the note.
  - [x] A search with `placeId`, or with no `resolvePlace` before it, carries no note.
  - [x] With an Approval card shown and a reply holding none of the words, the line is added once.
  - [x] With a reply holding two of 승인, 수락 and 신청, no line is added.
  - [x] With an English last message, the line is in English.
  - [x] With only Open cards, or no cards, no line is added.
- [x] The eval trace records the model's own reply and a mark of whether the line was added, and the P5 report computes J9 on both the model's reply and the final reply. The eval harness's unit tests cover both.
- [x] The reply-text tests that exist pass, and the fixed sentence for cards is unchanged.
- [x] Prompt and rule text added here is general; it uses no held-out case's own sentences.

## Comments

### Decisions (2026-11-05)

- **Approval line wording**, chosen by the owner: `승인제 파티는 참여 신청 후 파티장이 수락하면 참여돼요.` and, when the User's last message has no Hangul, `A party that needs approval takes you in once you ask to join and its leader accepts.` 파티장 is the app's word for the Leader. The Korean line holds all three words, so a reply with it passes J9's word checks.
- **The note in `searchGlobalEvents`**, chosen by the owner: that search has no `placeId`, only `place`, words matched against the event's place text. Its note fires when `place` is not given, naming the Place resolvePlace answered (name, building number, id) and saying to pass its name or number as `place`. `searchRecruitingQuests`' note fires when `placeId` is not given. Both notes ride on a `found` or a `none` answer, as `note`; candidates and their order are unchanged.
- **"One Place in this message"** is kept in `FoundIds` (`addResolvedPlace`), which `resolvePlace` fills on a `one` answer. Its matching and its answer are unchanged. The ids `FoundIds` already held could not tell a `one` answer from a Restaurant's Place that `findMealRestaurants` adds.
- **The Board refusal** says to choose the Board "without asking, and propose once nothing else is missing", not "propose at once", so that it never reads as skipping a missing time (code review). `proposeQuest`'s tool description, which said to ask for every refused field, now carries the same Board exception as the chat rules, so the model reads one rule.
- **The line's language** (owner's decision on review, #212): it is read from the User's last message that holds a letter, not the last message itself, so that a short answer such as `18:00` or `2` in a Korean conversation keeps the Korean line. The entry words stay the spec's three Korean words: an English reply that already explains approval still gets the English line.
- **The Approval line** is added in `runFeature` after `replyOf`, which chooses the text as before (`FIXED_SENTENCE` included and unchanged), so it reaches every feature that shows Quest cards. It reads only `Card` and the Join Policy, so no SDK type leaves the adapter.
- **The trace and J9**: `RunObserver.replied` tells the recorder the reply's text before the line and whether it was added. The trace's reply gains `modelText` and `approvalLine`, and a run saved before P12 has neither, its text being the model's. The P05 report keeps `J9` on the reply the User saw, with its thresholds, and adds `J9-model`, the J9 cases scored again on `modelText`, with no threshold. `J9-model` is the number compared with the before set.

### Notes from review (2026-11-05)

- For P20: on a later turn, `J9-model` is not purely the model's own answer, since an earlier turn's reply goes back to the model with its line. This matters only for multi-turn J9 cases.
- `Status:` stays `ready-for-agent`, like 01 and 03, until ticket 06 flips the P12 tickets together.

### Re-scoring R1 (2026-11-05)

The five scorecards of R1 (`eval/results/2026-11-02-e171a95c-anthropic_claude-haiku-5.5-s8-t30000-o4000-tempdefault-toppdefault{,-2,-3,-4,-5}.json`) were scored again with `pnpm eval:score`, without the model, on copies outside the repository, and compared with the committed `.md`. The only difference is a new row in the small world's scorecard, `J9-model | 2/21 (9.5%)`, the same as `J9`, since R1's traces have no line. Every other number of the five is unchanged. The committed results were not touched.

### Agent usage (2026-11-05)

- Agent time: about 40 minutes, one session (an estimate, waiting for the owner left out), up to opening the PR.
- Tokens, up to opening the PR, the two `/code-review` subagents included: input 232 uncached, plus 14,387,323 cache reads and 324,159 cache writes; output 77,174. Of these, the subagents: input 32, cache reads 665,022, cache writes 128,432, output 8,589.
