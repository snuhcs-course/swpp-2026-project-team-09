# 28: Inside a Private Zone my position is not kept, and Friends see my Timetable only

Parent: [P02 spec](../spec.md), "The Private Zone"; the design's section 7, "What happens by place", and row 9
Status: ready-for-agent
Blocked by: nothing

## What to build

The server half of the Private Zone: the User's zones, each one closed outline, and the lowering in the position upload. The app half is ticket 29, over the contract in the spec's section.

- **The table.** `private_zones`:
  - `id`, a UUID v4 primary key;
  - `user_id`, referring to `users` with `on delete cascade`, indexed;
  - `label` (text), `outline` (jsonb, the ring of points), `created_at`.
  - Its migration adds the table only, so it is safe on Production rows.
- **The endpoints**, the User's own zones only, by the contract:
  - `GET /users/me/private-zones` (oldest first), `POST /users/me/private-zones`, and `DELETE /users/me/private-zones/:id`, beside `PUT /users/me/master-switch`.
  - A body is checked whole: 3 to 200 points. A last point that repeats the first is dropped before counting. Anything else is 400 `PRIVATE_ZONE_INVALID`.
  - The outline may run past the Campus Boundary. Each point must lie within 300 m of it (`metresToRing` on the boundary's outline) and at least one inside it (`CampusBoundary.contains`); otherwise 400 `PRIVATE_ZONE_OFF_CAMPUS`.
  - An outline that encloses less than 300 m² is 400 `PRIVATE_ZONE_TOO_SMALL`. The area is the absolute value of the shoelace sum, in metres around the outline's middle.
  - A sixth zone is 409 `PRIVATE_ZONES_FULL`.
  - A zone that is not the User's is 404 on delete and is never listed.
- **The label.** The server names a zone when it is made: the Place nearest the middle of the outline's bounding box, "{Place's label} 근처". With no Place near, it is "그린 구역".
- **Inside a zone.**
  - A zone holds a position when its outline encloses it by the nonzero winding rule, or the position lies within 10 m of the outline.
  - Add the winding test to `common/geometry.ts`, beside `encloses` (which is even-odd) and `metresToRing`, which gives the distance to the outline.
  - The rule is the same one the app's fill uses, so a loop that crosses itself hides everything it shows filled.
- **The lowering.**
  - In `LocationSharingService.upload`, after the campus check: a position inside one of the User's zones goes to `clearPosition`, and the reply is `{ offCampus: false, privateZone: true }`.
  - Otherwise the position is kept as today, with `privateZone: false`.
  - `UploadedPositionDto` gains `privateZone`.
  - Viewers get `position-removed` through `clearPosition`'s `announceRemovals`, as when leaving campus.
- **At once.** A new zone round the User's stored position clears it in the same request. Deleting a zone does nothing more; the User shows again from their next upload outside every zone.
- **No cache:** one indexed read of the User's zones per upload, the database first.

## Acceptance criteria

- [x] The three endpoints work by the contract, with their limits and error codes; another User's zone is never listed and is 404 on delete.
- [x] An upload inside a zone:
  - it is not kept, and the reply says `privateZone: true`;
  - a viewer at `exact` and one at `building` each get `position-removed`;
  - a Friend's `GET /positions` leaves the User out;
  - the Friend's view of them is the Timetable only, as off campus.
- [x] An upload outside every zone is kept as today, with `privateZone: false`.
- [x] A new zone round the stored position clears it at once. After the zone is deleted, the next upload outside every zone shows the User again.
- [x] One Assistant Friend tool, reading through `VisibilityService`, finds a User inside a zone without a position.
- [x] Unit tests:
  - the winding test, with a plain loop, a loop that crosses itself (a figure eight, and a loop drawn twice round), and a point just outside;
  - the 10 m edge;
  - the area, and the refusal under 300 m²;
  - the label, with a Place near and with none.
- [x] Integration tests over the endpoints and the upload.
- [x] Each changed source file has its AI-generated row, and lint, format, and type checks pass.

## Comments

- The contract and the decisions under review are in the spec's section "The Private Zone".
- The fake main server of the app's tests is ticket 29's.
- Revised 2026-11-16 from painted strokes to one closed outline, on the user's word.

### Decisions taken in the build (2026-11-16)

- The three endpoints are a controller of their own, `PrivateZonesController` at `users/me/private-zones`, in `LocationSharingModule` beside the Master Switch. `PrivateZonesService` there keeps the zones, and `LocationSharingService.upload` asks it.
- The body is checked in the service, not by the schema pipe, so that every refusal of its shape carries `PRIVATE_ZONE_INVALID`. A point is `{ latitude, longitude }` and nothing more, as in a position upload.
- The checks run in the order of the contract's errors: the shape and the count, off campus, too small, then the limit of five. The limit is counted under the lock of the User's row, so that two saves at once cannot make a sixth.
- A last point is dropped only when it equals the first exactly.
- A delete of a zone that is not the User's is 404 `PRIVATE_ZONE_NOT_FOUND`. An id that is not a UUID is 400, as for every other `:id`.
- The outline's middle is the middle of its bounding box, for the label and for the area. The area projects each point to metres east and north of that middle, east scaled at its latitude.
- A Place is near when `PlaceLookup.nearTo` finds it: the Place whose point is nearest, within 150 m.
- An upload off campus does not read the zones and answers `{ offCampus: true, privateZone: false }`.
- `POST` takes no `Idempotency-Key`, as the contract has none: a repeat makes a second zone, up to the limit.
- `created_at` is the database's clock.
- A figure eight whose two lobes are of one size has a shoelace sum near zero, so it is refused as too small, by the rule above.
- The main server's README gains a section "Private Zones" under Location Sharing.

### Open for review (2026-11-16)

The area is the absolute value of the shoelace sum, as the spec's decision 5 says. So a figure eight of two equal lobes comes out near 0 m² and is refused as too small, although the nonzero rule fills both lobes and would hide the User there. A fix would measure the area the nonzero rule fills, for instance by counting a grid of points inside the bounding box. The app's check in ticket 29 would need the same rule, so the area stays as the spec says until the spec's owner decides.

### Agent usage (2026-11-16)

- Agent time: about 41 minutes. This is an estimate from the transcripts' timestamps: the union of active stretches, with gaps over 5 minutes left out. It counts the subagent that built it (about 36 minutes) and the review in the session that briefed it (about 5 minutes).
- Tokens, the builder and the review together:
  - output: 97,656;
  - input: 26,159,822, of which 25,867,331 were cache reads, 292,237 cache writes, and 254 uncached.
