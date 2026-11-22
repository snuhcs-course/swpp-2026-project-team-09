# 44: The caption reads as a control, and its list offers "＋ 새 질문"

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

- On an answer, the card's top row shows what the User asked as small grey text at the left (`answer-caption.tsx`). A press on it opens the conversation's earlier questions in the card (`card-questions.tsx`), but nothing says that it can be pressed.
- The right side says "올리면 N곳 목록" or "올리면 자리·열람실" in the same faint caption type, and also does not read as a control.
- Since the frame lost "새 대화", nothing on the answer says how to start a new conversation: "←" returns to the main map, and a message typed there starts one.

## What to build

- **The caption's left side** is a chip: the design system's sunken chip fill, 32 high, a 44 press area, the history mark, the question on one line cut with "…", and "⌄" ("⌃" while the list is open). Its screen reader name is "<question>, 이전 질문 보기" or "…닫기".
- **The list it opens** is titled "이전 질문". It ends with a "＋ 새 질문" row, outside the rows' scroll. The row closes the answer as "←" does: the conversation is kept and reachable by the main map's "이어서 · …" chip. It then puts the cursor in the main map's input, whose message starts a new conversation. It uses the frame's own close and the input's existing focus counter (`started`), and adds no other way of starting conversations.
- **The right side** keeps its words and what it does, and gains the link colour and an up-chevron. The raised card's "걸음이 적은 순" stays plain words.
- The questions over the keyboard (`Typing`) keep their header and get no "＋ 새 질문".

## Tests

- `mobile/__tests__/answer-question-list.integration.test.tsx`: the chip's new name; the list's title and "새 질문"; the row closes the answer, keeps the conversation, and focuses the main input; a message typed then carries no earlier message.

## Comments

### Agent usage (2026-11-23)

- Agent time: about 60 minutes in one session, no subagents (an estimate, 00:45 to 01:46 KST; most of it integration tests at load 30–40).
- Tokens: about 8 M input, of which about 7.7 M cache reads and 0.3 M cache writes, and about 40 k output (an estimate; the session reports no per-ticket count).
