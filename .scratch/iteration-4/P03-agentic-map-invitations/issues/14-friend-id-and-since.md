# 14: A Friend carries their Friend ID and since when, for the profile card

Parent: [spec](../spec.md); the user's decision on Friends with the same name (2026-11-15)
Status: ready-for-agent
Blocked by: nothing (starts from `4.0/Main`)

## What to build

Two Friends with the same name are told apart by a small profile card that package B builds: full name, department, where they are at the level the viewer sees, Friend ID, and since when they are Friends. Names stay full names everywhere; nothing computes a label.

Each Friend of `GET /friends` and of the Friend view gains:

- `friendId`: the Friend's Friend ID, the code a User shares to be added (`users.friend_id`);
- `friendsSince`: when the friendship was accepted, as an ISO time with the Korea offset, as other times the server sends.
- In the app, the live connection passes a `position` signal's `level` and `placeId` on, beside `userId`, `latitude`, `longitude` and `measuredAt`, for package B's green dot (its ticket 20); the server already sends both (P03-11).

No student number and no admission year.

## Acceptance criteria

- [x] `GET /friends` gives `friendId` and `friendsSince` for each Friend.
- [x] The Friend view gives the same two for each `FriendView`, read in the query it already makes.
- [x] Nothing else of the Friend is added; no migration.
- [x] Integration tests: both fields for a new friendship, the same from both ends' view of the date, and a pending request has neither (it is not listed).
- [x] The app's live connection passes `level` and `placeId` on, for package B's green dot (its ticket 20).
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass.

## Comments

- The label of an earlier draft (a name that changed only when two Friends clashed) was rejected by the user; this replaces it.

### Decisions (2026-11-15)

- `friendsSince` is formatted by `koreaTime` (`src/assistant/korea-time.ts`), as the plans and notifications are: to the second, with `+09:00`.
- A pending request is covered by the existing test that `GET /friends` leaves out the Users a Friend Request waits for. The new test also bounds `friendsSince` by the moment the request was accepted.
- `main-server/README.md` documents the two fields under `GET /friends`.
- The app's `Position` already had `level?: 'building' | 'exact'` and `placeId?: string`, so its type is unchanged. The live connection's check accepts only those two levels, because the server never sends a position at `timetable` (its `SeenLevel`). A `timetable` level therefore fails the check like any other bad level.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5), resumed once for the live connection. The rejected earlier draft (#277, a label per Friend) took a further subagent: about 19 minutes; output 73,442; without cache reads 255,625. This session's review and the pull request are counted under ticket 07.

- Agent time: about 33 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 57,811; input 12,912,981, of which 12,747,922 were cache reads, 164,881 cache writes, and 178 uncached. Without cache reads: 222,870.
