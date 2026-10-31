# 04: 공강 파티 in the chat

Parent: [P04 spec](../spec.md) ("Shape", "Busy time and Free Time", "공강 파티: candidates and fit", "The 공강 tools", "Cards and the API contract")
Status: ready-for-agent
Blocked by: 01; 03 (its world, travel fixture and labels only, not its person's review or baseline run)

## What to build

A User asks in the usual input bar: "오늘 멀티코어컴퓨팅이랑 현대암호학개론 사이에 갈 수 있는 파티 있어?" The Assistant finds the gap between those Classes and shows every recruiting Quest and Global Event the User can reach before it starts and still leave in time for the next Class. Each card has an 이동 시간 box. "운동만" narrows the list, and a Quest card's own button joins it, as on the Board.

공강 joins the chat as a new group of tools. There is no router and no new Feature: the model chooses among all the tools, and only interprets the request and words the reply. The server computes Free Time, fit and Travel Time, and decides which candidates appear.

This ticket also starts the parts ticket 05 reuses: the tool module, the rules fragment and the Free Time function.

The app changes only in JavaScript.

## Acceptance criteria

- [ ] **Shape (ADR 0009).**
  - `getMyDay` and `findFreeTimeEvents` live in a module of their own, apart from the chat's existing tools. The chat's tool list only names them.
  - `showQuests`, `showGlobalEvents`, `showOnMap`, `resolveFriend`, `resolvePlace` and `proposeQuest` do not change.
  - The 8 model steps, the 30-second limit per message, the output token cap, the 20-message history and the daily message limit stay as they are.
- [ ] **OpenRouter data policy.** Every call made through the shared model setup sets provider `data_collection: deny`, with no ZDR restriction.
- [ ] **Busy items on a day.**
  - Each Class meeting on that weekday.
  - Each timed Sub Quest of a Quest the User holds. The attending Sub Quest of a Global Event Quest takes the Global Event's start and end.
  - A Sub Quest with a start and no end, or one longer than 3 hours, is busy for 30 minutes from its start. One with no start, or a cancelled one, is ignored.
  - The active Party blocks nothing.
- [ ] **Free Time.**
  - It is every interval between busy items, including before the first and after the last item of the day. On today, it starts no earlier than now.
  - Dates from today to a week ahead are mapped to weekdays only.
  - A User with no Classes is free all day, and "다음 공강" is then the rest of the day. Two named Classes cannot be found, so the model asks for the time.
  - The function takes any User, so that ticket 05 uses the same one for Friends.
- [ ] **The origin of a gap** is the Place of the item before it. With no item before the gap, there is no travel on that side. Live positions are never used.
- [ ] **`getMyDay`** takes a date and returns the User's items that day: id (a Class meeting's id is its ClassTime's), name (course name or Quest title), start and end. It never returns rooms, Places or coordinates.
- [ ] **`findFreeTimeEvents`** takes a date, from and to, and optionally a board, a departure Place and a leave-by time.
  - `from` and `to` are each an item id, a clock time, `now` or `end`.
  - It returns the gap or gaps found, each with its start, its end and the names of the items around it.
  - It returns every fitting candidate, soonest first, with no cap: kind, id, title (wrapped as others' text), start, end, travel minutes and mode, and the minutes to the next item or the leave-by time.
  - Or it returns `needs` (below).
- [ ] **My item without a Place** next to a gap.
  - The tool returns `needs`, with the side (before or after) and the item, instead of results.
  - Before: the model asks where the User leaves from and passes a departure Place, resolved through `resolvePlace`.
  - When `resolvePlace` answers `none`, the model says that Travel Times cannot be computed from off campus and asks once where the User enters the campus, such as 정문. If that gives no Place, it shows no candidates.
  - After: it asks by when the User must leave and passes a leave-by time, which replaces the after side.
  - No item or Travel Time is stored.
- [ ] **Candidates** are recruiting Quests, Open or Approval, visible as on the Boards, and published Global Events.
- [ ] **Left out, and neither returned to the model nor explained:**
  - full Quests;
  - Quests the User holds;
  - Quests the User has asked to join;
  - Quests for a Global Event whose Shared Quest the User already holds;
  - a Quest or Global Event with no start time inside the gap, so an event already under way is left out too;
  - a candidate whose place cannot be mapped to a Place.
  - P4 uses P05's Full and Shared Quest code once it exists, and adds the Quests the User asked to join. It does not use P05's "started".
- [ ] **A Quest is judged on its first Sub Quest that starts inside the gap,** not on the existing next-Sub-Quest rule.
- [ ] **Mapping a candidate's place to a Place,** in order:
  1. the Sub Quest's Place;
  2. a Place whose point equals the coordinates exactly;
  3. the Place the existing place lookup finds at the point;
  4. the nearest Place point within 150 m;
  5. a label that equals a Place name or number exactly;
  6. otherwise unknown, and the candidate is left out.
- [ ] **Fit.**
  - Before, with an item before the gap: the User leaves its Place at the start of the gap (the item's end, or now if that is later) and must arrive 1 minute before the candidate starts. Without one, the candidate only has to start after now.
  - After, when the candidate has an end and lasts at most 3 hours: with an item after the gap, the User leaves the candidate when it ends and must reach the next item's Place 1 minute before it starts. Without one, there is no after side.
  - After, when the end is unknown or longer than 3 hours: the candidate fits when the User can stay at least 30 minutes before leaving for the next item, and the leave-by time goes to the card. For a leave-by time, out-travel departs at the next item's start − 1 minute − the walking time.
  - Clock times narrow the gap. A candidate must start inside the window, and when it has an end, that end must fall inside the window too. Travel still runs from the previous item's Place and to the next item.
- [ ] **Board.** `board` narrows Quests to that Board. Global Events stay, and the model judges them by title like any other condition. There is no condition code, keyword list or word-specific prompt hint.
- [ ] **Constants.** The party numbers join the one constants table from ticket 01: 1 minute, 30 minutes of stay, 30 minutes of a Sub Quest with no end, 3 hours and 150 m.
- [ ] **Found ids.** The candidates of `findFreeTimeEvents` join the ids found in this message, so that the presenters accept them with no change.
- [ ] **After the run.**
  - While a run lasts, it keeps what `findFreeTimeEvents` returned.
  - A common step after the run attaches each candidate's 이동 시간 box to the Quest or Global Event card shown for it, and orders those cards by the candidate's start, for a Quest the start of the Sub Quest judged inside the gap, whatever order the presenters were called in.
  - Cards from other tools stay after them with no box. A run that did not call `findFreeTimeEvents` keeps its cards as they were.
  - At most 20 become cards, the existing card limit, so the 20 soonest when more fit.
  - A Quest card still shows the existing next Sub Quest, which can differ from the judged one (ticket 03, PM decisions).
- [ ] **Never sent to the model:** rooms, the User's or Friends' Places and coordinates, and the reason anyone is busy. No excluded candidate and no reason is ever returned.
- [ ] **The 공강 rules, 공강 파티 side.** A constant appended to the chat's prompt, apart from it, so that P05's prompt changes do not collide. It states by meaning, with no keyword list:
  - a question whether a party fits the User's day goes to `findFreeTimeEvents` ("2시부터 3시 반에 갈 수 있는 파티 있어?");
  - a question about what is on at a time goes to the chat's searches ("2시부터 3시 반 파티 있어?", "내일 같이 밥 먹을 파티 있어?");
  - to ask when a Class is ambiguous or a tool returns `needs`;
  - that the ids `findFreeTimeEvents` returned are the ones to show;
  - that a narrowing follow-up calls `findFreeTimeEvents` again, since tool results do not carry over between messages;
  - what a reply must hold: the gap found (when the previous item ends, when the next starts), how many candidates fit, when more than 20 fit the total and how to narrow, and when nothing fits to say so plainly.
  - A party asked for by a part of the day is read as the chat reads it.
  - The role, the language, the time, delimited text and short answers come from the chat's prompt. The model words replies itself.
- [ ] **Cards and the API.** Quest and Global Event cards gain optional fields: travel (mode and minutes), then either next (minutes and whether it is a Class) or leave-by "HH:MM" with whether the end is unknown. Old apps ignore them, so an APK from before P4 shows these replies as before.
- [ ] **The 이동 시간 box** on those cards, as the 공강 파티 board draws it:
  - "가는 길 {도보|셔틀} N분";
  - then "· 다음 수업까지 N분", or "다음 일정까지" when the next item is not a Class;
  - or "· HH:MM엔 나서야 해요" when the end is unknown or longer than 3 hours, after "끝 시간이 없어요" only when the end is unknown.
  - A part shows only when its field is there.
  - The cards' existing buttons and the seats-left label stay.
- [ ] **The eval's Travel Times.** The eval runner and the judgement suite bind the frozen travel fixture to the provider of `travel`, so that the real table and shuttle file never reach the eval.
- [ ] **ADR 0009** records that new capabilities join the chat as tools and prompt fragments. It amends ADR 0005, and the Feature definition's comment changes with it.
- [ ] **GLOSSARY** gains Timetable, Class, Free Time, Restaurant, Travel Time and Shuttle Stop.
- [ ] **Tests.**
  - One judgement suite seeds the P4 eval world with its travel fixture, calls the tools with the labelled arguments and checks the results against the reviewed labels. This ticket's side: Free Time, fit, exclusions, the place mapping, Travel Times and order. Ticket 05 adds the meal side to the same suite.
  - Separate integration tests at the assistant endpoint with the scripted model, for what the world does not reach:
    - `needs`, then a departure Place or a leave-by time passed after asking;
    - the shuttle chosen only when at least 3 minutes faster, and not at weekends or after 21:00;
    - `data_collection: deny` reaching the model call;
    - the cards' 이동 시간 fields and their order across kinds.
  - A fake-server screen test of the 이동 시간 box in its forms.
- [ ] **Landing.** With ticket 05, this lands before P05's R0 (11-02), so that P05's R0 and R1 differ only by P05's own change. It rebases on whatever P07 has landed on the Feature definition, the adapter and the request DTO, and reuses P07's Korea time helpers.
