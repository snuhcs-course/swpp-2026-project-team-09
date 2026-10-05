# 04: Quests, their Sub Quests and joining them

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User chooses a published Global Event to attend and gets a Quest for it, or makes a Quest of their own with a title and a first Sub Quest. The Quest for a Global Event starts with a Sub Quest for attending the event, which shows the event's time and place and follows the event when it is changed or cancelled. The User adds further Sub Quests, marks Sub Quests as done, sees the Quest leave the list once every Sub Quest has ended, and can drop the Quest.

A Quest is what people gather around. Every Quest has a Leader, a capacity and a Join Policy. Others find the Open and Approval Quests in the list of recruiting Quests, and join an Open one at once, within its capacity and under the rule that a User holds one Quest for a Global Event.

This ticket lays down what Meetup, Party and Matching build on: the Quest with its Holders and its Leader, the Sub Quests shared by all Holders, the progress each Holder keeps alone, and the rule that a User holds one Quest for a Global Event. Asking to join, invitations and the Leader's controls are ticket 14; tickets 07 and 09 create Quests for several Users, and ticket 15 places requesters of Matching into Open Quests.

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
- [x] A User makes a Quest of their own with a title and a first Sub Quest of the shape a Holder adds: a title, an optional start, an optional end after the start and an optional place. It has no Global Event and no attending Sub Quest, and the User is its only Holder. Making requires the key described in P04.
- [x] Every stored Quest has a Leader, a capacity from 1 to 8 and a Join Policy, Open, Approval or Closed. A Quest a User makes takes the capacity and the Join Policy the User gives, 4 and Closed when left out. A Quest from attending a Global Event is Closed with capacity 4. In both the User is the Leader.
- [x] A Quest, in the list and read by itself, shows its Leader, its capacity, its Join Policy and its Holders in the order they entered. A Class Quest has no Leader and is never in the list of recruiting Quests.
- [x] When the Leader drops the Quest, the Holder who entered earliest becomes Leader.
- [x] The list of recruiting Quests returns the Open and Approval Quests that have a Sub Quest ahead, the newest first, and the same for one Global Event. A Sub Quest is ahead while it is not cancelled and its end has not passed; a Holder's mark of done does not count. A Closed Quest and a Quest the reader holds are in neither.
- [x] Each entry of the list has the Quest's title, its Global Event if any, its Leader, the number of Holders, the capacity, the Join Policy, and its first Sub Quest ahead with its time and place.
- [x] A User joins an Open Quest and becomes a Holder at once. An Approval Quest, a Closed or unknown Quest, a Quest the User holds and a Quest without a Sub Quest ahead are refused, each with a code.
- [x] The capacity is checked inside the transaction that adds the Holder, and a full Quest refuses with a code. Two Users joining the last free place at the same moment leave one of them a Holder.
- [x] On joining a Quest for a Global Event, a Quest the User held alone for that event is deleted, with its Sub Quests and the User's progress. A User who holds a Shared Quest for that event is refused with a code and keeps it. A Quest without a Global Event has no such rule.
- [x] Joining a Quest changes no Party.
- [x] `quests-changed` goes to every Holder when a User joins or the Leader changes.
- [x] Main server tests at the API: making a Quest and a repeated key that leaves one Quest and answers the same twice, the settings each kind of Quest starts with, the Leader's succession, the list and the list for one Global Event with each Quest it leaves out, joining and each refusal, a Quest held alone replaced on joining, a Shared Quest kept, the last free place taken by two at the same moment, and one User joining two Quests of one Global Event at the same moment.
- [x] The main server's README records making a Quest, the Leader, the capacity and the Join Policy with the settings each kind of Quest starts with, the list of recruiting Quests, and joining with the one-Quest rule.

## Comments

### Decisions (2026-10-04)

- **Tables**: `quests` (`title`, `global_event_id` nullable, never changed, `leader_id` → `users`, `capacity` 1–8 by a
  CHECK, default 4, `join_policy` of the enum `join_policy` (`open`, `approval`, `closed`), default `closed`,
  `created_at`); `quest_holders` (`quest_id` cascade, `user_id`, `global_event_id` copied from the Quest, `joined_at`
  `TIMESTAMP(6)` from `clock_timestamp()`, so that Holders created in one statement keep their order), unique
  `(quest_id, user_id)` and unique
  `(user_id, global_event_id)`, which is the one-Quest rule (NULLs are distinct, so Quests without a Global Event are not
  limited); `sub_quests` (`attending`, `title`, `starts_at`, `ends_at`, `place_id` or `latitude`/`longitude`/
  `place_label`, `created_at`), a partial unique index allowing one attending Sub Quest per Quest, and CHECKs: the
  attending one has no title, time or place and any other has a title, the end after the start, the place a Place, a
  point with its label, or neither; `sub_quest_progress` (`sub_quest_id`, `holder_id` → `quest_holders.id`, both
  cascade, `done_at`), unique `(sub_quest_id, holder_id)`. Global Event foreign keys are RESTRICT.
- The database does not check that a Holder's `global_event_id` equals the Quest's, nor that the Leader is a Holder;
  the creations and `RecruitingService.enter` write them. The enum is named `join_policy`, not after the Quest, so that
  the Party can use it too.
- **Completion kind** is computed, not stored: `by_time` with an end time, `by_hand` without. A verified kind would add
  a column then.
- **Cancelling** a Sub Quest a Holder added deletes it with its progress. Only the attending Sub Quest reads as
  `cancelled`, once its Global Event is no longer published.
- **Routes**: `POST /quests { globalEventId }` → 201 Quest (same Quest again, no key);
  `POST /quests/own { title (1–50), subQuest: <Sub Quest body>, capacity? (1–8), joinPolicy? }` (`Idempotency-Key`
  required) → 201 Quest, a route apart because `@Idempotent({ required })` cannot depend on the body;
  `GET /quests/recruiting[?globalEventId=]` → recruiting entries; `POST /quests/:questId/join` → 201 Quest (no key);
  `GET /quests` → Quests not ended for the User, in creation order; `GET /quests/:questId`; `DELETE /quests/:questId` →
  204;
  `POST /quests/:questId/sub-quests` (`Idempotency-Key` required) → 201 Sub Quest;
  `PUT /quests/:questId/sub-quests/:subQuestId` (same body) → 200 Sub Quest;
  `DELETE /quests/:questId/sub-quests/:subQuestId` → 204; `POST /quests/:questId/sub-quests/:subQuestId/done` → 204.
- **Sub Quest body**: `{ title (1–50), startsAt?, endsAt?, place?: { placeId } | { latitude, longitude, label (1–50) } }`,
  left out the same as null.
- **Shapes**: Quest `{ id, title, globalEvent: { id, title } | null, leader: { id, name, department }, capacity,
  joinPolicy, holders: [{ id, name, department }] in the order they entered, subQuests }` (ticket 11's Class Quest
  answers `leader: null`); recruiting entry `{ id, title, globalEvent, leader, holderCount, capacity, joinPolicy,
  nextSubQuest: { id, attending, title, startsAt, endsAt, place } }`, the first Sub Quest ahead in the Quest's order;
  Sub Quest `{ id, attending, title, startsAt, endsAt, place: { placeId, label, latitude, longitude } | null,
  completion: 'by_time' | 'by_hand', cancelled, done, ended }`, `done` and `ended` the reader's.
- **Refusals**: `GLOBAL_EVENT_NOT_FOUND` 404 (unknown or not published), `QUEST_NOT_FOUND` 404 (also for a User who
  is not a Holder, and for joining a Closed or unknown Quest), `SUB_QUEST_NOT_FOUND` 404, `PLACE_NOT_FOUND` 404,
  `ATTENDING_SUB_QUEST` 409, `LAST_SUB_QUEST` 409; on entering, `QUEST_NOT_OPEN` 409 (joining an Approval Quest),
  `ALREADY_HOLDER` 409, `QUEST_ENDED` 409 (no Sub Quest ahead), `QUEST_FULL` 409, `SHARED_QUEST_HELD` 409.
- **`quests-changed`** goes to the Holders before the change, the actor included, on attending (first time only),
  making, adding, editing and cancelling a Sub Quest, and dropping, which also covers a new Leader; on joining, to the
  Holders after it. A mark of done sends nothing.
- **Leader's succession**: `removeHolder` passes the role to the Holder who entered earliest (`joined_at`, then `id`).
- **Sub Quest ahead**: not cancelled and its end not passed; a Holder's mark of done does not count
  (`hasSubQuestsAhead` in `dto/quest.dto.ts`).
- **Clock**: the provider `CLOCK` (`src/quests/clock.ts`, `{ now(): Date }`) gives the time Sub Quests end by; a test
  moves it with `vi.spyOn(app.get<Clock>(CLOCK), 'now')`.
- **For later tickets**, `QuestsService` (exported by `QuestsModule`), each taking the transaction client:
  `lock(questId, tx)`, `heldFor(userId, globalEventId, tx): string | null`,
  `createForGlobalEvent(globalEvent, holderIds, tx, settings?: QuestSettings): Promise<string>`,
  `createWithSubQuest(subQuest: SubQuestColumns, holderIds, tx, settings?: QuestSettings & { title?: string }):
  Promise<string>` (titled as the Sub Quest unless `title` is given), where
  `QuestSettings = { leaderId?, capacity?, joinPolicy? }` defaults to the first Holder, 4 and `closed`, and the Holders
  enter in the order given; `removeHolder(questId, userId, tx)` (passes the Leader's role on, deletes the Quest when
  nobody holds it); `holderIds(questId, tx)` in the order they entered;
  `freeForSharedQuest(userId: string, globalEventId: string, tx: Prisma.TransactionClient): Promise<boolean>`;
  `withSubQuestsAhead(questIds, tx?): Promise<string[]>`; `columnsOf(content, tx)`. Attending locks the User's row
  (`UsersService.lock`) before checking for a held Quest.
- **Entering a Quest**: `RecruitingService` (exported by `QuestsModule`) has
  `enter(questId: string, userId: string, tx: Prisma.TransactionClient, admits?: (quest: Quest) => void):
  Promise<string[]>`, which every way into a Quest calls: joining here, ticket 14's accepted request and invitation,
  ticket 15's placement. It locks the User, then the Quest and the Quest the User holds for its Global Event in id
  order (so lock no Quest before it), refuses `QUEST_NOT_FOUND`, `ALREADY_HOLDER`, then whatever `admits` throws (the
  way's own check, such as the Join Policy), then `QUEST_ENDED`, `QUEST_FULL`, `SHARED_QUEST_HELD`; deletes a Quest held
  alone for the event; adds the Holder with the Global Event copied; and answers the Holders to send `quests-changed`
  to, the User included. Ticket 15 answers a User who already holds the Quest as entered, so it checks before calling.
- `SubQuestsService` holds a Holder's Sub Quest actions, and `QuestsService.inQuest` and `changeShared` the locking and
  signalling they share, so that each service stays within the lint's 300 lines.
- Ticket 09 adds the match identifier, 11 the Class Quest mark in the list, 14 the Leader's controls, requests and
  invitations.

### Agent usage (2026-10-04)

- Agent time: about 15 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 13,712,948, of which 13,497,766 were cache reads, 215,028 cache writes and 154 uncached.
  - Output: 38,483, a lower bound, since the transcript records only part of the output of most steps.

### Agent usage (2026-10-05)

- Agent time: about 33 minutes, an estimate: the agent that reworked the ticket for making a Quest and joining about 19 minutes, and the agent that rewrote the P08 documents for it about 14 minutes, counted here once for the tickets it touched. The session that ran them is not counted here.
- Tokens, counted from the two agents' transcripts:
  - The reworking agent: input 17,129,353, of which 16,878,067 were cache reads, 251,104 cache writes and 182 uncached; output 25,891.
  - The documents' agent: input 7,926,565, of which 7,705,953 were cache reads, 220,506 cache writes and 106 uncached; output 53,031.
  - The outputs are lower bounds, since the transcripts record only part of the output of most steps.
