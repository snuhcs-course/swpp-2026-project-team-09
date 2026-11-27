# 55: A plan asked that cannot be made takes the plan on screen off the map

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26, Release 26.11.26-3): with "내일 점심" on screen, "다다음주 월요일 점심" was refused in words, while tomorrow's plan stayed under them: its map, the time card "내일(금) 점심 11:30–12:30", and 일정에 넣기
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server and the app's JavaScript, in either order. The reply gains `clears`, which an older app ignores, keeping today's behaviour.

## What happened

- A reply that draws nothing of its own keeps the scene before it (P04 ticket 46, `sceneBubblesOf`). This is right for words about the plan on screen ("왜 302동은 없어?"). It is wrong when the User asked for another plan and none could be made.
- `planMeal` returned `noDay` for a day out of reach and drew nothing. The after-hours case set `presented.answer = null`, which made no difference on the phone, since the reply drew nothing in its place either.

## What changes

- A reply carries `clears: true` when the User asked for another plan, or something else, and nothing could be drawn for it. The app then takes the answer on screen off the map, with its time card and button (`drawsItsOwn` in `scene-bubbles.ts`). Its words stand alone, as in a new conversation.
- **How the two are told apart: by the tool path, on the server.**
  - A plan tool that ends without a plan sets it:
    - `planMeal` for a day past or more than a week ahead, for breakfast (now `meal: breakfast`, answered none), for a meal over for today, or for a meal the User is only invited to;
    - `planMeet`, `planEvents`, `planNewQuest` and `findMenu` for a day out of reach.
  - `refuse` sets it for a request plainly not about the plan on screen: off-campus, general-work, who-looked, past-location, others-sharing, not-watched-friend, not-watched-shuttle.
  - Nothing sets it for a reply of words alone, for `whyMissing` ("왜 302동은 없어?"), for an invitation answered for a Friend, or for a Friend not found, which may be about the plan's own people. Nor for `vague` and `not-understood`: a typo or half a sentence over a plan must not wipe it off the map (review of the pull request). Those keep the plan on screen as before.
- A reply that draws something of its own leaves `clears` out, since it takes the screen anyway.
- The rules: `planMeal` is called for any day the User names, past or far, and for breakfast, never answered in words alone over the plan on screen.

## Acceptance criteria

- [x] `planMeal` clears for a day past, a day more than a week ahead, breakfast, and a meal over for today, and not for a day in reach. `refuse` clears for requests not about the plan, and keeps it for `vague` and `not-understood`. `replyBody` sends `clears` only when nothing else is drawn. (Unit tests, failing before.)
- [x] The app takes the answer off the screen on a reply with `clears`: no 일정에 넣기, and the next request carries no conditions. A reply of words alone without it keeps the answer. (Integration test against the fake main server.)
- [x] Eval cases `meal-out-of-reach-over-a-plan` (live, `screen: true`) and `meal-breakfast-planned-none`. Not run: no model key on this machine.
- [x] README; whole lint, format and types of the main server and the app.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 25 minutes of one session, including the PR 602 re-review follow-up and reading for ticket 56. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens: input about 32.5 million, of which 32.4 million were cache reads, 66,000 cache writes and 104 uncached; output about 39,000. No subagents. Measured from the session's transcript before the pull request.
