# P06 to-do list (Iteration 2)

Updated 2026-10-17. Spec: [spec.md](spec.md). Wireframe version `1792227848-fc09`.

## 1. The work, in order (frontend: 안진영)

- [ ] 01 Retire the Meetup (app and server, commented out); both Friend entries open the 비공개 form
- [ ] 02 The mocked parts of a Quest: photos, tags, members' faces
- [ ] 03 찾기, 전체 파티, the boards and 파티 모집글
- [ ] 04 The form for making and editing
- [ ] 05 내 파티 and 초대
- [ ] 06 The room
- [ ] 07 The Quest list on the map and `MainQuests`
- [ ] 08 The endpoints the server needs (documents only)

## 2. Mock now, server later

What the app shows from its own mock in every build. Anything a User enters here stays on the phone.

| Part                                    | Screens                                                | Replaced by (ticket 08) |
| --------------------------------------- | ------------------------------------------------------ | ----------------------- |
| Official recruiting                     | 찾기 banner, 전체 파티 › 공식                          |                         |
| Photos                                  | card, post, form                                       |                         |
| Tags                                    | search, ordering, post, room, form, 추천 이유 › 관심사 |                         |
| Hiding a post (`관심 없음`)             | 찾기, post                                             |                         |
| People looking for company              | 찾기                                                   |                         |
| Members' names and faces in summaries   | 찾기 card, post                                        |                         |
| An invitation's time, place, companions | 초대                                                   |                         |
| A join request's note                   | room › 신청                                            |                         |
| 파티 채팅                               | room                                                   |                         |
| Past Quests (`지난 일정`)               | 내 파티                                                |                         |

Kept on the phone and not mocked: declining an activation (`다른 활성 파티`).

## 3. Device checks (함재현)

- [ ] Each ticket's screens with the native map on the shared Android phone
- [ ] Taking a photo and picking one from the album (ticket 04)

## 4. People

- [ ] 윤유상 reviews the server part of ticket 01
- [ ] 윤유상 receives ticket 08's list of endpoints

## 5. Design: to settle

- The wireframe says the 파티장 switches a Party on; the app lets any Holder (spec, Rules).
- The wireframe's 인원 goes to 12; the app stays at 1 to 8.
