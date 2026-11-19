# 62: A party's members are told what words would say: a step changed, a member arrived, a member is late

Parent: [P15 spec](../spec.md), item 62; follows [61](61-room-without-chat.md), which takes the mock 파티 채팅 out of the room.
Status: ready-for-human
Owner: fyoon46
Blocked by: none

Native files: none. Releases: a main-server Release and an app OTA update. No migration: a Notification's kind is a string column. An app without this ticket shows the new kinds as plain notices.

## The story

Strangers in a public 파티 cannot say a word to each other. They meet at a step's place: a Sub Quest with a point on the map, such as "14:00 · 301동 정문 앞에서 만나기", which every Holder's map shows as the Quest's pin, with 길찾기. What words would have said is told by a notice instead:

- Anyone moves the meeting: "김태현이 일정을 바꿨어요 · 14:10 301동 정문 앞에서 만나기".
- A latecomer comes: the others go out to the step's point to get them. "민수가 도착했어요 · 301동 정문 앞".
- A member is late: "민수가 5분 늦어요 · 14:05 도착". The place and the time stay; the late member goes straight to the step's place and nobody waits at a Merging Point.

The last few metres in a crowd are not solved without words; that limit is accepted. Saying "5분 늦어", "도착했어" or "정문 앞에서 모이자" to the Assistant is the AI Assistant batch's, not this ticket's.

## What happens now

- Any Holder may add, edit or cancel a step that is not the attending one (`main-server/src/quests/sub-quests.service.ts`). The other Holders get only the live signal `quests-changed`, which refreshes their screens. Nothing says what changed or who changed it.
- Nothing tells anyone that a member reached the step's point.
- `POST /quests/:id/late` keeps a Holder's minutes and sends the live signal `late` (`main-server/src/plans/late.service.ts`). No screen of the app sends it yet and nothing pushes it. The room's member rows do not show `late`.

## What changes

All three are Notifications of the main server's kept list, which ring the phone and open the Quest's card on the map (`party:<questId>`), as the other party Notifications do. Each is for the other Holders of the Quest, never for the User who caused it, and is kept once per Quest and per member (`about`), so a later one of the same kind replaces the earlier.

1. **A step changed** (`step-changed`). When a Holder adds, edits or cancels a step that has not ended. Title "<name>가 일정을 바꿨어요" (the subject particle fits the name, as the other Notifications' titles do); line "<HH:MM> <step's words>", or "'<words>' 취소" for a cancelled step.
2. **A member arrived** (`arrived`). When a position upload of a member of the Quest's Party, with the Party's sharing on, falls within 50 m of the point of the step the map shows (the next step that has not ended, the attending one first), while that step's time is at most 30 minutes ahead or has passed, until it ends (a day after its time when it has no end). Only the other Holders who see that member's position at `exact` are told, since the notice says where the member is: a Holder outside the Party, or with the Master Switch off, is told nothing. Once per member and per step's time and point, kept by Redis until the step ends. Title "<name>가 도착했어요"; line "<step's place words>".
3. **A member is late** (`late`). When a Holder reports being late. Title "<name>가 <N>분 늦어요"; line "<HH:MM> 도착 · <Quest title>", or the Quest's title alone when no arrival is known. In the room, that member's row starts with "<N>분 늦어요", whether or not the User is in the Party.

## What stays as it is

- Who may change a step: any Holder, as today.
- The step form, the Quest's pin on the map, and the Party's faces on the map.
- The live signals `quests-changed` and `late`, which the screens still use.
- No location of a member is passed on by these notices.

## Acceptance criteria

- [x] Adding, editing or cancelling a step keeps a `step-changed` Notification for each other Holder, naming who changed it; none for an ended step, none for the User who changed it.
- [x] A position upload within 50 m of the shown step's point, by a member of the Quest's Party with sharing on and in the step's time, keeps one `arrived` Notification for each other Holder who sees the member at `exact`, once per member and step, and again once the step moves; none for a Holder who does not see the member, none outside 50 m, with sharing off, or outside the time.
- [x] A late report keeps a `late` Notification for each other Holder, and the room's member row says "N분 늦어요".
- [x] The app's 알림 shows the three kinds with their icons, and a press opens the party's card.
- [x] Tests, by ADR 0007: `party-member-notices.integration.test.ts` (a step changed, a member arrived) and `quest-late.integration.test.ts` (late) in main-server; `notifications-members.unit.test.ts` and `room-walking.integration.test.tsx` (the late row) in the app.

## Comments

### Notes from the implementation (2026-11-19)

- Nothing in the app sends a late report yet, so `late` comes only from `POST /quests/:id/late` until the AI Assistant batch adds the sender ("5분 늦어" to the Assistant, "늦어요" on the leave-by notification).
- A press opens the party's card on the map, as the other party Notifications do, not the room.
- Review (2026-11-19): an `arrived` notice first went to every other Holder, telling a Holder outside the Party where the member was; it now goes only to the Holders `VisibilityService.viewersOf` gives `exact`. The Redis key now holds the step's time and point, so a moved step is arrived at anew, and lives until the step ends, so a step with no end is told once.
- Left open from that review: the arrival check reads the Party member, the Quest's Holders and the whole Quest on every position upload of a Party member before the cheap distance check; a cached shown step would keep most uploads off the database. And the Leader's better-plan change (`better-plan.service.ts`) replaces every step with no `step-changed` notice, only the `plan-changed` and `quests-changed` signals.
- No emulator screens: after the mock data was patched to show the three kinds and a late member, the dev build stayed on a black screen for over ten minutes on a freshly cleared Metro, so the rows are covered by `notifications-members.unit.test.ts` and `room-walking.integration.test.tsx` only.

### Agent usage (2026-11-19)

- Agent time: about 30 minutes in one side session (an estimate).
- Tokens: input 47.63 M, of which 47.45 M cache reads and 0.18 M cache writes (280 uncached); output 79 k. No subagents.
