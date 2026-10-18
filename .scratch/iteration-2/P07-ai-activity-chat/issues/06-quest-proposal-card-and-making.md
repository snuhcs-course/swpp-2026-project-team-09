# 06: A Proposal card for an Open or Approval Quest, and 만들기

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 01; P06-04 (`.scratch/iteration-2/P06-party-quest-ui/issues/04-making-and-editing-form.md`, #81)

## What to build

A User writes "내일 점심에 학식 같이 먹을 사람 4명 모집해줘, 식사 게시판에". The Assistant shows a Proposal card listing the Quest's fields as rows. 만들기 makes the Quest exactly as the party form would and ends where the form ends. Nothing is made before 만들기. The next message can change one field ("시간만 1시로") and keep the rest.

This ticket covers **Open and Approval Quests only**, with the fields that need no resolving:
- title, description
- Open or Approval
- Board
- capacity
- start time

A Closed Quest needs at least one invited Friend, so it comes in ticket 07 with the Friend resolver, together with the Place and the Global Event.

This ticket waits for P06-04, which rewrites the party form and its making (photo, tags, the event picker, capacity for a Closed Quest). It builds on the form as P06-04 leaves it.

**Prefactor first.** The making sequence already lives outside the form screen, but it shows the form's toast and moves the router itself. Free it from both, so that the form and the Proposal card each decide what to show and where to go, without changing what the form does. The form's existing tests must stay green.

**`proposeQuest`** is the proposer of the spec. It takes only concrete values, and the model converts "내일 점심" itself against the current time in the system prompt.

It checks the Proposal against **the party form's rules as they stand**:
- **Capacity and the shape of a Quest** come from the main server's own rules for making a Quest, not from numbers restated in the tool. If P06-04 has moved capacity to 1 to 8, the Proposal follows by itself.
- **The form's readiness rule for an Open or Approval Quest** is written in the tool: it has a Board and a description. When the User gave no description, the Assistant may propose a short one from the request, and the User sees it on the card.
- **A start in the past** is refused.

On failure it returns what is missing or wrong field by field, so that the model asks the User.

P06's photo and tags are not part of a Proposal. The card leaves them empty, and the User adds them through 수정 (ticket 08).

## Acceptance criteria

- [x] **Prefactor.** The making sequence is callable without the form's toast and router, and the form behaves as before (its existing tests pass unchanged).
- [x] **`proposeQuest`.**
  - It takes title, description, Open or Approval, Board, capacity and start time.
  - It applies the main server's rules for making a Quest and the form's readiness rule (Board and description), and returns either the Proposal or the failed fields with reasons.
  - It creates nothing.
  - No capacity number is written in the tool.
- [x] **Times.**
  - The system prompt gives the default times: 08:00 for 아침, 12:00 for 점심, 18:00 for 저녁, used when no time is given.
  - A start in the past is refused by the tool.
- [x] **The Proposal in the reply.** A passing Proposal is added to the reply as at most one Proposal card, in the shape the party form fills from.
- [x] **Proposals over several messages.**
  - The app sends the last Proposal back with the history as its values.
  - `proposeQuest` accepts them and checks them again.
  - A one-field change keeps the other fields.
- [x] **The Proposal card in the app.**
  - It lists title, 공개 or 비공개, Board, when, where, related Global Event, Friends to invite and capacity as rows. Fields this ticket does not fill show as empty, and photo and tags are not shown.
  - It has 만들기 (primary) and 수정 (secondary). 수정 is ticket 08 and may be absent or disabled here.
- [x] **만들기.**
  - It runs the making sequence with the Proposal, and afterwards the app goes where the form goes after making.
  - A refusal from the server shows as the form shows it.
- [x] **End-to-end tests with the scripted fake:**
  - a complete Open Proposal passes into the reply
  - an Open Proposal without a Board fails on that field
  - an Open Proposal without a description fails on that field
  - a capacity outside the server's limits fails
  - a start in the past fails
  - a Proposal sent back in the history with a new time passes with the other fields unchanged
  - nothing is created by proposing
- [x] **Screen tests:**
  - a reply with a Proposal card shows its rows
  - 만들기 makes the Quest through the fake server and ends where the form ends

## Comments

### Result (2026-10-18)

Where things are:

- Prefactor (its own commit): `useSendParty(quest)` in `mobile/src/screens/party/form/use-send.ts` runs the making sequence and answers a `Sending`: `refused`, `taken` or `room`, with the Quest's id and the words of its toast. It shows nothing and goes nowhere. The form's `useSend` wraps it: it shows the toast and opens the room after a failed step, as before. `showMine` stays where it was, in `use-form-state.ts`. The five form suites pass unchanged (45 tests).
- Server: `main-server/src/assistant/`.
  - `proposal.ts` has `questProposalSchema` and `QuestProposal`: `{ title, description, joinPolicy: 'open' | 'approval', board, capacity, startsAt }`, with `startsAt` in Korea time. It reuses `titleSchema` and `descriptionSchema`, which `quests/dto/quest-requests.dto.ts` now exports.
  - `tools/propose-quest.ts` is `proposeQuest`. Every field of its input is optional, so that the tool, not the SDK, says what is missing. It checks three things and merges what each finds by field:
    - the main server's `makeQuestSchema`, parsed with `subQuest: { title, startsAt }`, whose messages go to the model as they are. No limit is written in the tool, so capacity 1 to 8 comes from the schema.
    - a start at or before `ToolContext.now`, refused with the time now in Korea (`koreaTime`).
    - the form's readiness rule for 공개, written in the tool: a Board and a description, plus every field present.

    It answers `{ result: 'refused', fields: { board: '…' } }` or `{ result: 'proposed', proposal }`, and only a passing Proposal goes to `presented.proposal`. A second passing call in the same message replaces the first.
  - `Presented` and the reply (`AssistantReplyDto`) have `proposal: QuestProposal | null`, always present.
  - The request's Assistant message takes `proposal` (nullable, may be left out). `adapter.ts` gives the model an Assistant message with a Proposal as its text plus the line `[Proposal shown: {…values as JSON…}]`, after the cards' line.
  - The system prompt adds two lines: when to call `proposeQuest` and with what, with the default times 08:00, 12:00 and 18:00 for 아침, 점심 and 저녁; and how to change a Proposal shown before (its values plus the one change).
  - The README's Assistant section covers the reply's `proposal`, the request's field, the new 400s and the tool.
- Server tests: `test/assistant-proposals.e2e-spec.ts` (21 tests). The app's clock is set to 2096-05-07 09:00 in Korea (`vi.spyOn` on `CLOCK`), so every date is in 2096, which no other file uses. "Nothing made" counts the Quests with the test's own title before and after, and checks that the User holds no Quest. The other assistant specs now expect `proposal: null` in their whole-body checks.
- App:
  - `QuestProposal`, `AssistantReply.proposal` and `lengthOf` are in `src/api/assistant-types.ts`. The client's guard checks the Proposal (`isQuestProposal`). `withShownCards` passes the rest of the reply through, so the Proposal reaches the chat.
  - `ChatBubble.proposal` holds it. `messagesToSend` adds `proposal` to the last Assistant message that has one, and to no other.
  - `proposalForm(proposal)` (`features/party/making.ts`) is the `PartyForm` a Proposal fills. 만들기 sends that form, and ticket 08's 수정 can open the form with it.
  - The card is `ChatProposalCard` (`src/screens/main/chat-proposal-card.tsx`). Its rows are 제목, 공개 범위, 게시판, 언제, 어디서, 관련 행사, 친구 초대 and 인원, read from that form, with the description under them. The fields this ticket does not fill show `없음`, and there is no photo or tag row. 수정 is there but disabled.
  - `Bubble` draws the card after the cards, only when `failure === null`. `CardActions` has `proposals: { makingOf, make }`.
  - `useProposalMaking` in `chat-sheet.tsx`, held by `useChatSheet`, runs 만들기: `useSendParty(null)` with the form, then the form's toast.
  - The mock Assistant answers 모집해 and 만들어 with a Proposal for tomorrow's lunch on the meal Board.
  - Tests: `__tests__/chat-proposal-card-test.tsx` (6 tests). The canned replies in `main-chat-test`, `chat-map-buttons-test`, `chat-event-cards-test` and `chat-quest-cards-test` now include `proposal: null`.

Decisions:

- **A separate field, not a card.**
  - The reply has `proposal: … | null` beside `cards` rather than a third kind in the `Card` union.
  - A Proposal is at most one, is not ordered among the cards, and goes back by its values, not as a reference.
  - In the union, `freshIds`, `CARDS_MAX`, `referenceOf` and the card runs would each have to leave it out.
- **The Proposal sent back.**
  - Only one message of a request may carry a Proposal. A request with two, or a Proposal of another shape (a Closed one, say), is refused with 400 before the model is called.
  - The request schema bounds the Proposal's size only. `proposeQuest` checks the values again when the model passes them back.
- **Its size.** A Proposal counts toward `MESSAGES_TOTAL_MAX` as its title and description, on the server and in the app's `lengthOf` alike, so that the app's trimming and the server's cap agree. Its other values are short and fixed in length. When trimming drops the message that carries it, the Proposal is dropped with it.
- **No FoundIds guard.** `proposeQuest` takes no ids, so there is nothing to guard. Ticket 07 adds ids (Place, Global Event, Friends) and checks them there.
- **startsAt and capacity are required** by the tool, though the form allows no time and starts at 4. With no time, "a start in the past" could not be checked. A default capacity would be a number written in the tool. The model asks instead.
- **Open and Approval on the card** follow `PartyForm`: both are `visibility: 'public'`, and `policy` is `open` or `approval`. The card shows `공개 · 바로 참여` or `공개 · 승인 후 참여`, the words of the form's chips.
- **The sheet after 만들기.** Made, the sheet closes and the app goes to 내 파티 with `showMine`, as the form does. This follows 04's `openEvent` and 05's `openQuestPost`, which close the sheet before they move. Refused, the toast shows `refusalWords` as the form's does, the sheet stays open and 만들기 can be pressed again. A `room` result (a failed step after attending an event) closes the sheet and opens the room. It cannot happen until ticket 07 adds the Global Event.
- **Made once.** Once made, the card's button reads `만들었어요` and is disabled, so that the same Proposal is not made twice. The state is kept per bubble in `useChatSheet`, with the conversation, so closing the sheet keeps it.

Not checked or not confirmed:

- Nothing ran on a phone or against a real model. Whether a real model applies the default times, writes a fitting description, and asks for the fields `proposeQuest` refuses is left to P19.
- No screen test covers the card's `만들었어요` after the sheet is opened again, or the `room` path.
- `tsc` in `mobile/` still reports the two typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.
- Tests:
  - The full main-server suite passes: 114 files, 1,502 tests.
  - The full app suite, run with 3 workers, failed 7 of 141 suites (33 tests) while the machine was under load, each taking 37 to 272 seconds. Run again alone with one worker, all 7 pass (77 tests). Two of them touch this change: `main-chat` and `private-party`. The other five are `party-invites`, `shuttle-layer`, `catalogue`, `main-location` and `timetable-ocr-screenshots`.
  - `chat-proposal-card-test.tsx` (6 tests), the other chat suites and the five form suites pass (83 tests together). `assistant-proposals.e2e-spec.ts` (21 tests) passes with the other assistant specs (63 tests together).
  - `oxlint` is clean in both packages.

### Agent usage (2026-10-18)

- Agent time: about 40 minutes in one session, no subagents (an estimate). Much of it was spent waiting on the full suites and the reruns.
- Tokens: about 11.4M input, of which 11.2M were cache reads, 188k cache writes and under 1k uncached; and 70k output. The figures come from the session's transcript and leave out the commit, the PR and the review that follows.
