# 12: A failure says what failed and keeps the words; waiting says it is looking and can be stopped

Parent: [P02 spec](../spec.md); the design's row 8, boards n16, n17, n18, principle 5
Status: ready-for-agent
Blocked by: package B's ticket 07 (it changes `map-bottom.tsx` now)

## What to build

- **n16, a request that failed.** The card says "답을 가져오지 못했어요." / "연결이 끊겼거나 서버가 답하지 않았어요. 쓴 말은 입력칸에 그대로 두었어요." with "다시 시도", and the input holds the words that were sent, ready to send again. The daily limit keeps its own words and no retry.
- **n17, one source failed.** When the library's seats cannot be read, the seat card says "관정의 자리 정보를 받지 못했어요" with "다시 시도" (main), which reads the library again, and "닫기".
- **n18, waiting.** While the reply is on its way the card says "보는 중" with "그만" (it closes the answer and forgets the reply on its way, as the pill's ✕ does), and the input is hidden.

## Acceptance criteria

- [ ] n16's two lines and "다시 시도"; after a failure the input holds the sent words; a send after editing them sends the new words.
- [ ] n17's line, "다시 시도" that reads the seats again, and "닫기"; a second failure says it again.
- [ ] n18's "보는 중" and "그만", and no input while waiting; the input comes back with the reply or after "그만".
- [ ] Tests: the app's integration tests of each case against the fake server.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass; no native file changed.

## Comments

- Not built, with the reason:
  - n17's second line "길만 안내할게요 · 걸어서 4분" and its route, chips, and flag: the seat answer is a library card, not an answer drawn on the map, until row 2's seat answer is drawn there.
  - n18's line "내 위치, 다음 수업, 오늘 메뉴" (what is being read): the server answers once at the end and reports no steps, so any list would be made up (principle 1). It needs a reply that streams the tools as they run.
- The seam lines are in `row-8-seams.md`, ticket 12.
