# 08: A room request kept with its study input, its answer rebuilt, and its consent count on the Quest

Parent: [P10 spec](../spec.md) § With Friends
Status: ready-for-agent
Blocked by: 07

## What to build

- `POST /library/room-requests` takes an optional `input`, a study input, and keeps it.
  - One migration, additive only, written from the target branch's schema: `room_requests.study_input jsonb null`, with no backfill and no default. The PR body names it, for the Release.
  - Everything else of the request is today's.
- New `GET /library/room-requests/:id/answer`, the requester's only (else 403), answers the study answer at the request's room, time and people:
  - rebuilt from the kept `input`, or from the request alone when it has none;
  - with `group.request`: `status`, `consented`, `asked`, the names still to answer, and `moreNeeded`;
  - locked: no other room kind or time is offered.
- `GET /quests` and `GET /quests/:questId` give a booking party `roomRequest: { id, status, consented, asked }`, and every other Quest `null`. The map's Quest tag and `/main?card=party:<questId>` read it.

## Acceptance criteria

- [ ] A request sent with `input` answers it back at `…/:id/answer` with `group.request.status: 'gathering'` and 0 of 3 consents. After the three consents it is `ready`; after `result` `ok`, `booked`. (Integration test.)
- [ ] A request from today's chat card (no `input`) still answers at `…/:id/answer`, and is made exactly as before. (Integration test.)
- [ ] A Friend asking `…/:id/answer` gets 403.
- [ ] `GET /quests` gives a booking party's consent count and `null` for other Quests. (Integration test.)
- [ ] The migration adds the nullable column only. (Checked against the target branch's schema.)

## Built (2026-11-27)

- [x] A request sent with `input` answers it back at `…/:id/answer` with `group.request.status: 'gathering'` and 0 of 3 consents. After the three consents it is `ready`; after `result` `ok`, `booked`. (`test/room-request-answers.integration.test.ts`)
- [x] A request from today's chat card (no `input`) still answers at `…/:id/answer`, and is made exactly as before: the reply of `POST` is unchanged and `study_input` stays null. (Integration test.)
- [x] A Friend asking `…/:id/answer` gets 403, as does anyone else but the requester; an unknown request gets 404.
- [x] `GET /quests` gives a booking party's consent count and `null` for other Quests, an existing Quest a request asks the Holders of included. (Integration test.)
- [x] The migration adds the nullable column only: `prisma migrate diff` from the target branch's `schema.prisma` gives the one `ADD COLUMN "study_input" JSONB`, and a test reads the column as nullable `jsonb` without a default.

- `POST /library/room-requests` takes `input` (the plan-input schema's `studyInputSchema`, now exported) and stores it in `room_requests.study_input` (migration `20261127000000_add_room_request_study_input`).
- `library/room-answers.service.ts` rebuilds the answer for the requester: the companions still in (once booked, the booking party's other Holders) in the kept input's order, their display names, and the kept input's `what`, `window`, chosen seat and constraints, or the request alone. `StudyGroupService.locked` and `lookup/study-group-locked.ts` make the one plan at the request's kind, day, start and length, `rooms` holding that kind alone; each stay comes from the person's day, or is the whole booking when the day leaves them out. Holders who are not the requester's Friends are named and drawn too.
- `group.request` is `{ id, status, consented, asked, waiting, moreNeeded }`; `countsOf` in `room-request-parts.ts` counts the companions still in, and, once booked, the booking party's other Holders, since the consents are deleted at booked.
- `QuestDto.roomRequest` (`quests/quest-room-requests.ts`) is set for a Quest a request made (`madeForBooking`), read as stored.
- The group fixture's gathering and ready answers have only the request's kind in `rooms` and `chosen.roomSpaceId` set, as the route gives them; a test checks the route's plan and group have the fixture's fields.
- `room-request-deadline.integration.test.ts` fails when it runs beside the other room request files with two workers, on the base commit too: their reads at Wednesday 10:05 pass its Wednesday requests' deadline. Not changed here.
