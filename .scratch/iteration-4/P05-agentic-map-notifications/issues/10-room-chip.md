# 10: The seat answer's room is a chip, chosen from a list of rooms by floor and kind

Parent: [P05 spec](../spec.md) ("The seat card")
Status: ready-for-agent
Blocked by: 03 (merged). Built on the branch of 06 and 07, which change the same library files.
Native files: no

## What to build

On the answer to "공부할 자리" the room is a condition chip, "7층 열람실 ▾". A tap opens a list inside the card: two equal columns, 7층 and 8층, one cell per kind of room on a floor, each with the free seats of the seat space a tap would fill. One tap fills the same time in that room; "되돌리기" returns to the first room. The seat card and the booking card name the seat space actually filled. A full room is swapped for one with free seats. Moving between rooms by arrows is not built: arrows appear only when candidates differ on the map or on the time band.

## The rooms

| Floor and kind (chip, cell) | Seat spaces of that kind (seat card, basis) |
| --- | --- |
| 7층 열람실 | 7층 열람실 (`7F-7A-zone2`, the default) |
| 7층 노트북존 | 7A 노트북존 (`7F-7A-zone1-notebook`), 171호 노트북존 (`7F-notebook-171`), 7B 노트북존 (`7F-7B-notebook`) |
| 8층 정숙 열람실 | 8층 정숙 열람실 (`8F-8A-zone1-quiet`) |
| 8층 노트북존 | 8A 노트북존 (`8F-8A-zone2-notebook`), 181호 노트북존 (`8F-notebook-181`) |
| 대학원 열람실 | 대학원 열람실 (`8F-grad-reading-room`), for a User whose 소속 is 대학원 only |

The list's cells: row 1 열람실 | 정숙 열람실, row 2 노트북존 | 노트북존, row 3 (graduate students only) empty | 대학원 열람실. There is no 6th floor.

## Behaviour

- **The chip** names floor and kind ("7층 열람실 ▾", "7층 노트북존 ▾", "8층 정숙 열람실 ▾", "8층 노트북존 ▾", "대학원 열람실 ▾"). It is plain when the Assistant picked the room, navy when the User named it in words, and brown after a change. It is the first row of the seat card until a study answer has the chip row of the answer screen.
- **The list** opens inside the card in the time band's place, with "어느 열람실로 할까요?" and "빈 자리는 14:00–20:00 기준이에요" (the filled time), and "그대로" as a text action at the right of the chip row, which closes it unchanged. A cell shows the name at the left and the free seats at the right ("42석"): the free seats, for the filled time, of the one seat space of that kind on that floor with the most free seats, never a sum. The cell in use has a navy outline. A kind with no free seat is greyed, reads "만석", and cannot be tapped. While a read is pending a cell shows "…", and a failed read "—". Without a library session the cells show names only, with "로그인하면 좌석 현황을 볼 수 있어요", and a tap fills the largest space of that kind.
- **One tap** fills the same time in that seat space. Arrival, leave-by, and the time band stay. While the room differs from the one the answer first showed, "되돌리기" stands before "예약 카드" and returns to it.
- **The result names the seat space**: the seat card and the booking card read "7A 노트북존 · 빈 자리 31석", and the basis says "7층 노트북존 가운데 빈 자리가 가장 많은 곳이에요" with "7A 31석 · 7B 25석 · 171호 12석".
- **A full room.** When the filled space has no free seat for the filled time, the phone fills the space of the same kind with the most free seats, else the space with the most free seats; the chip is brown, the seat card says "7층 열람실은 그 시간에 다 찼어요", and there is no 되돌리기. When every space is full, today's "그 시간에 빈 자리가 없어요" stays.
- **Words.** A room named in words is filled at once, with the chip navy. A particular seat space is reached by naming it ("7B 노트북존으로"). In the chat that draws answers, words that fit several seat spaces fill the first in catalogue order instead of asking back; the text chat keeps asking.
- **After a switch**, the card's key and the done message name the space actually booked, so that a later turn keeps the room on screen.

## Files (the build notes)

- Main server: `kind` on the card's space (`library-card.ts`, `cardSpace`), mirrored in the app's types; the answer-drawing rule that fills the first of several seat spaces (`find-library-space.ts`, and the seat part of the shared `rulesWith` in `library-rules.ts` moved so that `LIBRARY_RULES` keeps asking, character for character).
- App: `mobile/src/screens/main/library/book-seat-card.tsx` holds the space as state, puts its id into the seat load key, resets the named seat on a switch, and draws the chip, the list, and 되돌리기; a hook reads the free seats of each seat sector for the card's slot with `Promise.allSettled`, lazily (when the list opens or the first room is full); a small label table by floor and kind lives on the phone; the list is drawn as cells of equal width on a grid.
- `.scratch/iteration-4/agentic-map-design.md`: the sentences on condition chips, arrows, rooms inside one place, Kwanjeong's rooms, the Alone scenes, and a full room, and row 2 of the canvas rows' table.

## Must not change

- For an app without the `answer` capability: the system prompt and every tool's description, input, and answers.
- The booking of a seat itself, and the cards of rooms (group study rooms).
- Native files.

## Acceptance criteria

- [ ] Unit tests: the label of a floor and kind; the pick of a cell's space (the most free seats of that kind on that floor; the largest without counts); the full-room swap (same kind first, else the most free seats; none when all are full).
- [ ] App integration test: the chip opens the list with two columns and the counts from the fake library, a tap switches the room and reloads its seats, the named seat is cleared, "되돌리기" returns, a "만석" cell cannot be tapped, a failed read shows "—", and without a session the cells show names.
- [ ] App integration test: a filled space that is full swaps to the same kind's space with the most free seats, with "…은 그 시간에 다 찼어요" and no 되돌리기.
- [ ] Main server integration test: with the `answer` capability, words that fit several seat spaces fill the first in catalogue order; without it, the Assistant still asks which one, and the instructions and tools equal today's.
- [ ] The card's space carries `kind`.
- [ ] The design document's sentences are changed.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass.

## Comments
