# 05: 관정 accuracy: the C1 baseline, the fixes for R1's failure causes, and the run after

Parent: [P13 spec](../spec.md) ("관정 accuracy (after A01)")
Status: ready-for-human
Blocked by: 04 (part B, C1), A01 (tickets 01–03 merged, with its baseline recorded)

## What to build

Raise the P6 suite past all 9 frozen thresholds by fixing the causes R1 found in the Assistant, and measure it on the Anthropic path production uses. First a C1 baseline (R2) on `3.0/Main` before any change; then the fixes in `LIBRARY_RULES` and the library tools; then R3 on the fix. The Assistant also says "원하는 자리를 눌러 주세요" when it shows seats, and the per-turn input growth (44k → 70k tokens after P06-07) is measured and, if it is `findLibrarySpace`'s catalogue, cut.

The runs are paid and one-off, hence ready-for-human: the PM approves each run's estimate before it starts.

## Acceptance criteria

- [ ] **R2**: the P6 suite (C1) run on `3.0/Main` after 04 and A01, with `MODEL_PROVIDER=anthropic` and A01's caching default, recorded in `main-server/eval/p6/r2.md` in `r1.md`'s form (command, commit, model, limits, usage and cost, each threshold, the failure reading), and in `suite.yaml`'s `runs`.
- [ ] R2 records the input tokens of one P6 turn and one P19 turn split into the system prompt, the tools' descriptions (`findLibrarySpace`'s catalogue apart) and the conversation, from a recorded request.
- [ ] Fixes in `main-server/src/assistant/library/library-rules.ts` and the tools under `src/assistant/library/` (and `src/assistant/tools/resolve-friend.ts` if the 학과 is not in its result), one per cause, each named in the commit:
  - [ ] a room-request reply says the Friends are asked for their 동의 and the room is booked after they agree, never "예약하기를 눌러야";
  - [ ] ASKs call no tool first; same-name Friends are told apart by 학과;
  - [ ] 대학원 열람실 eligibility comes from the tool, not from the catalogue's status alone;
  - [ ] "취소해줘" and "반납해줘" call `proposeLibraryCancel` and `proposeLibraryReturn`;
  - [ ] unsupported requests are refused with "미구현";
  - [ ] every time in a reply is HH:MM;
  - [ ] the VR room's useDesc is left out;
  - [ ] with a seats card, the reply says "원하는 자리를 눌러 주세요";
  - [ ] if R2 shows the catalogue is the input growth, it is shortened or moved to the tool's result; otherwise R2's reading is recorded and nothing changes.
- [ ] The scripted-model tests that pin tool results keep passing (`assistant-library-*.integration.test.ts`), and new ones cover the tool changes (`resolveFriend`'s 학과 if added; the catalogue's new place if moved), named by ADR 0007.
- [ ] **The twenty C1 cases are held out.** The fixes are made from R1's and R2's failures on the 64 C0 cases only; nobody reads the C1 cases' runs while fixing. `r3.md` reports R3 twice: on the 64 C0 cases (the fix loop's own cases, so partly a measure of fitting to them) and on the 20 C1 cases alone (the held-out reading).
- [ ] **R3** on the fix's commit with the same model, limits and caching, in `eval/p6/r3.md`: all 9 frozen thresholds pass, or each one that does not is explained; each R1 failure cause is marked gone or explained.
- [ ] **P19 regression**: three runs on R2's commit and three on R3's, each budgeted to run all 75 turns; no case newly fails (fails in ≥ 2 later runs and ≤ 1 baseline run). The P4 and P5 suites once each, as a report.
- [ ] Each run's estimate (from A01 ticket 03's cost per turn) is approved by the PM before it starts, and recorded with the actual cost.

## Comments
