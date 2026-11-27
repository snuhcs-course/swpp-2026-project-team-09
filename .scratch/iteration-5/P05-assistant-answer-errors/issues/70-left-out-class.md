# 70: A Class left out belongs to the conversation, for every kind of answer

Parent: [P05 spec](../spec.md). Found on the user's phone on 2026-11-27: after a 관정 seat answer, "1시 수업 휴강이야" was answered that a Class can be left out "식사 추천에서만". His words: "휴강 관련 등 같은 … 기능들이 한 시나리오에만 한정되지 않고 글로벌하게 적용할 수 있는 공용 기능이었으면 좋겠어 … 공용 콤포넌트를 안쓰고 식당에서만 가능하게 한다는 등 좋지 않은 디자인 패턴 … 주의해줘."
Status: ready-for-human
Blocked by: nothing. The app's side is P01 ticket 40.

Native files: none. Releases: the main server; the app sends the list back with its P01 ticket 40, and until then an app that sends none is given none back.

## What changes

- **One shared module**, kind-neutral (`free-time/left-out-classes.ts`, which replaces `gathering/skip-classes.ts`): the tools' `skipClasses`/`attendClasses`, the word matching, the filter of the asker's items, and the band's `skipped`.
- **The conversation carries the Classes left out**, not one answer's input:
  - the request context and `POST /assistant/answers` take `skipped: [{ date, classId }]`;
  - every reply of an app that draws answers gives the conversation's list back as `skipped`;
  - the model reads `[Classes left out: …]` after the User's message.
- **Every tool that reads the asker's day leaves them out:** `planMeal`, `planMeet`, `planStudy`, `planStudyGroup`, `planEvents`, `planQuests`, `planNewQuest`, and `proposeLibraryBooking` for a seat for today without a start (its arrival and time to leave). `leaveClassesOut` names them with nothing to plan. A Friend's Class is never left out.
- **Every band** draws them apart in `skipped`, with a plan or without one (the no-plan bands of a meet, a study place and studying together included), and the asker's lane leaves them out.
- **One rule for every kind** (`LEFT_OUT_RULES`). The meal-only bullet in `plan-rules.ts` is gone, so no prompt says a Class can be left out of a meal alone.
- A meal's `input.skipped` is still read for the apps before.

## Answer kinds × leaving a Class out

| Answer kind | Was | Now |
|---|---|---|
| meal | ✓ (`planMeal`, the meal's own input) | ✓ through the conversation's list too |
| meet | ✗ | ✓ |
| seat (관정 card for today) | ✗ ("식사 추천에서만") | ✓ arrival and time to leave |
| study places (`study-plan`) | ✗ | ✓ |
| studying together (`study-group`) | ✗ | ✓ |
| events of a day | ✗ | ✓ |
| Quests to join | ✗ | ✓ |
| new 파티 | ✗ | ✓ |

## Acceptance criteria

- [x] A Class left out frees a meet, a study place, the events of a day and a new 파티, drawn apart on the band; the conversation carries it to the next answer of another kind; a word naming no Class asks which; a recalculation leaves those of its day out. (Integration test, `assistant-left-out-class`.)
- [x] A seat for today leaves the Class out of its time to leave, says so, gives it back, and keeps it out on the next message from the list sent. (Integration test, failing before the change.)
- [x] The bands of studying together, with and without a plan, and of a study place without a plan draw it apart. (Unit tests, failing before the change.)
- [x] The rules say it for every kind and no longer through planMeal alone. (Unit test, failing before the change.)
- [x] The eval cases load (`left-out-classes.yaml`).
- [x] The whole of main-server's lint, format and types.

## Phone steps, once server and app (P01 ticket 40) are released

1. Type "관정 열람실 자리 있어?", then "1시 수업 휴강이야".
2. The reply says the Class was left out, with no "식사 추천에서만". The seat's time card shows the 13:00 Class as a dashed gap and a "뺀 수업" row with a "13:00 ✕" chip, and the seat time reaches past 13:00.
3. Pressing ✕ puts the Class back on the lane; the card then shows its own clash words and keeps the slot.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 2 hours in all, an estimate: about 1.5 hours in the session that built the WIP before the account switch (its stop note gives no figures; estimated from its size), and about 25 minutes in the session that merged `5.0/Main` in, finished the seat and studying together, and opened the PR.
- Tokens, the second session's share only (the first one's were not measured): input 56M, of which 55M cache reads, 0.12M cache writes and under 1k uncached; output 54k.
