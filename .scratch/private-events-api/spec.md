# Owner-only manual private calendar

Manual private-event CRUD belongs to main-server. It adds no upload, AI provider,
external account, fabricated feed, recommendation or automatic rescheduling.

## Contract

- GET /v1/private-events returns {items:PrivateEvent[]} for the current JWT owner.
- POST /v1/private-events accepts title, description, startsAt, endsAt, locationName,
  optional latitude/longitude pair. PATCH /v1/private-events/:id accepts expectedVersion
  and one or more editable fields; all editable fields together are also supported.
- DELETE /v1/private-events/:id takes {expectedVersion} and returns {ok:true}.
- PrivateEvent exposes id, title, description, startsAt/endsAt, locationName, nullable
  coordinates, version, createdAt, updatedAt. It does not expose an owner field.
- Title is nonblank/max200, description max5000 and location max300 allow empty text.
  Exact ISO timestamps with timezone must form a positive interval of at most31days.
  Past events are allowed. Coordinates are omitted together, bothnull, or a valid pair;
  a coordinate edit supplies both values. Unknown/owner/status/public fields reject400.

## Ownership, concurrency and schedule use

Routes exist only on main-public. Every operation scopes by authenticated owner;
admin role never bypasses ownership. Guessing another event ID yields404 for valid
PATCH/DELETE requests. Private rows use a separate table and never enter public event
or party APIs. No public/private visibility switch exists.

Writes take the owner user-row lock before create or owner-filtered versioned
update/delete. Same-version concurrent writes cannot silently overwrite one another.
An update/delete race has one winner; the other receives409 if a newer row remains,
or404 if the row was deleted. Every successful write enqueues an owner-only
private-event.changed hint containing ID/version, with no event details. Delete emits
a next-version removal hint in the same transaction.

These are personal calendar source records and can overlap classes or accepted plans.
They do not silently move existing quests. New/time-changing active quests and meetup
acceptance consume half-open private-event overlaps under the existing sorted-user
locks. Conflict responses remain generic409 SCHEDULE_CONFLICT; another participant
cannot read the conflicting event's title, notes, location, coordinates or ID.

## Migration and acceptance

Additive Prisma migration202609270002_private_events adds private_events and owner/time
index. Prior migrations remain unchanged. Build and full disposable PostGIS17/Redis8
suite passed48/48, with no failures or skips. Coverage includes malformed calendar
dates, cross-midnight offsets, past entries, coordinates, owner/admin isolation,
SQL-looking text as literal data, CAS write/delete races, private hints, and conflict
removal allowing an unchanged pending meetup to be accepted. Existing42 tests pass.
Coordinator owns socket whitelist, mobile, cross-service E2E and live deployment.
