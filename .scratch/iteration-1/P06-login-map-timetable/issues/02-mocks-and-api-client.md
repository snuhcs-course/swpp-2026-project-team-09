# 02: Mocks and the API client

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Every screen of this task asks one API client for its data, and every answer comes from a mock inside the app. This ticket builds that client, the mocks and the adapters between an answer and what a screen uses, so that the last ticket connects a feature to the main server without changing a screen.

`todo.md` section 2 lists the operations with their shapes and an example of each answer. A shape is the main server's where the main server has one, and is marked provisional otherwise.

## Acceptance criteria

- [ ] The sign-in module's two operations and the client's operations of `todo.md` section 2 exist: completing Onboarding, the Lobby, Friends and their positions, Quests, Global Events, Parties and the walking route.
- [ ] Each operation is answered by a mock with the content the frames show: the Friends, the Quests, the events and the plans of the `Main` frame, placed by latitude and longitude on the campus.
- [ ] A mock's answer has the shape `todo.md` gives. A provisional shape is marked as such where it is defined.
- [ ] One adapter per feature turns an answer into what the screens use, as `todo.md` section 2.10 lists. What a frame shows and no answer holds comes from a mock of the app's own beside the answer.
- [ ] A mock answers after a short wait. A development setting makes a named mock answer slowly, with a failure or with nothing.
- [ ] The phone keeps that a User signed in, the suggestion the sign-in brought, whether Onboarding is finished and the Onboarding's answers, and a development setting clears them when the app starts.
- [ ] A development setting names the mock sign-in's ending: signed in, cancelled, not an SNU account, or failed.
- [ ] Loading, errors and refetching are left to TanStack Query: a screen asks for data and is told whether it is loading, failed or there.
- [ ] Jest tests at the client: each operation's answer, a failure, an empty answer, what the phone keeps across a restart, and each ending of the mock sign-in.
- [ ] The app's README records the operations, the development settings and how a mock gives way to the server.
- [ ] The app's four checks pass: lint, format, types and tests.
