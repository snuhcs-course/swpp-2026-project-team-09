# 17: What keeps a Quest taken alone alone, and apart from the parties

Parent: [spec](../spec.md) ("A Plan taken alone"); [ticket 15](15-plans-taken-alone.md); `solo-quests/rule.md` rules 4, 6 and 8. An independent read of Main after PR 334 found five defects (`release-1116/early-read-f92a9132.json` in the orchestrating session's notes).
Status: ready-for-human
Blocked by: nothing (starts from `4.0/Main` at 5f535cf1)
Native files: no

## What to build

Five fixes to what ticket 15 merged:

1. The party form for an event the User took alone turns the Quest taken alone into one that gathers others.
2. "여기로" on an event never deletes the User's own 파티 for it.
3. No count of parties counts a Quest taken alone.
4. "다시 고르기" on a Quest already gone gives the Plan back.
5. No one is invited into a Quest taken alone, and its settings stay.

## Acceptance criteria

- [x] **1.** `POST /quests` (attend), reaching the User's Quest taken alone for the event, turns it in that same transaction: `takenAlone` false, the usual capacity 4. Its leave-by goes, and the User is told `quests-changed`. The form's PATCH then takes. The integration test fails before the fix.
- [x] **2.** "여기로" on an event replaces only a Quest taken alone for it. A 파티 of the User's own for the event, even one nobody joined yet, refuses it with 409 `SHARED_QUEST_HELD` and stays. Entering or making a 파티 for the event is unchanged.
  - The app says "이 행사에 함께 가는 파티가 이미 있어요", the words 파티 has for that code.
  - The server and app tests fail before the fix.
- [x] **3.** The 파티 tab's "내 파티" count, 내 정보's "참여 중인 파티", the 행사 tab's `mine`, and the event's rows of 파티 찾기/모집 leave out a Quest taken alone, as 내 파티's list does.
  - A fifth place, found on the emulator: the Quest list's "파티" chip. Its rows now have the kind `quest` for a Quest taken alone, listed under 전체 only.
  - The tests fail before the fix.
- [x] **4.** "다시 고르기" answered 404 `QUEST_NOT_FOUND` counts as given up: the taken card goes and the Plan shows again. The test fails before the fix.
- [x] **5.** An invitation into a Quest taken alone and a change of its settings are refused with 409 `QUEST_TAKEN_ALONE`. Its room offers no "수정", the way into the party form, where Friends are invited and 공개 is set. The tests fail before the fix.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass in both projects; no native file and no schema changed.

## Comments

### Decisions for review (2026-11-16)

The orchestrating session decided 1 to 5 (rules 4, 6 and 8). The details below are mine.

1. **The mark is turned off, not the Quest replaced.**
   - The form has just been answered with that Quest's id and PATCHes it.
   - Its attending step is the one a 파티 for the event starts from.
   - The User's own progress stays.
   - Replacing it would need a new id under the form's feet, or a second round trip.
   - Its capacity becomes 4, the default a 파티 starts from before the form sets its own. Its leave-by is cancelled, since the alone plan is over.
   - The code is `gatheringFrom` in `quests/taken-alone.ts`, beside `forgetLeaveBy`. Both moved out of `quests.service.ts` to keep it under the 300-line limit with ticket P05-14's `seatStay` line.
2. **The refusal of "여기로" is checked only on the alone path** (`forGlobalEvent(…, alone)`). `freeForSharedQuest` is unchanged, so entering or making a 파티 for an event still replaces a Quest the User holds alone, as released.
3. **"수정" is the room's one way to invite or recruit**, so hiding it hides both. The server refuses both anyway. The released 1.0.2 app shows its usual refusal words for an unknown code: `refusalWords` falls back to "요청하지 못했어요. 다시 시도해 주세요".
4. **A Quest already gone** is told by `QUEST_NOT_FOUND`. The phone cannot tell how it went, and in each case (its time passed, dropped from its room, replaced by a 파티) the plan is over.
5. **The Quest list keeps listing a Quest taken alone, as "퀘스트",** since it is where the User's own plan shows (rule 4). Only its "파티" chip leaves it out. Readers of a row's kind check only `class`, so a `quest` row opens as a `party` row did.
6. **Not in this ticket**: anything else the read noticed is in the report to the orchestrating session.

### Emulator check (2026-11-17)

Run on the mock dev build by taps. For the check only, two uncommitted local changes were made: the example chip "식사 메뉴 추천" answered with the stored events answer, and the mock refused "여기로" on the concert with `SHARED_QUEST_HELD`.
- "여기로" on the concert showed "이 행사에 함께 가는 파티가 이미 있어요".
- After "여기로" on the job fair, the 파티 tab read "내 파티 2" with the two parties, and the Quest list read "전체 4 · 파티 2" with "퀘스트 · 채용박람회".
- The Quest's own room could not be shown, since the mock's room does not know the Quests it made; `taken-alone-counts.integration.test.tsx` covers its missing "수정".
- The dev build's banner "Open debugger to view warnings" took the presses above it until it was closed. That also explains the presses noted in ticket 15's emulator check; it is not the app's.

### Agent usage (2026-11-16)

- Agent time: about 15 minutes in this session, an estimate from the transcript's timestamps (23:49 to 00:04). No subagent took part.
- Tokens: input 33.07M, of which 33.01M cache reads, 0.06M cache writes, and 96 uncached; output 0.04M.
