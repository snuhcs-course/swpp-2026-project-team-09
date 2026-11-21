# 04: A Plan's bottom holds the input and a button that says what happens

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: [01](01-time-bar-on-top.md), [02](02-flag-says-what-and-when.md), and [03](03-faces-and-start-on-the-map.md): every control the card loses is on the bar or the map by then.

Native files: none. Releases: an app OTA update only.

## What to build

For every Plan answer (meal, meet, events, recruiting Quests, a new recruiting Quest), the bottom shows no text by default (board 10): the input with the main button beside it, and above them only what has no place on the map. The question is no longer repeated under the pill, the condition chips go, the Plan's lines go, and the arrows and count go (candidates are numbered flags). Lines appear above the input only when the answer says something the map cannot: why there is no Plan, a refusal over a kept Plan, who cannot come while the band is moved over their class, and who comes while the list of Friends is open; the answer's note stays a muted line. A press on those lines opens the reply's whole words under them. The main button says what it does: "만들고 초대 보내기" for a Plan with Friends, "일정에 넣기" for a Plan alone, "만들고 모집하기" for a new recruiting Quest.

## What happens now

- `AnswerCard` draws the question, the chips with "근거" and "+ 같이", the Plan's two lines, the basis, the band, the note, the steps' row (arrows, count, 되돌리기, 이대로 초대 or 여기로, 처음으로, offers), and the row-four buttons.
- The AI input stands under the card, and the card keeps room for it.
- The main button can sit under the input when the card is long.

## What changes

- The bottom of a Plan answer: an optional chip row ("+ 같이" while the Plan can take more people; 되돌리기 while a drag is kept; 처음으로; offers), an optional one line, then the input and the main button in one row. While the list of Friends to add is open, it stands above the input as today.
- The lines' choice is one function (`linesOf` in the Plan's card): the list of Friends' question, a refusal's lines over the kept Plan, who cannot come while the band is moved, `noPlan` lines, else none.
- The time chips go too: "처음으로" and the relax buttons, which stay, do what their presses did.
- The main button beside the input (`planActionOf`): its press does what 이대로 초대 or 여기로 did. A new recruiting Quest's "이대로 모집" is renamed "만들고 모집하기" and stays with the party and event buttons in the card.
- A press on the lines opens the reply's words under them (the model's sentence), and closes them again.
- "지난 답 N개" stays under the raised text until ticket 10.

## Must not break

- Every press of the old row still exists: 이대로 초대, 여기로, 이대로 모집, 되돌리기, 처음으로, the offers, the row-four buttons, and the relax buttons when there is no Plan.
- The made card and the taken card after a press (`answer-invite-after`, `answer-made-quest-line`).
- The keyboard-up headline and the camera's fit to the new bottom's height.
- Lookups, refusals without a Plan, and words keep today's card until ticket 05.

## Acceptance criteria

- [x] A meal Plan with two Friends: no question line, no chips, no Plan lines, no arrows in the bottom; the button reads "만들고 초대 보내기" beside the input, and its press sends the Plan as 이대로 초대 did. (Integration test.)
- [x] A meal Plan alone shows "일정에 넣기", which takes it as 여기로 did. (Integration test.)
- [x] A meal answer with no Plan shows its reason as one line and the relax buttons. (Integration test.)
- [x] A press on the line opens the reply's whole words. (Integration test.)
- [x] A tap on candidate 2's flag switches the Plan, with no arrows on screen. (Integration test.)
- [x] The one line's choice for each kind of reply. (Unit test.)
- [x] The bottom on a phone, with the keyboard down and up, with the mock build. (Emulator.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### What was built (2026-11-21)

- **At rest, one docked row (board 10).** When the Plan's card has nothing to read, the white card gives way to a rounded dock inset from the screen's sides, its edge just under the input and above the phone's own bar, with no handle. The input is a sunken field inside it with the main button beside it. Its one chip row holds "＋ 같이" (only while an addable Friend has no position on the map), "지난 답 N개" while the conversation has earlier turns, and the answer's note; a press on either of the last two raises the card with it open.
- **The card opens by itself only for what must be read:** why there is no Plan, a refusal over the Plan, who cannot come while the band is moved, events and party buttons, relax buttons, offers, 되돌리기, 처음으로.
- **Follow-ups only while typing.** With the keyboard up, the card shows the turn's headline (the Plan's own line) and one row of small follow-up chips.
- **Other candidates' tags** take the look of boards 20 and 21: a navy circle with the white number, the name in bold, a navy border. Their arrival time is ticket 13's.
- **Answers whose scene draws no candidates** (events and parties) keep a small "‹ 1/3 ›" in the card, since their other Plans have no flag; ticket 08 can drop it.
- "이대로 모집" reads "만들고 모집하기".
- Presses on the map: the start of an events or a party answer is read-only, as its chip was; a candidate does not switch the Plan while a recalculation is on its way.

### Tests (2026-11-21)

- New: `answer-plan-bottom` (no text at rest, the button beside the input, "일정에 넣기", a candidate's flag, a second turn's "지난 답 1개", an answer without a Plan); `answer-follow-ups` rewritten for typing.
- 35 files of the old card were updated to the new places (the map's mark cards, the time bar, the button beside the input). Six tests whose only subject left the screen were removed: three about focusing the end handle from the time chip (nothing focuses it now), the "지금" time chip's ask and its "back to 지금" case (the relax buttons and 처음으로 still cover the same requests), and the basis closed at first (the pick's card always shows it).
- `answer-parties` expected the model's sentence as the reply's history; the app sends the reply as the User saw it since P05-03 (its first Plan's lines), so the expectation follows the app.

### Emulator check (2026-11-21)

The debug app with Metro from this branch in mock mode. A Friend's card, 만나고 싶다: the dock at rest with "＋ 같이" and "만들고 초대 보내기"; with the keyboard up, the headline "12:15 302동 앞에서 만나요" and the chips "민수랑 같이 밥 먹자" and "민수랑 내일 만나고 싶어"; a second Friend's 만나고 싶다 in the same conversation: the dock with "＋ 같이" and "지난 답 1개", and a press on it raised the card with the first turn open. An answer without a Plan, and the dock without "＋ 같이", were not reachable in the mock build by taps alone; the tests cover them.

### Agent usage (2026-11-21)

- Agent time: about 1 hour 45 minutes in this session (an estimate from the transcript's timestamps, without the waits for the review), plus about 39 minutes of a subagent that updated the outdated tests.
- Tokens: this session output 145k; input 133.0M, of which 132.7M cache reads, 260k cache writes, and 446 uncached. The subagent used 129k tokens in all (its run reports one total).
