# 03: A seat asked without a time gets a card filled from the arrival (main server)

Parent: [P05 spec](../spec.md) ("The seat card")
Status: ready-for-agent
Blocked by: None (can start immediately)
Native files: no

## What to build

A User whose app draws answers on the map says "공부할 자리" and gets a booking card for a 관정관 reading-room seat without being asked the hours. The card starts at the first 30-minute mark at or after the User's arrival at 관정관 and runs for the longest time the space allows. Its first note says what it was filled for, and the reply can say when the User arrives and when to leave for the next Class. An app that does not draw answers is asked for the time, as today.

The design's example: Wednesday 13:50, a Class in 24동 has just ended, 24동 to 관정관 is 4 minutes on foot, and the next Class is at 16:00 in 두산인문관, 4 minutes from 관정관. The card is 14:00 to 20:00 (6 hours), the note is "13:54 도착에 맞춰 최대 시간으로 채웠어요", and the time to leave is 15:56.

## Files

Create (each with the AI-generated box):
- `main-server/src/assistant/library/seat-arrival.ts`: pure functions. The arrival from the day's items, the Place of the position, now, and the walking minutes; and the filled start and length from the arrival, the space, and what the User named.
- `main-server/test/seat-arrival.unit.test.ts` and `main-server/test/assistant-library-seat-arrival.integration.test.ts`.

Change:
- `main-server/src/assistant/library/library-parts.ts`: the library services gain what the arrival reads: the User's day, the Place lookup, and the Travel Time provider.
- `main-server/src/assistant/library/propose-library-booking.ts`: with the filling on, a seat asked for today without a start is filled before it is checked, the card gets its first note, and the answer gains the arrival and the time to leave.
- `main-server/src/assistant/library/library-card.ts`: a booking card takes a note of its own, placed before the site's notes.
- `main-server/src/assistant/library/library-tools.ts` and `library-rules.ts`: a second form of the tools and of the rules for an app that draws answers. The form of today stays as it is, character for character.
- `main-server/src/assistant/chat/chat-assistant.ts` and `main-server/src/assistant/assistant.service.ts`: an app that draws answers gets the second form; the services are passed. These are package A's: change only these lines.
- `main-server/src/assistant/gathering/gathering.ts`: export the rule of where a person sets out from, unchanged, so that the seat's arrival uses the same one. Package A's: one line.
- `main-server/README.md`: the Assistant's library section says when the time is filled and how.

## Behaviour

- **The rules of an app that draws answers** replace one rule of today's: for a seat the User gave no time for, do not ask, and call `proposeLibraryBooking` without a start; for a room, ask as today. Words that name no space ("공부할 자리", "자리 잡아 줘", "아무 자리") mean `7F-7A-zone2`.
- **The filling applies** when the space's unit is a seat, the date is today, and no start is given. Otherwise the request is checked as today.
- **Ready.** From the User's Free Time today: the User is ready now when free now, and at the end of the item under way otherwise.
- **Where from.** The rule of a Plan: for a User ready later, the Place of the item under way; for a User free now, the Place of the position the request's context holds, and without one the Place of an item that ended at most 15 minutes ago; otherwise unknown.
- **The arrival** is the ready time plus the walking minutes from there to Place 62-1, shown as whole minutes rounded up, and the ready time when the User is at 62-1 or the Place is unknown.
- **The start** is the first step mark at or after the arrival, and not before the space opens.
- **The length** is `minutes` or `end` when given. Otherwise it is the space's maximum, cut to the closing time, rounded down to a step.
- The filled request goes through today's check. Its refusals are today's.
- **The note**, first on the card: "<HH:MM> 도착에 맞춰 최대 시간으로 채웠어요"; with a named length "<HH:MM> 도착에 맞춰 채웠어요"; without a known Place "지금부터 최대 시간으로 채웠어요" or "지금부터 채웠어요".
- **The answer to the model** is `shown` with the summary and two more fields: `arrival` (`at`, `from` as the Place's name or null, and `walkMinutes` or null) and `leaveBy` (`at` and what it is for: "수업" for a Class and "일정" for a Sub Quest, with its start), or null when nothing with a Place follows before the booking ends. The summary adds "<HH:MM>에 도착해요." and "<HH:MM> 수업이라 <HH:MM>엔 나서요." No coordinate and no Place id of the User is in the answer.

## Must not change

- For an app without the `answer` capability: the system prompt, and every tool's description, input, and answers. A test compares them with today's.
- The card's key grammar and the card's shape.
- `main-server/eval/` and the frozen acceptance-test flows.
- The app.

## Acceptance criteria

- [x] Unit tests of the arrival and the filling, with expected values worked out by hand from the walking minutes given to the test: the design's example (13:50, 4 minutes: arrival 13:54, 14:00 for 360 minutes); an arrival exactly at 14:00 (starts 14:00); an arrival at 14:01 (starts 14:30); a User in a Class until 13:50 asked at 13:40 (arrival 13:54); a User already at 관정관 (arrival is now); no known Place (arrival is now); an arrival at 19:10 with closing at 23:00 (19:30 for 210 minutes); a named length of 120 minutes; an arrival before opening (starts at opening); and an arrival after the last start that fits (refused by today's check).
- [x] Integration test, with the `answer` capability and the scripted model: `proposeLibraryBooking` for `7F-7A-zone2` today without a start shows one card with the filled start and minutes, whose first note is the arrival's, and answers `shown` with `arrival` and `leaveBy`.
- [x] Integration test: the same with `minutes: 120` gives that length from the arrival.
- [x] Integration test: with the capability, a named start, a room without a start, and a seat for tomorrow behave as today.
- [x] Integration test: without the capability, a seat without a start is refused with "몇 시부터 예약할지 알려 주세요", and the instructions and the tools' descriptions and inputs equal those of today's form.
- [x] No test calls the language model; nothing under `main-server/eval/` changes.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `main-server/`.

## How a reviewer checks it

1. Run the unit tests and read the table of cases.
2. On the local stack, with the answer switch on, say "공부할 자리": the card's time starts at the first half hour after the arrival and runs to the longest time, and the first note names the arrival.
3. With the switch off, say the same: the Assistant asks for the time.

## Comments

### Decisions (2026-11-14)

Details the spec left to the implementation, listed so that any of them can be vetoed.

1. **The arrival is rounded up to the whole minute**, so a moment with seconds never gives a start that today's check calls already past.
2. **A start too late for any booking keeps the space's shortest length**, so that today's check of the hours refuses it in today's words ("열람실은 07:00–23:00에 이용할 수 있어요").
3. **Without a known Place, or without 관정관 among the Places**, the arrival is the ready time, `from` and `walkMinutes` are null, and the note is the "지금부터" form.
4. **With no Free Time left in the day** the User is ready now and sets out from the Place of the request's position, if it has one.
5. **A named end is passed on as an end**, and the note is then the form without "최대 시간으로", as for named minutes.
6. **The time to leave** is for the first item with a Place that starts at or after the arrival and before the booking ends. None is given when it would not be later than the arrival: the seat could not be used before that item.
7. **The filling tool's description adds one sentence** about the filling and the two fields of its answer. Its input is the same in both forms. Without the `answer` capability the description and the rule equal today's strings, which a test compares with hand-written copies.
8. **The rule of an app that draws answers also asks the model to say the arrival and the time to leave** in a sentence when the answer gives them.
9. **The arrival reads the User's day directly**, from the Timetable and the held Quests, not through the port the benchmark binds a day of its own to. Nothing under `main-server/eval/` changed.
10. **The library services gain one member** that holds what the arrival reads: the User's day, the Place lookup, and the Travel Time provider.

### Checked by hand (2026-11-14)

The design's example on the seed's Places, with the walking minutes given to the test: Wednesday 13:50, a Class in 24동 just ended, 4 minutes to 관정관, and a Class at 16:00 in 두산인문관, 4 minutes from 관정관. The card is `book:7F-7A-zone2:2026-11-04:1400:360` (14:00 to 20:00), its first note is "13:54 도착에 맞춰 최대 시간으로 채웠어요", and the tool's summary ends "13:54에 도착해요. 16:00 수업이라 15:56엔 나서요. 예약하기를 눌러야 예약돼요."

### The real model (2026-11-14)

One request with and one without the `answer` capability were sent through `POST /assistant/messages` of the started server (the test harness's database and Redis containers, the seed, and the real walking table) with the production model, `anthropic/claude-haiku-5.5` through OpenRouter. The clock was set to the design's example: Wednesday 2026-11-18 13:50, a Class in 24동 until 13:50, and one at 16:00 in 두산인문관. It was a check that the endpoint shows the server's card through the real model: no question set, no scoring, and no threshold.

| Asked "공부할 자리" | The reply's text | The card |
|---|---|---|
| With the `answer` capability, at 24동 | 7층 7A 열람실 2 구역 좌석 예약 카드를 보여 드렸어요. 오늘 14:00–20:00으로, 관정관에 13:54에 도착하는 것을 기준으로 잡혔어요. 16:00 수업이 있어서 15:56에는 나서야 해요. 카드의 예약하기를 눌러야 예약이 완료돼요. | `book:7F-7A-zone2:2026-11-18:1400:360`, first note "13:54 도착에 맞춰 최대 시간으로 채웠어요" |
| Without it | The Assistant asks which space, and for the day, the start, and the length, as today | none |

On the seed's walking table 24동 to 관정관 and 관정관 to 두산인문관 are 4 minutes each, as in the design.

### Agent usage (2026-11-14)

Up to the opening of the pull request. One implementing subagent (Opus 5.5) wrote the ticket and made the review's change. The main session's work on P05 is recorded once, under ticket 02.

- Agent time: about 57 minutes, an estimate from the transcript's timestamps. Much of it was spent waiting for test runs on a loaded machine.
- Tokens: output 62,429; input 15,205,098, of which 14,840,618 were cache reads, 364,286 cache writes, and 194 uncached. Without cache reads: 426,909.
