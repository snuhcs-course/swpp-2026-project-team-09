# 03: A signed-in phone registers for push, asked right after the design's moments (app)

Parent: [spec](../spec.md) ("The app: registration and the permission", "Tokens on the server")
Status: ready-for-agent
Who: the server-side member
Blocked by: 01 (the native module and the wrapper), 02 (the route). It can be built on ticket 01's branch before 01 merges; its pull request merges after 01 and 02.
Native files: no

## What to build

A signed-in User who sends a Party that invites a Friend, from the Party form or from the Assistant's Proposal card, or who books a seat or a room, sees once the sheet of board t17. "알림 받기" (get notifications) leads to the phone's prompt. Once allowed, the phone's Expo push token reaches the main server, at this and every later start and sign-in, and whenever the token changes. From then on, invitations to that User arrive as push. "나중에" (later) closes the sheet for good, and the User keeps the list only. When the Session ends on the phone, the phone unregisters from push before it forgets its tokens, so a signed-out phone receives nothing even when the main server could not be told, as long as the phone reached Firebase. Mock builds and the existing tests never ask and never register.

## Files

Create (each with the AI-generated box):
- `mobile/src/push/push-registration.tsx`: `PushRegistration`, a component that draws nothing, mounted in `mobile/src/app-providers.tsx` next to `LiveUpdates`.
- `mobile/src/push/push-ask-host.tsx`: `PushAskHost`, a provider mounted once in `mobile/src/app-providers.tsx` inside `OverlayHost` (`<OverlayHost><PushAskHost>{children}</PushAskHost></OverlayHost>`). It owns the sheet's open state and draws the sheet with the design system's `BottomSheet` inside `Overlay`, so the sheet stays on screen when the screen that asked navigates away. It exposes `askForPush()` through a context, and `useAskForPush()` returns only that function (a no-op outside the host).
- `mobile/__tests__/push/push-registration.integration.test.tsx` and `mobile/__tests__/push/ask-for-push.integration.test.tsx`.

Change:
- `mobile/src/api/client.ts`: `registerPushToken(token: string): Promise<void>` in `ApiClient` and `apiClient`.
- `mobile/src/api/server/client.ts`: `registerPushToken: async (token) => { await call('PUT', '/users/me/push-token', isNothing, { body: { token } }); }`, as `PUT /users/me/master-switch` is called.
- `mobile/src/api/mock/client.ts`: `registerPushToken` does nothing.
- `mobile/src/storage/kept.ts`: `pushAsked: boolean` in the `Kept` interface, `pushAsked: false` in `FIRST_STATE`, `'pushAsked'` in `type Later`, and in the reading of a stored value `pushAsked: 'pushAsked' in value && value.pushAsked === true`, as the other later fields are read. A sign-out keeps it.
- `mobile/src/app-providers.tsx`: mounts `PushRegistration` and `PushAskHost`.
- `mobile/src/screens/party/form/use-send.ts`: in `useSendParty`, which both the Party form (through `useSend`) and the Proposal card (`mobile/src/screens/main/use-proposal-making.ts`) use, call `useAskForPush()` at the top and, after `invite()`, call the function when `friends.length - missed > 0`.
- `mobile/src/screens/main/library/book-seat-card.tsx` (`BookSeatCard`) and `book-room-card.tsx` (`LiveRoomCard`): take `useAskForPush()` in the component, and in its `setClosed`, call the function when the card closes as `'booked'`. `sendBooking` stays as it is.
- `mobile/src/auth/sign-in.ts`: in `signOutOfMainServer`, call `unregisterPush()` from `@/push/device` before `forgetTokens()`, whatever the server call answered.
- `mobile/src/session/session-events.ts`: in `endSession`, call `unregisterPush()` before `forgetTokens()`.
- `mobile/README.md`: the section "Push notifications" says when the app asks, registers, and unregisters.
- `main-server/test/answers/expo-push-ok.json`: replaced by a real ok answer, captured with the curl of ticket 02 sent to the phone's real token copied from `/push-check`, with the token in the saved file replaced by a made-up one.

## Behavior

- `PushRegistration` runs only when `useSession().status === 'ready'`, `asksMainServer()` is true, and `pushAvailable()` is true. Then, when `pushPermission()` is `granted`, it gets `expoPushToken()` and calls `apiClient.registerPushToken`. It does so on mount, when the Session becomes ready (a sign-in), and from `onPushTokenChange`. A failure is ignored; the next start tries again. It never asks for the permission itself.
- `askForPush()` shows the sheet only when the same three conditions hold, `pushPermission()` answers `undetermined`, and `pushAsked` is false. `undetermined` means the phone's own prompt can still show: a permission that was never asked, which Android 13 and later report as denied but still askable and the wrapper reads as `undetermined`. It sets `pushAsked` when the sheet shows. When the permission is already `granted` (Android 12 and below), it registers the token at once without the sheet.
- The sheet's words are the design's: "나설 시각을 휴대폰으로 알려 드릴까요?" (Shall I notify your phone at leave-by time?), "나설 시각, 초대, 예약, 관심만 보내요." (Only leave-by times, invitations, bookings, and interests are sent.), "알림 받기", "나중에", and "나중에를 고르면 알림 목록에만 남아요." (If you choose later, they stay only in the notification list.).
- "알림 받기" calls `askPushPermission()` and closes the sheet. On `granted` it registers the token at once.
- The sheet appears after the action succeeded, so it never blocks or undoes the action.
- `unregisterPush()` failing is ignored, and the sign-out or the end goes on.
- Nothing is asked at app start, at sign-in, at Onboarding, or in first run.

## Must not change

- Any screen in a mock build: the Maestro flows and the acceptance-test flows run as before.
- Native files: `mobile/app.json`, `mobile/app.config.ts`, `mobile/plugins/`, `mobile/modules/`, and the dependencies in `mobile/package.json`.
- The default mock of `@/push/device` in the test setup: the new tests opt in with `jest.mock('@/push/device', () => jest.requireActual('@/push/device'))` and their own `jest.mock('expo-notifications', …)`.
- The screens of the answer on the map (package B's files). "여기로" (go here) and "이대로 초대" (invite as is) call `useAskForPush()` when B builds them; this ticket does not add them.
- `main-server/` other than the saved answer.

## Acceptance criteria

- [ ] In a server build with the permission granted, the app sends `PUT /users/me/push-token` with the mocked token at start, again after a sign-out and sign-in, and when the token-change listener fires.
- [ ] With the permission undetermined or denied, nothing is sent at start.
- [ ] In a mock build, and without the native module, no permission is read, no sheet shows, and nothing is sent.
- [ ] A sign-out calls `unregisterForNotificationsAsync` once, also when the fake main server fails `POST /auth/sign-out`. An end announced by the server (a 401 that ends the Session) calls it too.
- [ ] Sending a Party that invites a Friend from the Party form shows the sheet once, and the sheet is still on screen after the form navigates to the next screen. "알림 받기" calls the prompt and then sends the token. Sending another Party does not show it again.
- [ ] Sending a Party that invites a Friend from the Proposal card shows the sheet under the same rules.
- [ ] "나중에" closes the sheet without the prompt, and the sheet never shows again on that phone, also after a sign-out and sign-in.
- [ ] A booked seat or room shows the sheet under the same rules.
- [ ] Sending a Party without a Friend does not show the sheet.
- [ ] An older stored `Kept` value without `pushAsked` reads as false.
- [ ] On Android, with the permission reported as denied but still askable, the sheet shows, and "알림 받기" leads to the prompt and the registration.
- [ ] The app registers once at a start, though the phone tells of its token after every fetch of it.
- [ ] The whole mobile suite passes. The one existing test that changes is `__tests__/api/sign-in.integration.test.ts`, whose expectations list every field the phone keeps and gain `pushAsked: false`.
- [ ] On a development build of this branch on a phone, against the local stack running ticket 02, a phone that allowed notifications receives a push when a second test account (on another phone, an emulator, or curl) invites it. The receipt of that send, read with curl from `https://exp.host/--/api/v2/push/getReceipts` about 15 minutes later, is `ok`, and its result is recorded under Comments. The real ok answer replaces `expo-push-ok.json`.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `mobile/` and `main-server/`; CI's `app-fingerprint` passes without a native change.

## How a reviewer checks it

1. Read CI's `app-fingerprint` result: it must say the native part did not change.
2. On a development build against the local stack with ticket 02, sign in on two devices with two test accounts that are Friends. On device 1, send a Party that invites device 2's User; device 1 sees the sheet once.
3. On device 2, send a Party with a Friend and choose "알림 받기". Close the app on device 2, invite it from device 1, and see the push arrive.
4. Stop the local stack's main server, sign out on device 2, start the server again, and invite device 2 again: no push arrives, since the phone unregistered itself through Firebase. A sign-out with no network at all cannot unregister (the spec, "Tokens on the server").

## Comments

### Agent usage (2026-11-14, review)

The review before the merge: two Opus 5.5 reviewers of this pull request (the ticket and the repository's rules; correctness over time), one agent that read Expo's documentation of the notification permission, one Opus 5.5 subagent for the fake phone of the tests and the wrapper's forgetting of an unregistered token, and a quarter of the session that read the four pull requests of P04 and decided what merges, up to this commit. The implementation's own usage is not in these numbers.

- Agent time: about 20 minutes, an estimate from the transcripts' timestamps (a quarter of the session's active time, with the fixer's; the reviewers ran inside it).
- Tokens: output 105,299; input 20,385,459, of which 19,973,088 were cache reads, 412,179 cache writes, and 192 uncached. Without cache reads: 517,670.
