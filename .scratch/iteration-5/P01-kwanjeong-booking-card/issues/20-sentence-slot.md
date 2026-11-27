# 20: The answer card's one sentence slot, and when a kept card leaves

Parent: [P01 spec](../spec.md); the user's card-screen rules of 2026-11-27, items 1 and 2 (both approved: "1번 권장안은 승인할게", "권장 2, 3은 좋아")
Status: ready-for-agent
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

On the phone, a seat answer said "302동에서 걸음 15분이라 16:30부터예요." over its ticket. Then "거기 몇 층이야?" was answered with words alone. The card then read: the old sentence → the ticket → "…" → the new reply under the ticket. After 예약하기, the earlier reply stayed over the booked ticket.

- The frame drew the card kept from the earlier turn (`KeptCards`) above the new turn, and the new turn's words and waiting dots under it.
- Every bubble of a turn drew its words, so a reply's words stayed over the done message that a button added after it.

## What changes

The card is, top to bottom: one sentence slot → the ticket, when there is one → the main button beside the input. The slot holds one thing, by priority:
1. the app's own line made by a button ("예약을 취소했어요");
2. the model's latest reply;
3. the app's explaining line ("…라 17:00부터예요").

The waiting dots stand in the slot. Earlier replies do not pile up; they are reachable from the question chip. One path for every answer kind (`answer/sentence-slot.ts`):
- The frame draws the turn's words and dots first, and a card kept from an earlier turn under them.
- In a turn, only the latest bubble draws its words. A reply whose words are its card (an answer, a Lookup) keeps them.
- Under a reply or the dots, a kept card's explaining line gives way (`SlotHeld`). The seat card's line, made by its button ("예약하는 중이에요"), stays.

When a kept card leaves is unchanged; the app looks at two things only:
- the new reply has its own screen (a Plan, a Lookup, cards, steps): it takes the card;
- the reply carries the server's `clears` (P05 ticket 55): the screen is lowered.

Any other words-only reply keeps what is on screen, and only the slot changes. `sceneBubblesOf` already reads `clears` for every kind, so library cards, event cards and the rest leave on it as a Plan does. A test now pins it for the seat card.

## The answer kinds × the page's six rows

| Follow-up | Meal Plan, meet | Seat or room card (kept) | Event, Quest, restaurant cards (kept) | Lookup (facts, way, study, friend) | Refusal, words |
|---|---|---|---|---|---|
| Words about the card ("거기 몇 층이야?") | The Plan stays on the map, the time bar and the main button. The card says the new words in the slot; the Plan's list is not kept in the card. | The new words in the slot, the ticket under it, 예약하기 beside the input | The new words, the cards under them | Kept on the map unless it only told a fact (P04 ticket 58); the card says the new words | The new words replace the old |
| Thanks ("고마워", "응", "알겠어") | Same as above | Same as above | Same as above | Same as above | Same |
| A new card of the same kind ("8층으로 바꿔줘") | A new Plan replaces the Plan | A new seat card replaces the ticket | New cards replace them | A new Lookup replaces it | — |
| A reply with its own screen ("배고파", "지은이 어디야?") | It takes the card | It takes the card; the ticket and its flag leave | It takes the card | It takes the card | It takes the card |
| A refusal the server marks `clears` | The Plan leaves (P05 ticket 55) | The ticket and its flag leave (pinned here) | They leave | It leaves | — |
| Rare unrelated words alone ("SNU Now가 뭐야?") | Kept | Kept | Kept | Kept as above | — |

**Where the meal differs from the page's drawing:** under a words-only follow-up, a meal Plan keeps its map, time bar and main button, but the card shows only the new words. Its list is not kept in the card (P04 ticket 46). A seat or room card is kept in the card, under the slot.

## Acceptance criteria

- [ ] A seat card at first: the explaining line over the ticket. (Integration test.)
- [ ] Under a words-only follow-up: the reply over the ticket, and the explaining line gone. (Integration test, red first; written, not yet run.)
- [ ] While the reply is on its way: the dots over the ticket. (Integration test, red first; written, not yet run.)
- [ ] After 예약하기 under a follow-up: no earlier reply over the booked ticket. (Integration test, red first; written, not yet run.)
- [ ] A reply marked `clears` lowers the ticket and its flag; a thank-you keeps them. (Integration tests; written, not yet run.)
- [ ] Pictures at 1.0 and 1.3: the four states of the seat card as on the page, and the same follow-up on a meal answer.

## Comments
