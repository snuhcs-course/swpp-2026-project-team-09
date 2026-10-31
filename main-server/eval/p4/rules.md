# The P4 rules

What the Assistant's 공강 tools must answer, and what a reply must do with it, in prose. The labels of the P4 suite are worked by hand from this document, the world (`world.yaml`) and the travel fixture (`travel-fixture.json`), never from the code.

The rules are frozen with the suite at the P8 freeze, 2026-11-01. Section 15 holds the PM's decisions of 2026-10-31. Where this document and the spec disagree, this document holds.

## Words

- **Item**: one entry of a User's day: a Class meeting, or a timed Sub Quest of a Quest they hold.
- **Free Time** (공강): a stretch of a User's day that no item takes.
- **Gap**: one Free Time interval.
- **Travel Time**: the time from one Place to another, on foot or by the circular shuttle.
- **Restaurant**: a dining place whose daily menu is collected.
- **Candidate**: a recruiting Quest or a published Global Event that could be shown for a gap.
- **Shared Quest**: a Quest with two or more Holders.

## The numbers

Every number of the judgement. Nothing else in this document is a free constant.

| What                                                            | Value                              |
| --------------------------------------------------------------- | ---------------------------------- |
| Arrival margin, for parties and for meals                       | 1 minute                           |
| Shortest stay at a candidate with no end or longer than 3 hours | 30 minutes                         |
| Length of a busy Sub Quest with no end or longer than 3 hours   | 30 minutes                         |
| Longest candidate or Sub Quest taken at its own end             | 3 hours                            |
| Reach of the nearest Place point                                | 150 m                              |
| Shortest eating time                                            | 15 minutes                         |
| A meal's start rounds up to the next                            | 5 minutes                          |
| Lunch                                                           | 11:00–14:30                        |
| Dinner                                                          | 17:00–19:30                        |
| Shuttle chosen when faster than walking by at least             | 3 minutes (already in the fixture) |
| Most cards in one reply                                         | 20                                 |

## 1. Time

- Every time is in Korea, as HH:MM. A day runs from 00:00 to 24:00.
- `now` is the time the case stands at.
- A date maps to its weekday and nothing else. Holidays, 휴강 and exam weeks are unknown.
- A tool answers for any day from today to a week ahead.

## 2. Busy items

The items of a User on a day are:

- each Class meeting on that weekday;
- each timed Sub Quest of a Quest the User holds. The attending Sub Quest of a Quest for a Global Event takes the Global Event's start and end.

A Sub Quest with a start and no end, or one longer than 3 hours, is busy for 30 minutes from its start. Exactly 3 hours is not longer. A Sub Quest with no start, or a cancelled one, is ignored. An active Party blocks nothing.

A Quest counts as held only by its Holders. Asking to join does not make anyone a Holder.

The same rules apply to a Friend. The reason a Friend is busy is never shown or told to the model.

## 3. Free Time

- Free Time is every interval between items, including before the first item and after the last. Overlapping or touching items leave no interval between them.
- Without any item the whole day is free. That covers a User or a Friend with no Timetable, and one with no Classes that day.
- On today, Free Time starts no earlier than `now`. A gap that has already begun starts at `now`.
- A gap's **previous item** is the item that ends where it starts, and its **next item** the item that starts where it ends. A gap cut by `now` keeps its previous item. The first gap of a day has no previous item, and the last has no next item.

## 4. Travel Time

- The travel fixture gives the seconds and the mode, walk or shuttle, of every ordered pair of the world's Places. It does not depend on the time of day. The way from a Place to itself is 0 seconds on foot.
- The way from A to B can differ from the way from B to A.
- **Every comparison uses the exact seconds.** Rounding is only for what is shown.
- Minutes shown are the seconds ÷ 60, always rounded **up**. 200 seconds shows as 4분, and 0 seconds as 0분.
- A leave-by time shown is rounded **down** to the minute, so that it is never late. 13:47:54 shows as 13:47.
- The shuttle's own rules (weekdays, 08:00–21:00, at least 3 minutes faster) are already in the fixture's modes. The labels use the mode the fixture gives.
- Live positions are never used.

## 5. A place as a Place

A candidate's place, and the place of a Sub Quest in anyone's day, becomes a Place by the first of these that answers:

1. the Sub Quest's own Place;
2. a Place whose point equals the coordinates exactly;
3. the Place the place lookup finds at the point: the point is inside its outline or within 20 m of its wall;
4. the nearest Place point within 150 m;
5. a label that equals a Place's name or number exactly;
6. otherwise the place is unknown.

Since outlines cannot be read by hand, `world.yaml`'s `mappedPoints` gives steps 2 to 4 for each point of the world. A Global Event always has a point. A Class's Place is used as it is, and a Class with none has no Place.

A candidate whose place is unknown is left out. An item whose place is unknown is an **item without a Place** (section 8).

## 6. 공강 파티: finding the gap

`findFreeTimeEvents` takes `from` and `to`, each an item id, a clock time, `now` or `end` (the end of the day).

- From an item to an item: every gap between them, in order. There may be several, when something the User holds falls between the two.
- From `now`, or from an item, to `end`: every gap from there to the end of the day.
- Between two clock times: the part of each gap inside that window. The candidates must also start inside the window, and one with an end must end inside it too. Travel still runs from the gap's previous item and to its next item, and the User still leaves at the time section 7 gives, not at the window's start.
- Any mix of these works the same way. 첫 수업 전 is from `00:00` to the first item, and from `now` on today.
- 다음 공강 is the first gap after `now`. A User with no items has one gap, the rest of the day.
- Two Classes the User names that are not on that day cannot be found. A User with no Timetable has none, so the model asks for the time.

Each gap is answered with its start, its end, the name of its previous item and the name of its next item, either one null when there is none.

## 7. 공강 파티: candidates and fit

**Candidates** are recruiting Quests, Open or Approval, that the Boards show the User, and published Global Events. Every Global Event of the world is published.

**Left out, and neither returned to the model nor explained:**

- a full Quest;
- a Quest the User holds;
- a Quest the User has asked to join;
- a Quest for a Global Event whose Shared Quest the User already holds;
- a Closed Quest, which no Board shows;
- a Quest or Global Event with no start inside the gap. An event already under way is left out, since its hours that day are unknown;
- a candidate whose place is unknown.

**The start judged.** A Global Event is judged on its own start and end. A Quest is judged on its first Sub Quest that starts inside the gap, whichever Sub Quest would be next on the Board. A Quest for a Global Event has an attending Sub Quest at the event's start, end and place. A start is inside a gap when it is at or after the gap's start and before its end.

**Before.** With a previous item, the User leaves its Place at the start of the gap (the item's end, or `now` if that is later) and must arrive at least 1 minute before the candidate starts. Without one there is no travel on that side, and the candidate only has to start after `now`.

**After, with an end and at most 3 hours long.** With a next item, the User leaves the candidate when it ends and must reach the next item's Place at least 1 minute before it starts. Without one there is no after side.

**After, with no end or longer than 3 hours.** With a next item, the User's leave-by time is the next item's start − 1 minute − the way from the candidate to the next item's Place. The candidate fits when that leaves at least 30 minutes after its start. Without one there is no after side.

**What is returned for a candidate that fits:** its kind and seed, its start and end (null when it has none), and:

| Situation                            | `travel`      | After it                                              |
| ------------------------------------ | ------------- | ----------------------------------------------------- |
| A previous item                      | its way there |                                                       |
| No previous item                     | null          |                                                       |
| Next item, an end of at most 3 hours |               | `next`: minutes of the way, and whether it is a Class |
| Next item, longer than 3 hours       |               | `leaveBy`                                             |
| Next item, no end                    |               | `leaveBy` and `endUnknown: true`                      |
| No next item                         |               | nothing                                               |

**Board.** `board` narrows Quests to that Board. Global Events have no Board and stay, and the model judges them by title like any other condition.

**Order.** Soonest start first, Quests and Global Events together. Two with the same start are in the order of their titles, by code point. Every fitting candidate is returned, with no cap. The 20 soonest become cards.

## 8. An item without a Place

**The User's item next to the gap.** A tool that judges travel returns `needs` instead of results, naming the side (before or after) and the item. With several gaps, the first gap decides, and the before side comes first.

- Before: the model asks where the User leaves from and passes the answer as `departurePlace`, a Place found through `resolvePlace`. It takes the place of the previous item's Place, and the time of leaving does not change.
- If `resolvePlace` answers `none`, the model says that Travel Times cannot be computed from off campus and asks once where the User enters the campus, such as 정문. If that gives no Place either, it shows no candidates.
- After: the model asks by when the User must leave and passes the answer as `leaveBy`, which replaces the after side:
  - a candidate with an end of at most 3 hours must end by `leaveBy`, and shows no `next`;
  - any other candidate must leave at least 30 minutes between its start and `leaveBy`, and shows that `leaveBy`, with `endUnknown: true` when it has no end.
- What the User answers is used for this request alone. Nothing is stored.

**A Friend's item.** That side's travel is left out and the Friend is judged on time only.

## 9. 공강에 밥: who is free

`findFreeFriends` takes a date, a `meal` or a `window`, and optionally `friendIds`.

- Only accepted Friends are considered, whatever their Location Sharing switch.
- `freeTime` is the User's Free Time inside the meal window.
- A Friend is free when their Free Time and the User's share one unbroken stretch of at least 15 minutes inside the window. Exactly 15 minutes counts. Travel is not considered here.
- Each free Friend comes with `overlap`: every interval their Free Time shares with the User's in the window.
- Only free Friends are returned. The order of the Friends does not matter.
- With `friendIds`, `friends` holds only those of them who are free, and `shared` is the intersection of the Free Time of the User and those Friends in the window.

## 10. 공강에 밥: where to eat

`findMealRestaurants` takes a date, a `meal` and `friendIds`, and optionally `window`, `departurePlace` and `leaveBy`.

**The shared time** is the intersection of the Free Time of the User and the named Friends inside the meal window. A `window` narrows the meal window on both sides: `shared` lies inside it, and everyone must leave by its end.

**Restaurants considered** are those with a Place that are open for that meal that day.

- A Restaurant is **open** when that day's meal cell has at least one line that is not a note. A cell of only notes (휴무, hours, ※ notices) is closed. A Restaurant with no lines for that meal is closed.
- A Restaurant without a Place is left out.

**Fit.** For a Restaurant and one shared interval, for each person, take their previous item (the last that ends at or before the interval's start) and next item (the first that starts at or after the interval's end):

- their free interval starts at the latest of the previous item's end, the meal window's start and `now`;
- in-travel is the way from the previous item's Place to the Restaurant's Place; with no previous item there is none;
- out-travel is the way from the Restaurant's Place to the next item's Place; with no next item there is none;
- arrival = the start of their free interval + in-travel;
- leave-by = the earlier of the next item's start − 1 minute − out-travel, and the end of the meal window.

Then:

- **Start** = the latest arrival, rounded up to the next 5 minutes. A time already on a multiple of 5 minutes stays;
- **식사 가능 시간** = the earliest leave-by − Start. It is compared exactly, and shown in whole minutes rounded **down**. 16 minutes 18 seconds shows as 16;
- the Restaurant fits when 식사 가능 시간 is at least 15 minutes.

With several shared intervals, the earliest interval in which the Restaurant fits is the one used for it. Each Restaurant is judged on its own, so two Restaurants of one answer can use different intervals.

**Travel shown per person,** for the interval used:

- the in-time;
- with no previous item, the out-time;
- with neither, "—": `mode` and `minutes` are null.

For a person whose previous item has no Place, the in-time is unknown, so they show "—" even when an out-time is known. The User is named 나, a Friend by their stored name. `longest` is true for every person who has the most minutes shown. A "—" is never `longest`.

**Order.** By the most minutes shown on the Restaurant, fewest first; then by the sum of the minutes shown; then by name, by code point. A "—" counts in neither. At most 20 become cards.

**When there is no Restaurant to show.**

- No menu was collected for that day: `result: none`, `why: no-menu`. This comes first.
- The shared time is empty: `result: none`, `why: no-shared-time`.
- There is shared time and no Restaurant fits: `result: found`, with `shared` and no `restaurants`.

**The User's item without a Place** next to the shared interval gives `needs`, as in section 8. With several shared intervals, the first decides, and the before side comes first. `departurePlace` works as there. `leaveBy` takes the place of the User's own leave-by.

**Menu conditions** are read by the model from the menu lines it receives. There is no keyword list.

- "X 빼고" keeps the Restaurants with at least one dish of that meal that is not X.
- "X 먹고 싶어" keeps the Restaurants with an X dish.

Which dishes are noodles is a judgement of meaning. Noodles are dishes whose main part is noodles, such as 칼국수, 냉면, 우동, 라면, 국수. A person reviews this label.

## 11. The tools

The model passes the User's words, or ids a tool gave it, and the server decides. Tool results do not carry over between messages: a follow-up calls `resolveFriend` again for the named Friends' ids, and then the find tool again.

The 공강 tools:

- **`getMyDay(date)`**: the User's items that day, each with its id, name, start and end. Never rooms, Places or coordinates.
- **`findFreeTimeEvents(date, from, to, board?, departurePlace?, leaveBy?)`**: sections 6 to 8.
- **`findFreeFriends(date, meal | window, friendIds?)`**: section 9.
- **`findMealRestaurants(date, meal, friendIds, window?, departurePlace?, leaveBy?)`**: section 10.
- **`showRestaurants(keys)`**: shows Restaurant cards. The server builds each card.

The chat's other tools:

- **`getMenus(date, meal?, restaurant?)`**, **`getShuttle()`**: the day's menus; the shuttle.
- **`searchGlobalEvents(from, to, place?, words?)`**: the published Global Events of whole days that have not ended, with no regard to the User's day.
- **`searchRecruitingQuests(board?, from?, to?, globalEventId?)`**: the Quests the Boards show the User whose next Sub Quest falls on those days, full ones among them, with no regard to the User's day. The Boards show an Open or Approval Quest the User does not hold, with a Sub Quest that has not ended.
- **`showQuests(ids)`**, **`showGlobalEvents(ids)`**: show cards, for ids a tool returned in this message. The ids `findFreeTimeEvents` returned are the ones to show.
- **`showOnMap(layer)`**: a button for the `dining` or `shuttle` layer of the map.
- **`resolveFriend(name)`**, **`resolvePlace(words)`**, **`resolveGlobalEvent(words)`**: turn the User's words into ids. Each answers `one`, `several` or `none`. `resolveFriend` matches any part of a Friend's name.
- **`proposeQuest(...)`**: proposes a 파티 for the User to confirm.

**Which tool answers:**

| The request                                                      | The tool                                    | Example                                |
| ---------------------------------------------------------------- | ------------------------------------------- | -------------------------------------- |
| Who is free                                                      | `findFreeFriends`                           | 오늘 점심에 누구 돼?                   |
| Friends with a day and a meal, no Place and no single clock time | `resolveFriend`, then `findMealRestaurants` | 내일 점심 민수랑 밥                    |
| The same with a time window                                      | The same, with `window`                     | 내일 12시에서 1시 사이에 민수랑 밥     |
| No day or no meal                                                | None: ask                                   | 이민수랑 밥 약속 잡아줘                |
| A Place or a single clock time                                   | `proposeQuest`                              | 내일 1시에 민수랑 밥                   |
| Whether a party fits the User's day                              | `findFreeTimeEvents`                        | 2시부터 3시 반에 갈 수 있는 파티 있어? |
| What is on at a time                                             | The chat's searches                         | 2시부터 3시 반 파티 있어?              |
| Looking for a party to eat with                                  | The chat's searches                         | 내일 같이 밥 먹을 파티 있어?           |

- For what is on at a time, the model picks from a search's answer, and the cards are those that start inside the time asked.
- "여기로 하자" after Restaurant cards picks a plan and is not a request to recruit. It calls `resolveFriend` again, `findMealRestaurants` again, and `proposeQuest`.
- That Proposal is Closed, on no Board, at the Restaurant's Place, starting at the Restaurant's Start, with the Friends invited and capacity 1 + invitees. A Proposal for a single clock time is the same with that time and no Place, unless a Place is named.
- Ask when a Class or a Friend is ambiguous, and when a tool returns `needs`.
- When `resolveFriend` answers `several`, the model calls `findFreeFriends` for that meal, reads the departments there, and names them in its question.
- A meal is not a clock time here. The model passes `meal`, and the server's meal windows apply.
- Breakfast is not handled. The model says that lunch and dinner are covered.
- A party asked for by a part of the day is read as the chat reads it.

## 12. What a reply must hold

- **공강 파티:** the gap found (when the previous item ends, when the next starts), how many candidates fit, and when more than 20 fit, the total and how to narrow.
- **공강에 밥, who is free:** the User's Free Time in the window and the free Friends' names.
- **공강에 밥, with Friends:** the shared time, that the Restaurants are ordered by the longest Travel Time, and the dining map button (`showOnMap` with `dining`).
- **When nothing fits, there is no shared time or no menu was collected:** say so plainly, without naming who is busy, even when one of the named Friends is the reason.

Conditions such as "운동만" narrow what is shown. "운동만" calls with Board 취미, and the cards are the hobby Quests and the Global Events whose titles are sports, so board games drop out. This is a judgement of meaning, which a person reviews.

## 13. What is never said or sent

- Rooms, the User's or Friends' Places and coordinates, and Friends' Classes.
- The reason anyone is busy.
- A Friend who is not free, in any list.
- Any candidate, Restaurant or Friend that was left out, and why.

A request for any of these is refused.

## 14. The score

- A case passes when all its assertions hold.
- Thresholds: overall ≥ 80% and each category ≥ 70%.
- The suite runs 3 times and takes the mean, recording the model, the limits, the commit and the date.
- A Restaurant card's Proposal is not scored here. Integration tests check it.

## 15. The PM's decisions (2026-10-31)

The spec disagrees with itself on three points and leaves a fourth open. These answers hold.

1. **A window named for a meal.** A single clock time ("1시에") goes to `proposeQuest`. A time window ("12시에서 1시 사이") goes to `findMealRestaurants` with that window.
2. **A Friend's Travel Time.** The card shows the time "Travel shown per person" picks when it is known, and "—" only when it is unknown. So a Friend whose previous item has a Place and whose next item does not shows the in-time.
3. **A Quest card's time.** The presenters do not change, so a Quest card still shows the existing next Sub Quest. Cards are ordered by the start of the Sub Quest judged inside the gap. With several Sub Quests the card's time can differ from the judged one, which is a known limitation.
4. **A Sub Quest's Place.** A Sub Quest can hold a point or a label and no Place. The mapping of section 5 applies to the User's and Friends' Sub Quests too, and only a Sub Quest it cannot map is an item without a Place. A Class's Place is used as it is.
