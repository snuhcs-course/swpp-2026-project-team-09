# 21: 관정관's plan carries the book card the app opens in it

Parent: [P10 spec](../spec.md); the study candidates screen the user approved on 2026-11-27, whose 관정 row opens today's seat ticket inside the opened view (the app's P10 tickets 17–19, 22 and 23).
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server; the app reads it with its P10 ticket 22.

## What changes

- `study.book` of 관정관's plan is `{ spaceId, card }`.
- `card` is the book card `proposeLibraryBooking` shows for that space (`bookCard`), at the plan's day and start and for its length:
  - the start is moved up onto the space's steps;
  - the length is moved down onto them, within the space's shortest and longest;
  - the card has no seat, equipment, 사용용도, companions or Quest.
- For "공부할 자리 있어?" on Wednesday 2026-11-04 at 19:10 at 301동, the plan arrives at 19:24, so the card is `book:7F-7A-zone2:2026-11-04:1930:210`.
- A recalculation that moves the time builds it again, and the seat space the User chose on the answer is the card's.
- An app that reads only `spaceId` keeps working.
- Built in `lookup/study-book.ts`. The service gives the planner the 관정 catalogue.
- The shared fixture is `main-server/test/fixtures/study/kwanjeong-book.json`, 관정관's `study` part for that question. Its byte-for-byte copy, `mobile/__tests__/fixtures/study-kwanjeong-book.json`, is what the app checks its card reading against. Both `fixture-copies` tests check the pair.
- `test/fixtures/study-answer.ts` takes 관정관's `book` from the fixture.

## Acceptance criteria

- [x] planStudy's 관정관 plan for the fixture's question is the fixture, card included. (Unit test, failing before the change.)
- [x] Asked later, the card moves with the time, and its key matches its start and length. (Unit test, failing before the change.)
- [x] A seat space chosen on the answer gives that space's card through the recalculation. (Integration test.)
- [x] The two copies of the fixture are byte for byte the same. (`fixture-copies` in main-server and mobile.)
- [x] README; the whole of main-server's and mobile's lint, format and types; the study test files run locally.
