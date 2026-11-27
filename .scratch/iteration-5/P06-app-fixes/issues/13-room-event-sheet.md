# 13: 파티's event card opens the event's detail as a sheet over the room

Parent: [P06 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None.

Native files: none. Releases: an app OTA update only.

## What happens now

Received from the user on 2026-11-26, in their notes on the 파티 and 행사 tabs: "행사가 태그된 파티 안에 들어갔을 때 행사를 누르면 행사 탭으로 아예 넘어가버림, 팝업으로 아래서 위로 뜨게 하는 식으로 하는게 낫지 않나? (행사탭에서 그 행사 누르면 아래서 위로 올라오면서 전문 보이는 것처럼." On 2026-11-27 they asked for it as it is: "파티쪽 보고 있었는데 갑자기 행사로 이렇게 넘어가버리면 아까 화면으로 다시 찾아들어가야하잖아 … 행사탭에서 해당 행사 눌렀을 때 아래서 위로 뜨는 본문 팝업을 그쪽에 바로 띄워주고 필요하면 닫을 수 있게".

`references/13-1-room-event-sheet.webp` is the wireframe of 2026-11-26. Its left side is the phone: a press on the room's event goes to the 행사 tab. Its right side is the sheet over the room. The sheet there is drawn in the look another item proposes for it, and with the party button that this ticket leaves out (below). This ticket uses today's sheet.

Positions are as of `origin/5.0/Main` 9be7f899, under `mobile/src/`.

- **The room's event card.** The room (`screens/room/room-screen.tsx:198`) shows a 파티's Global Event as `RoomEvent` (`screens/room/room-event.tsx`), the design system's `EventCard`.
  - Pressing it calls `router.navigate({ pathname: '/events', params: { focus: id } })`. The 행사 tab then scrolls to the row and tints it (`screens/events/use-focus.ts`).
  - Push notices open the 행사 tab the same way (`push/card-address.ts:43`), so that focus stays.
  - The event badge in the room's head (`room.badges`) takes no press. It stays as it is.
- **행사's detail sheet.** `EventDetailSheet` (`screens/events/event-detail-sheet.tsx:81`, props `event: EventView | null`, `onClose`, `onParty`) is built on the shared `BottomSheet`. That sheet already opens over the room for the room's confirms.
  - It shows the source, the 내 파티 mark, the title, ☆, 언제 / 어디, the description, 원문 보기 when the event has a source URL, and the party button (`파티 찾기/모집` or `모집 중인 파티 n · 찾기/모집`). On the 행사 tab, the party button opens the recruiting sheet.
- **The data.** An `EventView` comes from `toEventViews` (`features/events/adapter.ts:131`) over the 행사 tab's sources (`useEventSources`, or `useSourcesFor(events)` in `features/events/use-events.ts`).
  - The list the main server serves holds only published events that have not ended (`main-server/src/global-events/global-events.service.ts:48`, `notEnded`).
  - So the app has no detail for an event that has ended or been withdrawn. `RoomEvent` then shows the title the 파티 keeps.

## What to build

- A press on the room's event card opens that event's `EventDetailSheet` over the room. The User stays in the room. Closing the sheet (the scrim, the handle, the back button, as every sheet closes) leaves the room as it was. The room no longer goes to the 행사 tab.
- In the room, the sheet has no party button. Decided by the user on 2026-11-27: the User is already in a 파티 of that event. `원문 보기` stays when the event has a source URL. Without one, the sheet has no buttons and closes as above. The 행사 tab's sheet keeps its party button: `EventDetailSheet` gets a way to leave the button out, and only the room uses it.
- An event the app cannot find in its list, because it ended, was withdrawn, or the list has not loaded or failed, leaves the card as it is today and not pressable: no button role, no press. Decided by the user on 2026-11-27.
- The 행사 tab's focus (`use-focus.ts`) and the push notices' way to the 행사 tab do not change.
- No words change.
- A suggestion, not required: open the sheet by event id, through a hook or a small component. The 모집글's event line (ticket 12) is to open the same sheet later.

## Must not break

- The 행사 tab's detail sheet with its party button, the recruiting sheet it opens, ☆ favorites, and 원문 보기.
- A push notice that opens the 행사 tab at an event.
- The room: its head, activation, 일정, 신청, 멤버, its other sheets, and its event card's look.
- Tests: the room's tests that reach the event card, `events-tab`, `events-recruiting`, `event-favorites`, `push/card-address.unit`, and those `git grep` finds for `RoomEvent`, `EventDetailSheet` and `focus`.

## Out of scope

- The sheet's look: the title's size, the 언제 / 어디 words, the 내 파티 mark. That is another item.
- The 모집글's event line (ticket 12), which opens nothing until a later ticket.
- The room's other changes from the same notes.

## Acceptance criteria

- [x] A press on the room's event card opens the event's detail sheet over the room and does not go to the 행사 tab; closing it leaves the room. (App integration test, which fails before the change.)
- [x] The room's sheet has no party button and shows `원문 보기` when the event has a source URL; the 행사 tab's sheet still has its party button. (App integration test.)
- [x] An event not in the app's list leaves the card unpressable. (App integration test.)
- [ ] Checked on the user's phone with the pull request's release build.
- [x] No native file changes; lint, format and types pass on the changed files.

## Decided while building

- **By event id.** `useEventView(eventId)` (`features/events/use-events.ts`) gives one event as the 행사 tab shows it, from `useEventSources` and `toEventViews`, or null while the list does not hold it. The room's card is pressable only when it is not null. Ticket 12's 모집글 event line can open the same sheet with it.
- **The party button.** `EventDetailSheet`'s `onParty` is optional. Without it, the sheet has no party button. Only the room leaves it out.
- **The sheet's foot without the party button.** `원문 보기` alone spans the sheet, as the design system's `lg` button does at a sheet's foot. Without a source URL, the sheet has no foot and no empty row.
- **The unpressable card.** It keeps its accessible name `행사 · {title}` and stays one element for a screen reader, without the button role. Its source line still comes from the app's list of announcers, as it does today, also for an event the list of events lacks.
- **Tests.** The new `__tests__/room-event.integration.test.tsx` holds the three criteria. It replaces `events-tab`'s "is opened from the event's card in a Quest's room". `room-activation` now finds the card by its name, not as a button: the event in that test is not in the fake server's list.

## Comments

### Agent usage (2026-11-27)

Estimates. Agent time is the session's wall clock from start to the pull request. About 25 minutes of it were Jest runs in the background on a machine other sessions loaded. Counting only the gaps under 5 minutes between transcript entries gives about 15 minutes. No subagents. Tokens are counted up to the writing of this entry, so the commit and the pull request are left out.

| Session | Agent time | Input | Cache reads | Cache writes | Uncached | Output |
|---|---|---|---|---|---|---|
| Ticket 13 (tests first, `useEventView`, the sheet's optional party button, the room's card, checks) | about 45 minutes | 9,463,125 | 9,323,982 | 139,019 | 124 | 38,918 |

Without cache reads, the input is 139,143.
