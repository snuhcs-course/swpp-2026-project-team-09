# 08: 수정 on a Proposal opens the party form filled with it

Parent: [P07 spec](../spec.md)
Status: ready-for-human
Blocked by: 07; P06-04 (`.scratch/iteration-2/P06-party-quest-ui/issues/04-making-and-editing-form.md`, #81)

## What to build

When the Assistant got a field wrong, a User presses 수정 on the Proposal card. The party form opens with every field of the Proposal filled in:
- title, description
- 공개 or 비공개, Open or Approval
- Board, capacity
- when, where
- related Global Event
- Friends to invite

Photo and tags (P06-04) start empty, as in a new Quest, for the User to add. The User corrects what they need and makes the Quest from the form as usual. Nothing in the form changes for a User who opens it the usual way.

This ticket builds on the form as P06-04 leaves it.

**If time runs short.** P7 is planned at 10 hours. This ticket is the first to move to Iteration 3 P5. Without it, the Proposal card still makes Quests with 만들기, and 수정 stays absent or disabled as ticket 06 allows.

## Acceptance criteria

- [x] **수정 on the Proposal card.**
  - It closes the sheet and opens the party form with the Proposal's fields filled in.
  - Friends to invite appear as already chosen.
  - The Global Event appears as the chosen 관련 행사.
  - Photo and tags start empty.
- [x] Making the Quest from the filled form behaves as making it from an empty form with the same values.
- [x] Opening the party form the usual ways (new Quest, from a Global Event, editing a Quest) is unchanged, and its existing tests pass.
- [x] Returning from the form without making leaves the chat's conversation as it was.
- [x] **Screen tests:**
  - 수정 opens the form with every field filled from a canned Proposal, Friends and Global Event included
  - making from it sends the same requests as the form would

## Comments

### Result (2026-10-18)

Where things are (app only; the server is unchanged):

- **Handing the Proposal to the form:** `features/party/held-proposal.ts`. `holdProposal({ proposal, made })` keeps it in the module, and `heldProposal()` reads it. The chat holds it, then opens `/party-form?fromProposal=1`.
  - **Why a module holder:** the main server never stores a Proposal, so the form cannot read it again by id. A route parameter carries only strings, and the Proposal holds a whole Global Event. JSON in the URL would be long and need its own guard. The query cache would need a key for something that is not server data. The map view already hands its place back the same way (`waitForPlace` in `picked-place.ts`).
  - The holder keeps the last Proposal until another is held, so the form finds it on every render. Without `fromProposal=1` the form never reads it, so the usual ways in are untouched. Opened with the flag and nothing held (after a restart, say), it is a new form.
- **The route:** `app/(signed-in)/party-form.tsx` reads `fromProposal`. `PartyFormScreen` takes `fromProposal`, and with a held Proposal it shows `ProposalForm`. That waits for `globalEventAnnouncersQuery`, `placesQuery` and `friendsQuery`, then gives `Form` its start. While they load, it shows `LoadingState` under `파티 만들기`.
- **The start:** `screens/party/form/proposal-start.ts`, `proposalStart(proposal, { announcers, places, friends })`.
  - **Fields:** `proposalForm(proposal, announcers)` from 06/07, unchanged. So the event's `source` comes from the announcers, as in 07, and photo and tags are empty.
  - **Friends:** the invitees' ids that are still in `friendsQuery`. The others (a Friend removed since, say) are dropped silently and are not invited. If `friendsQuery` fails, nobody is chosen, and the picker shows no Friends either.
  - **어디서:**
    - With a Place, `words` is `place.name` and `picked` is `{ placeId, position, words }`. The position comes from the Place in `placesQuery`, the list `placeToSend` already uses.
    - If that list no longer has the Place, or fails to load, only the name is kept. Sending then names it again with `placeToSend`: `{ placeId }` if the name matches one Place, else `{ label }`.
    - With only an event, the start is `eventWhere(event)`: the event's place as a point with its words. `useEventPick` now uses the same `eventWhere`, so choosing the event in the form and starting from it give the same `어디서`.
- **`FormProps`** gains `proposal: ProposalStart | null`. It is `null` on the other three ways in. In `useFormState`, `startForm` and `startChosen` pick the start (the edited Quest, the Proposal, or new with or without `friendId`), and `useWhere` takes the Proposal's `어디서`. The order and values for the other ways are as before.
- **관련 행사 and 언제:** the event is put in the form as `proposalForm` gives it. `withEvent` is not called, since it would replace an empty title with `<event> 같이 가요`, set `startsAt` to the event's start and add the event's tags. So the Proposal's title and time stay, including a meeting before the event. That time is still sent as `모이기`, because `meetingOf` compares it with the event's start. If the User then chooses or removes the event in the form, it behaves as in a new form.
- **The card:** `ChatProposalCard` takes `onEdit`. 수정 is enabled while `making === 'ready'`, and disabled once 만들기 is on its way or done. `chat-bubbles.tsx` has a small `Proposal` component that wires the card to `ProposalActions`, which now includes `edit`. The component keeps `Bubble` under 50 lines.
- **The chat:** `useProposalMaking` (held by `useChatSheet`) has `edit`. Its `openProposalForm` holds the Proposal, closes the sheet, then calls `router.push('/party-form?fromProposal=1')`, as 04's `openEvent` and 05's `openQuestPost` close before moving. The conversation lives in `useChatSheet`, so coming back with 뒤로 leaves it and the card as they were.

Decisions:

- **Made from the form → the card says `만들었어요`.** The held Proposal carries `made`, which marks the bubble `made` in `useProposalMaking`. `useSubmit` calls it when sending returns `taken` or `room`, since the Quest exists in both. After that, 만들기 and 수정 on that card are disabled, so the same Proposal cannot be made twice from the card. A refusal leaves the card as it was.
- **수정 is also disabled while 만들기 is on its way or done**, so that the form cannot make a second Quest from a Proposal already made.
- **Waiting for the three queries** costs one loading frame when they are not cached, which they usually are once the main screen has shown Friends. In return, the `useState` starts are complete.

Not checked or not confirmed:

- Nothing ran on a phone. Android's hardware back from the form was not tested; the test presses the app bar's 뒤로.
- The holder stays filled after the form makes the Quest. A later `/party-form?fromProposal=1` would show the same Proposal again, but only the chat opens that address.
- `tsc` in `mobile/` reports only the two known typed-route errors in `menus-screen-test.tsx` and `support/party.ts`.
- Tests:
  - New `__tests__/chat-proposal-edit-test.tsx`, 6 tests:
    - 공개 (Approval, a Place, one Friend): every field filled, no photo or tags, then `POST /quests/own` with `place: { placeId }` and the invitation.
    - 비공개 with an event and a meeting time: the event chosen, the title and 17:00 kept, the two Friends chosen and a former Friend left out, then attend → PATCH → `모이기` → two invitations. These are the same requests 07's 만들기 test expects.
    - 뒤로 keeps the conversation and leaves 만들기 and 수정 enabled.
    - Made from the form, the card shows `만들었어요` with 수정 disabled.
  - Stubbing `proposalStart` to an empty start makes the 4 filling and making tests fail.
  - In 06's `chat-proposal-card-test`, one line now expects 수정 enabled.
  - The chat suites and the form suites (`party-form`, `party-form-edit`, `party-form-parts`, `events-party-form`, `private-party`) pass: 12 suites, 97 tests.
  - The full app suite, run with 3 workers, failed 2 of 143 suites (11 tests), each taking about 90 seconds and timing out at 60 seconds under load. Run again alone with 1 worker, both pass (20 tests): `party-mine` and `main-position`. Neither touches the chat or the form.
  - In `mobile/`, `pnpm lint` (`oxlint --type-aware`) and `pnpm format:check` are clean. The server was not changed, and its checks were not run.

### Agent usage (2026-10-18)

- Agent time: about 30 minutes in one session, no subagents (an estimate). About 15 minutes of it was waiting on the full app suite.
- Tokens: about 5.8M input, of which 5.70M were cache reads, 121k cache writes and under 1k uncached; and 36k output. The figures come from the session's transcript and leave out the commit, the PR and the review that follows.
