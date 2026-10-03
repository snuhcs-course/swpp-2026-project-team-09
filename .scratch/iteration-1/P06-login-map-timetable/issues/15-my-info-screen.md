# 15: 내 정보 screen

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 12 (Sign-in, loading and the Session)

## What to build

The bottom navigation's fifth tab opens 내 정보, the frame `Profile`, with every element of the frame. A User sees their profile card and signs out after a confirmation. The rows that belong to other tasks are there and say that they are not ready.

The timetable card, the location sharing switch and profile editing are placeholders here; tickets 16, 17 and 19 fill them.

## Acceptance criteria

- [ ] The profile card shows the name, the department and admission year as the frame writes them, the badge "SNU 계정 인증됨", and "프로필 편집". The profile picture is the first letter of the name.
- [ ] The data is the profile of P04, fetched through the API client, with loading and error states.
- [ ] "로그아웃" opens the frame's confirmation, "로그아웃할까요?", and signs out on confirmation.
- [ ] The bell, 친구 관리, 참여 중인 파티, 관심 행사, 알림 설정 and 비공개 구역 관리 are there and show the "준비 중이에요" toast.
- [ ] "내 퀘스트" opens the main screen's full-screen Quest view once ticket 08 exists, and shows the toast until then.
- [ ] The frame `ProfileShare` holds: opened from "공유 설정", the screen scrolls to the location sharing section and marks it.
- [ ] Jest tests: the card's content, the loading and error states, sign-out with its confirmation and its cancel, and a row's toast.
