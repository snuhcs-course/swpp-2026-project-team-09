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

Cause of 2: the docked form of the card drew no handle and attached no gesture. Only the open card's handle had the drag, and the open card is what shows while the earlier questions are listed.

## What to build

The rule for everything that sits over the map as a card: it closes by a ✕ icon button, a drag down, and Android's back. "←" is only for a page pushed from the right, as the app bar has it. No "닫기" word button closes a card.

- The answer has no "←". Its card's top row holds the handle in the middle and ✕ at the right end, in every form: docked, lowered, raised with the list of places, a restaurant's menu, or the earlier questions, and at full height, so that it is never covered. ✕ closes the answer and keeps the conversation; it reads "답 닫기" to a screen reader and takes a press of at least 48. The open card's handle is narrowed to the middle so that it never covers ✕.
- The time bar's head has no room for a button: its words start at its left edge, a seat's band and the several requests' words too.
- "＋ 새 질문" stands at the right end of the caption row, one press from the docked card: it closes the answer as ✕ does, keeping the conversation, and puts the cursor in the main map's input, where a message starts a new conversation. The history chip at the left gives way first, cut with "…". While the list of questions is open, the list's own header has it.
- The line that says how to reach the answer's list ("올리면 11곳 목록", "올리면 자리·열람실") or how it is ordered stands under the grip, one small muted line, cut with "…" when there is no room.
- The docked card shows the same handle as the raised card; a press on it raises the card. The whole docked card takes a drag, except the input and the main button beside it, which are outside the card; a press on a chip or the line stays a press. A drag down past half the card closes the answer and keeps the conversation, with the hint "놓으면 지도 화면으로 돌아가요". A drag up raises the card.
- A raised card has one more step up: a drag up takes it to full height, its top just under the status bar, over the time bar, its content scrolling inside, the input still at the bottom. The camera stays as it is for the lowered card. The earlier questions' list keeps its cap on the lowered card and lifts it once the card is raised.
- A drag down, a press on the handle, and Android's back go one step down at a time: full, raised, lowered (or docked), closed. Before the raised card is lowered, they take away the list of earlier questions, a mark's card, or a restaurant's menu, with no hint.
- The "닫기" buttons that only closed a card come out: the Lookup's card (both) and the card after inviting, which a Quest made from a Plan opened again from the everyday map also shows; that card gets ✕ in its top row.
- The list's open state is told to the control (`card.earlier`), so that the main button's row can give way while the list is open (P04 ticket 50).

## Acceptance criteria

- [x] No "←" on the answer; ✕ in the card closes it and keeps the conversation; the bar's words have no room on their left. (Integration test.)
- [x] "＋ 새 질문" on the caption row closes the answer and puts the cursor in the main map's input. (Integration test.)
- [x] The docked card shows the handle; a drag down past half closes the answer and keeps the conversation; a short one leaves it; a drag up raises it. (Integration test.)
- [x] With the list of questions open, a drag down takes the list away and leaves the answer. (Integration test.)
- [x] A drag up takes the raised card, and only the raised one, to full height; a drag down, the handle, and back take it to raised; the list of questions lifts its cap once raised and goes to full height with the card. (Unit and integration tests.)
- [x] The Lookup's card and the card after inviting have no "닫기"; ✕ closes them. (Integration tests.)
- [x] Every test that closed the answer by "뒤로" closes it by ✕.
- [x] The top row and the caption row read at a font scale of 1.3: ✕ and the grip hold no text, the line under the grip is cut with "…", and the history chip shrinks before "＋ 새 질문".
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 1 hour 45 minutes in the map-first-answer session over three rounds (an estimate from the transcript's timestamps). No subagents.
- Tokens: an estimate: output about 90k; input about 30M, almost all cache reads, with about 300k cache writes.
