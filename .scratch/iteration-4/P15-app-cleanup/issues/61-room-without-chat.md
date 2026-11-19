# 61: The room has no 파티 채팅

Parent: [P15 spec](../spec.md), item 61; a teammate's report of 2026-11-19: "현재 파티채팅이 작동하지 않음. 구현을 하든가, UI를 없애든가 선택해야 함."
Status: ready-for-human
Owner: fyoon46
Blocked by: none

Native files: none. Releases: an app OTA update only (no main-server Release, no native Release).

## What happens now

- A room of a Quest held by more than one User ends with a 파티 채팅 section (`mobile/src/screens/room/party-chat.tsx`). It is a mock: what the User sends is kept on the phone (`mobile/src/storage/party-chat.ts`, through `mobile/src/api/quest-parts/chat.ts`), and nobody else sees it. No server keeps a conversation.
- The list of messages grows without end inside the room.

## Decision

The room gets no chat. Members meet at a step's place (a Sub Quest with a point on the map, such as "301동 정문 앞에서 만나기"), which every Holder's map already shows, and what words would say is told by notices instead ([62](62-party-notices-without-words.md)). Building a real chat would take a stored conversation, live delivery, a push per message, unread marks and, between strangers, reporting and blocking, and the late member's message is the Assistant's job in the design ("A late member" in `agentic-map-design.md`).

## What changes

- The 파티 채팅 section leaves the room, with nothing in its place.
- The mock goes with it: the section, the phone's store, the client operations `listPartyChat` and `sendPartyChat`, the query, and the frame's conversation in the mock data.

## What stays as it is

- The room's other sections, and the footer's 나가기 giving way to the keyboard, which the step form's fields still use.
- Messages kept on a phone under `snunow.party-chat.<user id>` are left there unread; nothing reads them, and the app keeps no list of keys to clear.

## Acceptance criteria

- [x] A room of a Quest with several Holders shows no 파티 채팅 and no 파티에 메시지 보내기.
- [x] Tests, by ADR 0007: `room-wireframe.integration.test.tsx` checks that the section is gone; `room-parts.integration.test.ts` keeps a request's note only.
- [x] On the emulator, a room of a 파티 ends with its members (and the invitations) above 나가기.

## Comments

### Agent usage (2026-11-19)

- Agent time: about 25 minutes in one side session, counting the design discussion that decided it and the removal (an estimate). The first part of the discussion, held in the orchestrating session, is not counted.
- Tokens: input 16.34 M, of which 16.16 M cache reads and 0.18 M cache writes (196 uncached); output 48 k. No subagents.
