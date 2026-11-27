# 15: "+ 같이" on the seat answer alone

Parent: [P10 spec](../spec.md) § With Friends ("Two capabilities"); design `group-study-design` ①, `group-study-resume` § 0
Status: ready-for-agent
Blocked by: 11; the booking's band PR (#637, P01 ticket 14), which moves the seat answer's bar onto the meal's band and owns `time-bar.tsx`

Native files: none. Releases: with ticket 16.

## What to build

The 관정 seat answer alone stays today's seat ticket, since the app does not send `study-plan`. Its time card gets the meal's "+ 같이" slot, in the same place and with the same picker.

- **Adding Friends** posts `POST /assistant/answers` with a study input built from the seat card:
  - `date`, and `window` set to the card's start and end;
  - `minutes`;
  - `chosen.seatSpaceId` set to the card's space;
  - `together: true`;
  - `people`: the asker, then the Friends picked.
  - `what` and `area` take the server's answer (see the plan's open question).
  - The group answer (ticket 11) takes the card's place.
- **Removing every Friend** from that answer shows the seat card the app kept, with no server call.
- `BookingBar` in `time-bar.tsx` is the one file of the band session this ticket needs, after #637 merges.

## Acceptance criteria

- [ ] The seat answer's time card shows "+ 같이", and it opens the meal's picker. (Integration test.)
- [ ] Picking three Friends posts the study input above, with `together: true`, and shows the group answer. (Integration test with the mock server.)
- [ ] Removing every Friend shows the kept seat card, and no request is sent. (Integration test.)
- [ ] The seat answer's own tests pass unchanged.
- [ ] Whole lint, format and types.

## Comments
