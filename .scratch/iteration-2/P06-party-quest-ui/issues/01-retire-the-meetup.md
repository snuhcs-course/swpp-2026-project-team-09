# 01: Retire the Meetup; a plan with a Friend is a 비공개 파티

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User who wants to plan something with a Friend uses the same form as for any 파티. `파티 만들기` on a Friend's card on the map and `{name}님과 파티 만들기` in a Friend's panel open the form preset to 비공개, with that Friend already invited. Making it posts a Closed Quest and invites the Friend, who answers it in `초대` like every other invitation.

The Meetup is retired in the app and on the server. Its code is **deleted**, and the spec records the last commit that holds it, `2f4f201` on `2.0/Main`, so that it can be brought back with git. The Prisma model, the enum and the table stay, no migration is added, and the rows already stored stay unread. A Meetup accepted before is a Closed Quest and keeps showing as a 비공개 파티.

The frames are `PartyAppt` (the form in 비공개 mode with the Friend invited) and, in `Main`, the Friend's card and panel.

## Every file that names the Meetup

Found with `git grep -il meetup` on `2.0/Main` (migrations, generated code and `.scratch/` left out). Each is deleted, edited, or kept as it is.

### Deleted

- Server: `src/meetups/` (module, controller, service, DTO); `test/meetups.e2e-spec.ts`, `test/meetup-answers.e2e-spec.ts`, `test/meetup-quests.e2e-spec.ts`, `test/meetups.ts`.
- App: the route `app/(signed-in)/meetup/[friendId].tsx`; `screens/meetup/` (the form screen, its fields, `open-meetup-form.ts`); `screens/party/invites-meetups.tsx`; `features/meetups/`; `api/server/meetup-client.ts`; `api/mock/meetups.ts`.
- App tests: `meetup-form-test`, `meetups-invites-test`, `meetups-proposing-test`, `support/meetups.ts`.

### Edited (the Meetup parts go, the rest stays)

- Server
  - `src/app.module.ts`: `MeetupsModule`.
  - `src/friends/friends.service.ts`: withdrawing proposed Meetups and sending `meetups-changed` when a friendship ends.
  - `src/demo/demo-data.ts` and `src/demo/demo.seed.ts`: the demo Meetup (`DEMO_ACCOUNT_SHARE.meetup`, the `prisma.meetup` upsert, the `meetups-changed` signal it sends); `.env.example`'s comment on it.
  - `test/admin-friendship-ending.e2e-spec.ts`: the Meetup case. `test/demo-seed.e2e-spec.ts`: the `GET /meetups` call, the `prisma.meetup` count, and the test titles and expectations that name the Meetup.
  - `src/quests/quests.service.ts` and `src/quests/clock.ts`: only comments name the Meetup; they are reworded. `createWithSubQuest`, `SubQuestColumns` and `CLOCK` live in `src/quests/` and stay.
- Flow tests: `test/friend.flow.ts` drops its Meetup step and `test/answers.ts` its Meetup answer; `flow-tests/README.md` says so.
- Admin: the friendship-ending confirm text in `src/app/(signed-in)/users/[id]/friendships.tsx` and `admin/README.md` no longer say that proposed Meetups are withdrawn.
- App
  - `api/client.ts`, `api/queries.ts`, `api/server/client.ts`, `api/server/waiting-answers.ts`, `api/waiting-types.ts`, `api/mock/client.ts`, `api/mock/data/waiting.ts` (`MEETUPS`): the Meetup operations, query, answers and data.
  - `api/mock/room.ts` and `api/mock/data/quests.ts`: the former Meetup's Shared Quest moves into the Quest mock data, so that its room still opens.
  - `app/(signed-in)/_layout.tsx`: the route.
  - `features/map/adapter.ts`, `screens/main/main-screen.tsx`, `screens/main/friend-panel.tsx`: the action `meetup` becomes an action that opens the form as 비공개 with the Friend (for example `private-party`).
  - `screens/party/invites-tab.tsx`, `features/party/use-party.ts`: 초대 and its count hold Quest invitations only.
  - `features/notifications/adapter.ts`, `features/notifications/use-notices.ts`, `screens/me/notifications-screen.tsx`: the Meetup rows of 알림.
  - `live/live-updates.tsx`: the key `meetups-changed`.
  - `features/quests/adapter.ts`: a comment only.
  - `api/room-types.ts`: `MeetupPlace`, the base of `SubQuestPlace`, is renamed (for example `PlaceChoice`) and kept.
  - `screens/places/place-picker.tsx`: stays for the timetable's class form; its mode used only by the Meetup form goes.
- App tests: `support/app.tsx` (the route), `support/mocks.ts` (`resetMockMeetups`), `support/server.ts` (`Meetups`, `GET /meetups`, `MEETUPS`), and the Meetup parts of `main-test`, `notifications-test`, `live-test`, `mock-me-test`, `server-me-test` and `features/screen-data-test` (the action `meetup`).
- Documents: root `README.md`, `mobile/README.md`, `main-server/README.md` (the `## Meetup` section and its other mentions), `socket-server/README.md` (the signal `meetups-changed`): the Meetup is removed or marked retired in Iteration 2.

### Kept as they are

- `main-server/prisma/schema.prisma` and the migrations: the model, the enum and the table stay.
- `GLOSSARY.md` (marks the Meetup retired) and `docs/adr/0002-…` (a record of its time).

## Acceptance criteria

### App

- [x] `파티 만들기` on a Friend's card opens the form as 비공개 with that Friend selected under `친구 초대`.
- [x] The Friend panel's `{name}님과 파티 만들기` does the same.
- [x] Making it creates a Closed Quest and invites the Friend, as the form does today; the toast is `비공개 파티를 만들었어요 · 1명에게 초대 요청`.
- [x] Every app file above is deleted or edited as listed; `git grep -il meetup` in `mobile/` finds nothing but comments that say the Meetup was retired.
- [x] The count of `초대` counts Quest invitations only.
- [x] Jest: both entries open the form preset to 비공개 with the Friend; making it invites the Friend; `초대` and 알림 show no Meetup; the mock build still opens the former Meetup's room.

### Server

- [x] Every server, flow-test, admin and document file above is deleted or edited as listed; no Prisma change and no migration.
- [ ] Lint, type checks, the server's unit and e2e suites (`demo-seed` included), the app's Jest suite, the admin build and `flow-tests` pass.
- [ ] 윤유상 reviews the server part.

### PR

- [x] The PR body names `2f4f201` as the commit to restore from.
- [ ] Screenshots of the form opened from the Friend's card, under Test Results.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 1 h 20 min of active work by one subagent in its own worktree, plus about 10 min in the main session for the PR. It is an estimate: the run lasted about 2 h 10 min from start to finish, with a session crash and restart in it. Most of the rest was spent waiting on Jest runs slowed by other agents' runs on the same machine.
- Tokens, from the subagent's transcript: input 28,724,444, of which 26,550,236 cache reads, 2,173,876 cache writes and 332 uncached; output 17,173.
- The figures leave out the main session's share and a helper subagent that rewrote `main-server/README.md`, whose transcript was not counted.
