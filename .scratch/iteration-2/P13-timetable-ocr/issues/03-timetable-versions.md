# 03: Timetable versions and the week card's dropdown

Parent: [P13 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User keeps several timetables and picks which one is in use, from a dropdown on the `내 정보` week card, as the `Profile` frame draws it. The timetable screen, the map, the User's Class Quests and their free time as Friends see it all follow the version picked.

The server keeps one timetable, so no server change is needed. The current version's classes stay on the server, and the other versions are kept on the phone, as the spec's "Versions" describes:

- **Switching** keeps the current classes on the phone, resets the server's timetable, and posts the picked version's classes one by one.
- **A failed post** stops the switch, keeps everything, and offers `다시 시도`, which posts only the classes still missing.
- **New versions.** `빈 시간표 추가` makes `새 시간표 N`, and `지금 시간표 복제` makes `{name} 복사본`. Each is made and switched to in the same way.
- **Rename** works on the current version, inline, at most 20 characters; an empty name keeps the old one.
- **Delete** works on the current version, never the last one, and switches to the first that remains.
- **At most 10 versions.**
- **First use:** the classes already on the server become `2026-2학기`.

Ticket 04 calls the same "make a version and switch to it" for a screenshot.

## Acceptance criteria

- [ ] The week card shows the current version's name with ⌄ beside `시간표`, and the list `시간표 버전` with a check on the current one, as the frame draws it.
- [ ] Picking a version switches the server's timetable to its classes; the previous version's classes are kept on the phone and come back when it is picked again.
- [ ] While switching, the card shows that it is working and ignores further presses.
- [ ] When a post fails, the screen says `시간표를 다 옮기지 못했어요` with `다시 시도`; retrying posts only the missing classes, and no version loses a class.
- [ ] `이름 바꾸기`: inline, at most 20 characters, Enter saves, Escape or an empty name keeps the old one.
- [ ] `이 시간표 삭제` asks `‘{name}’ 시간표를 삭제할까요?`. It is disabled for the last version, and deleting switches to the first that remains.
- [ ] `빈 시간표 추가` and `지금 시간표 복제` make and switch to `새 시간표 N` and `{name} 복사본` (cut to 20).
- [ ] With 10 versions, adding shows `시간표는 10개까지 저장할 수 있어요`.
- [ ] On first use, the existing classes become `2026-2학기`.
- [ ] The timetable screen, Class Quests and the map follow the switch, because the client's caches of classes and Quests are invalidated.
- [ ] The spec and the PR say that other versions stay on one phone.
- [ ] Jest against the mock client covers: switching, retrying after a failed post, rename, delete (not the last), add, duplicate, the 10-version limit, and first use.
- [ ] Screenshots of the dropdown, opened and renaming, beside the `Profile` frame, under Test Results.
