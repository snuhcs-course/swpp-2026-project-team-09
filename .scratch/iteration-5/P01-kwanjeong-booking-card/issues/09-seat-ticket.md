# 09: The seat card as one seat ticket, and the room list under it

Parent: [P01 spec](../spec.md); the design of the study seat card approved on 2026-11-26 (boards 나 and 다 of the study seat card proposal)
Status: ready-for-agent
Blocked by: none (stacked on P01 ticket 08)

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

The raised seat card stacks, from the top:

- the room chip ("7층 열람실 ▾");
- the gold line ("7B 노트북존 · 빈 자리 171석"), with grey lines on why this space;
- the seat row with its blue tile ("관정 7층 열람실 · 7193번 / 오늘 17:00–18:00");
- two pills, 다른 자리 고르기 and 처음 열람실로;
- "예약하면 HH:MM까지 좌석배정기에서 확인해야 해요." and three caution bullets.

Above them, the card's own sentence says the room, the time and the free seats again.

The chip opens the room list in the time band's place. The list holds "어느 열람실로 할까요?", "빈 자리는 HH:MM–HH:MM 기준이에요", 그대로 beside the chip, and the grid. Each cell is "…" until its count arrives.

## What changes

**The seat ticket.** One row replaces the chip, the gold line, the seat row and the two pills.

- **Frame:** a white ground, a 1.5 border in the study colour (`svcStudy`), and a dashed divider between two cells.
- **Cells:** each cell has a small grey label on top and a bold value under it, at the same size in both cells.
  - Left: the label "열람실 · 빈 자리 171석", with the count in the study colour, and the value "7층 노트북존".
  - Right: the label "좌석" and the value "7800번".
- **Chevron:** a chevron icon sits on each value's line, centred on that line's height.
  - A long room name ends in "…" and the chevron stays.
  - The seat number never shrinks.
  - Nothing is drawn empty. A count not read yet leaves the label "열람실" alone. While the seat is not known, the room cell stands alone, with no divider and no seat cell.
- **Presses:**
  - The whole left cell opens the room list, and closes it when it is open.
  - The whole right cell opens the seat picture, as 다른 자리 고르기 did.
- **Removed:** 처음 열람실로 is removed, with its tests.
- **Removed with the chip:**
  - the chip's colours, including the named-room colour (`roomNamed`, `namesRoom`);
  - the grey lines on why this space ("…가운데 빈 자리가 가장 많은 곳이에요", "7A 31석 · 7B 25석 · 171호 12석");
  - 자리 선택하기 on the chat's card, whose seat cell opens the same picture.

**The room list (board 다).**

- **Header:** the ticket stays in place as the list's head. Its left cell is tinted (`svcStudySoft`), and its chevron points up.
- **Removed:** "그대로", "어느 열람실로 할까요?" and the chip.
- **Body:** under the ticket, a small line "HH:MM–HH:MM에 빈 자리", then one row per floor (7층, 8층) of equal-width cells.
  - Each cell is one line: the name at the left, the count at the right in the study colour.
  - Fewer than 10 free seats show in the danger colour. None shows "만석", dimmed.
  - The chosen room has the study colour's border.
- **Loading:** there is no bar, no second line, and no cell or mark that exists only for loading. A count not yet known leaves its place empty and fills in where it stands.
- **예약하기:** it stays where it is, dimmed, while the list is open.

**The notes.** "예약하면 HH:MM까지 좌석배정기에서 확인해야 해요." and the three caution bullets leave this card.

- The booked card already says the kiosk's time after the booking.
- The catalogue's notes stay as they are.
- One note stays on the card: the main server's "예약은 직접 눌러 주세요", sent when the User asked the Assistant to book ("그냥 예약해 줘"). It answers what the User asked, and is not one of the cautions.

**The sentence above the ticket.** On the map, the card's own sentence is not drawn when it only says what the ticket and the time bar say: the room, the time and the free seats. One line stays for what they cannot say, from fields the card already has, with no server field:

- the reason the server's arrival gives for the start: "301동에서 걸음 9분이라 17:00부터예요.";
- the room swapped because it was full: "7층 열람실은 그 시간에 다 찼어요", under the ticket;
- the card's states: "…빈 자리를 찾고 있어요.", "예약하는 중이에요", and the failure lines with 다시 찾기 or 로그인.

The model's words stay out of this card, as since P01 ticket 03. The history list keeps them.

**The card's height.** It does not grow: the ticket stands where the chip and the seat row stood.

Not in this ticket: the list of study places to choose from, counting the rooms before the list opens, sending the counts to the server, the time card's scale, and the map mark's colour.

## Acceptance criteria

- [x] The raised card shows one ticket with "열람실 · 빈 자리 N석" over the room, and "좌석" over the seat number, and no chip, gold line, seat row, 다른 자리 고르기 or 처음 열람실로. (Integration test.)
- [x] The left cell opens the room list and closes it. The right cell opens the seat picture. (Integration test.)
- [x] Both values are drawn at the same size, with a chevron icon on each value line. (Integration test of the styles.)
- [x] The list has the ticket as its head, the line "HH:MM–HH:MM에 빈 자리", and per floor equal cells of one line each. Few seats are in the danger colour, none is "만석". A count not known yet leaves its place empty. There is no 그대로 and no "어느 열람실로 할까요?". (Integration test.)
- [x] 예약하기 beside the input is disabled while the list is open. (Integration test, as before.)
- [x] The kiosk line and the caution bullets are not in the card. The booked card still says the kiosk's time. (Integration tests.)
- [x] The sentence above the ticket is not drawn when it only repeats the ticket. It is drawn for the arrival's reason, a swap or a state. (Integration tests.)
- [x] While the seat is being read, the ticket shows the room alone and no empty seat cell. (Integration test.)
- [ ] On the user's phone at font scale 1.0 and 1.3: the chevrons are centred on their lines, a long name ends in "…", and the card is no taller than before.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 75 minutes (an estimate), in one session, from 23:36 KST on 2026-11-26 to the PR. It includes waits on test runs at a load of 15–30.
- Tokens: 276 input, 117,464 output; cache reads 54,111,290, cache writes 223,153. No subagents.
