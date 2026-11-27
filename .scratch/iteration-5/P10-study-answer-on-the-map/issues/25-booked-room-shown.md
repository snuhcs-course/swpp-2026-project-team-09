# 25: The party sees the room the library booked

Parent: P10 (the study answer on the map). The app side of P05 ticket 68 (#669), the user's decision of 2026-11-27 on whether the booked room is shown to the Friends: "그러면 당연히 보여줘야지".
Status: ready-for-agent
Blocked by: P10 ticket 13 (#662), whose Quest and request fields this builds on.

Native files: none.

## What to build

- **The report.** A party's booking reports the room the library booked, `POST /library/room-requests/:id/result {ok: true, room}`, as the library names it ("G412"). A report that does not get through is kept with its room and sent again. A report kept before the room was reported is sent as before, without one. A room card booked with no party sends nothing, as before.
- **Read.** `bookedRoom: string | null` on the request and on each Quest, absent from a main server before it. An empty room is refused.
- **Shown, wherever a Quest's place is said,** only when `bookedRoom` is set: the room first, then the place, "G412 · 관정관 (62-1동) 4층 그룹스터디룸 6인실". The room first is the orchestrator's choice, so that a narrow row that cuts the line keeps the room.
- **The requester's card,** once booked, keeps its ticket locked on the room booked: the one this phone booked, else the request's `bookedRoom`, else the one sent.
- **Not done:** a start the library booked (P05 ticket 68 leaves it for the user's word).

## Every place a Quest's place is drawn

| Place | Where | Room shown |
|---|---|---|
| 파티 tab card | `party/mine.ts` | changed |
| Quest list screen row | `quests/adapter.ts` `place` | changed |
| Map's Quest list row | `quests/adapter.ts` `meta` | changed ("17:40 · G412 · 관정관 …") |
| Map's Quest card | `map/adapter.ts` | changed |
| The room's own screen | `quests/room-adapter.ts`, the shown step | changed |
| An event's list of 파티 | `events/adapter.ts` | changed |
| The map's flag | `room-request-flag.ts` | unchanged: a flag only while the request is out; once booked the Quest is an ordinary mark, whose label is its title |
| 찾기 posts | `party/posts.ts` | unchanged: a booking party is 비공개 and never posted |
| An invitation | `assistant/invited-words.ts` | unchanged: a booking party asks for consents, not invitations |
| The companions' notice | the main server (P05 ticket 68) | names the room there; the app builds no notice text of its own |

## Acceptance criteria

- [x] A party's booking reports its room; a report kept is sent again with it; a report kept before is sent without. (Unit test of `room-bookings.ts`, failing before the change; the room card's and the group card's integration tests.)
- [x] `bookedRoom` read on a Quest: absent, null, a room; refused when not a text or empty. (Unit test.)
- [x] Each changed place leads with the room when booked, and is the place alone when not. (Unit tests, failing before the change.)
- [x] The requester's card shown again once booked locks its ticket on the request's `bookedRoom`. (Integration test, failing before the change.)
- [ ] Pictures at font scale 1.0 and 1.3 of each changed place.
- [x] Whole lint, format and types.

## Comments
