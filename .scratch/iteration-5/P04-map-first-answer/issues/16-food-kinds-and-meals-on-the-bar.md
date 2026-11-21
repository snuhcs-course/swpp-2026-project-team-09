# 16: Kinds of food as chips, lunch and dinner on the bar

Parent: [P04 spec](../spec.md)
Status: in-progress
Blocked by: [13](13-our-marks-recede.md) and [15](15-all-menus-list.md) for the candidates' tags and the chip row; P05's PR 416 for each dish's kind, the kind on screen, and `otherMeal`.

Native files: none. Releases: an app OTA update only.

## What to build

A meal question is answered on the map at once, and what it leaves open is chosen there, not asked in words (boards 24 to 26).

- **Kinds as chips** (board 24). The chip row above the input starts with a small grey label "종류", then one chip per kind of food that the candidates' dishes of that meal hold, each with its count of places ("한식 3", "양식 1"). A kind no candidate serves has no chip, and with fewer than two kinds there is no label and no chip. "메뉴 모두 보기 ▲" of ticket 15 is the row's last chip, at the right.
- **A press filters on the phone** (board 25), with no turn to the model: the chip is filled; a candidate without that kind recedes to a grey name tag (no number, no second line); the others keep their numbers, and each one's second line names its dish of that kind first. A second press clears it. One kind at a time. The kind on screen goes with the next message as a condition on screen, so that "더 싼 데" keeps it.
- **Saying the kind** ("한식") ends on the same screen, with the chip filled.
- **Lunch and dinner on the bar** (board 26). For a later day, or for a meal that is not on now, the top bar names the meal with its day ("월(23일) 점심 12:16–13:30"), and at its right end the other meal of that day stands as a pressable tick ("저녁 17:00 ›"; from dinner, "‹ 점심 12:16" at its left end). A press recalculates for that meal without the model, as a drag on the bar does. Lunch or dinner is never asked.
- The bottom stays two rows, the chips and the input with its main button. No question sentence.

## What happens now

- "월요일에 밥 뭐 먹을까" is asked back for a kind of food, and the kind's answer is a Markdown list of restaurants with a button to the map (the released app's screen `t5-meal-text.jpg`). P05's PR 415 makes such a question a meal Plan with candidates.
- A meal answer's chips are its conditions; a meal is changed only by words.
- `MenuDish` has a name and a price, no kind; `MealInput` has `meal` but no kind of food.

## What changes

- Data, agreed with P05 as `Plan.menu` was (the main server owns what a reply holds):
  - `type Cuisine = '한식' | '중식' | '일식' | '양식' | '분식'`, and `MenuDish.cuisine: Cuisine | null` on `Plan.menu` and `Lookup.menu`: set once per dish name when menus are collected, never per request; null for another cuisine, a side dish, rice, a drink, or a dish not read yet, and absent from a server before it. A null kind joins no chip.
  - `MealInput.cuisine?: Cuisine | null`: the kind on screen. The app sends it in `RequestContext.conditions` and in a recalculation's input; the server keeps it while the date and meal are the same and the model gives no new one (so "더 싼 데" keeps it), sets it when the User names a kind ("한식"), clears it for "아무거나", and returns it in the reply's `input`. The reply holds every candidate, those serving the kind first.
  - `AnswerReply.otherMeal?: { meal: 'lunch' | 'dinner'; start: 'HH:MM' } | null`, on meal answers: the other meal's window start (lunch 11:00, dinner 17:00), or now when today is already inside it; null when that meal is over today or no Restaurant serves it that day, and then no tick shows. The tick reads `start` ("저녁 17:00 ›", "‹ 점심 12:16"). A press recalculates with `meal` switched, the window `{ from: null, until: null }`, every person's constraints empty, `placeId` null, and `cuisine` dropped (the other meal's menus differ).
- The kind chips: their kinds and counts from `answer.plans`' `menu.dishes` (one function, unit tested); the filter is the answer's own state on the phone and changes which tags recede, not which Plans the reply holds.
- A receded candidate's tag: its name alone in grey. Whether a press on it picks it (and clears the filter) is not drawn; it is decided before this ticket is built.
- The second line of a candidate's tag (ticket 13) starts with its first dish of the chosen kind.
- The bar's words row: the meal and its day as its title, and the other meal's tick at the end the other meal lies on.

## Must not break

- The candidates' tags and their presses (ticket 13), 메뉴 모두 보기 (ticket 15), the band's drag and recalculation (`answer-band-*`), and the conditions sent with the next message (`answer-correct-*`).
- A meal answer without `cuisine` on its dishes: no kind chips, as today.

## Decided while building (2026-11-22)

- A grey (receded) tag pressed becomes the pick, and the kind filter clears.
- A kind pressed while the pick has no dish of it: the pick moves on the phone to the first candidate that serves it (the lowest number among them), as a pressed tag does; clearing the chip leaves the pick where it is. Reason: saying "한식" makes the server put such a place first, and a press must end on the same screen as the words.
- The bar's title keeps the app's one day helper (`koreaDayWord`): "내일(월) 점심 …", "11/23(월) 점심 …", or the meal alone today before its window opens ("저녁 …"), not board 26's "월(23일)". The tick stands in place of the bar's end label on its side.
- The meal switch sends the kept input with `meal` switched, `window: { from: null, until: null }`, every person's constraints empty, `placeId: null`, and `cuisine` left out (P05: absent is what a server before the kinds also accepts).
- Chips of the same count stand in the order 한식, 중식, 일식, 양식, 분식; the row is 종류, the kinds, "지난 답 N개" and the note, then 메뉴 모두 보기.

## Acceptance criteria

- [x] The kinds and counts of a meal answer: "한식 3", "양식 1"; no chip for a kind nobody serves; none with fewer than two kinds. (Unit test.)
- [x] A press on 한식 fills it and makes the candidate without 한식 a grey name tag; the others keep their numbers with their 한식 dish first; a second press clears it. (Integration test.)
- [x] A message sent with 한식 filled carries `cuisine: '한식'` in its conditions; a reply whose input has `cuisine: '한식'` shows the chip filled. (Integration test.)
- [x] A lunch answer of a later day shows "내일(화) 점심" with "저녁 17:00 ›"; a press asks the recalculation for dinner without the kind and shows "‹ 점심" with the lunch tick's start. (Integration test.)
- [ ] Boards 24, 25, and 26 on a phone with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.
