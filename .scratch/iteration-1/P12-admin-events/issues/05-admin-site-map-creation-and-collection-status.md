# 05: Admin site: the position on a Kakao map, events created by hand, and the Collection status

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Admin site: the event lists, and editing, publishing, cancelling and discarding an event)

## What to build

The event form gains a Kakao map. It shows the event's position, or the campus when there is none, and the Administrator sets the position by pointing on the map, so that an event at a spot no Place covers can be placed. Choosing a Place from the list moves the map's marker there too. The map is Kakao's JavaScript SDK on the admin site's registered address, the use that SDK is meant for (`.scratch/research/external-sources.md` §7.3).

An Administrator creates a Global Event by hand from an organizer's submission, with the same form, and lands on the new Draft's page, where they publish it as any Draft. The key that makes a retry safe is made when the Administrator confirms the form, and a retry of the same form sends the same key.

A page shows each Source with its last successful Collection and its last failure, so that a broken Source is noticed.

## Acceptance criteria

- [ ] The map loads Kakao's JavaScript SDK with the key from `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, which `admin/.env.example` lists. It is a Client Component that receives the position and reports a new one, and nothing else of the session.
- [ ] Pointing on the map sets the form's position and moves the marker there; it leaves the place name as it is. Choosing a Place or clearing the position moves or removes the marker. A position the main server refuses as outside the Campus Boundary is shown with its message.
- [ ] The map is checked by hand on `http://localhost:3100`: it appears, a point sets the position, a Place moves the marker, and the saved event holds the position. The ticket's comments record the check.
- [ ] A page for a new event holds the form of ticket 04 with the map. Confirming it sends `POST /admin/global-events` through a Server Action with an `Idempotency-Key` made at the confirmation, and leads to the new Draft's page. A retry after a failure sends the same key while the form is unchanged; a change to the form makes a new key at the next confirmation.
- [ ] The Collection status page lists `GET /admin/collection-statuses`: for each Source its name, its last successful Collection and its last failure with the reason, in Asia/Seoul. A Source whose last failure came after its last success, or that never succeeded, is marked.
- [ ] Page-level tests with Vitest and React Testing Library against a fake of the main server, with the map replaced by a fake that reports a chosen position: a point on the map setting the position, a Place moving the marker; creating an event, a retry sending the same key and a changed form a new one; the Collection status page with a Source that works, one that failed since and one never collected.
- [ ] The admin site's README records the Kakao key, the address registered for it, the new-event page and the Collection status page.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.
