# 19: A press on my own dot shows what each Friend sees of me now, with "바꾸기"

Parent: [P02 spec](../spec.md); the design's row 6, "지도에서 묻기" (scene AmAsk), board a11; design section 5 ("Tapping my own dot")
Status: ready-for-agent
Blocked by: nothing (`GET /friends` gives `seen`, and the 위치 공유 screen is on `4.0/Main`, #268)

## What to build

With the switch on, the User's own dot on the everyday map takes a press; today it is passive (`screens/main/use-me.ts`, `ME_AVATAR_ID`). The press opens the frame of a pressed thing: the pill "나" with the person icon and its ✕, the dot highlighted, the map where it is, and one card:

- the head "지금 친구에게 보이는 나", and under it the Place the User is in ("301동"), from `GET /places/at` at the User's position; nothing when it answers no Place;
- one row per Friend, in `GET /friends`'s order: the name at the left, and at the right what the two see of each other now, "시간표만", "지금 있는 건물", or "정확한 위치" (the Friend's `seen`);
- "바꾸기", which opens the 위치 공유 screen (`/me/location-sharing`);
- the foot "내리는 것은 언제든 바로 되고 친구에게 알려지지 않아요."

The input stays, "이어서 말하기"; words typed there go to the Assistant as any words do.

## Acceptance criteria

- [ ] With the switch on, a press on the User's own dot opens the card; with it off the dot takes no press, as today. A Friend's face over the dot still takes its own press.
- [ ] The pill reads "나" with the person icon; its ✕ and Android's back return to the everyday map; the camera does not move; every Friend's face stays.
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
- The frame of a pressed thing (a pill with the pin or person icon, ✕, back, the card in the answer frame's place) is shared with ticket 18's Friend card and ticket 22's building card: whichever lands first makes it, and the others use it. P02's spec left the pill's icons for a pressed building or Friend to this row.
- The rows are facts, not choices, so they are name-and-value rows; choosing a level stays on the 위치 공유 screen, in its equal cells.
- No seam: nothing outside package B's files changes.
