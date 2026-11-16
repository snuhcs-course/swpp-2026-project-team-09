# 19: Four faults left in what PR 339 merged

Parent: [ticket 17](17-taken-alone-fixes.md) ("The follow-up after the read of PR 338"). The pre-release read of PR 339 found these (Group 1, items 1 to 4 of `release-1116/after-release-list.md` in the orchestrating session's notes). The Release `snunow/all/26.11.17-1` went out with them.
Status: ready-for-human
Blocked by: nothing (starts from `4.0/Main` at d5a6268f)
Native files: no

## What to build

1. A press again resends the Plan's first request, with its idempotency key, unless the main server answered a real refusal.
2. A taken card cleared because its Quest became a 파티 takes the Plan's kept request with it.
3. "다시 고르기" reads the User's Quests fresh before it decides.
4. The room of a Quest taken alone says no 파티 word.

## Acceptance criteria

- [x] **1.** The first press for a Plan keeps its key and its body (`location` and `locationMissing` as they were then).
  - After no answer (status 0), a 5xx, or 409 `IDEMPOTENCY_KEY_IN_USE`, a press again resends exactly that request, so a Quest already made comes back as the stored answer and its card shows.
  - Any other 4xx clears both, 422 `IDEMPOTENCY_KEY_REUSED` among them, and so do another answer or Plan and the card's own ends ("다시 고르기", and 2).
  - Tests: no answer, and IN_USE, each then a move and a press again: the same key and the same body, and the made card. Both fail before the fix. `SHARED_QUEST_HELD` and 422, each then a move and a press again: another key and the new position.
- [x] **2.** Where `useGathered` clears the card, the Plan's kept request goes too, as with "다시 고르기". The next "여기로" asks anew and gets the real answer: 409 `SHARED_QUEST_HELD` and "이 행사에 함께 가는 파티가 이미 있어요". The test fails before the fix.
- [x] **3.** "다시 고르기" reads the User's Quests (`GET /quests`) before it decides.
  - A Quest that gathers others by then only loses its card, with no DELETE.
  - When the read fails, it says "다시 고르지 못했어요. 잠시 후 다시 시도해 주세요" and sends no DELETE.
  - Both tests fail before the fix.
- [x] **4.** The room of a Quest taken alone:
  - shows no 멤버 section, so no "파티장";
  - says "퀘스트를 없앴어요" after "퀘스트 없애기";
  - has no title in its app bar until it is read.
  - A real 파티 keeps its 멤버, its toast and its title "파티" once read. The three tests fail before the fix.
- [x] Each changed source file has its AI-generated row; lint, format and type checks of all of `mobile` pass; no native file, no server file and no schema changed.

## Comments

### Decisions for review (2026-11-17)

The orchestrating session decided 1 to 4, and the user approved them as a set. The details below are mine.

1. **The first request is kept, not only its key.**
   - `@nestjs/idempotency` tells a retry by the key and a fingerprint of the whole body (`contexts/http.context.js`, `payload: req.body`). The body carries the User's live position.
   - So a press again under the kept key from even a slightly different position gets 422 `IDEMPOTENCY_KEY_REUSED`, and so does every press after it. The made card came back only from the exact same position. The released app had the same fault.
   - Resending the first body makes a retry the same request. The Plan on screen was worked out for that position, and the main server names the Plan by its id and start time. Its `location` carries no time, so no position is refused for being old.
   - 422 still clears the request, as a safety net only: our own retries can no longer bring it.
   - This holds for "이대로 초대" too, which shares the hook.
2. **The card and the kept request go together.** `withoutCard` clears both, for `useGathered` and for "다시 고르기".
3. **The Quests are read straight from the main server** (`apiClient.listQuests()`), not through the query cache. A fetch through the cache would join a read already on its way, which may have started before the party form's change. Nothing else changes: the card still goes only for a Quest that now gathers others, and a refused or failed DELETE is told as before.
4. **No title until the room is read**, rather than the kind passed along from the row that opened it. The room is opened from many places (the Quest list, the 파티 tab, 알림, the map, links), and none of them would need to change. The loading and error states show no title for any room; a read room shows "퀘스트" or "파티" as before. The 멤버 section is left out where 파티 활성화 and 파티 채팅 already are (`room-screen.tsx`'s `Body`). The toast's words come from the caller (`endQuest(…, alone)`), since only the room knows the Quest is taken alone; the post screen's end is always a 파티's.

### Emulator check (2026-11-17)

Run on the mock dev build by taps. For the check only, two uncommitted local changes were made: the example chip "식사 메뉴 추천" answered with the stored events answer, and the mock's room read the Quests the mock made.
- The room of the job fair taken alone showed "퀘스트" with no 멤버 section.
- "퀘스트 없애기" asked "퀘스트를 없앨까요?", and ended it with the toast "퀘스트를 없앴어요".
- Not shown: the room while it is read (too short on the mock), and 1 to 3, which need a lost answer or a read behind the server. The tests cover them.

### Agent usage (2026-11-17)

- Agent time: about 30 minutes in this session (02:20 to 02:50), an estimate from the transcript's timestamps. The wait for the orchestrating session's answer on 1 was under a minute. No subagent took part.
- Tokens, up to the push: input 21.33M, of which 21.11M cache reads, 0.22M cache writes, and 218 uncached; output 0.07M.
