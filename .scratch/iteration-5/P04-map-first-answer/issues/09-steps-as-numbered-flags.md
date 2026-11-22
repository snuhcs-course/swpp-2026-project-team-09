# 09: Several requests as numbered flags and spans

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [04](04-plan-bottom-without-text.md) and [07](07-booking-on-the-map.md) for the bottom and the booking's flag. The steps come from the main server once P03 ticket 01 is merged; the mock build's stored reply works before.

Native files: none. Releases: an app OTA update only.

## What to build

A reply that answered several requests (P03's `steps`) draws each step with a place as a numbered flag (① ②) with its time and the day word, and each step with a time as its own span on the top bar, numbered the same (boards 12 and 13). A step that could not be done is the one line above the input ("7층 자리는 당일에만 예약돼요 ›"; no offer to tell the User later, since nothing on the main server reminds them) and its flag, if it has a place, is faded. The step due first (the earliest not yet over that has an action) is the active one: its flag carries its detail (a seat number), the button beside the input is its action, and a tap on another step's flag makes that one active.

## What happens now

- `ReplySteps` lists the steps above the reply in the card (P03 ticket 02); the plan and the book card stay where the card draws them.

## What changes

- The step list leaves the card; flags and spans take its place.
- The active step's action: a seat's 예약하기 (ticket 07), a Plan's button (ticket 04).

## Must not break

- A reply to one request shows no numbers (`answer-frame-library`, P03's tests).
- Nothing is booked or sent without the button's press.

## Acceptance criteria

- [ ] The stored reply for "관정 갔다가 저녁": flags ① 관정 and ② 학생회관식당, two numbered spans on the bar, and no step list in the bottom. (Integration test.)
- [ ] The seat step is active: its flag shows the seat, and the button reads "예약하기". A tap on ② makes the meal's button the button. (Integration test.)
- [ ] A step not done is the one line, and its flag is faded. (Integration test.)
- [ ] A reply with one request shows no numbers. (Integration test.)
- [ ] The steps on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 15 minutes (an estimate; one Opus 5.5 session that also built tickets 06 and 07, split by time).
- Tokens: about 30,000 output; input about 20.1 million, of which about 20.0 million cache reads, 50,000 cache writes, and 100 uncached (the session's totals split by the same share).
