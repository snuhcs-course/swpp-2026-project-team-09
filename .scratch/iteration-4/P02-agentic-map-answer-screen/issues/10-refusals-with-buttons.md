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

- [ ] **The table.** Each kind above answers its lines and offers exactly as the table writes them; a kind that names a Friend takes the name and the "now" line from the Friend view for the asker, and a `userId` that is no Friend of the asker answers `not-a-friend`.
- [ ] **The tool.** `refuse` is offered only to an app that draws answers. Its rules send the model to it for each case above in place of declining in its own words, and say that it writes nothing beside the call. A reply with a refusal has no `answer` and no `lookup`, and a later tool that draws an answer or a Lookup in the same run clears the refusal.
- [ ] **The reply** carries `refusal` (null when there is none) to the app, and an older app that does not know it still gets the model's sentence in `text`.
- [ ] **The card** shows the refusal's lines in place of the model's sentence, and under them the offers as buttons in the board's order: the first is the main button when the board draws one, the rest secondary; a choice of two or three sits as cells of one width. The map, the pill, and the input stay as they are; no condition chip and no "근거".
- [ ] **The offers.** An `ask` sends its text as if typed (a new turn); `open` goes to `/me/friends/add`, `/me/timetable`, `/me/interests`, or the 위치 공유 screen (ticket 11; until it lands, the Friends screen `/me/friends`), and `location` to the map's location explanation.
- [ ] **The mock.** Each kind's real server reply is kept as the app's mock copy, and the mock answers it for the board's words.
- [ ] **Tests.** Server: an integration test of each kind through the chat endpoint with the scripted model (the reply's refusal, no answer or Lookup, the Friend's name from the view, a non-Friend). App: the reply's check, the card's lines and buttons, and each kind of offer.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- The seam lines in other packages' files are in the shared notes, `row-8-seams.md`, ticket 10.
- n8's words for package D (the library seat card): the note "예약은 직접 눌러 주세요" above the buttons, "닫기" beside "예약하기", and the foot "예약하면 14:20까지 좌석배정기에서 확인해야 해요." The behaviour holds.
- Line 1 of n22 and n22b is also in package D's interest rules (`4.0/P05-08-watched-interests`); once both land, D's rule sends the model to `refuse` instead of the words.
- n4, n8b, n20, and n21 refuse over something already on screen (a Lookup or a party) and are ticket 15.
