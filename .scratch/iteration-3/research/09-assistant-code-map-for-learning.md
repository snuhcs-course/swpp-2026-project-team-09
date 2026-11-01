# Code map: where a learned alias lexicon, grey one-tap suggestions and replay evaluation hook into the Assistant

Read-only code reading, 2026-10-26, at commit 6d1f6a2f (3.0/Main). Nothing was edited. Every claim carries a
file:line reference.

Path roots:
- `src/`, `eval/`, `test/`, `prisma/`, `seed/` are under `main-server/`.
- `mobile/`, `infra/`, `docs/` are under the repository root.

## 1. Request flow

**Endpoint and body.**
- `POST /assistant/messages` (`src/assistant/assistant.controller.ts:21-28`) passes only `user.id` and `messages` to `AssistantService.reply`.
- The body is `z.strictObject({ messages })` (`src/assistant/dto/assistant-messages.dto.ts:44-57`).
  - A User message is strictly `{role, text}`, at most 1000 characters (`dto:20-23`).
  - An Assistant message is strictly `{role, text, cards[{kind, id}], proposal}` (`dto:25-33`).
  - All messages together may hold at most 24,000 characters (`dto:18`, `:49-52`), and at most one Proposal (`:53-55`).
- There is no field that tells the server what the user is looking at: no screen, map focus, selected card, location or timetable.
  - The app sends only `{ messages }` (`mobile/src/api/server/assistant-client.ts:68`; `mobile/src/features/assistant/use-chat.ts:65-84`, `:146-152`).
  - The comment at `dto:42` says "The server stores none of it."

**Service steps** (`src/assistant/assistant.service.ts:84-103`):
1. Key check (`:85-88`).
2. Daily counter in Redis, `assistant:messages:<userId>:<koreaDate>`, incremented before the run (`:89-94`, `:106-111`). The default is 50 a day (`src/common/settings.ts:79`).
3. History limit: `messages.slice(-HISTORY_MAX)` with `HISTORY_MAX = 20` (`assistant.service.ts:45`, `:95`). The app also trims to 20 (`mobile/src/api/assistant-types.ts:62`; `use-chat.ts:79-82`).
4. `runFeature` (`:97`). Any error becomes one 503. The log names only the cause, never any text (`:99-101`; `adapter.ts:177-195`).

**The run** (`src/assistant/adapter.ts:131-175`):
- It builds a fresh `ToolContext` per message: `found: new FoundIds()`, `shown: lastShown(messages)` (the last Proposal sent back), and an empty `presented` (`:139-144`).
- It calls `generateText` with `instructions: feature.instructions(asker.now)`, the messages mapped through `contentOf`, the tools, `stopWhen: stepCountIs(maxSteps)`, `maxRetries: 0`, `maxOutputTokens`, `timeout.totalMs` (`:145-153`).
- The run throws `NoAnswerError` if the last finish reason is `tool-calls` or the text is empty (`:171-173`).

**Context the server composes.**
- The only server-built block is the time: "Now in Korea: ${koreaNow(now)}", to the minute (`src/assistant/chat/chat-assistant.ts:42`; `src/assistant/korea-time.ts:19-23`).
- Nothing about the user goes into the prompt: no name, no state, no timetable. The user id reaches the tools only (`src/assistant/feature.ts:68-80`).
- No tool reads the timetable. The tool list is `chat-assistant.ts:74-86`, while `TimetableClass` exists at `prisma/schema.prisma:587-614`.
- "Open cards" exist only as text lines on earlier Assistant messages: `[Cards shown: kind id, …]` (`adapter.ts:113-115`) and `[Proposal shown: {json}]` (`:116-118`).

**Limits and model.**
- Default limits (`src/common/settings.ts:79-82`): steps 8 (each tool call is one step, and so is the answer); timeout 30,000 ms over the whole run; output 1,000 tokens per call.
- Model: OpenRouter with `ASSISTANT_MODEL`. The setting defaults to empty (`settings.ts:76`) and is bound at `src/assistant/assistant.module.ts:28-35` through `openRouterModel` (`adapter.ts:25-27`). Production uses `anthropic/claude-haiku-5.5` (`infra/production/k8s/parts/shared/kustomization.yaml:28`; `.env.example:68`). No temperature is passed in production; only the eval recorder sets sampling (`eval/recorder.ts:92-100`).

**Caching: none.**
- No prompt caching: no `providerOptions` or `cacheControl` anywhere in `src/assistant`. Cache-read and cache-write tokens are only measured (`adapter.ts:166-167`; `eval/recorder.ts:119-120`).
- The system prompt changes every minute because of the timestamp (`chat-assistant.ts:42`).
- No data caching either. Each `resolvePlace` reads the whole Place table and filters it in memory (`src/places/places.service.ts:32-35`, `:43-48`). `proposeQuest` reads it again (`src/assistant/tools/propose-quest.ts:107`).
- Redis holds only the daily counter.

## 2. Resolvers

**Shared contract** (`src/assistant/tools/resolved.ts:14-32`):
- The answer is `none` (with a reason), `one` (with the candidate), or `several` (candidates and `more`).
- `several` gives at most 10 candidates (`CANDIDATES_MAX`, `:10`).
- There is no ranking and no exact-match preference: the source order is kept.
- `givenIds` returns the `one` id or every `several` id (`:35-40`).

**resolvePlace** (`src/assistant/tools/resolve-place.ts:25-39`):
- Input `words` is trimmed, 1–50 characters (`:13-21`).
- It calls `PlacesService.search`, which runs in memory (`places.service.ts:43-48`): match if `name.toLowerCase().includes(text.toLowerCase())`, or `number === text.replace(/동$/,'')`.
- Spaces are not normalised, and there is no limit before `resolved()`. The order is by building number (`places.service.ts:18-26`, `:34`).
- Candidates are `{id, name, number}`. `found.add('place', …)` is at `:36`.
- The same `search()` also serves `GET /places/search` (`src/places/places.controller.ts:28-30`), which the app's place pickers use (`mobile/src/api/server/client.ts:117`).

**resolveFriend** (`src/assistant/tools/resolve-friend.ts:28-43`):
- `bare()` removes all whitespace and lowercases (`:22-24`).
- It filters `friends.listFriends(userId)` by `bare(name).includes(bare(words))` (`:35`).
- `listFriends` returns all accepted friendships, sorted by Korean name then id (`src/friends/friends.service.ts:199-212`).
- Candidates are only `{id, name}`, with the name wrapped as others' text (`:37`). Two Friends named 박서준 therefore cannot be told apart. This is a known failure: `eval/cases/missing-or-ambiguous-target.yaml:27-29` and `follow-ups.yaml:31-33`.

**resolveGlobalEvent** (`src/assistant/tools/resolve-global-event.ts:42-68`):
- It calls `searchPublished({period, title: words, take: 50})` (`:17`, `:55`).
- Prisma query: `state = published` AND not ended AND `title contains words` (case-insensitive ILIKE) AND the optional period (`src/global-events/global-events.service.ts:63-65`, `:80-82`, `:84-100`, `:189-196`).
- Order: `startsAt` ascending with nulls last, then title (`:131-134`).
- Candidates are `{id, title, startsAt, place}`, with text wrapped (`:57-62`).

**How "several" reaches the user today: as text only.**
- The prompt and the tool descriptions say to ask, listing names, and "Never pick for the User" (`chat-assistant.ts:53`; `resolve-place.ts:28`).
- The reply DTO has only `text, mapButtons, cards, proposal` (`dto:64-69`; mobile `assistant-types.ts:105-110`). The mobile app has no candidate buttons.
- The user answers by typing a new turn, for example "이민수" (`eval/cases/follow-ups.yaml:11-17`; `live.yaml:44-52`).
- The candidate ids are lost between turns, because `FoundIds` is new per run (`adapter.ts:141`) and Assistant messages carry no candidates. The model resolves again (`follow-ups.yaml:7-9`).

**Least-change place for an alias lookup: inside each resolver's `run`.**
- In `resolve-place.ts:31`, merge `aliases.lookup(userId, words)` into `matched` before `resolved()`.
- `userId` is already in the `ToolContext` (`feature.ts:69`, `:76-80`).
- `found.add(...)` at `:36` then covers alias ids automatically, so `proposeQuest`'s gate accepts them (`propose-quest.ts:96-98`, `:104`).
- It costs no extra model step.
- Wiring needed: inject a service into the `resolvePlace(...)` factory (`chat-assistant.ts:83`), add it to the `AssistantService` constructor (`assistant.service.ts:58-72`), add it to the module imports (`assistant.module.ts:24`).

**Places to avoid.**
- Putting it in `PlacesService.search` changes the public `/places/search` too. That function has no `userId`, so it suits global aliases only.
- A pre-resolution outside the tool loop (rewriting the message, or injecting candidates into the prompt) would NOT be covered by `FoundIds`. `FoundIds` is filled only by tools (`src/assistant/found-ids.ts:7-10`, `:24-28`); `proposeQuest` would refuse those ids (`propose-quest.ts:100-106`) unless `runFeature` were changed to accept pre-seeded ids (`adapter.ts:139-144`).

**A precedent for client-sent ids.** The last Proposal's ids, which the client sends back, are accepted after re-validation: Place exists (`propose-quest.ts:104-110`), event published (`:118-126`), still a Friend (`:136-146`). A "chosen candidate" payload could follow the same pattern.

## 3. Proposal and confirmation

**Building the Proposal.**
- `proposeQuest` takes only ids found in this message or present in the last Proposal shown (`propose-quest.ts:96-98`). It re-checks every id (`:103-178`).
- It validates against `makeQuestSchema` (`:241-260`), start in the past (`:272-278`), start after the event's start (`:187-199`), form readiness (`:205-237`), capacity (`:263-270`).
- On failure it returns `{result:'refused', fields}` (`:301-309`). On success it sets `context.presented.proposal` and returns `{result:'proposed'}` (`:310-322`).
- The reply carries the `QuestProposal` (`src/assistant/proposal.ts:32-42`), mapped at `assistant.service.ts:98`. The app sends the last Proposal back by value (`proposal.ts:47-64`; `use-chat.ts:65-78`).

**What the client sends on edit or confirm.**
- An edit typed in chat is a plain text turn, plus the Proposal sent back. The model calls `proposeQuest` again (`chat-assistant.ts:54`).
- **수정** keeps the Proposal in memory on the phone and opens the party form (`mobile/src/features/party/held-proposal.ts:9-27`; `mobile/src/screens/main/chat-sheet.tsx:182-186`).
- **만들기** makes the Quest through the normal party path (`chat-sheet.tsx:188-215`, `useSendParty`). The resulting `POST /quests` carries `subQuest.place {placeId}` (`src/quests/dto/quest-requests.dto.ts:28-47`).

**No training label exists.**
- Nothing ties the created Quest back to the assistant turn, the words typed, or the candidates offered. The Proposal is never stored on the server (`held-proposal.ts:9-11`; `README.md:1786`).
- Usable weak signals: `SubQuest.placeId` / `placeLabel` (`prisma/schema.prisma:316-322`). `placeLabel` alone means words that named no Place, which makes it a source of alias candidates such as 학관. The same pair exists on `Meetup` (`:120-125`).
- The party form's `/places/search` query text is never sent together with the chosen id.

## 4. Eval harness

**Case definition** (`eval/cases.ts:56-80`): `id`, `category`, `live`, `repeat` (2 or more), `knownFailure`, `turns` (user turns or assistant turns), `expect`. An assistant turn holds text, cards and a Proposal by seed name (`:26-54`). Three kinds: single, history, live (`:87-92`). Every `*.yaml` in `eval/cases/` is loaded (`:96-115`).

**Expectations** (`eval/expect.ts:68-103`): `actions` (TOOL / ASK / PROPOSE / REFUSE / CHAT and combinations, `:14`); `tools.required / allowed / forbidden`; `args` (normalised); `proposal` fields by seed name (`:49-57`); `cards`, `mapButtons`; `text.mentions` (required for ASK, `:88-92`).

**World seeding** (`eval/world.ts:176-190`): a fresh Postgres and Redis from `test/global-setup.ts` (`eval/vitest.config.ts:18`). The asker and Friends are created through the app (`:73-85`). Places are looked up from the shared Places seed by name and number (`:87-93`). Global Events go straight in through Prisma (`:95-101`). Quests go through the API (`:124-164`). Menus come through a worker message (`:188`). Vehicles are refreshed before each case (`:166-172`; `run.eval.ts:76`). Data in `eval/world-data.ts`. The world is seeded once per run in `beforeAll` (`eval/run.eval.ts:30-44`). The clock is fixed to one global `NOW = 2026-10-21T14:05+09:00` (`eval/runner.ts:32`, `:67`).

**Judging: fixed rules, no model grader** (`eval/score.ts:23-25`). `scoreTurn` (`:237-258`) checks the action read from the trace (`actionOf`, `:80-113`), ASK with mentions (`:229-234`), required and forbidden tools, args (`:162-188`), proposal, cards, map buttons, mentions (`:190-226`). A case passes when every scored turn passes (`:279-291`). Over-calls are reported but do not fail a case (`:48-50`). Each tool's role and field normalisers are registered in `eval/normalise.ts:53-85`; outcomes must be one of `OUTCOMES` (`:20`, `:226-235`). A new tool or outcome must be added there, else `roleOf` returns null and ASK detection (`score.ts:99-105`) misses it.

**What a run records.** Per turn (`TurnTrace`, `eval/trace.ts:54-64`): the user's text, status, latency, steps, reply, failure. Per step: tool calls with input and result or error, text, finish reason, usage (input, output, cache read, cache write) and latency (`trace.ts:20-39`; `recorder.ts:101-136`). Per run (`RunLog.toJSON`, `runner.ts:261-278`): options, seeds, totals, tokens and cost (`runner.ts:224-259`, with a budget stop). Saved to `eval/results/*.json`, git-ignored (`runner.ts:281-290`; `README.md:1943-1944`).

**Repeats.** `repeat` on a case, or `--repeat` on the command line (`cases.ts:134-136`; `options.ts:31-32`, `:108`). Each repetition is its own `it` (`run.eval.ts:56-63`). pass^k is computed in `run-score.ts:132-141`.

**(a) Replaying a dated log against the lexicon state as of each date.**
- Today impossible: no real turns are stored, and the logs carry no text (`assistant.service.ts:82-83`, `:100`). ADR 0005 says conversations are not stored (`docs/adr/0005-…md:5`).
- Harness changes needed: a per-case or per-turn `now` in `caseSchema`, with the clock re-mocked per turn (mocked once at `runner.ts:67`); a per-case lexicon reset or "as of date" hook, modelled on `world.refresh` (`world.ts:61`; `run.eval.ts:76`); a way to send raw ids rather than seed names (`runner.ts:73-98`).
- Place ids are computed, so they are identical in every database (`prisma/schema.prisma:524-526`; ADR 0002). Real Place ids therefore replay as they are. Friend and event ids do not.
- A cheaper, deterministic option is a resolver-level replay with no model, as `test/eval-cases.integration.test.ts:274-286` already does through `ScriptedModel`.

**(b) Asserting no unexpected DB change.** Nothing exists for this. The Assistant writes only the Redis counter. Hook: snapshot row counts or hashes before and after each `sendTurn` (`runner.ts:113-140`), using a separate Prisma connection as `world.ts:177` does. Store the difference in `TurnTrace`, and add a check name to `Check['name']` (`score.ts:29-30`). Online learning would make alias or log writes expected: allowlist those tables and reset them per case, or learning leaks between cases because the world is shared.

**(c) Adding adversarial cases.** Add a YAML file under `eval/cases/`. Update the hard-coded 13 categories and 62 total (`test/eval-cases.integration.test.ts:30-44`, `:123-130`), and the "about 5 cases repeat ×3" rule (`:140-144`). The rule that any case containing 학관 must be a known failure (`:111`, `:159-165`) will need to change.

## 5. Data model

**Nothing reusable today.** No settings, preferences or alias table exists. `User` holds only profile fields and `masterSwitchOn` (`prisma/schema.prisma:37-71`). `Friendship` has per-end sharing flags (`:87-89`).
- Usable priors: `ClassTime.placeId` (`:600-614`), the user's class buildings; `QuestHolder` joined to `SubQuest.placeId` (`:286-329`), past meeting places. There is no index on `sub_quests.place_id`; only `questId` is indexed (`:327`).
- Free alias data is dropped today: the campus-map seed has `inst_eng_nm` for 250 rows (`seed/campus-map-places.json:6-8`), but the loader reads only `inst_kor_nm` (`src/places/places.seed.ts:16-26`, `:131-136`).

**Schema conventions** (e.g. `prisma/schema.prisma:38`, `:233-259`): `id String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid`; camelCase fields with `@map("snake_case")`, and `@@map("plural_snake")`; `createdAt DateTime @default(now()) @map("created_at")`; enums with `@@map`; CHECK constraints in migrations for "one of these columns" rules (`:306-307`).

**Minimal sketch (fields only):**
- `PlaceAlias` → `place_aliases` (global): `id`, `words` (normalised key), `placeId` → Place, `source` enum (curated | learned), `createdAt`, `retiredAt?`; `@@unique([words, placeId])`, `@@index([words])`.
- `UserAlias` → `user_aliases` (per user): `id`, `userId` → User, `kind` enum (place | friend | globalEvent), `words`, and either `targetId` (uuid) or separate `placeId?` / `friendUserId?` columns with a CHECK; `createdAt`, `lastUsedAt`, `uses`; `@@unique([userId, kind, words, targetId])`, `@@index([userId, kind, words])`.
- `AliasSuggestion` → `alias_suggestions` (acceptance log): `id`, `userId`, `kind`, `words`, `suggestedId`, `shownAt`, `answer` enum (accepted | rejected | ignored | edited), `chosenId?`, `answeredAt?`, `lexiconRevision?`; `@@index([userId, shownAt])`.
- A friend alias must be re-checked against current friendship at use, as `propose-quest.ts:141-145` does, because friendships end (`friends.service.ts:215-225`).

## 6. Gaps and risks

1. **No conversation storage, and no text in logs.** Replay and label mining need a new opt-in log, which is a privacy decision and an ADR 0005 change (`dto:42`; `README.md:1786`; `docs/adr/0005-…md:5`; `assistant.service.ts:82-83`; `.env.example:61-63`).
2. **No button payload.** "Several" is text only. The user's pick is typed and the model re-resolves; for same-name Friends that cannot succeed (`dto:25-33`, `:64-69`; `adapter.ts:141`; `resolve-friend.ts:37`).
3. **Strict request schema.** A new request field such as `acceptedSuggestion` gets a 400 from any server not yet updated (`dto:20-33`, `:44`), so deploy the server before the app/OTA update. Response fields can be added safely: the mobile guard checks only the fields it knows (`mobile/src/api/server/assistant-client.ts:57-65`). A new reply field must be added in `Presented` (`feature.ts:58-65`), `runFeature`'s return (`adapter.ts:174`) and `assistant.service.ts:98`.
4. **No link from 만들기 back to the conversation,** so there is no ground-truth label (`chat-sheet.tsx:188-215`; `held-proposal.ts:9-11`).
5. **Contract conflict.** "Never pick for the User" (`chat-assistant.ts:53`; `resolve-place.ts:28`) and the ask-which cases (`missing-or-ambiguous-target.yaml:7-8`) clash with an alias that collapses "several" into "one". These encode today's behaviour and must change on purpose: `making-parties.yaml:96-112` (the 학관 known failure); `test/eval-cases.integration.test.ts:223`, which asserts 학관 gives "several" without 학생회관; `:111`, `:159-165` (the 학관 rule); `test/assistant-resolvers.integration.test.ts:119-135`, which uses `toEqual` on exact candidate shapes.
6. **Inconsistent normalisation.** Friend matching removes spaces (`resolve-friend.ts:22-24`), Place matching does not (`places.service.ts:44-47`), and events use ILIKE (`global-events.service.ts:80-82`). An alias key needs one normaliser. There is no trigram or text index; the only extension is postgis (`prisma/migrations/20260928130509_init/migration.sql:2`).
7. **Minute timestamp in the system prompt and no cache settings** (`chat-assistant.ts:42`; `adapter.ts:145-170`). A per-user lexicon put into the prompt would cost tokens each turn and still be uncacheable. Keeping it on the tool side is cheaper.
8. **Single eval clock and a shared world per run** (`runner.ts:32`, `:67`; `run.eval.ts:41`). There is no per-case date or lexicon state, and learned writes would leak between cases.
9. **Counter and step costs.** The daily counter is incremented before the run (`assistant.service.ts:89-94`), so a one-tap acceptance sent as a new turn costs one of the 50 daily messages. Any extra alias tool call costs one of the 8 steps (`settings.ts:80`).
10. **History cut.** Cutting history to 20 can drop the message that carries the Proposal, which leaves `shown` null (`assistant.service.ts:95`; `adapter.ts:123-126`).
11. **Shared search function.** `PlacesService.search` also serves the app's `/places/search` (`places.controller.ts:28-30`). Changing it changes the app's place pickers too.
