# 80: A time of today that has passed is asked back, never moved to tomorrow

Parent: [P05 spec](../spec.md). Found on 2026-11-28 on the phone: at 11:13 "아침 7시에 도서관 갔다가 점심" was answered at once for 내일(일). The user's decision: ask before answering.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server only. The app needs no change: it already draws `ask` offers as buttons under a reply that asks back.

## What was wrong

The model reads the User's words, and every tool takes the day and the time already resolved (ticket 75). No rule said what to do with a time of today that has passed. The model moved it to tomorrow by its own habit, and planned and drew the whole message there.

A meal had a check of its own on the server (P01 ticket 23): a meal asked for after it is over today left the map and offered one button, "오늘 저녁 보기" or "내일 점심 보기". It was meal-only, and its buttons differed from any other ask.

## What changes

- **One rule for every answer kind.**
  - The chat's per-request system lines, where "Now in Korea" and the Bare hours line are, get a "Past times" line (`pastTimeRule`).
  - It gives the time now and which parts of the day are over (새벽 06:00, 아침 11:00, 오전 12:00, 점심 14:30, 저녁 22:00). It tells the model to call `askPastTime` before any other tool when the User asks to plan or book something for today at a time that has passed: a meal, studying, a seat or a room, events, a meet, a 파티, or several of these.
  - A bare hour keeps the Bare hours line and is never past. A request with no time is for now, and a question of facts (today's lunch menu, a way by a time) keeps its own rules.
  - A meal named by 점심 or 저녁 alone ("점심 먹자") goes to planMeal, which asks by itself once that meal is over, with buttons of its own.
- **`askPastTime`** (`past-time.ts`), one tool for every kind.
  - The server checks the time against now: a clock time once its minute is over, a part of the day from its end on. A time still to come answers `not-past`, and the message is planned as asked.
  - A time that has passed puts the question under the reply: "오늘 아침 7시는 지났어요. 내일로 볼까요?". It has two `ask` offers, the shape every app already draws: 내일로 sends "내일 아침 7시로 해 줘", and 오늘 지금부터 sends "오늘 지금부터 해 줘".
- **One mechanism, one sentence shape, by case.**
  - Every question reads "오늘 {the time named}{은/는} 지났어요. {what the buttons offer} 볼까요?" (`questionOf`).
  - Each case builds its own `PastAsk`: the time named, the rest of the question, and at most two `ask` offers, the next day's and today's. Today's is left out when nothing is left of today.
  - The cases:

    | The User asks, at | Question | Buttons: label → words sent |
    |---|---|---|
    | "아침 7시에 도서관 갔다가 점심", 11:13 (a clock time) | 오늘 아침 7시는 지났어요. 내일로 볼까요? | 내일로 → 내일 아침 7시로 해 줘; 오늘 지금부터 → 오늘 지금부터 해 줘 |
    | "아침에 공부할래", 11:13 (a part of the day) | 오늘 아침은 지났어요. 내일로 볼까요? | 내일로 → 내일 아침으로 해 줘; 오늘 지금부터 → 오늘 지금부터 해 줘 |
    | "민수랑 점심", 15:00 (a meal, dinner still to come) | 오늘 점심 시간은 지났어요. 오늘 저녁이나 내일 점심으로 볼까요? | 오늘 저녁으로 → 민수와 오늘 저녁으로 해 줘; 내일 점심으로 → 민수와 내일 점심으로 해 줘 |
    | "저녁 먹자", 20:00 (a meal, nothing left today) | 오늘 저녁 시간은 지났어요. 내일 저녁으로 볼까요? | 내일 저녁으로 → 내일 저녁으로 해 줘 |
    | "배고파", 21:20 (no meal named: a request for now) | the model's sentence, given as 오늘 식사 시간은 지났어요. 내일 점심으로 볼까요? | 내일 점심으로 → 내일 점심으로 해 줘, beside the reply; the rest of the message is answered |
    | "7시에 공부할거야", "저녁 7시에 공부할거야", 11:13 | no question: 19:00 today | none |
    | "내일 아침 7시에", or no time | no question | none |
- **One question per message, and nothing drawn before the choice.**
  - Once a run asked, its reply is the question and its buttons alone (`askedReply`, called first in `replyOf`, which moved to `run-reply.ts` to keep `adapter.ts` under its line limit).
  - Answers, the answers list, steps, a Lookup, cards, a Proposal and map buttons are dropped, and the feature's steps never run. A second ask in the same message keeps the first question.
  - The answers a request of the message took off the screen stay off, as a meal over for today takes its own (tickets 55 and 79), and so do the Classes left out.
  - The server writes the question itself, so an app that reads only the text still gets a usable sentence.
- **The meal's own check is the same mechanism.** planMeal's meal over for today (`mealOverToday`, `meal-after-hours.ts`) still takes that request's plan off the screen. It builds its question with `mealAsk`: the next meal today, and the same meal tomorrow. 오늘 지금부터 makes no sense for a meal that is over, so a meal never offers it. It keeps what the old button offered, "오늘 저녁 보기" or "내일 점심 보기".
  - **A meal the User named** asks for the whole message through `askPast`, as the table's third and fourth rows.
  - **A meal named by no time**, such as "배고파" at 21:20, is a request for now. Its button stands beside the reply, and the model is given the sentence. It takes no other request of the message off: "공부하고 밥" at 20:00 still draws the study.

## The class

- **Prompt rules:** every rule and tool description under `main-server/src/assistant` was searched for a past time (`passed`, `지났`, `tomorrow`, `next day`, `before now`, `later than now`). None moves a time to the next day. `findWay` says that a deadline that has passed is said so; a way is a question of facts and keeps it.
- **Server code:** every `addDays(` was read. None moves a request's day forward, other than the old meal-over offer, now the ask.
- **Tests and evals:** every eval case was read at its world's clock or its own `now` (474 cases, in `eval/cases`, `eval/p4/cases`, `eval/p5/cases`, `eval/p5/large-world-v1/cases` and `eval/p6/cases`). None names, for today, a time that has passed. The two integration tests of the old meal offer now expect the new buttons: the ask with 오늘 저녁으로 and 내일 점심으로 for lunch named at 15:00, and 내일 점심으로 beside the reply for "배고파" at 21:20. The app's `answer-words-rest` test uses a question back of its own words and is unchanged.

## Tests

- `main-server/test/assistant-past-time.unit.test.ts` (new, 25 tests):
  - when a clock time or a part of the day has passed;
  - the question's words and particles, and each button's words;
  - one question per message, and 내일로 alone when nothing is left of today;
  - the meal's questions: lunch with dinner still to come, dinner over, and no meal named;
  - the tool's three answers;
  - the Past times line;
  - the answers taken off the screen kept beside the question.
- `main-server/test/assistant-asked-reply.unit.test.ts` (new, 5 tests, through `runFeature` with the scripted model):
  - a run that drew and then asked replies with the question alone and never runs the steps;
  - a run whose time is still to come answers as before;
  - planMeal asks for the whole message for a meal named, offers 내일 점심으로 for a meal named by no time, and then leaves another request's answer drawn.
- `main-server/test/assistant-past-time.integration.test.ts` (new, 5 tests, the real chat feature at the endpoint):
  - at 11:13, "아침 7시에 도서관 갔다가 점심" with a planMeal after the ask draws nothing and gets the question and both buttons;
  - the model reads the Past times line;
  - two times that passed ask once;
  - an app before `answers` gets the same;
  - 저녁 7시 is planned as asked.
- `assistant-meal-by-clock` and `assistant-meal-after-hours` (integration) now expect the meal's buttons; `assistant-cached-prefix` (unit) the Past times line among the per-request lines.
- Before the change: 7 of these 10 integration tests failed, and the unit files did not load (no `past-time` module).
- `main-server/eval/cases/past-times.yaml` (new, 8 cases, not run):
  - the library and lunch at 11:13 (askPastTime), and lunch at 15:00 (planMeal, which asks);
  - a bare 7시, 저녁 7시, another day named, and no time, none of which asks;
  - the two answers to the question.

## Acceptance criteria

- [x] The tests above pass, as do `failed-plan-clears`, `taken-off`, `choose-plan` and the other unit tests that run the adapter, and `assistant-plan-steps`, `assistant-steps-chain`, `eval-cases` and `eval-case-fields` (integration), each run once.
- [x] main-server's lint, types and format pass.
- [ ] On the phone after the Release, "아침 7시에 도서관 갔다가 점심" late in the morning asks "오늘 아침 7시는 지났어요. 내일로 볼까요?" with 내일로 and 오늘 지금부터, and each button plans the message as it says.

## Comments

Built in one PR from the orchestrating session's ticket of 2026-11-28, after a short report of what existed: the meal's own past-meal button, and the `ask` offers every app draws.

### Agent usage (2026-11-28)

- Agent time: about 30 minutes (an estimate), in one session, from 13:40 KST to the PR's opening.
- Tokens, to the PR's opening: about 250 input and 105,000 output; cache reads about 28.5M, cache writes about 270,000. No subagents.

After the PR opened, the orchestrating session asked to keep what the user remembers of a meal over today: its buttons are the next meal today and the same meal tomorrow, never 오늘 지금부터. Each case now words its own buttons in one sentence shape. The meal tests changed for it failed on the PR's earlier head, 8 of 30, before the change.

### Agent usage (2026-11-28, the meal's buttons)

- Agent time: about 10 minutes (an estimate), in the same session, from 14:13 KST.
- Tokens: about 30 input and 25,000 output; cache reads about 5M, cache writes about 40,000. No subagents.
