# 06: The P6 eval set, frozen before any result (C0)

Parent: [P06 spec](../spec.md) ("The P6 eval suite")
Status: ready-for-human
Blocked by: 02 (the labels read `tutorial.yaml`)

## What to build

A frozen evaluation of the Assistant's library and tutorial behaviour: 60 cases in `main-server/eval/p6/` beside P19, P4 and P5, with their own world, a rules document, labels drafted blind and reviewed by a person, and thresholds committed before any result. It is tagged C0, then R0 runs on the code before P6's chat change, together with the fixed P19 baseline.

**This ticket must merge before ticket 07 changes the chat.** Ticket 07 can be built in parallel, but its chat changes (prompt, tools, fragments) land on `3.0/Main` only after this ticket's C0 tag and the R0 and P19 baseline runs, so that the baseline is on the code before the change and the labels do not follow the code.

The world file holds 학번, registered names, 소속 and tutorial progress. If tickets 01 and 02 are not yet on `3.0/Main`, `world.yaml` still holds them and `world.ts` seeds them when those columns exist; the frozen content does not change.

An item marked **Person** is a person's work, not an agent's.

## Acceptance criteria

- [x] **Harness changes,** without touching P19's, P4's or P5's files: `pnpm eval --world p6`; a new `expect.cards` kind `library` matched by key fields (`action`, space, conditions); normalisers for the library tools (dates `YYYY-MM-DD`, times `HH:MM`, minutes, catalogue ids); a `FreeTimePort` binding to the world's days. _(Done but the binding: the port is ticket 07's; until then the world's real Timetable feeds P4's day service. Also `tools.only`, so that an ASK may call one tool and no other.)_
- [x] **The world** (`world.yaml`, `world.ts`), default clock 2026-11-04 (수) 10:05 KST: the 26학번 undergraduate asker with a Timetable that Wednesday (gaps around 12:00 and 15:00), a graduate and an exchange asker, Friends with registered names and fake 학번 (`2026-00001` …) including two with the same name, a lunch Quest the asker holds, and tutorial progress in each state. _(Also a Global Event exhibition at 미술관 that day, for the exhibition question.)_
- [x] **64 cases**, every one `repeat: 3`, in the spec's seven categories and counts (14, 15, 10, 7, 5, 8, 5; the PM added two "아무 자리" cases, and the review two one-space cases, on 2026-11-02), including each case the category table names. Group rooms include the two 8-people cases: 9 people for a 10인실, and a 20인실 (G201) request, each expecting the refusal "파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요" and no card.
- [x] **`rules.md`** states the judgement in prose: the result kinds, the window, the hours, durations, capacity, the 8-people party limit (G201 never offered), the useDesc inference rule, when to ask, and the tutorial's grounding rule.
- [x] **Blind draft.** An agent in a separate session, seeing only `rules.md`, `world.yaml`, the catalogue, `tutorial.yaml` and the questions (never the prompt, tools or code), drafts each `expect` with its working in `labels-working.yaml`. _(Drafted 2026-11-02; the PM's rulings are in `labels-notes.md`.)_
- [ ] **Person:** the tutorial texts in `tutorial.yaml` (the _drafted_ ones above all) are reviewed by the owner before the freeze, since C0 freezes the labels drawn from them.
- [x] **Person:** the owner (AhnJinYoung) reviews every draft and records each change with its reason in `labels-notes.md`, especially the alias and purpose mappings and the useDesc inferences. _(Three rounds of rulings on 2026-11-02: one answer per case, anything ambiguous an ASK.)_
- [x] **Person:** the PR reviewer (함재현) reviews the labels. _(The review on #177 came from 함재현's account running an agent (Claude), not a person's read of every label; its points are applied, rulings 16–21 in `labels-notes.md`.)_
- [ ] **Person, optional:** a teammate labels about 10 cases from scratch; the agreement is reported in `suite.yaml`. _(The count as first written did not add up: one per category plus the four alias cases is 11, not 10.)_
- [ ] **`suite.yaml`** records the drafter, the reviewer, the dates, the open questions and the thresholds M1–M5 and overall as the spec proposes, frozen.
- [x] `out-of-scope-library-seats` is listed at C0 as superseded, with the P6 case that holds its new answer. The P19 case itself is not edited.
- [x] Everything is committed and tagged C0 before R0. A later change is entered with `revises:` and `reason:`. _(C0 is `31d8820f`, tag `eval-freeze-iter3-p6`. `declared`, `c0Tag` and `c0Commit` in `suite.yaml` were filled in after the tag, with no frozen value changed; `eval/p6/r0.md`.)_
- [x] **R0** runs on the code before P6's chat change (most cases fail by design). _(2026-11-02 on `31d8820f`: 4/192 runs passed; `eval/p6/r0.md`.)_
- [x] **every P19 case runs 3 times** on that commit with the model, limits and commit recorded. _(The pre-07 baseline is P05 R1 (PM, 2026-11-02); one P19 check run on C0 recorded in r0.md.)_
- [ ] The P4 and P5 suites run once there, as a report. _(Started and stopped by the PM's decision of 2026-11-02 to save cost; no results. `eval/p6/r0.md`, "멈춘 run".)_
- [x] Privacy: no world, case, label, trace or result holds a real 학번, a real name or library data; the CI test that loads the suite checks every 학번 matches the fake pattern.
- [x] Tests, named by ADR 0007: unit tests for the new normalisers and the `library` card matcher; the suite's files load and validate (harness tests, reported apart from the product's pyramid).

## Comments

### Agent usage (2026-11-02)

The R0 and P19 runs and their record, in one agent session. Earlier work on this ticket (the harness, the suite, the labels) was recorded in its own sessions, if at all, and is not counted here.

- Agent time: about 50 minutes, an estimate. About 10 of them were the runs.
- Tokens, an estimate: about 2.6M input, of which about 2.4M cache reads and 0.15M cache writes, and about 40k output. No subagents. The coordinating session that started this one is not included.
- Model runs on OpenRouter: USD 0.77 recorded (P6 R0 0.41, P19 0.36), and about USD 1.5–2.2 unrecorded for the four runs stopped early.
