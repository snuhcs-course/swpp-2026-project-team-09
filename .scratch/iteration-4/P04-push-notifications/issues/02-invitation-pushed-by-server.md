# 02: A received invitation is pushed to the invitee's registered phone (main server)

Parent: [spec](../spec.md) ("Tokens on the server", "Sending", "The received invitation", "Ownership and merge order")
Status: ready-for-agent
Who: the server-side member
Blocked by: None (can start immediately). Merges only after the 11/18 acceptance test. No main-server or `all` Release carries it before 11/19.
Native files: no

## What to build

A signed-in Session can register an Expo push token with `PUT /users/me/push-token`. When a Leader invites a Friend into a Quest, the main server posts one message to Expo's push service for each usable Session of the invitee that has a token. The title is "<Leader's name>님의 파티 초대" (<Leader>'s party invitation), the body is the Quest's title, and the data is `{ url: '/main?card=invitation:<invitationId>' }`. A token goes away when its Session ends on the server, and is not used while its Session has no live refresh token. A token Expo reports as `DeviceNotRegistered` is deleted. Accepting or declining an invitation sends nothing. The work is all on the main server and is verified by integration tests against a stand-in for Expo.

## Files

Create (each source file with the AI-generated box):
- `main-server/prisma/migrations/<YYYYMMDDHHMMSS>_add_push_tokens/migration.sql`: made with `pnpm exec prisma migrate dev --name add_push_tokens` from the schema of the iteration's Main. The schema is changed by one person at a time: if another schema change (package C's late-minutes column, for example) is open when this one is ready, that one merges first, and this migration is made again from the new schema rather than adding a second migration.
- `main-server/src/push/push.module.ts`: registers the controller and the service, provides `{ provide: FETCH_EXPO, useValue: fetch }`, and exports `PushService`, as `main-server/src/walking-route/walking-route.module.ts` does with `FETCH_KAKAO`.
- `main-server/src/push/push.controller.ts`: `@Put('users/me/push-token')`, `@HttpCode(HttpStatus.NO_CONTENT)`, the body checked by a zod schema through `@Body({ schema })`, the User from `@CurrentUser()` with its `sessionId`, as `PUT /users/me/master-switch` in `main-server/src/location-sharing/location-sharing.controller.ts` is built.
- `main-server/src/push/dto/push-token.dto.ts`: `{ token }`, matching `/^Expo(nent)?PushToken\[[^\]\s]{1,180}\]$/`.
- `main-server/src/push/push.service.ts`: `register(sessionId, token)`, `send(userIds, message)`, and `settled()`.
- `main-server/src/push/expo-push.ts`: `FETCH_EXPO`, the send address, the zod schema of Expo's answer, and the pure function that picks the tokens to drop from an answer.
- `main-server/src/push/messages.ts`: the closed list of pushed kinds. One function for now, `invitationMessage(waiting: WaitingDto): { title, body, url }`.
- `main-server/test/expo-push.ts`: `ExpoPushStub` and `refuseExpoPush`, as `KakaoStub` and `refuseKakao` in `main-server/test/walking-route.ts`. The stub keeps each request's parsed JSON body, and has `answers(body, status = 200)`, `fails(error)`, and `hangs()`. `hangs()` returns a promise that rejects when the request's `signal` aborts, as `KakaoStub.hangs()` does, so no timer or promise outlives the test.
- `main-server/test/answers/expo-push-device-not-registered.json`: the real answer to a send to a made-up, well-formed token, captured once with `curl -sS -H 'content-type: application/json' -d '[{"to":"ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]","title":"t","body":"b"}]' https://exp.host/--/api/v2/push/send`. If the answer is not `DeviceNotRegistered`, save it under a name that says what it is, and make the `DeviceNotRegistered` answer from Expo's documented error format, saying so in the Comments.
- `main-server/test/answers/expo-push-ok.json`: an ok ticket in Expo's documented format. Ticket 03 replaces it with a real answer.
- `main-server/test/push.unit.test.ts`, `main-server/test/push-tokens.integration.test.ts`, and `main-server/test/invitation-push.integration.test.ts`. Split further if a file passes 300 lines.

Change:
- `main-server/prisma/schema.prisma`: this model, and `pushToken PushToken?` on `Session`:
  ```prisma
  model PushToken {
    id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
    sessionId String   @unique @map("session_id") @db.Uuid
    session   Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
    token     String   @unique
    createdAt DateTime @default(now()) @map("created_at")

    @@map("push_tokens")
  }
  ```
- `main-server/src/app.module.ts`: imports `PushModule`.
- `main-server/src/auth/sessions.service.ts`: `end()` deletes the push tokens of the Sessions it ended, in the same transaction.
- `main-server/src/quests/quests.module.ts`: imports `PushModule`.
- `main-server/src/quests/invitations.service.ts`: in `invite()`, the `create` returns the invitation with `include: WAITING_INCLUDE`; after the transaction, after `signals.send`, call `void this.push.send([userId], invitationMessage(toWaitingDto(created)))`. This file is package C's: change only these lines, name C's owner as a reviewer in the pull request, and rebase on C's latest change (including `POST /plans`) before merging.
- `main-server/test/start-app.ts`: a trailing options parameter `{ fetchExpo?: typeof fetch }` that overrides `FETCH_EXPO`, defaulting to `refuseExpoPush`. The other parameters stay as they are.
- `main-server/README.md`: a section "Push notifications": the table, when a token goes and when it is not used, what is sent and when, what a log line may hold, that nothing is retried and receipts are not read in code, and how to send a test push and read its receipt by hand with curl.

## Behavior

- `register`: in one transaction, delete any row with the same token under another Session, then upsert by `sessionId`. On a unique-constraint error (`P2002`), run the transaction once more; a second failure is thrown as any other error. Answer 204. A malformed token gives 400, and no sign-in gives 401.
- `send(userIds, message)`: read the tokens whose Session belongs to one of the Users, has `endedAt` null, and has at least one refresh token with `revokedAt` null and `expiresAt` after now. With none, return without a request. Otherwise post chunks of at most 100 messages to `https://exp.host/--/api/v2/push/send` with `accept: application/json` and `content-type: application/json`, `AbortSignal.timeout(5000)`, and each message `{ to, title, body, data: { url }, channelId: 'default', priority: 'high' }`. No `sound` field.
- The answer's `data` is in message order. Delete the row of each token whose ticket has `details.error === 'DeviceNotRegistered'`, and log one info line with the row id and the code. Log any other ticket error, a non-2xx status with its `errors[].code` values, a timeout, or a network failure as a warning. Log each ok ticket's receipt `id` at debug level.
- A log line holds only row ids, error codes, receipt ids, and the HTTP status. Never a token, Expo's `message` or `details`, the request body, the response body, or a zod error of the answer: Expo's texts contain the whole token.
- Nothing is retried, and receipts are not read in code.
- `send` never throws to its caller, and `invite()` answers as it does today, whatever Expo does. `send` adds its promise to a set of sends in flight and removes it when done. `settled()` resolves when the set is empty; only tests call it.
- `accept()`, `decline()`, `cancel()`, Friend Requests, requests to join, and Parties call no push.

## Must not change

- The answers and status codes of every existing route, and the existing signals.
- Package C's behavior of `invitations.service.ts`, including `POST /plans` if it has merged.
- `main-server/eval/` and the frozen acceptance-test flows.
- The socket server, the worker server, and the app.
- Settings and deployments: no new setting and no secret (enhanced push security stays off).

## Acceptance criteria

- [ ] The migration creates `push_tokens` with the unique `session_id` and `token` and the cascade from `sessions`. It is the only migration in the pull request, made from the schema of the iteration's Main at merge time.
- [ ] `PUT /users/me/push-token` registers and answers 204. A second token from the same Session replaces the first. A malformed token gives 400, and no sign-in gives 401.
- [ ] The same token registered by a second User's Session moves to it: inviting the first User then sends nothing.
- [ ] Sign-out, a sign-in on another phone (`replaced`), and a reused refresh token each delete the ended Session's token row.
- [ ] A Session whose only refresh token has expired (set `expiresAt` in the past in the test) gets no push, though its row stays.
- [ ] An invitation sends exactly one request to the stand-in, with the title, body, address, `channelId`, and `priority` above, to the invitee's token only.
- [ ] An invitee with no token, or whose Session ended, causes no request.
- [ ] A `DeviceNotRegistered` ticket deletes the row, and the next invitation causes no request.
- [ ] When the stand-in answers 500, fails, or hangs, the invitation's route answers as before, and the test ends within its normal time.
- [ ] Accepting and declining an invitation cause no request.
- [ ] Every test that checks the stand-in awaits `app.get(PushService).settled()` first, also before checking that nothing was sent, and before closing the app.
- [ ] Every integration test refuses Expo by default, through `startApp`.
- [ ] Unit tests: the invitation's message from a waiting invitation; the tokens dropped from an answer with an ok ticket, a `DeviceNotRegistered` ticket, and an error ticket with a made-up code (`details: { error: 'SomethingElse' }`); the logger never receives a string containing `PushToken[` for any of these answers, a 400 answer, or a failed parse.
- [ ] Each changed source file has its AI-generated row; `pnpm lint`, format, type checks, and the touched tests pass in `main-server/`.

## How a reviewer checks it

1. Run the new integration tests and read what the stand-in received.
2. Read `SessionsService.end` and check the delete is inside its transaction.
3. Read `send`: it filters on a live refresh token, is not awaited by `invite()`, never throws, and logs no token, `message`, `details`, or body.
4. On the local stack, sign in with a test account, register a made-up token with curl, invite that account from another, and read the server's log: either an info line with the row id and `DeviceNotRegistered`, or a warning with the code Expo gave. Neither holds the token.

## Comments
