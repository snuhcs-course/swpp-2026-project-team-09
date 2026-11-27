# 50: A meal reply's prices are the list's, and a price wish is said not to narrow the plans

Parent: [P05 spec](../spec.md); the user's phone (2026-11-26): "5천원 이하로 저녁" was answered that no dinner under 5,000원 exists and the first Restaurant cost 6,000원, while the list under it said "3,000원부터" for it
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server.

## What happened

- The list's "3,000원부터" is the app's `priceWords`: the main corner's own price, else the lowest dish price in that corner, a single item counted.
- The model reads every corner's items with their prices (`menuWords`) and judged what a whole meal costs. That is another notion, so the two disagreed.
- planMeal takes no price, so all six places stood unfiltered under a sentence that said none fits.

## What changes

- planMeal gives each plan its `price` as the list writes it (`listPrice` in `meal-menu.ts`, the same rule as the app's `priceWords`).
- A rule in `PLAN_RULES`: with a price wish, the one sentence says the plans are not narrowed by price and recommends the first plan with that price, such as "가격으로 거르지는 못해서, 3,000원부터인 아워홈(901동)을 추천해요.". It never gives a price otherwise, and never says no meal is under a price.

## What a price condition would take (not built)

- `maxPrice` on planMeal and the MealInput.
- A mark on each dish of whether it is a meal or a side, so a single side does not count.
- The plans with no meal under the price recede or go after the others, as with a kind of food.
- A chip "5,000원 이하", and the list showing the price of the dish that fits. About M.

## Acceptance criteria

- [x] planMeal gives a plan's price as the list writes it. It gave none before. (Unit test.)
- [x] The price for a corner's own price, for dishes that differ, for one price, and for none. (Unit tests.)
- [x] The rule, with the eval case `meal-wish-by-price` (P4 world). Not run: no model key on this machine.
- [x] Whole lint, format and types of the main server.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 15 minutes of one session, for tickets 48, 49 and 50 together (one pull request), including finding the causes. An estimate from the transcript's timestamps, gaps over 5 minutes left out.
- Tokens, for the three together: input about 27.2 million, of which 26.9 million were cache reads, 292,000 cache writes and 198 uncached; output about 63,000. No subagents. Measured from the session's transcript when the pull request was opened.
