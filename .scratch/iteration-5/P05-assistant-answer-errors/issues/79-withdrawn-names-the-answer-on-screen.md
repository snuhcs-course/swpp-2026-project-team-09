# 79: A request that ends with none names the answers on screen it takes off, for an app that says `answers`

Parent: [P05 spec](../spec.md). Follows ticket 55, which takes the plan on screen off the map, and ticket 73, which never sends `clears` to an app that says `answers`.
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: the main server. It must be released before the app says `answers` (P03 ticket 22).

## The fault

Once the app says `answers`, the main server never tells it that a plan on screen leaves the map:

- "내일 점심", then "다다음주 월요일 점심". The day is out of reach, so the request ends with none. An app before `answers` is told `clears` and takes tomorrow's plan off. An app that says `answers` is told nothing: no `clears`, and no `withdrawn`. Tomorrow's plan, its time card and 일정에 넣기 stay under the refusal's words, the fault the user saw on 2026-11-26.
- Only one of the four ways a request ends with none named a key in `withdrawn` (`withdrawAnswer`: a meal over for today, a meal the User was only invited to). Even then it named the failed request's own key, not the answer on screen. A day out of reach (`outOfReachDay`, for a meal, a menu, events, a meet and a new 파티), breakfast, and a refusal plainly not about the plan set `clears` alone.

## The rule

The orchestrating session proposed it on 2026-11-28 and is putting it to the user. It lives in one function, `takenOff` (`taken-off.ts`), so another choice changes only that function.

A request that ends with none takes off the answer on screen of the same request on another day or with other conditions: the same kind, and for a meal the same meal, for a study the same alone or together. The answers of other requests stay. A refusal plainly not about the plans on screen takes them all off, as `clears` does.

| On screen | Ends with none | Taken off |
|---|---|---|
| tomorrow's lunch | lunch on a day out of reach (A) | tomorrow's lunch |
| tomorrow's lunch | dinner (B) | nothing |
| tomorrow's lunch | lunch of the same day | tomorrow's lunch |
| tomorrow's lunch | a study | nothing |
| tomorrow's lunch | events | nothing |
| tomorrow's lunch | breakfast | nothing. An app before `answers` still takes it off. |
| a study alone | a study together | nothing |
| lunch and dinner as steps | dinner on a day out of reach | dinner's step; lunch stays |
| lunch and dinner as steps | a refusal plainly not about them | both |

## What changes

- `takenOff(failed, onScreen)` decides it. `answersOnScreen(context)` gives the answers on screen by their keys: the steps an app that says `answers` sends back (`onScreen`), or else the one open (`context.conditions`), under the key the server gave it.
- `endsWithNone(presented, context, failed)` is the one way a tool ends a request with none. It sets `clears`, which only an app before `answers` reads, and adds the keys `takenOff` gives to `withdrawn`. `withdrawAnswer` and `outOfReachDay` call it; so do breakfast in `planMeal` and a clearing refusal. Both functions move to `taken-off.ts`.
- `reply-body.ts` is unchanged: `withdrawn` goes to an app that says `answers`, and `clears` to any other.

## What changes for the installed apps

Nothing: they do not say `answers`, so they still get `clears` and never `withdrawn`.

## Acceptance criteria

- [x] Each row of the table, in `takenOff`. (Unit tests, `taken-off`.)
- [x] Through the tools and the reply's body, for an app that says `answers`: A names tomorrow's lunch in `withdrawn` and sends no `clears`; B names none of it; a refusal plainly not about lunch and dinner as steps names both. Before the change, A and the refusal named nothing; both tests failed. (Unit tests, `taken-off`.)
- [x] An app before `answers` gets `clears` as before, and no `withdrawn`. (Unit tests, `failed-plan-clears`, `taken-off`.)

## Comments
