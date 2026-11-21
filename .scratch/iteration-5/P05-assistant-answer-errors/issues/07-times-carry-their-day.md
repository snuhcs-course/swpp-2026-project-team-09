# 07: A time that is not today carries its day

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [05](05-event-line-gives-its-own-time.md) and [06](06-free-stretch-not-a-meal.md), which change the same lines (both merged first).

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- The server writes a plan's or a 파티's time with `clockOf` alone. Day words exist three times over, in the library, meal-menu and new-quest answers, and nowhere else. "18:00 체육관 파티에 지호가 있어요" was a 파티 the next day; the five "만나고 싶다" candidates carried no day; the tools' results give the model bare times too.
- The app's quest list (`features/quests/adapter.ts`) shows "14:00 · 학생회관" for a 파티 tomorrow, although its row knows how many days away it is; the how-about notes do the same.
- The app's 파티 finding says "내일은 18:00까지 수업이 없어서 비어 있어요" for a Sunday.

## What to build

- One server helper, `clockWithDay`, writes a time with its day when its date is not today: "내일 18:00", "모레 12:21", "11월 24일 (화) 09:00". The recruiting line ("내일 18:00 문화관 파티에"), the meet line, the event lines of an event not under way, and the flags of events and 파티 use it. The tool result of a recruiting plan gives the model its date, and the rules say to name the day first when it is not today.
- The main screen's quest list, which has no day headers, shows the day of a Quest that is not today ("내일 14:00 · 학생회관"), with the app's `koreaDay`.
- The 파티 finding says a day without any Class has none ("일요일은 수업이 없는 날이에요"), not that it is free "until" the 파티's time.

Left as they are: the library's and the meal menu's own day words, which already name the day, and the how-about notes, which speak of a place on the plan's own day.

## Acceptance criteria

- [x] A 파티 tomorrow at 18:00 is written "내일 18:00" in the recruiting answer and on its flag. (Unit test, fails before the fix.)
- [x] A meet asked the day before carries "내일". (Unit test, fails before the fix.)
- [x] A time today is written as before. (The existing unit and integration tests, unchanged.)
- [x] The quest list shows the day of a Quest that is not today. (Unit test, fails before the fix.)
- [x] The 파티 finding for a Sunday does not say "까지". (Unit test, fails before the fix.)
- [x] Lint, format and types of the app and the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 6 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 21k; input 18.8M, of which 18.7M cache reads, 36k cache writes and 74 uncached. No subagents.
