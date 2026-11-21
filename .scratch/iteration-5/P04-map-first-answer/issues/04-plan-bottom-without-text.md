# 04: A Plan's bottom holds the input and a button that says what happens

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-time-bar-on-top.md), [02](02-flag-says-what-and-when.md), and [03](03-faces-and-start-on-the-map.md): every control the card loses is on the bar or the map by then.

Native files: none. Releases: an app OTA update only.

## What to build

For every Plan answer (meal, meet, events, recruiting Quests, a new recruiting Quest), the bottom shows no text by default (board 10): the input with the main button beside it, and above them only what has no place on the map. The question is no longer repeated under the pill, the condition chips go, the Plan's lines go, and the arrows and count go (candidates are numbered flags). One line appears above the input only when the answer says something the map cannot: the reason there is no Plan, the answer's note, or a refusal over a kept Plan. A tap on that line raises the card with the whole text. The main button says what it does: "만들고 초대 보내기" for a Plan with Friends, "일정에 넣기" for a Plan alone, "만들고 모집하기" for a new recruiting Quest.

## What happens now

- `AnswerCard` draws the question, the chips with "근거" and "+ 같이", the Plan's two lines, the basis, the band, the note, the steps' row (arrows, count, 되돌리기, 이대로 초대 or 여기로, 처음으로, offers), and the row-four buttons.
- The AI input stands under the card, and the card keeps room for it.
- The main button can sit under the input when the card is long.

## What changes

- The bottom of a Plan answer: an optional chip row ("+ 같이" while the Plan can take more people; 되돌리기 while a drag is kept; 처음으로; offers), an optional one line, then the input and the main button in one row. While the list of Friends to add is open, it stands above the input as today.
- The one line's choice is one function of the reply (unit tested): `noPlan` lines, the note, the refusal's lines over a kept Plan, else none.
- The button's words above; its press does what 이대로 초대, 여기로, or 이대로 모집 does today.
- The raised card shows the whole text of the reply (the model's sentence) for a tap on the one line.
- "지난 답 N개" stays under the raised text until ticket 10.

## Must not break

- Every press of the old row still exists: 이대로 초대, 여기로, 이대로 모집, 되돌리기, 처음으로, the offers, the row-four buttons, and the relax buttons when there is no Plan.
- The made card and the taken card after a press (`answer-invite-after`, `answer-made-quest-line`).
- The keyboard-up headline and the camera's fit to the new bottom's height.
- Lookups, refusals without a Plan, and words keep today's card until ticket 05.

## Acceptance criteria

- [ ] A meal Plan with two Friends: no question line, no chips, no Plan lines, no arrows in the bottom; the button reads "만들고 초대 보내기" beside the input, and its press sends the Plan as 이대로 초대 did. (Integration test.)
- [ ] A meal Plan alone shows "일정에 넣기", which takes it as 여기로 did. (Integration test.)
- [ ] A meal answer with no Plan shows its reason as one line and the relax buttons. (Integration test.)
- [ ] A tap on the one line raises the card with the whole text. (Integration test.)
- [ ] A tap on candidate 2's flag switches the Plan, with no arrows on screen. (Integration test.)
- [ ] The one line's choice for each kind of reply. (Unit test.)
- [ ] The bottom on a phone, with the keyboard down and up, with the mock build. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.
