# 11: The group study answer in the meal's frame

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-design` ② ③ and state 가, `group-study-resume` § 0
Status: ready-for-agent
Blocked by: 09, 10

Native files: none. Releases: with ticket 16, which turns it on.

## What to build

A study answer with `study.group` is drawn as a meal answer is, with the meal's own parts. None of them is copied.

- **The time card** is the meal's `PlanBar`, which already takes any kind: "내일(금) 15:00–17:00 · 2시간". It has:
  - the "+ 같이" slot ("같이 3 ›" once Friends are in);
  - Friends' busy blocks, from `band.lanes`;
  - the in-bar friend picker (`usePickingBar`, `PersonRows`), with `band.others` as the Friends to add.
  - Adding or removing a Friend asks the server again through `useShownAnswer`, as a meal does. No edit of `time-bar.tsx` or `time-band.tsx` is needed: the study kind enters through ticket 09's kind tables.
- **The map:**
  - the sky mark at 관정 with the label "관정 4층 그룹스터디룸 15:00" over "6인실 · 4명";
  - each person's mark and route, from `scene.people` and `scene.routes`, as a meal's. A Friend with no origin has neither.
- **The card:**
  - one sentence from the Plan's `lines` ("네 명이 모두 비는 내일 15:00에 관정 4층 6인실을 추천해요.");
  - the room ticket (ticket 10) and the use line;
  - the main action "동의 요청 보내기" (ticket 12 sends it).
  - The room number is the first room of the kind free for the whole time, read from the library (`roomTimesFor`, `freeRooms`) while the library is logged in.
  - Logged out of the library, as the seat answer does it: the right cell shows "방" alone, the red line asks for the library login, and the main button is 로그인. The room number is chosen once logged in.
- **Fewer than four** (`moreNeeded > 0`, no key). This covers "같이 공부할 자리 있어?" with no Friend named, which comes back with people 1 and moreNeeded 3. In this state:
  - the ticket is dimmed;
  - the sentence says "그룹스터디룸은 네 명부터예요." and how many more: "한 명만 더 부르면 돼요." for one, "두 명 더 부르면 돼요." and "세 명 더 부르면 돼요." for two and three;
  - the main action opens the friend picker: "+ 같이 한 명 더" when one is missing, "+ 같이" otherwise.
- **Removing every Friend** from an answer that began as "같이" keeps the group answer at moreNeeded 3; the server answers it so.
- **No plan** (`noPlan`): the reason's lines, as a meal's.

## How it is built

- **The card:** `PlanCard` draws `StudyGroupBody` (`screens/main/answer/study-group-body.tsx`) for a Plan with `study.group`, in place of a meal's body. It holds:
  - the Assistant's sentence, or `shortWords` while people are missing;
  - the room ticket with the kind's first room free for the whole time (`roomTimesFor`, `freeRooms`);
  - where the main button is 로그인 (logged out of the library, with the people the room needs), the seat answer's own line under the ticket, "관정도서관 로그인이 필요해요" (`FailureNote`), left out while a cell's chooser is open, as the seat answer's while its room list is;
  - a cell's chooser right under the ticket, then the use line, and the use's chooser under it.
  - Choosing a kind asks again through `shown.change(withChosenRoom)`.
- **The main button** is told to P01 ticket 15's act stage (`control.libraryAct`), as a booking ticket's is. `planActionOf` leaves a group answer to it.
  - "+ 같이 …" opens the time card's picker (`fix.toggleAdding`).
  - 로그인 opens the library login.
  - "동의 요청 보내기" waits for ticket 12.
- **The map:** `drawingOf` gives a group answer's pick the study pick's make-up (P01 ticket 10): "관정 4층 그룹스터디룸 · 15:00 · 6인실 · 4명".
  - Its marks are placed as a meal answer's: the labels keep clear of the people's marks, the camera keeps every mark clear of the map's credit (`keep`), and a Friend's face under a kept label is left out (`facesClearOf`).
- **The time card** is the meal's `PlanBar` unchanged.
- **The mock** answers "같이 공부할 자리 있어?" from the copies (`studyGroupReplyTo`).

## Acceptance criteria

- [ ] `STUDY_GROUP_TO_SEND`: the time card with "같이 3 ›" and the Friends' busy blocks, the sky mark and label, the people's marks, the sentence, the ticket "그룹스터디룸 · 4명 / 4층 6인실 / 방 G412", and "동의 요청 보내기". (Integration test, with the library's room list.)
- [ ] `STUDY_GROUP_MORE_NEEDED`: the dimmed ticket, the sentence with one more, and "+ 같이 한 명 더", which opens the picker. (Integration test.)
- [ ] The asker alone (people 1, moreNeeded 3): "+ 같이" opens the picker. Picking three Friends asks the server with the four people and `together: true`, and the answer to send is shown. (Integration test.)
- [ ] Removing a Friend asks the server again without them. (Integration test.)
- [ ] Logged out of the library: the right cell shows "방" alone, the red line asks for the login, and the main button 로그인 opens it; logged in, the room number and "동의 요청 보내기" follow. (Integration test.)
- [ ] Pictures from the emulator at font scale 1.0 and 1.3 before merge.
- [ ] Whole lint, format and types.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 64 minutes in the p04-58 session, an estimate. 16 minutes built the card, from 22:19 UTC on 11-26. 41 went on the emulator pictures, the chooser order they showed, and restacking tickets 12 and 14 on it. 7 went on the review's two fixes (the seat answer's login line, the meal's placement). The waits for the emulator and for the review are not counted. The pictures to be taken again after those fixes are not in it yet. No subagents.
- Tokens: input 566 uncached, with cache reads 153,902,622 and cache writes 382,260; output 150,126.
