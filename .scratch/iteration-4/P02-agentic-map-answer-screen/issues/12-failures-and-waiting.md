# 12: A failure says what failed and keeps the words; waiting says it is looking and can be stopped

Parent: [P02 spec](../spec.md); the design's row 8, boards n16, n17, n18, principle 5
Status: ready-for-agent
Blocked by: package B's ticket 07 (it changes `map-bottom.tsx` now)

## What to build

- **n16, a request that failed.** The card says "답을 가져오지 못했어요." / "연결이 끊겼거나 서버가 답하지 않았어요. 쓴 말은 입력칸에 그대로 두었어요." with "다시 시도", and the input holds the words that were sent, ready to send again. The daily limit keeps its own words and no retry.
- **n17, one source failed.** When the library's seats cannot be read, the seat card says "관정의 자리 정보를 받지 못했어요" with "다시 시도" (main), which reads the library again, and "닫기".
- **n18, waiting.** While the reply is on its way the card says "보는 중" with "그만" (it closes the answer and forgets the reply on its way, as the pill's ✕ does), and the input is hidden.

## Acceptance criteria

- [x] n16's two lines and "다시 시도"; after a failure the input holds the sent words; a send after editing them sends the new words.
- [x] n17's line, "다시 시도" that reads the seats again, and "닫기"; a second failure says it again.
- [x] n18's "보는 중" and "그만", and no input while waiting; the input comes back with the reply or after "그만".
- [x] Tests: the app's integration tests of each case against the fake server.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- Not built, with the reason:
  - n17's second line "길만 안내할게요 · 걸어서 4분" and its route, chips, and flag: the seat answer is a library card, not an answer drawn on the map, until row 2's seat answer is drawn there.
  - n18's line "내 위치, 다음 수업, 오늘 메뉴" (what is being read): the server answers once at the end and reports no steps, so any list would be made up (principle 1). It needs a reply that streams the tools as they run.
- The seam lines are in `row-8-seams.md`, ticket 12.

### Decisions (2026-11-15)

1. **n16's lines.** `CHAT_FAILED` is the two lines, one per line. The answer card draws them as row 8 draws a reply that is no answer: the first in the title style, the second smaller and muted (`ReplyLines`, shared with the refusal). The chat sheet's bubble shows them as two lines. "다시 시도" stays under them, and the daily limit keeps its words and look.
2. **The words put back.** `restoreOf` (`features/assistant/restore.ts`) gives the User's last message while an `unavailable` failure is the last thing said, and `map-bottom.tsx` passes it to the input as `restore`. The input puts the words into its field once per failure, and only into an empty field: what the User typed while waiting (the chat sheet keeps its input then) stays. Untouched, the words come out again once that failure is no longer last: after "다시 시도" sends them again, and after ✕ or 새 대화.
3. **n18.** "보는 중" in the title style, and "그만" as a secondary button, as "다시 시도" is in the same card; "그만" calls the close the pill's ✕ calls. Only the answer frame hides the input while waiting: the chat sheet keeps its input and its "···".
4. **n17's card.** Only the seat book card (`library-book-…`), the card of the seat answer, offers the read again. The 좌석 현황 card and the room cards keep their one line, as no board draws them failing. `FailureNote` takes `reading` (the words, 다시 시도, 닫기) and uses it for any failure but a session one, which keeps "로그인". The line takes the card's failure colour, as the card's other failures do.
5. **n17's 닫기** ends the card as the chat keeps an ended card, "예약하지 않았어요", without the bubble "알겠어요. 예약하지 않았어요." that 취소 adds. It does not close the answer frame as the board's play does: a library card does not hold the frame's close, and handing it down would change `chat-card-actions.tsx` beyond the seam. The pill's ✕ closes the frame.
6. **Beyond the seam.** `answer-frame.tsx`'s `Words` gains a three-line branch that draws a failure's lines (decision 1). The P02 spec's line on waiting now says "보는 중" with "그만".

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5). This session's review and the pull request are counted under P03 ticket 07.

- Agent time: about 28 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 86,880; input 22,196,887, of which 21,293,094 were cache reads, 903,561 cache writes, and 232 uncached. Without cache reads: 990,673.
