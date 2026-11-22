# 06: Ended 파티 leave the invitation and request lists, and failure toasts carry the alert icon

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-member-row-icon-buttons.md), which rewrites `screens/room/people-sections.tsx` and `member-friend-button.tsx`, where two of the failure toasts are.

Native files: none. Releases: the main server and an app OTA update.

## What happens now

Received: "이미 기간이 지난, 하지만 아직 수락하지 않은 비공개 파티가 초대 목록에 여전히 남아있음. 또한 수락을 눌렀을 때 토스트로 '이미 끝난 파티에요'가 뜸. 거절하면 목록에서 사라지긴 함." (`references/06-1-ended-invitation.webp`: 파티 › 초대, "302동 앞에서 만나기" sent a day ago, the toast with ✓, the tab's badge 1)

- `GET /quest-invitations` (`main-server/src/quests/invitations.controller.ts:50`) lists the User's invitations by `where: { userId }` alone (`invitations.service.ts:102-109`).
- A Quest has ended when no Sub Quest is ahead (`hasSubQuestsAhead`, `src/quests/dto/quest.dto.ts:221`). That is checked only on entering (`recruiting.service.ts:200-201`, `QUEST_ENDED`) and when a Party is opened for the Quest (`parties/parties.service.ts:213-214`). An ended Quest is not deleted, and an invitation ends only when it is accepted, declined (`invitations.service.ts:188`), cancelled by the Leader (:128), or its Quest is deleted, so an unanswered one stays for good.
- The same filter as a query exists: `subQuestsAheadWhere(now)` (`quest.dto.ts:226`, used by `interests/topics-step.service.ts:106`). `InvitationsService` already has the injected `CLOCK`.
- The other lists have the same gap: a Leader's 초대 중 for one Quest (`GET /quests/:questId/invitations`, `invitations.controller.ts:31`), the User's sent join requests (`GET /quest-join-requests`, `join-requests.service.ts:89` `listSent`), a Leader's received join requests for one Quest (`GET /quests/:questId/join-requests`, :124 `listReceived`), and the card of one invitation (`GET /quest-invitations/:id`, `src/plans/invitation-card.service.ts:26`).
- The bottom bar's 파티 badge (`usePartyBadge`, `mobile/src/features/notifications/use-notices.ts:67-69`, through 알림's rows, which read it at :32), the 초대 tab's count (`features/party/use-party.ts:249-255`) and the map's invitation cards (`screens/main/use-main-layers.ts:44`, `use-asked-card.ts:36`) all read the received list (`questInvitationsQuery`).
- "이미 끝난 파티예요" is `ENTERING` (`mobile/src/features/quests/refusals.ts:46`), shown by the failure branch of `screens/party/use-party-actions.ts:146`. A toast's icon is ✓ unless its third argument says `'alert'` (`design-system/toast.tsx:79`; `class-form-screen.tsx:73` does). Every failure toast of the 파티 tab and the room shows ✓.

## What to build

- The main server leaves Quests with no Sub Quest ahead (`subQuestsAheadWhere` at the injected clock's now) out of: the received invitations, a Leader's 초대 중, the User's sent join requests and a Leader's received join requests; a per-Quest list of an ended Quest is empty. The card of an invitation to an ended Quest is answered as one that waits no more (404), which the app already handles. The rows stay in the database.
- The badge, the 초대 tab's count, 알림's rows and the map's cards follow from the list.
- Every failure toast of the 파티 tab and the room shows the alert icon, "이미 끝난 파티예요" included: the toasts shown for a refusal or a failure in `screens/party/` (`use-party-actions.ts`, `form/use-send.ts`, `form/photo-field.tsx`) and `screens/room/` (`use-room-actions.ts`, `people-sections.tsx`, `member-friend-button.tsx`). Success toasts keep ✓.

## Must not break

- Accepting and declining an invitation that waits; entering a Quest with a Sub Quest ahead; the received invitation's card closing when the invitation waits no more (iteration 4's P02 ticket 06).
- An attending Sub Quest goes by its Global Event's time (`subQuestsAheadWhere` already does).
- Tests: main server `test/quest-invitations`, `quest-join-requests`, `invitation-card` (`.integration`), with the ended fixture of `quest-joining.integration.test.ts:91-94` (an `endsAt` in the past); app `party-invites`, `invitation-card-ended` (`.integration`), `design-system/toast.unit`. (`party-invitations` covers a Party's invitations, which this ticket leaves as they are.)

## Acceptance criteria

- [ ] `GET /quest-invitations` leaves out an invitation to an ended Quest and keeps one with a Sub Quest ahead. (Main server integration test, which fails before the change.)
- [ ] A Leader's 초대 중, the sent and the received join requests leave out an ended Quest. (Main server integration tests.)
- [ ] `GET /quest-invitations/:id` answers an ended Quest's invitation as it answers a missing one. (Main server integration test.)
- [ ] A refused accept shows "이미 끝난 파티예요" with the alert icon; a successful one keeps ✓. (App integration test, which fails before the change.)
- [ ] The 초대 tab without the ended invitation, and a failure toast with its icon, on a phone with the mock build; the screens go to the orchestrator before the PR. (Emulator.)
- [ ] No native file changes; lint, format, and types pass on the app and the main server.

## Comments
