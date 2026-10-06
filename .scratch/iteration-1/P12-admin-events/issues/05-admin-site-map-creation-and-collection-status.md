# 05: Admin site: the position on a Kakao map, events created by hand, and the Collection status

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Admin site: the event lists, and editing, publishing, cancelling and discarding an event)

## What to build

The event form gains a Kakao map. It shows the event's position, or the campus when there is none, and the Administrator sets the position by pointing on the map, so that an event at a spot no Place covers can be placed. Choosing a Place from the list moves the map's marker there too. The map is Kakao's JavaScript SDK on the admin site's registered address, the use that SDK is meant for (`.scratch/research/external-sources.md` §7.3).

An Administrator creates a Global Event by hand from an organizer's submission, with the same form, and lands on the new Draft's page, where they publish it as any Draft. The key that makes a retry safe is made when the Administrator confirms the form, and a retry of the same form sends the same key.

A page shows each Source with its last successful Collection and its last failure, so that a broken Source is noticed.

## Acceptance criteria

- [x] The map loads Kakao's JavaScript SDK with the key from `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, which `admin/.env.example` lists. It is a Client Component that receives the position and reports a new one, and nothing else of the session.
- [x] Pointing on the map sets the form's position and moves the marker there; it leaves the place name as it is. Choosing a Place or clearing the position moves or removes the marker. A position the main server refuses as outside the Campus Boundary is shown with its message.
- [ ] The map is checked by hand on `http://localhost:3100`: it appears, a point sets the position, a Place moves the marker, and the saved event holds the position. The ticket's comments record the check.
  - Not checked by hand: see For a person below.
- [x] A page for a new event holds the form of ticket 04 with the map. Confirming it sends `POST /admin/global-events` through a Server Action with an `Idempotency-Key` made at the confirmation, and leads to the new Draft's page. A retry after a failure sends the same key while the form is unchanged; a change to the form makes a new key at the next confirmation.
- [x] The Collection status page lists `GET /admin/collection-statuses`: for each Source its name, its last successful Collection and its last failure with the reason, in Asia/Seoul. A Source whose last failure came after its last success, or that never succeeded, is marked.
- [x] Page-level tests with Vitest and React Testing Library against a fake of the main server, with the map replaced by a fake that reports a chosen position: a point on the map setting the position, a Place moving the marker; creating an event, a retry sending the same key and a changed form a new one; the Collection status page with a Source that works, one that failed since and one never collected.
- [x] The admin site's README records the Kakao key, the address registered for it, the new-event page and the Collection status page.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.

## Comments

### Decisions (2026-10-06)

- **The map**: `src/kakao-maps.ts` loads Kakao's JavaScript SDK once, from `dapi.kakao.com` with `autoload=false`, and
  types only the parts the site uses (no package added); ticket 06's map uses the same loader.
  `src/app/(signed-in)/events/position-map.tsx` is the Client Component: it takes the position (or none, and then
  shows the campus) and reports a point, and nothing else. A point is kept to 6 decimals. With
  `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` set the map and the position as text replace ticket 04's two number fields;
  without it the two fields stay, so the site works without a key. A position outside the Campus Boundary is the main
  server's 400, shown as ticket 04 shows a 400.
- **Shared form**: the fields of ticket 04's form moved to `events/event-fields.tsx` and `events/fields.ts`, used by
  the event's page and the new-event page.
- **New event** at `/events/new`, linked from the Events page as New event. "Confirming the form" is pressing Create
  the Draft (no dialog: a Draft is not shown to Users and can be discarded). The key is `crypto.randomUUID()` made at
  that press and kept until the form changes. A failed fetch or a 5xx keeps the form and says to try again; 409
  `IDEMPOTENCY_KEY_IN_USE` says to wait; a 400 shows the main server's message. On success the action redirects to
  the new Draft's page.
- **Collection status** at `/collection`, a menu section between Events and Administrators. Sources carry English
  names; one the site does not know shows its enum value. Marks: Failed since the last success, Never succeeded (a
  failure and no success), Never collected (neither); the others are Working.
- **Tests**: `__tests__/event-map.test.tsx`, `new-event.test.tsx` and `collection.test.tsx`. The page tests run with
  the key empty (`vitest.config.mts`) and the map tests set one with `vi.stubEnv`; the map is replaced by
  `support/fake-maps.tsx`. The fake main server replays a used key as the main server's idempotency does, and can
  fail a creation before storing it or after (a lost answer).

### For a person

- Put the Kakao JavaScript key in `admin/.env` (`NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`), run the site on
  `http://localhost:3100` against the main server, and on an event's page check that the map appears, that a point
  sets the position, that choosing a Place moves the marker and that the saved event holds the position. Then create
  an event on New event and open the Collection status page. Record the check here. Not done by the agent: no
  browser check was run, so the SDK loading, the click and the marker are covered only by the page tests' fake map.

### Agent usage (2026-10-06)

- Agent time: about 25 minutes, an estimate, for one implementing agent; the session that ran it is not counted.
- Tokens: about 3M input, nearly all cache reads, and a few thousand output tokens, an estimate from the agent's own
  context; the transcript was not measured.
