# 72: A menu question's answer is the Restaurant opened as from a meal answer's list

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: a main-server Release and an app OTA update.

## What happens now

From the phone on 2026-11-26, "예술계 메뉴가 뭐야?" was answered with:

- the model's paragraph of the menu;
- a pill "83동에서" with "근거 ›";
- two bold lines ("예술계식당 오늘 점심은 … 6,000원 외 2", "14:48까지 60분 먹을 수 있어요");
- and, under 근거, the whole menu again in a paragraph, "83동 → 예술계식당 걸어서 3분", and "식사는 한 시간으로 잡았어요".

The user's points: prose instead of the list's view; nothing says why "83동에서" is there; the lines repeat each other; and the word "근거" and what it opens are poor.

## Cause

`findMenu` answered with a Lookup of kind `menu` (`menu-lookup.ts`): the meal Plan's chips, two lines, and the basis. The app drew it as every Lookup is drawn (`lookup-card.tsx`), and the rules asked the model for one sentence.

## What to build

The user chose A on the proposal page: no sentence above the menu.

1. **A Restaurant that can be done.** When `findMenu` finds the menu and a meal Plan for the User alone at the Restaurant's Place, the reply's `answer` is that meal answer, with `opened` naming the Plan. It is the same as `planMeal` with the Restaurant.
   - The app opens it at that Plan with its menu open, the card raised: the view of a place pressed in a meal answer's list (`MealMenu`).
   - That view has the head (name, "HH:MM 도착 · 걸음 N분"), the date and meal at the right, the menu in corners, the main button, "＋ 같이", and "‹ N곳 목록", where N is the answer's places at that Place.
   - The model writes nothing. The menu view hides the reply's words in any case.
2. **A Restaurant that cannot be done now** (closed, no time to eat there, the meal over, its menu not posted). The Lookup keeps bringing the Restaurant to the map, and gains `menuView` with the Restaurant, the date, the meal, and why in a few words: "오늘 휴점", "시간이 안 맞아요", "점심 시간이 지났어요", "메뉴가 아직 안 올라왔어요".
   - The app shows the same view: the head with why in place of the time, the menu of its day.
   - It has no number, no way back to a list, and no main button.
   - The model says why in one short sentence above it.
3. **Gone for this answer:** the origin pill, the bold lines, and 근거. The found case's Lookup builders are removed. The no-plan Lookup now has no chips, lines, or basis.
   - **Still in use elsewhere:** the Lookup card's chips, lines, and 근거 stay for every other Lookup (a way, a Friend, the hours, a pressed or asked Place, a day, the study spaces, the Tutorial).
   - `Lookup.menu` now has no producer on the main server. The app still reads it from an older server.
4. **Rules:** `MENU_RULES` say to write nothing for a menu found, and one short sentence of why for none. A new eval case, `menu-found-writes-nothing`, expects no words.

## Acceptance criteria

- [x] `findMenu` found answers with the meal answer opened at the Restaurant and no Lookup. (Integration test, failing before.)
- [x] `findMenu` none answers with the Restaurant's Lookup with `menuView` and why: closed by its notice "오늘 휴점", notes only "점심은 안 해요", no time, the meal over, not posted, no meal. (Unit and integration tests.)
- [x] The app opens such an answer at the Restaurant's menu, with the head, the menu, "‹ 1곳 목록", and no pill, lines, or 근거. A closed Restaurant shows its view with why and no button. (Integration test over the mocks, failing before.)
- [x] The app checks `menuView`. (Unit test.)
- [x] No native file changes. Lint, format, and types pass on the main server and the app.
