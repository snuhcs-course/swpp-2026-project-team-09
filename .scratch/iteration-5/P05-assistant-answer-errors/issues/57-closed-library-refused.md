# 57: A library space asked for after its closing is refused, with no card

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26, 23:37, Release 26.11.26-4): "관정 열람실 자리 있어?" was answered "관정도서관 7층 7A 열람실 2 구역의 오늘 좌석 현황 카드를 보여 드렸어요. 빈 좌석은 카드에서 확인하실 수 있어요. 이 구역은 07:00부터 23:00까지 열고, 당일 예약만 돼요.", with no card, no mark on the map, and no main button; the rooms close at 23:00
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

These are read from the code; there is no log.
- The model called `findLibrarySpace` (the first seat space, 7F-7A-zone2), then `showLibrarySeats`.
- `showLibrarySeats` checked only the booking window, which is the day, not the opening hours. So at 23:37 it still added a seats card and answered "…오늘 좌석 현황 카드를 보여 줬어요", which the model repeated.
- A seats card is drawn only inside the reply in the sheet. It is never on the map and never gets a main button (case table item A11). Under four sentences at the low height it stayed out of view.
- `proposeLibraryBooking` already refused after closing, from its start time. `findLibraryFreeSlots` answered "오늘은 … 예약할 수 있는 공강이 … 없어요", as if the User had no free time.

## What changes

- `closedTodayRefusal` (`booking-rules.ts`): a space asked for today at or after its closing, by its catalogue hours, is refused: "열람실은 오늘 23:00에 닫았어요".
- `showLibrarySeats` and `findLibraryFreeSlots` answer it with `closedToday: { closedAt, opens }` ("내일 07:00") and no card. `findLibrarySpace` gives `closedToday` for such a space, so the model knows before it calls anything else.
- The rule for an app that draws answers: on `closedToday`, call no other library tool for today, and say in one sentence when it closed and when it opens next, such as "관정도서관 열람실은 23:00에 닫았어요, 내일 07:00부터 당일 예약할 수 있어요.". Never name a card. The text chat's rules are unchanged.
- Not built here, since they are the user's UI choice: 관정 drawn on the map with a "닫음 · 내일 07:00부터" label, an offer of study places open now, and an offer of tomorrow's seats.

## Acceptance criteria

- [x] The refusal after closing and at it, none a minute before or on another day, and a room by its own hours. (Unit tests.)
- [x] At 23:37, `showLibrarySeats` answers `closedToday` with no card, `findLibrarySpace` marks the space `closedToday`, and `findLibraryFreeSlots` answers `closedToday`, not "no 공강". (Integration test, failing before the change.)
- [x] The rule, with the eval case `library-answer-closed-for-today`. Not run: no model key on this machine.
- [x] Whole lint, format and types of the main server; the library integration files run locally.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 10 minutes of one session, from the report of the cause to the pull request. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens: input about 28.2 million, of which 28.2 million were cache reads, 51,000 cache writes and 74 uncached; output about 28,000. No subagents.
