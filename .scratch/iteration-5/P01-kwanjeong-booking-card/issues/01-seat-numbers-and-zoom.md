# 01: Whole seat numbers, and a zoom that stays where the User looks

Parent: [P01 spec](../spec.md); the owner's request of 2026-11-21 and the emulator check of `5.0/Main` (c920d9de) the same night
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: an app OTA update only.

Item 1 of the request, the time, needs nothing more: the time band of P15 ticket 57 already changes the card's start and end.

## What happens now

The seat picture (`mobile/src/screens/main/library/seat-picker.tsx`) draws the room's `area_<sector>.png` 300 points high at zoom 1, up to 4 times that. `seat-map.tsx` draws every seat's number (VNAME) at every zoom.

- **Numbers are cut.** Every seat's box is 33×28 image pixels (`SEAT_BOX`), and the picture of 7A 열람실 2 구역 is 2529 pixels wide, so a box is 8.3×7.0 points at zoom 1 and 33×28 at zoom 4. `seatNumberSize` takes a digit as 0.6 of the font size and never goes below 8 points. A four-digit number is wider than that, and below zoom 4 the floor of 8 makes it wider still. `numberOfLines={1}` then cuts it to "72...". On the emulator the number was cut at 1, 1.5, 2, 3 and 4 times. So was the picked seat's number, in the key colour, while the foot said "7233번 선택".
- **The zoom starts from the corner.** The picture sits in two nested scroll views, vertical and horizontal. 확대 and 축소 change only its size, so the scroll offsets stay as they were and the picture grows from its top-left corner. At 4 times, the view shows the room's wall and no seat.
- **The pinch is rebuilt at every step.** Its gesture is made again at each zoom (`useMemo(..., [zoom])`), and a pinch also grows the picture from the corner.

## What changes

### Whole numbers or none

- A seat's number is drawn only when all of it fits in the seat's box. The digit width is taken as 0.7 of the font size, with a point of room on each side. The size is the largest that fits the box's width and 0.8 of its height, at most 14 points. A seat whose number would need less than 8 points shows no number. The number never ends in "..." or "…": it also shrinks to fit (`adjustsFontSizeToFit`) if the font draws it wider than reckoned.
- For 7A 열람실 2 구역 that means no numbers at 1, 1.5 and 2 times, about 8 points at 3 times, and about 11 points at 4 times.
- While its own number does not fit, the marked seat carries a tag with its whole number: a small key-colour label with a white number, just above the seat, or below it when the seat is too near the picture's top. Once the number fits, the seat shows it itself, white on the key colour, and no tag covers the seat above it. The marked seat is the one the User pressed, or else the card's own seat. Either way the map names the number the foot names ("7233" on the map, "7233번 선택" under the picture), and after "7233번 선택" the card says "· 7233번". A press elsewhere moves the mark along.

### The zoom stays where the User looks

- 확대 and 축소 keep the middle of the view in the middle. While a seat is pressed, they bring that seat to the middle instead.
- A pinch keeps the point between the two fingers where it is.
- The offsets never pass the picture's edges, so the view never shows space outside the picture. A picture smaller than the view sits at 0.
- react-native-gesture-handler gives a pinch's `scale` as the total since the fingers came down, not the change since the last update. So the zoom is the zoom when the pinch began times that scale, and that starting zoom is kept in a ref, because the gesture's callbacks may come from a later render than its start.
- The arithmetic is a pure module (`mobile/src/library/cards/seat-zoom.ts`) with the zoom steps it already had (1, 1.5, 2, 3, 4).

## What stays as it is

- The time band, the room chip, 예약하기, 닫기 and the kiosk foot.
- The picture's sizes (300 points high at zoom 1, up to 4 times), its colours and key, ✕, and "<n>번 선택".
- The seats card's small map, which draws no numbers.

## Acceptance criteria

- [x] At zoom 1 no seat number is drawn, and the card's seat carries its tag ("7193"). (Integration test.)
- [x] At zoom 4 every seat's number is drawn whole, at 8 points or more, and fits its box by the 0.7 rule; no number is cut. (Integration test; unit tests of the size rule: none below the floor, none wider than its box, three- and four-digit numbers.)
- [x] At zoom 4 a press on 7300 shows 7300 on the seat itself with no tag, and "7300번 선택"; zoomed out to 2, the tag says 7300; "7300번 선택" puts 7300 in the card. (Integration test.)
- [x] 확대 with no seat pressed keeps the view's middle in the middle; 확대 after a press brings the pressed seat to the middle; the offsets stay within the picture. (Integration test of the scroll calls; unit tests of the arithmetic.)
- [ ] A pinch follows the fingers' total scale without compounding it: updates of 1.05 to 1.5 leave 1.5 times, a second pinch to 1.2 from there leaves 1.8, and one to 0.2 stops at 1. (Integration test through the gesture handler's test events.) Its arithmetic keeps the focal point fixed and the offsets within the picture. (Unit test.) The pinch itself is not checked on a device here: adb has no two-finger gesture, so a person tries it on a phone. The tests pass; the device check waits for a person.
- [x] No native file changes; oxlint, Prettier and tsc pass on the app.

## Comments

### Emulator check (2026-11-21)

The debug app on an Android emulator, with the mock Assistant and the fake library of the tests in place of the site (a local change that was not committed). At 1 time the picture shows no number and the card's seat 7193 carries its tag. A press on 7430 moves the tag there, with "7430번 선택" under the picture. Three presses of 확대 bring 7430 to the middle at 3 times, where every number is whole (7417, 7422, …). At 4 times the numbers are larger, and 7430 shows its own number with no tag over 7429. Two presses of 축소 go back to 2 times, with the tag and 7430 still in the middle. "7430번 선택" puts "· 7430번" in the card.

### Agent usage (2026-11-21)

- Agent time: about 50 minutes in one session, measured from the transcript up to the pull request (an estimate). It covers the first look at the code and the releases, the emulator check of `5.0/Main`, the fix, and the second emulator check.
- Tokens: output 128k; input 37.0M, of which 36.7M cache reads, 301k cache writes and 318 uncached. No subagents.

### Review fix (2026-11-21)

A review found that the pinch multiplied the zoom it had already raised by the gesture's total scale, so the zoom compounded and reached 4 times within a few frames. The pinch now multiplies the zoom at its start. A test that fires the pinch's events (1.05, 1.1, … 1.5) failed on the first version, giving 1135 points high instead of 450, and passes now.
