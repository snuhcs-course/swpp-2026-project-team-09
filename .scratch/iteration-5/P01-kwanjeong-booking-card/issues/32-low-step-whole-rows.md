# 32: The low step shows the sentence's lines, then only whole rows

Parent: [P01 spec](../spec.md); the user's third report of rows cut in half at the answer card's lowest step (2026-11-27)
Status: dropped
Blocked by: none

## Decision

Dropped on 2026-11-27, PR #681 closed unmerged. The user's words: "숨기는 것은 원치 않아. 그리고 이런 상황이 생길 때마다 낮게 높이를 올리면 결국 지도 UI가 그만큼 작아지니 현재는 문제삼지 말고 넘어가도록 해."

A row partly shown at the low step stays as it is: it hints that the card scrolls. No row is hidden, the low step is not made taller, and no other fix replaces this ticket.

## What the ticket was

At the low step a row that is not lines of the sentence's type is cut where the sentence's line count ends: a no-Plan meal's row of buttons, a refusal's offer buttons, a meal's third line at font scale 1.3, and a seat card's ticket under a one-line sentence at 1.3. The ticket hid everything under the last whole row behind a band over the footer.
