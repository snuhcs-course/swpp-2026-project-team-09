# 14: One label per Friend, from the server, so that two Friends never read the same

Parent: [spec](../spec.md); the proposal on Friends with the same name ("동명이인"), ticket 2 of its table
Status: ready-for-agent
Blocked by: nothing (starts from `4.0/Main`)

## What to build

Today the app drops the family name of a three-syllable Korean name, so 김민수 and 이민수 both read "민수" in the "＋ 같이" cells and on the face tags, while the server's chips say the full name. Nothing tells two Friends apart by rule.

The server works out one label for each of the viewer's accepted Friends, unique among all of them (the set `GET /friends` lists), so that a Friend reads the same on every screen. The label stays short, and the details sit beside it:

1. **Given name** when no other Friend has the same given name ("민수"). The given name of exactly three Hangul syllables drops the first; any other name stays whole.
2. **Full name** when no other Friend has the same full name ("김민수", "이민수").
3. **The department beside the full name** when no other Friend with the same full name has the same department ("김민수" beside "경영학과").
4. **Since when they are Friends beside the full name**, in Korea time: "김민수" beside "10월 3일부터 친구"; with the time when two such friendships began on the same day ("10월 3일 14:05부터 친구").
5. **Final check**: labels whose name and side text both still read the same move one step down together; two that began in the same minute stay equal (a press goes by id).

Comparisons ignore spaces and case. The viewer is never compared, and someone who is not the viewer's Friend gets no label.

A label has three parts: `text` and `name`, which are the same (the given name, or the full name; never a department or a date), and `aside` (`null` while the full name is unique, otherwise the department, or "10월 3일부터 친구" when the department is shared too). Two Friends of one full name share `text` and differ by `aside`. It goes out as `label` on each Friend of `GET /friends` and of the Friend view.

## Acceptance criteria

- [x] `main-server/src/friends/friend-label.ts`: a pure function from the viewer's Friends (name, department, acceptedAt) to each one's label, with a table-driven unit test of every step and the hard cases: same full name with different departments, same full name and department (same day and different days), two-syllable names (김수 beside 박김수), four-syllable names (남궁민수 beside 김민수), a non-Korean name, spaces and case, and the final check.
- [x] `GET /friends` gives `label` on each Friend; the Friend view (`friend-view.service.ts`) gives the same label on each `FriendView`, computed over the same set.
- [x] No migration; no other text changes in this ticket.
- [x] Integration tests: two Friends named 김민수 and 이민수 read their full names in both, and a third Friend's arrival changes the labels on the next fetch.
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass.

## Comments

- The proposal (`same-name-friends/README.md` in the shared notes) was written by agents: each line is checked against the code before it is followed.
- After this ticket: the app shows the label (package B, after its stack), answers name people by label, and the received invitation card and 알림 use the viewer's labels while push keeps the full name (ticket 5 of the proposal, package C).
- The shape of the question "민수가 두 명이에요" and its one-press offers is settled with package A in `same-name-friends/seam.md`.

### Decisions (2026-11-15)

- **Details beside the name, not in it.** The user prefers details hidden until asked for, so `text` and `name` are the same short name (given or full) and the department or the date goes only into `aside`. The steps that find a clash are unchanged; only where their result goes changed. The wording is confirmed after the user sees pictures. This replaces the proposal's labels such as "경영학과 김민수" and "10월 3일부터 친구인 김민수".
- **The steps as five levels.** Given name, full name, department, day, and minute; a Friend starts at the first level whose words no other Friend shares (the minute when even the day is shared). The final check compares `text` and `aside` together, moves every label that still reads like another one level down, and repeats until none moves; at the minute level labels stay as they are. It matters, for example, for two pairs of 김민수 in two departments whose friendships began on the same day: both pairs read "10월 3일부터 친구" until the check adds the time.
- **Comparisons** remove spaces and ignore case, as the resolver's `bare` does. The given name is the app's `givenName` rule (the trimmed name of exactly three Hangul syllables drops the first), so a name written with a space inside, such as "김 민수", keeps its whole name as its given name.
- **Korea time** comes from `assistant/korea-time.ts`, which `plans/` and `notifications/` already use.
- **One computation for both.** `listFriends` works the labels out over the rows it already loads (each row holds `acceptedAt`, and the Friend's department), and the Friend view takes `label` from `listFriends`, so it loads nothing more and gives the same label.
- **Not in this ticket**: the resolver candidate's `label`, which the proposal's ticket 2 lists, is left to package A with the rest of `resolve-friend.ts`.
- **The proposal's claims** in "The rule", "Hard cases", and its ticket 2 row were checked against `4c1bb2f7`: every cited file and line holds (`friends.service.ts:208-225`, `schema.prisma:117`, `resolve-friend.ts:23-25, 36`, `short-name.ts:76-79`, `friends.dto.ts:57-82`, `friend-view.dto.ts:11-20`, `friend-view.service.ts:32-41`, `answer-words.ts:57-68`, `update-profile.dto.ts:15-18, 37-39`, `assistant-resolvers.integration.test.ts:36-38`). Only its label texts with a department or a date are superseded by the first decision above.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5). This session's review and the pull request are counted under ticket 07.

- Agent time: about 19 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 73,442; input 8,890,209, of which 8,708,026 were cache reads, 182,069 cache writes, and 114 uncached. Without cache reads: 255,625.
