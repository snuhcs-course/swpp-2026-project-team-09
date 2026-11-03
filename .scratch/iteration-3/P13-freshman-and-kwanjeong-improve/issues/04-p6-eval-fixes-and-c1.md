# 04: P6 eval fixes and R1 rescored, then the new quests' cases and C1

Parent: [P13 spec](../spec.md) ("P6 eval: fixes, new cases and C1")
Status: ready-for-human
Blocked by: none for part A; 01 for part B

## What to build

**Part A (wave 1).** Fix the harness's own errors that R1 found (`main-server/eval/p6/r1.md`, the 잠정 note) and rescore R1 from its saved results, with no model call, so that R1's verdict is read from the right numbers. Add the test that would have caught #188's import.

**Part B (after 01 merges).** Two cases per new Tutorial Quest, labelled as at C0, the eval's tutorial copy updated to the new content, and the suite moved to C1 and tagged.

Part A and part B may be two PRs. Part B needs people: the PM rules on the drafted labels and 함재현 reviews them, hence ready-for-human.

## Acceptance criteria

Part A:
- [ ] `main-server/eval/library-card.ts` reads the key's optional `s=` and `e=` segments, so that a card's seat and equipment are scored from its key when the card has no field.
- [ ] `eval/p6/suite.yaml` gains `revises:` with `reason:` for: `p6-spaces-alias-imac` (Media Carrel A in `seat`, not `equipment`), and `p6-common-free-time-not-library`, `p6-tutorial-exhibition-today` and `p6-tutorial-health-clinic` (their `tools.only` no longer forbids what the chat's rules require; the library tools stay forbidden). No threshold changes.
- [ ] R1 is rescored from `eval/results/2026-11-02-869acde2-…-3.json` with `pnpm eval:score`, with no model call; `r1.md` gains a section with each threshold as run and after the fixes, and its 잠정 note says which points are now settled.
- [ ] Tests, named by ADR 0007 (harness tests, reported apart): `main-server/test/eval-library-card.unit.test.ts` (keys with and without `s=` and `e=`), and `main-server/test/eval-cli-plain-node.integration.test.ts`, which spawns `node eval/cli.ts --world p6` without `--yes`, with stdin not a terminal and a dummy key, and checks that it prints the estimate and exits without `ERR_MODULE_NOT_FOUND` (it fails on #188's `import { type … }`).

Part B:
- [ ] `eval/p6/cases/tutorial.yaml` gains twenty cases, two per new quest of 01: one on a fact the content states, one on what it lacks (answered with the quest's link or 확인되지 않아요, with `text.absent` for a tempting made-up value). Times in `text.mentions` are HH:MM.
- [ ] Each new `expect` is drafted by an agent in a separate session that sees only `rules.md`, `world.yaml`, the catalogue, the tutorial copy and the questions; the PM's rulings are in `labels-notes.md`; 함재현's review is recorded in `suite.yaml` (`reviewedBy`, `reviewedOn`).
- [ ] `eval/p6/tutorial.yaml` becomes 01's `content/tutorial.yaml`, entered with `revises:`; cases and world values that count the quests (`p6-tutorial-progress`, the world's tutorial progress) are revised for fifteen.
- [ ] The suite is committed and tagged `eval-freeze-iter3-p6-c1`, and `suite.yaml`'s `freeze` gains `c1Tag` and `c1Commit`. No run is made in this ticket.
- [ ] `test/eval-cases.integration.test.ts` is extended: the C1 cases load, and each new case's quest is in the copy.

## Comments
