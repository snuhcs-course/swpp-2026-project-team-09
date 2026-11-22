# 08: Asked facts are read in full on their mark

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-flag-says-what-and-when.md) for the attached card, [05](05-lookups-and-words-one-line.md) for the bottom. The data comes from P05: the restaurant card's `hours` (P05-12), an event Plan's own times `Plan.event` (P05-05), and a menu Lookup's `Lookup.menu`; each is optional in the app, so this ticket draws what has arrived.

Native files: none. Releases: an app OTA update only.

## What to build

A menu, a price, opening hours, and an event's name with its start and end are readable in full on the map (boards 14 and 15). A reply with restaurant cards draws a flag on each restaurant with its meal's hours ("학생회관식당 ›" / "11:30–13:30 점심"); a tap opens a card attached to the flag with the menu lines and their prices. A reply with event cards draws a flag on the first event with its name and its start and end with the day word ("가을 정기 음악회 ›" / "19:30–21:00 오늘(토)"), and the other events as numbered flags whose tap opens their own card; the event's time is on the top bar. My arrival time is never shown as the event's time.

## What happens now

- Restaurant and event cards stand in the bottom card; the restaurant card has no hours, and the server drops menu notes.
- The main server keeps each restaurant's hours per meal and kind of day (`RestaurantHours`).

## What changes

- App: scenes made for restaurant and event cards (Place positions from the list of Places; an event's place), flags with their words, and attached cards with the menu or the event's details and its existing buttons (파티 만들기, 같이 갈 파티).

## Must not break

- The restaurant card's 파티 만들기 and the event card's buttons (`answer-frame-restaurant-card`, `answer-frame-event-cards`).
- A restaurant whose Place is unknown keeps its card in the raised view.

## Acceptance criteria

- [ ] A menu reply for 학생회관식당: its flag shows the lunch hours; a tap shows each dish with its price. (Integration test.)
- [ ] An event reply: the first event's flag shows its name and "19:30–21:00"; the others are numbered flags; the bar shows the event's time. (Integration test.)
- [ ] A menu and an event on a phone with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 15 minutes (an estimate; one Opus 5.5 session that also built tickets 06, 07, and 09, split by time).
- Tokens: about 25,000 output; input about 17.0 million, of which about 16.9 million cache reads, 40,000 cache writes, and 80 uncached (the session's totals split by the same share).
