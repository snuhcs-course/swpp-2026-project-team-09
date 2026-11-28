# 86: An answer offers no other meal or time than the one asked

Parent: [P05 spec](../spec.md). Found on 2026-11-28 at about 19:05 on the user's phone (preview app, the real server). "월요일 점심" was answered "월요일 점심은 걸어서 바로 갈 수 있는 301동식당을 추천해요. 저녁이면 '저녁'이라고 해 주세요." His words: "왜 텍스트에 저녁 이야기가 나올까?"
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only.

## Cause

`PLAN_RULES` (`plan-rules.ts`) said: "On a later day with no meal named, the plans are lunch's: your sentence may end by saying that 저녁 plans dinner, such as '…저녁이면 '저녁'이라고 해 주세요.'" The model said it of a lunch the User had named. It came neither from the question of a time that has passed (ticket 80) nor from the meal by the clock.

## What changes

- The later-day line keeps its fact and drops the offer: "On a later day with no meal named, the plans are lunch's; the app's bar offers dinner itself."
- One rule in the chat's general rules, which every app and every kind of answer reads (meal, study, meeting, events, several requests): never end an answer that answered the meal, day or time asked about by offering another one, nor by telling the User what to say for one. The app shows the other meal on its bar, and a time that has passed is asked back with askPastTime alone.
- When what was asked for is not served or cannot be had at all, saying what is instead is a fact, not an offer, as for breakfast. This keeps the breakfast rule ("say in one sentence that lunch and dinner are") and the eval case `meal-breakfast-planned-none` (TaeHyun79's review).

## The class

The rules of what cannot be had read as facts under the wording, so none is caught by it:

- breakfast: lunch and dinner are;
- a meal over today: the question with its buttons;
- a meet at a time nobody can make: why, and the nearest time;
- a closed Restaurant or a menu not posted;
- a time that has passed: askPastTime.

Every rule and tool description under `main-server/src/assistant` was searched for an offer of another meal, day or time ("may end by", "may add", "may say", "라고 해 주세요", "이면 '", 점심/저녁/내일 in the meet, study, events and steps rules). Only the later-day meal line offered one. The meet rules' "may say so" is about the shuttle on the way, and the steps rules name meals only to order the steps. No test, mock or eval case pinned the old sentence; the eval result files only record earlier runs.

## Tests

- `main-server/test/no-other-time-offer.unit.test.ts` (new, 6 tests). For an app that draws nothing and for one that draws every answer, the instructions:
  - hold the rule;
  - let an answer say what is served when the meal asked for is not served at all;
  - hold no sentence that offers another meal ("저녁이면", "저녁 plans dinner").

  Before: 3 of the first 4 failed.
- `assistant-meal-wish-rules`, `assistant-cached-prefix`, `assistant-study-plan-rules`, `assistant-study-group-rules` and `plan-follow-up-rules` (unit) pass.
- No eval was run.

## Acceptance criteria

- [x] The tests above pass; main-server's lint, types and format pass.
- [ ] On the phone after the Release, "월요일 점심" is answered with no word of dinner.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 15 minutes (an estimate), in one session.
- Tokens: not measured apart; a share of the session of tickets 80 to 84.
