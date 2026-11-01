# 02: Chat metrics C0 and R0

**What to build:** A P05 eval suite, with its own small world, cases, labels and thresholds for "join if one exists" (evaluation C) and finding what matches (evaluation D), committed before any run; then an R0 run of the real model on the code before any chat change of P05, so that later runs can be compared with it. Spec: `../spec-chat.md`, "The P05 eval suite"; metrics: `../references/iter3-p5 메트릭.md` sections 2 (C, D) and 4.

**Blocked by:** None (can start immediately). C0 due 2026-11-01; R0 before ticket 10 starts.

**Status:** ready-for-agent

- [x] The P05 suite has its own case directory, small world and default clock beside P19's, as P04's does. P19's directory, world, cases and pinned counts are not touched.
- [x] The small world holds: Quests the asker holds, Quests led by others, a Full Quest, a Quest already started, a Quest for an event under way, a Quest the asker already asked to join, Quests at a nearby Place, a Quest with words only, a Shared Quest the asker holds for an event, the typo and synonym posts of subsets P, T1 and T2, and Quests on another Board than the obvious one.
- [x] Cases for J1, J1-P, J2, J3a (three traps), J3b, J4, J6, J7–J10 and for the search subsets L, P, T1, T2, H, S, N, R, O, E are added with expected tools and cards, each expected set exact (every right card, no other) and never more than 20 cards.
- [x] Subset H covers a Quest that already started, `after` alone ending at 23:59, and 아침 07–11, 점심 11–16, 저녁 17–22; N, R and O cover capacity, a nearby Place and an event under way.
- [x] Each search subset has at least five cases, and E has six; the record says that a smaller improvement is reported as a direction only (section 4.4).
- [x] P19 cases whose expected answer this work changes (`making-parties-for-event`, the recruiting cases that now search first, `ask-missing-fields-in-one-question`) are listed as superseded, each with the P05 case that holds the new answer; none is edited.
- [x] Thresholds (floor and target) for J1–J10 and E1–E8 are committed beside the cases, with each case's subset tags listed there as (case id, seed), and what happens when a floor is missed.
- [x] The scorer adds card-level micro precision and recall over the repetitions, per subset, and the mean over cases beside them. It may land after the C0 commit, since stored runs can be scored again.
- [x] Each case's answer is drafted, as P04's are, by an agent in a separate session that sees only the rules of the spec, the small world and the case, never the Assistant's prompts, tools or code; it writes the answer with its working.
- [x] The P05 owner reviews every draft against the rules and the world; each change made in review is recorded with its reason, and the record names the drafting session's model and date.
- [x] A second labeller labels an overlapping part from scratch, without the drafts, and the agreement with the reviewed answers is recorded as in ticket 01.
- [x] Evaluations A and B are not drafted this way: their answers are read from real posts by people, since a drafting model would share the Judgement's mistakes.
- [x] The eval harness's own tests pass in CI with the new suite.
- [x] The commit is tagged as C0 and recorded.
- [x] R0 runs on the C0 commit with no chat change of P05 in it, on a clean working tree, three times per case, with the exact command recorded. P19's cases run three times on the same commit as the regression baseline.
- [x] The record names the commit, the date and time, the model slug, the repetitions, the limits and the cost, as section 4.3 lists. Scores go into the improvement log table as R0 with each threshold's pass or fail, and a failure analysis table is written for the failed cases.

## Comments

### Suite built, labels pending (2026-10-31)

The record is `main-server/eval/p5/README.md`. Done by an agent: the world, rules, 98 questions, thresholds, tags, the scoring and the drafting sessions. Not done, since people do them or they come later: the owner's review, the second labeller's 20 cases, the agreement, putting the answers into the cases, the C0 tag, R0. The answers stay out of the repository until the second labeller is done, because it is public.

The branch is on `3.0/P04-03-p4-eval-set`, which holds the harness this suite needs, and merges after it.

### Labels in, tag and R0 pending (2026-11-01)

The owner (`Jaehyun0320`) reviewed all 100 drafts and the second labeller (김태현) answered the 20 overlap cases. Their answers are in `main-server/eval/p5/labels/` as saved, and the agreement, what was settled and why are in the record. The answers are in the cases, as `expect`, and the tags carry their seeds. What is left is the merge after ticket 03 of P04 and the C0 tag, then R0.

In review the owner decided that a question naming neither 행사 nor 파티 finds both, Quests with no Global Event included, and that "그 행사 파티 있어?" also takes such Quests of the same activity within the event's span. Rules section 5, the spec and ticket 11 say so; `search-l-06` and `search-t1-07` were added to measure it.

Known gap: `join-08` expects a Proposal, as the spec says, but a User holding a Shared Quest for that event cannot get a second Quest for it. The record says so; neither the answer nor the code changes.

### Review settled (2026-11-01)

`TaeHyun79` reviewed `8abf006` and the owner settled three items before C0. `search-o-05` now expects `전시 보러 가요`, as `join-17` does; section 8 of the rules says that "about 300 m" means 300 m or less and that a broad word such as 운동 finds every activity under it. Only `search-o-05`'s answer changed.

### C0 tagged (2026-11-01)

`eval-freeze-iter3-chat` on `28c0ce1`, the merge commit of #140. The record is `main-server/eval/p5/README.md`. R0 is left, once its cost and command are approved.

### R0 done (2026-11-01)

R0 ran on `28c0ce1`, a clean tree: the P05 suite three times per case and P19 three times over, for about USD 1.20 of the eval model. The record is `main-server/eval/p5/r0.md`, with the improvement log and the failure analysis; the results are in `main-server/eval/results/`.

Not in any P05 ticket at the time, now ticket 10a: when the model writes its answer beside a tool call and ends the next step with no words, the server reads only the last step and answers 503. It took 31 of the 300 P05 runs and 10 of the 216 P19 runs. The record says so, and R0 keeps those runs. The owner decided on 2026-11-01 to fix it before ticket 10.

The large world's R0 belongs to ticket 02b.

### Agent usage (2026-11-01)

The ticket's agent work, done.

- Agent time: about 2 hours 40 minutes (estimate), one session with two review subagents and five drafting CLI calls. It includes about 40 minutes of R0 running; waiting for people is left out.
- Tokens, subagents and drafting included, without the eval model's own: input 510, with 49,685,669 cache reads and 1,408,887 cache writes shown apart; output 441,805. Counted before this commit.
- The eval model, `anthropic/claude-haiku-5.5`: input 10,484,718, output 298,398, no cache.
