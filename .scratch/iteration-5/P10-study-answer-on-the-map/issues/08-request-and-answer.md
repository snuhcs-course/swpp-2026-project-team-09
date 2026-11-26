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
