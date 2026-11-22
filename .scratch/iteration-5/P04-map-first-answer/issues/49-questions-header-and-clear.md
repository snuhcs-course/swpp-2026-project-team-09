# 49: "＋ 새 대화" always in reach, and the earlier conversations erased at once

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([44](44-caption-affordance.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

From the phone test on Main 87aa3554:

- "＋ 새 대화" is the last row of the earlier-questions list, under every question, so the User scrolls to the bottom to reach it.
- Every question of the current and the kept conversations is one flat list. Nothing erases them.
- Conversations live only in the app's memory (`features/assistant/conversations.ts`); the server stores none.

## What to build

- **The header** (`screens/main/answer/question-list.tsx`): one row outside the scroll, with "이전 질문" at the left and "＋ 새 대화" at the right, always visible. The footer row goes. The same list over the main map (the "지난 대화" chip, `past-chats.tsx`) gets the same header. There "＋ 새 대화" closes the list and puts the cursor in the main input.
- **Two groups**, each latest first:
  - "지금 대화": the current conversation's questions. The turn on screen keeps 지금.
  - "이전 대화": the kept conversations' questions.
  - With nothing kept there is one group and no group names.
- **"모두 지우기"** sits at the right of the "이전 대화" header. A press turns that row into "이전 대화의 질문 N개를 지울까요?" with 취소 and 지우기, with no dialog and no toast.
- **지우기** empties the kept conversations (`clearEarlier` on `useConversations`). The outcomes kept for their replies are dropped with them (`usePlanOutcomes` keeps only ids still in a conversation).
- **The current conversation stays**, with every question: it is what "이어서 말하기" goes on from. It leaves only after the User starts a new question and erases again. Quests already made are untouched.
- **Large font:** at a font scale of 1.3, the header row and the confirm row wrap inside their own rows (`flexWrap`, shrinking words), and nothing overlaps.

## Second round, from the phone

- **One left edge and one right edge.**
  - Left: the title, the group names, and the rows' times start on one line (`INSET`), and the time is left-aligned in its column, which a large font widens.
  - Right: "＋ 새 대화", "모두 지우기", 지금, and the chevrons end on one line. The word buttons have no side padding, and their touch area reaches past their words.
  - Over the main map, the same edges sit inside the card's padding.
- **The confirm is a block of its own** in place of the "이전 대화" row, full width, sunken and rounded:
  - "이전 대화의 질문 N개를 지울까요?" in label weight;
  - "지금 대화는 그대로 남아요." in muted caption;
  - two equal design-system Buttons, 취소 (secondary) and 지우기 (destructive).
  The earlier rows stay under it. Android's back takes the block away first.

## Third round, from the phone

- **The answer on screen:** no "지금" word at the row's right. The row on screen is tinted (`color.blue50`), and the other rows keep their chevron. A screen reader still hears "지금" and the row's selected state.
- **"이전 대화", one row per kept conversation, latest first:**
  - line 1 is its first question;
  - line 2, muted, is "질문 N개 · <its last question's outcome>", or just the outcome for one question;
  - the time column shows its last question's time.
  - A press takes it up again at its last turn, and its questions then stand under "지금 대화".
  - A trash button at the right ("이 대화 지우기", a 44 touch area) erases that conversation at once, with no question (`removeEarlier`, with the same pruning of outcomes).
- **"모두 지우기"** asks in the design system's `Dialog`, as other destructive confirms do: "이전 대화를 모두 지울까요?", "지금 대화는 그대로 남아요.", 취소 and 지우기 (danger). The inline block and its back handler are gone; the Dialog's own cancel answers Android's back.
- **Edges:** round 2's edges stay. The trash marks end on the same right line as "＋ 새 대화" and "모두 지우기".

## Fourth round: one way to a new conversation

The action is called "새 대화". The card's top row (P04 ticket 52) holds the history chip, a "＋ 새 대화" pill and "✕" (close) in every state, so the list in the card no longer has "＋ 새 대화" of its own. Its header is "이전 질문" alone. The right line is kept by "모두 지우기" and the trash marks. The list over the main map ("지난 대화") keeps "＋ 새 대화", since no "＋ 새 대화" pill stands over it there. The tests of the card's own "＋ 새 대화" leave with it; ticket 52's pill carries them.

## Tests

- `mobile/__tests__/answer-clear-earlier.integration.test.tsx`: the groups, the tinted row with no "지금" word, and one row per kept conversation; a kept conversation taken up at its last question; one trashed at once; "모두 지우기" in the Dialog, 취소 and 지우기, and the next message goes on from the current conversation only.
- `mobile/__tests__/answer-question-list.integration.test.tsx`: a kept conversation of three questions is one row, and a press brings back its last turn.
- `mobile/__tests__/answer-question-list.integration.test.tsx`: the test of the title and "새 대화" is renamed for the header.

## Comments
