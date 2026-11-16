# 10: What cannot be answered says so in one line and offers what can, as buttons

Parent: [P02 spec](../spec.md); the design's row 8, "답할 수 없는 말과 안 되는 경우" (scene AmCant), principles 1 and 2
Status: ready-for-agent
Blocked by: nothing

## What to build

A request the Assistant cannot or will not answer gets one fixed line, a second line when the board has one, and two or three buttons that offer what it can do. Nothing is made up: the words come from a table on the server, written as the wireframe writes them, and the model only chooses which case it is. The map stays as it is, and the card has no condition chips and no "근거".

The reply gains one field beside `answer` and `lookup`:

```ts
refusal: {
  kind: RefusalKind;
  lines: AnswerLine[];          // one or two, as a Plan's lines (bold spans allowed)
  offers: RefusalOffer[];       // two or three, in the board's order
} | null

type RefusalOffer =
  | { kind: 'ask'; label: string; text: string }        // sends the words, as if typed
  | { kind: 'open'; label: string; screen: 'friend-add' | 'location-sharing' | 'timetable' | 'interests' | 'location' }
```

"만나고 싶다" is an `ask` that sends "{이름}랑 만나고 싶어", so that it plans a meeting the way typed words do. The model chooses the case with one presenter tool, `refuse({ kind, userId? })`, shaped like `showOnMap`; the server fills the lines and offers from the table, and a Friend's name and their "now" line from the Friend view, never from the model.

| Board | Asked | kind | Lines | Offers |
|---|---|---|---|---|
| n1 | 강남역 맛집 추천해 줘 | `off-campus` | 캠퍼스 안의 일만 도와 드려요. | ask 배고파; ask 오늘 볼 만한 거 있어? |
| n2 | 자료구조 과제 풀어 줘 | `general-work` | 과제는 도와 드릴 수 없어요. / 캠퍼스에서 먹을 곳, 공부할 자리, 행사, 파티, 길을 찾아 드려요. | ask 배고파; ask 공부할 자리; ask 오늘 볼 만한 거 있어? |
| n3 | 심심해 | `vague` | 무엇을 해 볼까요? | ask 지금 비는 친구; ask 같이 놀 파티; ask 오늘 볼 만한 행사 |
| n5 | 우리 과 조교님 어디 계셔? | `not-a-friend` | 친구로 맺은 사람만 볼 수 있어요. / 친구가 되면 서로 시간표의 건물과 끝나는 시각이 보여요. | open 친구 추가 |
| n6 | 민수 어제 어디 있었어? | `past-location` | 지난 위치는 저장하지 않아요. 지금과 시간표만 알아요. / {민수의 지금, from the Friend view} | ask 만나고 싶다 |
| n7 | 누가 내 위치 찾아봤어? | `who-looked` | 누가 찾았는지는 기록하지 않아요. / 후보로 검토된 것은 누구에게도 알리지 않아요. | open 위치 공유 보기 |
| n9 | 민수 위치 켜 줘 | `others-sharing` | {민수}가 정하는 일이에요. / 내가 {민수}에게 보일 단계는 바꿀 수 있어요. | open 위치 공유 보기 |
| n19 | ㅂㄱㅍ | `not-understood` | 잘 못 알아들었어요. / 이렇게 말해 보세요. | ask 배고파; ask 공부할 자리; ask 오늘 볼 만한 거 있어? |
| n22 | 민수랑 마주칠 때 알려 줘 | `not-watched-friend` | 지켜봐 드리는 것은 행사와 모집뿐이에요. / {민수}와 만나려면 함께 비는 때를 찾아 드려요. | ask 만나고 싶다; open 관심 맡겨 두기 |
| n22b | 셔틀 오면 알려 줘 | `not-watched-shuttle` | 지켜봐 드리는 것은 행사와 모집뿐이에요. / 지금 물으면 셔틀이 언제 올지 어림해 드려요. | ask 셔틀 언제 와? |

n8 ("그냥 예약해 줘") already behaves as drawn: the model never books and shows the seat card again. Its words differ only inside the library seat card, which is row 2's and package D's; they are listed under Comments for D.

## Acceptance criteria

- [x] **The table.** Each kind above answers its lines and offers exactly as the table writes them; a kind that names a Friend takes the name and the "now" line from the Friend view for the asker, and a `userId` that is no Friend of the asker answers `not-a-friend`.
- [x] **The tool.** `refuse` is offered only to an app that draws answers. Its rules send the model to it for each case above in place of declining in its own words, and say that it writes nothing beside the call. A reply with a refusal has no `answer` and no `lookup`, and a later tool that draws an answer or a Lookup in the same run clears the refusal.
- [x] **The reply** carries `refusal` (null when there is none) to the app, and an older app that does not know it still gets the model's sentence in `text`.
- [x] **The card** shows the refusal's lines in place of the model's sentence, and under them the offers as buttons in the board's order: the first is the main button when the board draws one, the rest secondary; a choice of two or three sits as cells of one width. The map, the pill, and the input stay as they are; no condition chip and no "근거".
- [x] **The offers.** An `ask` sends its text as if typed (a new turn); `open` goes to `/me/friends/add`, `/me/timetable`, `/me/interests`, or the 위치 공유 screen (ticket 11; until it lands, the Friends screen `/me/friends`), and `location` to the map's location explanation.
- [x] **The mock.** Each kind's real server reply is kept as the app's mock copy, and the mock answers it for the board's words.
- [x] **Tests.** Server: an integration test of each kind through the chat endpoint with the scripted model (the reply's refusal, no answer or Lookup, the Friend's name from the view, a non-Friend). App: the reply's check, the card's lines and buttons, and each kind of offer.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- The seam lines in other packages' files are in the shared notes, `row-8-seams.md`, ticket 10.
- n8's words for package D (the library seat card): the note "예약은 직접 눌러 주세요" above the buttons, "닫기" beside "예약하기", and the foot "예약하면 14:20까지 좌석배정기에서 확인해야 해요." The behaviour holds.
- Line 1 of n22 and n22b is also in package D's interest rules (`4.0/P05-08-watched-interests`); once both land, D's rule sends the model to `refuse` instead of the words.
- n4, n8b, n20, and n21 refuse over something already on screen (a Lookup or a party) and are ticket 15.

### Decisions (2026-11-15)

1. **Where the words come from.** The table is `main-server/src/assistant/refusals/refusals.ts`; `refuse` (`refusal-tools.ts`) takes only `kind` and, for `past-location`, `others-sharing`, and `not-watched-friend`, a `userId`. Anything else the model passes is dropped. The particles after a name follow its last syllable: 민수가 / 지은이, 민수와 / 지은과, 민수랑 / 지은이랑.
2. **n6's "now" line needs the Friend's Timetable,** which `FriendViewService` does not carry. `withRefusals` therefore takes the free-time services (`freeTime`: the Friend view, `UserDayService` for the Friend's Classes of the day, never their Quests, and `PlaceLookup` for Place names) in place of the Friend view alone; the call in `chat-assistant.ts` stays one expression. The line says what the asker's map shows: the Place of a building-level or exact Friend who is in one ("민수는 지금 301동에 있어요", with " · 12:15까지 수업" during a Class), else the Timetable: "민수는 지금 302동에서 수업 중이에요 · 12:15까지" (the board), "민수는 지금 공강이에요 · 14:00까지", "민수는 09:00에 첫 수업이 있어요", "민수는 오늘 수업이 끝났어요", or "민수는 오늘 수업이 없어요".
3. **A case that names a Friend without a `userId`** shows nothing; the tool tells the model to find the Friend with `resolveFriend` first, and to refuse with `not-a-friend` when it answers none. A `userId` that is not the asker's Friend answers `not-a-friend`.
4. **Order within a run.** `refuse` after an answer or a Lookup answers "not shown"; a refusal before one is dropped by the reply (`keptRefusal`), so a reply never carries both.
5. **The reply's text.** The rules say to write nothing beside the call or after it. When the model writes nothing, the text is the refusal's lines, one per line, for an app that does not know the refusal and as the message the next turn sends back; when it writes a sentence anyway, that sentence is kept.
6. **The card.** The first line is in the title style and the second smaller and muted, bold spans in the key colour. The offers stand in one row as cells of one width, a label wrapping to a second line rather than being cut. The first offer is the main (filled) one when it is the only offer or when the offers differ in kind (n22: ask and open); a choice of asks (n1, n2, n3, n19) is even.
7. **Where an `open` goes.** `location-sharing` goes to `/me/location-sharing`, ticket 11's route, not the Friends screen. `location` opens the main screen's explanation of the location: `useLocationExplanation` hands its `explain` to the answer card through `answer/location-offer.ts`. No kind of this ticket uses it; it is for ticket 13's "위치 켜기".
8. **The mock.** The ten replies were printed once from the endpoint with the scripted model naming each case (a Tuesday at 11:50, 민수 in a Class in 302동 until 12:15) and kept as `mobile/src/api/mock/data/refusals.json`. With a context, a message that holds a board's words gets its copy before any other mock answer, so that "셔틀 오면 알려 줘" and the "어디" boards are refused rather than answered.
9. **The app's check** is strict, as for answers and Lookups: a refusal of an unknown kind, an unknown screen, or an offer of another shape fails the reply.
10. **Existing tests** that compare whole replies now include `refusal: null`; the three whose one-line expectations grew past the line limits take `NOTHING_SHOWN` from `test/assistant.ts`.

### The real model (2026-11-15)

The five messages were sent once through the chat feature of an app that draws answers (`chatAssistant` with `drawsAnswers`, run by `runFeature`) with the production model, `anthropic/claude-haiku-5.5` through OpenRouter, every service a stub that finds nothing. It was a check that the model picks `refuse` with the right kind: no question set, no scoring. One round; `REFUSAL_RULES` needed no change.

| Asked | Tools called | Kind | The reply's text |
|---|---|---|---|
| 강남역 맛집 추천해 줘 | `refuse` | `off-campus` | the refusal's line (the model wrote none) |
| 자료구조 과제 풀어 줘 | `refuse` | `general-work` | the refusal's lines |
| 심심해 | `refuse` | `vague` | the refusal's line |
| ㅂㄱㅍ | `refuse` | `not-understood` | the refusal's lines |
| 누가 내 위치 찾아봤어? | `refuse` | `who-looked` | the refusal's lines |

### Agent usage (2026-11-15)

Two subagents (Opus 5.5): the survey of row 8's 28 boards against the code, which all of row 8's tickets were written from, and the implementation. This session's review and the pull request are counted under P03 ticket 07.

- Agent time: about 54 minutes (survey 16, implementation 38), an estimate from the transcripts' timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 241,442; input 67,603,006, of which 66,900,552 were cache reads, 701,942 cache writes, and 512 uncached. Without cache reads: 943,896.
- The real-model check sent five requests to the chat model.
