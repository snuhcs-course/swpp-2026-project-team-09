# 28: 관정 named as the place to study stays a seat

Parent: [P10 spec](../spec.md); follows [ticket 04](04-tool-and-rules.md)
Status: ready-for-agent

Native files: none. Releases: the main server; the app needs no change.

## What to build

Once the app says `study-plan` (#685), the chat's rules send a place to study that names no 관정도서관 space and no booking to planStudy (`studyPlanRules` in `main-server/src/assistant/lookup/study-plan-tools.ts`). "관정에서 공부" names 관정 but no space, so the model calls planStudy instead of the library tools. A message that also asks for a meal then loses its steps:

- `presentSteps` (`main-server/src/assistant/steps/plan-steps.ts`) makes steps only once a library book card or a refused seat is there;
- the reply holds one answer, so the last tool's answer wins.

The user met it on the phone with #685: "관정에서 공부하다가 저녁 먹을래" came back as one answer with no steps. Before the app said `study-plan`, the same words gave a seat and a meal as two steps.

- **The fix:** 관정 named as the place to study, with no space named and with or without a booking, is a seat for the library tools (7F-7A-zone2), in both the library rules (`NO_SPACE_STUDY_WORDS` in `library/library-rules.ts`) and `studyPlanRules`. Only a place to study with no 관정 named and no booking goes to planStudy.
- The rule text is the same for every kind of message: the steps follow from the library tools, so no rule is about steps or meals.

## Acceptance criteria

- [x] With `study-plan` declared, the system prompt tells the model that 관정 named as the place to study is a seat for the library tools. (Integration test with the scripted model, which failed before the rule.)
- [x] "11시에 관정에서 공부하다가 13시쯤 점심 먹을래" with `study-plan` declared keeps a seat step and a meal step, the meal from 관정. (Integration test, as a guard.)
- [x] An eval case in `several-steps.yaml` with `capabilities: study-app` (seat and dinner as steps, planStudy forbidden), and one in `study-plan.yaml` ("관정에서 공부할래" through the library tools). Written, not run: no model key on the machine they were written on.
- [x] The integration and unit files that pin the rules per capability, the study answer and the eval cases pass once each.
- [x] Whole lint, format and types of `main-server`.
- [ ] The user checks on the phone that "관정에서 공부하다가 저녁 먹을래" shows the steps again.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 35 minutes (an estimate): finding why the steps went, about 15, and the fix with its tests and checks, about 20. One session, no subagents.
- Tokens, from the order to build it on (the finding before is in P10 ticket 27's session total): input 12,835,650, of which 12,714,192 cache reads and 121,372 cache writes; output about 25,500.
