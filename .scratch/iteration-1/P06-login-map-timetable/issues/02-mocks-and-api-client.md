# 02: Mocks and the API client

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: None (can start immediately)

## What to build

Every screen of this task asks one API client for its data, and every answer comes from a mock inside the app. This ticket builds that client, the mocks and the adapters between an answer and what a screen uses, so that the last ticket connects a feature to the main server without changing a screen.

`todo.md` section 2 lists the operations with their shapes and an example of each answer. A shape is the main server's where the main server has one, and is marked provisional otherwise.

## Acceptance criteria

- [x] The sign-in module's two operations and the client's operations of `todo.md` section 2 exist: completing Onboarding, the Lobby, Friends and their positions, Quests, Global Events, Parties and the walking route.
- [x] Each operation is answered by a mock with the content the frames show: the Friends, the Quests, the events and the plans of the `Main` frame, placed by latitude and longitude on the campus.
- [x] A mock's answer has the shape `todo.md` gives. A provisional shape is marked as such where it is defined.
- [x] One adapter per feature turns an answer into what the screens use, as `todo.md` section 2.10 lists. What a frame shows and no answer holds comes from a mock of the app's own beside the answer.
- [x] A mock answers after a short wait. A development setting makes a named mock answer slowly, with a failure or with nothing.
- [x] The phone keeps that a User signed in, the suggestion the sign-in brought, whether Onboarding is finished and the Onboarding's answers, and a development setting clears them when the app starts.
- [x] A development setting names the mock sign-in's ending: signed in, cancelled, not an SNU account, or failed.
- [x] Loading, errors and refetching are left to TanStack Query: a screen asks for data and is told whether it is loading, failed or there.
- [x] Jest tests at the client: each operation's answer, a failure, an empty answer, what the phone keeps across a restart, and each ending of the mock sign-in.
- [x] The app's README records the operations, the development settings and how a mock gives way to the server.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Built on the branch `1.0/P06-02-mocks-and-api-client`, from the main line: it does not need ticket 01. The four checks pass: lint, format, types, and 36 tests in 4 files.

Where things are:

- `src/api/client.ts` is the seam: the operations, and the one client that the hooks use. `src/api/types.ts` holds the answers' shapes, `src/api/mock/` the mocks.
- `src/auth/sign-in.ts` holds `signIn` and `signOut`, and `src/storage/kept.ts` what the phone keeps.
- `src/features/<feature>/` holds an adapter and the hooks a screen asks with: `useFriends`, `useQuestRows`, `useMapCards`, `useWalkingRoute`.
- `src/dev-settings.ts` reads the development settings; the README lists them.

Decisions:

- The shapes were read from the main server's code, on the main line and in its open pull requests, and differ from this task's first notes in places: a Party's `mark` is `{ questId, title, globalEvent } | null`; the User's own Party has no `memberCount` and has `sharing`; a walking route without a way has one of six statuses. `todo.md` section 2 now says so.
- A dinner with a Friend is a Shared Quest that no Party names, as in the glossary. The frame words it "비공개 파티", and the adapter uses the frame's words while its `joinPolicy` stays null.
- The map shows the Parties of the User's own Quests. A listed Party of others has no place: where a Party meets is its Quest's, and a User reads only the Quests the User holds.
- Three things the app needs and no answer gives are mocks of the app's own: who announced a Global Event (`listGlobalEventAnnouncers`), how far a Friend is (`walk`), and the User's own id (`myUserId()`).
- The app's time is the moment the `Main` frame shows, 1 October 2026 at 13:37 (`src/clock.ts`), so that "다음 강의 · 23분 후" reads as the frame on any day.
- A refusal of the main server is told to a screen at once; a failure of its own or no answer is asked once more first.
- `EXPO_PUBLIC_FIRST_STATE` is honoured by `openKept()`, the read for the start of the app. Nothing calls it yet: the loading screen of ticket 03 does.
- No hook for the Lobby or for completing Onboarding: tickets 03 and 05 ask the client as their flows need.

Review, and what changed after it:

- A Quest that no Party names was called a closed Party, also one the User holds alone. It is now a Shared Quest or a Quest, as above.
- "최유나과" is now "최유나와": the particle follows the name's last sound.
- A cancelled or ended Sub Quest is no longer the one a row and a pin show.
- Two changes to what the phone keeps, made at once, no longer write over each other.
- The map's question asked for the positions twice.
- The tests of the mocks ask the mock client itself, so that they stay tests of the mocks when the server takes an operation's place.

Not checked, and known:

- Nothing ran on a phone: the code is exercised by Jest alone. `Array.prototype.toSorted` is used once and is assumed to exist in the phone's JavaScript engine.
- `CardView.secondary` is null on every card: the frame's "가까이 보기" comes with the cards' ticket.

### After the pull request's review (2026-10-05)

- One cache entry per operation, each under its own key (`src/api/queries.ts`). `useFriends`, `useQuestRows` and `useMapCards` combine the entries they need, so an operation that two of them need is asked once, and a signal of the socket can ask one entry again.
- The three hooks return the same small type, `ScreenData` (`src/api/screen-data.ts`): `data`, `isPending`, `isError` and `refetch`, which asks again the operations that failed, or all of them when none failed.
- `listFriendStatuses` and `listGlobalEventAnnouncers`, the app's own, no longer fail a screen. A failed operation of the map takes off only the cards that cannot be right without it, and `isError` is true. The friend list and the Quest list have `isError` and no `data`, as before.
- `useWalkingRoute()` holds what was asked: `ask(from, to)` fixes the start at that moment, and `clear()` drops the route. A position that moves asks nothing.
- A User in no Party: the comment on `getMyParty` says that the main server answers 404 `NOT_IN_PARTY` and that the operation turns exactly that into null, `isRefusal` in `src/api/errors.ts` is the check for it, and ticket 12 has a criterion for it. A null Party is ordinary data to the hooks.
- `src/expo-types.d.ts` is committed, because the lint of CI ran without the types Expo generates when the app starts.
- The four checks pass: lint, format, types, and 52 tests in 7 files.

### Agent usage (2026-10-05)

- Agent time: about 50 minutes in this session, an estimate.
- Tokens, this session from the request to the pull request: input 76 new, 8.4 million read from the cache, 122 thousand written to the cache; output 70 thousand. Four subagents (two for research, two for review): 363 thousand in all.
