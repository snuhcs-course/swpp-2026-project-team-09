# 08: The library's words match the card

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-seat-booking-fits-the-day.md), which changes the same words.

Native files: none. Releases: an app OTA update and the main server.

## What happens now

- The seat and room proposals end with "예약하기를 눌러야 예약돼요", from the server's words and from the model's rules. A User signed out of 관정도서관 sees only "관정도서관 로그인이 필요해요" and a 로그인 button on the card; the main server cannot know whether the phone is signed in.
- One zone has three names: the catalogue's "7A 열람실 1 구역(노트북존)" in the words, and the app's "7층 노트북존" and "7A 노트북존" on the card. The library itself is "관정관" in the rules and "관정도서관" in the app.

## What to build

- The words say that nothing is booked until the User books on the card, without naming a button ("카드에서 예약해야 예약돼요").
- The words use the same short zone name as the card, from one source.
- One name for the library in the rules and the app's words: 관정도서관.

## Acceptance criteria

- [ ] No seat or room proposal names 예약하기. (Unit test, fails before the fix.)
- [ ] A seat in the laptop zone has the same zone name in the words and on the card. (Unit tests.)
- [ ] Lint, format and types of the app and the main server pass.

## Comments
