# 05: Finding recruiting Quests, shown as the Boards' cards

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 04; P06-03 (`.scratch/iteration-2/P06-party-quest-ui/issues/03-find-boards-and-posts.md`, #81)

## What to build

A User asks "오늘 저녁 같이 운동할 파티 찾아줘" and gets the recruiting Quests that match, listed as the same cards the Boards show. Pressing a card opens its post. Its join button works as on the Board, through the same confirmation.

The example button 파티 찾기 sends "파티 찾기" with no condition. The Assistant answers with a few recruiting Quests that start soon and invites the User to narrow down ("운동, 식사처럼 원하는 걸 말해 주시면 좁혀 드릴게요").

Like ticket 04's search, this is a refining tool. The model passes structured conditions, and the tool returns only Quests the User could see on the Boards, as compact candidates the model then picks from. This ticket reuses ticket 04's presenter guard, card filling and delimiters.

P06-03 changes the Board's post card (photo, faces, 관심 없음). This ticket waits for it and draws the card as P06-03 leaves it.

## Acceptance criteria

- [x] **`searchRecruitingQuests`.**
  - It takes optionally a Board, a period and a Global Event.
  - It returns only Quests the User would see on the Boards, Open and Approval only, as compact candidates (id, title, Board, next Sub Quest's time and place, how many places are left, description excerpt). Closed Quests are never returned.
  - With nothing matching it returns "none".
- [x] A Quest's title and description reach the model inside ticket 04's delimiters.
- [x] **`showQuests`.**
  - It takes ids and adds those Quests as cards to the reply, in the shape the Boards' recruiting list uses, filled by the server.
  - It is behind the same guard as `showGlobalEvents`.
- [x] The system prompt tells the Assistant to answer a request with no condition with a few recruiting Quests that start soonest and one line inviting the User to narrow down.
- [x] **The cards in the app.**
  - They are drawn with the Board's post card as P06-03 leaves it.
  - Its join button opens the existing join confirmation.
  - Pressing the card closes the sheet and opens the post.
- [x] **End-to-end tests with the scripted fake and seeded Quests:**
  - a Board filter returns only that Board
  - a period returns only Quests in it
  - a Closed Quest is never returned
  - no match returns "none"
  - a Quest description reaches the fake inside the delimiters
  - `showQuests` with returned ids puts filled cards in the reply
  - an id that no tool returned is refused
- [x] **Screen tests:**
  - a reply with Quest cards shows them
  - pressing one opens the post
  - join opens the confirmation

## Comments

### Result (2026-10-18)

Where things are:

- Server: `main-server/src/assistant/`.
  - `tools/search-recruiting-quests.ts` is the lookup `searchRecruitingQuests(board?, from?, to?, globalEventId?)`. It reads `RecruitingService.list`, the list the Boards read, and filters and sorts it. It returns at most 20 candidates, the soonest next Sub Quest first, plus a `more` flag. Each candidate has `id`, `title`, `board`, `globalEvent` (its title), `joinPolicy`, `placesLeft`, `next` (the next Sub Quest's `startsAt`, `endsAt` and `place`) and the first 300 characters of `description`. Title, place, description and the event's title are wrapped with `othersText` (`quest.title`, `quest.place`, `quest.description`, `globalEvent.title`). It calls `found.add('quest', ids)`. With nothing found it returns "none" with the reason.
  - `tools/show-quests.ts` is the presenter `showQuests(ids)`. It calls `found.refuseUnfound('quest', ids)`, then fills the cards with the new `RecruitingService.listedAmong(readerId, ids)`, which gives exactly what the list gives the reader, in the order of `ids`. A Quest that stopped recruiting between the search and the show is left out.
  - `tools/fresh-ids.ts` is the part both presenters share: the ids a reply does not show yet, filtered by kind, and the `CARDS_MAX` check over cards of both kinds. `showGlobalEvents` now uses it.
  - `feature.ts` adds `QuestCard { kind: 'quest', quest: RecruitingQuestDto }` to `Card`. Global Event and Quest cards go into one `cards` list in the order shown.
  - `RecruitingService.list` and `listedAmong` share one private query, `listWhere`. `GET /quests/recruiting` does not change.
  - The system prompt has two new lines: how to find 파티, and how to answer a request with no condition.
  - The README's Assistant section covers the new tools and the card shape.
- Server tests: `test/assistant-recruiting-quests.e2e-spec.ts` (7 tests). Each test seeds Quests that meet in a month of 2097, which no other file uses. A leader and a reader are signed in for the file.
- App:
  - `QuestCard` and the wider `ChatCard` and `referenceOf` are in `src/api/assistant-types.ts`. The client's guard checks a Quest card with `isRecruitingQuest`, which `party-client.ts` now exports.
  - The mocked parts (photo, tags, faces) are added in the client's response. `withQuestParts` (`src/api/quest-parts/with-parts.ts`) now also wraps `askAssistant`, through `withShownCards`, and fills each Quest card with `summaryWithParts`, the same adapter `listRecruitingQuests` uses. `ShownClient.askAssistant` returns `ShownAssistantReply`, whose cards are `ShownChatCard` (`quest-parts-types.ts`). `ChatBubble.cards` holds these. When the server gives the parts (P06-08), this wrapper goes away with the others.
  - The cards are drawn by `ChatQuestCards` (`src/screens/main/chat-quest-cards.tsx`). It builds each `PostView` with `entryPost`, using the User's join requests and Friends, as 찾기 does, and draws it with 찾기's `PostCard`.
  - `PostCard` (`src/screens/party/post-card.tsx`) takes two new optional props. With `onOpen`, the card is a `Pressable` (testID `post-<id>`), and `자세히 ›` calls `onOpen` instead of `openPost`. Without `onHide`, the card has no `관심 없음`. 찾기 passes `onHide` and not `onOpen`, so it is unchanged.
  - `Bubble` (`chat-bubbles.tsx`) draws the cards only when `failure === null`, in the order the server gave them. It splits the cards into runs of one kind: each run of events goes to `ChatEventCards`, and each run of Quests to `ChatQuestCards`. `ChatBubbles` now takes `cardActions: { events, quests }` instead of `eventActions`.
  - `chat-sheet.tsx` adds `useQuestCards`, next to 04's `useEventCards`. Its join button opens 찾기's `JoinSheet` over the chat and joins with `usePartyActions().join`. Pressing a card, or `자세히 ›`, calls `openQuestPost` in `useChatSheet`, which closes the sheet and calls `openPost(questId)`.
  - The mock Assistant answers 파티, 모임 and 같이 할 with the three mock recruiting Quests that meet soonest, and the line inviting the User to narrow down.
  - Tests: `__tests__/chat-quest-cards-test.tsx` (6 tests).

Decisions:

- **Only Quests the User can join.** `list()` leaves out the Quests the reader holds, and the chat keeps that. 찾기 and the Boards also show the User's own posts (`boardPosts`), but the chat shows only other Users' Quests, which the User can join from the card.
- **Period.** It is matched on the next Sub Quest, the one the Boards' card shows. `from` and `to` are calendar days in Korea, both included, as in 04. The next Sub Quest is in the period if it overlaps it. One without an end counts as falling on its start, and one without a start falls in no period. `from` and `to` are given together or not at all. With no period, every recruiting Quest is a candidate, and those without a start come last.
- **Request with no condition.** The prompt says to call `searchRecruitingQuests` with no condition, show at most 3 of those that meet soonest, and add one line inviting the User to narrow down (운동, 식사…). It also says 운동 is on the hobby Board.
- **Where the parts are added.** In the client's response, not when the card is drawn. That is how `listRecruitingQuests` does it, so a chat card and a Board card carry the same `ShownRecruitingQuest`.
- **No 관심 없음 in the chat.** Hiding a post only takes it out of 찾기, and the card would still be in the answer, so the button would seem to do nothing. The chat's card leaves it out.
- **Order.** Cards are drawn in the server's order, even when Quest and event cards are mixed. A screen test checks a Quest, an event, then a Quest.
- **Joining from the chat.** It works as in 찾기: an Open Quest joins at once, shows a toast and moves to 내 파티, and an Approval Quest sends a request. The chat sheet stays open under the confirmation, as it does under 04's event sheets.

Not checked or not confirmed:

- Nothing ran on a phone or against a real model. Whether a real model maps 운동 to the hobby Board, and keeps to 3 cards for 파티 찾기, is left to P19.
- The `globalEventId` filter is passed straight to `list()`, the same filter `GET /quests/recruiting?globalEventId=` uses. No assistant e2e test covers it, and the ticket's list does not ask for one.
- The search reads the whole recruiting list and filters it in memory, because the next Sub Quest is computed and not stored. That is fine at the current sizes. If the list grows large, the filter should move into the query.
- `tsc` in `mobile/` still reports the two typed-route errors in `menus-screen-test.tsx` and `support/party.ts`. No other errors.
- Tests:
  - The full main-server suite passes: 113 files, 1,481 tests.
  - The full app suite, run with 3 workers, failed 17 suites. Each took 80 to 389 seconds while the machine was under load. Run again alone with one worker, all 17 pass. Four of them touch this change and pass (59 tests): `party-find`, `party-find-mock`, `party-boards` and `main-chat`. The other 13 also pass (130 tests): `shuttle-layer`, `dining-layer`, `main-event-point`, `shuttle-vehicles`, `me`, `room-activation`, `profile-edit`, `room-plan`, `main-location`, `main-room`, `onboarding`, `quest-groups` and `server-app`.
  - `chat-quest-cards-test.tsx` (6 tests) and `assistant-recruiting-quests.e2e-spec.ts` with 04's `assistant-global-events.e2e-spec.ts` (16 tests) pass.

### Agent usage (2026-10-18)

- Agent time: about 50 minutes in one session, no subagents (an estimate). Much of it was spent waiting on the app suite and its reruns.
- Tokens: about 10.0M input, of which 9.8M were cache reads, 158k cache writes and under 1k uncached; and 54k output. The figures come from the session's transcript and leave out the final commit step.

