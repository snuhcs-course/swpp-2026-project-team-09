# 10: The room ticket and its choosers

Parent: [P10 spec](../spec.md) § With Friends; design `group-study-design` ③ to ⑤ and state 가, `group-study-resume` 2-2
Status: ready-for-human
Blocked by: 09

Native files: none. Releases: with ticket 11.

## What to build

The seat ticket of PR 625 (`mobile/src/screens/main/library/seat-ticket.tsx`) becomes the ticket both answers draw: two cells with a dashed divider, a caption over a bold value in each, and a chevron. The seat answer keeps its look; the room answer fills it so:

- **Left cell:** "그룹스터디룸 · " with the people count emphasized ("4명"), over the room kind with its floor ("4층 6인실").
- **Right cell:** "방" over the room number ("G412").
- **States:**
  - a cell whose chooser is open shows its chevron up, on the light sky ground (#eaf5fb);
  - a ticket that cannot be sent is dimmed to 0.45, its count red (#c2411f) and its kind replaced by the reason ("4명부터");
  - a locked ticket (sent) has no chevrons;
  - the booked ticket is the recommended option 나: the light sky ground with a sky border, a ✓ chip, "예약됨" and " · 내일(금) 15:00–17:00" over the kind, the room on the right, no chevrons. The seat ticket's booked look is P01 ticket 15 (built by another session): the room ticket reuses it once it lands, and draws its own until then only if this ticket comes first;
  - logged out of the library, as the seat ticket does it: the right cell keeps its label "방" with no value and no chevron, and cannot be pressed. The room number is chosen once logged in.
- **The room chooser** (left cell):
  - the free rooms of each kind are read from the library when the chooser opens, kept for a minute and read again when older, as the room list does since PR 616. A count not yet known leaves its place empty;
  - a hint "<time>에 빈 방", then each floor's label ("2층", "4층") over its kinds as equal cells, two to a row, the name at the left and its count at the right ("6인실 빈 방 11");
  - a kind that does not fit is grey with its reason ("8인실 6명부터");
  - the room the answer chose is marked by its `spaceId`, since 2층 and 4층 both have a "6인실".
- **The room number chooser** (right cell): a hint "<time>에 빈 방 N곳" over the kind's rooms free for the whole time, three equal cells to a row. The first free room is chosen at the start.
- **The use line** "사용 용도 · 과제 ›" under the ticket opens the use chooser: the group's `useDescOptions` as equal cells. The use picked is kept on the phone and offered first next time.
- Equal cells follow the app's choice grid (`design-system/choice-grid.tsx`): name left, count right, never uneven pills.

## How it is built

- **The ticket:** `seat-ticket.tsx`'s two cells and frame are shared as `MainCell`, `SideCell` and `TicketFrame`. `SeatTicket` draws through them as before, and `RoomTicket` (`room-ticket.tsx`) fills them for the room.
- **Booked:** the booked room is P01 ticket 15's `BookedTicket`, given `bookedRoomOf(group, slot, room, now)`. Its room comes from whatever source the card gives it (ticket 14).
- **Choosers:**
  - `room-kind-chooser.tsx`, `room-number-chooser.tsx` and `use-chooser.tsx` (with `keepUse` and `keptUse`);
  - the floors' equal cells are `floor-cells.tsx`, which the seat ticket's room list now draws through too.
- **Counting:** the kinds' free rooms are `room-kind-counts.ts`, the seat card's `RoomCounting` given a `count` in place of its seats, with each kind's `space` (P10 ticket 20).
- **Asking again:** choosing a kind asks again through `withChosenRoom` (`plan-input.ts`).
- **Ticket 11** puts these on the card.

## Acceptance criteria

- [x] The seat answer's ticket is unchanged (its tests pass as they are).
- [x] The room ticket shows the kind, the count and the room. Opening a cell lights it and flips its chevron. A dimmed ticket shows the reason. The locked ticket has no chevrons. The booked ticket shows ✓ 예약됨 on the light sky ground. (Unit tests.)
- [x] The room chooser shows each floor's kinds as equal cells with their counts and greys a kind that does not fit with its reason. Choosing a kind gives its id, and `withChosenRoom` asks the answer again with `chosen.roomSpaceId`. (Unit tests.)
- [x] The kinds' free rooms are read when the chooser opens, not read again within a minute, and read again after it; a count not yet read leaves its place empty. (Unit test.)
- [x] Logged out, the right cell shows "방" alone, with no chevron, and does not open. (Unit test.)
- [x] The room number chooser shows only rooms free for the whole time, three to a row, the first chosen. (Unit test, with the library's room list.)
- [x] The use chooser shows the options as equal cells, and the use picked is offered first the next time. (Unit test.)
- [x] Whole lint, format and types.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 70 minutes in the p04-58 session, between 19:18 and 22:19 UTC, an estimate. The rest of that span was waiting for the room kinds' library spaces (P10 ticket 20) and for the decision to stack on P01 ticket 15. About a quarter of the 70 minutes was test runs on a loaded machine. No emulator, no subagents.
- Tokens, from 19:18 UTC to this entry: input 170 uncached, with cache reads 43,616,212 and cache writes 643,729; output 85,759.
