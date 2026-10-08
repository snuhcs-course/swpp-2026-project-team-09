# 03: The timetable screen, the class form and the Place picker

Parent: [P19 spec](../spec.md)
Status: ready-for-human
Blocked by: 02 (내 정보, the Master Switch with the position sent while the app is open, and 알림)

## What to build

A User keeps their classes in the app. They add, change and delete them on the timetable screen, and they choose each class's Place from the list of Places. The main server derives the User's Class Quests from these classes. The Quest list on the map and the week grid on 내 정보 follow each change. Friends see the User's free time from them.

This is the last ticket of P19, after everything the demo needs.

The frames are `Timetable`, `TimetableEmpty`, `TimetableClassForm`, `TimetableOverlap`, `TimetableOverlapList` and `PlacePickerClass`, and `PlacePickerEmpty` for the words of a search that finds nothing.

The server routes:

- `GET /timetable/classes`;
- `POST /timetable/classes`, with its `Idempotency-Key`;
- `PUT /timetable/classes/:classId`;
- `DELETE /timetable/classes/:classId`;
- `GET /places` and `GET /places/search?q=`.

A class on the main server is a course name and one or more times, each with a weekday, a start, an end, a Place and a room. The frame's form edits one course name, a set of weekdays, one start and end, one Place and one room. The app saves that as one time per chosen weekday, all with the same hours, Place and room.

## Acceptance criteria

### The timetable (`Timetable`, `TimetableEmpty`, `TimetableOverlapList`)

- [x] 내 정보's `직접 입력` opens it, in place of its toast. It is a screen above the tabs, with `뒤로` and `시간표`.
- [x] The `수업 {n}` card lists the classes in the main server's order. Each row has:
  - a 4-wide bar in the class's colour, from the palette tokens that ticket 02 made, so that a class has the same colour here and in 내 정보's grid;
  - the course name in 16/600, with the warning Badge `겹침` when the answer's `overlaps` names another class;
  - the days and hours, `월·수 10:30–12:00`;
  - the place, `제1공학관 301동 118호` (`{name} {number}동 {room}`), or `장소 미정`;
  - a chevron.

  A press on a row opens the class form on that class.
- [x] Without classes, the dashed card shows the calendar icon, `등록된 수업이 없어요` and `수업을 넣으면 친구가 내 공강을 볼 수 있어요`.
- [x] The footer holds `+ 수업 추가` (52, navy), which opens the empty form.
- [x] The frame's `학기` card, with `시작일` and `종료일`, is not built: the main server stores no semester. The User resets the timetable by deleting classes.

### The class form (`TimetableClassForm`, `TimetableOverlap`)

- [x] It is a screen above the timetable, with ✕ `닫기` and `수업 추가` or `수업 수정`.
- [x] The fields:
  - `과목명`, up to 30;
  - `요일`: seven toggles `월` … `일`, with Saturday in `#2A4BA8` and Sunday in `#C42B2B` while off;
  - `시작 시각` and `종료 시각`, each an hour select and a minute select (`--`, `00`–`23`; `--`, `00`–`55` in steps of 5), labelled `시작 시각 · 시` and so on;
  - `장소`, a button reading `장소 선택` or the chosen Place, which opens the Place picker;
  - `강의실 선택`, optional, with the placeholder `예: 118호` and up to 20 characters.
- [x] An end that is not after the start outlines the end in red and says `종료 시각이 시작 시각보다 늦어야 해요`.
- [x] While the chosen days and hours cross another class, the warning box shows the alert icon, `{name} ({days} {start}–{end})와 시간이 겹쳐요` for each such class, and `그대로 저장할 수 있어요`. It is computed on the phone by the main server's rule: the same weekday, each starting before the other ends, and times that touch do not cross.
- [x] `저장` stays disabled until the form has a name, at least one day, both times with the end after the start, and a Place. It sends `POST` for a new class and `PUT` for an edit. The toasts:
  - `수업을 추가했어요`;
  - `수업을 수정했어요`;
  - `저장했어요 · 겹치는 수업이 있어요`, with the alert icon, when the answer's `overlaps` is not empty.
- [x] The refusals, with words that no frame draws:
  - 409 `TIMETABLE_FULL`: `수업은 15개까지 넣을 수 있어요`;
  - 404 `PLACE_NOT_FOUND`: `장소를 다시 골라 주세요`;
  - anything else: `저장하지 못했어요. 다시 시도해 주세요`.

  The form stays open after each.
- [x] On an edit, `삭제` stands beside `저장`. It opens the danger dialog `이 수업을 삭제할까요?` with `취소` and `삭제`. Confirming sends `DELETE` and shows `수업을 삭제했어요`.
- [x] A class whose times differ in hours, Place or room opens with its first time's. Saving gives every chosen day those values. The app makes no such class itself.
- [x] After each change, the classes and the Quests are fetched again. 내 정보's grid and today's Class Quests in the Quest list follow.

### The Place picker (`PlacePickerClass`, `PlacePickerEmpty`)

- [x] It is a screen above the form, with `뒤로` and `장소 선택`. The search field reads `건물 이름, 동 번호` (`장소 검색`), with ✕ `검색어 지우기`.
- [x] The list, labelled `장소 목록`, is `GET /places`. While the field holds text, it is `GET /places/search?q=`, asked once the User has stopped typing for 300 ms.

  A row has a pin icon, the name in 16/600 and `{number}동` in 14 muted (the name alone for a Place without a number), and a check on the chosen Place. A press chooses the Place and goes back to the form.
- [x] A search that finds nothing shows the search icon, `‘{q}’에 맞는 장소가 없어요` and `건물 이름이나 동 번호로 다시 찾아 보세요`.
- [x] The picker takes a mode. This ticket builds the class mode, which is a list only. P13's Sub Quests and P14's Meetups add the other mode: the row `지도에서 직접 찍기`, the map view of `PlacePickerMap`, and the other words of `PlacePickerEmpty`.

### Records and checks

- [x] Each operation is in the API client with its mock. The mock starts from the frame's four classes, `운영체제`, `자료구조`, `알고리즘` and `확률통계`, on Places of the mock's list. P06's `todo.md` §3 gains the timetable and the Places, and `mobile/README.md` describes the screen.
- [x] Jest tests:
  - against the mocks: the list with and without classes, the `겹침` Badge, adding, editing and deleting with each toast, the form's disabled `저장`, the end-before-start error, the warning box, each refusal, and choosing a Place through search, including a search that finds nothing;
  - against the fake server: each timetable route and both Place routes, the `Idempotency-Key` on an add, and the classes and the Quests fetched again after a change.
- [x] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - no `학기` card;
  - the refusals' words;
  - a class saved as one time per day.
- [ ] Screenshots of the web target are in the pull request under Test Results, compared with the frames.
- [x] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

## Comments

### Result (2026-10-06)

The frames `Timetable` (with `empty`, `form` and `overlap`) and `PlacePicker` (with `mode: class`) were read in the copy of the canvas at version `1791265989-e23c`.

Where things are, in `mobile/`:

- Routes: `src/app/(signed-in)/me/timetable/index.tsx` (시간표) and `class.tsx` (the class form, `?classId=` for an edit), both sliding from the right. 내 정보's `직접 입력` pushes `/me/timetable`.
- `src/screens/timetable/`: `timetable-screen.tsx`, `class-form-screen.tsx` (the form, the footer with the delete dialog, the save and its toasts), `class-fields.tsx` (the day toggles, the hour and minute selects, the warning box, the 장소 button).
- `src/screens/places/place-picker.tsx`: `PlacePicker` with `mode`, `picked`, `onPick` and `onClose`. It is a component drawn over the screen that needs a Place, not a route, so that it hands the Place back without passing it through an address. P13 and P14 add the mode `event` there: a member of `PlacePickerMode`, its line of `NO_MATCH_HINT`, the row `지도에서 직접 찍기`, the button of `PlacePickerEmpty` and the map view of `PlacePickerMap`.
- `src/features/timetable/class-form.ts` (the draft, `saveOf`, `crossingLines` by the main server's rule, `timesText`, `whereText`, the select helpers) and `use-timetable.ts` (`useTimetable`, `useClassChanges`, which fetches the classes and the Quests again after each change without waiting for them).
- API: `addClass` (`Idempotency-Key`, a new random UUID for each press of 저장), `replaceClass`, `deleteClass`, `searchPlaces`, each with its mock; `ClassSave` in `types.ts`; `call()` takes headers. The mock's classes are in `src/api/mock/timetable.ts`, in memory from the frame's four classes, in the main server's order, with `overlaps` and the refusals `TIMETABLE_FULL`, `PLACE_NOT_FOUND` and `CLASS_NOT_FOUND`; `startFresh()` resets them.
- Design system: `SearchField` takes `clearLabel`; a toast takes an icon (`alert` for the overlap toast).
- Tests: `__tests__/timetable-test.tsx` (mocks) and `timetable-server-test.tsx` (fake server: each new route, the key, the refusals, and a save on the screens fetching the classes and the Quests again). The fake server records `idempotencyKey`. `me-test.tsx` no longer expects `직접 입력` to say 준비 중이에요.

Decisions made while building:

- The class form, the list and the warning describe a class whose times differ by grouping the days of each set of hours: `월 10:00–11:15, 수 13:00–14:15`. The place line is the first time's.
- The selects are buttons that open the choices under the row, as Onboarding's 학번 does; picking an hour without a minute gives `00`, as the frame does.
- 저장 and 삭제 are disabled while a request is out. A refusal of 삭제 says `삭제하지 못했어요. 다시 시도해 주세요` and stays.
- Under the mocks, the Quest list's Class Quests stay the mock's: the mock does not derive them from its classes.

Differences from the frame:

- No `학기` card, `시작일` or `종료일`: the main server stores no semester. The User resets the timetable by deleting classes.
- The refusals' words, `수업은 15개까지 넣을 수 있어요`, `장소를 다시 골라 주세요`, `저장하지 못했어요. 다시 시도해 주세요` and `삭제하지 못했어요. 다시 시도해 주세요`, are the app's; no frame draws them.
- A class is saved as one time per chosen day, all with the same hours, Place and room.
- The list is in the main server's order (by the first time in the week), and a class's colour is its place in that order, as in 내 정보's week; the frame colours by the order of entry.
- The hour and minute selects open a list under the row: React Native has no select of the phone's own.
- `강의실 선택` is one label in one style; the frame greys `선택`.
- The Place picker appears without sliding; the frame slides it in over 0.22 s. Its search field is the shared one, 44 high; the frame's is 48.
- The mock's Place `500` is `대학원연구동(2단계)`, as ticket 02 made it, not the frame's `자연과학대학`.

Not checked: nothing ran in a browser, on a phone or against a running main server; the screenshots for the pull request are still to take.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 1 hour of agent time in one session. Tokens: about 10 M input, of which about 9.6 M cache reads and 0.35 M cache writes, and about 0.07 M output. No subagents.
