# 01: Favorite Events, and a map of only today's and favorite events

Parent: [spec](../spec.md) ("Events on the map", "Global Events API", "Which event pins stay", "The ☆ toggle")
Status: ready-for-agent
Blocked by: None (can start immediately).
Prepared before the acceptance tests: yes. Done when the pull request into `4.0/Main` is open; whether it merges and ships before an acceptance test is decided by the team later.
Native files: no
PR assignee: Jaehyun0320

## What to build

A User can star a Global Event, and the map stops drawing every event that has not ended. The 행사 tab's and chat's event items get a ☆ toggle at the top right (the source mark moves to its left), and a single event's card on the map gets one left of the close button. A starred event shows on the map as a star pin until it ends. Besides Favorite Events, the map keeps only events held today in Seoul time, as today's plain pin; an event of several days counts only on its first and last day. Starring is optimistic and rolls back with a toast when saving fails. Favorites are kept on the server, so they survive a reinstall.

The one migration of this feature lands here with both changes: `global_events.published_at` (nullable, not yet written; ticket 02 records it) and `global_event_favorites (user_id, global_event_id, created_at)`, unique on the pair and deleted with the User or the event. Its place in the team's order of `schema.prisma` changes is agreed with the team first (work split §4).

## Acceptance criteria

- [ ] The migration adds both changes; its order among the team's schema changes is agreed and written in the pull request.
- [ ] `GET /global-events` returns `favorite` for the caller (and `publishedAt`, null for now) on each event.
- [ ] `PUT` and `DELETE /global-events/{id}/favorite` set and clear a favorite, are idempotent, and refuse an event that is not published.
- [ ] One pure function decides which event pins stay and their look (`favorite` or `plain` here; ticket 02 adds `new`), from the events, now and each event's `favorite`. Today is in Seoul time; an event of several days stays only on its first and last day.
- [ ] The star look is a new JS marker look; no native file changes.
- [ ] The ☆ toggle is on the 행사 tab's event item (so also in chat) and on a single event's map card only; a grouped pin's list rows show ★ without a toggle. The hit area is 44pt. The icon set gains a fillable `star`.
- [ ] Same-Place grouping keeps its behaviour, with a group showing a star when any member is a Favorite Event.
- [ ] Cancelled events still leave at once; an event the User goes to with a 파티 still shows as the 파티's pin.
- [ ] Tests (ADR 0007): main-server integration for the API (beside `published-global-events` and `global-events`); a unit test of the pin function across today, the several-day rule and Seoul midnight; an app integration test for the optimistic toggle and its rollback.
- [ ] The map files belong to package B (work split §4); B is told before the work starts, and conflicts are resolved when they happen.
- [ ] The "Events on the map" row of `he-revision-log.md` gets this pull request.

## Comments
