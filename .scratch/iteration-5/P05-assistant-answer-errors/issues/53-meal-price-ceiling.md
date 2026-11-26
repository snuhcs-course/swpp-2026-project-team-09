# 53: A meal plan with a price ceiling

Parent: [P05 spec](../spec.md); the design page "밥 조건 두 가지" § 2 가격으로 거르기, approved by the user on 2026-11-26 (`.scratch/iteration-5/notes-ko/handoff/meal-conditions-design/index.html`)
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server, before the app's part (P04 ticket 92).

## What happens now

"5천원 이하로 저녁" plans every Restaurant as for any meal. planMeal takes no price, and a rule (P05 ticket 50) makes the model say the plans are not narrowed by price: "가격으로 거르지는 못해서, 3,000원부터인 아워홈(901동)을 추천해요."

## What to build

- planMeal and the meal input take a price condition.
  - `maxPrice` is the highest price per person, in won. The model fills it from "5천원 이하" or "5천원까지" (5,000), "만원 안쪽" (10,000), and "6천원 정도" (6,000, that value as the ceiling). It gives 'any' when the User lets price go ("가격은 상관없어").
  - `cheapFirst` puts the cheapest first. It is set for "싼 데" with no number (no ceiling) and for "제일 싼 데", and false lets it go.
  - Both are kept from the conditions on screen for later messages in the conversation, across days and meals: a budget is the person's, unlike a kind of food. The app's ✕ on the chip removes `maxPrice` from the input and recalculates.
- A Restaurant fits when the price the list shows is at or under the ceiling. That price is the main corner's own price, else its cheapest dish: the rule of `listPrice` and of the app's `priceWords`. The dish it speaks of is the corner's first dish at the corner's price, else that cheapest dish (`cheapestDish`).
  - No mark of "meal or side" on dishes: the User judges from the dish's name in the row.
- The order with a ceiling:
  - The fitting plans come first, in the present order (least walking, a kind of food first within it).
  - Then the others, in their present order. The app shows them apart, without numbers, under "5,000원 넘는 곳".
  - Restaurants with no price at all never fit and go with the others.
  - When none fits, every plan goes cheapest first, those without a price last.
  - When no plan has a price (the menus are not posted yet), the order stays as it is.
- `cheapFirst` orders by that price, cheapest first, the fitting ones among themselves when there is a ceiling.
- With Friends, the same: the price is one person's.
- The model reads the condition and each plan's dish and price (`maxPrice`, `fitting`, `noneUnder`, `pricesUnknown`; each plan's `cheapest` and `fits`). The rule of P05 ticket 50 is replaced: the one sentence names the condition.
  - Some fit: "5,000원 이하로는 가장 덜 걷는 학생회관식당을 추천해요."
  - None fits: "5,000원 이하는 없어서, 가장 싼 6,000원인 예술계식당을 추천해요."
  - No prices: "메뉴가 아직 올라오지 않아 가격으로 거르지 못해서, …을 추천해요."
  - The server's own sentence, when the model wrote none, says the same.
- Wire: additive. An app before P04 ticket 92 shows the plans in the new order, all numbered. The app never adds `maxPrice` itself, only takes it away, so no older server is asked for a field it refuses.

## Acceptance criteria

- [x] `cheapestDish`: the corner's price with its first dish, the cheapest of dishes that differ, the first of a tie, and none. (Unit tests.)
- [x] The order: no condition, `cheapFirst` alone, a ceiling that some fit (exactly at it and one won over), a ceiling with `cheapFirst`, none fitting, no prices at all. (Unit tests.)
- [x] planMeal: the ceiling and `cheapFirst` go into the input, are kept from the conditions on screen on another day, and are let go with 'any' and false. Its words carry the condition and each plan's dish and price. (Unit tests.)
- [x] The server's sentence for each case. (Unit tests.)
- [x] Through the server: a ceiling orders the plans, and a recalculation takes and gives back `maxPrice`. (Integration tests.)
- [x] Eval cases `meal-wish-by-price` (rewritten), `meal-price-ceiling-words`, `meal-cheap-first`, `meal-price-let-go`, P4 world. Not run: no model key on this machine.
- [x] Whole lint, format and types of the main server.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 30 minutes in the p04-58 session, from 11:05 UTC to the server's pull request, an estimate. It includes reading the design and the code for both parts, and the app's part has not started. One search subagent ran for about 6 minutes beside it.
- Tokens, from 11:05 UTC to this entry: the session's input 168 uncached, with cache reads 35,581,410 and cache writes 151,899; output 84,823. The subagent's input 122 uncached, with cache reads 8,561,523 and cache writes 162,787; output 27,060.
