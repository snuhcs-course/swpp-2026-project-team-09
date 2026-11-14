# 08: Events answered on the map

Parent: [P03 spec](../spec.md) ("Events and recruiting Quests answered on the map": the contract and "Events")
Status: ready-for-agent
Blocked by: 01

## What to build

A User asks "오늘 볼 만한 거 있어?", and the main server answers in the shape of a meal's answer: one Plan for each Global Event of the day the User can attend between their items, with when they arrive, how long they can stay, their way there and on to their next item, and when they must leave. An event that lies over a Class is kept and marked, and one that cannot be reached is dropped with the reason. This is row "4. 행사" of the wireframes, alone (boards 혼자 1 to 4). The app's contract, client check, and stored copy follow; the screen does not.

## Acceptance criteria

- [x] `PlanInput` is a union by `kind`, with today's meal input unchanged and `EventsInput` added; the recalculation endpoint plans either, and an input of an unknown kind is refused with 400.
- [x] A client capability `events` joins the capabilities. The tool `planEvents` and its rules join the chat only for an app that sends `answer` and `events`; any other app gets the prompt, the tools, and the reply it gets today.
- [x] One Plan for each published Global Event of the day that has a Place and is not over, by the spec's rules: what fits, what clashes, the order, and what is dropped with its reason.
- [x] The asker's way uses the travel provider's faster of walking and the shuttle, and a part and a route say the mode when it is the shuttle.
- [x] The worked example of the design's section 6.3 (Friday 13:50; a Class in 24동 until 13:50 and one in 301동 from 15:30 to 16:45; the job fair in 문화관 from 10:00 to 17:00, the company session there from 16:00 to 17:00, and the concert in 두레문예관 at 18:00): the job fair first, arriving 13:54, 78 minutes, leaving at 15:12; the concert next; the company session last, marked as clashing with the 15:30 Class.
- [x] The lines, the basis, the scene, and the band are the spec's and the wireframe's words, written by the server.
- [x] A day with no event to attend answers no Plan and says so.
- [x] `planEvents` gives the model the Plans in words and minutes, and no coordinates, course names, or rooms.
- [x] Unit tests of the calculation with its boundaries (arriving exactly at a start and a minute after; staying 30 minutes and 29; an event over; an event without a Place; a clash; an unknown origin; the shuttle faster and not), and integration tests of the tool and the recalculation over the started server.
- [x] The app declares the contract and checks an answer of the new kind, and its mock holds a stored copy of the main server's real answer for the worked example.

## Comments

### Decisions (2026-11-15)

- Times are whole minutes as in a meal's plan, with no arrival margin: arriving exactly at an event's start counts as arriving before it, and the leave-by is the next item's start minus the shown minutes of the way. The way on is the one of a departure the walk would still be in time for, as the 공강 cards' `leaveFor` picks it, without its one-minute margin, since the design's 15:12, 17:42, and 15:56 have none.
- An event with no end lasts 30 minutes (the shortest stay) from its start: it fits only when the asker is there at its start and can stay those 30 minutes, and one already under way is dropped as "HH:MM에야 도착해요".
- An event that has not started fits with any stay of a minute or more (the design's "arrive before it starts"); only one under way needs 30 minutes.
- An event that overlaps several stretches of Free Time is judged in the stretch where the stay is longest.
- An event clashes when no stretch fits it and an item lies over what is left of it after now. Its way is counted from where the asker sets out now or next (their first stretch's origin), which gives the design's 4 minutes and 15:56; it is shown from its start (or now) to its end, with no way on.
- "The earlier start" of the order is when the asker is there, the Plan's `startAt`.
- An event with no Place of the list, or over by now, is left out silently, neither planned nor dropped.
- The event's Place is labelled with the event's own place words, else the Place's label, in the Plan, the lines, the basis, and the dropped list.
- The second line of an event under way is there only when the next item cuts the stay; a Sub Quest is called 일정 ("15:30 일정이라", "15:30 일정과 겹쳐요"). With an unknown origin an event that has not started has no second line.
- A dropped event's reason names it: "<title> · N분밖에 못 있어요" or "<title> · HH:MM에야 도착해요".
- The chips are a meal's, from the asker's first stretch of Free Time: where they set out from and the item that ends it.
- The flag at the event reads "<when the asker is there> <title>". The scene shows no other event.
- With no Plan the line is "오늘은 다녀올 만한 행사가 없어요" for today and "그날은 …" for another day, with the reason `no-fit`. Clashing events are Plans, so a day with only those has an answer.
- The model is told a clash as `{ at, with: 'Class' | 'Quest' }`, never the item's name.
- Events conditions on screen reach the model as `[Plan on screen: {"plan", "kind": "events", "date", "eventIds"}]`; the meal's line is unchanged.
- `PlanAnswersService` is the one place that plans any `PlanInput` by its kind; `POST /plans` refuses any kind but a meal's with 400 `PLAN_KIND`.
- `eventIds` holds at most 20 ids. A part and a route carry `mode` only for the shuttle.
- The app's stored copy is the main server's answer over the integration stage with the design's shuttle (18 minutes from 301동 to 두레문예관) in place of the seed's shuttle timing, asked on Friday 2026-11-20 at 13:50.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5). The session that wrote the spec, reviewed the tickets, and opened the pull requests is counted under ticket 07.

- Agent time: about 31 minutes, an estimate from the transcript's timestamps.
- Tokens: output 129,153; input 29,076,514, of which 28,754,686 were cache reads, 321,592 cache writes, and 236 uncached. Without cache reads: 450,981.
