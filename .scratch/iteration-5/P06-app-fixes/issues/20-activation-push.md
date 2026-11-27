# 20: Activating a 파티 rings its members, as its ask says

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- The ask before activating says "멤버 N명에게 알림이 가요" (`mobile/src/screens/room/activation-box.tsx`, the activation ask).
- Opening the Party (`main-server/src/parties/parties.service.ts`, `open`) sends only `party-changed`. Members see "…님이 파티를 활성화했어요" in 알림 while the activation runs (`partyNotices`, `mobile/src/features/notifications/adapter.ts`), only when they open the app; no push.

## What to build

- Opening a Party of a 파티 keeps a ringing Notification for every other Holder: "<이름>님이 <파티 제목>을 활성화했어요" / "수락하면 서로 위치를 볼 수 있어요". It opens the 파티.
- One per 파티: activating again replaces it, and closing the activation forgets it, so turning it on and off does not ring again and again.
- In 알림 the derived row and the kept one never show twice (decided while building).

## Must not break

- The activation's ask, accept, decline and close; who sees whose position.
- Tests: main server `parties` (`.integration`), app `room-activation*` (`.integration`).

## Acceptance criteria

- [ ] Opening keeps one ringing Notification per other Holder, replaced on opening again and forgotten on closing. (Main server integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
