# 06: The P6 eval set, frozen before any result (C0)

Parent: [P06 spec](../spec.md) ("The P6 eval suite")
Status: ready-for-human
Blocked by: None (can start immediately)

## What to build

A frozen evaluation of the Assistant's library and tutorial behaviour: 58 cases in `main-server/eval/p6/` beside P19, P4 and P5, with their own world, a rules document, labels drafted blind and reviewed by a person, and thresholds committed before any result. It is tagged C0, then R0 runs on the code before P6's chat change, together with the fixed P19 baseline.

**This ticket must merge before ticket 07 changes the chat.** Ticket 07 can be built in parallel, but its chat changes (prompt, tools, fragments) land on `3.0/Main` only after this ticket's C0 tag and the R0 and P19 baseline runs, so that the baseline is on the code before the change and the labels do not follow the code.

The world file holds 학번, registered names, 소속 and tutorial progress. If tickets 01 and 02 are not yet on `3.0/Main`, `world.yaml` still holds them and `world.ts` seeds them when those columns exist; the frozen content does not change.

An item marked **Person** is a person's work, not an agent's.

## Acceptance criteria

- [ ] **Harness changes,** without touching P19's, P4's or P5's files: `pnpm eval --world p6`; a new `expect.cards` kind `library` matched by key fields (`action`, space, conditions); normalisers for the library tools (dates `YYYY-MM-DD`, times `HH:MM`, minutes, catalogue ids); a `FreeTimePort` binding to the world's days.
- [ ] **The world** (`world.yaml`, `world.ts`), default clock 2026-11-04 (수) 10:05 KST: the 26학번 undergraduate asker with a Timetable that Wednesday (gaps around 12:00 and 15:00), a graduate and an exchange asker, Friends with registered names and fake 학번 (`2026-00001` …) including two with the same name, a lunch Quest the asker holds, and tutorial progress in each state.
- [ ] **58 cases**, every one `repeat: 3`, in the spec's seven categories and counts (14, 12, 10, 5, 5, 8, 4), including each case the category table names.
- [ ] **`rules.md`** states the judgement in prose: the result kinds, the window, the hours, durations, capacity, the useDesc inference rule, when to ask, and the tutorial's grounding rule.
- [ ] **Blind draft.** An agent in a separate session, seeing only `rules.md`, `world.yaml`, the catalogue, `tutorial.yaml` and the questions (never the prompt, tools or code), drafts each `expect` with its working in `labels-working.yaml`.
- [ ] **Person:** the owner (AhnJinYoung) reviews every draft and records each change with its reason in `labels-notes.md`, especially the alias and purpose mappings and the useDesc inferences.
- [ ] **Person:** a teammate labels 10 cases from scratch (one per category plus the four alias cases); the agreement is reported in `suite.yaml`.
- [ ] **`suite.yaml`** records the drafter, the reviewer, the dates, the open questions and the thresholds M1–M5 and overall as the spec proposes, frozen.
- [ ] `out-of-scope-library-seats` is listed at C0 as superseded, with the P6 case that holds its new answer. The P19 case itself is not edited.
- [ ] Everything is committed and tagged C0 before R0. A later change is entered with `revises:` and `reason:`.
- [ ] **R0** runs on the code before P6's chat change (most cases fail by design), and **every P19 case runs 3 times** on that commit with the model, limits and commit recorded. The P4 and P5 suites run once there, as a report.
- [ ] Privacy: no world, case, label, trace or result holds a real 학번, a real name or library data; the CI test that loads the suite checks every 학번 matches the fake pattern.
- [ ] Tests, named by ADR 0007: unit tests for the new normalisers and the `library` card matcher; the suite's files load and validate (harness tests, reported apart from the product's pyramid).
