# 08: Events answered on the map

Parent: [P03 spec](../spec.md) ("Events and recruiting Quests answered on the map": the contract and "Events")
Status: ready-for-agent
Blocked by: 01

## What to build

A User asks "오늘 볼 만한 거 있어?", and the main server answers in the shape of a meal's answer: one Plan for each Global Event of the day the User can attend between their items, with when they arrive, how long they can stay, their way there and on to their next item, and when they must leave. An event that lies over a Class is kept and marked, and one that cannot be reached is dropped with the reason. This is row "4. 행사" of the wireframes, alone (boards 혼자 1 to 4). The app's contract, client check, and stored copy follow; the screen does not.

## Acceptance criteria

- [ ] `PlanInput` is a union by `kind`, with today's meal input unchanged and `EventsInput` added; the recalculation endpoint plans either, and an input of an unknown kind is refused with 400.
- [ ] A client capability `events` joins the capabilities. The tool `planEvents` and its rules join the chat only for an app that sends `answer` and `events`; any other app gets the prompt, the tools, and the reply it gets today.
- [ ] One Plan for each published Global Event of the day that has a Place and is not over, by the spec's rules: what fits, what clashes, the order, and what is dropped with its reason.
- [ ] The asker's way uses the travel provider's faster of walking and the shuttle, and a part and a route say the mode when it is the shuttle.
- [ ] The worked example of the design's section 6.3 (Friday 13:50; a Class in 24동 until 13:50 and one in 301동 from 15:30 to 16:45; the job fair in 문화관 from 10:00 to 17:00, the company session there from 16:00 to 17:00, and the concert in 두레문예관 at 18:00): the job fair first, arriving 13:54, 78 minutes, leaving at 15:12; the concert next; the company session last, marked as clashing with the 15:30 Class.
- [ ] The lines, the basis, the scene, and the band are the spec's and the wireframe's words, written by the server.
- [ ] A day with no event to attend answers no Plan and says so.
- [ ] `planEvents` gives the model the Plans in words and minutes, and no coordinates, course names, or rooms.
- [ ] Unit tests of the calculation with its boundaries (arriving exactly at a start and a minute after; staying 30 minutes and 29; an event over; an event without a Place; a clash; an unknown origin; the shuttle faster and not), and integration tests of the tool and the recalculation over the started server.
- [ ] The app declares the contract and checks an answer of the new kind, and its mock holds a stored copy of the main server's real answer for the worked example.

## Comments
