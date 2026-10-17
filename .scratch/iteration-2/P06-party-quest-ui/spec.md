# P06: Improve the Party and Quest UI

Status: ready-for-agent

## Problem Statement

Iteration 1 built the 파티 tab, the Quest room, the form for making a Quest and the Quest list on the map, and connected them to the server. They follow the wireframe only in part, and the app still has a second way to plan something with a Friend, the Meetup, which the wireframe no longer has. A User who wants to meet a Friend sees a form of its own and an invitation of its own, while everything else the User does with other people is a 파티.

The wireframe also draws parts that the app has never had: official recruiting banners, photos and tags on a post, hiding a post, the reasons a post is recommended, people looking for company, the members' walking time, a conversation inside a Party, and past plans. A teammate looking at the app and at the wireframe side by side cannot tell which differences are on purpose.

## Solution

The 파티 tab, the room, the form and the Quest list are brought to the wireframe, and the Meetup is retired: a plan with a Friend is a 비공개 파티, made with the same form, preset to 비공개 with that Friend invited.

What the server cannot give yet is built against a mock adapter of its own until an endpoint exists. The build connected to the server shows the mocked parts too, except the ones that would state something false about real people or real Quests (see Mocks). The last ticket lists the endpoints the server needs, so that each mock can be replaced by one change in the API client.

The reference is the wireframe artifact `SNU Now 와이어프레임` (https://claude.ai/artifact/136sh65V4Trkv5KBM78Vgr), version `1792227848-fc09` of 2026-10-17. Its artboards for this task: `Party`, `PartyJoin`, `PartyMine`, `PartyInvites`, `PartyDetail`, `PartyLeave`, `PartyPost`, `PartyCreate`, `PartyAppt`, and in `Main` the Quest list, `MainQuests`, the Friend's card and the 활성 파티 button.

## User Stories

### A plan with a Friend

1. As an SNU student, I want `파티 만들기` on a Friend's card on the map to open the form as a 비공개 파티 with that Friend already invited, so that I plan with a Friend the same way as with anyone.
2. As an SNU student, I want `{name}님과 파티 만들기` in a Friend's panel to do the same, so that both ways lead to one form.
3. As an invited SNU student, I want an invitation from a Friend to look like every other invitation in `초대`, so that I answer them in one place.

### 찾기, 전체 파티 and the boards

4. As an SNU student, I want official recruiting in a banner at the top of `찾기`, which turns by itself and which I can pause, so that I see what organisations are gathering people for.
5. As an SNU student, I want `파티 검색` to find a post by its title, its text, its place or its tags, so that I find what I am looking for.
6. As an SNU student, I want the recruiting posts ordered by how well their tags match mine, so that the likeliest ones come first.
7. As an SNU student, I want a post's card to show its photo, up to three members' faces and how many of them are my Friends, so that I judge it at a glance.
8. As an SNU student, I want `관심 없음` on a post to hide it, and a note of how many I hid, so that I see fewer posts I do not want.
9. As an SNU student, I want `같이 할 사람을 찾는 중`, people who are looking for company with what they want, their tags and our common free time, and to ask one with `같이 하자고 하기`, so that I can find someone without a post.
10. As an SNU student, I want `전체 파티` to have the tabs `공식` and `일반`, so that official recruiting has a list of its own.
11. As an SNU student, I want my own post on a board to open the post, with the badge before the title, so that the board reads like the others' posts.

### 파티 모집글

12. As an SNU student, I want a post to show its photo, its tags and the members' faces, so that I know what and whom I am joining.
13. As an SNU student, I want `추천 이유` on a post: shared interests, whether the time suits my timetable, and which Friends are in it, so that I know why it is shown to me.
14. As an SNU student, I want `관심 없음` beside `참여하기` on another's post, so that I can hide it from there too.

### Joining

15. As an SNU student, I want the join sheet to tell me that the members share their locations once the Party is switched on, so that I consent knowingly.

### 내 파티

16. As an SNU student, I want each card to say whether it is public or private with an icon, so that I tell them apart.
17. As an SNU student, I want each card's status to say how many invitations are still waiting, and, while it is switched on, how many share their location or that it waits for answers, so that I see where it stands.
18. As an SNU student, I want to decline an activation from the card, and to see the Parties I declined under `다른 활성 파티`, so that I can still join them later.
19. As an SNU student, I want my past plans under `지난 일정`, so that I can look back.

### 초대

20. As an invited SNU student, I want each invitation to show when and where it is and who else is coming, so that I can decide without opening it.

### The room (파티 열기)

21. As a Holder, I want the room of a private Quest to show its text only, without a link to a post, so that it reads as a private plan.
22. As a Holder, I want the event card below the activation, and the tags under the text, so that the room follows the wireframe.
23. As a member, I want each member's line to say how far they are on foot from our next place, or that they are there, so that I know when they arrive.
24. As a Leader, I want to see the note a User wrote with a join request, so that I can decide.
25. As a Leader, I want an invited Friend shown as `응답 대기` with `초대 취소`, so that I see who has not answered.
26. As a Leader, I want to delete a step of the plan at once, so that editing the plan is quick.
27. As a Leader, I want the sheet for ending a private Quest to say only that it disappears, and, while it is switched on, that location sharing stops at once, so that I know what ending does.
28. As a member, I want `파티 채팅`, so that we can talk inside the room.

### The form

29. As an SNU student, I want to add a photo from the camera or the album, so that my post shows what it is about.
30. As an SNU student, I want to pick the related event under the tabs 진로, 이벤트 and 축제, and have the title, place and time filled from it, so that a post for an event is quick.
31. As an SNU student, I want to add tags from my own or type new ones, so that my post is found and recommended.
32. As an SNU student, I want to search the boards and see how many posts each has when I choose one, so that I choose well.
33. As an SNU student, I want to set the capacity for a private Quest too, so that I can plan for more Friends.
34. As an SNU student, I want to change the time, the place and the event when I edit, so that I can fix a plan.
35. As an SNU student, I want the toast after posting to say how many Friends I invited, so that I know they were asked.

### Quests

36. As an SNU student, I want a Quest in the list shown as public or private by the Quest itself, with its own title, so that it does not change look when a Party is switched on.
37. As an SNU student, I want `공개 파티 · {n}명` to count the Quest's Holders, and `· 활성화 중` added to public and private ones while switched on, so that the line is right.
38. As an SNU student, I want Quests without a time left out of the Quest list and its counts, so that the list shows only what is planned.

## Implementation Decisions

### Words

- In the app, a 파티 card, post and room is a **Quest**. `공개 파티` is an Open or an Approval Quest, posted on a Board; `비공개 파티` is a Closed Quest. **활성화** is a **Party**: the members of a Quest who share their locations now. The code and the server keep these names.
- The Meetup is retired: a 비공개 파티 takes its place. GLOSSARY.md marks Meetup as retired, states the mapping of 공개/비공개 to the Join Policy, and drops the Meetup from the example of a Shared Quest.

### Retiring the Meetup

- Both entries open the form (`party-form`) preset to 비공개 with the Friend invited: the action `meetup` of a Friend's card on the map (`screens/main/main-screen.tsx`, built in `features/map/adapter.ts`) and the button of the Friend's panel (`screens/main/friend-panel.tsx`). Making it posts a Closed Quest and invites the Friend (`POST /quests/own`, `POST /quests/:questId/invitations`), as the form does now.
- The Meetup code is **deleted** in the app and on the server. A commit that holds all of it, `2f4f201` on `2.0/Main`, is recorded here and in ticket 01's PR, so that it can be brought back with git. Ticket 01 lists every file:
  - app: the route `meetup/[friendId]`, `screens/meetup/*`, the Meetup cards and `보낸 초대` of `screens/party/invites-meetups.tsx`, `features/meetups/*`, the client's Meetup operations and their mock, the Meetup rows of 알림, the `meetups-changed` live key, and the Meetups in the count of `초대`;
  - server: `MeetupsModule`, the Meetup parts of the Friends service, the demo data and the demo seed, the Meetup e2e tests and the Meetup checks of other e2e tests;
  - elsewhere: the Meetup step of `flow-tests`, the admin's friendship-ending text, and the Meetup in the READMEs (root, `mobile`, `main-server`, `socket-server`, `admin`, `flow-tests`).
- Code named after the Meetup that other features use stays: `MeetupPlace` (renamed), the place picker (used by the timetable), and the mock's former Meetup Quest, which moves into the Quest mock data. The server's Sub Quest helpers live in `src/quests/` and are untouched.
- The Prisma model, the enum and the table stay, and no migration is added. Rows already stored stay unread. A Meetup accepted before is a Closed Quest and keeps showing as a 비공개 파티.

### What changes, screen by screen

Every item is drawn in the wireframe; nothing is added beyond it. "Mock" marks a part that the server cannot give yet (see Mocks).

- **찾기**: the official banner carousel (`공식 · {org}`, ‹ ›, play and pause, `n / N`, `+` to `공식`, turning every 4 s) — mock; search over title, text, place and tags (tags mock); order by tag overlap — mock; the card's photo — mock; up to three faces and `{name} 외 {n}명 · 친구 {k}명 포함` — faces and names mock, the Friend count from the app; `관심 없음` with `참여하기` and `숨긴 파티 {n}개 · 다음 추천에 반영할게요` — mock; `같이 할 사람을 찾는 중` — mock.
- **전체 파티**: the tabs `공식` and `일반`; `공식` lists official recruiting — mock.
- **A board**: the badge `내 파티` or `참여 중` before the title; the User's own post opens the post.
- **파티 모집글**: photo with caption and tags — mock; faces in the members line — mock; `추천 이유` with `관심사` (mock), `시간대` (from the User's timetable) and `친구` (from the Friends); `관심 없음` beside `참여하기`.
- **Join sheet**: the note says that the members share their locations once someone switches the Party on (see Activation).
- **내 파티**: the kind as an icon with `공개 파티` or `비공개 파티`; the status `멤버 {n}명`, `모집 중 · {n}/{cap}명 · 초대 {k}명 대기`, `{n}명 · 초대 {k}명 대기` for a private one, `활성화 중 · {n}명 위치 공유` or `응답 대기`; the activation strip with `거절` and `참여`, and the declined state `활성화 중 · 참여하지 않는 중`; the group `다른 활성 파티` for declined activations, read from the decline kept on the phone; the group `지난 일정` — mock.
- **초대**: each card shows `{when} · {where} · {names} 함께` — mock until the invitation carries them.
- **The room**: `모집글 보기` only for a public Quest; the text only for a private one; tags — mock; the event card below the activation box; a member's `위치 공유 중 · {place}까지 도보 {n}분` or `{place}에 있어요`, from the members' positions and the walking route; a request's note — mock; an invited Friend as `응답 대기`; a step deleted at once, without the confirm sheet; the Leader's ending sheet `파티가 사라져요.` for a private Quest, and `활성화 중이라 위치 공유도 바로 멈춰요.` added while switched on; the text of the sheet that switches to another Party; `파티 채팅` with `파티에 메시지 보내기` — mock.
- **The form**: `사진` (카메라, 앨범, remove) — mock storage; the event picker's tabs 진로, 이벤트, 축제, and a picked event fills the title `{event} 같이 가요`, its place and time (tags mock); `태그` with the User's tags and `직접 입력` — mock; `인원` for 비공개 too; `언제`, `어디서` and `관련 행사` when editing; the board sheet's search and `모집글 {n}`; the toast `파티를 올렸어요 · {n}명에게 초대 요청`.
- **Quests** (the list on the map and `MainQuests`): tone and icon from the Quest's Join Policy, not its Party's; the Quest's own title; `공개 파티 · {n}명` counts the Holders; `· 활성화 중` for public and private; Quests without a time left out of the list and its counts. `내 파티` keeps its own group `시간 미정`, as `PartyMine` draws it.

### Rules

- **Capacity** stays within the server's 1 to 8, for public and private alike. The wireframe's 2 to 12 is not followed. The form's lower bound is the Quest's current Holders plus the Friends invited in the form, and at least 1, so that a form opened from a Friend's card can always be sent.
- **Activation**: any Holder switches a Quest's Party on, and any member leaves it or comes back. Ending it for everyone (`활성화 끄기`) stays with the Leader, as the server has it. The wireframe gives switching on to the Leader only; the app's wording says "멤버가" where the wireframe says "파티장이".
- **Kept although the wireframe does not draw them**, because each uses a server feature: the chips `바로 참여` and `승인 후 참여` of a public Quest; asking to join and withdrawing the request; the room's `수정`; the switch `내 위치 공유`; marking a step done; handing over the Leader's role; tapping a member to move the map to them; the count of join requests on a card of 내 파티.

### Mocks

- Each part the server cannot give has a mock adapter of its own behind the API client. When an endpoint arrives, only the client changes.
- The mock build (Expo Go, the web, tests) shows every mocked part. The build connected to the server shows the mocked photos, tags, hiding a post, 파티 채팅 and past Quests, like the Friends' statuses and 오늘의 발자국 today, but **hides every mocked part that would state something false about real people or real Quests**: members' names and faces in summaries, an invitation's time, place and companions, a join request's note, `같이 할 사람을 찾는 중` and official recruiting. A real member is never shown beside an invented one, and a real request or invitation never carries invented words.
- A server Quest gets its mocked photo and tags by a stable hash of its id, so that the same Quest always looks the same.
- What a User enters into a mocked part (a photo, tags, a chat message, `관심 없음`) is kept on the phone only and is not seen by others. The spec and the to-do list say so, and ticket 08 lists the endpoints that would replace each mock.
- The mocked parts: official recruiting; photos; tags (search, ordering, `관심사`); hiding a post; people looking for company; members' names and faces in the recruiting and invitation summaries, an invitation's companions included (ticket 02); an invitation's time and place (ticket 05); a request's note; 파티 채팅; past Quests.

### Tickets

Branches `2.0/P06-<NN>-<slug>`, each with its own PR to `2.0/Main`. The files are under `issues/`.

1. Retire the Meetup; a plan with a Friend is a 비공개 파티. Blocked by none.
2. The mocked parts of a Quest: photos, tags and members' faces (a prefactor). Blocked by none.
3. 찾기, 전체 파티, the boards and 파티 모집글. Blocked by 02.
4. The form for making and editing. Blocked by 02.
5. 내 파티 and 초대. Blocked by 01 and 02.
6. The room. Blocked by 02.
7. The Quest list on the map and `MainQuests`. Blocked by none.
8. The endpoints the server needs (documents only). Blocked by 02 to 06.

## Testing Decisions

- A good test drives a screen as a User would and checks what is shown, against the mock API, as the screen tests of Iteration 1 do. It does not inspect component internals.
- Covered behaviour: both Friend entries open the form as 비공개 with the Friend invited, and making it invites that Friend; 초대 and 알림 show no Meetup; each new part of 찾기, the post, 내 파티, 초대, the room and the form shows its wireframe states against the mocks; the Quest list's tone, title, count and the leaving out of Quests without a time.
- Server: the e2e suite passes with the Meetup module taken out.
- Screenshots of each screen against the wireframe go under Test Results of each PR. Screens with the native map need a phone or 함재현's build.
- Prior art: the screen tests of P13 and P14 in Iteration 1.

## Out of Scope

- New server endpoints. Ticket 08 lists them for the server's owner.
- Capacity above 8.
- Switching on limited to the Leader.
- Deleting the Meetup's table or its stored rows. The table's foreign keys to `users` are `ON DELETE RESTRICT`; when deleting an account arrives, the table has to be dropped or its keys changed.
- Shared Quest updates (Iteration 3, P6).
- The wireframe's `(비활성)` artboards: `MainPrivatePin`, `MainLongPress` and the `PrivateEvent` ones.

## Further Notes

- 안진영 builds every ticket. 함재현 checks the screens on the shared Android phone and the Mac.
- 함재현 reviews the server part of ticket 01.
- Departures from the Iteration 1 documents: P14's Meetup is retired; P13's form made a private Quest with capacity 8 and showed 인원 for public ones only, and both change here.
- The wireframe keeps changing; each ticket rereads its artboards before it starts.
