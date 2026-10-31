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
- [ ] The P05 owner labels each case by the rules of the spec; a second labeller labels an overlapping part on their own, and the agreement is recorded as in ticket 01.
- [ ] The eval harness's own tests pass in CI with the new suite.
- [ ] The commit is tagged as C0 and recorded.
- [ ] R0 runs on the C0 commit with no chat change of P05 in it, on a clean working tree, three times per case, with the exact command recorded. P19's cases run three times on the same commit as the regression baseline.
- [ ] The record names the commit, the date and time, the model slug, the repetitions, the limits and the cost, as section 4.3 lists. Scores go into the improvement log table as R0 with each threshold's pass or fail, and a failure analysis table is written for the failed cases.
