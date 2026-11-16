# 32: The conversation is kept when the frame is left, waiting has no words, and the answer stays in sight while typing

Parent: [P02 spec](../spec.md); the user's own use of the released app (`snunow/all/26.11.16-1`) on 2026-11-16
Status: ready-for-human
Blocked by: nothing

## What to build

Since ticket 04 the answer frame is the only screen, and three things in it fall short:

- Leaving the frame forgets the conversation, and nothing shows an earlier answer.
- Waiting is the words "보는 중" and a text button "그만".
- While the keyboard is up, the card's content is hidden, so a follow-up is typed without the answer it follows.

### 1. The conversation survives leaving the frame

- Leaving hides the frame and keeps the conversation. Leaving is any of these:
  - ✕ on the pill;
  - Android's back button;
  - a map button of the answer (a layer turned on);
  - the start of route guidance.
- A reply on its way when the frame is hidden still arrives and is kept.
- While the conversation holds something and the frame is hidden, the AI input on the everyday map has a round icon button at its left, inside the bar, labelled "이전 답". It shows the frame again at the turn on screen, as it was.
- A message sent from the everyday map continues the conversation and shows the frame.
- While the frame is hidden, the map is the everyday map: no answer marks, and presses and cards work as without a conversation. When the frame shows again, the answer's marks and camera come back.
- "새 대화", a round icon button right of the pill, forgets the conversation and closes the frame. It is the only way the conversation is forgotten while the app runs.
- When the conversation has turns before the one on screen, the top of the card has one line, "지난 답 N개". Pressing it opens those turns above the current one, read-only: for each, the words asked and the reply's lines. A Plan's reply shows its first Plan's lines, a Lookup's shows its lines, and any other shows its words. "접기" closes them.

### 2. Waiting without words

- `WaitingDots` in the design system: three dots that pulse in turn. They stay still while the system's reduce-motion setting is on. Their accessibility label is the words they replace.
- The frame's "보는 중" becomes the dots plus a round stop icon button labelled "그만".
- A building card's "보는 중이에요" (`place-card.tsx`) and the how-about card's (`how-about-card.tsx`) become the same dots.
- 그만 cancels the question: the question leaves the conversation, and its reply is dropped when it comes. The frame then shows the turn before, or closes when there is none.

### 3. The answer stays in sight while a follow-up is typed

- While the keyboard is up, the card shows one line in place of its content: the headline of the turn on screen. That is the Plan's headline as its card draws it (for example "점심 301동식당 · 식사 55분"), or the Lookup's title, or the reply's first line.
- The line is ellipsized to fit. While a reply is on its way, the dots stand there instead.
- The map is left as it is.

## Acceptance criteria

- [x] ✕, back, a layer button, and the start of route guidance hide the frame, and "이전 답" shows the same turn again.
- [x] A message sent from the everyday map carries the earlier turns and shows the frame.
- [x] While the frame is hidden, no answer mark is on the map and a press opens its card.
- [x] "새 대화" forgets the conversation: no "이전 답", and the next request carries only its own message.
- [x] "지난 답 N개" opens the earlier turns read-only, and "접기" closes them.
- [x] Waiting shows the dots, labelled "보는 중", and a "그만" icon button. 그만 drops the question and its reply.
- [x] The building card and the how-about card wait with the same dots, labelled "보는 중이에요".
- [x] With the keyboard up, the card shows the turn's headline on one line.
- [x] Tests at the main screen cover each of the above. The tests that expected ✕ to forget now expect it to hide.

## Decisions for review

1. **Where "이전 답" stands.** It is an icon inside the AI input's bar, at its left, and only while a hidden conversation holds something. The bar is already there, so it takes no new room on the map.
2. **Where "새 대화" stands.** It is a round icon beside the pill at the top of the frame, where the pill's row has room. The card keeps all of its height for the answer.
3. **How earlier answers are reached.** They open from one line at the top of the card, and only when there are earlier turns. They are read-only, because their Plans and Lookups are no longer on the map and their buttons would act on what is not shown.
4. **A restart forgets the conversation.**
   - The answers are about now: a meal's time band, free seats, where Friends are.
   - Each request sends the conversation, so old turns after a restart would steer new answers with stale facts.
   - Keeping it would also store the User's words and Friends' places on the phone.
5. **The waiting indicator** is three pulsing dots, still under reduce motion. One look serves all three places, and its accessibility label keeps the words.
6. **그만 cancels and ✕ hides.** 그만 says "stop asking". ✕ says "not now", so a reply on its way is kept.
7. **Leaving never forgets.** Leaving is ✕, back, a layer, or route guidance. Only "새 대화" forgets, as the user asked.
8. **Every other close hides too.** A card's own "닫기" and the ✕ of a meet's only Friend used to forget the conversation. They now hide the frame, for the same reason as 7.
9. **What shows the frame again.**
   - A new turn shows the frame again: the User's message, a turn asked by a card's button or a mark, or the app's own bubble (for example a push that opens a library room's card). So a library booking that finishes just after ✕ shows the frame with its outcome.
   - A reply to a question asked before the frame was hidden does not show it. It is kept for "이전 답".
10. **A made Quest's card is kept.** ✕ hides it with the frame, and "이전 답" brings it back.
11. **The failed words stay in the input on ✕.** The failure is still the last thing said. "새 대화" empties them.
12. **A Lookup's headline** is the first line its card draws, since a Lookup has no title of its own.
13. **A new turn asked while a reply is on its way takes that question back first, as 그만 does.**
    - This came from the review of pull request 335. With the frame hidden, the everyday map takes presses again: an example, a card's button, the tutorial's ask, or an interest mark. The late reply then answered the new turn, and two User messages went out in a row.
    - The new turn takes the old question back and counts another conversation, so the late reply is dropped.
    - It is one guard where every ask passes (`send`, `askApp`, `addRecalculated` in `use-chat.ts` and `let-go.ts`), so it also covers ways in added later.
    - Making the new ask wait instead was not chosen: with the frame hidden, nothing shows that something waits, so a press that does nothing for seconds reads as broken.

## The acceptance-test sheet

"새 대화" exists again, in the frame, so the steps whose precondition is "새 대화" hold again:

- UAT-4 steps 4, 5, 7, 8, 11, 16, 17, 18, 20, 22, and 23;
- UAT-5 steps 2, 6, 7, 11, 12, 16, 17, and 18.

UAT-4 steps 3 and 15 ("채팅") still describe the chat sheet. The sheet itself is not edited.

## Comments

### Checked on an emulator (2026-11-16)

The debug build on the headless AVD, with the mock API and slow Assistant replies:

- 김민준's "만나고 싶다", then ✕: the everyday map with the Friend's card back and "이전 답" at the left of the bar.
- A building's "여기서 먹기" continued the conversation. The frame came back with "새 대화" beside the pill and "지난 답 1개", which opened the meet's turn read-only.
- A pressed building waited with the dots.
- A tap on the bar raised the keyboard with the headline "12:15 302동 앞에서 만나요" above it.
- The check found the headline cut in half on the phone: with the keyboard up, the card's content could take less than one line. It now takes at least the headline's line (`LEAST_CONTENT` in `answer-frame.tsx`).

### Agent usage (2026-11-16)

- Agent time: about 56 minutes, one session and one subagent. An estimate from the transcripts' timestamps; the session's share includes a short fix of pull request 332's test.
- Tokens: input 75,653,139, of which 74,766,908 cache reads and 885,687 cache writes; output 193,542.
