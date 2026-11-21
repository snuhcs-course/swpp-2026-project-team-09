# 04: The tutorial order knows the day and the hour

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server.

## What happens now

The tutorial order (`lookup/tutorial-order.ts`, `tutorial-lookup.ts`, `tutorial-words.ts`), asked on a Saturday at 03:19:

- A place with weekday hours has no hours on Saturday, so it reads as closed, and the one wording for closed says "<the next item's time> 전에는 열지 않아". With no next item that time is 18:00: "학생증(S-CARD) 발급받기 · 18:00 전에는 열지 않아 뺐어요", for an office open 09:00–17:50 on weekdays.
- A quest with no hours counts as open at once. Five such places were ordered from now: "다섯 곳을 돌면 04:18에 끝나요".
- The basis lists notes only for the places left out, so it said why five were left out and nothing about the five chosen.
- With no next item it adds "오늘 남은 일정이 없어요", which the answer showed twice.

## What to build

- Closed all day is said as such ("오늘은 열지 않아 뺐어요"); already closed as "오늘은 이미 닫아서 뺐어요"; opening after the deadline keeps its wording.
- A quest with no hours is visited only between 09:00 and 18:00, so at night the order starts at 09:00, and the first line says so ("09:00부터 한 곳을 돌면 09:10에 끝나요").
- The basis gives one line for each chosen place, its time and place, before its note and before the places left out.
- No "오늘 남은 일정이 없어요" line.

Left to P04: the tutorial card does not list the order's steps; that card is in the answer screen P04 rebuilds.

## Acceptance criteria

- [x] On a Saturday, the S-CARD office is left out with "오늘은 열지 않아". (Unit test, fails before the fix.)
- [x] At 03:19, no stop of the order starts before 09:00. (Unit test, fails before the fix.)
- [x] The basis names every chosen place. (Unit test.)
- [x] No answer carries "오늘 남은 일정이 없어요". (Unit test.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 4 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 17k; input 9.2M, of which 9.1M cache reads, 34k cache writes and 56 uncached. No subagents.
