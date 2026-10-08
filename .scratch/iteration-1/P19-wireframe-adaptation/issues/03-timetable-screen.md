# 03: The timetable screen, the class form and the Place picker

Parent: [P19 spec](../spec.md)
Status: ready-for-agent
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

- [ ] 내 정보's `직접 입력` opens it, in place of its toast. It is a screen above the tabs, with `뒤로` and `시간표`.
- [ ] The `수업 {n}` card lists the classes in the main server's order. Each row has:
  - a 4-wide bar in the class's colour, from the palette tokens that ticket 02 made, so that a class has the same colour here and in 내 정보's grid;
  - the course name in 16/600, with the warning Badge `겹침` when the answer's `overlaps` names another class;
  - the days and hours, `월·수 10:30–12:00`;
  - the place, `제1공학관 301동 118호` (`{name} {number}동 {room}`), or `장소 미정`;
  - a chevron.

  A press on a row opens the class form on that class.
- [ ] Without classes, the dashed card shows the calendar icon, `등록된 수업이 없어요` and `수업을 넣으면 친구가 내 공강을 볼 수 있어요`.
- [ ] The footer holds `+ 수업 추가` (52, navy), which opens the empty form.
- [ ] The frame's `학기` card, with `시작일` and `종료일`, is not built: the main server stores no semester. The User resets the timetable by deleting classes.

### The class form (`TimetableClassForm`, `TimetableOverlap`)

- [ ] It is a screen above the timetable, with ✕ `닫기` and `수업 추가` or `수업 수정`.
- [ ] The fields:
  - `과목명`, up to 30;
  - `요일`: seven toggles `월` … `일`, with Saturday in `#2A4BA8` and Sunday in `#C42B2B` while off;
  - `시작 시각` and `종료 시각`, each an hour select and a minute select (`--`, `00`–`23`; `--`, `00`–`55` in steps of 5), labelled `시작 시각 · 시` and so on;
  - `장소`, a button reading `장소 선택` or the chosen Place, which opens the Place picker;
  - `강의실 선택`, optional, with the placeholder `예: 118호` and up to 20 characters.
- [ ] An end that is not after the start outlines the end in red and says `종료 시각이 시작 시각보다 늦어야 해요`.
- [ ] While the chosen days and hours cross another class, the warning box shows the alert icon, `{name} ({days} {start}–{end})와 시간이 겹쳐요` for each such class, and `그대로 저장할 수 있어요`. It is computed on the phone by the main server's rule: the same weekday, each starting before the other ends, and times that touch do not cross.
- [ ] `저장` stays disabled until the form has a name, at least one day, both times with the end after the start, and a Place. It sends `POST` for a new class and `PUT` for an edit. The toasts:
  - `수업을 추가했어요`;
  - `수업을 수정했어요`;
  - `저장했어요 · 겹치는 수업이 있어요`, with the alert icon, when the answer's `overlaps` is not empty.
- [ ] The refusals, with words that no frame draws:
  - 409 `TIMETABLE_FULL`: `수업은 15개까지 넣을 수 있어요`;
  - 404 `PLACE_NOT_FOUND`: `장소를 다시 골라 주세요`;
  - anything else: `저장하지 못했어요. 다시 시도해 주세요`.

  The form stays open after each.
- [ ] On an edit, `삭제` stands beside `저장`. It opens the danger dialog `이 수업을 삭제할까요?` with `취소` and `삭제`. Confirming sends `DELETE` and shows `수업을 삭제했어요`.
- [ ] A class whose times differ in hours, Place or room opens with its first time's. Saving gives every chosen day those values. The app makes no such class itself.
- [ ] After each change, the classes and the Quests are fetched again. 내 정보's grid and today's Class Quests in the Quest list follow.

### The Place picker (`PlacePickerClass`, `PlacePickerEmpty`)

- [ ] It is a screen above the form, with `뒤로` and `장소 선택`. The search field reads `건물 이름, 동 번호` (`장소 검색`), with ✕ `검색어 지우기`.
- [ ] The list, labelled `장소 목록`, is `GET /places`. While the field holds text, it is `GET /places/search?q=`, asked once the User has stopped typing for 300 ms.

  A row has a pin icon, the name in 16/600 and `{number}동` in 14 muted (the name alone for a Place without a number), and a check on the chosen Place. A press chooses the Place and goes back to the form.
- [ ] A search that finds nothing shows the search icon, `‘{q}’에 맞는 장소가 없어요` and `건물 이름이나 동 번호로 다시 찾아 보세요`.
- [ ] The picker takes a mode. This ticket builds the class mode, which is a list only. P13's Sub Quests and P14's Meetups add the other mode: the row `지도에서 직접 찍기`, the map view of `PlacePickerMap`, and the other words of `PlacePickerEmpty`.

### Records and checks

- [ ] Each operation is in the API client with its mock. The mock starts from the frame's four classes, `운영체제`, `자료구조`, `알고리즘` and `확률통계`, on Places of the mock's list. P06's `todo.md` §3 gains the timetable and the Places, and `mobile/README.md` describes the screen.
- [ ] Jest tests:
  - against the mocks: the list with and without classes, the `겹침` Badge, adding, editing and deleting with each toast, the form's disabled `저장`, the end-before-start error, the warning box, each refusal, and choosing a Place through search, including a search that finds nothing;
  - against the fake server: each timetable route and both Place routes, the `Idempotency-Key` on an add, and the classes and the Quests fetched again after a change.
- [ ] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - no `학기` card;
  - the refusals' words;
  - a class saved as one time per day.
- [ ] Screenshots of the web target are in the pull request under Test Results, compared with the frames.
- [ ] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.
