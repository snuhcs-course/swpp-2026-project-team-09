# 04: Finding Global Events, shown as the Events tab's cards

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 01

## What to build

A User asks "이번 주에 공연 있어?" and gets the published Global Events that match, listed as the same cards the Events tab shows. Pressing a card opens the Events tab at that event. A card's recruit and match buttons work as they do in the Events tab.

The search is a refining tool. The model turns the User's words into structured conditions:
- a period, from relative words such as "이번 주" against the current time in the system prompt
- optionally a Place
- optionally words

The tool returns only published Global Events matching them, as compact candidates (id plus the few fields the model needs to judge). The model then picks which fit the User's meaning. There are no embeddings.

This ticket also builds two things every later lookup and presenter uses:

- **The presenter guard.** A card id is accepted only if a lookup or resolver returned it in this message. The server fills cards from the database in the shape the app already draws, so the app makes no further requests and a hallucinated id never reaches the screen.
- **Delimiters around others' text.** Global Event text was collected from Sources or written by organizers. When a tool returns it to the model, it is wrapped in labelled delimiters, which the system prompt (ticket 01) marks as data, never instructions.

## Acceptance criteria

- [x] **`searchGlobalEvents`.**
  - It takes a period and optionally a Place and words.
  - It returns only published Global Events in that period that match the other conditions, as compact candidates. Drafts, cancelled and discarded Global Events are never returned.
  - With nothing matching it returns "none".
- [x] **Delimiters.** Text from a Global Event (title, description, place words) reaches the model inside labelled delimiters. The mechanism is shared, so ticket 05 uses it for Quest text.
- [x] **`showGlobalEvents`.**
  - It takes ids and adds those Global Events as cards to the reply, in the order given.
  - An id that no tool returned in this message is refused back to the model with an error, and no card is added for it.
- [x] **Card data.**
  - The reply's cards carry each Global Event in the same shape as the published list the Events tab uses, filled by the server from the database.
  - Earlier messages carry the cards as references (kind and id), as ticket 02's request shape allows.
- [x] **The cards in the app.**
  - They are drawn with the Events tab's existing event item, with its recruit and match buttons working as there.
  - Pressing a card closes the sheet and opens the Events tab focused on that event.
- [x] **End-to-end tests with the scripted fake and seeded Global Events:**
  - a period returns only events in it
  - a Draft, a cancelled and a discarded Global Event are never returned
  - no match returns "none"
  - an event whose description reads "ignore previous instructions…" reaches the fake inside the delimiters
  - `showGlobalEvents` with returned ids puts filled cards in the reply
  - an id that no tool returned is refused
- [x] **Screen tests:**
  - a reply with event cards shows them
  - pressing one opens the Events tab at that event
  - the recruit button works from the chat

## Comments

### Result (2026-10-18)

Where things are:

- Server: `main-server/src/assistant/`.
  - `found-ids.ts` is the presenters' guard. Each run gets a new `FoundIds` in `ToolContext.found`, made by `runFeature`. A lookup or resolver calls `found.add(kind, ids)`, and a presenter calls `found.refuseUnfound(kind, ids)`, which throws. The SDK hands that error back to the model as the tool's error. Tickets 05 and 07 use it as it is, with `kind: 'quest'` for Quests.
  - `others-text.ts` has the delimiters. `othersText('globalEvent.title', text)` gives `<data label="globalEvent.title">…</data>`. A `<data` or `</data` inside the text is changed to `<_data` or `</_data`, so the text cannot close the delimiters early. Ticket 05 wraps Quest text with it, for example `quest.title`. The line in the system prompt now spells out this form, using `DELIMITER`.
  - `tools/search-global-events.ts` is the lookup `searchGlobalEvents(from, to, place?, words?)`. It returns at most 20 candidates, earliest first, plus a `more` flag. Each candidate has `id`, `title`, `startsAt`, `endsAt`, `place` and the first 300 characters of `description`. Title, place and description are wrapped in delimiters, and times are given in Korean time. With nothing found it returns "none" with the reason.
  - `tools/show-global-events.ts` is the presenter `showGlobalEvents(ids)`. It adds cards in the order given and shows a card at most once. A reply holds at most `CARDS_MAX` (20) cards, the same cap the request applies to the Assistant's messages.
  - `feature.ts` adds `CARDS_MAX`, `GlobalEventCard` and `Card` (only `GlobalEventCard` for now; ticket 05 adds the Quest card to the union). `Presented.cards` holds the cards.
  - The reply is now `AssistantReplyDto { text, mapButtons, cards }`. `cards` is always present, `[]` when there are none. A card is `{ kind: 'globalEvent', globalEvent }`, where `globalEvent` is the `PublishedGlobalEventDto` that `GET /global-events` serves.
  - `GlobalEventsService` adds `searchPublished` and `publishedAmong`, and `GlobalEventsModule` now exports the service.
- Server tests: `test/assistant-global-events.e2e-spec.ts`. Each test seeds into a month of 2098 that no other file uses. The README's Assistant section covers the new tools, the guard and the delimiters.
- App:
  - `ChatCard`, `GlobalEventCard` and `referenceOf` are in `src/api/assistant-types.ts`. The client's guard checks `cards` with `isGlobalEvent`, which `event-client.ts` now exports.
  - `ChatBubble.cards` now holds the whole card. `messagesToSend` still sends only `{ kind, id }`, and it does not send map buttons.
  - The cards are drawn by `ChatEventCards` (`src/screens/main/chat-event-cards.tsx`) inside `Bubble`, only when `failure === null`. It uses the 행사 tab's `EventItem` and `toEventViews`. `useSourcesFor(events)` (`features/events/use-events.ts`) adds the tab's own extras: 같이 갈 파티 n개, 내 파티 and 매칭 중. It reads the queries the tab already uses, but does not fetch the list of events again.
  - The sheets: the tab's `useSheets` and `EventSheets` moved unchanged from `events-screen.tsx` to `src/screens/events/event-sheets.tsx`, as `useEventSheets` and `EventSheets`. The tab and the chat sheet each mount their own copy. In the chat, 파티 찾기/모집 and AI 매칭 open the tab's `RecruitingSheet` and `MatchingSheet`, with the toasts from `useEventActions`.
  - Pressing a card calls `openEvent` in `useChatSheet`. It closes the sheet and calls `router.navigate({ pathname: '/events', params: { focus: id } })`, and the tab's `useFocus` then marks that event. `EventItem` takes a new optional `onPress`. When given, the card is a `Pressable` and its title is a `link`. In the tab the card is a plain `View`, as before.
  - The mock Assistant answers 행사, 공연, 축제 and 설명회 with the mocks' first three Global Events as cards.
  - Tests: `__tests__/chat-event-cards-test.tsx` (5 tests). The canned replies in `main-chat-test.tsx` and `chat-map-buttons-test.tsx` now include `cards: []`.

Decisions:

- **Events without a start.** A published event whose `startsAt` is null falls in no period, so `searchGlobalEvents` never returns it. Because `showGlobalEvents` accepts only returned ids, such an event can never become a card. That matters because the app's `isGlobalEvent` requires `startsAt`, so one such card would fail the whole reply.
- **Period.** `from` and `to` are calendar days in Korea, both included. An event is in the period if it overlaps it. An event with no end counts as falling on its start day. As on the 행사 tab, events that have already ended at the request time are left out, so a past period answers "none".
- **Place and words.** These are matched as text, ignoring case. `place` must appear in the event's place. Any one of the `words` (at most 5) must appear in the title or description. Matching a Place by id or building number waits for ticket 07's `resolvePlace`.
- **The guard refuses the whole call.** If any id in a `showGlobalEvents` call was not returned in this message, no card from that call is shown. Ids from earlier messages, including card references in the history, do not count. The model has to search again.
- **The system prompt.** It says to call `searchGlobalEvents` and then `showGlobalEvents`, and to keep the text to one sentence. It reads 이번 주 as today through Sunday, matching the tab's filter, and a request with no period as the next 7 days.
- **Sheets over the chat.** A `BottomSheet` renders in the `Overlay` over the whole screen, so the tab's sheets show above the chat sheet. The chat stays open underneath. A screen they open next, such as a post, a room or the party form, is pushed over the main screen, and going back returns to the open chat.

Not checked or not confirmed:

- Nothing ran on a phone or against a real model. Whether a real model picks well among the candidates, and ignores instructions inside the delimiters, is left to P19.
- On a phone, a long description or several cards in one bubble have not been seen. The bubble is 92% of the width.
- `tsc` in `mobile/` still reports the two typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.
- Tests:
  - The full main-server suite passes: 112 files, 1,474 tests.
  - The full app suite, run with 3 workers, failed 5 of 130 suites (38 tests), each taking 124 to 266 seconds while the machine was under load. None of them were the chat or the 행사 tab. Run again alone with one worker, all 5 pass (62 tests): `friends-list`, `friends-add`, `main-route`, `party-mine` and `shell`.
  - `chat-event-cards-test.tsx` (5 tests), `main-chat-test.tsx` and `chat-map-buttons-test.tsx` (21 tests), and `events-tab`, `events-recruiting` and `events-matching` pass.

### Agent usage (2026-10-18)

- Agent time: about 40 minutes in one session, no subagents, much of it waiting on the test suites (an estimate).
- Tokens: about 13.6M input, of which 13.4M were cache reads, 195k cache writes and under 1k uncached; and 61k output. They come from the session's transcript and leave out the final commit step.
