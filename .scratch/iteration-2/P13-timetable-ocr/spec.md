# P13: Timetable OCR

Status: ready-for-agent

## Problem Statement

A User fills the timetable class by class in a form: name, days, start, end, building and room for each class. Most SNU students already have the same timetable in SNUTT or 에브리타임, so typing it again is the main reason a timetable stays empty. An empty timetable leaves the User without Class Quests and leaves Friends without the User's free time.

The `내 정보` week card has had a tile `이미지로 불러오기` since Iteration 1, but pressing it only shows "준비 중이에요". The app also keeps a single timetable, while the wireframe's card now lets a User keep several versions, such as this semester's and a draft, and switch between them.

## Solution

A User presses `이미지로 불러오기`, picks a screenshot of their SNUTT or 에브리타임 timetable from the album, and the app reads it on the phone. A new timetable version is made from what it read and becomes the current one; the previous version is kept and can be picked again from the week card's dropdown. What the app could not read with confidence is left out rather than guessed: a room it is unsure of is not filled in, and a class or a time it is unsure of is not added. The User adds or fixes the rest in the existing class form.

The text is read by Google ML Kit's Korean text recognition on the phone, on Android and iOS alike. Everything else — finding the grid, the coloured blocks, the times, the names and the rooms — is plain TypeScript in the app, tested with Jest against the reference screenshots. No image leaves the phone and none is stored.

Timetable versions work with the server's current API: the current version's classes stay on the server, where Class Quests, Friends' free time and the map read them; the other versions are kept on the phone. The server API that versions really need is written down as a document for the server's owner.

The reference is the wireframe artifact `SNU Now 와이어프레임` (https://claude.ai/artifact/136sh65V4Trkv5KBM78Vgr), version `1792254123-2af8` of 2026-10-18: the `Profile` week card with its version dropdown and the `Timetable*` frames. The wireframe draws no upload, reading or result screen; this spec decides them.

## User Stories

### Reading a screenshot

1. As an SNU student, I want `이미지로 불러오기` on the week card to let me pick a screenshot from my album, so that I do not type my timetable.
2. As an SNU student, I want my SNUTT screenshot and my 에브리타임 screenshot both to be read, so that I can use whichever app I keep my timetable in.
3. As an SNU student, I want to see that the app is reading the screenshot, so that I wait instead of pressing again.
4. As an SNU student, I want a new timetable made from the screenshot and opened at once, so that I see the result without another step.
5. As an SNU student, I want my previous timetable kept when a new one is made, so that a bad screenshot loses nothing.
6. As an SNU student, I want the new timetable named after the title in the screenshot, such as "2025년 여름학기", or "새 시간표 N" when there is none, so that I can tell versions apart.
7. As an SNU student, I want a class that meets on several days, such as 공학수학 2 on 화 and 목, read as one class with several times, so that my list is not doubled.
8. As an SNU student, I want classes on 토 read as well as 월–금, so that a Saturday class is not lost.
9. As an SNU student, I want a class without a room, such as 근장, read with its name only, so that it is not dropped.
10. As an SNU student, I want a room such as `302-311-1` or `43-1-304` linked to its building on the campus map, so that my Class Quests show where to go.
11. As an SNU student, I want a room that was cut off or misread left unlinked rather than linked to the wrong building, so that I am never sent to the wrong place.
12. As an SNU student, I want what the app was unsure of left out rather than guessed, so that my timetable holds nothing wrong.
13. As an SNU student, I want to add or fix a class in the usual class form, so that I need nothing new to learn.
14. As an SNU student, I want to be told when no timetable was found in the picture, and get no empty version, so that I can pick another.
15. As an SNU student, I want to be told when the screenshot holds more than 15 classes and only 15 were kept, so that I know what is missing.
16. As an SNU student, I want my screenshot to stay on my phone, so that my timetable is not sent anywhere to be read.

### Timetable versions

17. As an SNU student, I want the week card to show the current version's name with a dropdown, so that I see which timetable is in use.
18. As an SNU student, I want to pick another version from the dropdown and have the timetable screen, the map, my Class Quests and my free time follow it, so that one choice switches everything.
19. As an SNU student, I want to rename the current version, so that I can call it what I like.
20. As an SNU student, I want to delete the current version, but never the last one, so that I always have a timetable.
21. As an SNU student, I want `빈 시간표 추가` and `지금 시간표 복제`, so that I can plan a new timetable by hand.
22. As an SNU student, I want to be told when I already have 10 versions, so that I know to delete one first.

## Implementation Decisions

### Reading pipeline

The pipeline is a set of pure TypeScript functions. Its input is what the native OCR module returns for one image; its output is a list of read classes. It runs the same on Android and iOS.

**Input from the native module**

- The recognised text as lines with their elements: text, bounding box in image pixels, and confidence where the platform gives one.
- A downscaled RGBA copy of the image (about 330 px wide, the aspect kept) and the scale back to the original. The pixel steps work on this copy; the boxes are scaled to it.

**① Grid**

- Day header: a row near the top whose elements read `월 화 수 목 금` and maybe `토` (and `일`), left to right. Each day's column is centred on its letter; column edges are the midpoints between neighbours, and the outer edges mirror the inner gap.
- When the header is not found, columns come from the vertical grid lines: the peaks of a projection of light-grey pixels per pixel column.
- Hour labels: numbers only, in a narrow strip left of the first column and below the header. The strip excludes the status bar's clock (`1:04`).
- 12-hour labels are unfolded top to bottom: whenever a label is smaller than the one above, 12 is added from there on (… 11, 12, 1, 2 → … 11, 12, 13, 14). A 24-hour column is left unchanged, so both apps use one path.
- Pixels to time: a line `y = a·t + b` fitted with RANSAC over the labels, so that one or two misread labels (1 read as 7) do not bend it. At least 3 inliers are needed; with fewer, the image is refused as "no timetable found".

**② Blocks**

- A mask of saturated pixels (HSV saturation above a threshold, value not too dark) marks the coloured blocks; the white or light grey background and the grey grid lines fall out.
- A morphological close fills the white letters inside a block.
- Connected components become rectangles. A component that crosses a column edge is cut at the edge, so that two same-coloured blocks side by side (근장 on 수 and 목) become two.
- Components in the header, the left label strip and the bottom tab bar, and components smaller than a quarter of a cell, are dropped.
- Two blocks of the same colour stacked in one column with no gap are split where a thin lighter line runs across them, or else where the OCR text falls into two separate groups.

**③ Times**

- A block's top and bottom are turned into times by the fitted line and rounded to 5 minutes.
- When a block's bottom touches the tab bar or the bottom of the picture, or the block fades towards the bottom (the blur behind a floating tab bar), its end is uncertain and the time is left out (see Leaving out what is uncertain).

**④ Name and room**

- The OCR lines inside a block are read top to bottom. A line that matches the room pattern is the room; the others, joined, are the name. Korean lines join without a space; a join between Latin letters or digits keeps one.
- Room pattern: `^\d{1,3}(-[A-Z]?\d{1,4}){0,3}$` (`302-311-1`, `43-2-B101`, `500-L308`, `43-1`, `26-404`), after removing spaces around hyphens.
- A name that ends in `…` is kept without the `…`: the part read is right, only shorter.
- Bold or small type is not used to tell name from room: SNUTT draws the room bold and 에브리타임 draws it small.
- A name longer than 30 characters is cut to 30.

**⑤ One class, several times**

- Blocks whose names are the same after removing spaces become one class with one time per block. Blocks on the same day whose times cross are not merged into one class; the later one becomes a class of its own, since the server refuses a class whose own times cross.

**⑥ The title**

- The text between the status bar and the day header, its largest line, cut to 20 characters, names the new version. Lines that are only icons, numbers or a credit count (`17학점`) are skipped. Without one, the version is `새 시간표 N`.

**Output**

```ts
interface ReadClass {
  name: string;
  times: {
    weekday:
      | "monday"
      | "tuesday"
      | "wednesday"
      | "thursday"
      | "friday"
      | "saturday"
      | "sunday";
    start: string; // "10:00"
    end: string; // "11:45"
    room: string | null; // "311-1", the part after the building
    placeId: string | null;
  }[];
}
```

### Linking a room to a building

- Only a room line that matches the pattern on its whole length is linked. A line cut off (`302 - …`), with stray characters, below the OCR confidence threshold, or absent is never linked: its time has `placeId: null` and `room: null`.
- The building is the longest leading run of segments that equals a campus Place's `number`: `43-1-304` → building `43-1`, room `304`; `302-311-1` → building `302`, room `311-1`. No match leaves the time unlinked.
- The room kept is the rest after the building; a time with no building keeps no room.
- The Places come from `GET /places`, read once per import.

### Leaving out what is uncertain

Nothing uncertain is written into the timetable, and nothing is marked for checking:

- **Room and building**: left empty unless the room line passes the rules above.
- **A time** (one block) is left out when its end is uncertain, when its day column or its start cannot be placed, or when its OCR confidence is under the threshold.
- **A class** is left out when none of its times is left, or when its name is empty or under the confidence threshold.
- A name cut off with `…` is not uncertain: the part read is kept.

The thresholds are set from the four reference screenshots in ticket 02, and `accuracy.md` reports what was left out as well as what was read wrongly.

### Importing

- `이미지로 불러오기` opens the album (`expo-image-picker`, images only, no editing). Cancelling does nothing.
- While reading, a sheet over the week card says `시간표를 읽고 있어요`.
- With no class read: no version is made, and the toast is `시간표를 찾지 못했어요`.
- With more than 15 classes: the first 15 by day and start are kept, and the toast is `수업은 15개까지만 넣었어요`.
- Otherwise a new version is made as under Versions, with the read classes, and becomes the current one; the timetable screen opens; the toast is `시간표를 만들었어요`.
- The class form accepts a class without a building: the form's own rule changes, the server's already allows it.

### Versions (until the server keeps them)

- A version has an id, a name (1–20 characters) and its classes. At most 10 versions.
- **The current version's classes live on the server** as today (`/timetable/classes`), so Class Quests, Friends' free time and the map need no change. The other versions are kept on the phone (AsyncStorage) in the class shape the server returns, places as ids.
- **Switching** to a version: the current classes are read from the server and kept on the phone under the current version; the server's timetable is reset (`DELETE /timetable/classes`); the picked version's classes are posted one by one (`POST /timetable/classes`, each with its own `Idempotency-Key`); the picked version becomes current.
- If a post fails midway, the switch stops, the screen says `시간표를 다 옮기지 못했어요` with `다시 시도`, and retrying posts only the classes not yet on the server. The kept copy is not deleted until every class is on the server.
- A new version from a screenshot, `빈 시간표 추가` (`새 시간표 N`) and `지금 시간표 복제` (`{name} 복사본`, cut to 20) are made and switched to the same way.
- Deleting the current version switches to the first remaining one; the last version cannot be deleted.
- On first use, the classes already on the server become a version named `2026-2학기`, as the wireframe's default.
- These versions belong to one phone: another phone, or a reinstall, sees only the current one. The spec and the PR say so.

### Dropdown (`Profile` week card)

As the frame draws it: the current version's name with ⌄ beside `시간표`; a list `시간표 버전` with a check on the current one; `이름 바꾸기` (inline, max 20, Enter saves, an empty name keeps the old one) and `이 시간표 삭제` (`‘{name}’ 시간표를 삭제할까요?`, disabled for the last version) on the current row; below a divider, `빈 시간표 추가` and `지금 시간표 복제`. With 10 versions, adding shows `시간표는 10개까지 저장할 수 있어요`.

### Native OCR module

- A local Expo module beside the map module (`mobile/modules/`), wrapping ML Kit Text Recognition v2 with the Korean recogniser on Android (`com.google.mlkit:text-recognition-korean`, bundled model) and iOS (`GoogleMLKit/TextRecognitionKorean`).
- One function: read an image URI, return the lines, elements, boxes and confidences, and the downscaled RGBA copy.
- Expo Go has no native module: there, `이미지로 불러오기` keeps its "준비 중이에요" toast.
- A development build is needed; for the emulator, the Android build adds the `x86_64` ABI beside `arm64-v8a`, in a development-only setting.

### Measuring

- Ground truth for the four reference screenshots is written by hand, class by class.
- Each screenshot is run once through the real ML Kit on the Android emulator, from a development-only screen, and the module's output is saved as a test fixture. Jest then runs the whole pipeline on the saved outputs.
- Measured per class time: day; start and end within 5 minutes; name by character error rate; room exact; building linked correctly, linked wrongly (must be 0) or left unlinked. Recall (classes found) and precision (classes found that are real) over the four.
- The result is written as `accuracy.md` in this folder. A larger set and synthetic screenshots are left to Iteration 3.
- One run on a real phone (함재현) confirms the emulator's numbers.

### Server

No server change and no new endpoint: the versions work with `GET`, `POST` and `DELETE /timetable/classes` as they are, the 15-class limit applies to the current version on the server, and the other versions never reach it.

### Tickets

Branches `2.0/P13-<NN>-<slug>`, each with its own PR to `2.0/Main`.

1. The native OCR module, `expo-image-picker`, and a development screen that saves the module's output for the four screenshots. Blocked by none.
2. The reading pipeline, the room-to-building link, the ground truth and `accuracy.md`. Blocked by 01 (for the saved outputs; the pure steps can start at once).
3. Timetable versions on the phone and the week card's dropdown. Blocked by none.
4. `이미지로 불러오기`: pick, read, make the version, open it, and the class form without a building. Blocked by 01, 02 and 03.

## Testing Decisions

- The pipeline is tested with Jest against the four screenshots' saved OCR outputs and pixel copies, comparing with the hand-written ground truth. Each step also has small unit tests: the 12-hour unfolding, RANSAC with a wrong label, splitting a block at a column edge, the room pattern and the building lookup, merging a class's times.
- The versions are tested against the mock API client: switching posts the picked classes and keeps the previous ones; a failed post leaves the kept copy and retries the rest; delete, rename, add, duplicate and the 10-version limit.
- The import flow is tested with a fake OCR module: a new version is made and opened, the toasts, nothing made when nothing is read.
- The native module is checked by hand on the emulator and once on a phone.
- Prior art: the timetable tests of Iteration 1 and the client tests.

## Out of Scope

- Synthetic screenshots and a larger accuracy study (Iteration 3).
- Photos of a screen or of paper taken with the camera; only screenshots.
- Apps other than SNUTT and 에브리타임.
- Reading on a server, or any upload of the image.
- Keeping versions on the server, so that they reach another phone.
- The `학기` card (start and end dates) of the `Timetable` frame.
- `빈 시간 말하기`.

## Further Notes

- The schedule's P13 is planned at 4 hours with a deadline of 2026-10-18; this scope is larger and the schedule is not changed.
- 안진영 builds every ticket. 함재현 checks the native module on a phone and the Mac, and reviews the PRs.
- The four reference screenshots show a person's real timetable. Their owner agreed on 2026-10-18 that they be committed as test fixtures.
- P06's ticket 04 also adds `expo-image-picker`; whichever lands first adds it, and the other reuses it.
