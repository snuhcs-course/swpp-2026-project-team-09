# 52: The answer closes by ✕ in its card, the docked card takes a drag, and a raised card goes to full height

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

From the user's phone tests (2026-11-23, on 5.0/Main 87aa3554):

1. The button that goes back to the main map stands inside the time bar's head, which looks out of place. Some cards close by a "닫기" word while the answer closes by "←" or a drag, which wants one rule.
2. Dragging the card down goes back to the main map only while the card lists the earlier questions. From the docked card (the caption chip, the sentence, the input, and the main button) nothing happens, and the docked card shows no handle.
3. "채팅을 위로 올려서 더 큰 화면으로 볼 수 있는 기능도 있으면 좋을듯": the raised card stops under the top, and the earlier questions' list is capped at about four rows.
4. "여전히 새 질문을 누르기 위한 depth가 너무 깊은 것 같아": "＋ 새 질문" is reached only through the earlier questions' list.

5. (Third pass, 04:23) "좀 짤리네?": with the earlier questions open, the history chip was drawn half over the card's top edge, and the list's last rows were cut by the input. "X와 멈추기 버튼이 좀 정렬이 안맞는게 아쉽네": ✕ and the stop button stood on different right lines at different sizes. "올리면 11곳 목록 윗화살표로 해놓고 내릴 때는 안내가 없네." "채팅을 위로 span할 때와 아래로 shrink할 때 좀 부자연스러운 것 같은데": the card's height jumped on every press, and a drag ran on the JS thread.

6. (04:38–04:50) "X를 둘러싸는 원의 위치와 채팅의 테두리 곡면을 잘 고려해서 UI를 디자인해줘"; "시계열을 누르면 채팅이 양쪽까지 꽉 차고 채팅할 때는 양쪽이 꽉 안차네? … 폭을 정할 때는 위의 시계바와도 통일"; "텍스트가 너무 왼쪽에 여백이 없이 붙어있는"; "과거 히스토리를 볼 때는 채팅란이 아예 필요가 없지 않을까".

7. (Seventh pass, 06:50–07:20) "인스타그램처럼 바로만 하던가 한가지로 해야 할 것 같다": the card was raised by a drag, a press on the grip, and a press on the line under it. "사실 + 새 질문도 괜찮은 것 같기는 해. 새 대화로 바꾸고 시계열처럼 좀 감싸는 UI를 두면 좀 통일될 것 같기도 하고." "걱정되는 것은 올리면 전체 식당 목록이 다 뜬다는 것을 모를텐데 어떻게 알릴 수 있지?" "같이를 눌렀을 때도 현재 '올리면 11곳 목록', '내리기'가 뜨네": the places' line showed over the list of Friends to add.

Cause of 2: the docked form of the card drew no handle and attached no gesture. Only the open card's handle had the drag, and the open card is what shows while the earlier questions are listed.

## What to build

The rule for everything that sits over the map as a card: it closes by a ✕ icon button, a drag down, and Android's back. "←" is only for a page pushed from the right, as the app bar has it. No "닫기" word button closes a card.

- The answer has no "←". Its card's top row holds the handle in the middle and ✕ at the right end, in every form: docked, lowered, raised with the list of places, a restaurant's menu, or the earlier questions, and at full height, so that it is never covered. ✕ closes the answer and keeps the conversation; it reads "답 닫기" to a screen reader and takes a press of at least 48. The open card's handle is narrowed to the middle so that it never covers ✕.
- The time bar's head has no room for a button: its words start at its left edge, a seat's band and the several requests' words too.
- "＋ 새 대화" stands just left of ✕ in every state, a pill in the history chip's look (its fill, height, corners, and words' type), one press from the docked card: it closes the answer as ✕ does, keeping the conversation, and puts the cursor in the main map's input, where a message starts a new conversation. It never shrinks; the history chip gives way first, cut with "…". The list of questions in the card has no "＋" of its own (P04 ticket 49).
- The card's header stays in the card while the rest scrolls under it, so nothing is drawn past the card's edge. The list of earlier questions takes the room the card has at its height, ends above the input, and scrolls inside.
- The bottom card is one sheet in every state (docked included, no floating card): edge to edge, attached to the bottom, only its top corners rounded, its content on a 16-dp inset (`space[4]`) from the screen's sides. The time bar stays the floating card under the status bar, its outer edges on those same two 16-dp lines, all four corners rounded, the map showing around it (fifth pass: "지도가 이렇게 양단에서 꽉 막혀있으니까 답답한 느낌"); the status bar keeps its usual look.
- The bottom sheet's header is 68 high in every state: the grip at the top centre with a small label under it as one unit (32), then one row of 36: the history chip at the left, "＋ 새 대화", and ✕'s circle (36, the stop button's), 8 apart, ✕ ending on the right 16 line. ✕'s top gap is 32, twice its right gap, since the label stands over the row. Rows stand one gap (`space[3]`) apart under it. ✕, the stop button, and the input end on the right line.
- Focusing the input no longer opens the earlier questions: typing shows the reply's first line (or its question whole), its offers, and its follow-ups; the questions open by the history chip alone.
- While the earlier questions are open the sheet shows no input and no main button, and the list reaches the sheet's bottom padding. The input stays mounted, hidden, so that "＋ 새 대화" puts the cursor in it.
- Nothing is pressed to raise or lower the card: a drag on its header moves it, and no hint line says how. A small muted label under the grip, information and not a control, says what a drag up brings, while the sheet shows the answer itself: "N곳 목록" for a meal, "자리·열람실" for a booking on the map, with "⌃" after it docked or lowered and without it raised or full. No label over the keyboard's view, the earlier questions, the list of Friends to add, a restaurant's menu, a mark's card, or a reply on its way, nor for any other answer; the header keeps its height. A screen reader hears it once, in the grip's name, and steps the card up, down, or closed through the grip's actions.
- The card moves as a sheet (fifth pass: "랙걸린마냥 느리고 지지직"): it is laid out once, at its highest step's height, and moved only by a translation on the UI thread (Reanimated), so nothing inside is laid out again while it moves and no React state changes per frame; a floor over the input's room covers what passes under the input, and a tail under the content keeps its last part reachable at a lower step. While a finger drags the header row or the docked card, the card follows it; on release, on back, and on a screen reader's step, it runs to its step in 220 ms. Raised from the dock, it rises from the dock's height. With reduced motion, none of it moves. The camera hears one value per change, the final one, once the card has settled; the docked card lays out its content's padding from its first frame, so that it never grows a frame late (sixth pass: "내릴 때, 순간적으로 지도가 축소, 확대되는 현상 … 채팅도 순간적으로 깜빡여").
- The docked card shows the same header as the raised card. The whole docked card takes a drag, except the input and the main button beside it, which are outside the card; a press on a chip or a button stays a press. A drag down past half the card closes the answer and keeps the conversation, with the hint "놓으면 지도 화면으로 돌아가요". A drag up raises the card.
- A raised card has one more step up: a drag up takes it to full height, its top just under the status bar, over the time bar, its content scrolling inside, the input still at the bottom. The camera stays as it is for the lowered card. The earlier questions' list keeps its cap on the lowered card and lifts it once the card is raised.
- A drag down, the grip's step down, and Android's back go one step down at a time: full, raised, lowered (or docked), closed. Before the raised card is lowered, they take away the list of earlier questions, a mark's card, or a restaurant's menu, with no hint.
- The "닫기" buttons that only closed a card come out: the Lookup's card (both) and the card after inviting, which a Quest made from a Plan opened again from the everyday map also shows; that card gets ✕ in its top row.
- The list's open state is told to the control (`card.earlier`), so that the main button's row can give way while the list is open (P04 ticket 50).

## Acceptance criteria

- [x] No "←" on the answer; ✕ in the card closes it and keeps the conversation; the bar's words have no room on their left. (Integration test.)
- [x] "＋ 새 대화" in the header closes the answer and puts the cursor in the main map's input, and the next message carries nothing of the answer. (Integration tests.)
- [x] The docked card shows the grip; a drag down past half closes the answer and keeps the conversation; a short one leaves it; a drag up raises it. (Integration test.)
- [x] With the list of questions open, a drag down takes the list away and leaves the answer. (Integration test.)
- [x] A drag up takes the raised card, and only the raised one, to full height; a drag down, the grip's step down, and back take it to raised; the list of questions lifts its cap once raised and goes to full height with the card. (Unit and integration tests.)
- [x] The Lookup's card and the card after inviting have no "닫기"; ✕ closes them. (Integration tests.)
- [x] Every test that closed the answer by "뒤로" closes it by ✕.
- [x] The header reads at a font scale of 1.3: ✕ holds no text, the label under the grip is cut with "…", and the history chip shrinks before "＋ 새 대화".
- [x] The header stays at the card's top at every height with the list open, and the list ends above the input. (Integration test.)
- [x] No hint line and no press raises or lowers the card; the grip's label names the list docked (with "⌃") and raised (without), and none with the earlier questions or the list of Friends to add open. (Integration tests.)
- [x] Both sheets edge to edge on the 16 lines, the header row and ✕ by the corner rule, the dark status bar under the bar's sheet, and the earlier questions without the input. (Emulator pictures, checked against the layout; the list's hidden input and missing line, integration test.)
- [x] While typing, no questions stand above the input; the list opens by the history chip alone. (Integration tests.)
- [x] The card's steps are run on the UI thread; the drag and the steps still land where they did. (Integration tests, with reduced motion.) The motion itself is checked on the phone.
- [x] No native file changes (the native fingerprint is the same, 5f21af6f, with the tests' Jest resolver added); lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 1 hour 45 minutes in the map-first-answer session over three rounds (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 90k; input about 30M, almost all cache reads, with about 300k cache writes.

### Agent usage (2026-11-23, third pass)

- Agent time: about 1 hour 50 minutes more in the map-first-answer session for the review threads, the motion, the sheets' layout, and the emulator pictures (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 120k; input about 45M, almost all cache reads, with about 400k cache writes.
