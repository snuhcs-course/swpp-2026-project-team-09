# 18: Friends by full name, the department in a person's cell, and a Friend's profile card

Parent: [P02 spec](../spec.md) ("Correcting the answer"), canvas row 6 ("지도에서 묻기", boards a4, a10, a13)
Status: ready-for-agent
Blocked by: none (built on `4.0/Main`)

## What to build

Two Friends with the same given name, 김민수 (컴퓨터공학부) and 이민수 (경영학과), never read alike, and a User can always look at who a person is before choosing them. The rule is plain and the same on every screen: a person's name is written out in full, a cell in which a person is chosen shows the department under the name, and one profile card says who the person is.

## Acceptance criteria

- [x] **Full names.** Wherever a Friend's name is written out, it is the full name: the "＋ 같이" cells, the tags beside faces on the map, the person chips of an answer (also on the mock build, whose stored chips say "민수" where the main server says "김민수"), and what a screen reader says. `givenName()` stays only where two letters are all that fit: the letters in a face, and the time band's 40 pt lane.
- [x] **The department in a person's cell.** In the "＋ 같이" grid each cell shows the full name with the department under it in small muted text; the distance stays at the right; the cells stay equal in width and the rows whole (ticket 03's limits). The design system's `ChoiceGrid` takes this as an option of a choice, so that another list of people (package C's "which Friend" question, P02-17) draws the same cells.
- [x] **A trailing mark that opens the profile.** A person's cell in a `ChoiceGrid` may carry a small mark at its trailing end, an option of the grid, which opens that person's profile card without choosing them; a press anywhere else in the cell chooses at once, as today. Its touch target is at least 44 points, and a screen reader hears it as its own button ("김민수 프로필").
- [x] **The profile card** says who the person is: the full name; the department; what the User may see of where they are and until when, by the Friend's level (row 6's three cards: the building they are in now with the class and until when, a4; the exact position, a13; the Timetable only, "시간표로는 12:50까지 43-1동", a10); the Friend ID; and since when they have been Friends. The Friend ID and the date are optional fields of the Friend until the main server sends them; a line whose field is missing is left out. No student number and no admission year.
- [x] **Ways in.** The same card opens from a press on a Friend's face on the everyday map (the existing Friend card, extended to this), from a press on a person chip of an answer (the chip's ✕ still removes), and from a cell's trailing mark in the "＋ 같이" grid. Inside the answer frame, closing the card returns to the answer as it was.
- [x] Someone who is not a Friend keeps today's card ("친구 아님") and has no trailing mark.
- [x] With the switch off, the everyday map's Friend card is extended the same way; nothing else changes.
- [x] Tests: unit tests of the cells (the department line, the trailing mark and its press without choosing) and of the card's lines at each level and with the optional fields missing; at the main screen over the fake main server, each way in, and the chip's ✕ still removing.
- [x] The screen is run on an Android emulator, and the pull request carries its screens.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass; and no native file of the app changed.

## Comments

From the decision of 2026-11-15 on Friends with the same name (the user: "바로 만들어"): a label that changes only on a clash was turned down for a plain rule and a real way to look at a person. Background: `same-name-friends/README.md` in the sessions' notes. The main server's side (the Friend ID and the friendship's date on the Friend list and the Friend view) is package C's; the question "민수가 두 명이에요" is package A's guard (P01-16) drawn by package C (P02-17).

### Decisions (2026-11-15)

1. One card. The profile is the everyday map's Friend card (`screens/main/card.tsx`, `Card`): any card whose id is a Friend's finds that Friend's profile itself (`useFriendProfile`, `features/friends/use-friend-profile.ts`) and adds its rows, so the everyday map's caller is unchanged. Its head stays as it was: the Avatar, the department as the sub-label, the full name as the title.
2. The card shows only what the app really has for that Friend: the full name, the department, what the User sees of them, and the status and way lines the everyday card already shows (the Friend's status, or "마지막 위치 N분 전", and "도보 N분"), then the Friend ID and the date where the main server sends them. A Friend without a position on the map has no status line. The app computes no "수업 중 · 12:15까지" or "걸어서 3분", and takes nothing from the mock on a server build: row 6's full lines (a4, a13, a10) come from the server through the tap endpoint planned in row 6's seams (ticket 22's Friend half), which fills the same card later.
3. What the User sees is `seen` of GET /friends, the lower of the two ends, carried on the app's `FriendView` beside `level`, in row 6's words: "시간표만 보여요", "지금 있는 건물까지 보여요", "정확한 위치까지 보여요". It is the first row under the head, a row 44 high with a lock before it and a chevron after it, which opens 위치 공유 (`/me/location-sharing`); a screen reader hears it as the button "어디까지 보이나" with the words as its value. A third button in the card's row did not fit beside "가까이 보기" and "파티 만들기".
4. The card's buttons stay the existing ones: "파티 만들기", and "가까이 보기" where the everyday map offers it. Row 6's "만나고 싶다" needs the engine and is a later ticket.
5. "친구 ID 7KX2M9QD" (user icon) and "10월 3일부터 친구" (calendar icon), by Korea's calendar, with no year: every friendship began in 2026. Each line is left out while its field is missing. `friendId` and `friendsSince` are optional on `Friend` and on `FriendView`, as package C sends them.
6. Inside the answer frame the card stands over the answer's card, where the everyday card stands over the map, and the answer's card stays mounted under it: its ✕ and Android's back button close the profile alone, and the answer, the open list of Friends, its scroll, and the Plan on screen are as they were. Opening it sends nothing and moves no camera. It has no "가까이 보기", and gives way while the keyboard is up.
7. The way to open it, for package C's cells: `useOpenFriendProfile()` in `screens/main/friend-profile.tsx` gives `(userId) => void` inside the answer frame and null outside it. A user id that is none of the User's Friends opens nothing.
8. A person chip's name is a button "김민수 프로필" for a Friend; the ✕ beside it still takes the person out. Someone who is not a Friend keeps a chip that takes no press but its ✕. The profile opens also while a recalculation is on its way: it changes nothing.
9. `ChoiceGrid` cells: `sub` is a second line in the caption's size and the muted ink under the name; beside it the value keeps its width and the names give way. The cell stays 44 high (20 + 16 of text fit), so the grid's row arithmetic is unchanged. `more` is a 44 × 44 button at the cell's end with the design system's info icon, read as its `label`; it takes a press while the grid takes none. A cell with a mark draws its frame over its body and the mark.
10. In the "＋ 같이" grid each cell is the full name, the department under it (none for an empty department), the distance at the right, and the profile mark; a screen reader hears "김민준, 컴퓨터공학부, 1.2km, 추가". Ties in distance go by the full name.
11. The words under a face from the "names" level of detail are the full name while the switch is on, on the everyday map and on the answer's "+" faces, which are the everyday Avatars; with the switch off they stay the given name. The letters in every face are the everyday Avatar's, "민준" for "김민준", on the answer's own faces too (decision 15); the time band's lanes are unchanged.
12. The mock's stored answer (`api/mock/data/meal-answer.ts`) says its person chip as the main server writes it, "김민수", with a comment; its scene, lines, and basis stay as copied. The four JSON copies keep "민수" and "지은": a JSON file takes no comment, and no full name of 지은 is known. The existing tests that read that chip or the cells by name now read the full names.
13. Android's back button inside the answer frame has one handler, the frame's (`Framed`, `answer/answer-frame.tsx`), which listens only while the main screen is in front: while a profile is shown it hides the profile, otherwise it forgets the conversation. The profile registers none of its own, so a screen pushed from it (위치 공유, 파티 만들기) goes back with one press to the profile over the answer, by the back button or by the screen's own arrow, and the next press hides the profile alone.
14. The profile belongs to the reply it was opened over, told by that reply's bubble (`lastReply`, `features/assistant/use-shown-answer.ts`): a new reply hides it, with an answer or without one, also one that brings the same answer again. A failure, a follow-up on its way, and a recalculation keep it; while the keyboard is up it only gives way. The state is `useProfileOver` in `screens/main/friend-profile.tsx`, held by the frame.
15. An answer's own faces show the everyday Avatar's letters (`initials`, the design system's `avatar.tsx`): the last two syllables of a Korean name, "민수" for "김민수", and the first letters of the words of another. A face's tag leaves the name out only where those letters are the whole name, so the tag "Li · 18분" stays whole beside a face that shows "L".
16. The mock's twelve Friends carry the Friend IDs the mock already gave them (`FRIEND_IDS`, eight characters each of the main server's alphabet, all different) and a `friendsSince` the mock invents, from 3 October to 9 November 2026 with Korea's offset, 김민준's on 3 October; so the profile shows its two lines on the mock build. A Friend the mock befriends while it runs has neither.

### Checked on an emulator (2026-11-15)

On the Android emulator (1080 × 2400, density 2.625), a development build answering from the stored copies of real replies and the mock's Friends, with the switch on:

- The "＋ 같이" grid: each cell the full name with the department under it, the distance at the right, and the ⓘ mark; a screen reader reads "윤태오, 물리천문학부, 680m, 추가" and "윤태오 프로필".
- A press on 유나's face on the everyday map: "디자인학부 / 최유나", "정확한 위치까지 보여요 ›", today's status and walking lines, "친구 ID CY6N9TUD", "10월 12일부터 친구", "가까이 보기" and "파티 만들기".
- A cell's ⓘ in the answer: the same card over the answer card; "어디까지 보이나" opened 위치 공유; Android's back returned to the profile over the answer, and a second back closed the profile alone, the answer and its open list as they were.
- The plan's person chip reads "김민수 ✕".

Fixed after the review and checked again here: Android's back after a screen pushed from the profile (decision 13). Not seen on the mock build: a chip's profile for 김민수, who is not one of the mock's Friends, and the faces' letters on a server build (the tests cover both).

### Agent usage (2026-11-15)

One session with three subagents for this ticket (the implementation, a review of the spec and the standards, and the review's fixes), plus the row-6 planning it was cut from; the session's own time counted is the screens and the pull request.

- Agent time: about 75 minutes, an estimate from the transcripts' timestamps (the union of the main session's and the subagents' active stretches, gaps of five minutes or more left out).
- Tokens: output 344,600; input 112,756,605, of which 111,795,243 were cache reads, 960,604 cache writes, and 758 uncached. Without cache reads: 1,305,962.
