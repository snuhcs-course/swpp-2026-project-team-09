# 09: Group-room requests: booking party, consent and companions

Parent: [P06 spec](../spec.md) ("Group study rooms: the room request")
Status: ready-for-agent
Blocked by: 01, 07, 08

## What to build

"내일 3시 4층 스터디룸 민수, 지은이랑" books a group study room as a 파티. From the book card, "동의 요청 보내기" makes a booking party (a Closed Quest) and invites the Friends, or asks the Holders of an existing Quest the User holds. Each companion is asked "{name}님의 학번이 필요해요. 제공해도 될까요?" with the registered name and 학번 that will be sent, every time. When all consent, the booker's 예약하기 enables, the phone fetches the companions' details, checks them with the library and books. A decline dissolves a party made for the booking but never an existing one, and everyone sees "파티 구성원이 제안을 거절했습니다". A companion the library rejects is asked to check their 내 정보 without starting over. A 학번 reaches only the booker's phone, only for that booking, and never the AI.

It reads 학번 and registered names from ticket 01, checks the key with ticket 07's condition code, and extends ticket 08's room book card.

## Acceptance criteria

- [ ] `RoomRequest` and `RoomConsent` tables as in the spec, with a migration.
- [ ] `POST /library/room-requests { key, friendIds | questId }` re-checks the key's conditions with the same code as `proposeLibraryBooking` (catalogue, window, capacity) and that the ids are the User's Friends or the Quest's Holders. With `friendIds` it makes the Closed Quest "관정 {space} 예약" led by the User, one Sub Quest at Place 62-1 from start to end, and a `QuestInvitation` per Friend; with `questId` it makes no Quest.
- [ ] Consenting accepts the invitation (unchanged acceptance) and sets `consented`; the consent is for this request only. With no 학번 or registered name, the dialog asks for them and saves them to 내 정보 first.
- [ ] A decline (거절, or declining the invitation) sets `dissolved`, deletes the Quest and its invitations only when `madeForBooking`, and never deletes or changes an existing Quest. Every member and invitee gets the one-time main-screen notice, and the booker's card shows it.
- [ ] When every consent is in, the status is `ready`; the booker's card polls `GET /library/room-requests/:id` and enables 예약하기 on "모두 동의했어요".
- [ ] `GET /library/room-requests/:id/companions` answers `[{ userId, registeredName, studentNumber }]` only to the requester and only while `ready`; anyone else or any other status is 403/409.
- [ ] On 예약하기 the phone runs `getUserCheck` per companion, builds `sMemberJsInfo` with the applicant first then the library's NAME and SCHOOLNO, sends `setRoomBooking`, and reports `POST …/:id/result { ok, failedUserId? }` with no library data. `ok` sets `booked` and members see "{booker}님이 {space} {date time} 예약을 마쳤어요".
- [ ] A rejected companion: `failedUserId` set, back to `gathering` for that member, who is asked to check 학적상 이름 and 학번 with 확인했어요 and 거절; the booker's card says "{name}님의 정보를 도서관에서 확인하지 못했어요. 확인을 요청했어요." A room or time message keeps the request `ready` and is shown.
- [ ] A request not `booked` at its start becomes `expired` and a booking party made for it is deleted. `RoomConsent` rows are deleted at every final status.
- [ ] **Privacy:** 학번 is never copied into a request row; it is read from `users` only to build the companions reply. No other reply, no log line (the HTTP logging omits the companions body) and no Assistant input holds a 학번 or a registered name. The room request endpoints are the app's, never the model's tools.
- [ ] Tests, named by ADR 0007:
  - integration (server): consent; a decline dissolving a booking party but not an existing Quest; companions only for the requester while `ready` and absent from every other reply; expiry; `failedUserId` back to `gathering`; no 학번 in any log line, by capturing the logger;
  - integration (app, against the mocks and the fake library): the consent dialog (including asking for missing details), the dissolve notice, ready enabling 예약하기, the `sMemberJsInfo` order with hyphen-free 학번, the rejected-companion message, and no write before the confirm press (M4).
- [ ] No native file changes beyond ticket 04's (CLAUDE.md § The app's native files).
