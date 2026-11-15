# 19: A press on my own dot shows what each Friend sees of me now, with "바꾸기"

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), board a11; design section 5 ("Tapping my own dot")
Status: ready-for-agent
Blocked by: nothing (`GET /friends` gives `seen`, and the 위치 공유 screen is on `4.0/Main`, #268)

## What to build

With the switch on, the User's own dot on the everyday map takes a press; today it is passive (`screens/main/use-me.ts`, `ME_AVATAR_ID`). The press opens a card of the everyday map, as a press on a Friend's face opens ticket 18's card: its ✕ and Android's back close it, and the map stays where it is with every face on it. The card has:

- the head "지금 친구에게 보이는 나", and under it the Place the User is in ("301동"), from `GET /places/at` at the User's position; nothing when it answers no Place;
- one row per Friend, in `GET /friends`'s order: the name at the left, and at the right what the two see of each other now, "시간표만", "지금 있는 건물", or "정확한 위치" (the Friend's `seen`);
- "바꾸기", which opens the 위치 공유 screen (`/me/location-sharing`);
- the foot "내리는 것은 언제든 바로 되고 친구에게 알려지지 않아요."

The AI input stays under the card, as under any card of the everyday map; words typed there go to the Assistant as any words do.

## Acceptance criteria

- [ ] With the switch on, a press on the User's own dot opens the card; with it off the dot takes no press, as today. A Friend's face over the dot still takes its own press.
- [ ] The card's ✕ and Android's back close it; the camera does not move; every Friend's face stays.
- [ ] Board a11 with the mock's Friends at those levels: 민수 "지금 있는 건물", 지은 "정확한 위치", 서준 "시간표만", and the sub-line "301동".
- [ ] A Master Switch turned off (either end) reads "시간표만" in every row, as `seen` gives it.
- [ ] A Friend in the User's active Party reads "정확한 위치 · 파티 중" (row 6's decision D4).
- [ ] "바꾸기" opens the 위치 공유 screen; a level changed there shows in its row when the card is seen again.
- [ ] Words sent from the card replace it with their answer, as from the everyday map.
- [ ] Tests at the main screen over the fake main server: the press with the switch on and off, the rows, the Master Switch, the Party, and "바꾸기"'s route.
- [ ] The screen is run on an Android emulator, and the pull request carries the screen of board a11.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

- From board a11 and note (5) of row 6 ("내 점을 누르면 친구마다 지금 보이는 나를 보여 줘요").
- The frame of a pressed thing (a pill with the pin or person icon, ✕, back, the card in the answer frame's place) comes with ticket 22, when a press asks the server. This card, like ticket 18's Friend card, is a card of the everyday map. P02's spec left the pill's icons for a pressed building or Friend to this row.
- The rows are facts, not choices, so they are name-and-value rows; choosing a level stays on the 위치 공유 screen, in its equal cells.
- No seam: nothing outside package B's files changes.

### Decisions (2026-11-15)

1. The press opens a card of the everyday map, as a press on a Friend's face does, not a frame with a pill: the pill frame of an asked thing comes with ticket 22. The card belongs to the main screen's selection (`useSelection`'s `mine`), so one card is open at a time: a press on a thing replaces it, its ✕ and Android's back close it, the answer frame hides it while shown, and it closes for good once the dot is gone (the switch off, or the User off campus). It takes the bottom as any card does: the row of buttons, the 편의기능 button, the shuttle's notice, and the first run's card give way to it. The dot keeps its look; no selected look is drawn for it.
2. With the switch on the dot takes a press and lies under every face (order -1, as row 6's boards draw the User under the Friends), so a face over it keeps its own press. With the switch off it is as before: no press, above the faces.
3. The line under the head is the Place `GET /places/at` gives for the User's position, inside or near: the Place a Friend at the building level is shown, which the main server finds by the same lookup. It reads "301동" by the Place's number, or its name without one. The card asks again with each new position while it is open, and keeps the last answer until the new one comes.
4. The rows stand in a grey box: the full name at the left in muted ink, the words at the right. About six rows show; more scroll inside the card. A screen reader reads a row as "김민준, 지금 있는 건물". Without Friends the card says "아직 친구가 없어요"; while `GET /friends` is unknown or has failed, it has no rows.
5. A Friend among the members of the User's Party (`GET /parties/mine`) reads "정확한 위치 · 파티 중" while the User's Master Switch and the User's own switch for the Party are both on; otherwise the row reads `seen`. The app does not know the Friend's own Master Switch or switch for the Party, so such a row may say more than the Friend sees, never less.
6. A Friend's row opens nothing. The rows are facts, and a Friend without a position has no card on the everyday map, so a press would open some rows and not others; ticket 18's profile opens from the Friend's face.
7. "바꾸기" is the design system's secondary button. 위치 공유 opens over the main screen, and the card is there on the way back, its rows read again after a level changed there (`useFriendChanges` fetches `GET /friends` again).
8. The head is the person icon in a round of the key colour's lightest tint, with "지금 친구에게 보이는 나" as the card's title. The AI input under the card keeps its everyday placeholder.
