# 09: Group-room requests: booking party, consent and companions

Parent: [P06 spec](../spec.md) ("Group study rooms: the room request")
Status: ready-for-human
Blocked by: 01, 07, 08

## What to build

"내일 3시 4층 스터디룸 민수, 지은이랑" books a group study room as a 파티. From the book card, "동의 요청 보내기" makes a booking party (a Closed Quest) and invites the Friends, or asks the Holders of an existing Quest the User holds. Each companion is asked "{name}님의 학번이 필요해요. 제공해도 될까요?" with the registered name and 학번 that will be sent, every time. When all consent, the booker's 예약하기 enables, the phone fetches the companions' details, checks them with the library and books. A decline dissolves a party made for the booking but never an existing one, and everyone sees "파티 구성원이 제안을 거절했습니다". Leaving or being removed from the party, the party being deleted, unfriending and withdrawing consent count as a decline, and a Holder who joins later must consent before the booking can be sent. A party holds at most 8 people, so 9 or more, and G201 (20인실), are refused. Cancelling the booked room on the phone tells the server, so the booking party stops blocking the companions' Free Time. A companion the library rejects is asked to check their 내 정보 without starting over. A 학번 reaches only the booker's phone, only for that booking, and never the AI.

It reads 학번 and registered names from ticket 01, checks the key with ticket 07's condition code, and extends ticket 08's room book card.

## Acceptance criteria

- [x] `RoomRequest` and `RoomConsent` tables as in the spec, with a migration.
- [x] `POST /library/room-requests { key, friendIds | questId }` re-checks the key's conditions with the same code as `proposeLibraryBooking` (catalogue, window, capacity, at most 8 people so at most 7 `friendIds`, never G201) and that the ids are the User's Friends or the Quest's Holders. With `friendIds` it makes the Closed Quest "관정 {space} 예약" led by the User, one Sub Quest at Place 62-1 from start to end, and a `QuestInvitation` per Friend; with `questId` it makes no Quest. More than 8 people is a 400 with "파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요".
- [x] Consenting accepts the invitation (unchanged acceptance) and sets `consented`; the consent is for this request only. With no 학번 or registered name, the dialog asks for them and saves them to 내 정보 first.
- [x] A decline (거절, or declining the invitation) sets `dissolved`, deletes the Quest and its invitations only when `madeForBooking`, and never deletes or changes an existing Quest. Every member and invitee gets the one-time main-screen notice, and the booker's card shows it.
- [x] While `gathering` or `ready`, each of these counts as a decline (`dissolved`, the notice, the booking party deleted): a companion (consented or not) leaving the party or being removed (`DELETE quests/:questId/holders/:userId`), the booker leaving the existing Quest of a `questId` request, the party being deleted, unfriending between a companion and the booker either way, and a withdrawn consent.
- [x] A Holder who joins after the request was made gets a `RoomConsent` and the consent notice; the request goes back to `gathering` and 예약하기 stays disabled until they consent. Going outside the capacity or the 8-people limit dissolves it with the reason.
- [x] When every current Holder other than the booker has consented, the status is `ready`; the booker's card polls `GET /library/room-requests/:id` and enables 예약하기 on "모두 동의했어요".
- [x] `GET /library/room-requests/:id/companions` answers `[{ userId, registeredName, studentNumber }]` only to the requester and only while `ready`, and only for people who are current Holders of the party and have consented to this request, checked when the reply is built; anyone else or any other status is 403/409.
- [x] On 예약하기 the phone runs `getUserCheck` per companion, builds `sMemberJsInfo` with the applicant first then the library's NAME and SCHOOLNO, sends `setRoomBooking`, and reports `POST …/:id/result { ok, failedUserId? }` with no library data. `ok` sets `booked` and members see "{booker}님이 {space} {date time} 예약을 마쳤어요".
- [x] A rejected companion: `failedUserId` set, back to `gathering` for that member, who is asked to check 학적상 이름 and 학번 with 확인했어요 and 거절; the booker's card says "{name}님의 정보를 도서관에서 확인하지 못했어요. 확인을 요청했어요." A room or time message keeps the request `ready` and is shown.
- [x] Cancelling a booked room: the phone keeps the BSEQNO with the request id in a local map (AsyncStorage, never sent); after `setCancelBooking` succeeds for that BSEQNO (ticket 08's cancel card, or 내 예약), it calls `POST /library/room-requests/:id/cancelled` with no body. Allowed only for the requester while `booked`, idempotent. The status becomes `cancelled`, a booking party made for it is deleted with its Sub Quest (so it no longer blocks the companions' Free Time), an existing Quest is unchanged, and members see "{booker}님이 {space} {date time} 예약을 취소했어요".
- [x] A request not `booked` at its start becomes `expired` and a booking party made for it is deleted. `RoomConsent` rows are deleted at every final status.
- [x] **Privacy:** 학번 is never copied into a request row; it is read from `users` only to build the companions reply. No other reply, no log line (the HTTP logging omits the companions body) and no Assistant input holds a 학번 or a registered name. The room request endpoints are the app's, never the model's tools.
- [x] Tests, named by ADR 0007:
  - integration (server): consent; a decline dissolving a booking party but not an existing Quest; one test per case that counts as a decline (leaving, removal by `DELETE quests/:questId/holders/:userId`, the booker leaving the existing Quest of a `questId` request, the party deleted, unfriending by either side, a withdrawn consent), each giving `dissolved` and the notice; a Holder joining later blocking the booking until they consent; companions only for the requester while `ready`, never for someone who left or was removed after consenting, and absent from every other reply; 8 people accepted, 9 refused, G201 refused; `cancelled` only from the requester while `booked`, deleting a booking party and freeing its members' Free Time (checked through `UserDayService`); expiry; `failedUserId` back to `gathering`; no 학번 in any log line, by capturing the logger;
  - integration (app, against the mocks and the fake library): the consent dialog (including asking for missing details), the dissolve notice, ready enabling 예약하기, the `sMemberJsInfo` order with hyphen-free 학번, the rejected-companion message, the cancel report after `setCancelBooking` with no library data in it, and no write before the confirm press (M4).
- [ ] **Person**, on one real phone against the real site: one group-room booking through a booking party with a real consenting companion (`getUserCheck`, then `setRoomBooking` with that companion in `sMemberJsInfo`), and its cancel, which reports `cancelled`. Recorded with screenshots in the PR.
- [x] No native file changes beyond ticket 04's (CLAUDE.md § The app's native files).

## Comments

- 2026-11-02: the server code is in `main-server/src/library/` (routes `library/room-requests…` and `library/room-notices/:id/seen`), the app's in `mobile/src/api/room-requests.ts`, `mobile/src/screens/main/library/room-party.tsx`, `mobile/src/screens/main/room-consent.tsx` and `mobile/src/library/room-bookings.ts`.
- Beyond the spec's columns: `RoomRequest` also has `startsAt` (for the expiry query) and `reason` (why it was dissolved, shown on the booker's card), and a third table, `RoomNotice`, holds the one-time main-screen notices until `POST /library/room-notices/:id/seen`. `GET /library/room-requests` answers `{ asks, notices }` for the main screen. `POST /library/room-requests` takes an `Idempotency-Key` and an optional `useDesc`.
- The decline cases are found by `RoomRequestSync`, which the Quests' and Friends' services call once their change is stored (drop, removal, end, invitation accept/decline/cancel, joining, join-request accept, unfriending). A cancelled invitation counts as a decline too.
- Nothing runs on a schedule, so expiry happens when any room request route is read next (the main screen polls `GET /library/room-requests` every 15 s).
- The main server has no HTTP request logging, so the companions body is in no log line by construction; the logger-capture test (`test/room-request-privacy.integration.test.ts`) checks every log line and every other reply of a full flow.
- The wireframes (version 1793520134-8f7e, unchanged) have no consent frame, so the dialog follows the invitation's answers. The notices are toasts on the main screen.
- A companion who consented sees the request at the top of the main screen with 철회 (`POST …/decline`). 내 예약's cancel goes through the same confirm as the cancel card, so it reports too.
- The Person check stays open.

### Agent usage (2026-11-02)

- Agent time: about 3.5 h in one session (an estimate; much of it waiting on the test containers and Jest on a loaded machine).
- Tokens: not measurable from inside the session; roughly 9 M input (about 8.5 M of it cache reads, about 0.4 M cache writes) and 0.2 M output, no subagents (an estimate).
