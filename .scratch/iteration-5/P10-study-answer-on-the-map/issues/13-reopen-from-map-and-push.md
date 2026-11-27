# 13: Coming back to the request from the map, the Quest list and the push

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-resume` 3 to 5
Status: ready-for-agent
Blocked by: 12; the server's ticket 08 (`GET /library/room-requests/:id/answer`, the request's `input`, `Quest.roomRequest`), being built on `5.0/P10-08-request-and-answer`

Native files: none. Releases: with ticket 16.

## What to build

- **The map's Quest tag** for the request's booking party: "관정 그룹스터디룸 내일 15:00" (the time in the time colour).
  - Its second line is the consent count: "동의 1/3 · 기다리는 중", and "모두 동의 · 예약하기" once all have consented.
  - The Quest list shows the same line.
  - The count comes from the Quest's `roomRequest {id, status, consented, asked}` (ticket 08). Whether a glass tag may carry a second line under PR 572's rule is checked against the boards first.
- **Opening it:** a tap on the tag or the list line, the push "모두 동의했어요" (`room-agreed`), or "박민수 님이 빠졌어요" (`room-declined`). Each opens `/main?card=party:<questId>`. The app then rebuilds the same answer, frame and card from `GET /library/room-requests/:id/answer`, with `group.request` filled.
- **Ticket 08's answer is the lasting way.** Only when the endpoint is missing (an older server) does the phone that sent the request fall back to the answer it kept, as today's waiting room keeps its card (`library/room-bookings.ts`).

## How it is built

- **The Quest's request:** `Quest.roomRequest` (`{ id, status, consented, asked }`, ticket 08) is in the app's type and parser. A main server before it sends none.
- **The words and the look** are in one file, `features/quests/room-request-flag.ts`, while the request is gathering or ready:
  - `requestFlagOf`: "관정 그룹스터디룸", the time, the day ("오늘", "내일", or the date), and "동의 1/3 · 기다리는 중" or "모두 동의 · 예약하기";
  - `requestLook`: the flag of a Quest made from a Plan, two lines over a dot: "관정 그룹스터디룸 15:00", the time in the time colour, over "내일 · 동의 1/3 · 기다리는 중". The design draws a glass tag with "관정 그룹스터디룸 내일 15:00" over the state; a tag has one line (PR 572), and a label with a time is at most 200 points wide, which cut the day and time, so the day goes on the second line. This file is the one place to change if the tag gets a second line.
  - Booked or ended, the Quest is drawn and listed as before.
- **The map:** the party's card carries `request`. `lookOf` draws its flag, the place groups leave it apart (as a made Quest's flag), and a press sets the party's address.
- **The lists:** the 파티 tab's card, the map's Quest list and the Quest list on the whole screen say "내일 15:00 · 동의 1/3 · 기다리는 중" in place of when and where, and a press opens the party's address.
- **The address** `/main?card=party:<questId>` (a press, or the pushes `room-agreed` and `room-declined`): `useAskedCard` asks the app's own turn (`askApp`) with the flag's words, answered by `GET /library/room-requests/:id/answer` (`requestAnswer`). The answer's `group.request.id` binds the card to its request (`PartyCard.requestId`), whose state it polls as when it was sent.
- **An older main server** answers the route 404: the phone that sent the request shows the answer it kept when sending (`keepRequestAnswer` in `library/room-bookings.ts`, the last eight), bound to the request. The mock does the same.

## Acceptance criteria

- [x] The tag shows "관정 그룹스터디룸 15:00" over "내일 · 동의 1/3 · 기다리는 중", and over "내일 · 모두 동의 · 예약하기" when ready; "오늘" for today. (Unit test of the map card.) It is the made Quest's flag, not a second line on the tag.
- [x] A tap on the tag, and the push link, open the answer from ticket 08's endpoint, with its time card, mark, locked ticket and the request's line. (Integration test.)
- [x] With the endpoint missing, the sending phone opens the answer it kept. (Integration test.)
- [x] After a booking the tag is an ordinary Quest mark. (Unit test.)
- [x] Whole lint, format and types.

## Comments
