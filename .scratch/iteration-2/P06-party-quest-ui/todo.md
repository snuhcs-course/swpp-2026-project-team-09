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

| Part                                                                              | Screens                                                | Replaced by ([ticket 08](server-endpoints.md))                                                         |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Official recruiting (_hidden on server_)                                          | 찾기 banner, 전체 파티 › 공식                          | [1. Official recruiting](server-endpoints.md#1-official-recruiting)                                    |
| Photos                                                                            | card, post, form                                       | [2. Photos](server-endpoints.md#2-photos)                                                              |
| Tags                                                                              | search, ordering, post, room, form, 추천 이유 › 관심사 | [3. Tags](server-endpoints.md#3-tags-the-users-and-a-quests)                                           |
| Hiding a post (`관심 없음`)                                                       | 찾기, post                                             | [4. Hiding a post](server-endpoints.md#4-hiding-a-post)                                                |
| People looking for company (_hidden on server_)                                   | 찾기                                                   | [5. People looking for company](server-endpoints.md#5-people-looking-for-company)                      |
| Members' names and faces in summaries (_hidden on server_)                        | 찾기 card, post, 초대                                  | [6. Members' names and faces in summaries](server-endpoints.md#6-members-names-and-faces-in-summaries) |
| An invitation's time and place (_hidden on server_; companions are the row above) | 초대                                                   | [7. An invitation's time and place](server-endpoints.md#7-an-invitations-time-and-place)               |
| A join request's note (_hidden on server_)                                        | room › 신청                                            | [8. A join request's note](server-endpoints.md#8-a-join-requests-note)                                 |
| 파티 채팅                                                                         | room                                                   | [9. 파티 채팅](server-endpoints.md#9-파티-채팅)                                                        |
| Past Quests (`지난 일정`, _hidden on server_)                                     | 내 파티                                                | [10. Past Quests](server-endpoints.md#10-past-quests)                                                  |
| An event's kind (진로, 이벤트, 축제) and tags, read from its words                | form › 관련 행사                                       | [13. An event's kind](server-endpoints.md#13-a-global-events-kind-and-tags)                            |
| Changing a Quest's 관련 행사 (_not possible yet_: locked in the form)             | form                                                   | [12. Changing a Quest's 관련 행사](server-endpoints.md#12-changing-a-quests-global-event)              |

Ticket 02 adds the photos, the tags and the members' faces behind the API client (`mobile/src/api/quest-parts/`, one adapter for each, data in `mobile/src/api/mock/data/quest-parts.ts`). The screens read them as follows:

| Part (field)                                                | Read by                                                                          |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------- |
| A Quest's photo (`photo`)                                   | 찾기 card, 파티 모집글, the form                                                 |
| A Quest's tags (`tags`)                                     | 찾기 search and ordering, 파티 모집글 and 추천 이유 › 관심사, the room, the form |
| Members' names and faces (`faces`; _leader only on server_) | 찾기 card, 파티 모집글 members line, 초대 card (companions)                      |
| The User's tags (`listMyTags`: the profile's hashtags)      | the form's `태그`, 찾기 ordering, 추천 이유 › 관심사                             |

Ticket 05 adds three more adapters in the same folder: `invitation-times.ts` and `invitation-places.ts` give an invitation's `startsAt` and `place` (null on server), and `past-quests.ts` gives `listPastQuests` (data in `mobile/src/api/mock/data/past-quests.ts`; none on server). 초대's card reads all three invitation parts; 내 파티 reads the past Quests under `지난 일정`.

A server Quest's photo and tags are picked from the mock's sets by a stable hash of its id. The photo and tags the User enters for a Quest they make (`makeQuest`, `changeQuest`) are kept on the phone (`snunow.quest-entries`) and come back with that Quest. The mock build's User, whose profile has no hashtags, gets the frame's tags.

Ticket 03 adds one adapter each for official recruiting (`official.ts`: `listOfficialRecruiting`, `joinOfficialRecruiting`), hiding a post (`hidden-posts.ts`: `listHiddenPosts`, `hidePost`) and the people looking for company (`seekers.ts`: `listCompanionSeekers`, `askCompanionSeeker`), data in `mobile/src/api/mock/data/finding.ts`. The build that asks the main server gets no official recruiting and nobody looking for company. Joining, hiding and asking are kept on the phone (`snunow.joined-official`, `snunow.hidden-posts`, `snunow.asked-seekers`, each keyed by the User's id). `추천 이유` reads the User's tags (`관심사`), the timetable (`시간대`) and the Friends (`친구`).

Ticket 04 adds two more. The main server's Global Event has no kind and no tags, so the form's event picker reads both from the event's title and description (`mobile/src/features/party/event-kinds.ts`). The main server cannot change a Quest's Global Event, so editing shows a Quest's own event locked, and for a Quest without one an event picked only fills the time, the place and the tags; ticket 08 lists the endpoint that would change it.

Ticket 06 adds the room's two parts the same way (`notes.ts` and `chat.ts` in `mobile/src/api/quest-parts/`, data in `mobile/src/api/mock/data/room-parts.ts`): `listJoinRequests` carries a `note`, one of the mock's by the request's id in the mock build and null on server; `listPartyChat` and `sendPartyChat` give the room's 파티 채팅, the frame's conversation for the mock's `q-ai` in the mock build and an empty room on server. What the User sends is kept on the phone for the signed-in User (`snunow.party-chat.<userId>`), and nothing while no User is signed in.

Kept on the phone and not mocked: declining an activation (`다른 활성 파티`); [11. A declined activation](server-endpoints.md#11-a-declined-activation-stored-on-the-server) stores it on the server.

## 3. Device checks (함재현)

- [ ] Each ticket's screens with the native map on the shared Android phone
- [ ] Taking a photo and picking one from the album (ticket 04)

## 4. People

- [ ] 함재현 reviews the server part of ticket 01
- [ ] 윤유상 receives ticket 08's list of endpoints

## 5. Design: to settle

- The wireframe says the 파티장 switches a Party on; the app lets any Holder (spec, Rules).
- The wireframe's 인원 goes to 12; the app stays at 1 to 8.
