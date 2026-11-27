# 68: The party sees the group study room the library booked

Parent: [P05 spec](../spec.md). The user's decision of 2026-11-27, on whether the booked room's number is shown on the Friends' phones: "그룹스터디룸? 그러면 당연히 보여줘야지" (option 가).
Status: ready-for-human
Blocked by: P10 ticket 08 (#647), whose `QuestDto.roomRequest` and migration this builds on. The app side is P01 ticket 14 (#657).

Native files: none. Releases: the main server, with one additive migration; the phones read it with the app's ticket 14.

## What changes

- **The report.** `POST /library/room-requests/:id/result` takes `room`, with `ok` only (else 400). It is the room the library booked as the library names it ("G412"), trimmed, 1–40 characters. The booker's phone, which alone reads the library, sends it with the booking. It is optional, so an app before it still books.
- **The time.** The booked time is the request's own date, start and minutes, which the booking used.
- **Kept.** It is stored in `room_requests.booked_room` (TEXT NULL, one additive migration with no backfill) at `booked`. A repeat `ok` that gives a room sets it.
- **Given to the party only:**
  - `RoomRequestDto.bookedRoom`, for the requester, the only one who reads the request once it is booked;
  - `QuestDto.bookedRoom`, the room of the Quest's latest booked request, a booking party's or an existing Quest's. Only Holders are shown a Quest, so a companion who went out sees nothing.
- **The companions' notice** names the room when the report carried one: "… 예약을 마쳤어요 · G412". The room is cut to 12 characters, with "…" past that, so the notice stays one line. Without a room the notice is as before. The other room notices are unchanged.
- **ADR 0012.** Its consequence "as "ok" or "failed" with no library data" is replaced by the sentence the user read and approved on 2026-11-27 ("둘다 권장으로 진행해."). Nothing else in the ADR changes.
- **Not done:** a start the library booked. The approved sentence says no other library data reaches the server, so a reported `start` waits for the user's word.

## Acceptance criteria

- [x] A booking reported with a room shows it to the requester and to every Holder, and a companion who declined can read neither the request nor the Quest. (Integration test, failing before the change.)
- [x] A booking without a room keeps it null, and a repeat that gives one sets it. (Integration test.)
- [x] A room with `ok: false`, an empty room and one of 41 characters are 400. (Integration test.)
- [x] The companions' notice names the room, cut past 12 characters, and is as before without one. (Integration test.)
- [x] The migration is the one `prisma migrate diff` gives from 647's schema.
- [x] README (Quests; Group study room requests). The whole of the main server's lint, format and types; the room request and Quest test files run locally.
