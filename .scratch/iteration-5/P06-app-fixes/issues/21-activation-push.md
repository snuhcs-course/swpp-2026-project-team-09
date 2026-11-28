# 21: Activating a 파티 rings its members (a change to ticket 19's decision)

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 19 (PR 688, the room as one page). Its owner agreed to this change on 2026-11-28.

Native files: none. Releases: a main server Release and an app OTA update.

## What happens now

Positions are as of `origin/5.0/Main` 331adc64 and of PR 688's branch (`5.0/P06-19-room-one-page`). Found by a read-only audit of the code on 2026-11-27 (what users of 파티 and 행사 cannot know).

- On `5.0/Main`, the ask before activating says "멤버 N명에게 알림이 가요" (`mobile/src/screens/room/activation-box.tsx`, `openAsk`). Opening the Party (`main-server/src/parties/parties.service.ts`, `open`) sends only `party-changed`. Members see "…님이 파티를 활성화했어요" in 알림 while the activation runs (`partyNotices`, `mobile/src/features/notifications/adapter.ts`), only when they open the app. No push.
- Ticket 19 (PR 688) settles the mismatch the other way: the ask says "다른 멤버의 알림 목록에 떠요.", the help line about notifying members goes, and its spec says "activation sends no push, and none is added yet". Its activation card has 나도 참여 and no 거절.

## What to build

This ticket proposes adding the push that ticket 19 leaves out. The user asked on 2026-11-27 for a push on activation, since a member who is not looking at the app misses an activation meant for the next few minutes.

- Opening a Party of a 파티 keeps a ringing Notification for every other Holder: "<이름>님이 <파티 제목>을 활성화했어요" / "나도 참여하면 서로 위치를 볼 수 있어요", in the words of ticket 19's card. It opens the 파티.
- One per 파티: activating again replaces it, and closing the activation forgets it, so turning it on and off does not ring again and again.
- In 알림, the derived row and the kept one never show twice (decided while building).
- The ask's words come back to say members are told: "멤버 N명에게 알림이 가요." in place of ticket 19's "다른 멤버의 알림 목록에 떠요.". The exact words are agreed with ticket 19's owner.
- Ticket 19's spec line "activation sends no push, and none is added yet" is changed with this ticket.

## Must not break

- Ticket 19's activation card: 나도 참여, 전체 위치 공유 asked first.
- Who sees whose position.
- Tests: main server `parties` (`.integration`), app `room-activation*` (`.integration`).

## Acceptance criteria

- [ ] Opening keeps one ringing Notification per other Holder, replaced on opening again and forgotten on closing. (Main server integration test, which fails before the change.)
- [ ] The ask says members are told. (App integration test.)
- [ ] No native file changes; lint, format and types pass.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 30 minutes (#708), an estimate, from 00:05 in Korea; time spent waiting for the shared emulator lock and for reviewers is left out.
- Tokens, the session and its two review subagents, counted from the session's log when this was written (the last minutes may not be in it yet): input 144, output 39,895; the input's cache reads 27,676,951 and cache writes 188,665 (main session: input 98, output 30,304, cache reads 26,476,405, cache writes 53,905; subagents: input 46, output 9,591, cache reads 1,200,546, cache writes 134,760).
