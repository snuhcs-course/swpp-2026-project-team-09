# 35: The chat's history reads newest first, waiting keeps the input, a hidden reply leaves a dot, and 새 대화 can be undone

Parent: [P02 spec](../spec.md); ticket [32](32-conversation-kept.md); the user's own use of the released app (`snunow/all/26.11.17-2`) on 2026-11-17
Status: ready-for-human
Blocked by: nothing

## What to build

The user found the chat the weakest part of the app: "채팅 사용성이 좀 떨어지는 것 같아. 과거 기록 볼 때도 위에거 최근이게 하거나 여러모로 문제가 많아 보여". Using it on an emulator for twenty minutes found five problems, ranked. The orchestrating session picked four of them for this ticket.

### 1. History

- Before:
  - "지난 답 N개" sat at the top of the card, which takes at most half the screen.
  - Opened, it listed the oldest turn first and the current answer last, so the answer being read was pushed out of sight.
  - The current turn had no question line, and earlier turns lost their cards.
- Now:
  - The card shows the current turn first, with its question as a grey line, then its reply.
  - Under the reply, "지난 답 N개" opens the earlier turns, the latest first.
  - Each earlier turn has its question, its lines, and its cards' names ("· AI 커리어 설명회").
  - The card always opens on the current answer.

### 2. Waiting

- Before:
  - In the frame, the input vanished while a reply was on its way, and the card shrank to the dots. It grew again when the reply came.
  - On the everyday map, 보내기 stayed grey until a hidden reply arrived (after-release item 9).
  - A building's or a Friend's card showed only a greyed button.
- Now:
  - The input stays in place and sends. One rule holds everywhere, as PR 335 set it: a message sent while a reply is on its way takes that question back. That covers the frame, the everyday map, an example, and a card's button.
  - The card keeps the height it had and shows the new question with the dots, and 그만, in place of the reply.
  - A pressed card button ("여기서 먹기", "만나고 싶다", a Lookup's plan buttons) shows the dots in place of its label. The other buttons of the card are disabled.

### 3. A reply that arrived while the frame was hidden

- "이전 답" carries a red dot.
- The dot clears when the frame is shown again.
- The button's accessible name is then "이전 답, 새 답 있음".

### 4. 새 대화

- Still one press, with no dialog.
- A toast says "대화를 지웠어요" with 되돌리기 for 5 seconds.
- 되돌리기 brings every turn back with the frame. A question still on its way at the press stays dropped. Nothing is brought back once anything new was said.

## Acceptance criteria

- [x] The current turn stands first in the card with its question, and "지난 답 N개" is under its reply.
- [x] Earlier turns open latest first and name their cards.
- [x] While waiting, the card shows the question, the dots, and 그만, and keeps the input; its content keeps the height of the reply before.
- [x] A message typed on the everyday map while a hidden reply is on its way is sent and takes that question back (after-release item 9). So is one typed in the frame while waiting.
- [x] The pressed "여기서 먹기" shows the dots in place of its label until its answer opens.
- [x] A reply arriving while the frame is hidden puts a dot on "이전 답"; showing the frame clears it; a reply seen before hiding leaves none.
- [x] "새 대화" forgets at one press; 되돌리기 brings every turn back; after the toast is gone, or after a new message, nothing comes back.
- [x] The design system's toast takes an optional action word, and the button an optional `busy`.

## Decisions for review

1. **Newest first, under the current answer.** This is the orchestrating session's reading of the user's "위에거 최근이게", which it asked the user to confirm. The current answer stays first because it is what the card is for. Earlier turns follow it from the latest down. In a list read top to bottom, the next older turn is then always the next thing down.
2. **The fold sits under the reply, so a long reply hides it until the card is scrolled.** A list of party cards, for example, puts "지난 답 N개" below the last card. The card's scroll bar shows there is more. Putting the fold at the top again would bring back the jump this ticket removes.
3. **The current turn's question is shown twice**: in the pill at the top of the screen and as the card's first line. When the card is scrolled or the history is open, the line keeps each answer next to its question.
4. **Earlier turns name their cards and stay read-only.** Their Plans and Lookups are no longer on the map, so their buttons would act on what is not shown.
5. **One rule for asking while a reply is on its way:** a new message takes the waiting question back, wherever it is typed. Send is never greyed for a reply on its way. 그만 stays as well.
6. **The card keeps its last height while waiting** instead of shrinking to the dots. The reply then replaces the dots in a card of the same size, and the card resizes once, when the reply is drawn.
7. **The pressed button's own dots, not a greyed button.** Only the pressed button shows them; the card's other buttons are disabled until the answer comes.
8. **The dot on "이전 답" marks only replies that arrived while hidden.** Leaving after reading the reply leaves no dot.
9. **되돌리기 for 5 seconds, no confirm dialog.** The library cards' outcomes and rooms are no longer forgotten on 새 대화. They are kept by bubble ids that are never given again, so they are inert for a new conversation and come back with 되돌리기.
10. **The toast's action word** is the design system's toast with an underlined word at its end. Pressing the word acts and hides the toast; the rest of the toast still takes no press.

## Not in this ticket

- Follow-up chips under an answer, and new examples: the next ticket.
- The camera after a text-only reply and after leaving: the one after.
- After-release items 10 to 12 stay open.

## Comments

### Checked on an emulator (2026-11-17)

The debug build with the mock API. The Assistant, taps, and recalculations were made to answer after 3 seconds (`EXPO_PUBLIC_MOCK_SLOW`), to stand in for the real model's 2 to 9 seconds.

- Before, on `4.0/Main`:
  - waiting hid the input (c06);
  - the history opened oldest first over the answer (c13);
  - "여기서 먹기" greyed out (c17);
  - a reply that arrived while hidden left no sign (c26);
  - 새 대화 wiped four turns at a press (c28).
- After:
  - waiting shows the question, the dots, and the input (a01), and the reply comes under the question (a02);
  - the dot on "이전 답" (a05);
  - the fold under a long reply (a10) opens latest first (a11);
  - "대화를 지웠어요 · 되돌리기" (a12) brings the conversation back (a13);
  - the dots in "여기서 먹기" (a15).

- Found while checking ticket 36's chips: a question asked from a card scrolled down left the card scrolled, so the new question stood out of sight above the dots. The card now goes back to its top when a reply starts to wait (`held-height.ts`).

### Agent usage (2026-11-17)

- Agent time: about 70 minutes of one session, from the chat walk to the pull request, including the walk through the rest of the app. An estimate from the transcript's timestamps.
- Tokens: input about 69 million, of which about 68.7 million cache reads and 0.19 million cache writes; output about 98,000. Measured from the session's transcript; the session went on to other tickets.
