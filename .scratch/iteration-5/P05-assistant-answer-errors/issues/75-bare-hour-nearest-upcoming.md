# 75: An hour said bare is its nearest upcoming time

Parent: [P05 spec](../spec.md). Found on 2026-11-28 at about 01:10 on the phone: "7시에 공부할거야" was taken as 19:00 first.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only.

## What was wrong

No rule said how to read an hour with no word for the half of the day. The model read it by its own habit, which leans to the afternoon and evening, and `findWay`'s descriptions even said "2시 in the afternoon is 14:00". The rule asked for: such an hour is its nearest upcoming time from now. At 01:10 7시 is 07:00 today, at 08:00 19:00 today, at 20:00 07:00 tomorrow. A word for the half of the day (오전, 오후, 아침, 점심, 저녁, 밤, 새벽) or a 24-hour time always wins.

## Where the reading happens

Only the model reads the User's words: every tool takes the time already as HH:MM (`planStudy`/`planStudyGroup` `from`/`until`, `planMeal` `from`/`until`, `planMeet` `at`/`from`/`until`, `planNewQuest` `time`, `proposeLibraryBooking` `start`/`end`, `findWay` `by`, the search windows), so the server cannot tell "7시" from "19시". The one place every answer kind reads is the chat's per-request system line, "Now in Korea: …" (`requestInstructionsOf` in `main-server/src/assistant/chat/chat-assistant.ts`).

## Fix

`main-server/src/assistant/bare-hours.ts` computes, in code, what each bare hour 1시–12시 means at the request's time (`nearestBareHour`), and `bareHourRule(now)` writes it as one "Bare hours:" line after the time line: the rule, the three examples, the twelve readings for now, a 반 example in the current hour, and what wins or is left alone. The model only has to see whether the words carry a half-of-the-day word; the arithmetic is done. Because it is in the per-request line, meal, study, seat, group study, meet, events and new party all read the same line.

| | Was | Now |
|---|---|---|
| "7시에 공부할거야" at 01:10 | the model's habit (19:00 on the phone) | 07:00 today |
| "7시" at 08:00 | the model's habit | 19:00 today |
| "7시" at 20:00 | the model's habit | 07:00 tomorrow |
| "1시 반" at 01:10 | the model's habit | 01:30 |
| "12시" at 13:00 | the model's habit | 00:00 tomorrow |
| "저녁 7시", "아침 7시", "점심 12시", "19시" | the word | the word, unchanged |
| "내일 7시", "금요일 3시" | the model's reading (daytime, as `meet-at`'s "내일 … 한시" → 13:00) | the same: the line says it does not apply |
| "1시 수업" (a Class named by its start) | that Class | that Class: the line says so |
| A span "3시부터 6시까지" | the model's habit | first hour by the rule, the second the first time after it |
| `findWay`'s `by` descriptions | "2시 in the afternoon is 14:00" | "오후 2시 is 14:00, and a bare 2시 is read by the Bare hours line" |

## Sweep

Searched every rule and tool description under `main-server/src/assistant` for hours (`[0-9]시`, `HH:MM`, 오후, 저녁, afternoon, evening, pm, 낮). Only `findWay`'s two descriptions pushed toward the afternoon; reworded. The rest give no reading of a bare hour or are consistent: `left-out-classes`/`left-out-tools` "1시 수업 → 13:00" names a Class (the exception in the line); "16시 … 19시" in `STEPS_RULES` and `study-plan-tools` are 24-hour; "3시부터", "6시까지", "두시에", "3시에 보자", "12시에서 1시 사이" are examples of what to pass and now read by the line; chat's "아침, 점심 or 저녁 alone starts at 08:00, 12:00 or 18:00" and the 아침/점심/저녁 windows name no hour. "오늘 7시" after 19:00 has no upcoming time today; the line reads it as tomorrow's 07:00, which "오늘" contradicts. It was left alone: rare, and no rule was asked for.

## Tests

- `main-server/test/assistant-bare-hours.unit.test.ts` (new, 17 tests): the three clock cases, the current minute, 12시 at noon and midnight, minutes, the line's twelve readings, and that a half-of-the-day word or a 24-hour time wins and another day is left alone.
- `main-server/test/assistant-cached-prefix.unit.test.ts`: the per-request system line is the time line and the bare-hours line; failed (5 tests) before the change.
- `main-server/eval/cases/bare-hours.yaml` (new, 7 cases, not run): study at 01:10, 08:00 and 20:00, 저녁 7시 and 19시 winning, a meal and a meet.

## Acceptance criteria

- [x] The unit tests above pass; `eval-p4-cases`, `eval-case-fields` and `assistant-way-time` (integration) pass, run once each.
- [x] main-server's lint, types and format pass.
- [ ] On the phone after the Release, "7시에 공부할거야" late at night plans 07:00.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 25 minutes, an estimate, one session.
- Tokens: not measured in the session; roughly input 1.5M, mostly cache reads (about 1.4M) with about 0.1M cache writes, and output 25k, an estimate.
