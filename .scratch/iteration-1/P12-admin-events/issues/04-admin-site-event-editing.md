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

- [ ] The home page shows the Drafts from `GET /admin/global-events?state=draft` and the published events from `?state=published`, in the main server's order, each with its title, start, place name and, for a Draft, what `missing` names. Each opens the event's page.
- [ ] The event's page reads `GET /admin/global-events/:id`. It shows the state, the source link as a link that opens the Source in a new tab, the post number and the description as it is stored; an event made by hand has no link or number. An unknown event shows Next.js's not-found page.
- [ ] The form holds the title, the description, the start and the end as a day and a time, the place name and the position. A list of the Places from `GET /admin/places`, searchable by name and number, sets the place name to the Place's and the position to its coordinates; the place name can then be edited, for example to add a room. The position can be cleared.
- [ ] Saving sends the form with the version the page loaded through a Server Action to `PATCH /admin/global-events/:id`, and the page then shows the saved event. Saving a published event says that Users see the change at once.
- [ ] On a Draft, the publish button saves the form and then publishes it with `POST /admin/global-events/:id/publish`. It is disabled while the form has no title, no start or no position, and says which.
- [ ] On a Draft, discarding asks for confirmation and then calls `POST /admin/global-events/:id/discard`. On a published event, cancelling asks for confirmation, says that Users and the Holders of its Quests will see it cancelled, and then calls `POST /admin/global-events/:id/cancel`. A cancelled or a discarded event is shown without the form's controls.
- [ ] The form shows a message beside the field, before sending, for an empty title and an end not after the start. A 400 from the main server is shown with its message, `GLOBAL_EVENT_INCOMPLETE` as what is missing, `GLOBAL_EVENT_STATE` as the event's current state, and `GLOBAL_EVENT_CHANGED` as a warning that another Administrator changed the event, with the person's input kept and a control that loads the current version.
- [ ] A start at 00:00 Asia/Seoul is marked as possibly a day without its time, in the list and on the form.
- [ ] Page-level tests with Vitest and React Testing Library against a fake of the main server: the home page's two lists, their order and the missing marks; the event's page with and without a source link; choosing a Place; each validation message; the publish button disabled for each missing requirement and enabled when none is; saving, publishing, discarding and cancelling sending the loaded version; each refusal's message, and the input kept after `GLOBAL_EVENT_CHANGED`; times shown in Asia/Seoul with the tests' time zone set elsewhere; a cancelled event without controls.
- [ ] The admin site's README records the pages and what each change sends.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `admin/`.
