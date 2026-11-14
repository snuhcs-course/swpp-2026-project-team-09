# 12: Asking once, at the two moments

Parent: [P03 spec](../spec.md) ("Asking once")
Status: ready-for-agent
Blocked by: 11

## What to build

The app asks once at the two moments the design names, and the server remembers that it asked: when a User is about to turn location off for a Friend or with the Master Switch, and when a User's first Plan with a Friend becomes a Quest. This is wireframe row "9. 친구와 위치", boards 4 to 7.

## Acceptance criteria

- [ ] The same migration as ticket 11 (or the next, at this package's turn) keeps `off_asked_at` and `plan_asked_at` on each end of a friendship and `users.master_off_asked_at`.
- [ ] `GET /friends` gives `askedOff` and `askedPlan`, and the Lobby `masterOffAsked`. `POST /friends/asked` with `{ userIds, moment }` records the moment for those Friends; turning the Master Switch off records its own.
- [ ] `PUT /users/me/friend-levels` with `{ level: 'building' }` lowers every Friend above it.
- [ ] The reply of `POST /plans` names the Friends of the Plan not yet asked about, with their current level (`askLevels`).
- [ ] The app: setting a Friend's level to "시간표만" from above asks once ("민수에게는 지금 있는 건물만 보여 줄 수도 있어요. …", "위치 끄기", "건물까지만", "취소", and "시간표는 계속 보여요"); turning the Master Switch off asks once with its own words; after a Plan becomes a Quest the app asks once about the named Friends, each name removable, with "넘기면 지금처럼 둬요. 친구에게 알림은 가지 않아요". The words are the design's section 7.
- [ ] Nothing about a question reaches the other User.
- [ ] Integration tests of each route and of `askLevels`; the app's integration tests of the three questions, each asked once.

## Comments
