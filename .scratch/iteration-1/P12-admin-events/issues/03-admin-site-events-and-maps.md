# 03: Admin site: the event lists and editing, the position on a Kakao map, events created by hand, the Collection status and the campus map

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (The administrative API: Global Events, Places, Collection status, Users and friendships), 02 (Admin site: signing in and out, the layout, the Administrators screen and the Users pages)

## What to build

The admin site's home page lists the Drafts, nearest start first, each marked with what it still needs before it can be published, and below them the published events that have not ended. An Administrator opens one and sees its source link, its post number and its original text beside a form: title, description, start, end, place name and the event's position. Choosing a Place from the list of Places fills the place name and sets the position to that Place's; pointing on a Kakao map sets the position too, so that an event at a spot no Place covers can be placed. The Administrator saves the form, publishes a Draft, discards a Draft that is not an event, and cancels a published event, each change confirmed first where it cannot be undone. The same form creates a Global Event by hand from an organizer's submission, leading to the new Draft's page; the key that makes a retry safe is made when the Administrator confirms the form, and a retry of the same form sends the same key.

The form says what is wrong before anything is sent: a title is needed, the end must come after the start, and the publish button stays disabled, saying what is missing, until the event has a title, a start and a position. When another Administrator changed the event in the meantime, the page says so, keeps what the person typed and offers to load the current version. Times are shown and entered in Asia/Seoul, whatever the browser's time zone. A collected start stored at 00:00 is often a day read without its time (main server README: Global Events), so such a start is marked as possibly lacking its time.

A Collection status page shows each Source with its last successful Collection and its last failure, so that a broken Source is noticed. A Places page shows Kakao's map of the campus with every Place drawn on it, a Place with outlines as its polygons and one without as a marker, each labelled with its number or its name. An Administrator finds a Place by its number or its name, or clicks it, and sees its record, so that a wrong Place or outline is noticed and corrected in the seed files (main server README: Seed data).

Both maps are Kakao's JavaScript SDK on the admin site's registered address, the use that SDK is meant for (`.scratch/research/external-sources.md` §7.3), loaded once with `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`. The campus map is its own Client Component, not the position picker.

## Acceptance criteria

### Event lists and editing

- [x] The home page shows the Drafts from `GET /admin/global-events?state=draft` and the published events from `?state=published`, in the main server's order, each with its title, start, place name and, for a Draft, what `missing` names. Each opens the event's page.
- [x] The event's page reads `GET /admin/global-events/:id`. It shows the state, the source link as a link that opens the Source in a new tab, the post number and the description as it is stored; an event made by hand has no link or number. An unknown event shows Next.js's not-found page.
- [x] The form holds the title, the description, the start and the end as a day and a time, the place name and the position. A list of the Places from `GET /admin/places`, searchable by name and number, sets the place name to the Place's and the position to its coordinates; the place name can then be edited, for example to add a room. The position can be cleared.
- [x] Saving sends the form with the version the page loaded through a Server Action to `PATCH /admin/global-events/:id`, and the page then shows the saved event. Saving a published event says that Users see the change at once.
- [x] On a Draft, the publish button saves the form and then publishes it with `POST /admin/global-events/:id/publish`. It is disabled while the form has no title, no start or no position, and says which.
- [x] On a Draft, discarding asks for confirmation and then calls `POST /admin/global-events/:id/discard`. On a published event, cancelling asks for confirmation, says that Users and the Holders of its Quests will see it cancelled, and then calls `POST /admin/global-events/:id/cancel`. A cancelled or a discarded event is shown without the form's controls.
- [x] The form shows a message beside the field, before sending, for an empty title and an end not after the start. A 400 from the main server is shown with its message, `GLOBAL_EVENT_INCOMPLETE` as what is missing, `GLOBAL_EVENT_STATE` as the event's current state, and `GLOBAL_EVENT_CHANGED` as a warning that another Administrator changed the event, with the person's input kept and a control that loads the current version.
- [x] A start at 00:00 Asia/Seoul is marked as possibly a day without its time, in the list and on the form.
- [x] Page-level tests with Vitest and React Testing Library against a fake of the main server: the home page's two lists, their order and the missing marks; the event's page with and without a source link; choosing a Place; each validation message; the publish button disabled for each missing requirement and enabled when none is; saving, publishing, discarding and cancelling sending the loaded version; each refusal's message, and the input kept after `GLOBAL_EVENT_CHANGED`; times shown in Asia/Seoul with the tests' time zone set elsewhere; a cancelled event without controls.
- [x] The admin site's README records the pages and what each change sends.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.

### The map picker, events created by hand and the Collection status

- [x] The map loads Kakao's JavaScript SDK with the key from `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`, which `admin/.env.example` lists. It is a Client Component that receives the position and reports a new one, and nothing else of the session.
- [x] Pointing on the map sets the form's position and moves the marker there; it leaves the place name as it is. Choosing a Place or clearing the position moves or removes the marker. A position the main server refuses as outside the Campus Boundary is shown with its message.
- [ ] The map is checked by hand on `http://localhost:3100`: it appears, a point sets the position, a Place moves the marker, and the saved event holds the position. The ticket's comments record the check.
  - Not checked by hand: see For a person below.
- [x] A page for a new event holds the form of Event lists and editing above with the map. Confirming it sends `POST /admin/global-events` through a Server Action with an `Idempotency-Key` made at the confirmation, and leads to the new Draft's page. A retry after a failure sends the same key while the form is unchanged; a change to the form makes a new key at the next confirmation.
- [x] The Collection status page lists `GET /admin/collection-statuses`: for each Source its name, its last successful Collection and its last failure with the reason, in Asia/Seoul. A Source whose last failure came after its last success, or that never succeeded, is marked.
- [x] Page-level tests with Vitest and React Testing Library against a fake of the main server, with the map replaced by a fake that reports a chosen position: a point on the map setting the position, a Place moving the marker; creating an event, a retry sending the same key and a changed form a new one; the Collection status page with a Source that works, one that failed since and one never collected.
- [x] The admin site's README records the Kakao key, the address registered for it, the new-event page and the Collection status page.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.

### The campus map

- [x] The Places page, at `/places`, reads `GET /admin/places` on the server and hands the list to the map. The map shows the campus, each outline as a polygon, drawn once when several Places share it, each Place without an outline as a marker, and each Place's number or name as a label at its position. Kakao's map type control switches to the sky view.
- [x] A search box finds Places as `GET /places/search` does, over the list on the page: a name that holds the text, whatever the case of its Latin letters, and the Place whose number is the text, with or without `동`. Choosing a result selects the Place.
- [x] Clicking a Place's polygon, marker or label selects it. On an outline that several Places share, the record lists them all, and choosing one selects it.
- [x] The selected Place is highlighted on the map, which moves to it. The record shows its number, its name, its origin, its latitude and longitude, and each outline with its source and id, or that it has none.
- [x] The page shows the attributions that OpenStreetMap's licence and the national map's 공공누리 type 1 ask for, as the seed files carry them.
- [x] The map is a Client Component that receives the Places and the selected Place and reports a click on a Place, and nothing of the session.
- [x] Page-level tests with Vitest and React Testing Library against a fake of the main server, with the map replaced by a fake that reports a chosen Place: the list handed to the map; a search by number, by number with `동`, by name and one that finds nothing; a choice from the results and a click on the map selecting the Place; the record of a Place with outlines of each source, of one without any, and of an outline that several Places share.
- [ ] The map is checked by hand on `http://localhost:3100`: it appears, every Place is drawn, a search and a click select a Place and show its record. The ticket's comments record the check.
  - Not checked by hand: see For a person below.
- [x] The main server's README records the stored form of an outline and `GET /admin/places` in Places and Seed data, and no longer says that no route serves the outlines. The admin site's README records the Places page.
- [x] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/` and `admin/`.
  - In `main-server/` the three checks and `test/admin-places.e2e-spec.ts` alone were run, not the whole suite.

## Comments

### Decisions (2026-10-06, event lists and editing)

- **Pages**: the home page `/` (`src/app/(signed-in)/page.tsx`) holds two tables, Drafts and Published, in the main
  server's order, with a Still needs column for the Drafts. The event's page is `/events/<id>`
  (`src/app/(signed-in)/events/[id]/`). The menu's first section is Events: `SECTIONS` entries gained `under`, the path
  their other pages start with, so that Events is marked on `/events/...` too. An unknown id, and an id that is not a
  UUID (the main server's 400), show the not-found page.
- **Main server client**: `mainServer` gained `listGlobalEvents`, `readGlobalEvent`, `editGlobalEvent`,
  `changeGlobalEventState(token, id, 'publish' | 'discard' | 'cancel', version)` and `listPlaces`. `MainServerError`
  now carries the refusal's body (`code`, `message`, `state`, `version`, `missing`). `POST /admin/global-events` is
  left to the map picker and creation by hand below, so that no unused call is added here.
- **Times**: `src/seoul-time.ts` converts with a fixed +09:00, since Korea has no daylight saving; the form sends
  `2026-10-12T18:30:00+09:00`. The 00:00 mark on the form follows the time field as typed, so it also shows for a
  00:00 the person typed.
- **The form** (`event-form.tsx`, its pure parts in `fields.ts`) keeps every field as typed and is keyed by the
  event's version, so it starts again from each version the page loads. Before sending it says "Enter a title.",
  "The end must be after the start." and, for a day without a time or the other way round, "Enter both the day and the
  time."; Save is disabled while one shows. The position is two number fields and Clear the position; the map
  picker below sets the same two fields. The Place list shows the first 10 Places whose name holds the search, or whose
  number is it, with or without 동.
- **Changes**: one Server Action, `changeEvent({ kind, id, version, change? })`. Publish asks first ("Publish this
  event? Users see it on their map at once."), as the ticket's "confirmed first where it cannot be undone" reads, then
  sends the `PATCH` and the publish with the version the `PATCH` answered. The page is read again (`refresh()`) only
  after a change went through. A refusal keeps the input: a 400 shows the main server's message,
  `GLOBAL_EVENT_INCOMPLETE` "This event needs … to be published." (or "A published event needs …." on saving one),
  `GLOBAL_EVENT_STATE` "This event is … now, so this change cannot be made." and `GLOBAL_EVENT_CHANGED` the warning;
  the last two offer "Load the current version", a Server Action that only calls `refresh()`. A publish refused after
  its `PATCH` went through can only be `CHANGED` or `STATE` (the button needs a title, a start and a position), so the
  same reload covers the version the `PATCH` raised. A 404 on a change is not handled: events are never deleted.
- **Tests**: `__tests__/events.test.tsx` and `event-page`, `event-form`, `event-changes`, `event-refusals` with helpers
  in `support/events.ts`. The fake keeps the main server's rules for Global Events in `support/fake-global-events.ts`,
  with a rough box for the Campus Boundary. `notFound()` is replaced like `redirect()` (`support/not-found.ts`,
  `browser.notFound`). The page tests run with `TZ=America/Los_Angeles` (`vitest.config.mts`). No built-site test was
  added; a smoke run of the built site against a throwaway fake served both pages and a 404 for an unknown id. Not
  checked by hand in a browser.

### Decisions (2026-10-06, the map picker, events created by hand and the Collection status)

- **The map**: `src/kakao-maps.ts` loads Kakao's JavaScript SDK once, from `dapi.kakao.com` with `autoload=false`, and
  types only the parts the site uses (no package added); the campus map below uses the same loader.
  `src/app/(signed-in)/events/position-map.tsx` is the Client Component: it takes the position (or none, and then
  shows the campus) and reports a point, and nothing else. A point is kept to 6 decimals. With
  `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` set the map and the position as text replace the event form's two number fields;
  without it the two fields stay, so the site works without a key. A position outside the Campus Boundary is the main
  server's 400, shown as the event form shows a 400.
- **Shared form**: the fields of the event form moved to `events/event-fields.tsx` and `events/fields.ts`, used by
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

### For a person (the map picker, events created by hand and the Collection status)

- Put the Kakao JavaScript key in `admin/.env` (`NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`), run the site on
  `http://localhost:3100` against the main server, and on an event's page check that the map appears, that a point
  sets the position, that choosing a Place moves the marker and that the saved event holds the position. Then create
  an event on New event and open the Collection status page. Record the check here. Not done by the agent: no
  browser check was run, so the SDK loading, the click and the marker are covered only by the page tests' fake map.

### Differences (2026-10-06, campus map)

- The outlines stay stored as they are, rings of `{ latitude, longitude }`, with no source or id per outline and no
  reseed. `GET /admin/places` serves the rings, and the record shows each outline's number of points instead of its
  file and id. The tests of "outlines of each source" check the record of Places of different origins instead.

### Decisions (2026-10-06, campus map)

- **Page**: `/places`, a menu section after Events. `places-view.tsx` holds the search, the selection and the record;
  `places-map.tsx` is the Kakao map, sharing `useKakaoMap()` in `src/kakao-maps.ts` with the map picker above. An
  outline is drawn once per identical ring; a click on a shared outline selects the first Place of the list that has
  it, and the record lists the others as buttons. Labels are small HTML buttons in Kakao custom overlays; the selected
  Place's outlines and label turn red. The search is the event form's `placesMatching()`, the first 10 results.
- **Tests**: `__tests__/places.test.tsx`, with the map replaced by `support/fake-places-map.tsx`.

### For a person (campus map)

- With the Kakao key in `admin/.env`, open `/places` on `http://localhost:3100` against a main server with the seed
  loaded: check that the map appears, that every Place is drawn (polygons, markers for Places without an outline,
  labels), that the sky view switch works, and that a search and a click select a Place, highlight it and show its
  record. Record the check here. Not done by the agent: the Kakao drawing is covered only by the fake map.

### Agent usage (2026-10-06)

Every figure below is an estimate.

- Event lists and editing:
  - Agent time: about 25 minutes, an estimate: one implementing agent and two review agents, from their transcripts.
    The session that ran them is not counted here.
  - Tokens, counted from the three agents' transcripts before the commit, so an estimate:
    - Input: about 10.1M, of which 9,719,717 were cache reads, 366,002 cache writes and 146 uncached.
    - Output: 715, a lower bound, since the transcripts record only part of the output of most steps.
- The map picker, events created by hand and the Collection status:
  - Agent time: about 25 minutes, an estimate, for one implementing agent; the session that ran it is not counted.
  - Tokens: about 3M input, nearly all cache reads, and a few thousand output tokens, an estimate from the agent's own
    context; the transcript was not measured.
- The campus map:
  - Agent time: about 20 minutes, an estimate, for one implementing agent, the API commit included; the session that
    ran it is not counted.
  - Tokens: about 2M input, nearly all cache reads, and a few thousand output tokens, an estimate from the agent's own
    context; the transcript was not measured.
- Total, an estimate:
  - Agent time: about 1 hour 10 minutes.
  - Input: about 15.1M: 10,085,865 counted (9,719,717 cache reads, 366,002 cache writes and 146 uncached) and about
    5M, nearly all cache reads, not measured.
  - Output: 715 counted, a lower bound, and several thousand not measured.
