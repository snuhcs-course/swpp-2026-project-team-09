# P07: Chat input that learns from use

Status: ready-for-agent

Core scenario 4, "쓸수록 똑똑해지는 입력". The Korean plan is [scenario-4-plan.md](../scenario-4-plan.md); its research is in [research/05](../research/05-self-improving-assistant.md) (learning from choices), [06](../research/06-one-tap-suggestions-and-shortcuts.md) (one-tap suggestions), [07](../research/07-personalized-query-rewriting-precedents.md) (precedents), [08](../research/08-korean-abbreviation-and-matching.md) (abbreviations) and [09](../research/09-assistant-code-map-for-learning.md) (the code's hook points). This spec fixes the contracts the tickets build against.

## Problem Statement

Students write campus names the way they say them: 학관, 중도, 윗공, ㅎㄱ. The Assistant's resolvers match the catalog's names as substrings, so each such word answers `none`, the model says nothing matches, and the User retypes the official name. When a resolver answers `several`, the candidates reach the User as text only; the User types the answer, the model resolves again, and nothing records which candidate was meant. The server learns nothing from any of this: the same User types 학관 and fails every day. And every request starts from an empty input, although the server could often tell what the User is about to ask.

## Solution

Rules propose, choices teach, and the server suggests. Four pieces, built in order:

1. **Generator and matcher** (ticket 01, built). A pure function makes the short forms of every catalog name when the catalog loads, and a tiered matcher behind `resolvePlace` answers the first tier with hits: the exact name or number, a taught alias, a generated form or its 초성, a syllable subsequence anchored at the first syllable, one jamo of edit distance. Tiers never mix and a collision answers `several`.
2. **Chips and resolution events** (ticket 02). A `several` answer reaches the app as candidate chips under the reply. A tap sends the chosen id back; the server checks it again and treats it as the answer. Every resolver answer and every choice is one row of `resolution_events`, keyed by the normalised words, never by the sentence.
3. **Personal and global aliases** (ticket 03). A User's choice becomes their own alias at once. When several distinct accounts choose the same Place for the same words, it becomes everyone's alias, which decays, is downvoted by "아니에요", retires at zero, and can be switched off as a whole. Aliases are tier 2 of the matcher and point only at catalog ids.
4. **Grey suggestions and shortcuts** (ticket 04). When the chat opens, the server picks at most one request that fits the moment from a few templates, scored by hand with two learned factors, and shows it in grey. A tap runs the stored action without a model call. Every impression is logged with the probability it had of being shown, so that acceptance can be measured without bias.

The proof is ticket 05: a model-free replay that compares A (today's substring matcher), B (rules and the group table) and C (B with aliases learned only from earlier-dated events) on a dated gold set, learning curves over `resolution_events` split by date, and the acceptance curves of suggestions, all with n and intervals.

Throughout: the model chooses only among candidates it was shown, the server decides, and no alias, chip or suggestion names anything that is not a catalog Place, a current Friend or a published event. `FoundIds` keeps covering every id `proposeQuest` takes. No model call is added anywhere.

## User Stories

### Short forms

1. As a User, I want to write 학관 or ㅎㄱ and have the Assistant find 학생회관 among a few candidates on the first day, so that I never have to know a building's official name.
2. As a User, I want the Assistant to ask me which one when a short form fits several buildings, and never to guess, so that a wrong building never ends up in my 파티.

### Choosing

3. As a User, when the Assistant asks which one, I want to tap the candidate instead of typing its name, so that the answer takes one touch.
4. As a User, I want the tapped candidate to be the one the Assistant uses, with nothing asked again.

### Learning

5. As a User, once I have chosen 학생회관 for 학관, I want 학관 to mean 학생회관 to the Assistant from then on, for me.
6. As a User, I want to see when the Assistant read my word through something it learned ("학관 → 학생회관으로 찾았어요"), and to say 아니에요 when it is wrong.
7. As a User, I want a list of the words I taught the Assistant in 내 정보, and to delete any of them.
8. As a User, I want words that many students use the same way to work for me too, even on my first day.
9. As a User, I do not want my Friends' names, or my own choices, to be shown to anyone else.

### Suggestions

10. As a User opening the chat in a 공강 while a Friend is free, I want to see "민수랑 점심 어때요?" in grey and to run it with one tap.
11. As a User, I want a suggestion I dismissed to stay away for a while, and no suggestion at all when I keep dismissing them.
12. As a User, I want a tapped suggestion to show the usual Proposal card, so that nothing is made until I press 만들기.

### Operating it

13. As a team member, I want to switch global aliases off with one setting if they go wrong, and to hold back a share of accounts from them so that learning can be told from habit.
14. As a team member, I want numbers: how often short forms resolve, how often the Assistant has to ask, how often a suggestion is accepted, each with n and an interval, before and after learning.

## Implementation Decisions

### Words, normalised once

One normaliser for every key that words are stored or looked up by: NFC, lower case, every whitespace removed. It lives in `main-server/src/common/normalise-words.ts` and replaces the matcher's `key()`, the Friend resolver's `bare()` and the alias and event keys. Matching behaviour of the Friend and event resolvers does not change; only the stored keys do.

### Ticket 02: chips and resolution events

**Reply.** `AssistantReplyDto` gains `choices: Choice[]`, always present, empty when no resolver answered `several` in this run.

```
Choice { kind: 'place' | 'friend' | 'globalEvent'; id: string; label: string; words: string }
```

`label` is the candidate's name or title (a Friend's name and an event's title are other people's text, but the app shows them as it shows a Friend list, so they are plain here), `words` the resolver's input as the model passed it, trimmed. The choices are the candidates of every `several` answer of the run, in the resolver's order, at most 10 per answer, each `(kind, id)` once. They go into `Presented` beside `cards`, through `runFeature`'s return and `AssistantService.reply`. The app's guard reads only the fields it knows, so an older app ignores the field.

**Request.** A User message may carry the choice it answers with:

```
{ role: 'user', text, chosen?: { kind, id, words } }
```

`text` is the chip's label (what the User would have typed), `words` the chip's `words`. The schema stays strict, so the server ships before the app (OTA, P03). The server checks the id again before the run: a Place in the catalog, a current Friend of the User, a published event not ended. A valid id is added to the run's `FoundIds` under its kind, and the model reads the message as its text followed by a line `[Chosen: place <id> "학생회관" for "학관"]`, as cards and Proposals are read. The system prompt says: a `[Chosen: …]` line is the User's answer to the question before, take that id and do not resolve those words again. An id that fails the check is dropped and the message stands as its text alone, so the model resolves the words anew; nothing is refused.

**Resolution events.** One table, `resolution_events`:

| Column | Type | Meaning |
|---|---|---|
| id | uuid | |
| user_id | uuid, FK users, cascade | whose request |
| kind | enum place / friend / global_event | the resolver |
| words | text ≤ 50 | the normalised words |
| choseong | text, null | the 초성 key when the words are Hangul |
| result | enum none / one / several, null | the resolver's answer; null on a choice row |
| tier | enum exact / alias / generated / subsequence / distance, null | which tier answered (Places only) |
| alias_source | enum personal / global / curated, null | when the tier is alias |
| candidate_ids | uuid[] | the ids shown, in order (at most 10) |
| chosen_id | uuid, null | the id the User chose, or rejected |
| outcome | enum answered / chosen / edited / rejected | see below |
| created_at | timestamptz | |

Rows: `answered` when a resolver answered (the three resolvers each write one); `chosen` when a request carries a valid `chosen`; `edited` when `proposeQuest` is called with a `placeId` different from the Place of the Proposal sent back (`candidate_ids` = [the old id], `chosen_id` = the new one, `words` = the words of the most recent `answered` Place row of this run, or empty); `rejected` from ticket 03's 아니에요. Only `chosen`, `edited` and `rejected` are labels. Indexes on `(user_id, created_at)` and `(kind, words, created_at)`. No sentence is stored, and rows go with the account (cascade). Writing a row never fails a resolver: an error is logged by its cause and the answer still returns.

The app's chips are ticket 02's app half: under an Assistant bubble whose reply has choices, one row of chips per kind, each the label; a tap adds the User's bubble with the label and sends the message with `chosen`, through the same `send` path. Chips are drawn only on the last bubble that has them, and disappear once the User sends anything.

### Ticket 03: personal and global aliases

**Tables.**

`user_aliases`: id, user_id (FK users, cascade), kind (enum, as above), words (normalised), target_id uuid, uses int default 1, created_at, last_used_at; unique `(user_id, kind, words, target_id)`, index `(user_id, kind, words)`. Friend aliases live here only.

`place_aliases`: id, words, place_id (FK places), source enum curated / learned, supporters int, rejecters int, score float, created_at, last_used_at, retired_at null; unique `(words, place_id)`, index `(words)`. Only `learned` rows are written today; `curated` stays in code (`PLACE_GROUPS`).

**Personal.** A `chosen` or `edited` event (its new id) upserts the User's alias for `(kind, words, target)`, uses + 1. A `rejected` event deletes it. A personal alias answers before everything but the exact tier, as `one` when the User taught one target and `several` when they taught more than one for the same words.

**Global, Places only.** The server recomputes the words' alias from `resolution_events` through the absorbing Markov chain of ticket 06, after every chat run that chose, edited or resolved a Place and after every rejection. The guards are: for the target, the number of **distinct accounts** older than 7 days whose session with the words reached it, at least k = 3, and at least s = 0.8 of the reach from the words; `rejecters` counts distinct accounts that rejected it; `score = (supporters − rejecters) × 0.5^(days since last_used_at / 30)`, recomputed on read; an alias whose score falls under half a supporter, or that ticket 06's rule no longer picks, is retired (`retired_at` set) and stops answering. k, s, the 7 days and the 30-day half-life are constants in one file with the plan's reasoning beside them. A setting `ASSISTANT_GLOBAL_ALIASES` (default `true`) switches the global tier off at once; `ASSISTANT_ALIAS_HOLDBACK_PERCENT` (default 10) keeps that share of accounts, by a stable hash of the user id, from receiving global aliases, so that learning can be told from habituation. Holdback accounts still teach.

**Matcher.** `PlaceAliases.lookup` becomes `Promise<AliasHit[]>` and `PlaceIndex.match` async. The sources, in order: `PersonalAliases` (user_aliases), `GlobalAliases` (active place_aliases, unless switched off or held back), `CuratedGroups`. The first source with hits answers; hits whose id is not in the catalog are dropped. `resolveFriend` reads the User's friend aliases first and answers only those still Friends, by the same `one` / `several` rule, before its name match.

**Reply.** `AssistantReplyDto` gains `resolvedBy: ResolvedBy[]`, always present: one entry for each resolver answer of the run that came from an alias with result `one`:

```
ResolvedBy { kind; words; id; label; source: 'personal' | 'global' | 'curated' }
```

The app shows under the bubble one line per entry, "학관 → 학생회관으로 찾았어요", with 아니에요.

**Endpoints**, signed-in User:

- `GET /assistant/aliases` → `{ aliases: [{ id, kind, words, target: { id, label }, uses, lastUsedAt }] }`, the User's own, newest use first. A friend target that is no longer a Friend is listed with its label as "친구" and nothing more.
- `DELETE /assistant/aliases/:id` → 204; another User's → 404.
- `POST /assistant/aliases/reject` `{ kind, words, targetId }` → 204: writes a `rejected` event, deletes the personal alias, recomputes the global one.

The app adds "내가 가르친 말" to 내 정보 under 친구 관리: the list with the words, the arrow and the target, swipe or a button to delete, and an empty state "아직 가르친 말이 없어요".

**Safety, fixed by tests.** One account choosing a wrong Place ten times never makes a global alias; three distinct accounts do; an account under 7 days old does not count; rejections by distinct accounts retire it; a friend alias is never promoted; a held-back account gets no global alias and still gets its own; every alias id is checked against the catalog or the current friendships before it answers; `proposeQuest` takes an alias-resolved id because the resolver added it to `FoundIds`, as before.

### Ticket 04: grey suggestions and shortcuts

**Endpoint.** `GET /assistant/suggestion?screen=main|events|party&openCard=globalEvent:<id>` → `{ suggestion: Suggestion | null }`, decided by the server in under 100 ms with no model call:

```
Suggestion { id: string; text: string; reason: string; action: Action }
Action = { type: 'proposal'; proposal: QuestProposal } | { type: 'route'; placeId: string; name: string }
```

`id` is the impression's id. `text` is the grey request ("민수랑 점심 어때요?"), `reason` the one-line why ("공강 시작 · 민수도 공강"). The app runs the action on a tap without the model: a `proposal` becomes an Assistant bubble with the Proposal card, which 만들기 and 수정 handle as always; a `route` closes the chat and shows the walking route to the Place as the map does.

**Templates**, each with its eligibility rule and its action. Times are Korea's; "free" is read from timetables: a User is free when no class of theirs covers now, and "a 공강 started" when a class ended within the last 15 minutes or the day's first class is over an hour away.

| Template | Eligible when | Action | Base weight |
|---|---|---|---|
| `lunch_with_free_friend` | the User is free between 11:00 and 14:00 and a Friend with sharing on is free now (no class covering now, at least one class today) | closed Proposal, capacity 2, the Friend invited, start at the next quarter hour at least 15 minutes ahead, title "{name}랑 점심", no Place | 1.0 |
| `route_to_next_class` | `screen=main`, the User's next class today starts within 60 minutes and has a Place | route to that Place | 0.8 |
| `party_for_open_event` | `openCard` names a published event that has not ended | open Proposal on the show Board, capacity 3, the event attached, start at the event, title "{title} 같이 가요", description from the title | 1.0 |
| `repeat_last` | the User led two or more Quests in the last 14 days with the same Place and the same meal slot (아침 before 10:30, 점심 10:30–14:30, 저녁 after 16:00) | a Proposal with that Place, slot and the last one's Join Policy, Board and capacity, at the slot's next occurrence today or tomorrow, title "지난번처럼 {place}에서 {slot}" | 1.2 |

Every Proposal passes the same checks `proposeQuest` applies (`makeQuestSchema`, readiness, start ahead, capacity), through a shared function, so a suggestion can never propose what the chat could not.

**Score.** `score = weight × acceptance × (1 + 0.5 × min(repeats, 4)) × fatigue`, where `acceptance = (accepted + 1) / (shown + 2)` for that template in the current time-of-day bucket (05–11, 11–14, 14–18, 18–05) over all Users in the last 30 days; `repeats` is the User's own count behind `repeat_last` (0 for the others); `fatigue` is 0 during a cooldown and 1 otherwise. A suggestion shows when its score is at least 0.25, or 0.35 for a template that names a Friend. A tap on a suggestion never counts toward `repeats`.

**Exposure.** With probability 0.9 the top score among the eligible shows; with 0.1 one of the eligible above the threshold, uniformly. The impression records `propensity`, the probability the shown one had (0.9 + 0.1/n for the top, 0.1/n for another), so that acceptance can be weighted by inverse propensity later.

**Fatigue.** After a dismissal, no suggestion for 2 hours; after the second that day, 6 hours; after the third, none that day.

**Holdback.** `ASSISTANT_SUGGESTION_HOLDBACK_PERCENT` (default 10): that share of accounts, by the same stable hash, gets base weights only (acceptance fixed at 0.5, repeats ignored). Impressions record `holdback`.

**Impressions.** `suggestion_impressions`, one row per answer of the endpoint, shown or not: id, user_id (FK users, cascade), template (null when nothing was shown), eligible text[], candidates text[] (the ids each eligible template's Proposal would take, as `<template> <kind>:<id>`), bucket, propensity float (null when nothing was shown), holdback bool, shown_at (when the chat opened), outcome enum silent / shown / accepted / dismissed / confirmed, outcome_at null, quest_id uuid null, typed_template null, typed_at null. `POST /assistant/suggestions/:id/outcome { outcome: 'accepted' | 'dismissed' | 'confirmed', questId? }` → 204; the app sends `accepted` on a tap, `dismissed` on ×, and `confirmed` with the Quest's id once 만들기 made the Proposal's Quest. `ignored` is not stored: it is an impression still `shown` after 10 minutes, read at analysis time. When a chat reply carries a Proposal, the server marks the User's row of the last 10 minutes with the first eligible template whose Proposal would have taken one of the Proposal's ids (`typed_template`, `typed_at`): on a silent row, or one that showed another template, a missed need; on the row of the template shown, the User typing what was suggested. The metric needs both sides (research/10 §1): acceptance alone rewards showing almost nothing.

**App.** The empty chat (`ChatEmpty`) asks for the suggestion when the sheet opens, with the screen it opened from and the open card if any, and shows it above the examples as a grey row: the text, the reason in smaller type, ×. A tap runs the action; × dismisses. The AI input's placeholder shows the suggestion's text while one is held, else "무엇이든 부탁해 보세요". The mock client answers a fixed suggestion so that the row can be seen without a server.

### Ticket 05: the metric

Model-free, under `main-server/eval/replay/`, run by hand against a database (`DATABASE_URL`), never in CI against Production:

- `pnpm eval:replay --gold <file> --as-of <date>`: for every gold item (words, acceptable ids by seed name or Place number, collected date, set development / test, and an optional window `from` / `until` for a knowledge update, two items of the same words whose accepted Places change on a day), the answer of **A** (today's substring matcher, kept in the harness as a function), **B** (`PlaceIndex` with `CuratedGroups`) and **C** (B with personal and global aliases rebuilt from `resolution_events` dated before `--as-of`, through the same promotion rules), for the test set only unless `--development`, the items holding at `--as-of`. Reports the set's fingerprint (a hash of its items, by which a frozen test set is told from a changed one), then per stage: resolution rate (not `none`), precision of `one`, recall@k (k = 10), top-1, none rate, false-none rate, mean candidates, and the tier that answered each item, with n and 95% Wilson intervals. Curated and learned alias hits are counted apart.
- `pnpm eval:learning-curve --from <date> --to <date> --step 7 [--final-from <date>]`: replays `resolution_events` by date; for each T, aliases learned from events before T are applied to the `answered` Place rows after T whose words had a label later (the label is never learned from), and the ask rate (share answered `several`) and top-1 are reported per week, holdback and non-holdback apart, as JSON and a Markdown table. The points from `--final-from` are the final slice, which no tuning reads.
- `pnpm eval:suggestions --from <date> --to <date> [--final-from <date>]`: the openings per slice (all, silent, silent then a covered request typed); per week and template, acceptance rate, confirmed-within-10-minutes rate, dismissal rate and ignore rate with Wilson intervals, holdback apart; per template, the missed needs and false alarms as ProactiveBench counts them (research/10 §1): accepted, false alarm, eligible-not-shown, missed need, recall, typed-what-was-shown; and the inverse-propensity-weighted acceptance of each template.
- `eval/gold/places.yaml` starts with the development set: note 08's hand-picked examples and the group words, marked `set: development`. The test set is collected from students later, without showing them official names, at least a week after the development set, and marked `set: test`; it is frozen, its fingerprint recorded, before any rule, group table or constant is tuned on it (research/10 §3).

### Ticket 06: everyone's aliases from the absorbing Markov chain

The rule that promotes words to everyone's Place alias is the absorbing Markov chain of Ponnusamy et al., "Feedback-Based Self-Learning in Large-Scale Conversational AI Agents" (AAAI 2020; research/07 §1.1), fitted to our resolver: one account's Place events within 5 minutes of each other form a session, cut after a rejection and where a Place reached is followed by other words; the states are the resolver's readings (`place:<id>` shared across words, `open:<words>` for a question or a nothing, carrying the words; an alias's answer is read as the words left open and then the Place) and two absorbing states, success after a Place at the session's end and failure after words left open or a rejection; transition probabilities are counts over the sessions of the last 90 days of accounts 7 days old or more. The source of words is the rules' own answer (the resolver is deterministic, so the paper's P(h|u) is a point); N = (I − Q)⁻¹ as the series Σ Qⁿ from the source; Φ∞(t) = N_st · r⁺_t and Φ₁(s) = r⁺_s; the alias is the Place of greatest Φ∞ among the candidates (Φ∞ > Φ₁, k distinct accounts whose successful session reached it after the words, s of the first-passage reach), none when the source Place itself wins. Ticket 03's count rule stays as the replay's baseline, stage C; stage **D** is B with the personal aliases and the chain's, and the learning curve reports the chain's series beside the rules and the count. Words answered `none` are counted again when the User then resolves a Place in the same session, which is how the rules' misses become learnable without a chip.

### Code

- Server modules: `src/assistant/` gains `resolution-events.service.ts`, `aliases/` (service, controller, sources), `suggestions/` (templates, scoring, controller, service), and `normalise-words.ts` under `src/common/`. Each table is one Prisma model with the schema's conventions and one migration per ticket.
- The matcher's tier 2 sources implement `PlaceAliases` from ticket 01; nothing else in the matcher changes.
- The app: `assistant-types.ts` and `assistant-client.ts` gain the new fields and endpoints with guards; `use-chat.ts` gains `choose`, `rejectAlias` and the suggestion run; `chat-bubbles.tsx` draws chips and the 찾았어요 line; `me-screen.tsx` links "내가 가르친 말"; the mock client answers every new endpoint.
- Every source file carries the AI-generated box with a dated row; the README's Assistant section describes each new field, table and endpoint in one paragraph per ticket.

## Testing Decisions

As P07's spec of Iteration 2: tests drive the server through HTTP with the scripted model and a real database, and the app through its screens against the mock client. Each ticket tests only what it adds.

- **02**: a `several` answer gives `choices`; a `chosen` message adds the id to `FoundIds` so that `proposeQuest` takes it with no resolver call; an id that is no Friend any more is dropped and the text stands; one `answered` row per resolver call with the right words, tier and candidates; a `chosen` row; an `edited` row on a Proposal's Place change; a row failure never fails the answer; rows go with the account. App: chips appear under the asking bubble, a tap sends the label with `chosen`, chips leave once anything is sent.
- **03**: personal alias answers `one` after one choice and only for that User; the safety list above, each as a test; `resolvedBy` on an alias answer; the three endpoints; the kill switch and the holdback; `PlaceIndex` unit tests with fake sources. App: the 찾았어요 line and 아니에요, the 내가 가르친 말 screen with delete and its empty state.
- **04**: each template's eligibility, true and false, on a seeded timetable, Friends and Quests; the threshold, the Friend threshold, the cooldowns and the daily cutoff; the 10% exposure with a seeded random source and the propensity written; holdback weights; the outcome endpoint; a suggestion's Proposal refused by the shared checks is never shown. App: the grey row, its tap into a Proposal bubble and into a route, ×, the placeholder.
- **05**: the harness's metrics on hand-made answers (Wilson interval values on known n and k), stage A reproducing `PlacesService.search`, stage C learning only from rows before the date, the gold file loading and its two sets.
- **06**: sessions, walks and transition counts on hand-made rows; the series against the closed-form inverse; Φ∞, Φ₁, the candidate test, the argmax and the self-partition on hand-made chains; through HTTP, none-words learned from a rephrase in the same session, an exact name kept, and ticket 03's safety list unchanged; stage D and the chain's curve series on the seeded replay database.
- Budget: implementation over tests; no test of style; no call to the real model; the paid eval harness is not part of any ticket's checks.

## Out of Scope

- Learning from 만들기 itself: the app's `POST /quests` does not say which conversation a Quest came from. A later ticket can send the resolution event ids with it.
- Aliases for Global Events (they expire) and aliases in the prompt (tokens and cache).
- Grey text while typing (continuation) and a trigger model: the suggestion shows once, when the chat opens.
- Bandits and learned rankers: at our traffic a hand score with two learned factors is the right size.
- Collecting the test set from students, and the first official measurement, which ticket 05 only makes possible.

## Further Notes

- **ADR 0005** says conversations are not stored. `resolution_events` stores the normalised words a resolver was given and ids, never a sentence. The ADR's wording is the team's to change; this spec does not change it.
- The values k = 3, s = 0.8, the 7-day account age, the 30-day half-life, the thresholds 0.25 and 0.35, the cooldowns and the 10% holdbacks are starting points: no precedent publishes its values (research/07). Each sits in one constants file with its reason, and the metric of ticket 05 is what tunes them.
- The request's `chosen` field and the suggestion endpoint's `screen` and `openCard` are the whole of the context the server receives about what the User is looking at; the plan's wider `context` field is for later.
- **Free text the model writes.** A Proposal's title and description are the only fields the model fills as free text, from the User's own words; `makeQuestSchema` bounds them (50 and 200 characters) before the card exists and `questProposalSchema` when the Proposal is sent back, `startsAt` must parse, `capacity` is 1 to 8, the Join Policy and Board are enums, and every id must come from this message's resolvers, the chosen chip or the last Proposal (`FoundIds`). Names on the card come from the catalog. The suggestions' Proposals go through the same tool. The tap on 만들기 is the last line, not the defence (research/10 §2).
