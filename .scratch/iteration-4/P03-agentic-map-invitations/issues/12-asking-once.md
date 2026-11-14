# 12: Asking once, at the two moments

Parent: [P03 spec](../spec.md) ("Asking once")
Status: ready-for-agent
Blocked by: 11

## What to build

The app asks once at the two moments the design names, and the server remembers that it asked: when a User is about to turn location off for a Friend or with the Master Switch, and when a User's first Plan with a Friend becomes a Quest. This is wireframe row "9. 친구와 위치", boards 4 to 7.

## Acceptance criteria

- [ ] The same migration as ticket 11 (or the next, at this package's turn) keeps `off_asked_at` and `plan_asked_at` on each end of a friendship and `users.master_off_asked_at`.
- [x] `GET /friends` gives `askedOff` and `askedPlan`, and the Lobby `masterOffAsked`. `POST /friends/asked` with `{ userIds, moment }` records the moment for those Friends; turning the Master Switch off records its own.
- [x] `PUT /users/me/friend-levels` with `{ level: 'building' }` lowers every Friend above it.
- [x] The reply of `POST /plans` names the Friends of the Plan not yet asked about, with their current level (`askLevels`).
- [x] The app: setting a Friend's level to "시간표만" from above asks once ("민수에게는 지금 있는 건물만 보여 줄 수도 있어요. …", "위치 끄기", "건물까지만", "취소", and "시간표는 계속 보여요"); turning the Master Switch off asks once with its own words; after a Plan becomes a Quest the app asks once about the named Friends, each name removable, with "넘기면 지금처럼 둬요. 친구에게 알림은 가지 않아요". The words are the design's section 7.
- [x] Nothing about a question reaches the other User.
- [x] Integration tests of each route and of `askLevels`; the app's integration tests of the three questions, each asked once.

## Comments

- The migration, `20261115053528_add_friend_asks`, is provisional, as ticket 11's is: it comes after ticket 11's and is made again from the iteration branch's schema at this package's turn. The first box stays open until then.
- Tests: `main-server/test/friend-asks.integration.test.ts` (each route, its refusals, the lowering with what each Friend is told, and no signal to the other User), `main-server/test/plan-ask-levels.integration.test.ts` (`askLevels`, the moments it leaves out, and nothing of it in the invitees' signals), `mobile/__tests__/location-off-question.integration.test.tsx` (the Friend's and the Master Switch's question, each answer's requests, asked once), and `mobile/__tests__/plan-levels-question.integration.test.tsx` (the question after a Plan, a removed name, a skip, mixed levels, and nobody named).
- `test/friends.integration.test.ts` and `test/friend-answers.integration.test.ts` compared `GET /friends` without `level` and failed on ticket 11's branch; they now compare the whole new shape.

### Decisions (2026-11-15)

- The Master Switch's question is recorded by a route of its own, `POST /users/me/master-switch/asked`, not by `asked: true` on the switch's body: "건물까지만" and "취소" leave the switch on, so the switch's route is not sent for them. The switch's body stays `{ on }`.
- The asking routes are in `FriendAsksController` and `FriendAsksService` (`src/friends/`), since `FriendsService` is at the 300-line limit; `PlansModule` imports `FriendsModule` for `askLevels`.
- `POST /friends/asked` takes 1 to 8 User ids, as many as a Plan has people, and refuses the whole body with 404 `FRIEND_NOT_FOUND` when one is no Friend. Each moment keeps the first time it was recorded, so a repeat changes nothing; `POST /users/me/master-switch/asked` likewise.
- `PUT /users/me/friend-levels` takes any level and lowers each accepted friendship above it at the User's end, inside `announceRemovals` as a change of one level is: a Friend who saw the position gets the Place.
- `askLevels` names the invited Friends in the Plan's order with the User's own end as `level`, which is what the question's cells set. A repeat of `POST /plans` with the same Idempotency-Key answers the first reply.
- Every answer is recorded, "취소", "넘기기", and closing a sheet included, so each question is asked once; a record that fails is ignored and the question comes again later. The Master Switch's is also kept in the Lobby's cache at once.
- The words are section 7's; the wireframe row 9 (boards 4, 5, 7, 7-2, 6, 6-1, 6-2, 6-3) adds the line under each title (for the Master Switch "어느 쪽을 골라도 친구에게는 아무 표시도 가지 않아요."), the kicker "내 파티에 처음 들어왔어요", "넘기기", and the toast after an answer that changes something ("껐어요 · {이름}에게 알림은 가지 않아요", "{이름}에게 지금 있는 건물까지만 보여요", "껐어요 · 친구에게 알림은 가지 않아요", "모든 친구에게 지금 있는 건물까지만 보여요", "{이름들}에게 지금 있는 건물까지 보여요").
- The plan question's line reads the Friends left: "지금은 둘에게 시간표만 보여요." (둘 to 일곱; "지금은 시간표만 보여요." for one) when they are at one level, which is then chosen, and "지금은 민수에게 시간표만, 지은에게 정확한 위치까지 보여요." with none chosen when they differ. " 뺀 친구는 그대로 둬요." follows while the reply named more than one; the wireframe's "지은은 그대로 둬요." after a removal is not used.
- A removed Friend keeps their level but is recorded as asked; removing the last name is a skip; choosing the level the Friends are at records the question and changes nothing.
- The off question's three answers are one row of three cells of one width, "위치 끄기" first. The plan question's levels use the Friends screen's track, now `src/screens/friends/level-track.tsx`; "넘기기" is a full-width ghost button.
- `apiClient.makePlanQuest` tells `src/api/plan-asks.ts` what a reply names, and `PlanLevelsQuestion` listens in the overlay host beside `PushAskHost`, so package B's screen is unchanged.
- The mock's stored reply of `POST /plans` names 민수 at the building in `askLevels`. 민수 is no Friend of the mock's, so a level chosen there is refused in a mock build with "위치 공유를 바꾸지 못했어요".
- `signalsWhile` takes null for every signal name, so that a test reads every signal that reached its own Users.

### Review (2026-11-15)

- The names in the plan question are cells of one width, two to a row, each with the name, what the Friend sees now, and an ×, in place of chips that wrapped at the width of each name.
- `schema.prisma`'s `sessions` line is aligned with the fields around it again.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5). The session's own review and the pull request are counted under ticket 07.

- Agent time: about 44 minutes, an estimate from the transcript's timestamps; it includes waits for the Mac's shared check slots.
- Tokens: output 205,619; input 86,244,407, of which 85,743,968 were cache reads, 499,927 cache writes, and 512 uncached. Without cache reads: 706,058.
