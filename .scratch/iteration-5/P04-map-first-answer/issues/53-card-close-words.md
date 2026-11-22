# 53: A card's buttons say what they do, and the seat picture closes by ✕

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: an app OTA update only.

## What happens now

Four places in the library's cards say "닫기", but they do different things:

- the seat book card's failure note ends the card without a booking, which declines;
- the seat offer's second button beside 예약하기 also declines, and the chat answers "알겠어요. 예약하지 않았어요.";
- the room card's picker for one more Friend folds back without asking anyone, which cancels;
- the room cards (the booker's form and the card waiting for the Party) decline with "취소", the same act as the seat offer's second button;
- the seat picture's head has a chevron "←" at its left, while every other card over the map closes by ✕ at its top right (`screens/main/card.tsx`).

## What to build

- The seat book card's failure note: "닫기" → "예약 안 함". It stays a button.
- The seat offer's second button: "닫기" → "예약 안 함". The own bubble "알겠어요. 예약하지 않았어요." stays.
- The room card's picker for one more Friend: "닫기" → "취소". It folds the picker back.
- The room cards' decline: "취소" → "예약 안 함", as the seat card's. While the picker is open, the card would otherwise show two "취소" that do different things.
- The seat picture: the chevron "←" becomes ✕ at the top right of its head, as `screens/main/card.tsx` has it, with "좌석 현황 닫기" for a screen reader. Android's back keeps closing it.

## Acceptance criteria

- [ ] The seat book card offers "예약 안 함" beside 예약하기; pressing it books nothing and says "알겠어요. 예약하지 않았어요.". (Integration test.)
- [ ] A seat read that failed offers 다시 시도 and "예약 안 함". (Integration test.)
- [ ] The room card's picker folds back on "취소" and asks nobody; the card's one "취소" is the picker's. (Integration test.)
- [ ] The room cards decline with "예약 안 함".
- [ ] The seat picture closes on "좌석 현황 닫기". (Integration test.)
- [ ] No test or mock keeps the old words for these buttons.
- [ ] No native file changes; lint, format, and types pass on the app.
