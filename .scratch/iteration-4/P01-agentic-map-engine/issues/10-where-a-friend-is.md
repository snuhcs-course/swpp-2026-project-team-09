# 10: Where a Friend is

Parent: [P01 spec](../spec.md) ("The Assistant"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 06, and the Friend view on `4.0/Main` (pull request 239, P03 ticket 04)

## What to build

"민수 어디야?" is answered on the map with what the asker's map shows of Minsu, and nothing more (wireframe row 7, boards q5 to q7; design section 5, question 12; section 7). The Assistant neither asks Minsu nor tells him.

## Acceptance criteria

- [x] The tool reads the Friend only through the Friend view.
- [x] At exact location: Minsu at his position, tagged with the Place he is at or near ("민수 · 301동 앞"), the lines "**민수**는 지금 301동 앞에 있어요", and the basis "민수는 내게 정확한 위치를 보여 줘요".
- [x] At the building: Minsu at his Place, drawn as a building-level face ("민수 · 지금 302동"), the lines "**민수**는 지금 302동이에요" and, during a Class, "12:15까지 수업이에요".
- [x] At the Timetable only, during his Class or within 15 minutes after it: Minsu drawn dashed at the Class's Place ("민수 · 수업 중 12:15까지"), the lines "민수는 **12:15까지 302동 수업**이에요" / "지금 위치는 보여 주지 않아요", and the basis open with "민수는 내게 시간표만 보여요" and "민수에게 묻거나 알리지 않아요".
- [x] At the Timetable only, at any other time: nothing drawn for Minsu, and one line from his Timetable label ("공강 · 14:00까지", "첫 수업 13:00", "오늘 수업 끝", "오늘 수업 없음").
- [x] A test with the view answering "Timetable only" checks that the reply, the Lookup, and what the model is given hold no position and no Place beyond the Timetable's.
- [x] The answer chat no longer tells the User to look at the map when asked where a Friend is. An app without the capability is answered as today.
- [x] Unit tests for each level; integration tests at the endpoint.

## Decisions (2026-11-15)

1. **The tool** is `findFriend`. It takes the Friend's id from `resolveFriend` in this message, or the tapped Friend.
2. **The map scene's person** gains the source `building` beside `exact` and `timetable`: a face with a plain border at the building.
3. **The action** is "만나고 싶다" (`meet`) with the Friend's id. The screen it opens is package B's (row 6).
4. **"이동 중"** (on the move) on board q5 is left out: the server keeps one position, not the motion.
5. **The chips** are the Friend's name only. Board q5's "지금" chip states no condition the answer could change.

## Comments

### Decisions taken in the build (2026-11-15)

1. **What the map shows** is the view's level: `exact` with a position, `building` with a Place. A view at `exact` without a position, or at `building` without a Place, is answered as at the Timetable, which is all the map shows of the Friend then.
2. **The Friend's Timetable** is their Classes of the day (`UserDayService.itemsOn`, the Classes alone). Their Quests are no part of it, so the Places of their Sub Quests never reach the Lookup or the model.
3. **At the exact level** the tag and the line name the Place the position is in (the view's `placeId`), else "N동 앞" for the nearest Place within 150 m (`PlaceLookup.nearTo`, as ticket 06's start), else neither: "**민수**는 지금 여기 있어요", tagged with the name alone. At the exact level as at the building, a Class going on adds the line "12:15까지 수업이에요", from the Timetable every level shows.
4. **At the Timetable only, in the 15 minutes after a Class** (`RECENT_CLASS_MINUTES`, the end counted in), the Friend is drawn dashed at the Class's Place with "민수 · 12:15 302동 수업 끝" and the lines "민수는 **12:15에 302동 수업**이 끝났어요" / "지금 위치는 보여 주지 않아요". The criterion's "수업 중 12:15까지" would be untrue after 12:15; the words are those of the meal Plan's basis ("민수 12:15 302동 수업 끝").
5. **The Timetable's label**, by design section 7, since the app's adapters hold none of these words yet: in a Class, "수업 중 · 12:15까지" (reached only for a Class without a Place); no Class today, "오늘 수업 없음"; none later today, "오늘 수업 끝"; none ended yet, "첫 수업 13:00"; else "공강 · 14:00까지", until the next Class. The one line is "**민수** · 공강 · 14:00까지".
6. **What the model is given**: the name inside the delimiters (`friend.name`), what the Friend shows the User (`shows`), the Place the map draws them at or near (`place`), `classUntil`, `classEnded`, and the Timetable's label when the map draws nothing (`timetable`); no position and no Place id.
7. **The Lookup** draws the Friend alone, without the asker, a Place, a route, or a flag; it has no band, the chip is the name, and the action is `meet`.
8. **The id.** findFriend refuses an id that resolveFriend did not return in this message, unless it is the tapped Friend; an id that is not the asker's Friend in the view answers none.
9. **The rules.** `FRIEND_RULES` sends "X 어디야?" to resolveFriend and then findFriend, keeps the reply to one sentence of what findFriend returned, without showOnMap, and never offers to ask or tell the Friend. The chat's "You cannot see where anyone is. …" stays word for word in the chat of an app without `answer`, and is left out of the answer chat.
10. **The contract.** The scene's person gains the source `building` on both sides. The app's drawing (`answer-marks.ts`) dashes only a `timetable` face, so a building-level face is drawn plain without a change. The app's reply check accepts `building`, from a list the compiler holds to the source type, as #249 holds the roles.
11. **The code.** The words and the scene are `lookup/friend-lookup.ts` (`friendAnswer`), the reads `lookup/friend.service.ts` (`friendLookup` over the Friend view, the Friend's day, and the Places; `FriendLookupService`), and the tool with its rules `lookup/friend-tools.ts`. The words use `withCopula` ("302동이에요"), which #249 added to `answer-words.ts`.
12. **The app's copy** (`mobile/src/api/mock/data/friend-lookup.json`) was written by the server's `friendAnswer` for board q6 on Tuesday 2026-11-17 at 12:05: 민수 at the building level in 302동, during his Class until 12:15, with 민수's id of the meal copies. The app's reply check passes it; the mock answers no message with it.
13. **The building level at the endpoint.** Package C's stored levels (#257) start a new Friend at the building, so the endpoint's exact test sets both ends to `exact` (`shareAt`), and a test at `building` (board q6) checks the face, its tag, and its words end to end.

### Where the data differs from the boards

- Board q5: "이동 중" and the chip "지금" are left out (decisions 4 and 5 of 2026-11-15), so the lines are "**민수**는 지금 301동 앞에 있어요" alone. The pure test stands 민수 30 m south of 제1공학관's point; the endpoint test stands him at 학생회관's point, which its outline holds, so he is "63동".
- Boards q6 and q7 match the seed: 302동 is 제2공학관, and his Class 11:00–12:15 gives "12:15까지".

The tests were run on the build machine and pass: `friend-lookup.unit.test.ts` (15), `assistant-friend-reads.unit.test.ts` (3), the endpoint's `assistant-friend-lookup.integration.test.ts` (7), and the app's `way-lookups.unit.test.ts` (11), with lint, typecheck, and format of both projects.

### Agent usage (2026-11-15)

Tickets 09 and 10 together, one pull request: this session after #249 was opened (the ticket change, the merges, the review's fixes, the mock, and the pull request), the implementer subagent, and a review subagent of the diff.

- Agent time: about 1 hour 27 minutes, an estimate from the transcripts' timestamps (the union of active stretches, gaps over 5 minutes left out).
- Tokens: output 304,032; input 126,428,017, of which 125,479,365 were cache reads, 947,884 cache writes, and 768 uncached. Without cache reads: 1,252,684.
