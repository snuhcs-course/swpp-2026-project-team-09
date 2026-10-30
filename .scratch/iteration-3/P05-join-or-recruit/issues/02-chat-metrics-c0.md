# 02: Chat metrics C0 and R0

**What to build:** The eval cases and world by which "join if one exists" (evaluation C) and finding what matches (evaluation D) will be scored, committed with their thresholds before any run, and then an R0 run of the real model on the code before any chat change of P05, so that R1 can be compared with it. Spec: `../spec-chat.md`, metrics: `../references/iter3-p5 메트릭.md` sections 2 (C, D) and 4.

**Blocked by:** None (can start immediately). C0 due 2026-11-01; R0 before ticket 10 starts.

**Status:** ready-for-agent

- [ ] The eval world gains what the cases need: Quests the asker holds, Quests led by others, a Full Quest, a Quest already started, Quests at a nearby Place, a Quest whose place is only words, a Shared Quest the asker holds for a Global Event, and the typo and synonym posts of subsets P, T1 and T2. Subset V (many candidates) moves to the large world of ticket 02b.
- [ ] The world changes are listed with the P04–P07 world changes and frozen on one agreed day.
- [ ] Cases for J1, J1-P, J2, J3a, J3b, J4, J6 and for the search subsets L, P, T1, T2, H, S, E are added with expected tools and cards, each expected set exact (every right card, no other).
- [ ] Subsets for the conditions settled in the grilling are added: N (a named number is the capacity: "4명" finds capacity four only), R (a named Place finds it and Places within about 300 m, not a place that is only words), O (an event under way that overlaps the window is found). H also covers a Quest that already started, `after` alone ending at 23:59, and 아침 07–11, 점심 11–16, 저녁 17–22.
- [ ] Each search subset has at least five cases; the record says that a smaller improvement is reported as a direction only (section 4.4).
- [ ] J3a's Full Quest trap is counted under J3b, since the server will drop Full Quests.
- [ ] Thresholds (floor and target) for J1–J6 and E1–E6 are committed beside the cases, with each case's subset tags listed there as (case id, seed).
- [ ] The scorer adds card-level micro precision and recall over the repetitions, per subset (E1–E4), to the scorecard. It may land after the C0 commit, since stored runs can be scored again.
- [ ] The eval harness's own tests pass in CI with the new world and cases.
- [ ] The commit is tagged as C0 and recorded; one labeller is noted, a second pending.
- [ ] The run uses the C0 commit with no chat change of P05 in it, and a clean working tree.
- [ ] The record names the commit, the date and time, the model slug, the repetitions and the cost, as section 4.3 lists.
- [ ] Scores for evaluations C and D are written into the improvement log table as R0, with each threshold's pass or fail.
- [ ] A failure analysis table is written for the failed cases.
