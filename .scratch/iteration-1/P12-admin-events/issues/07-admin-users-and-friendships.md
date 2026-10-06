# 07: Users and friendships: the administrative API and the admin site's Users page

Parent: [P12 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Reading Global Events: the administrative API's lists and the User's list), 03 (Admin site: signing in and out, and the Administrators screen)

## What to build

An Administrator sets up demo accounts without two phones. The admin site lists the Users, searchable, and shows each User's Friends. The Administrator makes two Users Friends at once, and ends a friendship after confirming.

A friendship that an Administrator makes is one an accepted Friend Request would make: the same row of `friendships`, both switches of Location Sharing on, and `friends-changed` to both Users, whose apps fetch their Friends again. A Friend Request waiting between the two becomes the friendship, as `FriendsService.befriend()` does for an Invite Link. Ending one is what `DELETE /friends/:userId` does: Location Sharing between the two stops at once, the Meetups still proposed between them are withdrawn, and both get `friends-changed`. Both go through `FriendsService`, so a change by an Administrator and one by either User lock the two Users alike and run one after the other.

Nothing else about a User is read or changed: no profile edits, no sign-outs, no removals.

## Acceptance criteria

- [ ] The routes live in the Friends module, in a controller marked `@AdministratorOnly()`, as ticket 01 puts the administrative routes of Global Events in their module.
- [ ] `GET /admin/users` answers every User as `{ id, name, email, department, friendId, onboarded, friendCount }`, where `friendCount` is the number of their Friends. The order is by name in the Korean order, then by email; Users before onboarding, whose name is empty, come last.
- [ ] `GET /admin/users/:id/friends` answers the User's Friends in the order of `GET /friends`, each as `{ id, name, email, department, friendId, since }`, `since` being when the friendship started. An unknown id gets 404 `USER_NOT_FOUND` and an id that is not a UUID 400.
- [ ] `POST /admin/friendships` with `{ "userAId": "...", "userBId": "..." }`, in either order, makes the two Friends and answers 204. A waiting Friend Request between them becomes the friendship and keeps its sender; otherwise the sender is `userAId`. Both switches start on, and `friends-changed` goes to both once the friendship is stored. A repeat is refused as already Friends, so it takes no `Idempotency-Key`.
- [ ] Refusals, in this order: an id that is not a UUID 400; the same User twice 400 `SAME_USER`; a User that does not exist 404 `USER_NOT_FOUND`; a User before onboarding 409 `USER_NOT_ONBOARDED`; two Friends 409 `ALREADY_FRIENDS`. A refusal stores nothing and sends no signal.
- [ ] `DELETE /admin/friendships/:userAId/:userBId`, in either order, ends the friendship through `FriendsService.end()` and answers 204: `friends-changed` to both, `position-removed` to each who saw the other, and the Meetups still proposed between them withdrawn with `meetups-changed`. Two Users who are not Friends, unknown Users included, get 404 `FRIEND_NOT_FOUND`, and an id that is not a UUID 400.
- [ ] Every route of this ticket refuses a request without a token, with a User's access token, or from a removed Administrator, with 401.
- [ ] Main server tests with Vitest at the API: the Users list with its order, a User before onboarding and the count of Friends; a User's Friends, an unknown id and one that is not a UUID; making two Users Friends, after which each sees the other in `GET /friends` with sharing on; making Friends of two Users with a Friend Request waiting, which leaves no request; each refusal; `friends-changed` to both, and no signal after a refusal; ending a friendship, with `position-removed` between two Users who saw each other and a proposed Meetup withdrawn; ending one that does not exist; a User's token refused on each route. The test files share one database, so a test looks for its own Users in the list instead of expecting the whole list.
- [ ] The Users page, at `/users`, lists `GET /admin/users` with each User's name, email, department, Friend ID and number of Friends, a User before onboarding marked as such. A search box filters the list by name, email, department or Friend ID. Each User opens their page.
- [ ] A User's page lists their Friends from `GET /admin/users/:id/friends`. "친구 맺기" offers the other onboarded Users who are not yet their Friends, searchable as the list is, and makes the chosen one their Friend with `POST /admin/friendships` through a Server Action. "친구 끊기" beside each Friend asks for confirmation, saying that Location Sharing between the two stops and their proposed Meetups are withdrawn, and then calls `DELETE /admin/friendships/:userAId/:userBId`. After each change, and after each refusal, the page shows a message and reads the lists again. An unknown User shows Next.js's not-found page.
- [ ] Page-level tests with Vitest and React Testing Library against a fake of the main server: the Users list and its search by each field; a User's Friends; making a Friend, with the User and current Friends absent from the choices; ending a friendship only after confirmation; the messages for `ALREADY_FRIENDS`, `USER_NOT_ONBOARDED`, `USER_NOT_FOUND` and `FRIEND_NOT_FOUND`.
- [ ] The main server's README records the routes, their shapes and the refusals in Friends, and says that an Administrator's friendship is stored and announced as an accepted Friend Request's. The admin site's README records the Users page. `GLOSSARY.md` says that an Administrator can also make two Users Friends.
- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` pass in `main-server/` and `admin/`.
