# 59: A question about a Place always brings that Place to the map

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: a main-server Release. No app change.

## What happens now

Found on the phone on 2026-11-24, on Production data:

- A. After "내일 점심 뭐 먹을까?" (a meal Plan for tomorrow), "302동 몇시까지해?" was answered with 302동식당's hours in words, but the map, the time bar, the candidates, and "일정에 넣기" stayed tomorrow's meal Plan. No 302동식당 mark was drawn.
- B. After "302동 가는 길" (a route with "길 안내"), "오늘 301동 메뉴 뭐야?" was answered that tonight's menu is not posted yet, but the route and "길 안내" stayed.

## Cause

- A: with a meal Plan's conditions in the request's context, `restaurantHours` (`lookup/hours-tools.ts`) planned that meal again into the reply's `answer` instead of sending the hours Lookup (P05 ticket 36's "the plan on the screen stays").
- B: `findMenu` answering `none` (menu not posted, not served, or no time to eat there) set nothing to draw, so the reply was words alone, and the app kept the earlier scene under it (P04 ticket 46).

The app cannot tell which Place a reply of words is about; the server knows which tool ran for which Restaurant.

## What to build

- `restaurantHours` always sends the hours Lookup, also with a meal Plan on the screen, which it no longer plans again. This replaces P05 ticket 36's rule for this case.
- `findMenu` answering `none` still sends a `fact` place Lookup of the Restaurant (`menuNoneLookup`), its label saying why: "<day> <meal> 메뉴 아직 안 올라옴", "<day> <meal>은 안 해요", or its dishes when the User has no time to eat there (the dishes with prices as its basis).
- `HOURS_RULES`, `MENU_RULES`, and `EARLIER_REPLIES` say so; the hours-after-a-plan eval case forbids `planMeal`.
- Unchanged: ticket 46's kept scene under a true words-only follow-up ("거기 사람 많아?", "당일만 예약돼요"). With P04 ticket 58 (PR 536) the fact Lookup leaves the map under the next reply.

## Acceptance criteria

- [x] The hours tool draws the Restaurant with or without a meal plan on screen and never plans the meal again. (Unit test.)
- [x] A menu answered none draws the Restaurant for each reason. (Unit tests, integration tests.)
- [x] The app draws such a reply in place of a meal Plan and of a route, with no time bar or main button, on 5.0/Main and with PR 536 (checked with a temporary app test, not committed).
- [x] Lint, format, and types of the main server pass.

## Comments

### Agent usage (2026-11-24)

- Agent time: about 45 minutes in the p04-58 session, investigation included (an estimate from the transcript). No subagents.
- Tokens: an estimate: output about 30k; input about 6M, almost all cache reads, with about 120k cache writes.
