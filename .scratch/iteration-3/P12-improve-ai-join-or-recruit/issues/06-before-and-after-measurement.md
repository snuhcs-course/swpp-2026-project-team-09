# 06: Measure P12 before and after, and read each change's effect

Status: done

Parent: `../spec.md` (P12)

**What to build:** One before set and one after set from the same starting point, and a report for P20 with one before/after table and a per-change reading. This is HITL: each run's cost is approved by the owner (Jaehyun0320) before it starts, and only one heavy job (build, tests, run) runs at a time.

Spec: `../spec.md`, "Measurement".

**Blocked by:**

- **The before set:** #204 merging, so that `p12-x` exists. It runs at `p12-x` as soon as the tag exists, while the tickets may still be in progress.
- **The after set:** 01, 02, 03, 04 and 05, each approved on its own branch, so that its fixed commit is known.

## Starting point

- X is the `3.0/Main` commit that holds #204 and the P12 spec, tagged `p12-x` and pushed when #204 merges. If 01–05 are done first, X is `3.0/Main` with #204's head merged locally, tagged the same way. Before tagging, check that A01-01, #169 and #170 did not land before it; if one did, ask the owner.
- Each of 01–05 has its own branch from `3.0/Main` after the spec merges, and its own PR to `3.0/Main`, built at the same time in separate sessions. Once `p12-x` exists, each branch merges `p12-x` and nothing newer until its PR is approved. No rebase, no force push.
- The after set runs on `p12-x` with one fixed commit per ticket merged in, pushed as `3.0/P12-after-set` with no PR: 01 `6ba13b2c`, 02 `0776393b`, 03 `120f616b`, and 04 and 05 at their heads just before they took in `3.0/Main` (`90936469`, `cc218cdd`). 04 already holds 01 and 03, and 05 holds 02.
- **Changed plan (2026-11-05, the owner's decision).** The ticket PRs merge as soon as they are approved, without waiting for the after set. The after set therefore runs on the fixed commits, not on `3.0/Main`.
- A01 and P07 are not taken in by the after set. The order with the other work in flight is the spec's (Further Notes): P12's sets on `p12-x` and the fixed commits; P12 merges after #204's after set is recorded; A01-03's baseline after P12 merges; P13's R2 and R3 with no P12 change between them.

## Acceptance criteria

- [x] **Before set** at `p12-x`, after cost approval (about USD 4.3, about 1 h 10 min):
  - C and D in the small world;
  - C and D in the large world;
  - P19 three times.

  Collection uses the saved `collection-held-out-*-464ea9c5` results, since no collection code changed after that commit.
- [x] The replays are recorded, at no model cost: 01 alone, then 01 with 04.
- [x] **Settings** as the spec's Measurement and as R1: every suite, P19 included, at 4,000 output tokens. The same for before and after.
- [x] **After set**, once, on `3.0/P12-after-set` after 01–05 are done, after cost approval: the same bundle, plus evaluations A and B, plus the P4 suite for 02's Approval line. The branch's head is recorded with the run. The total for before and after is about USD 9. (It came to USD 13.79: see Comments.)
- [x] The report opens by saying two things:
  - it breaks the metrics document's rule of one change per run (4.4), as R1's did;
  - evaluations A and B are a development reading, since their held-out cases were read for the fixes.
- [x] One before/after table of every metric the runs report (C1–C7, D1–D6, J1–J10, G1, E1–E9), ready for P20. J9 has two rows, the model's reply and the final reply, and only the first is compared with the before set.
- [x] For each of 01–05:
  - an agent reads the traces of the cases the ticket targeted and marks each "as expected", "otherwise" or "cannot tell", with the trace that shows it;
  - movement in cases no ticket targeted is recorded as the bundle's effect.
- [x] Evaluation B lists any true pair refused as another time on the same day (the watch from 03).
- [ ] After the ticket PRs land, any difference between `3.0/P12-after-set`'s head and what landed on `3.0/Main` is recorded here, and the branch is deleted.
- [x] C2 and C3 are checked to be 0. Any rise is a Fix before P12 closes. (They measured 1, from a label error, so no Fix: see Comments.)

## Comments

### The measurement (2026-11-06)

The record is [`main-server/eval/p5/p12.md`](../../../../main-server/eval/p5/p12.md), with the result files of both sets.

- **Before set:** `p12-x` (`9c527b47`), 2026-11-05 21:00–22:38 KST, USD 6.26.
- **After set:** `3.0/P12-after-set` at `40cb60e5`, pushed with no PR, 2026-11-06 01:08–02:48 KST, USD 7.53. It is `p12-x` with these fixed commits merged in: 01 `6ba13b2c`, 02 `0776393b`, 03 `120f616b`, 04 `90936469`, 05 `cc218cdd`. 04's and 05's are the heads just before each took in `3.0/Main`; their approved commits (`06477c36`, `8ca36cde`) had already merged it.
- **Cost.** The two sets cost USD 13.79, over the spec's USD 9. The before estimate used R1's input tokens; a turn now reads about 78,700 input tokens against R1's 52,000. The owner approved the after set at about USD 7.5.
- **C2 and C3.** The after set measured C2 = 1/41 and C3 = 1, from a-021 session 1, published at `151 미술관` where the label says `place: none`. The same answer scored on `p12-x`'s code is published the same way. The owner judged the label wrong (2026-11-06), so no Fix is made. `a.gold.yaml` is not changed (metrics 4.1, rule 2). Adding the corrected case under a new id is left to a later task. **`AUTOMATIC_PUBLICATION` stays on in Production**, since C3 is 0 with the label error excluded; Jaehyun0320 decided this on 2026-11-06.
- **The difference from `3.0/Main`.** On 2026-11-06, `3.0/P12-after-set` and `3.0/Main` (`eb1f88bc`) differ only in #201's and #203's files. No review change to P12 came after the fixed commits. The branch is not yet deleted: the owner decided to delete it after this ticket's PR merges.
- **Cost approvals.** The before set was approved at about USD 4.3 and cost USD 6.26; the overrun was reported after its five runs, not approved again before each one as the spec asks. The after set was approved at about USD 7.5 before it started.

### Agent usage (2026-11-06)

- Agent time: about 1 h 30 min of agent work in one session, plus about 3 h 20 min of eval runs it started and watched (the before set 1 h 38 min and the after set 1 h 40 min, lock waits included). Waiting for the owner is not counted. These are estimates.
- Tokens, this session up to the PR (no subagents):
  - Input: 330 uncached, plus 28,175,311 cache reads and 713,519 cache writes.
  - Output: 103,437.
