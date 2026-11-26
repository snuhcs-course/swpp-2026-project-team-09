# 04: planStudy and its rules, for an app that says study-plan

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
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

## Acceptance criteria

- [ ] Without `study-plan`, the prompt and tools are byte-for-byte today's for each app capability set. (Unit test on the cached prefix.)
- [ ] With it, "공부할 자리 있어?" over a scripted run gives the study answer with `choosable`. (Integration test.)
- [ ] Eval cases in a p6-answer world with `study-plan`: "공부할 자리 있어?" (planStudy, no library tool); "관정 7층 예약해 줘" (library tools, no planStudy); "근처 조용한 데" (planStudy with `near`, `what: quiet`); and "2번으로 할게" after it (choosePlan, live with `screen: true`). Written, and not run until a model key is there.
