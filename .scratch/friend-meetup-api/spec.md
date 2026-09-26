# Concrete friend meetup proposal API

This slice is a **concrete manual plan proposal**, with mandatory title, start, end,
and place. Recipient acceptance consents to that exact immutable proposal. It does
not implement generic meetup-interest consent or the AI/automatic proposal flow.
No pending edit endpoint. After acceptance, existing quest editing/cancellation applies.

## Contract

- GET /v1/meetups returns {items:Meetup[]} for the authenticated sender/recipient only.
- POST /v1/meetups takes {friendId,title,startsAt,endsAt,locationName}. friendId is the
  other user UUID; an accepted friendship is required. Title max 200, place max 300,
  actual ISO timestamps with timezone, start in future, end after start, max 31 days.
- POST /v1/meetups/:id/respond takes {action,expectedVersion}. Only recipient can
  accept/decline; only sender can cancel a pending proposal. Same-outcome retry is
  idempotent even with its original version. Opposing/stale responses return 409.
- Meetup includes id, sender/recipient User views, title, startsAt/endsAt, locationName,
  status, version, partyId, questId, createdAt. No timetable details are returned.
- Pending invitations expire at startsAt on participant list/respond access. Expiry
  persists before a rejected response returns 409 MEETUP_EXPIRED. No background push
  scheduler or notification delivery guarantee is claimed.

## Acceptance and privacy

Acceptance creates exactly one private max-two party and active quest, links both
IDs, increments the meetup version and enqueues hints in one Prisma transaction.
Private meetup/party/quest hints have only the two participants as audience.
Private parties are excluded from outsider lists and return 404 for outsider direct
service reads, join, leave and sharing changes. Public party/match behavior is retained.
Party DTO includes visibility public/private; database visibility defaults public.

The acceptance transaction locks the meetup, then users ordered by UUID. It rechecks
accepted friendship, current timetable busy intervals and active overlapping quests
with nonlocking reads before creating a new party. Known conflicts return generic
409 SCHEDULE_CONFLICT, never course names or another person's schedule details.
Missing/out-of-term timetable coverage does not block an explicitly selected manual
plan and is never described as verified availability. No time recommendation is made.

Quest writes retain party-first membership locking, then lock sorted members, then
the quest. New/time-changing active quests use the same conflict check, excluding
self. Cancellation and harmless title/place edits remain possible despite pre-existing
conflicts. New/time-changing duration is limited to 31 days; legacy getters are unchanged.
Existing public-party join/leave behavior is unchanged and can alter schedule membership
later; this slice does not promise global prevention of all possible future overlaps.

## Migration and verification

Additive Prisma migration: 202609270001_friend_meetups. Baseline 0_init is unchanged.
Fresh/concurrent migration and legacy baseline tests prove existing parties default public.
Build and full disposable PostgreSQL/PostGIS + Redis suite: 42 passed, zero failures/skips.
Coverage includes auth/roles, accepted friendship recheck, participant privacy, exactly-once
acceptance creation, terminal replay, cancel race, distinct overlapping acceptance race,
expiration, timetable conflict privacy and quest-time-change versus acceptance race.
Coordinator owns socket whitelist, integrated E2E, mobile and actual deployment.
