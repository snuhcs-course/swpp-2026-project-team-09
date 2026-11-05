# 06: Measure P12 before and after, and read each change's effect

Status: ready-for-human

Parent: `../spec.md` (P12)

**What to build:** One before set and one after set from the same starting point, and a report for P20 with one before/after table and a per-change reading. This is HITL: each run's cost is approved by the owner (Jaehyun0320) before it starts, and only one heavy job (build, tests, run) runs at a time.

Spec: `../spec.md`, "Measurement".

**Blocked by:**

- **The before set:** none. It runs at X as soon as X exists.
- **The after set:** 01, 02, 03, 04 and 05, each done on its own branch with its PR open.

## Starting point

- X is `3.0/Main` with `origin/3.0/P11-04-chat` (#204, head `4b2097cb`) merged locally. Each of 01–05 has its own branch from X and its own PR to `3.0/Main`, built at the same time in separate sessions. The after set runs on a merge of the five branches, pushed as `3.0/P12-after-set` with no PR, and the ticket PRs merge only after it is recorded.
- When #204 merges, Main is merged into each ticket branch: no rebase, no force push. If #204 changes in review, the difference is recorded here.
- A01 and P07 are not taken in until the after set is done. The order with the other work in flight is the spec's (Further Notes): P12's sets before A01-01, #169 and #170 merge; P12 merges after #204's after set is recorded; A01-03's baseline after P12 merges; P13's R2 and R3 with no P12 change between them.

## Acceptance criteria

- [ ] **Before set** at X, after cost approval (about USD 4.3, about 1 h 10 min):
  - C and D in the small world;
  - C and D in the large world;
  - P19 three times.

  Collection uses the saved `collection-held-out-*-464ea9c5` results, since no collection code changed after that commit.
- [ ] The replays are recorded, at no model cost: 01 alone, then 01 with 04.
- [ ] **Settings** as the spec's Measurement: C, D and the P4 suite at 4,000 output tokens; P19 at 1,000, passed with `--max-output-tokens`. The same for before and after.
- [ ] **After set**, once, on `3.0/P12-after-set` after 01–05 are done, after cost approval: the same bundle, plus evaluations A and B, plus the P4 suite for 02's Approval line. The branch's head is recorded with the run. The total for before and after is about USD 9.
- [ ] The report opens by saying two things:
  - it breaks the metrics document's rule of one change per run (4.4), as R1's did;
  - evaluations A and B are a development reading, since their held-out cases were read for the fixes.
- [ ] One before/after table of every metric the runs report (C1–C7, D1–D6, J1–J10, G1, E1–E9), ready for P20. J9 has two rows, the model's reply and the final reply, and only the first is compared with the before set.
- [ ] For each of 01–05:
  - an agent reads the traces of the cases the ticket targeted and marks each "as expected", "otherwise" or "cannot tell", with the trace that shows it;
  - movement in cases no ticket targeted is recorded as the bundle's effect.
- [ ] Evaluation B lists any true pair refused as another time on the same day (the watch from 03).
- [ ] After the ticket PRs land, any difference between `3.0/P12-after-set`'s head and what landed on `3.0/Main` is recorded here, and the branch is deleted.
- [ ] C2 and C3 are checked to be 0. Any rise is a Fix before P12 closes.
