# 60: An hours or menu answer names its day, and a missing meal is "none", not "not posted yet"

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: a main-server Release. No app change.

## What happens now

From the phone on 2026-11-24, after Release `snunow/main-server/26.11.24-1` (P04 ticket 59):

- After "내일 점심 뭐 먹을까?", "302동 몇시까지해?" was answered for tomorrow ("내일 302동식당 점심은 11:30부터 13:30까지 해요."), which fits the conversation, but the map's label said only "점심 11:30–13:30". Which day it was about could not be seen on the map.
- At about 17:50, "오늘 301동 메뉴 뭐야?" was answered "오늘 301동식당 저녁 메뉴는 아직 올라오지 않았어요. 메뉴는 6일 전까지 미리 올라오니, …", labelled "오늘 저녁 메뉴 아직 안 올라옴". Today's menus were collected; the dinner does not exist.

## Cause

- The day is the model's `date` argument to `restaurantHours` or `findMenu`. The rules said "today when they name none"; the model kept tomorrow from the earlier turn on its own (the request's context carries the meal Plan's `date` in `[Plan on screen: …]`, and the earlier reply's words named it). Nothing in the server fills the day in.
- The hours label (`stateOf`, `mealStateOf` in `hours-lookup.ts`) gave another day's spans with no day. The menu label gave the dishes with no day.
- `MenuLookupService.find` answered `no-menu` both when the Restaurant's day was not collected and when it was collected without the asked meal. `findMenu`'s reason for `no-menu` always said "menus are posted up to six days ahead … and that it comes later", which the model turned into "메뉴는 6일 전까지 미리 올라오니".

## What to build

- The rules of `restaurantHours` and `findMenu`: with no day named, the day the conversation is about (the plan on the screen's, or the question before's), else today; the words name the day when it is not today.
- The labels name the day whenever it is not today, in the words of the meal Plan's time bar (`dayWordsFrom`: "내일(수)", "11/30(월)"): "내일(수) 점심 11:30–13:30", "내일(수) 점심 · 제육볶음 · …". A menu with no Plan names the day always, today as "오늘".
- A new reason `no-meal`: the Restaurant's menus of that day were collected (another meal of that day has lines) but not the asked meal. The label says "<day> <meal> 메뉴 없음", and the model is told there is no such menu that day, never that it comes later. `no-menu` stays for a day not collected; for today its reason no longer speaks of six days ahead.

"Collected" is decided as `hoursWords` already decides `posted`: the Restaurant's row of that day holds lines for some meal. Hours are not used, since a missing row of kept hours does not say a meal is not served.

## Acceptance criteria

- [x] Hours labels on another day name it; today's do not. (Unit tests.)
- [x] Menu labels and the first line name another day. (Unit tests.)
- [x] A dinner missing from a day collected with its lunch is `no-meal`, labelled "오늘 저녁 메뉴 없음"; a menu not posted today is told without "six days ahead". (Integration tests.)
- [x] An eval case keeps tomorrow for an hours follow-up and checks the words name it; written, not run.
- [x] Lint, format, and types of the main server pass.

## Comments

### Agent usage (2026-11-24)

- Agent time: about 40 minutes in the p04-58 session (an estimate from the transcript). No subagents.
- Tokens: an estimate: output about 30k; input about 7M, almost all cache reads, with about 100k cache writes.
