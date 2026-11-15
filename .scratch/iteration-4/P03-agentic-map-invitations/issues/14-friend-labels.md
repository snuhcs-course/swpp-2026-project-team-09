# 14: One label per Friend, from the server, so that two Friends never read the same

Parent: [spec](../spec.md); the proposal on Friends with the same name ("동명이인"), ticket 2 of its table
Status: ready-for-agent
Blocked by: nothing (starts from `4.0/Main`)

## What to build

Today the app drops the family name of a three-syllable Korean name, so 김민수 and 이민수 both read "민수" in the "＋ 같이" cells and on the face tags, while the server's chips say the full name. Nothing tells two Friends apart by rule.

The server works out one label for each of the viewer's accepted Friends, unique among all of them (the set `GET /friends` lists), so that a Friend reads the same on every screen:

1. **Given name** when no other Friend has the same given name ("민수"). The given name of exactly three Hangul syllables drops the first; any other name stays whole.
2. **Full name** when no other Friend has the same full name ("김민수", "이민수").
3. **Department, then the full name** when no other Friend with the same full name has the same department ("경영학과 김민수").
4. **Since when they are Friends**, in Korea time: "10월 3일부터 친구인 김민수"; with the time when two such friendships began on the same day ("10월 3일 14:05부터 친구인 김민수").
5. **Final check**: labels that still read the same move one step down together; two that began in the same minute stay equal (a press goes by id).

Comparisons ignore spaces and case. The viewer is never compared, and someone who is not the viewer's Friend gets no label.

A label has three parts: `text` (the whole label, for chips, lines, tags, the screen reader, and the model), `name` (the given or full name, for a lane or the left of a cell), and `aside` (`null`, the department, or "10월 3일부터 친구", for the right of a cell). It goes out as `label` on each Friend of `GET /friends` and of the Friend view.

## Acceptance criteria

- [ ] `main-server/src/friends/friend-label.ts`: a pure function from the viewer's Friends (name, department, acceptedAt) to each one's label, with a table-driven unit test of every step and the hard cases: same full name with different departments, same full name and department (same day and different days), two-syllable names (김수 beside 박김수), four-syllable names (남궁민수 beside 김민수), a non-Korean name, spaces and case, and the final check.
- [ ] `GET /friends` gives `label` on each Friend; the Friend view (`friend-view.service.ts`) gives the same label on each `FriendView`, computed over the same set.
- [ ] No migration; no other text changes in this ticket.
- [ ] Integration tests: two Friends named 김민수 and 이민수 read their full names in both, and a third Friend's arrival changes the labels on the next fetch.
- [ ] Each changed source file has its AI-generated row; lint, format, and type checks pass.

## Comments

- The proposal (`same-name-friends/README.md` in the shared notes) was written by agents: each line is checked against the code before it is followed.
- After this ticket: the app shows the label (package B, after its stack), answers name people by label, and the received invitation card and 알림 use the viewer's labels while push keeps the full name (ticket 5 of the proposal, package C).
- The shape of the question "민수가 두 명이에요" and its one-press offers is settled with package A in `same-name-friends/seam.md`.
