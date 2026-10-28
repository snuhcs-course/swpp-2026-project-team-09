# 02: Candidate chips, the chosen candidate, and resolution events

Parent: [P07 spec](../spec.md), "Ticket 02: chips and resolution events"
Status: ready-for-agent
Blocked by: 01

## What to build

A `several` answer reaches the User as chips, a tap sends the chosen id back, and the server records every resolver answer and every choice as one row keyed by the normalised words. This is the labelled data every later piece learns from and is measured on, so the shapes in the spec are the contract: `choices` on the reply, `chosen` on a User message, the `resolution_events` table.

Server: `src/common/normalise-words.ts` replaces `key()` in `src/places/place-index.ts` and `bare()` in `src/assistant/tools/resolve-friend.ts`; `Presented` in `src/assistant/feature.ts` gains `choices`; `src/assistant/dto/assistant-messages.dto.ts` gains the reply field and the optional `chosen` on a User message; `src/assistant/adapter.ts` reads a chosen message as its text plus the `[Chosen: …]` line and seeds `FoundIds` after the check; `src/assistant/chat/chat-assistant.ts` adds the prompt line; a `ResolutionEventsService` writes the rows and the three resolvers and `proposeQuest` call it; one Prisma model and one migration.

App: `mobile/src/api/assistant-types.ts` and `assistant-client.ts` (fields and guards), `use-chat.ts` (`choose`), `screens/main/chat-bubbles.tsx` (the chip rows), `api/mock/assistant.ts` (a `several` reply with choices for 학관).

## Acceptance criteria

- [ ] `AssistantReplyDto.choices` lists the candidates of every `several` answer of the run, in the resolver's order, at most 10 per answer, each `(kind, id)` once, with `label` and the resolver's trimmed `words`; empty otherwise.
- [ ] A User message may carry `chosen: { kind, id, words }`. A valid id (a catalog Place, a current Friend, a published event not ended) is added to `FoundIds` before the run and the model reads `[Chosen: <kind> <id> "<label>" for "<words>"]` under the text; the prompt tells the model to take that id and not resolve those words again. An invalid id is dropped and the text stands; the request is not refused.
- [ ] `proposeQuest` takes a chosen Place id with no resolver call in the run (test through the scripted model).
- [ ] `resolution_events` as the spec's table, with cascade from users. One `answered` row per resolver call (kind, normalised words, 초성 key, result, tier and alias source for Places, candidate ids); one `chosen` row per valid chosen; one `edited` row when `proposeQuest` is given a Place other than the sent-back Proposal's. No sentence is stored anywhere.
- [ ] A failure to write a row is logged by its cause and never fails the resolver's answer or the reply.
- [ ] `normaliseWords` (NFC, lower case, no whitespace) is the one normaliser for the matcher's keys, the Friend resolver and the event rows; the resolvers' answers do not change.
- [ ] App: chips under the last bubble that has choices, one row per kind, labels as given; a tap adds the User's bubble with the label and sends the conversation with `chosen`; chips leave once anything is sent; the mock client answers 학관 with a `several` and choices so the chips can be seen.
- [ ] Tests as the spec's Testing Decisions for 02, server and app; the README's Assistant section describes `choices`, `chosen` and the table; `pnpm lint`, `pnpm typecheck` and the touched tests pass in both packages.

## Comments

### Built (2026-10-28), server

On branch `3.0/P07-02-chips-and-resolution-events`, from `2d8ec933`.

- `src/common/normalise-words.ts`: `normaliseWords` replaces the matcher's `key()` and the Friend resolver's `bare()`, and keys every row. The resolvers' answers are unchanged.
- `feature.ts`: `Choice`, `Presented.choices`, `chosen` on a User `ChatMessage`, and one new field on `ToolContext`, `resolutions`, a per-run `ResolutionLog` (`answered`, `edited`). `tools/resolved.ts` gains `settle`, which each resolver now calls: the ids go to `FoundIds`, a `several` answer's candidates become choices (plain label, trimmed words, each kind and id once), and the answer is recorded. `recordPlaceChange` there writes the `edited` row for `proposeQuest`.
- `chosen.ts` checks a `chosen` again (Place in `PlacesService.list`, Friend in `listFriends`, event through a new `GlobalEventsService.notEndedAmong` with the search's not-ended rule). `AssistantService.reply` does it before the run, inside the 503 guard, writes the `chosen` row, and passes the checked choice on the last message; `runFeature` seeds `FoundIds` from it and `contentOf` adds the `[Chosen: …]` line.
- `resolution-events.service.ts`: `ResolutionEventsService` (`answered`, `chosen`, `edited`, `forRun`), every write in a try that logs `A resolution event was not recorded: <error name> [Prisma code]` and never the words. Model `ResolutionEvent`, migration `20261028120000_add_resolution_events`.

Decisions where the spec left room:

- Only the last User message's `chosen` is checked, seeds `FoundIds` and writes a row. An earlier one, which the app resends with the history, is read unchecked as `[Chosen: …]` with the message's text as the name; the system prompt line tells the model to resolve that name again when it needs the id, since `proposeQuest` would refuse it.
- In the `[Chosen: …]` line a Friend's name and an event's title go inside the delimiters; a Place's name is plain.
- Rows are written as each resolver answers, awaited, so a run that later fails keeps its `answered` rows.
- A `chosen` row has empty `candidate_ids`: the request does not say which candidates were shown. Ticket 05 can join it to the User's last `answered` row for the same kind and words.
- An `edited` row is written only when `proposeQuest` proposes (not on a refused call), the Proposal sent back had a Place, and the new Place passed its checks.
- `choseong` is set only when the normalised words are all Hangul syllables or consonants (학관, ㅎㄱ; not 301동 or 2093오월).
- The table follows the spec, with `created_at` a `timestamp(3)` like the other tables; the migration adds CHECKs for words of at most 50 characters and at most 10 candidate ids. Enums: `ResolverKind` (`globalEvent` mapped to `global_event`, meant for ticket 03's `user_aliases.kind` too), `ResolutionResult`, `ResolutionTier`, `ResolutionAliasSource`, and `ResolutionOutcome`.
- `proposeQuest`'s description names `[Chosen: …]` among the ids it takes.

Tests: `test/assistant-choices.integration.test.ts` (choices for Places, Friends, and events, none for one or none, a chosen Place taken with no resolver call and refused without it, an earlier choice only read, a chosen Friend in delimiters, a former Friend and an ended event dropped, malformed choices refused with 400), `test/resolution-events.integration.test.ts` (answered rows with words, 초성, tier, alias source, and candidates; no sentence stored; a chosen row; no second row when the history is resent; none for a failed check; an edited row and none when the Place stays; a failing write leaves the reply and logs no words; rows deleted with the account), and `test/normalise-words.unit.test.ts`. Existing reply `toEqual`s gained `choices: []`. The paid eval harness was not run.
