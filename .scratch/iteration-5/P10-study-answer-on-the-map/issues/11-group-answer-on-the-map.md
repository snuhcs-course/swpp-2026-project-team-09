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

## Acceptance criteria

- [ ] `STUDY_GROUP_TO_SEND`: the time card with "같이 3 ›" and the Friends' busy blocks, the sky mark and label, the people's marks, the sentence, the ticket "그룹스터디룸 · 4명 / 4층 6인실 / 방 G412", and "동의 요청 보내기". (Integration test, with the library's room list.)
- [ ] `STUDY_GROUP_MORE_NEEDED`: the dimmed ticket, the sentence with one more, and "+ 같이 한 명 더", which opens the picker. (Integration test.)
- [ ] The asker alone (people 1, moreNeeded 3): "+ 같이" opens the picker. Picking three Friends asks the server with the four people and `together: true`, and the answer to send is shown. (Integration test.)
- [ ] Removing a Friend asks the server again without them. (Integration test.)
- [ ] Logged out of the library: the right cell shows "방" alone, the red line asks for the login, and the main button 로그인 opens it; logged in, the room number and "동의 요청 보내기" follow. (Integration test.)
- [ ] Pictures from the emulator at font scale 1.0 and 1.3 before merge.
- [ ] Whole lint, format and types.

## Comments
