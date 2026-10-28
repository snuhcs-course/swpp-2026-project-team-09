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
