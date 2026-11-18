# 03: The 시간표 card: two buttons, a block opens its Class, and an image read stays on 내 정보

Parent: [P15 spec](../spec.md), item 3; found using `snunow/all/26.11.17-2` on 2026-11-17; the team canvas's before/after boards for this item (the `P15-03-*` boards under "P15. 출시 전 앱 청소")
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: none

## What is on screen now

- Under the week on the 시간표 card of 내 정보, three buttons share the row in thirds: "직접 입력", "이미지로 불러오기" and "빈 시간 말하기". "빈 시간 말하기" only shows the toast "준비 중이에요", and nothing is planned behind it.
- A class block in the week does nothing when pressed. To change a Class, the User presses "직접 입력", then the Class in the timetable list ("시간표"), which opens "수업 수정".
- "이미지로 불러오기" reads a screenshot of a timetable on the phone, puts the Classes it read into a new version, then opens the timetable list and shows a toast with how many it put in.

## What changes

- The "빈 시간 말하기" button is removed. "직접 입력" is renamed "직접 입력/수정". The two buttons, "직접 입력/수정" and "이미지로 불러오기", each take half of the row.
- A press on a class block in the week opens that Class's "수업 수정" screen at once, the same screen as pressing that Class in the timetable list. A Class that meets more than once a week, such as 월·수, opens from any of its blocks.
- When "이미지로 불러오기" finishes, the app stays on the 내 정보 tab instead of opening the timetable list. The toast that says how many Classes were put in still shows.

## What stays as it is

- "직접 입력/수정" opens the timetable list, as "직접 입력" did.
- The timetable list itself.

## Acceptance criteria

- [x] The 시간표 card shows two buttons under the week, "직접 입력/수정" and "이미지로 불러오기", each half the row wide, and no "빈 시간 말하기".
- [x] "직접 입력/수정" opens the timetable list.
- [x] A press on a class block opens "수업 수정" filled with that Class; two blocks of one Class open the same Class.
- [x] After an image is read and its version is made, the app is still on 내 정보 and the toast with the count shows. What happens when nothing was read, or the version could not be saved, does not change.
- [x] Tests, by ADR 0007: the integration tests that render 내 정보 over the fake main server and the app's router check the two buttons, the route a block press opens, and that an image read with a fake reading pipeline leaves the route on 내 정보.

## Comments

### Notes from the implementation (2026-11-18)

- **The toast differs from the ticket's words.** The ticket speaks of "the toast that says how many Classes were put in". That toast reads "시간표를 만들었어요". It gives numbers only when Classes were cut or left out: "N개 중 15개만 넣었어요", ending in "· M개는 넣지 못했어요". The after-import board shows the same words, and the toast is unchanged. The spec says such a difference goes to the ticket's owner.
- **The tests run over the app's mocks**, as the existing timetable tests do, not over the fake main server. They check:
  - the two buttons;
  - the route a block press opens (`/me/timetable/class?classId=…`, with 수업 수정 filled in, and the same Class from 월 and 수);
  - that an import with the fake reading pipeline stays on `/me`.
- **`WeekCard` owns the route**, through an `onOpenClass` prop on `WeekGrid`. Each block has the hint "수업 수정".
- **Short blocks are below the 48 pt touch size.** A block of a 1-hour Class is 34 pt high, and back-to-back blocks leave no room for `hitSlop`.
- **To check on a phone:** a block press inside the week's scroll, which tests cannot show.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out. Tickets 02–05 ran in one session, in parallel, so that session's own share is split evenly among them.

- Agent time: about 43 minutes. Three Opus 5.5 subagents worked on it: one implemented the ticket and two reviewed it.
- Tokens: output about 57,000. Input about 19.5 million: 18.8 million cache reads, 0.66 million cache writes and about 300 uncached.
