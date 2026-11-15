# 13: The Tutorial Quests in order, before the next Class

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md); design section 6.5
Status: ready-for-agent
Blocked by: 12 (the contract's `order` and `steps`)

## What to build

"새내기 퀘스트 뭐부터?" orders the User's Tutorial Quests that are not completed and have a Place. The order is the one that fits them all before the next Class, and the Assistant numbers them on the map with their times. It says first what decides the order, and offers "1번부터 길 안내" (wireframe row 7, board q10; design section 6.5, steps 1 to 3).

## Acceptance criteria

- [ ] A tool answers the User's open Tutorial Quests with a Place as a Lookup of kind `tutorial`:
  - the Places numbered in order, each tagged with its arrival and the quest ("13:51 보건진료소");
  - the walks between them, and on to the next Class as the next item;
  - the steps "13:51 학생회관 3층 · 보건진료소";
  - the lines: the time all are done, and the next Class;
  - "1번부터 길 안내" (`guide` to the first).
- [ ] The order fits as many as can be done before the next Class, the shortest total walk first. Quests that do not fit are left out, and the basis says which, and why.
- [ ] A quest whose facts say when it can be done (the student card "from the day after applying on MySNU", an office's hours) keeps its fact in the basis. A quest whose office is closed then is left out, with the reason.
- [ ] The Assistant never marks a quest done: the card's foot says "완료는 퀘스트에서 직접 눌러요" (design 6.5's rules).
- [ ] Unit tests for the order with stays and walks chosen by hand; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The time spent at a quest's Place** is not in the Tutorial data. Each stop takes **10 minutes**, as board q12's "받는 데 10분" does, unless the quest's content gives its own minutes. To change it, a quest in `content/tutorial.yaml` may later gain `minutes:`. This is the one value a person should review.
2. **Only quests with a Place** are ordered (S-CARD, 천원의 식사, 분실물센터, 노트북 대여, 관정, 행정관 셔틀, …). Online quests (S/U, ChatGPT Edu, MS365) are named in one basis line as "온라인으로 할 수 있어요".
3. **The order** is the best of every order of at most five stops, a brute force: five stops make 120 orders.
4. **A quest with several Places** (S-CARD: 67동 and the bank in 4동) uses its first Place.
5. **The start** is where the User is, as for a way (ticket 06): the Place of their location, else that of their last Class today.

## Lines in other packages' files (for the app's part, after #270)

- Package B: the numbered dot of ticket 12.
- Package D's first-run files: none are needed. The first run's end (row 12) may offer the chip "새내기 퀘스트 뭐부터?"; that is D's choice, and nothing here depends on it.

## Comments
