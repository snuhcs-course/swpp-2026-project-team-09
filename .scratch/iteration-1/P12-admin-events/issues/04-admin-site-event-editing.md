# 04: Admin site: the event lists, and editing, publishing, cancelling and discarding an event

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Reading Global Events: the administrative API's lists and the User's list), 02 (Changing Global Events: create, edit, publish, cancel and discard), 03 (Admin site: signing in and out, and the Administrators screen)

## What to build

The admin site's home page lists the Drafts, nearest start first, each marked with what it still needs before it can be published, and below them the published events that have not ended. An Administrator opens one and sees its source link, its post number and its original text beside a form: title, description, start, end, place name and the event's position. Choosing a Place from the list of Places fills the place name and sets the position to that Place's. The Administrator saves the form, publishes a Draft, discards a Draft that is not an event, and cancels a published event, each change confirmed first where it cannot be undone.

The form says what is wrong before anything is sent: a title is needed, the end must come after the start, and the publish button stays disabled, saying what is missing, until the event has a title, a start and a position. When another Administrator changed the event in the meantime, the page says so, keeps what the person typed and offers to load the current version.

Times are shown and entered in Asia/Seoul, whatever the browser's time zone. A collected start stored at 00:00 is often a day read without its time (main server README: Global Events), so such a start is marked as possibly lacking its time.

Setting the position on a map, creating an event by hand and the Collection status are ticket 05.

## Acceptance criteria

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

## Comments

### Decisions (2026-10-06)

- **Pages**: the home page `/` (`src/app/(signed-in)/page.tsx`) holds two tables, Drafts and Published, in the main
  server's order, with a Still needs column for the Drafts. The event's page is `/events/<id>`
  (`src/app/(signed-in)/events/[id]/`). The menu's first section is Events: `SECTIONS` entries gained `under`, the path
  their other pages start with, so that Events is marked on `/events/...` too. An unknown id, and an id that is not a
  UUID (the main server's 400), show the not-found page.
- **Main server client**: `mainServer` gained `listGlobalEvents`, `readGlobalEvent`, `editGlobalEvent`,
  `changeGlobalEventState(token, id, 'publish' | 'discard' | 'cancel', version)` and `listPlaces`. `MainServerError`
  now carries the refusal's body (`code`, `message`, `state`, `version`, `missing`). `POST /admin/global-events` is
  left to ticket 05, which creates events by hand, so that no unused call is added here.
- **Times**: `src/seoul-time.ts` converts with a fixed +09:00, since Korea has no daylight saving; the form sends
  `2026-10-12T18:30:00+09:00`. The 00:00 mark on the form follows the time field as typed, so it also shows for a
  00:00 the person typed.
- **The form** (`event-form.tsx`, its pure parts in `fields.ts`) keeps every field as typed and is keyed by the
  event's version, so it starts again from each version the page loads. Before sending it says "Enter a title.",
  "The end must be after the start." and, for a day without a time or the other way round, "Enter both the day and the
  time."; Save is disabled while one shows. The position is two number fields and Clear the position; ticket 05's map
  picker sets the same two fields. The Place list shows the first 10 Places whose name holds the search, or whose
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

### Agent usage (2026-10-06)

- Agent time: about 25 minutes, an estimate: one implementing agent and two review agents, from their transcripts.
  The session that ran them is not counted here.
- Tokens, counted from the three agents' transcripts before the commit, so an estimate:
  - Input: about 10.1M, of which 9,719,717 were cache reads, 366,002 cache writes and 146 uncached.
  - Output: 715, a lower bound, since the transcripts record only part of the output of most steps.
