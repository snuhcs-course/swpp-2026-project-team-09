# 07: How many minutes, and whether I will be late

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 06

## What to build

The User asks "24동까지 몇 분? 늦나" or "9시 수업인데 늦나". The Assistant answers on the map with the way, when to set out, and whether they make it. If they will be late, it says by how much (wireframe row 7, boards q2, q3, and q15; design section 5, questions 10 and the off-campus rule).

## Acceptance criteria

- [x] The way's deadline is the time the User named ("2시까지"); else, when the Place is that of the User's next item today, that item's start. Without either, there is no deadline (ticket 06).
- [x] Tuesday 12:40 at building 301, next Class 13:00 in building 24: "24동까지 걸어서 **15분**" / "**12:45**에 나서면 13:00에 맞아요", the band from 12:45 to 13:00 ("12:45 나서기 · 걸어서 15분"), a flag "12:45 나서기" at the start, and a leave-by notification at 12:45 as the main action.
- [x] The same at 12:50: "지금 가도 **13:05** 도착" / "5분 늦어요", the band from 12:50 to 13:05, a flag "13:05 도착 · 5분 늦어요" at the Place, the basis open on the reason, and route guidance as the main action.
- [x] Asked with no Place ("늦나", "다음 수업까지 몇 분?"), the way goes to the User's next item today that has a Place; with none, the tool answers none.
- [x] From off campus (the User's location outside the campus boundary), the way is counted from the main gate, and the location is not used: Wednesday 08:35, Class 09:00 in building 24, "정문을 **08:50**까지 지나면" / "09:00 수업에 맞아요", with the basis saying that the location off campus was not used.
- [x] Unit tests for the deadline, the leave-by time, and lateness at the boundaries (on time to the minute, one minute late); integration tests at the endpoint with the scripted model.

## Decisions (2026-11-15)

1. **The chips** add the deadline: "13:00 수업까지" for a Class, "13:00까지" for another item or a time the User named; and "정문에서" off campus.
2. **The band** runs from the half hour at or before the earlier of now and the leave-by time, to the half hour at or after the deadline or the arrival, whichever is later, with the User's lane holding their items in that range. Its stretch runs from the leave-by time (now, when late) to the deadline (the arrival, when late).
3. **The leave-by notification** (`remind`) is offered only when the leave-by time is still ahead and the walk takes 5 minutes or more (design section 5, Notifications). Otherwise route guidance is the action. Sending the notification is package D's: the Lookup only says when.
4. **Lateness** is counted from now, rounded up to the whole minute, plus the way's minutes. A plan keeps no margin before a Class (design section 5, Depth and measures).
5. **The tool's input** gains `by` (HH:MM), the time the User named. `to` may be left out for the next item.
6. **Off campus** means outside the campus boundary the server already reads (`CampusBoundary`). The main gate is the Place "서울대 정문". With no location and no Class that ended today, the tool answers none (ticket 06).

## Comments

### Decisions taken in the build (2026-11-15)

1. **The next item** is the User's next item today that has a Place and starts later than now, both for a way with no Place and for the deadline of a Place they named. An item without a Place is passed over.
2. **A time the User named** (`by`) is today in Korea, and it is the deadline even when the Place is that of the next item. The next item is still drawn as the next item then.
3. **How the Place is called.** The Place of the next item is called as the spec's wording says ("24동까지"), as this ticket's lines have it. Ticket 06's "name(N동)" form stays for a Place that is not the next item's ("문화관(73동)까지 걸어서 18분").
4. **The main gate** is the Place "서울대 정문", called "정문" in the words, as the boards call it. Off campus, the User is drawn at the gate ("timetable"), not at their location, as ticket 06's decision 4 says for a start that is not the location.
5. **Late from off campus**, which no board shows: "지금 정문을 지나도 **09:05** 도착" / "5분 늦어요".
6. **The band's text** on time is the flag and the walk: "12:45 나서기 · 걸어서 15분", and off campus "08:50까지 정문 통과 · 걸어서 10분". Late, it is the stretch and the walk: "12:50–13:05 · 걸어서 15분".
7. **The lane** holds the User's items in the band's range of decision 2. On board q2 the range is 12:30–13:00, where no Class falls, so the lane is empty although the board draws the Classes; on board q3 it holds the 13:00 Class, cut at 13:30.
8. **The leave-by notification's `text`** is what the notification says: "지금 나서면 13:00 수업에 맞아요 · 24동까지 걸어서 15분", and off campus "지금 정문을 지나면 …". Route guidance follows it as the second button.
9. **"Still ahead"** means later than now rounded up to the minute: at 12:45, for a leave-by time of 12:45, route guidance is the action.
10. **The basis.** On time, it is "301동 → 24동 걸어서 15분", without "· 앱의 도보표", as boards q2 and q15 write it; a Lookup without a deadline keeps it, as board q1 does. Late, it is the reason, "걸어서 15분 · 지금 12:50". Opening the basis on screen when late is the app's part: the contract has no field for it.
11. **No location and no next item**: the tool answers that there is no next item, since the way has nowhere to go.
12. **What the model is given** gains `deadline`: the time, whether it is a Class, the leave-by time, the arrival if the User sets out now, and the minutes late.
13. **The band's half hours and lane** are shared with the meal's band (`halfHoursAround` and `busyIn` in `meal-scene.ts`).
14. **At the Place already** (the start's Place is the Place gone to). With a deadline: "지금 **24동**에 있어요" / "13:00 수업까지 20분 남았어요", "13:00까지" for a time the User named, the minutes counted from now, rounded up, to the deadline. Without one: "**문화관(73동)**은 여기예요" / "지금 문화관(73동)에 있어요". No route, no flag, no band, and no action; the scene draws the User and the Place. The basis says what puts the User there, "지금 있는 곳이 24동이에요" (their location), "오늘 마지막으로 끝난 일정이 24동에서였어요" (their last item), or "나서는 곳이 24동이에요" (a Place they named), and with a deadline adds "지금 12:40 · 13:00 수업까지 20분". The model is given `walkMinutes: 0` and `atPlace: true`, and `WAY_RULES` has its sentence say they are there ("지금 24동에 있어요.").
15. **A time already past.** When `by` is not later than now, rounded up to the minute, findWay draws nothing and answers none, with the reason that the time is to be given as 24-hour HH:MM (2시 in the afternoon is 14:00), or said to have passed. `WAY_RULES` and the tool's `by` say "as 24-hour HH:MM". "2시까지" at 13:30, given as 02:00, is no longer "708분 늦어요".

The walking table gives the boards' minutes: 301동 → 24동 895 seconds (15 minutes, q2 and q3) and 서울대 정문 → 24동 600 seconds (10 minutes, q15).

The endpoint's integration tests (`assistant-way-time.integration.test.ts`) were written but not run on the build machine, whose lock for runs with containers was held by another session; GitHub CI runs them.

### Agent usage (2026-11-15)

Tickets 06, 07, and 08 together, one pull request: this session (the triage of ticket 05, the tickets, the reviews, and the pull request) and two implementer subagents (06 with 07, then 08 with the resolver fix).

- Agent time: about 2 hours 8 minutes, an estimate from the transcripts' timestamps (the union of active stretches, gaps over 5 minutes left out).
- Tokens: output 435,467; input 105,796,401, of which 104,395,504 were cache reads, 1,400,131 cache writes, and 766 uncached. Without cache reads: 1,836,364.
