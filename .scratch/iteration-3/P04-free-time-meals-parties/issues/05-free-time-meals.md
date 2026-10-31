# 05: 공강에 밥 in the chat

Parent: [P04 spec](../spec.md) ("공강에 밥: Friends, Restaurants and the meal Quest", "The 공강 tools", "Cards and the API contract", "App")
Status: ready-for-agent
Blocked by: 04

## What to build

A User asks "오늘 점심에 누구 돼?". The Assistant gives the User's Free Time at lunch and names the Friends who are free with them. "민수랑 지은이랑 밥" gives the time all of them share and Restaurant cards for the Restaurants that are open then and leave enough time to eat. Each card has its menu, each person's Travel Time and a 파티 만들기 button. Restaurants are sorted so that the person with the longest way walks as little as possible. "면 빼고" keeps those with something else.

파티 만들기 opens the existing party form already filled in, with no model call: a 비공개 파티 at that Restaurant, at the earliest time all can be there, with the Friends invited. The form's own button makes it and invites them.

Friends' Timetables are used without any switch, as on Everytime, but only "free or not" reaches anyone: Friends' Classes, rooms and buildings are never shown or sent to the model.

The app changes only in JavaScript. An item marked **Person** is a person's work, not an agent's. The last items run after both scenarios are in.

## Acceptance criteria

- [ ] **Restaurants on the server.**
  - The app's hard-coded Restaurant → Place table (12 Restaurants) moves into a server seed. A Restaurant's key is its name as `GET /menus` gives it, which is also its key in the seed.
  - `GET /menus` gains a `placeId` per Restaurant. Old apps ignore it.
  - The new app reads it for the dining layer and for the menu panel's "N동" label, and its hard-coded file is deleted.
  - The Restaurants considered are every collected one (Co-op, dormitory, veterinary college) that has a Place. One not in the seed is left out.
- [ ] **Open (ADR 0011).** A Restaurant is open for a meal when that day's meal cell has at least one line that is not a note. A cell of only notes (휴무, hours, ※ notices) is closed. There are no special cases. The worker's line classification and the chat's `getMenus` do not change.
- [ ] **ADR 0011** records the meal open rule and supplements ADR 0001.
- [ ] **Meals.** Lunch is 11:00–14:30 and dinner 17:00–19:30. Breakfast is not handled.
- [ ] **Friends.**
  - Only accepted Friends are considered, whatever their Location Sharing switch.
  - Their busy time uses the Free Time function of ticket 04, on the Friend's Timetable and held Quests. A Friend with no Classes is free all day.
  - A Friend is free when their Free Time and the User's share at least 15 minutes inside the meal window. Travel is not considered at this step. Only free Friends are returned and named.
  - The shared time of the User and the named Friends is the intersection of their Free Time in the window.
- [ ] **`findFreeFriends`** takes a date, a meal or a window, and optionally Friend ids.
  - It returns the User's Free Time in the window and the free Friends, each with id, name, department and the overlap.
  - With Friend ids, it returns the time shared by the User and those Friends.
- [ ] **Fit and start time.** For each person:
  - their free interval starts at the latest of their previous item's end, the meal window's start and now;
  - in-travel = previous item's Place → Restaurant;
  - out-travel = Restaurant → next item's Place;
  - arrival = start of the free interval + in-travel;
  - Start = the latest arrival, rounded up to the next 5 minutes;
  - each person must leave by the earlier of their next item's start − 1 minute − out-travel, and the end of the meal window;
  - 식사 가능 시간 = the earliest leave-by − start;
  - the Restaurant fits when 식사 가능 시간 is at least 15 minutes;
  - when the shared time has several intervals, the earliest one in which the Restaurant fits is used, and a window the model passes limits the search.
- [ ] **Items without a Place.**
  - A Sub Quest with a point or a label goes through ticket 04's mapping first, the User's and a Friend's alike. Only one it cannot map is without a Place (ticket 03, PM decisions).
  - My item next to the free interval: the tool returns `needs` as in ticket 04, and accepts a departure Place or a leave-by time. Nothing is stored.
  - A Friend's item: that side's travel is left out and the Friend is judged on time only. Their Travel Time shows as below, and "—" only when the time to show is unknown (ticket 03, PM decisions).
- [ ] **Travel shown per person:** the in-time; with no previous item, the out-time; with neither, "—".
- [ ] **Order:** by the longest Travel Time shown, shortest first; then by the sum of the shown times; then by name. A "—" counts in neither and is never highlighted. At most 20 cards.
- [ ] **Menu conditions** ("면 빼고", "국밥 먹고 싶어") are read by the model from the menu lines it receives. There is no condition code, keyword list or word-specific prompt hint. "X 빼고" keeps Restaurants with at least one dish of that meal that is not X, and "X 먹고 싶어" keeps those with an X dish.
- [ ] **`findMealRestaurants`** takes a date, a meal and Friend ids, and optionally a window, a departure Place and a leave-by time.
  - It returns the shared time, `collectedAt` and the fitting Restaurants in order.
  - Each comes with its key, name and Place, its non-note menu lines (wrapped as others' text), 식사 가능 시간, the start, and each person's Travel Time and mode.
  - When no menu was collected for that day, it says so. When the shared time is empty, it says so and does not say who is busy. It can also return `needs`.
- [ ] **`showRestaurants`** takes Restaurant keys and shows Restaurant cards. The server builds each card and attaches its Proposal.
- [ ] **Found ids.**
  - The ids found now also include the Friends of `findFreeFriends`, and the Restaurants of `findMealRestaurants` with their Places for `proposeQuest`.
  - Friend ids accept what `resolveFriend` or `findFreeFriends` returned in this message, and the candidate the User tapped.
- [ ] **The meal Quest on each Restaurant card** is a server-computed Proposal: Join Policy Closed, no Board, title `<Restaurant>에서 점심` or `<Restaurant>에서 저녁`, the start above, the Restaurant's Place named with the Restaurant's name (the form shows "학생회관식당 (63동)"), the Friends of this request as invitees, capacity 1 + invitees, an empty description and no Global Event.
- [ ] **파티 만들기.**
  - The card's button opens the existing party form filled from this Proposal, as board ③ shows, the path 수정 already takes. No model call is made.
  - The form's own 파티 만들기 makes the Quest and invites through the existing making sequence.
  - The chat path ("여기로 하자" → `proposeQuest`) stays.
- [ ] **The `restaurant` card kind:** key, name, Place number, date and meal, 식사 가능 시간, the non-note menu lines, people (name, "나" for the User, mode, minutes or none, longest) and the Proposal.
- [ ] **History.** The request DTO accepts a card reference of kind `restaurant` whose id is the Restaurant's key, a name and not a UUID. Restaurant cards are sent back in history like other cards.
- [ ] **The Restaurant card in the app,** as board ② draws it:
  - name;
  - "N동 · 오늘 점심";
  - "식사 가능 시간 N분";
  - the first two menu lines and "외 N개";
  - a chip per person, "{name} {도보|셔틀} N분", with the longest highlighted;
  - 파티 만들기.
- [ ] **Old APKs.** An APK from before P4 rejects any reply that contains a Restaurant card, as its ordinary failure. Nothing crashes, and 공강 파티 replies still work there.
- [ ] **Never sent to the model:** rooms, the User's or Friends' Places and coordinates, Friends' Classes and the reason anyone is busy. No Friend who is not free, no excluded Restaurant and no reason is ever returned.
- [ ] **Constants.** The meal numbers join the one constants table: 15 minutes of eating, 5 minutes of rounding and the meal windows.
- [ ] **The 공강 rules, meal side.** The same fragment as ticket 04 states, by meaning and with no keyword list:
  - a question about who is free goes to `findFreeFriends` ("오늘 점심에 누구 돼?");
  - Friends with a day and a meal, and no Place or single clock time, go to `resolveFriend`, then `findMealRestaurants` ("내일 점심 민수랑 밥"), with the window when the User names one ("12시에서 1시 사이");
  - a request with no day or meal is asked about, as the chat does today ("이민수랑 밥 약속 잡아줘");
  - a request that names a Place or a single clock time goes to `proposeQuest`, as today ("1시에"; ticket 03, PM decisions);
  - "여기로 하자" after Restaurant cards picks a plan and is not a request to recruit;
  - when `resolveFriend` answers `several`, the model calls `findFreeFriends` for that meal, reads the departments there and names them in its question. P07's chips stay as they are;
  - to ask when a Friend is ambiguous or a tool returns `needs`, and for breakfast to say that lunch and dinner are covered;
  - that a follow-up ("면 빼고", "여기로 하자") calls `resolveFriend` again for the named Friends' ids, then the find tool again;
  - what a reply must hold: who is free: the User's Free Time in the window and the free Friends' names; with Friends: the shared time, that the Restaurants are ordered by the longest Travel Time, and the dining map button;
  - when there is no shared time, no menu or no Restaurant fits, to say so plainly without naming who is busy.
  - The rules name no clock time for a meal: the model passes `meal`, and the server's meal windows apply.
- [ ] **Tests.**
  - The judgement suite of ticket 04 gains the meal side: free Friends and shared time, open Restaurants, Travel Times, order and start time.
  - Separate integration tests at the assistant endpoint with the scripted model, for what the world does not reach:
    - `needs` from `findMealRestaurants`, then a departure Place or a leave-by time passed after asking;
    - a Restaurant card accepted in history;
    - the Restaurant card's Proposal, field by field.
  - The open rule as a unit test on a committed fixture of the lines the worker parses from its saved menu pages of 2026-10-01.
  - Fake-server screen tests: the Restaurant card; 파티 만들기 opening the filled form, and the form making the Quest and inviting; the dining layer and the menu panel using `placeId` from the server.
- [ ] **Landing.** With ticket 04, this lands before P05's R0 (11-02). It rebases on whatever P07 has landed, as ticket 04 does.
- [ ] **Person: the cost.** A person confirms the cost before each real-model run below.
- [ ] **After the change: regression.**
  - Every case of the fixed P19 set runs 3 times again, with the same model and limits as ticket 03's baseline.
  - A case newly fails when it fails in at least 2 later runs but in at most 1 baseline run. No case may newly fail.
  - Any call to a new tool in those cases is reported, with the tokens and cost per turn of both sets of runs.
- [ ] **After both scenarios: the P4 suite.** The 40 cases run 3 times. The mean per category and overall is recorded against the thresholds, with the model, the limits, the commit and the date.
