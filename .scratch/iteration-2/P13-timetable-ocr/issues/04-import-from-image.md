# 04: `이미지로 불러오기`: a new timetable from a screenshot

Parent: [P13 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (the module and the picker), 02 (the pipeline), 03 (versions)

## What to build

The `내 정보` week card's tile `이미지로 불러오기` stops showing "준비 중이에요". A User picks a screenshot of their SNUTT or 에브리타임 timetable from the album. The app reads it on the phone with ticket 01's module and ticket 02's pipeline, makes a new version from the classes read, named by the screenshot's title, switches to it through ticket 03, and opens the timetable screen.

What was uncertain was left out by the pipeline. The User adds or fixes the rest in the existing class form, which now accepts a class without a building, as the server already does. No image leaves the phone, and none is kept after reading.

## Acceptance criteria

- [x] `이미지로 불러오기` opens the album (images only). Cancelling does nothing.
- [x] While reading, a sheet says `시간표를 읽고 있어요`, and the tile ignores further presses.
- [x] With no class read, no version is made, and the toast is `시간표를 찾지 못했어요`.
- [x] With more than 15 classes, the first 15 by day and start are kept, and the toast is `수업은 15개까지만 넣었어요`.
- [x] Otherwise, a new version named by the title (or `새 시간표 N`) is made with the classes read, becomes current, and the timetable screen opens with the toast `시간표를 만들었어요`.
- [x] With 10 versions already, nothing is read, and the toast is `시간표는 10개까지 저장할 수 있어요`.
- [x] The class form saves a class without a building, and its room field stays optional.
- [x] Where the native module is missing (Expo Go, web), the tile keeps the "준비 중이에요" toast.
- [x] The picked image is not copied or kept by the app.
- [x] Jest with a fake module and a fake pipeline covers: a version made and opened; the three toasts; nothing made when nothing is read; the 10-version limit; Expo Go.
- [ ] A run on the emulator with one reference screenshot, and once on a phone (함재현), from the tile to the timetable screen.
- [ ] Screenshots of reading and of the result beside the `Profile` and `Timetable` frames, under Test Results.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 25 minutes in one session (an estimate), building the import, the class form change and the Jest cases.
- Tokens: recorded by the main session.
- The reading pipeline (ticket 02) is not merged yet: `mobile/src/features/timetable-ocr/read-timetable.ts` holds the `ReadTimetable` interface and a placeholder `readTimetable` that reads no class, so until ticket 02 replaces it the tile says `시간표를 찾지 못했어요` after reading.
