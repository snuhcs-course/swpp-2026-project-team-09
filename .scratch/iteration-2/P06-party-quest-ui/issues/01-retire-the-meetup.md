# 01: Retire the Meetup; a plan with a Friend is a 비공개 파티

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User who wants to plan something with a Friend uses the same form as for any 파티. `파티 만들기` on a Friend's card on the map and `{name}님과 파티 만들기` in a Friend's panel open the form preset to 비공개, with that Friend already invited. Making it posts a Closed Quest and invites the Friend, who answers it in `초대` like every other invitation.

The Meetup is retired in the app and on the server. Its code is **deleted**, and the spec records the last commit that holds it, `2f4f201` on `2.0/Main`, so that it can be brought back with git. The Prisma model, the enum and the table stay, no migration is added, and the rows already stored stay unread. A Meetup accepted before is a Closed Quest and keeps showing as a 비공개 파티.

The frames are `PartyAppt` (the form in 비공개 mode with the Friend invited) and, in `Main`, the Friend's card and panel.

## What goes

As of `2f4f201`:

- **Server**
  - `MeetupsModule` and `src/meetups/`; the Meetup parts of the Friends service (withdrawing proposed Meetups when a friendship ends) and of `src/demo/demo-data.ts`.
  - Tests: `meetups.e2e-spec.ts`, `meetup-answers.e2e-spec.ts`, `meetup-quests.e2e-spec.ts`, the helper `test/meetups.ts`; the Meetup case of `admin-friendship-ending.e2e-spec.ts`; the `GET /meetups` call and the `prisma.meetup` count of `demo-seed.e2e-spec.ts`.
  - README's `## Meetup` section and the signal `meetups-changed`.
- **App**
  - The route `meetup/[friendId]`, `screens/meetup/` (except what stays, below), the Meetup cards and `보낸 초대` of `초대` (`invites-meetups.tsx`), `features/meetups/`.
  - The client's Meetup operations: `api/server/meetup-client.ts`, the Meetup parts of `api/server/client.ts`, `api/server/waiting-answers.ts`, `api/waiting-types.ts`, `api/client.ts`, `api/queries.ts`, and the mock `api/mock/meetups.ts` with its use in `api/mock/client.ts`.
  - The Meetup rows of 알림, the `meetups-changed` live key, and the Meetups in the count of `초대` (`features/party/use-party.ts`).
  - Tests: `meetup-form-test`, `meetups-invites-test`, `meetups-proposing-test`, `support/meetups.ts`, and the Meetup parts of `main-test`, `notifications-test`, `live-test`, `mock-me-test` and `server-me-test`.

## What stays

Code named after the Meetup that other features use:

- `MeetupPlace` (`api/room-types.ts`), the base of `SubQuestPlace`, is renamed (for example `PlaceChoice`) and kept.
- The place picker (`screens/places/place-picker.tsx`) serves Sub Quests and stays.
- On the server, `createWithSubQuest`, `SubQuestColumns` and `CLOCK` are used by Quests and stay, moved out of the Meetup module if they live there.
- The accepted Meetup's Shared Quest in the mock (`mockMeetups.sharedQuests()`, read by `api/mock/room.ts`) moves into the Quest mock data (`api/mock/data/quests.ts`), so that its room still opens in the mock build.

## Acceptance criteria

### App

- [ ] `파티 만들기` on a Friend's card opens the form as 비공개 with that Friend selected under `친구 초대`.
- [ ] The Friend panel's `{name}님과 파티 만들기` does the same.
- [ ] Making it creates a Closed Quest and invites the Friend, as the form does today; the toast is `비공개 파티를 만들었어요 · 1명에게 초대 요청`.
- [ ] Everything under What goes is deleted from the app; everything under What stays still works.
- [ ] The count of `초대` counts Quest invitations only.
- [ ] Jest: both entries open the form preset to 비공개 with the Friend; making it invites the Friend; `초대` and 알림 show no Meetup; the mock build still opens the former Meetup's room.

### Server

- [ ] Everything under What goes is deleted from the server; no Prisma change and no migration.
- [ ] Lint, the unit suite and the e2e suite pass, `demo-seed` included.
- [ ] 윤유상 reviews the server part.

### PR

- [ ] The PR body names `2f4f201` as the commit to restore from.
- [ ] Screenshots of the form opened from the Friend's card, under Test Results.
