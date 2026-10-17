# 01: Retire the Meetup; a plan with a Friend is a 비공개 파티

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User who wants to plan something with a Friend uses the same form as for any 파티. `파티 만들기` on a Friend's card on the map and `{name}님과 파티 만들기` in a Friend's panel open the form preset to 비공개, with that Friend already invited. Making it posts a Closed Quest and invites the Friend, who answers it in `초대` like every other invitation.

The Meetup is retired in the app and on the server. Its code is **commented out, not deleted**, so that it can come back. The Prisma model, the enum and the table stay, no migration is added, and the rows already stored stay unread. A Meetup accepted before is a Closed Quest and keeps showing as a 비공개 파티.

The frames are `PartyAppt` (the form in 비공개 mode with the Friend invited) and, in `Main`, the Friend's card and panel.

## Acceptance criteria

### App

- [ ] `파티 만들기` on a Friend's card opens the form as 비공개 with that Friend selected under `친구 초대`.
- [ ] The Friend panel's `{name}님과 파티 만들기` does the same.
- [ ] Making it creates a Closed Quest and invites the Friend, as the form does today; the toast is `비공개 파티를 만들었어요 · 1명에게 초대 요청`.
- [ ] The Meetup route, its form, the Meetup cards and `보낸 초대` of `초대`, the Meetup rows of 알림, the `meetups-changed` live key, the client's Meetup operations and their mock are commented out, with a one-line note at each saying the Meetup was retired in Iteration 2 P06.
- [ ] The count of `초대` counts Quest invitations only.
- [ ] Jest: both entries open the form preset to 비공개 with the Friend; making it invites the Friend; `초대` and 알림 show no Meetup.

### Server

- [ ] `MeetupsModule` is taken out of the application module; the module's code, the Meetup parts of the Friends and Quests services, the demo seed's Meetups and the Meetup e2e test are commented out with the same note.
- [ ] README's `## Meetup` section and the signal `meetups-changed` are marked retired.
- [ ] No Prisma change and no migration.
- [ ] The server's unit and e2e suites pass.
- [ ] 윤유상 reviews the server part.

### PR

- [ ] Screenshots of the form opened from the Friend's card, under Test Results.
