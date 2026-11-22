# 49: "＋ 새 질문" always in reach, and the earlier conversations erased at once

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none ([44](44-caption-affordance.md) is merged).

Native files: none. Releases: an app OTA update only.

## What happens now

From the phone test on Main 87aa3554:

- "＋ 새 질문" is the last row of the earlier-questions list, under every question, so the User scrolls to the bottom to reach it.
- Every question of the current and the kept conversations is one flat list. Nothing erases them.
- Conversations live only in the app's memory (`features/assistant/conversations.ts`); the server stores none.

## What to build

- **The header** (`screens/main/answer/question-list.tsx`): one row outside the scroll, with "이전 질문" at the left and "＋ 새 질문" at the right, always visible. The footer row goes. The same list over the main map (the "지난 대화" chip, `past-chats.tsx`) gets the same header. There "＋ 새 질문" closes the list and puts the cursor in the main input.
- **Two groups**, each latest first:
  - "지금 대화": the current conversation's questions. The turn on screen keeps 지금.
  - "이전 대화": the kept conversations' questions.
  - With nothing kept there is one group and no group names.
- **"모두 지우기"** sits at the right of the "이전 대화" header. A press turns that row into "이전 대화의 질문 N개를 지울까요?" with 취소 and 지우기, with no dialog and no toast.
- **지우기** empties the kept conversations (`clearEarlier` on `useConversations`). The outcomes kept for their replies are dropped with them (`usePlanOutcomes` keeps only ids still in a conversation).
- **The current conversation stays**, with every question: it is what "이어서 말하기" goes on from. It leaves only after the User starts a new question and erases again. Quests already made are untouched.
- **Large font:** at a font scale of 1.3, the header row and the confirm row wrap inside their own rows (`flexWrap`, shrinking words), and nothing overlaps.

## Tests

- `mobile/__tests__/answer-clear-earlier.integration.test.tsx`: the two groups and the header's "새 질문"; "모두 지우기" asks in the row and 취소 keeps everything; 지우기 leaves only the current conversation, and the next message goes on from it.
- `mobile/__tests__/answer-question-list.integration.test.tsx`: the test of the title and "새 질문" is renamed for the header.

## Comments
