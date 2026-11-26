# 13: Coming back to the request from the map, the Quest list and the push

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-resume` 3 to 5
Status: needs-info
Blocked by: 12; the server's ticket 08 (`GET /library/room-requests/:id/answer`, `Quest.roomRequest`), which is not built yet

Native files: none. Releases: with ticket 16.

## What to build

- **The map's Quest tag** for the request's booking party: "관정 그룹스터디룸 내일 15:00" (the time in the time colour).
  - Its second line is the consent count: "동의 1/3 · 기다리는 중", and "모두 동의 · 예약하기" once all have consented.
  - The Quest list shows the same line.
  - The count comes from the Quest's `roomRequest {id, status, consented, asked}` (ticket 08). Whether a glass tag may carry a second line under PR 572's rule is checked against the boards first.
- **Opening it:** a tap on the tag or the list line, the push "모두 동의했어요" (`room-agreed`), or "박민수 님이 빠졌어요" (`room-declined`). Each opens `/main?card=party:<questId>`. The app then rebuilds the same answer, frame and card from `GET /library/room-requests/:id/answer`, with `group.request` filled.
- **Until ticket 08 is there**, the phone that sent the request keeps the answer itself, as today's waiting room keeps its card (`library/room-bookings.ts`). The answer is kept with the request's id and rebuilt from there. Another phone cannot open it until ticket 08.

## Acceptance criteria

- [ ] The tag shows "관정 그룹스터디룸 내일 15:00" over "동의 1/3 · 기다리는 중", and over "모두 동의 · 예약하기" when ready. (Unit test of the map card.)
- [ ] A tap on the tag, and the push link, open the answer with its time card, mark and locked ticket and the request's line. (Integration test, with the kept answer and with ticket 08's answer.)
- [ ] After a booking the tag is an ordinary Quest mark. (Unit test.)
- [ ] Whole lint, format and types.

## Comments
