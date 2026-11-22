# 23: The invited card says whom it invited, to what, and when

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update only.

## What happens now

Once a Plan with Friends is made, the card says "파티를 만들고 초대를 보냈어요" and "답이 없어도 14:00에 가면 돼요", and the toast says the first line again (the feedback of 2026-11-22, item 7a). "파티" names what the User asked as a 점심 약속, and "답이 없어도" says what to do if nobody answers before saying who was asked. The Friend picker says "자리 모름" for a Friend whose position is not shared (item 7b), a word the main server's chips use for another fact.

## What to build

- **The card's first line** names the Friends and the kind of meeting: "민수에게 점심 초대를 보냈어요", "민수, 지우에게 저녁 초대를 보냈어요", "민수에게 약속 초대를 보냈어요". A meal's word is the one its Quest's title names, as the server writes it ("302동식당에서 점심"); anything else is 약속. The toast, said when the card is no longer on screen, says the same line.
- **The second line** says when and where, then what comes next: "모레(월) 14:00 학생회관식당 · 수락하면 알려 드려요"; today's has no day word ("12:15 302동식당 · 수락하면 알려 드려요"). A meal's place is its Restaurant as the title names it (a step's Place is the building, "제2공학관"); anything else's is the Place of its step at the start.
- The same card opened again from the everyday map says the same.
- A party posted with nobody invited keeps its words ("파티를 모집했어요").
- **The Friend picker** says "위치 모름" for a Friend whose position is not shared. The main server's chip ("<name> · 자리 모름") is P05's.

## Acceptance criteria

- [ ] After inviting 민수 to lunch, the card's lines are "민수에게 점심 초대를 보냈어요" and "12:15 302동식당 · 수락하면 알려 드려요", and the toast is the first. (Integration test.)
- [ ] A meeting's card says 약속; a dinner's 저녁; a meal's place is its Restaurant and a meeting's its step's; another day's line starts with its day word. (Unit test.)
- [ ] The card opened again from the everyday map says the same. (Integration test.)
- [ ] The picker's cell for a Friend with no position says 위치 모름. (Unit test.)
- [ ] A lunch invited on a phone with the mock build; the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments

### Agent usage (2026-11-22)

- Agent time: about 30 minutes in this session (an estimate from the transcript's timestamps, over 13:56–14:40, which it shared with ticket 22's last screens and pull request): the words test-first, the sweep of 19 test files, and the phone screens. No subagents.
- Tokens: about 65% of this session's use over that stretch, an estimate: output about 56k; input about 44.3M, of which about 44.2M cache reads, 97k cache writes, and about 170 uncached.
