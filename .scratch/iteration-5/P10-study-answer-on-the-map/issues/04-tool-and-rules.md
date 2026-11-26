# 04: planStudy and its rules, for an app that says study-plan

Parent: [P10 spec](../spec.md)
Status: ready-for-human
Blocked by: 03

## What to build

- The tool `planStudy` (`what`, `date?`, `from?`, `until?`, `near?`) puts 03's answer in `presented.answer`. It tells the model the plans in words: building, first space, open or unknown, stay, closes at, and the order's reason. It never gives seat counts.
- `STUDY_PLAN_RULES`, offered only with `study-plan` (as `withStudyArea` does for `area`):
  - "공부할 자리/데/곳 있어?", "조용히 공부할 곳" and "같이 공부할 곳" call `planStudy`, without asking back.
  - A named 관정 room, or a booking ("관정 7층 예약해 줘"), stays with the library tools.
  - The reply is one sentence about the first plan and why, as for meals. It names no seat counts.
  - When `planStudy` answers none, say why in one sentence.
- With `study-plan`, the library rule "words that name no space mean 7F-7A-zone2" no longer applies to "공부할 자리". Without it, the rules are unchanged.
- The wordless net (P05 ticket 48) writes "…을 추천해요." from the first plan for a study answer too.

## Built (2026-11-27)

- `lookup/study-plan-tools.ts` holds `planStudy`, `STUDY_PLAN_RULES` and `withStudyPlan`. `lookup/study-plan-words.ts` holds what the model is told and the one sentence.
- `planStudy` plans from today to 7 days ahead. `near` without a visible area answers none.
- With `study-plan`, `findStudyNearby` and `STUDY_RULES` are not offered, even with `area`: 근처 is `planStudy` with `near`, by the decision of 2026-11-26.
- The library rules' sentence 'Words that name no space, such as "공부할 자리"… mean 7F-7A-zone2' changes with `study-plan` only (`LIBRARY_STUDY_RULES`). A booking ("공부할 자리 예약해 줘", "자리 잡아 줘") still means 7F-7A-zone2.
- The chat is built for 8 more capability sets (`-study`).
- The eval suite gains `capabilities: study-app` and a `viewport` in a case's `context`.

## Acceptance criteria

- [x] Without `study-plan`, the prompt and tools are byte-for-byte today's for each app capability set.
  - Before and after the change, the cached prefix (tools and system) of the plain chat and of each of the 8 sets that draw answers was hashed. All 9 hashes were equal.
  - `test/assistant-study-plan-rules.unit.test.ts` keeps it so: an app that says nothing of `study-plan` gets the same prompt as `drawsStudy: false`, with no `planStudy`. With it, the prompt differs only by the swapped rules.
- [x] With it, "공부할 자리 있어?" over a scripted run gives the study answer with `choosable`. (Integration test, `test/assistant-study-plan.integration.test.ts`.)
- [x] Eval cases in a p6-answer world with `study-plan` (`eval/cases/study-plan.yaml`), written and not run, as there is no model key:
  - "공부할 자리 있어?" (planStudy, no library tool);
  - "관정 7층 예약해 줘" (library tools, no planStudy);
  - "근처 조용한 데" (planStudy with `near`, `what: quiet`);
  - "2번으로 할게" after it (choosePlan, live with `screen: true`). It is marked a known failure until ticket 05 widens `choosePlan` to a study answer.
