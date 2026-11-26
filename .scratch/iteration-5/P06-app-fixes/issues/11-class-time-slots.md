# 11: The class form takes a time slot per set of hours

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26: a class whose days have different hours, such as 월 10:00–11:15 and 수 14:00–15:15, cannot be entered as one class. The User makes a second class of the same name. The user changed 수업 추가 on the design canvas (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>, board `Timetable`, its form, shown by `TimetableClassForm`) and asked for that change alone.

Positions are as of `origin/5.0/Main` 8020e2dc.

- The main server's class has one or more times, each with its own weekday, hours, Place and room (`ClassSave`). A class read from a screenshot can already have different hours on different days (`features/timetable-ocr/classes.ts`).
- The form holds one set of days with one start, end, Place and room (`ClassDraft`, `features/timetable/class-form.ts`), saved as one time per chosen day (`saveOf`).
- `draftOf` opens a class with its first time's hours, Place and room for every day, so saving such a class again moves every day to the first time's hours.

## What to build

The canvas's form, `수업 추가` and `수업 수정`:

- 과목명, then one card per **time slot**. A slot has its days (`월` … `일`), its start and end, and its 장소 and 강의실 (선택).
- **다른 시간대 추가** under the cards: a dashed button that adds an empty slot, up to seven. While there is one slot, the hint "요일마다 시간이나 강의실이 다르면 시간대를 추가하세요" stands under it.
- **With several slots,** each card's header names it by its days and hours ("월·수 10:30–12:00"), or "두 번째 수업" before a day is chosen, with `삭제`. A day another slot holds is greyed out and cannot be pressed in this one.
- **A slot after the first** has the checkbox "<the first slot's days> 수업과 같은 장소·강의실" ("월요일 수업과 같은 장소·강의실"). Checked, its 장소 and 강의실 hide and it takes the first slot's, shown under the box; "첫 수업의 장소를 먼저 골라 주세요" when the first has no Place.
- **Saving** saves every slot's days at its own hours, Place and room. **Opening a class** gives a slot for each set of hours, Place and room, in the week's order. A later slot with the first's Place and room opens checked.
- **Crossings:** the warning lists the other classes any slot crosses, as it does now. 저장 waits for the name and, in every slot, a day and both hours that are right.
- **One slot looks as now:** a single slot has no header, its controls keep their names (`장소 선택`, `강의실 선택`), and the Place stays optional, as now. With several slots, each slot's controls are named with the slot's name first.

## Must not break

- Adding, changing and deleting a class with one set of hours; the crossing warning and its toast; a refused save's toasts; the Place picker.
- The timetable list, as it shows a class's times now ("월 13:00–14:30, 수 15:00–16:15") and its first time's Place.
- Tests: app `timetable`, `timetable-versions`, `timetable-versions-refused`, `timetable-versions-sync` (`.integration`).

## Decided while building (2026-11-26)

- The Place stays optional in every slot. The canvas's 저장 waits for a Place, but a class read from a screenshot often has none, and such a class must stay savable.
- The list's 장소 line is left as it is (the first time's Place). The canvas's list shows one per slot, but the user asked for the form only.
- The slot's card, its 같은 장소 box and 다른 시간대 추가 are in `screens/timetable/slot-card.tsx`. `DayToggles` takes the days other slots hold, and `PlaceButton` a name.
- Removing the first slot gives the next one, when its box was checked, the removed slot's Place and room as its own (`withoutSlot`), since it becomes the first (PR #594's review).
- With several slots, the room field's visible label stays "강의실 선택"; a screen reader hears it with the slot's name first. `TextField` takes an `accessibilityLabel` for that, the label by default.
- 삭제 takes the muted ink (PR #594's review).
- Two slots that share a day and whose hours cross there keep 저장 off, with "같은 요일의 다른 시간대와 시간이 겹쳐요" under the later one: the main server refuses such a class. Only a class read from a screenshot, with two times on one day, opens so (PR #594's review).
- Screens on the emulator with the mock build: `references/11-1-before-one-slot.jpg` to `references/11-7-after-large-font.jpg`.

## Acceptance criteria

- [x] A class with two slots saves each slot's days at its own hours, the second at the first's Place when checked, and the list shows both hours. (App integration test.)
- [x] Opening such a class gives its two slots, and saving it again keeps both hours. (App integration test, which fails before the change: the form held one set of hours.)
- [x] 다른 시간대 추가, the hint, the headers with 삭제 and the greyed-out days of other slots. (App integration test.)
- [ ] Checked on the user's phone after the app OTA update.
- [x] No native file changes; lint, format and types pass on the changed files.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 10 minutes, in one session (ticket, code, tests and pull request). This is an estimate: gaps under 5 minutes between transcript entries, summed, rounded up for the type check.
- Tokens: input 13,663,559 (cache reads 13,550,606, cache writes 112,869, uncached 84); output 35,239. No subagents. Counted up to the writing of this entry.
- The new and changed integration tests were not run locally (the laptop runs no jest); CI's PR run leaves them out.
