# 09: Matching: rounds, groups and the Shared Quest

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 08 (Matching: asking, withdrawing and the state of a request)

## What to build

The waiting requests of ticket 08 become matches. Every minute the match server runs a round: it drops the requests that no longer stand, groups the rest by Global Event and size, and asks the main server to create one Shared Quest for each group. The matched Users are told by a signal and find the Quest in their list; a Quest one of them held alone for the event is merged into it.

Grouping is one module with one question: given the waiting requests of one Global Event and size, which groups are formed? Its rule puts together the requests that share the most interest hashtags. Grouping by AI replaces that module in a later iteration, and nothing outside it changes then.

A match is never lost between the two servers: the match server keeps asking until the main server has answered, and the main server creates the Quest of a match once.

## Acceptance criteria

- [x] A round runs every minute. The interval is a setting of the match server, listed in the example settings file as provisional. One match server runs a round at a time, however many run.
- [x] A round first asks the main server which of the waiting requests still stand. The main server answers the ones whose Global Event is published and has not started and whose User holds no Shared Quest for it. The match server expires the others. When the main server does not answer, the round groups nothing.
- [x] The grouping module takes the waiting requests of one Global Event and size, each with its hashtags and the time it arrived, and returns groups of exactly that size. It forms as many groups as it can. It puts together the requests that share the most hashtags, and the earlier request first where they share the same. The requests left over wait for the next round.
- [x] The module is called only when at least as many requests wait as one group takes. It is replaced as a whole in tests, and the match server's README names it as the place where grouping by AI lands.
- [x] Each group is stored as a match awaiting its Quest, and its requests are matched. The match server asks the main server to create the Shared Quest and repeats the request until it is answered, also after a restart.
- [x] The main server creates one Quest for the match's Global Event, held by the matched Users, with the Sub Quest for attending. It stores the match identifier with the Quest, unique in the database, and a repeated request returns the Quest created the first time.
- [x] A Quest a matched User held alone for the Global Event is deleted, with its Sub Quests and the User's progress. A matched User who holds a Shared Quest for it by then keeps that one and is left out of the new one.
- [x] When the Global Event has started or was cancelled by the time the request arrives, the main server answers so and creates nothing. The match server closes the match, expires its requests and does not ask again.
- [x] `matching-changed` and `quests-changed` go to the Holders of the new Quest. The state of a matched request names its Quest.
- [x] Module tests: a pool that shares hashtags, a pool that shares none grouped in order of arrival, a pool larger than one group, a remainder that waits, and requests of different sizes never grouped together.
- [x] Match server tests, with the main server replaced at the fetch boundary: requests expired by the main server's answer, groups formed and asked for, a main server that answers only at a later attempt, a restart between the match and the answer, and a match the main server closes.
- [x] Main server tests at the API: the answer to which requests stand, a Quest created with its Holders, the same match twice giving one Quest, a Quest held alone merged, a User with a Shared Quest left out, a started and a cancelled event refused, and the two signals on Redis.
- [x] The READMEs record their part: the round, the module and its rule, the states of a match and the repeated request in the match server's; the two routes for the match server and the match identifier in the main server's.

## Comments

### Decisions (2026-10-04)

- **Settings**: the match server's `MAIN_SERVER_URL` (`http://main-server:3000` inside Compose) and
  `ROUND_INTERVAL_SECONDS` (60, provisional). Its calls to the main server carry `MATCH_SERVER_TOKEN`, ticket 08's
  secret.
- **Main server routes** (the match server's, `@MatchServerOnly()`, `MatchServerGuard`, 401 to any other token):
  `POST /matching-requests/standing { requests: [{ userId, globalEventId }] }` → 200 `{ standing: [...] }` in the order
  given, from `MatchingQuestsService.matchingRefusals()`; `POST /matches/:matchId/quest` with
  `{ globalEventId, userIds }` (2 to 4 Users, each once) → 201 `{ questId, holderIds }`. Refusals:
  `GLOBAL_EVENT_NOT_FOUND` 404 (unknown, cancelled, no longer published), `GLOBAL_EVENT_STARTED` 409,
  `MATCH_TOO_SMALL` 409.
- **Fewer than two free**: when fewer than two matched Users are free for a Shared Quest, the main server refuses with
  `MATCH_TOO_SMALL` and rolls back, so no Quest held alone is deleted. The match server closes the match and expires
  all its requests, as for a started or cancelled event; the User who was free asks again.
- **Creating the Quest**: one transaction locks the matched Users in id order, then answers the Quest already stored
  for the match id, then checks the Global Event, then calls `freeForSharedQuest()` for each User in id order and
  `createForGlobalEvent(globalEvent, free, tx, matchId)`. Looking up the match after the locks makes two requests at
  the same moment give one Quest. A repeat answers the Quest's current Holders and sends no signal.
- **Match identifier**: `quests.match_id`, unique index `quests_match_id_key`. Once all Holders drop the Quest it is
  deleted with its match id; the match server no longer asks by then.
- **QuestsService** gains `freeForSharedQuest(userId, globalEventId, tx): Promise<boolean>` as agreed with ticket 05,
  and a fourth parameter `matchId: string | null = null` on `createForGlobalEvent`. The read-only operations only
  Matching uses moved to a second provider of `QuestsModule`, exported too: `MatchingQuestsService` in
  `src/quests/matching-quests.service.ts`, with `matchingRefusals(requests, tx?)` (and the types `MatchingCandidate`,
  `MatchingRefusal`) and `forMatch(matchId, tx): Promise<string | null>`. This keeps `quests.service.ts` under 300
  lines.
- **Signals**: `matching-changed` then `quests-changed` to `holderIds` after the commit, on creation only. A User left
  out, and the Users of a closed match, get none.
- **Match server tables**: `matches` (`global_event_id`, `state` enum `match_state`: `awaiting_quest`,
  `quest_created`, `closed`; `quest_id`, CHECK `matches_quest_id_check` that it is set exactly in `quest_created`;
  `formed_at`), and `matching_requests.match_id` (FK, index). A request reads `questId` when it is `matched` and its
  match has a Quest, otherwise `null`; the main server's `GET /matching-requests[/:globalEventId]` passes it on.
- **A User left out** of the Quest (holding a Shared Quest by then) has the request `expired`, read from `holderIds`.
- **One round at a time**: the forming of matches runs in a transaction that takes
  `pg_try_advisory_xact_lock(hashtext('matching-round'))` and skips the round when it is held. The waiting requests are
  locked `FOR UPDATE` after the main server's answer, so a withdrawal during the round waits for it. Asking for the
  Quests runs after that transaction, one match per transaction, claimed with `FOR UPDATE SKIP LOCKED`.
- **Grouping**: `abstract class Grouping { group(requests: readonly Candidate[], size: number): Promise<Candidate[][]> }`,
  `Candidate = { id, hashtags, arrivedAt }`, provided by `HashtagGrouping` in `MatchingModule`. It answers a promise so
  that grouping by AI replaces the provider alone. The rule: each group starts from the earliest request left and takes
  the request sharing the most hashtags with its members (summed over members), the earlier on a tie.
- **Schedule**: `@nestjs/schedule` added to the match server; `RoundService` registers its interval with
  `SchedulerRegistry` at bootstrap, and `ScheduleModule` clears it at shutdown.
- **Tests**: "requests of different sizes never grouped together" is tested in a round with the real module, since the
  module takes one size. Round tests use `useRounds()` from `match-server/test/rounds.ts`, a database of the file's own
  made beside the shared one, and `MainServerStub` from `test/main-server.ts`. Main server tests call the routes with
  `postAsMatchServer()` from `test/match-server.ts`.

### Agent usage (2026-10-04)

- Agent time: about 34 minutes for this ticket, an estimate: one implementing agent, a fix after review included.
- Tokens of this ticket's agent, counted from its transcript:
  - Input: 39,292,182, of which 38,933,797 were cache reads, 358,089 cache writes and 296 uncached.
  - Output: 40,339, a lower bound, since the transcript records only part of the output of most steps.
- The session that ran the agents of the thirteen P08 tickets, reviewed their results and opened the pull requests, counted here once for all of them: about 40 minutes of its own work, an estimate; the time it waited for the agents is theirs. Its tokens when this section was written:
  - Input: 15,251,718, of which 14,951,432 were cache reads, 300,112 cache writes and 174 uncached.
  - Output: 81,864.
