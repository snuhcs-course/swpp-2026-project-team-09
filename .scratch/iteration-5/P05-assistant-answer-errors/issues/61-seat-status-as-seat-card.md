# 61: A question about free seats in a reading room gets the seat card

Parent: [P05 spec](../spec.md); the user's decision (2026-11-27): in the app that draws answers, "관정 열람실 자리 있어?" and "7층 자리 얼마나 남았어?" gave the old seats card in the chat, with two sentences pointing at a card, while "공부할 자리" gave the seat ticket with its free-seat count
Status: ready-for-human
Blocked by: nothing (tickets 57 and 58 merged)

Native files: none. Releases: the main server. Today's app already draws the book card as the seat ticket.

## What happened

- The answer app's rules (`LIBRARY_ANSWER_RULES`, and `LIBRARY_STUDY_RULES` for `study-plan`) shared the text chat's line "To see free seats or rooms of one space (좌석 현황), call findLibrarySpace, then showLibrarySeats".
- So a question about free seats went `findLibrarySpace` → `showLibrarySeats`, and the reply named the seats card in the chat. A request for a seat went `findLibrarySpace` → `proposeLibraryBooking`, whose book card the app draws as the seat ticket, with the free seats and the seat picture one press away.

## What changes

- **The rule, for an app that draws answers only.** A question about the free seats of a seat space (`unit: seat`), such as "관정 열람실 자리 있어?" or "7층 자리 얼마나 남았어?", and a request for its 좌석 현황 are asked as a request for that seat: `findLibrarySpace`, then `proposeLibraryBooking`, never `showLibrarySeats`.
  - The reply is one sentence in all: that nothing is booked until the User presses 예약하기, and to sign in first when 로그인 shows. It never names a card and never says how many seats are free.
  - A room space (`unit: room`) keeps `showLibrarySeats` for its free rooms: a room's book card needs a time, which the rules ask for.
- **Closed for today.** In the answer app, `proposeLibraryBooking` for today at or after the closing answers as `showLibrarySeats` does since ticket 57: `refused` with `closedToday` and no card, and 관정 drawn as the grey place with why (ticket 58). Before, it was refused by the hours alone, with no `closedToday` and no mark. The closed rule now sends a seat to `proposeLibraryBooking`, and a room's free rooms to `showLibrarySeats`.
- **The text chat is unchanged.** `LIBRARY_RULES` still sends 좌석 현황 to `showLibrarySeats`, and its `proposeLibraryBooking` after closing is refused by the hours as before. Its prompt and tools are byte for byte as before.
- The prompt of an app that draws answers changes on purpose. No test pins its hash or its whole text: `test/assistant-study-plan-rules.unit.test.ts` and `test/assistant-study-plan.integration.test.ts` compare it by the rules' own constants and need no change.

## Acceptance criteria

- [x] "관정 7층 자리 있어?" in the answer app: the prompt holds the rule, and `findLibrarySpace` → `proposeLibraryBooking` shows one book card (`book:7F-7A-zone2:…`) and no seats card. (Integration test, failing before the change.)
- [x] At 23:37 in the answer app, `proposeLibraryBooking` answers `closedToday` with the grey mark and no card; the text chat's is refused by the hours, with no `closedToday`. (Integration test, the first failing before the change.)
- [x] The answer rules say it, and the text chat's rules keep `showLibrarySeats`. (Unit test, failing before the change.)
- [x] The case `library-answer-seat-status` ("관정 7층 자리 있어?"), and `library-answer-closed-for-today` requires `proposeLibraryBooking` and forbids `showLibrarySeats`. Not run: no model key on this machine.
- [x] README; whole lint, format and types of the main server; the touched test files run locally.

## Comments

### Frozen cases

- The frozen P6 suite runs in the world `p6`, the text chat, so its seats cases (`p6-common-seats-one-space`) still hold. No frozen case runs in an app that draws answers.

### Agent usage (2026-11-27)

- Agent time: about 25 minutes of one subagent session, from the brief to the push. An estimate.
- Tokens: not measured inside the subagent; the session that started it holds them.
