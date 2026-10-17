# P06 to-do list (Iteration 2)

Updated 2026-10-17. Spec: [spec.md](spec.md). Wireframe version `1792227848-fc09`.

## 1. The work, in order (frontend: 안진영)

- [ ] 01 Retire the Meetup (app and server, deleted; restore from `2f4f201`); both Friend entries open the 비공개 form
- [ ] 02 The mocked parts of a Quest: photos, tags, members' faces
- [ ] 03 찾기, 전체 파티, the boards and 파티 모집글
- [ ] 04 The form for making and editing
- [ ] 05 내 파티 and 초대
- [ ] 06 The room
- [ ] 07 The Quest list on the map and `MainQuests`
- [ ] 08 The endpoints the server needs (documents only)

## 2. Mock now, server later

What the app shows from its own mock. The build connected to the server hides the rows marked _hidden on server_, which would state something false about real people or real Quests. Anything a User enters here stays on the phone.

| Part                                                                              | Screens                                                | Replaced by (ticket 08) |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------- |
| Official recruiting (_hidden on server_)                                          | 찾기 banner, 전체 파티 › 공식                          |                         |
| Photos                                                                            | card, post, form                                       |                         |
| Tags                                                                              | search, ordering, post, room, form, 추천 이유 › 관심사 |                         |
| Hiding a post (`관심 없음`)                                                       | 찾기, post                                             |                         |
| People looking for company (_hidden on server_)                                   | 찾기                                                   |                         |
| Members' names and faces in summaries (_hidden on server_)                        | 찾기 card, post, 초대                                  |                         |
| An invitation's time and place (_hidden on server_; companions are the row above) | 초대                                                   |                         |
| A join request's note (_hidden on server_)                                        | room › 신청                                            |                         |
| 파티 채팅                                                                         | room                                                   |                         |
| Past Quests (`지난 일정`)                                                         | 내 파티                                                |                         |
| An event's kind (진로, 이벤트, 축제) and tags, read from its words                | form › 관련 행사                                       |                         |
| A Quest's 관련 행사 changed when editing (_kept on the phone_)                    | form, room, 찾기                                       |                         |

Ticket 02 adds the photos, the tags and the members' faces behind the API client (`mobile/src/api/quest-parts/`, one adapter for each, data in `mobile/src/api/mock/data/quest-parts.ts`). The screens read them as follows:

| Part (field)                                                | Read by                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A Quest's photo (`photo`)                                   | 찾기 card, 파티 모집글, the form                                                 |
| A Quest's tags (`tags`)                                     | 찾기 search and ordering, 파티 모집글 and 추천 이유 › 관심사, the room, the form |
| Members' names and faces (`faces`; _leader only on server_) | 찾기 card, 파티 모집글 members line, 초대 card (companions)                      |
| The User's tags (`listMyTags`: the profile's hashtags)      | the form's `태그`, 찾기 ordering, 추천 이유 › 관심사                             |

A server Quest's photo and tags are picked from the mock's sets by a stable hash of its id. The photo and tags the User enters for a Quest they make (`makeQuest`, `changeQuest`) are kept on the phone (`snunow.quest-entries`) and come back with that Quest. The mock build's User, whose profile has no hashtags, gets the frame's tags.

Ticket 04 adds two more. The main server's Global Event has no kind and no tags, so the form's event picker reads both from the event's title and description (`mobile/src/features/party/event-kinds.ts`). The main server cannot change a Quest's Global Event, so the 관련 행사 chosen when editing is kept on the phone with the photo and the tags (`changeQuest`'s `event`) and shows instead of the Quest's own.

Kept on the phone and not mocked: declining an activation (`다른 활성 파티`).

## 3. Device checks (함재현)

- [ ] Each ticket's screens with the native map on the shared Android phone
- [ ] Taking a photo and picking one from the album (ticket 04)

## 4. People

- [ ] 함재현 reviews the server part of ticket 01
- [ ] 윤유상 receives ticket 08's list of endpoints

## 5. Design: to settle

- The wireframe says the 파티장 switches a Party on; the app lets any Holder (spec, Rules).
- The wireframe's 인원 goes to 12; the app stays at 1 to 8.
