# 22: 관정관 opened from a study answer is today's seat ticket

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Pull request: none yet
Blocked by: 19; the main server's 21 (merged)

Native files: none. Releases: an app OTA update, though no answer reaches it until the app says `study-plan` (ticket 23).

## What to build

The approved board's ④ ("공부할 곳 후보 화면", 2026-11-27): a press on 관정관's row or mark opens today's seat ticket, with no second copy of it.

1. The app reads `study.book` as the main server sends it since its ticket 21: `{ spaceId, card }`, `card` being the book card `proposeLibraryBooking` shows. A book without its card is refused, as any malformed Plan.
2. 관정관's opened view (ticket 19's `MealMenu`) has today's `BookSeatCard` for that card in its body slot, in the place of its spaces. It reads and books through the chat's library cards (`LibraryCardActions`, at the reply's place), so it is the same card as the seat answer's: its seat, the room list, the time band, 예약하기 and 예약 안 함.
3. The library actions reach the view through one optional prop: `answer-frame.tsx` (`Words`) → `reply-words.tsx` → `plan-card.tsx` (`MealBody`, `MealSheet`) → `meal-menu.tsx`. Without them (a test of the view alone), the spaces stand.
4. The mock's study answer carries the main server's fixture (`__tests__/fixtures/study-kwanjeong-book.json`) as 관정관's study part.

## Acceptance criteria

- [x] The shared fixture is read as the app reads a study Plan; a book without its card is refused. (Unit test, failing before the change.)
- [x] The mock's study answer carries the fixture's card. (Unit test, failing before the change.)
- [x] 관정관's row opens its seat ticket with 예약하기 and writes nothing to the library; another place opens its spaces. (Integration test, failing before the change.)
- [ ] Emulator pictures at font scale 1.0 and 1.3.
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 15 minutes of work, an estimate, in one session; the test runs' waiting is not counted.
- Tokens, estimated as this ticket's share of that session: input 20M, of which 20M cache reads, 0.04M cache writes and under 1k uncached; output 30k.
