# 27: Joining another 파티 of an event says the User's own goes, and + 파티 모집 opens the one held alone

Parent: [P06 spec](../spec.md)
Status: needs-triage (written for the team's review on 2026-11-27; not built)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64. Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- Joining another 파티 of an event deletes the User's own 파티 of that event when they are alone in it, with its post, requests and invitations (`main-server/src/quests/quests.service.ts`). The join sheet does not say so (`mobile/src/screens/party/join-sheet.tsx`), and the gone toast is skipped on purpose.
- On the 행사 tab, `+ 파티 모집` goes straight to the User's 파티 of the event only when others hold it too (`sharedQuestFor`, `holders.length > 1`, `mobile/src/features/events/adapter.ts`). With a 파티 held alone it opens a blank form, and sending it turns the existing Quest into the new one (`quests.service.ts`, `mobile/src/screens/party/form/use-send.ts`): the User thinks they made a second 파티.

## What to build

- The join sheet, when the User holds a 파티 of the same event alone, says before joining: "이 행사로 올린 내 파티 '<제목>'는 없어져요".
- `+ 파티 모집` on an event whose 파티 the User holds alone opens that 파티's edit form (decided 2026-11-27), not a blank one.

## Must not break

- Joining with no 파티 of the event; `+ 파티 모집` with none, and with a shared one.
- Tests: app `events-*`, `party-join*` (`.integration`).

## Acceptance criteria

- [ ] The warning shows only when a 파티 held alone would go. (App integration test, which fails before the change.)
- [ ] `+ 파티 모집` opens the held-alone 파티's edit form. (App integration test, which fails before the change.)
- [ ] No native file changes; lint, format and types pass.

## Comments
