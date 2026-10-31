# 02: Chat metrics C0 and R0

**What to build:** A P05 eval suite, with its own small world, cases, labels and thresholds for "join if one exists" (evaluation C) and finding what matches (evaluation D), committed before any run; then an R0 run of the real model on the code before any chat change of P05, so that later runs can be compared with it. Spec: `../spec-chat.md`, "The P05 eval suite"; metrics: `../references/iter3-p5 메트릭.md` sections 2 (C, D) and 4.

**Blocked by:** None (can start immediately). C0 due 2026-11-01; R0 before ticket 10 starts.

**Status:** ready-for-agent

- [ ] The P05 suite has its own case directory, small world and default clock beside P19's, as P04's does. P19's directory, world, cases and pinned counts are not touched.
- [ ] The small world holds: Quests the asker holds, Quests led by others, a Full Quest, a Quest already started, a Quest for an event under way, a Quest the asker already asked to join, Quests at a nearby Place, a Quest with words only, a Shared Quest the asker holds for an event, the typo and synonym posts of subsets P, T1 and T2, and Quests on another Board than the obvious one.
- [ ] Cases for J1, J1-P, J2, J3a (three traps), J3b, J4, J6, J7–J10 and for the search subsets L, P, T1, T2, H, S, N, R, O, E are added with expected tools and cards, each expected set exact (every right card, no other) and never more than 20 cards.
- [ ] Subset H covers a Quest that already started, `after` alone ending at 23:59, and 아침 07–11, 점심 11–16, 저녁 17–22; N, R and O cover capacity, a nearby Place and an event under way.
- [ ] Each search subset has at least five cases, and E has six; the record says that a smaller improvement is reported as a direction only (section 4.4).
- [ ] P19 cases whose expected answer this work changes (`making-parties-for-event`, the recruiting cases that now search first, `ask-missing-fields-in-one-question`) are listed as superseded, each with the P05 case that holds the new answer; none is edited.
- [ ] Thresholds (floor and target) for J1–J10 and E1–E8 are committed beside the cases, with each case's subset tags listed there as (case id, seed), and what happens when a floor is missed.
- [ ] The scorer adds card-level micro precision and recall over the repetitions, per subset, and the mean over cases beside them. It may land after the C0 commit, since stored runs can be scored again.
- [ ] Each case's answer is drafted, as P04's are, by an agent in a separate session that sees only the rules of the spec, the small world and the case, never the Assistant's prompts, tools or code; it writes the answer with its working.
- [ ] The P05 owner reviews every draft against the rules and the world; each change made in review is recorded with its reason, and the record names the drafting session's model and date.
- [ ] A second labeller labels an overlapping part from scratch, without the drafts, and the agreement with the reviewed answers is recorded as in ticket 01.
- [ ] Evaluations A and B are not drafted this way: their answers are read from real posts by people, since a drafting model would share the Judgement's mistakes.
- [ ] The eval harness's own tests pass in CI with the new suite.
- [ ] The commit is tagged as C0 and recorded.
- [ ] R0 runs on the C0 commit with no chat change of P05 in it, on a clean working tree, three times per case, with the exact command recorded. P19's cases run three times on the same commit as the regression baseline.
- [ ] The record names the commit, the date and time, the model slug, the repetitions, the limits and the cost, as section 4.3 lists. Scores go into the improvement log table as R0 with each threshold's pass or fail, and a failure analysis table is written for the failed cases.

## Comments

### Suite built, labels pending (2026-10-31)

The record is `main-server/eval/p5/README.md`. Done by an agent: the world, rules, 98 questions, thresholds, tags, the scoring and the drafting sessions. Not done, since people do them or they come later: the owner's review, the second labeller's 20 cases, the agreement, putting the answers into the cases, the C0 tag, R0. The answers stay out of the repository until the second labeller is done, because it is public.

The branch is on `3.0/P04-03-p4-eval-set`, which holds the harness this suite needs, and merges after it.

### Agent usage (2026-10-31)

Agent work so far; the labels and R0 will add to it.

- Agent time: about 50 minutes (estimate), one session with two review subagents and four drafting CLI calls (about 10 minutes of them, running alongside it).
- Tokens, subagents and drafting included: input 172, with 13,744,459 cache reads and 692,073 cache writes shown apart; output 260,882. Counted before the PR was opened.
