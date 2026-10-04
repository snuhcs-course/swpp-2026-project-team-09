# 04: Quests for Global Events and their Sub Quests

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User chooses a published Global Event to attend and gets a Quest for it. The Quest starts with a Sub Quest for attending the event, which shows the event's time and place and follows the event when it is changed or cancelled. The User adds further Sub Quests, marks Sub Quests as done, sees the Quest leave the list once every Sub Quest has ended, and can drop the Quest.

This ticket lays down what Meetup, Party and Matching build on: the Quest with its Holders, the Sub Quests shared by all Holders, the progress each Holder keeps alone, and the rule that a User holds one Quest for a Global Event. The Quests of this ticket have one Holder; tickets 05, 07 and 09 add the others.

## Acceptance criteria

- [x] Attending a published Global Event creates a Quest with the event's title, the User as its Holder and one Sub Quest for attending. A Global Event that is not published is refused.
- [x] A User holds at most one Quest for a Global Event, which the database enforces. Attending again, also twice at the same moment, gives the same Quest.
- [x] The attending Sub Quest stores no time and no place: each read takes them from the Global Event. A changed event shows its new time and place, and a cancelled event shows the Sub Quest as cancelled and ended. A Holder cannot edit or cancel it.
- [x] A Holder adds a Sub Quest with a title, an optional start, an optional end after the start and an optional place: a Place from the list, or a latitude, a longitude and a label. Adding requires the key described in P04. A User who is not a Holder is refused.
- [x] A Holder edits or cancels a Sub Quest that a Holder added. The only Sub Quest of a Quest cannot be cancelled.
- [x] Each Sub Quest has a completion kind as a field: by time when it has an end time, by hand when it has none. The attending Sub Quest takes the Global Event's end, and is by hand when the event has none.
- [x] A Sub Quest with an end time is ended once that time has passed. This is computed when read and nothing is written. A Holder marks a Sub Quest as done, and the mark is that Holder's alone.
- [x] The Quest list returns the User's Quests, each with its title, its Global Event when it has one, its Holders and its Sub Quests with their time, place, completion kind and whether each has ended for the User. A Quest whose Sub Quests have all ended for the User is left out. One Quest can be read by itself.
- [x] Quests whose times overlap are accepted.
- [x] Dropping a Quest removes the Holder and the Holder's progress. When the last Holder drops it, the Quest is deleted with its Sub Quests.
- [x] `quests-changed` goes to every Holder of a Quest when its Holders or its Sub Quests change.
- [x] Main server tests at the API: attending and attending again, the event changed and cancelled under a Quest, each Sub Quest rule, a repeated key that leaves one Sub Quest and answers the same twice, an end time passing, marking done, the list leaving out an ended Quest, and dropping.
- [x] The main server's README records the Quest and Sub Quest routes, the one-Quest rule, how the attending Sub Quest reads the Global Event, and how a Sub Quest ends.

## Comments

### Decisions (2026-10-04)

- **Tables**: `quests` (`title`, `global_event_id` nullable, never changed, `created_at`); `quest_holders` (`quest_id`
  cascade, `user_id`, `global_event_id` copied from the Quest), unique `(quest_id, user_id)` and unique
  `(user_id, global_event_id)`, which is the one-Quest rule (NULLs are distinct, so Quests without a Global Event are not
  limited); `sub_quests` (`attending`, `title`, `starts_at`, `ends_at`, `place_id` or `latitude`/`longitude`/
  `place_label`, `created_at`), a partial unique index allowing one attending Sub Quest per Quest, and CHECKs: the
  attending one has no title, time or place and any other has a title, the end after the start, the place a Place, a
  point with its label, or neither; `sub_quest_progress` (`sub_quest_id`, `holder_id` → `quest_holders.id`, both
  cascade, `done_at`), unique `(sub_quest_id, holder_id)`. Global Event foreign keys are RESTRICT.
- The database does not check that a Holder's `global_event_id` equals the Quest's; `createForGlobalEvent` writes it,
  and a later ticket that adds a Holder must write it too.
- **Completion kind** is computed, not stored: `by_time` with an end time, `by_hand` without. A verified kind would add
  a column then.
- **Cancelling** a Sub Quest a Holder added deletes it with its progress. Only the attending Sub Quest reads as
  `cancelled`, once its Global Event is no longer published.
- **Routes**: `POST /quests { globalEventId }` → 201 Quest (same Quest again, no key); `GET /quests` → Quests not ended
  for the User, in creation order; `GET /quests/:questId`; `DELETE /quests/:questId` → 204;
  `POST /quests/:questId/sub-quests` (`Idempotency-Key` required) → 201 Sub Quest;
  `PUT /quests/:questId/sub-quests/:subQuestId` (same body) → 200 Sub Quest;
  `DELETE /quests/:questId/sub-quests/:subQuestId` → 204; `POST /quests/:questId/sub-quests/:subQuestId/done` → 204.
- **Sub Quest body**: `{ title (1–50), startsAt?, endsAt?, place?: { placeId } | { latitude, longitude, label (1–50) } }`,
  left out the same as null.
- **Shapes**: Quest `{ id, title, globalEvent: { id, title } | null, holders: [{ id, name, department }], subQuests }`;
  Sub Quest `{ id, attending, title, startsAt, endsAt, place: { placeId, label, latitude, longitude } | null,
  completion: 'by_time' | 'by_hand', cancelled, done, ended }`, `done` and `ended` the reader's.
- **Refusals**: `GLOBAL_EVENT_NOT_FOUND` 404 (unknown or not published), `QUEST_NOT_FOUND` 404 (also for a User who
  is not a Holder), `SUB_QUEST_NOT_FOUND` 404, `PLACE_NOT_FOUND` 404, `ATTENDING_SUB_QUEST` 409, `LAST_SUB_QUEST` 409.
- **`quests-changed`** goes to the Holders before the change, the actor included, on attending (first time only),
  adding, editing and cancelling a Sub Quest, and dropping. A mark of done sends nothing.
- **Clock**: the provider `CLOCK` (`src/quests/clock.ts`, `{ now(): Date }`) gives the time Sub Quests end by; a test
  moves it with `vi.spyOn(app.get<Clock>(CLOCK), 'now')`.
- **For later tickets**, `QuestsService` (exported by `QuestsModule`), each taking the transaction client:
  `lock(questId, tx)`, `heldFor(userId, globalEventId, tx): string | null`,
  `createForGlobalEvent(globalEvent, holderIds, tx): questId`, `removeHolder(questId, userId, tx)` (deletes the Quest
  when nobody holds it), `holderIds(questId, tx)`. Attending locks the User's row (`UsersService.lock`) before checking
  for a held Quest. Ticket 07 adds a Quest with an ordinary first Sub Quest, 05 and 09 a Holder added to an existing
  Quest and the question of a Shared Quest, 05 whether a Quest has Sub Quests ahead, 09 the match identifier, 11 the
  Class Quest mark in the list.
