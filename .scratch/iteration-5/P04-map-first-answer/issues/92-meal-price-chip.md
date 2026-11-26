# 92: A meal's price condition on the list and the map

Parent: [P04 spec](../spec.md); the design page "밥 조건 두 가지" § 2 가격으로 거르기 (boards "지금" and "제안"), approved by the user on 2026-11-26; the main server's part is P05 ticket 53
Status: ready-for-human
Blocked by: P05 ticket 53 deployed first (the app sends back conditions the main server must accept)

Native files: none. Releases: an app OTA update.

## What happens now

The main server orders a meal's plans by a price ceiling (P05 ticket 53): those under it first, the others after them, or every plan cheapest first. The app shows them all numbered alike, with no sign of the condition. It cannot remove the condition, and its list re-sorts by walking.

## What to build

- **Condition chips.** They sit at the front of the kind-chip row of the meal list, set apart from the kind chips: their own look with a ✕, and a thin divider after them.
  - "5,000원 이하 ✕" for `maxPrice`.
  - "싼 순 ✕" for `cheapFirst` (the orchestrator's decision 1).
  - ✕ removes that condition from the input on screen and recalculates, with no model call. The model's sentence stays as it is.
  - The row shows when there is a condition chip, even with fewer than two kinds.
- **Fitting rows** (list price at or under the ceiling): numbered as now, with the dish the price speaks of and its price in place of the dish line ("시나몬치킨스테이크 4,500원"). The right-hand price goes. The dish and price are the server's rule (`cheapestDish`), from the plan's menu.
- **Over the price:** when some fit, the others form a grey section at the list's end titled "5,000원 넘는 곳", like "쉬는 곳". Each row has its name, its dish line, and its price, with no number and no press.
- **None fits:** every row is numbered as the main server orders them, cheapest first. There is no grey section, and the chip stays.
- **Order:**
  - The list keeps the main server's order whenever it is by price: `cheapFirst`, or a ceiling that none fits. The order line says "싼 순", the same as the chip.
  - With a ceiling and the usual order, the fitting rows sort by walking as now, and the line counts only them ("2곳 · 걸음이 적은 순").
- **Kind chips** count the fitting places only, "전체" too.
- **Map:** only the fitting places are numbered. A plan over the price recedes like a candidate without the kind on screen: its name in grey, no number, no dot. Its pick, the first plan, fits whenever any does.
- **Wire:** `MealInput` takes `maxPrice?` and `cheapFirst?`. The app never adds them, only removes them, so an older main server is never sent a field it refuses. An answer without them shows as before.
- **Mock:** "5천원 이하로 저녁", "만원 안쪽", "싼 데" and the like answer the stored dinner with the condition in the main server's order. A recalculation with a condition is ordered the same way.

## Acceptance criteria

- [x] The dish and price, the order line, the chips' words, what fits and what goes over, and the input without a condition. (Unit tests.)
- [x] The list: the chips with ✕, a fitting row's dish and price, the grey section, the kind counts, none fitting, `cheapFirst`, and an answer without a condition as before. (Unit tests.)
- [x] The map: a plan over the price recedes, and the fitting ones keep their numbers. (Unit test.)
- [x] The app's input guard takes the two fields. (Unit test.)
- [x] Emulator screens at font scale 1.0 and 1.3, sent to the orchestrator before the pull request: the chip with fitting rows and the section over the price, none fitting, "싼 순", and the map with only the fitting places numbered.
- [x] Whole lint, format and types of the app and the main server.

## Comments

### Agent usage (2026-11-26)

- Agent time: about 40 minutes in the p04-58 session, from 11:34 UTC (this branch) to the screens, an estimate. It leaves out about 10 minutes waiting for another session to free the emulator. It includes the emulator screens at font scale 1.0 and 1.3, and the README fix of P05 ticket 53's pull request made in the same stretch. No subagents.
- Tokens, from 11:37 UTC to this entry: input 242 uncached, with cache reads 73,903,878 and cache writes 121,981; output 75,992.
