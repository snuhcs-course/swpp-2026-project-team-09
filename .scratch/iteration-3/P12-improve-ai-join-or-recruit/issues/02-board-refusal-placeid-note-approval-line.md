# 02: The Assistant picks the Board itself, keeps the Place it found, and says how Approval Quests are entered

Status: ready-for-agent

Parent: `../spec.md` (P12)

Branch and PR: its own branch from X (`3.0/P12-02-…`) and its own PR to `3.0/Main`, built in its own session at the same time as the other code tickets. The PR merges only after ticket 06's after set is recorded. Heavy jobs take the shared lock (spec, Measurement).

**What to build:** Three small changes to what the Assistant's tools and replies tell the model and the User.

- **Board refusal.** When `proposeQuest` refuses a Quest with no Board, the refusal tells the model to choose 식사, 진로, 취미 or 공연 from the activity, and to ask the User only when the activity fits none.
- **`placeId` note.** When `resolvePlace` returned one Place in a message and a recruiting or Global Event search is then called without `placeId`, the search result carries a note that `placeId` was not given.
- **Approval line.** After the loop, the server adds one sentence to the reply when both of these hold:
  - the cards shown include a Quest whose Join Policy is Approval;
  - the reply holds fewer than two of 승인, 수락 and 신청.

  The sentence is along the lines of "승인제 파티는 참여 신청 후 방장이 수락하면 참여돼요." It is in English when the User's last message has no Hangul. It sits with the reply-text handling that adds the fixed sentence for cards, and it applies to every feature that shows Quest cards. The eval trace records the model's own reply and whether the line was added.

Spec: `../spec.md`, "CD-1: two contract fixes" and "CD-2: the Approval line". `resolvePlace` and the system prompt are not changed here.

**Blocked by:** None (can start immediately). The Board refusal part alone waits for the rule agreed with #170 (P07-02, 윤유상): #170 keeps "the Board and the time are still asked" and edits the same tool. The rule proposed to #170: the Board is chosen from the activity when it plainly fits one of the four and asked otherwise; the time is always asked. The agreed wording goes into both the refusal and the chat rules.

**Merge 주의:** 05 changes the same search tools' results and the chat rules. Whichever lands second merges the other in.

## Target cases and expected result (written before implementing)

- `join-36`: the model should choose the Board from the activity and propose without asking. Expected to pass where R1 failed.
- `join-31` (0/3 in R1): the model should search again with `placeId` after seeing the note. This is uncertain: it depends on the model reading the note.
- J9 (2/21 in R1), on the final reply: expected to pass its floor deterministically. The trace should show the server's sentence on every run with an Approval card where the model did not say it.
- J9 on the model's own reply: not expected to move, since the prompt is not changed for it. It is the number compared with the before set.
- The P4 suite: replies with no Approval card should be unchanged. Any Approval card there gets the line, and that is expected.

## Acceptance criteria

- [ ] Assistant-over-HTTP integration tests with the model scripted:
  - [ ] `proposeQuest` with no Board returns the new refusal, which names the four Boards and the activity.
  - [ ] After `resolvePlace` returns one Place, a search without `placeId` carries the note.
  - [ ] A search with `placeId`, or with no `resolvePlace` before it, carries no note.
  - [ ] With an Approval card shown and a reply holding none of the words, the line is added once.
  - [ ] With a reply holding two of 승인, 수락 and 신청, no line is added.
  - [ ] With an English last message, the line is in English.
  - [ ] With only Open cards, or no cards, no line is added.
- [ ] The eval trace records the model's own reply and a mark of whether the line was added, and the P5 report computes J9 on both the model's reply and the final reply. The eval harness's unit tests cover both.
- [ ] The reply-text tests that exist pass, and the fixed sentence for cards is unchanged.
- [ ] Prompt and rule text added here is general; it uses no held-out case's own sentences.
