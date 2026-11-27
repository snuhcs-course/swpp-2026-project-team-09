# 11a: Two time slots may share a day

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None. A change to [11](11-class-time-slots.md) (PR #594, merged).

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-27: "다른 시간대 추가에서 '같은 요일 다른 시간'을 왜 막아둔 건지 모르겠네". They want, for example, 수 15:30–16:45 and 수 19:00–20:45 in one class. The form before: `references/11-4-after-two-slots.jpg` (ticket 11's picture: 수 greyed in the first slot, 월 in the second). After: `references/11a-1-after-same-day-form.jpg` (two slots on 수) and `references/11a-2-after-same-day-list.jpg` (the class saved), from the emulator on mock data.

Positions are as of `origin/5.0/Main` ebb9ac55.

- In 수업 추가 and 수업 수정, a day one time slot holds is greyed out and cannot be pressed in the others (`DayToggles`'s `taken`, filled by `takenDays` in `features/timetable/class-form.ts`). Ticket 11 took this from the design canvas (board `Timetable`, its form: `taken` and `dis`). Nothing else needs it.
- The main server takes two times of one class on one day when their hours do not cross (`main-server/src/timetable/dto/save-class.dto.ts`), and refuses them when they do.
- The form already keeps 저장 off for two slots whose hours cross on a shared day, with "같은 요일의 다른 시간대와 시간이 겹쳐요" under each (`slotCrossesAnother`). A class with two times on one day already opens as two slots (`draftOf`).

## What to build

- Every day button can be pressed in every slot, whichever days the other slots hold. The grey look of a held day goes.
- Two slots on one day whose hours cross keep 저장 off with the warning, as now. Two on one day whose hours do not cross save as two times of that day.

## Must not break

- One slot; several slots on different days; the `same` box; removing a slot; the crossing warning with the other classes.
- Tests: app `timetable-class-slots` (`.integration`), `timetable-class-form` (`.unit`).

## Acceptance criteria

- [x] A second slot can take a day the first holds, and 수 15:30–16:45 with 수 19:00–20:45 saves as one class, listed as "수 15:30–16:45, 수 19:00–20:45". (App integration test, which fails before the change: 수 cannot be pressed in the second slot.)
- [x] Two slots on one day whose hours do not cross are ready; ones that cross are not. (App unit test.)
- [ ] Checked on the user's phone after the app OTA update.
- [x] No native file changes; lint (type-aware) and format pass on the changed files. jest and tsc run in CI.

## Comments
