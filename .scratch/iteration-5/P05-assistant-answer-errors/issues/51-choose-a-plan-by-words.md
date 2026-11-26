# 51: A plan of the meal answer on screen is chosen in words, keeping the answer and its numbers

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26): "2번으로 할게" after a dinner answer of six places brought a new answer with only 예술계식당, numbered 1, and a reply that described the place
Status: ready-for-human
Blocked by: P05 tickets 48–50 (pull request 592), whose branch this one is cut from

Native files: none. Releases: the main server and the app's JavaScript, in either order. The app sends `planIds` only over a meal answer that says `choosable`, which only a main server with this ticket sends. An older main server, whose strict schema would answer 400, never gets them. An older app sends no `planIds` and ignores `select`.

## What happened

- Nothing could choose a plan of the answer on screen. A place named in words was a change of place (`PLAN_RULES`: planMeal with placeId or restaurant), which plans again at that one Restaurant.
- The server never knew the numbers on screen: the request sent only the conditions and the plan shown.

## What changes

- **The request** sends `planIds`, the meal answer's plans in its order, which the list and the map number from 1. It sends them only over a meal answer that says `choosable: true`, which every meal answer of a main server with this ticket does (review of pull request 596: an older main server's strict schema answers 400 to them). The model reads them as `numbered` in the line [Plan on screen: …].
- **The tool `choosePlan`** takes `{ number }` or `{ restaurant }`, checked against `planIds`:
  - a number in the list, or a name that names one plan (exact, or part of a name: "아워홈" for 아워홈(901동)): `chosen`;
  - a number past the list: `none` with how many are listed. The model asks in one short sentence which number. **A short question was chosen here**, since replanning at a guessed place is the fault itself.
  - a name that names several: `several`. The model asks which.
  - a name not in the list: `notListed`. The model falls back to today's change of place, planning at that Restaurant.
  - no list (an app before this ticket, or no meal answer on screen): `none`, and the model plans with planMeal as today.
- **The reply** carries `select: { planId }`. Beside no answer of its own, the answer on screen stays. Beside a new answer that holds the plan, the app opens that answer at it. A dish picked from the menus runs planMeal and then choosePlan, and so does "2번으로 하고 지은이도 불러 줘"; a name is then chosen among the new answer's plans (review of pull request 596). Its one sentence says the plan is chosen ("2번 예술계식당으로 골랐어요."). When the model writes none, the server writes "예술계식당으로 골랐어요.".
- **The app** keeps the answer on screen, as for any reply of words alone (P04 ticket 46), and shows the plan chosen, once for that reply (`useSpokenChoice`). The list, its numbers and the map stay.
- An installed app without this ticket sends no `planIds`, so the model plans as today. A newer server's `select` reaching an older app is ignored: the sentence alone shows, over the answer kept.
- `PLAN_RULES`: a place or a dish the User picks among the numbered plans is chosen, not planned again.
- **The eval harness:** a live case with `screen: true` sends the last answer on screen in its next turn, as the app does.

## Acceptance criteria

- [x] choosePlan by number, by name (exact, part, held), several, past the list, not listed, and without a list. (Unit tests.)
- [x] A reply of choosePlan draws no answer and carries the plan; its sentence when the model wrote none; the wire's `select` only beside no answer of the reply's own. (Unit tests.)
- [x] The line [Plan on screen: …] gives `numbered`. (Unit test.)
- [x] The app sends `planIds` in order, and after a reply with `select` the plan chosen is the one on screen with the answer kept. (Integration test against the fake main server.)
- [x] Eval cases `meal-choose-by-number` and `meal-choose-by-name` (live, `screen: true`). Not run: no model key on this machine.
- [x] README: `planIds`, `choosePlan`, `select`, and the order to deploy.
- [x] After a planMeal of the same message: by name among its plans, by the number on screen when they hold it, not listed otherwise; the reply carries the new answer and `select`, which the app opens at. (Unit and integration tests.)
- [x] A main server's schema before `planIds` refuses them (unit test). Over an answer without `choosable`, the app sends none and a follow-up to such a server is answered (integration test against a fake server that refuses them as the old schema does).
- [x] Whole lint, format and types of the main server and the app.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 30 minutes of one session, from the go-ahead to the pull request. That includes about 10 minutes of follow-up work on ticket 48, which went into pull request 592. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens, the same stretch: input about 44.9 million, of which 44.7 million were cache reads, 149,000 cache writes and 232 uncached; output about 84,000. No subagents. Measured from the session's transcript.
