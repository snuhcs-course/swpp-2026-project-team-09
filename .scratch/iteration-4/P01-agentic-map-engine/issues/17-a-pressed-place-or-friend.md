# 17: A pressed building or face, answered without the model

Parent: [P01 spec](../spec.md) ("The contract", "Recalculation"); package B's row 6 (P02 tickets 18 and 22)
Status: ready-for-agent
Blocked by: None for the server. The app draws the card in package B's P02-22.

## What to build

A press on a building or a Friend's face on the everyday map asks `POST /assistant/taps`, which answers at once, with no model and no count against the day's messages. It answers with a Lookup carrying a `card`, read only through what the server knows and the Friend view.
- A building: the minutes to it and when I arrive, how long I can stay before my next item, today's menu, its events, and the Friends my map shows there, with a one-line suggestion and the buttons "여기서 먹기", "행사 보기", "같이 갈 파티", and "길 안내".
- A Friend: their Timetable label, the place my map shows them at, and the minutes from me, or at the Timetable only their Class and the next one, with "지금 위치는 보여 주지 않아요".

These are wireframe row 6, boards a1, a2, a3, a14, a4, a13, and a10.

## Acceptance criteria

- [x] `POST /assistant/taps { tapped: { kind: 'place', placeId } | { kind: 'friend', userId }, location }` answers a Lookup of kind `place` or `friend` with `card`.
  - 400 for a Place that does not exist; 404 for a userId who is not the asker's Friend.
  - No model, and no count.
- [x] The contract gains, on both sides:
  - `Lookup.kind` `place`;
  - `Lookup.card?: LookupCard | null`, holding `title`, `subtitle`, `facts` (`icon`, `text`, `strong`, `userId`), and `note`;
  - `LookupAction` `plan` (`label`, `input: PlanInput`) and `ask` (`label`, `text`).

  The app's reply check accepts them. `apiClient.answerTap(tapped, location)` calls the endpoint, and the mock answers with copies of the real replies.
- [x] A Place's card, as the seams note's "A Place" says:
  - the facts in order: route, clock, meal, flag, user;
  - the note under its three conditions;
  - the actions by what the Place holds;
  - the chips and basis of a way;
  - the scene with the Place as the pick and the Friends of the facts.
- [x] A Friend's card, as the seams note's "A Friend" says:
  - the title is the Friend's full name;
  - the subtitle is the level's words;
  - the facts by level, read only through the Friend view;
  - nothing beyond what the asker's map shows (the leak test of ticket 10 extended to the tap).
- [x] Unit tests for each card's facts with values from the boards or chosen by hand; integration tests at the endpoint, refusals and the Friend view's levels included.

## Decisions (2026-11-15)

1. **The contract** is the one in package B's seams note, `/Users/fyoon/Library/Application Support/Claude/side-session-notes/local_fa46a4fb-6f7a-4175-8d94-2691f449455c/row-6-seams.md`, section "Pressing a building or a face". The card's title for a Friend is the full name: package C's label (#277) was dropped by the user.
2. **The code:**
   - the place card in a new `lookup/place-lookup.ts` (and its service), reusing `way.ts` (the start, the walk, the next item), `menu-lookup.ts` (`dishesOf`), the Global Events at the Place, and the Friend view;
   - the Friend half in `lookup/friend-lookup.ts`;
   - the endpoint in `assistant.controller.ts` beside `answers`, behind the same guard.
3. **The stay** is from the arrival to the next item's start, less the walk from the Place to the next item's Place.

## Comments

### Decided in the build (2026-11-15)

- **A Place's title** is its label as every answer calls it, the number when it has one ("63동", "39동", "302동", "73동"), and the subtitle its name ("학생회관", "대학원연구동(1단계)", "제2공학관", "문화관"). A Place without a number has its name as the title and no subtitle. No rule gives "학생회관" before "63동" but "39동" before "대학원연구동", as the boards do.
- **The next item** is the User's next item today of any kind, with a Place or without; the walk on is counted only to a Place other than the pressed one. A stay of 0 minutes or less reads "{HH:MM} 수업 전까지 머물 시간이 없어요".
- **Where the User sets out from** follows the way's rule (`startOf`): the Place of the location, the main gate off campus, else the Place of the last item that ended today. When none is known, the card has no route or clock fact, no origin chip, and no basis, and the first fact it has is the strong one. With nothing left today the stay is open: no clock fact, and the note's stay condition holds.
- **The meal now** is the meal whose window holds the moment pressed (lunch 11:00–14:30, dinner 17:00–19:30, `MEAL_WINDOWS`). Between the meals no menu is read, and there is no meal fact, note, or "여기서 먹기". A Restaurant whose meal holds only notes is left out. Two Restaurants of one Place give two meal facts and one "여기서 먹기".
- **Events** are the published ones that overlap today and have not ended, matched to the Place as the events answer matches them (`placeIdOf`), in the order they start. One under way reads "{title} · HH:MM까지 열려요" ("{title} · 열려 있어요" without an end); one ahead "{title} · HH:MM–HH:MM" ("{title} · HH:MM부터" without an end). "같이 갈 파티" takes the first of them.
- **A Friend's line on a Place's card** uses the Friend Lookup's words, so the card never says that a Friend seen through the Timetable only is there: at the exact or the building level "김민수가 여기 있어요 · 수업 중 12:15까지"; at the Timetable only "시간표로는 김민수가 12:15까지 여기서 수업이에요" during the Class, and "김민수는 12:15에 여기서 수업이 끝났어요" for the 15 minutes after it. A Friend at the exact level is in the Place only when the Friend view puts their position in it; near it is not in it. In a line that already holds a dot, the Timetable label joins its state and time with a space ("수업 중 12:15까지"); the Friend card's own clock fact keeps the dot ("수업 중 · 12:15까지", board a4).
- **The Timetable-only Friend card** names the Place of a Class that ended only for the 15 minutes the map draws them there ("12:50에 43-1동 수업이 끝났어요 · 공강 14:00까지"); later its first fact is the Timetable label alone. The next Class follows with its Place ("다음 수업 14:00 · 302동").
- **The Friend card's walk** is from where the asker sets out, by the way's rule, to the Place the map shows them at, the nearest Place for "301동 앞". It and the "{start}에서" chip are left out when either end is unknown or both are the same Place.
- **The User in the pressed Place**: "지금 여기 있어요", the stay counted from now, the way's basis of being there ("지금 있는 곳이 학생회관(63동)이에요"), and no "길 안내".
- **The scene** draws the pick and the Friends of the facts; the User's own dot is the everyday map's.
- **The code.** `WayService.argsFor` gives a way's inputs, shared by the way, the place card, and the Friend card's start. `lookup/card.ts` builds the facts and marks the first strong. `friendHere`, `friendTap`, and `shownLevel` are in `friend-lookup.ts`; the Friend half's service is `FriendLookupService.tap`, and `friendTapLookup` in `friend.service.ts` reads it through the Friend view as `friendLookup` does. `PlaceCardService` (`lookup/place.service.ts`) reads the Classes only of the Friends the Friend view could show in the Place: those at the Timetable only and those in it.
- **The app.** `Tapped` and the card's types are in `lookup-types.ts`; `isLookup` takes the `place` kind and a card that is absent, null, or whole, and `isAction` takes `plan` (its input by `isInput`) and `ask`. The mock does not calculate: a press answers the stored card of that Place or Friend, else 63동's (a1) or 김민수's (a4).
- **The copies** (`mobile/src/api/mock/data/tap-lookups.json`) were written by `placeAnswer` and `friendTap` over the seed's Places, walking table, and shuttle timing, on Tuesday 2026-11-17 at 12:10 with the User located in 301동 (a1, a3, a14, a4, a13, a10) and on Friday 2026-11-20 at 13:50 after a Class in 24동 (a2), with the ids of the meal copies for the User, 김민수, and 김지은, a new id for 박서준, the ids of 채용박람회 and 기업 설명회 of `events-answer.json`, and the boards' dishes.

### Differences from the boards (2026-11-15)

- a1 and a2: the title and subtitle are "63동" / "학생회관" and "73동" / "문화관" (boards "학생회관" / "63동", "문화관" / "73동"); a3's subtitle is the seed's name, "대학원연구동(1단계)" (board "대학원연구동").
- a1's basis: "301동에서 63동까지 걸어서 15분" (board "301동에서 학생회관까지"), and the shuttle's line is the way's own, from the seed's timing: "셔틀은 기다림 없이도 15분(정류장 2 · 타기 4 · 내려서 9)이라 걸어요" (board "셔틀은 정류장까지 2분, 타는 데 12분이라 걸어요").
- Names are full: 김민수, 김지은, 박서준 (boards 민수, 지은, 서준). a14's line has no "›", which is the app's.
- a13's Place is "8동" (board "두산인문관"), by the label rule.
- a14's face is tagged as the Friend Lookup tags it, "김민수 · 지금 302동" (board "민수 · 수업 중 12:15까지").
- a4 and a13 carry the chip "301동에서" only, without "지금 12:10" (the seams note's rule); a10 has none (board "지금 12:10").
- "길 안내" is the `guide` action, which carries no label; the boards' "가는 길" is the app's word for it.
- The integration test of a1 posts the test helper's lunch, "제육볶음"; the unit tests and the copies use the boards' "순두부찌개" and "돈까스".
