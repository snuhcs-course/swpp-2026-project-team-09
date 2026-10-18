# 07: Resolvers and Closed Proposals: inviting Friends, the Place and the related Global Event

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 06

## What to build

A User writes "내일 저녁 301동에서 비공개로 민수랑 지은이 초대해서 밥 먹는 파티, 축제 관련으로". The Proposal card shows a Closed Quest with the right Friends to invite, the right Place and the right Global Event. When "민수" could be two Friends, or "축제" two events, the Assistant asks which one. When a name matches nothing, it says so. 만들기 then invites the Friends and links the Global Event as the party form does.

These are the resolvers, the part of the spec that most decides accuracy. The model passes the User's words exactly as written. The server decides what they refer to and returns candidates, never a guess:
- **None.** The model asks or says there is none.
- **One.** The model uses its id.
- **Several.** The model asks, listing the names.

`proposeQuest` accepts only ids a resolver returned in this message, or ids in the last Proposal sent back with the history, and checks every one again. The model can never invent a Friend, a Place or an event.

This ticket also opens Closed Proposals. The form's readiness rule for a Closed Quest is written in the tool: no Board and at least one invited Friend.

**If time runs short.** P7 is planned at 10 hours. The Place and Global Event resolvers can move to Iteration 3 P5. The Friend resolver and Closed Proposals must stay together, since a Closed Proposal cannot pass without an invited Friend. An implementing agent that has to cut should finish the Friend resolver and Closed Proposals, then stop at that edge and record what moved under Comments.

## Acceptance criteria

- [x] **`resolveFriend`.**
  - It takes words and returns the matching Friends of the User only, by name, ignoring spaces, each with name and id.
  - It never returns a User who is not a Friend.
  - It never returns a location.
- [x] `resolvePlace` takes words and returns the matching Places by name or building number ("301동", "제1공학관").
- [x] `resolveGlobalEvent` takes words and optionally a period and returns matching published Global Events only.
- [x] Each resolver returns none, one or several candidates. The system prompt tells the model to ask when none or several are returned.
- [x] **`proposeQuest` also takes Closed, Friends to invite, a Place and a Global Event.**
  - A Closed Proposal has no Board and at least one invited Friend.
  - An id that no resolver returned in this message and that is not in the last Proposal is refused field by field.
  - Invitees must be Friends.
  - Invitees must fit the capacity.
- [x] A Proposal with a Global Event and no time starts at the event's start. A meeting time before it is kept, as the party form keeps it.
- [x] The Proposal card fills its 공개/비공개, 어디서, 관련 행사 and 초대할 친구 rows.
- [x] **만들기 runs the full making sequence.**
  - With a Global Event: attend it, apply the settings, add the meeting step when the time moved earlier, then invite the Friends.
  - Without one: make the Quest, then invite.
  - Afterwards the app goes where the form goes.
- [x] **End-to-end tests with the scripted fake and seeded Users, Friends, Places and Global Events:**
  - one, two and no Friends matching a name
  - a non-Friend never returned
  - a Place by building number
  - a Place matching several
  - a Global Event matching several
  - a Closed Proposal without an invited Friend fails on that field
  - a Closed Proposal with a Board fails
  - `proposeQuest` refusing an id no resolver returned
  - `proposeQuest` refusing invitees beyond capacity
  - a Proposal with a Global Event taking its start
- [x] **Screen tests:**
  - a Proposal card shows the Friends, the Place and the event
  - 만들기 with a Global Event attends it and invites through the fake server

## Comments

### Result (2026-10-18)

Where things are:

- Server: `main-server/src/assistant/`.
  - `found-ids.ts`: `FoundIds` now takes `FoundKind`: `'quest' | 'globalEvent' | 'friend' | 'place'`. It also has `has(kind, id)`, which `proposeQuest` uses.
  - `CardKind` (`'quest' | 'globalEvent'`) moved to `feature.ts` and stays the kind of a card and of a card reference.
  - **Why the names were split:** a Friend or a Place is never a card. If `CardKind` held them, the request's card references and `freshIds` would accept kinds no card has.
  - `tools/resolved.ts` holds the resolvers' shared answer, `{ result: 'one', candidate }`, `{ result: 'several', candidates, more }` (at most 10) or "none", plus `givenIds`. Each resolver adds exactly the ids it gave to `FoundIds`.
  - `tools/resolve-friend.ts` is `resolveFriend(name)`. It reads `FriendsService.listFriends` and matches names that hold the words, ignoring spaces and case. Each candidate is `{ id, name }` only, with the name wrapped as `othersText('friend.name', …)`. `sharing` and `visible` are left out.
  - `tools/resolve-place.ts` is `resolvePlace(words)`. It uses `PlacesService.search` as it is (name holds the words, or the number is the words without `동`), so `301동` gives 제1공학관. Each candidate is `{ id, name, number }`.
  - `tools/resolve-global-event.ts` is `resolveGlobalEvent(words, from?, to?)`. It uses `GlobalEventsService.searchPublished` with the new `title` filter (the title holds the words, ignoring case) and an optional period.
    - `PublishedSearch` now takes `period?: { from, to }`, and 04's `searchGlobalEvents` passes its period that way.
    - Without a period, it finds any published event that has not ended. Title and place are wrapped with `othersText`.
  - `proposal.ts`:
    - `QuestProposal` (the reply) adds `joinPolicy: 'closed'`, `board: … | null`, `place: { id, name } | null`, `globalEvent: PublishedGlobalEventDto | null` and `invitees: { id, name }[]`.
    - `questProposalSchema` (sent back, `SentProposal`) has the same fields, with `globalEvent` as `{ id, title }`. The new fields default to `null` / `[]`.
    - `proposalLength` also counts the Place's name, the event's title and the Friends' names.
    - `proposalForModel` wraps the event title and the Friends' names in delimiters for the tool's answer and for the adapter's `[Proposal shown: …]` line.
  - `ToolContext.shown` is the last Proposal sent back, which `runFeature` takes from the messages.
  - `tools/propose-quest.ts` now takes `placeId`, `globalEventId`, `inviteeIds` and `joinPolicy: closed`, and needs `FriendsService`, `PlacesService` and `GlobalEventsService`.
    - **Ids.** Each id must be in `FoundIds` or in `shown`, and is then checked again: the Place is in the list, the event is published, each invitee is in `listFriends`. A failure is given on that field only.
    - **Closed readiness** is written in the tool, with a comment pointing to `isReady`: no Board, at least one invitee. A Proposal without `joinPolicy` is checked as 공개, the form's default.
    - **Capacity.** It refuses `inviteeIds` when 1 + invitees > capacity. The limit itself still comes from `makeQuestSchema`.
    - **Time.** With an event and no time, it starts at the event's start. An earlier time is kept as a meeting before the event.
  - `chat/chat-assistant.ts` registers the three resolvers and adds two prompt lines: when a Quest is closed, and to resolve every Friend, place and event first, asking on `several` and saying so on `none`. `AssistantModule` imports `FriendsModule` and `PlacesModule`.
  - The README's Assistant section covers the resolvers, the new Proposal fields and the new `proposeQuest` checks.
- Server tests:
  - `test/assistant-resolvers.e2e-spec.ts` (10 tests) has its clock in March 2095.
    - Friends: `가람칠민수` and `나래칠민수` both match `칠 민수`, and `칠지은`. `다솜칠민수` and `칠보람` are Friends of a Friend, never of the User.
    - Events titled `2095 봄 …`.
    - The seed's Places are only read: 301동 is one Place, 공학관 is several with `more`.
  - `test/assistant-closed-proposals.e2e-spec.ts` (8 tests) has its clock in June 2095, the Friends `육칠하늘` and `육칠바다`, the non-Friend `육칠구름`, and the event `2095 초여름 축제`.
  - In 06's `assistant-proposals.e2e-spec.ts`, `LUNCH` has the new fields. The "another shape" 400 now sends `joinPolicy: 'secret'`, since `closed` is valid now.
- App:
  - `src/api/assistant-types.ts`: `QuestProposal` with the new fields, `SentProposal` and `sentProposalOf`. `lengthOf` counts the same names as the server.
  - `messagesToSend` sends `sentProposalOf(proposal)`. The client's guard (`isQuestProposal`) checks the new fields: `isJoinPolicy`, `isBoard` (null allowed), `{ id, name }`, `isGlobalEvent` and the invitees list.
  - `proposalForm(proposal, announcers)` (`features/party/making.ts`) fills:
    - 비공개 or 공개;
    - the event as a `FormEvent`, its `source` from the announcers as `usePreselected` and `eventOfQuest` find it;
    - `place` as `{ placeId }` when there is a Place. Otherwise it takes the event's place as a point with its label, as choosing the event in the form fills 어디서.
  - `ChatProposalCard` fills 어디서 (the Place's name, else the event's place), 관련 행사 and 친구 초대 (the names, joined with commas). It has no 게시판 row for 비공개 and no description line when the description is empty.
  - `useProposalMaking` (`chat-sheet.tsx`):
    - It reads `globalEventAnnouncersQuery` for the event's source.
    - It sends `useSendParty(null)` with the invitees' ids, so the form's own sequence runs. With an event: attend, PATCH, `모이기` when the time moved earlier, then invite. Without one: make, then invite.
    - Then `showMine`. On a `room` result it closes the sheet and opens the room, as 06 already did; a test now checks it.
  - The mock Assistant answers a request with 비공개 with a Closed Proposal for the mocks' first event, inviting their first Friend.

#103's suggestions taken here:

1. **Double press.** `useProposalMaking` keeps the bubbles whose 만들기 is on its way in a ref and ignores another press until it is refused. The test presses twice through the button's accessibility `onClick`, which calls `onPress` without a render between the two. Without the ref it makes two POSTs; with it, one.
2. **A start that has passed.** `makeQuest` does not refuse a past start: the server's quests code has no check, and `subQuestContentSchema` takes any time. So the card checks the start against the phone's clock before sending. A past start shows `시작 시간이 지났어요. 새 시간을 채팅으로 알려 주세요` and sends nothing.
3. **isReady.** The card runs `isReady(form, invitees, false)` before sending. When it fails, it shows `빠진 내용이 있어요. 채팅으로 알려 주세요` and sends nothing.

Decisions:

- **The server names everything on the card.** The reply carries the Friends' names, the Place's name and the whole Global Event, so the card and 만들기 make no request. The only exception is the event's `source` (announcer), which the server does not have. It comes from `globalEventAnnouncersQuery`, as the form fills it. The source is not shown on the card and is not sent; it is there for ticket 08's form.
- **The Proposal goes back with its event by `{ id, title }`.** That follows how cards go back by reference, and it keeps the event's long description out of the request's length. The tool reads the event again by id in any case.
- **A meeting time after the event's start is refused.** The form takes any time and `meetingOf` makes `모이기` from it. The ticket keeps an earlier time only, and a "meeting" after the event starts is not one. So the tool refuses `startsAt` with a message naming the event's start.
- **No title from the event.** The form gives `<event> 같이 가요` when the title is empty. The tool still requires a title, which the model writes; giving one in the tool would copy the app's words.
- **The event's tags are not added.** The form adds an event's tags when it is chosen, but 06 kept tags out of a Proposal. They can be added through 수정 (ticket 08).
- **Friends match by "holds the words".** `민수` matches `김민수`. Several matches give `several`, and the model asks.
- **Event matching is on the title only,** so `축제` does not match an event that only mentions 축제 in its description. 04's `searchGlobalEvents` is unchanged.
- **Failure messages.** An id that no resolver returned gets one message. An id that was returned but no longer holds (a Place gone, an event unpublished, a Friend no longer a Friend) gets another, telling the model to tell the User.

Not checked or not confirmed:

- Nothing ran on a phone or against a real model. Whether a real model passes the User's words exactly, calls every resolver before `proposeQuest`, and asks on `several` is left to P19.
- A Proposal for an event that has started but not ended, with no time, is refused as "in the past". The form would let the User attend it.
- `tsc` in `mobile/` still reports the two typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.
- Tests:
  - The full main-server suite passes: 116 files, 1,520 tests. That run was before the last change to `propose-quest.ts`, which split its id checks into one function per field and words the failure for a Place no longer listed. The assistant specs pass again after it: 7 files, 81 tests.
  - The full app suite, run with 3 workers, failed 6 of 142 suites (47 tests), each taking 65 to 421 seconds while the machine was under load. Run again alone with one worker, all 6 pass (71 tests): `shuttle-vehicles`, `timetable-import`, `main-card`, `timetable`, `quests-screen` and `me-versions`. None of them touch the chat or the party form.
  - `chat-closed-proposal-test.tsx` (8 tests) and 06's `chat-proposal-card-test.tsx` (6 tests) pass.
  - The double-press test was also run with the ref check turned off. It then makes two POSTs and fails, so it does test the guard.
  - `oxlint` and `prettier` are clean in both packages.

### Agent usage (2026-10-18)

- Agent time: about 50 minutes in one session, no subagents (an estimate). About half of it was spent waiting on the full app suite (27 minutes under load) and its reruns.
- Tokens: about 18.3M input, of which 18.0M were cache reads, 233k cache writes and under 1k uncached; and 94k output. The figures come from the session's transcript and leave out the commit, the PR and the review that follows.
