# 07: A time that is not today carries its day

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [05](05-event-line-gives-its-own-time.md) and [06](06-free-stretch-not-a-meal.md), which change the same lines.

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- The server writes a plan's or a 파티's time with `clockOf` alone. Day words exist three times over, in the library, meal-menu and new-quest answers, and nowhere else. "18:00 체육관 파티에 지호가 있어요" was a 파티 the next day; the five "만나고 싶다" candidates carried no day; the tools' results give the model bare times too.
- The app's quest list (`features/quests/adapter.ts`) shows "14:00 · 학생회관" for a 파티 tomorrow, although its row knows how many days away it is; the how-about notes do the same.
- The app's 파티 finding says "내일은 18:00까지 수업이 없어서 비어 있어요" for a Sunday.

## What to build

- One server helper writes a time with its day when its date is not today: "내일 18:00", "11월 24일 (월) 12:21". The library, meal-menu and new-quest day words use it. The recruiting, meet and event lines, their map flags and the tools' results use it.
- The quest list and the how-about notes use `koreaDay` for a day that is not today.
- The 파티 finding says a day without Classes is free all day ("일요일이라 수업이 없어요"), not free "until 18:00".

## Acceptance criteria

- [ ] A 파티 tomorrow at 18:00 is written "내일 18:00" in the recruiting answer and its flag. (Unit test, fails before the fix.)
- [ ] A meet candidate on Monday carries its day. (Unit test, fails before the fix.)
- [ ] A time today is written as before. (Unit test.)
- [ ] The quest list shows the day of a 파티 that is not today. (Unit test, fails before the fix.)
- [ ] The 파티 finding for a Sunday does not say "18:00까지". (Unit test, fails before the fix.)
- [ ] Lint, format and types of the app and the main server pass.

## Comments
