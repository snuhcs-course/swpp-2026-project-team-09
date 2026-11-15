# 14: A Friend carries their Friend ID and since when, for the profile card

Parent: [spec](../spec.md); the user's decision on Friends with the same name (2026-11-15)
Status: ready-for-agent
Blocked by: nothing (starts from `4.0/Main`)

## What to build

Two Friends with the same name are told apart by a small profile card that package B builds: full name, department, where they are at the level the viewer sees, Friend ID, and since when they are Friends. Names stay full names everywhere; nothing computes a label.

Each Friend of `GET /friends` and of the Friend view gains:

- `friendId`: the Friend's Friend ID, the code a User shares to be added (`users.friend_id`);
- `friendsSince`: when the friendship was accepted, as an ISO time with the Korea offset, as other times the server sends.

No student number and no admission year.

## Acceptance criteria

- [x] `GET /friends` gives `friendId` and `friendsSince` for each Friend.
- [x] The Friend view gives the same two for each `FriendView`, read in the query it already makes.
- [x] Nothing else of the Friend is added; no migration.
- [x] Integration tests: both fields for a new friendship, the same from both ends' view of the date, and a pending request has neither (it is not listed).
- [x] Each changed source file has its AI-generated row; lint, format, and type checks pass.

## Comments

- The label of an earlier draft (a name that changed only when two Friends clashed) was rejected by the user; this replaces it.

### Decisions (2026-11-15)

- `friendsSince` is formatted by `koreaTime` (`src/assistant/korea-time.ts`), as the plans and notifications are: to the second, with `+09:00`.
- A pending request is covered by the existing test that `GET /friends` leaves out the Users a Friend Request waits for. The new test also bounds `friendsSince` by the moment the request was accepted.
- `main-server/README.md` documents the two fields under `GET /friends`.
