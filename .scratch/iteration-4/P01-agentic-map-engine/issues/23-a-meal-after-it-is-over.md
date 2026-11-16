# 23: "배고파" after the meal is over offers the next meal

Parent: [P01 spec](../spec.md) ("The Assistant", "The wording"); the Release's smoke test of 2026-11-16, row 1
Status: ready-for-agent
Blocked by: None

## What to build

The smoke test asked "배고파" on Monday at 21:20, the asker alone at 301동, on the released servers. The model planned dinner with `now`. The answer had `noPlan.reason=no-shared-time` and `relax: []`, and the reply said "지금은 저녁을 먹을 수 있는 시간이 없어서 식사 계획을 잡지 못했어요. 앱에 뜬 버튼으로 시간을 조정해 보시거나…". So the sentence promised buttons the answer did not carry, and the app's most common question ended with nothing to do.

- The model hears of buttons only when the answer carries some.
- A meal asked for after it is over today offers the next meal instead of an answer with nothing to change.

## Acceptance criteria

- [x] `planMeal` tells the model "the app offers buttons to ease it" only when `noPlan.relax` holds a button. With `relax: []` the model gets the plain reason for no plan.
- [x] When no plan fits, nothing eases it, and the meal asked for is over today (now at or past the end of its window, `MEAL_WINDOWS`), the reply draws no answer. Instead it carries one ask button, the next meal:
  - lunch over and dinner not: "오늘 저녁 보기";
  - otherwise "내일 점심 보기".

  Its words ask for that meal with the same Friends ("민수와 오늘 저녁 어디서 먹을까?", "내일 점심 어디서 먹을까?"), and the model is told to name that button and no other.
- [x] Tests: at `POST /assistant/messages` with the scripted model:
  - "배고파" at 21:20 gives no answer and the "내일 점심 보기" button;
  - "지금" at 12:00 with Classes through both meals keeps the answer and mentions no button;
  - lunch named at 15:00 with 민수 offers "오늘 저녁 보기".

  The first two fail on `4.0/Main`.

## Comments

### Decided in the build (2026-11-16)

- **A button, not a plan for tomorrow.** Ticket 21 decided that "배고파" asks about now and keeps today's meal, rather than planning a day the User did not ask about. So the server does not plan tomorrow by itself. It offers it in one press, and the press asks the model in words, which plans as for any meal.
- **Words and a button, not the no-plan answer.** The released app cannot show a reply's ask button beside an answer: the adapter drops them, and the frame draws offers only with words (P01-14). Its check also refuses a `relax` kind it does not know, so a new relax button would need a new app. Once the meal is over, the no-plan answer has nothing the User could change, so the reply is the model's one sentence with the button, which the installed app already draws.
- **When a meal is over** is judged by `MEAL_WINDOWS` (lunch to 14:30, dinner to 19:30), not by each Restaurant's hours. Between the last Restaurant's closing and 19:30 the answer stays as it was, without the button.
- **Friends** are named in the button's words as the chips name them, so that the next meal is asked with them.
- **Other no-plan reasons.** No other sentence that reaches the model mentions buttons: the refusals' words do, and they always carry their offers.

### Agent usage (2026-11-16)

- Agent time: about 10 minutes, an estimate from this session's transcript, from the request to the pull request. No subagent.
- Tokens:
  - Input: 46 uncached, plus 13,223,383 cache reads and 561,354 cache writes.
  - Output: 24,529.
