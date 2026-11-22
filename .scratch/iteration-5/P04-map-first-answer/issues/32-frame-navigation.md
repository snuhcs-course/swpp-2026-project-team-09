# 32: The answer's frame: "←", the caption, and one meaning per input

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none. Shares the redesign of 2026-11-22 with the meal answer's card and its map; each has its own pull request.

Native files: none. Releases: an app OTA update only.

## What happens now

From the use of Release `26.11.22-15` on a phone, with real data:

- There is no visible way back: the question pill's small ✕ closes the answer.
- "+ 새 대화" stands beside the pill, and again beside the input on the main map. The main map's input says "이어서 말하기" and continues the kept conversation, so it reads as a new question and is not one.
- The main map shows a chip, "새 대화", three suggestion chips, and the AI notice around the input all at once.
- While typing on the answer, the card shows one headline line, and nothing says that the words go on the same conversation.

## What to build

Rules 2 to 5 of the redesign, boards 1 and 6:

- **No pill and no "새 대화".** The question pill, its turn count, both "새 대화" buttons, and the list's "새 대화" row are removed.
- **"←"** at the top left of every answer: in the time bar's head when the answer has a time (beside the words, with "＋ 같이" at the right), else a round button over the map. It closes the answer and keeps the conversation, as Android's back and dragging the docked card down do. Back takes one layer at a time: the keyboard, the list of questions, a mark's card, the raised card, then the answer.
- **The caption.** What was asked is a small caption at the top of the answer's card, docked or raised; a press opens the conversation's questions in the card. For a meal answer with several Plans, its right side says "올리면 N곳 목록" while docked (a press raises the card) and "걸음이 적은 순" while raised.
- **The time bar's head.** The words stand at the left after "←" and are cut short before "＋ 같이" instead of running under it.
- **The main map's bottom** is ticket 33 (merged first): only "이어서 · {question} ›" above the input, "무엇이든 물어보세요", and a new conversation for what is typed there. Here the kept conversation is reached from the new answer's caption.
- **Continuing on the answer.** While the input on the answer has focus, the card shows the conversation's questions as rows above the input (a press shows that turn), and the follow-up chips.

Where the meal answer's card meets this: the caption is drawn here for every answer. Once the card can open a restaurant's menu, the caption hides while a menu is open, and back closes the menu before it lowers the card. Whichever of the two pull requests merges second adds those two lines.

## Acceptance criteria

- [ ] No pill and no "새 대화" anywhere; "뒤로" closes the answer and keeps the conversation. (Integration tests.)
- [ ] The caption shows the question and opens the questions in the card. (Integration tests.)
- [ ] After "뒤로", what is typed on the main map starts a new conversation, and the one before is among the new answer's questions. (Integration tests.)
- [ ] While typing on the answer, the questions stand above the input. (Integration test.)
- [x] Pictures with the crowded mock: the answer with "←" in the bar and the caption, the caption's questions, and the main map after "←". (Emulator; typing on the answer is not pictured, since the phone's keyboard would be on screen.)
- [x] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 1 hour 30 minutes in the map-first-answer session, with three subagents for the test sweep (about 8 minutes each); an estimate from the transcript's timestamps.
- Tokens: an estimate: the session about 120k output and 45M input, almost all cache reads, with about 300k cache writes; the three subagents about 550k in all.
