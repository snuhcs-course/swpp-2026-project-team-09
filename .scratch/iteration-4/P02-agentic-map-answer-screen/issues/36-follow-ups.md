# 36: Follow-ups under a reply, and examples that show what the map answers best

Parent: [P02 spec](../spec.md); ticket [35](35-chat-history-and-waiting.md); the chat walk of 2026-11-17 (item 2 of its ranked list)
Status: ready-for-human
Blocked by: 35 (pull request 343), whose answer card this builds on

## What to build

After the first answer, the chat offered nothing to press. A follow-up had to be typed, in Korean. The examples above the bar (식사 메뉴 추천, 현재 통학/순환 셔틀 위치, 파티 찾기) did not show what the agentic map does best.

- Under the reply on screen, up to two follow-ups in cells of one width. A press sends the cell's words as the User's message, as if typed.
- The words are fixed per kind of reply and filled from the reply itself: its date, meal, Friends, and restaurant. No model is asked and nothing changes on the server.
- A follow-up that turns the reply into going together comes first.
- The follow-ups are hidden:
  - while a reply is on its way;
  - while the keyboard is up;
  - while the list of Friends to add or the moved time band takes the card;
  - under a refusal, a reply with offers of its own, a failure, or an answer without a Plan, whose own buttons say what to try.
- The examples become 배고파, 오늘 볼 만한 거 있어?, and 공부할 자리.

### The rule (`features/assistant/follow-ups.ts`)

| Reply | Follow-ups, in order |
|---|---|
| A meal's Plan, alone | the next meals, at most two: a lunch's "오늘 저녁 배고파", then "내일 점심 배고파" / "내일 저녁 배고파" |
| A meal's Plan with Friends | the same meals with them: "김민수랑 오늘 저녁 먹자", "김민수, 박지은이랑 내일 점심 먹자" |
| A meet | "{친구}랑 같이 밥 먹자", then today's meet's "{친구}랑 내일 만나고 싶어" |
| A day's events | "같이 갈 파티 있어?" (under a reply to a message only), then today's "내일 볼 만한 거 있어?" |
| A Friend's Lookup | "{친구}랑 같이 밥 먹자" |
| A menu's Lookup of today | "내일 {식당} 메뉴 뭐야?" |
| A list of parties (a reply to a message) | "운동 파티만 보여줘" |
| A seat card (a reply to a message) | "다른 열람실" |
| Anything else (a way, a place, a study Lookup, a new party's Plan, words alone) | none |

## The trial

Each candidate was sent once through the real path: a local stack (`compose.yaml`, the model key from `main-server/.env` through Compose, demo seed and menus), as the smoke test of 2026-11-16 ran it. Three test Users were Friends with Tuesday and Wednesday Classes. Each candidate was sent after an answer of its kind, with the conversation as the app sends it. The run was on 2026-11-17 between 05:38 and 05:50.

A candidate was kept when the reply was the thing it names. It was dropped when the reply was plain text, a refusal, or the same answer again. The requests and answers are in the shared notes folder (`app-polish/chips-trial/`).

| After | Candidate | Reply | Kept |
|---|---|---|---|
| a lunch Plan | 오늘 저녁 배고파 | dinner Plan, 두레미담 17:00 | yes |
| a lunch Plan | 내일 점심 배고파 | tomorrow's lunch Plan | yes |
| a lunch Plan | 저녁은? | dinner Plan, but only with the turn before; a card's turn is never sent | no: replaced by the whole sentence |
| a lunch Plan | 다른 식당은? | the same Plan again, other restaurants as text | no |
| a lunch Plan | 오늘 점심 친구랑 같이 먹자 / 친구랑 같이 먹을래 / 같이 먹을 친구 골라줘 | text asking for a name; no Friend choices | no |
| a lunch Plan with 김민수 | 김민수랑 내일 저녁 먹자 | dinner Plan with 김민수 | yes |
| a dinner Plan | 내일 점심 배고파 / 내일 저녁 배고파 | the Plans | yes |
| a meet with 김민수 | 김민수랑 내일 만나고 싶어 | tomorrow's meet | yes |
| a Friend's Lookup | 김민수랑 같이 밥 먹자 | lunch Plan with 김민수 | yes |
| today's events | 같이 갈 파티 있어? | a new party's Plan for the event (none was open) | yes |
| today's events | 내일 볼 만한 거 있어? | tomorrow's events Plan | yes |
| none (no history) | SW 개발자 진로 특강 같이 갈 파티 있어? | the event's party card | (shows the words stand alone) |
| a list of parties | 운동 파티만 보여줘 | the one badminton party's card | yes |
| a list of parties | 파티 새로 모집하고 싶어 / 내가 새로 모집할래 | text asking what and when | no |
| a way to 문화관 | 문화관에서 밥 먹을래 | text: no restaurant found | no |
| a way to 문화관 | 근처 공부할 자리 / 여기서 밥 먹을래 | a seat or a meal near the User, not near 문화관 | no |
| a way to 문화관 | 문화관 근처 공부할 자리 | text: move the map first | no |
| today's 301동식당 menu | 내일 301동식당 메뉴 뭐야? | tomorrow's menu Lookup | yes |
| today's 301동식당 menu | 다른 식당 메뉴는? | the menus as a text list | no |
| a seat card | 다른 열람실 | another room's seat card | yes |
| a seat card | 더 오래 앉을 자리 / 관정관에서 더 오래 앉을 자리 찾아줘 | text: 6 hours is the most | no |
| none | 배고파 | lunch Plan | example: yes |
| none | 공부할 자리 | seat card | example: yes |
| none | 내일 점심 같이 먹자 | a lunch Plan for the User alone | example: no |
| none | 오늘 볼 만한 거 있어? | the day's events Plan (smoke row 11 too) | example: yes, in its place |

## Acceptance criteria

- [x] The rule gives the table's follow-ups per kind, at most two, the going-together one first (unit test).
- [x] None under a refusal, a reply with offers of its own, a failure, an answer without a Plan, or words alone.
- [x] Those that lean on the turn before appear only under a reply to a message.
- [x] Under a meal's Plan with a Friend, the frame shows the follow-ups, and a press sends the words as the User's message; none while the next reply is on its way.
- [x] The examples are 배고파, 오늘 볼 만한 거 있어?, and 공부할 자리.

## Decisions for review

1. **Whole sentences, filled from the reply, not short ones like "저녁은?".** A turn asked by a card's button ("여기서 먹기", "만나고 싶다") is never sent to the Assistant (`messagesToSend` leaves recalculated turns out). A short follow-up after one would come with nothing before it.
2. **No "친구도 같이" follow-up, and "내일 점심 같이 먹자" left the examples.** Without a name, the Assistant only asks for one in plain text, even though the app can draw Friend choices. On a Plan's card, "+ 같이" already opens the list of Friends. Making the Assistant offer that list for a "together" without a name is a server change, listed for later.
3. **"오늘 볼 만한 거 있어?" replaces it among the examples.** It was tried and gives the day's events Plan. The orchestrating session had picked "내일 점심 같이 먹자", which failed the trial.
4. **Two at most.** No reply had three that passed.
5. **Cells of one width,** as choice lists in a card are elsewhere in the app.
6. **The mock build has no answer for "공부할 자리".** It answers with its "데모에서는…" words, as it does for any ask it does not know. The mock's answers were left as they are.

## Comments

### Checked on an emulator (2026-11-17)

The debug build with the mock API.

- The new examples over the keyboard (f01).
- 김민준's "만나고 싶다" shows "민수랑 같이 밥 먹자" and "민수랑 내일 만나고 싶어" under the Plan (f04). The mock's meet answer names 민수 whichever Friend was pressed.
- A press sends the words; the card shows the question with the dots (f05), then the mock's reply (f06).
- This check found a fault in ticket 35: a question asked from a scrolled card kept the scroll, so the question line was out of sight. It was fixed in 35's pull request.
- f02: the mock's answer to "공부할 자리".

### Agent usage (2026-11-17)

- Agent time: about 65 minutes of one session, including the local stack, the trial, and the fix to ticket 35. An estimate from the transcript's timestamps.
- Tokens: input about 55 million, of which about 55 million cache reads and 0.13 million cache writes; output about 75,000. Measured from the session's transcript; the session went on to other tickets.
