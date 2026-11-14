# P04: Push notifications

Status: ready-for-agent

Schedule row: Iteration 4, package D of the agentic map (push notifications). The server-side member builds all of it. The native part ships in the one native Release on 2026-11-19, which the builder makes; the server part merges after the 11/18 acceptance test, and the app parts follow the native part.

References:
- `.scratch/iteration-4/agentic-map-design.md`: section 5 ("Notifications", "Parties and invitations", "A late member"), section 7 (what is never recorded or sent), and section 8 (turning notifications off by kind is left out).
- `.scratch/iteration-4/agentic-map-work-split.md`: section 3 (the address a notification opens, `/main?card=<kind>:<id>`, the notification service, and the signal names), section 4 (who changes which files, and the order of schema changes), section 5 (nothing new is released before 11/18), section 7 (the native Release and what stands in before it), and section 8 (Iteration 5).
- The wireframe row "11. 알림 모음" (all notifications): its rules (2) an acceptance stays only in the list, (3) a late member, and (4) when the permission is asked, and its boards t3 (an invitation arrives), t14 to t19 (the list), and t17 (the permission sheet).
- `CLAUDE.md`, "The app's native files", and `infra/production/README.md`, "The Production APK" and "The Production iOS build".
- ADR 0007 (test levels).

## Problem Statement

A User invited to a Party learns about it only when they open the app and look at "알림" (notifications) or the badge on the "파티" (party) tab. The design has the Assistant speak first at certain moments: an invitation, the leave-by time, a booking, and a watched interest. A User whose app is closed hears none of them, so an invitation for a lunch in 30 minutes can go unseen until the lunch is over.

The app has no push today. Receiving a push needs a native module and Firebase settings, which change the app's fingerprint. Installed apps then take no update over the air until a new native build is installed. The acceptance tests on 11/16 and 11/18 run on today's app, so the native part can change only once, in the Release on 11/19.

## Solution

From the 11/19 Release, the app can receive a push. A signed-in User's phone gives the main server its Expo push token, once the User allows notifications. The token belongs to the User's Session. It stops being used when that Session ends, whether by sign-out, by a sign-in on another phone, by a reused refresh token, or by a refresh token that expired.

The main server sends through Expo's push service. Expo passes the message to Firebase Cloud Messaging. The server holds no Firebase key. A token that Expo reports as no longer registered is deleted.

The first moment that is pushed is a received invitation: a User invited into a Quest gets "<Leader>님의 파티 초대" (<Leader>'s party invitation) with the Quest's title, the same words as the invitation's row in "알림". Tapping it opens the address `/main?card=invitation:<invitationId>`. The app opens the matching card on the map, or the screen the list row opens when the map has no such card yet.

The permission is asked the first time the User sends an invitation or books, once that action has gone through, never at app start or at sign-in. A User who says no still sees everything in "알림".

Before the Release, the in-app list stands in for push, as it does today.

## User Stories

1. As an SNU student, I want a Friend's invitation to reach my phone while the app is closed, so that I can answer before the Party starts.
2. As an SNU student, I want the push to say who invited me and to what, so that I can decide without opening the app.
3. As an SNU student, I want tapping the push to open the invitation, so that I can accept or decline in one more tap.
4. As an SNU student, I want the push and the row in "알림" to say the same thing, so that I am never unsure whether they are two invitations.
5. As an SNU student, I want every invitation that was pushed to also be in "알림", so that I can find it after I swipe the push away.
6. As an SNU student, I want to be asked about notifications right after I first do something that needs them, so that the question makes sense when it comes.
7. As an SNU student, I want to be told what kinds of notifications I would get before the phone's own prompt, so that I can decide with that knowledge.
8. As an SNU student who chooses "나중에" (later), I want the app to keep working and keep the list, so that saying no costs me nothing else.
9. As an SNU student who chose "나중에", I want the app not to ask me again and again, so that it does not nag.
10. As an SNU student, I want no notification question at the app's first start, at sign-in, or during Onboarding, so that the first run stays short.
11. As an SNU student, I want no push when someone accepts or declines my invitation, so that the accepted mark on the map is enough and my phone stays quiet.
12. As an SNU student, I want no push for a Friend Request, a request to join my Quest, or a Party someone turned on, so that only the moments the Assistant hands me ring my phone.
13. As an SNU student who signs out, I want my phone to stop getting my notifications, even when the sign-out could not reach the server, so that the next person on the phone does not see them.
14. As an SNU student who signs in on a new phone, I want my notifications to go only to the new phone, so that my old phone stays quiet.
15. As an SNU student who lends my phone to a friend who signs in, I want my notifications to stop on that phone, so that my friend never sees my invitations.
16. As an SNU student, I want a push that arrives while I use the app to update "알림" and the "파티" badge at once, so that what I see is current.
17. As an SNU student, I want a push tapped while the app is closed to open the same card as one tapped while the app is open, so that it always works the same way.
18. As an SNU student, I want a push to carry no one's location, so that nobody's position travels through notifications.
19. As the builder, I want every native change for push in one pull request for the 11/19 Release, so that the fingerprint changes once and installed apps keep taking updates.
20. As the server-side member, I want the server part built and tested in the days around the Release, so that sending works soon after phones can receive.
21. As the server-side member, I want every test to stop at a stand-in for Expo's service, so that no test sends a real push.
22. As the server-side member, I want one place on the server that sends a push, so that later kinds (leave-by, booking, interests) add a message and one call, not a new sender.
23. As a reviewer, I want a development build to show the phone's token and a test push to arrive, so that I can check the native part without the server.
24. As a developer of the answer screen, I want a notification's address to be `/main?card=<kind>:<id>`, so that a card I add later opens from a push with no change on the server.

## Implementation Decisions

### The native part (11/19 Release)

- The app adds the `expo-notifications` module at the version Expo picks for SDK 57, with `expo-constants` raised to the version it asks for so that one copy is installed, and its config plugin with three settings: a notification icon (a 96 by 96 PNG, white on transparent), the accent color `#208AEF`, and the default channel `default`.
- Firebase's Android settings file, `google-services.json`, is committed at `mobile/google-services.json` and joins the app's configuration through `android.googleServicesFile`. Its bytes are part of the fingerprint, and committing it gives CI's `app-fingerprint` job, the Release workflow, the dev APK, and every developer the same bytes. The file holds no secret. Its Android API key is restricted by API in the Google Cloud console to the FCM Registration API and the Firebase Installations API, by a person, before the Release.
- The FCM V1 service account key is in the EAS project's credentials only. No key is committed, and none is put on a server.
- iOS push is out of scope. The iOS build is made by hand with a free Apple ID's team, which cannot sign the push entitlement. A small iOS config plugin removes the `aps-environment` entitlement that the notifications plugin adds. It is listed before `expo-notifications` in `plugins`: a mod registered later runs first, so the plugin listed first runs last and removes what the notifications plugin added.
- `version` in `mobile/app.json` is raised once for the Release, in the first native pull request of the Release, as the Release procedure requires.
- One Android channel, id `default`, named "알림" (notifications), with high importance. The same id is used in three places: the plugin's default channel, the app's channel creation, and the server's `channelId`.
- A thin module, `mobile/src/push/device.ts`, wraps the notifications library for the rest of the app: whether the native module `ExpoPushTokenManager` is present, the permission state, asking for the permission (the channel is created first, since Android 13 shows no prompt before a channel exists), the Expo push token for the EAS project id in the app's configuration, a listener told when the token changes, and unregistering the phone from push, which waits at most 3 seconds. Android 13 and later report a permission that was never asked as denied but still askable, so on Android the wrapper reads that as undetermined: undetermined means the phone's own prompt can still show. The library sends its token event after every fetch of the token, so the wrapper tells its listener only of a token that differs from the last one. Without the native module (the web, a build before 11/19) it reports "unavailable" and never throws. In Jest, the jest-expo preset supplies stand-ins for the native modules, so the module would look present. The test setup therefore mocks the wrapper to report "unavailable" by default, and only the push tests opt in to the real wrapper over a mocked `expo-notifications`.
- A developer screen `/push-check`, like `/ocr-check`, shows the permission and the token in a development build only.

### Tokens on the server

- A new table of push tokens. Each row belongs to one Session (unique) and holds one Expo push token (unique), with its created time. A row is deleted with its Session (cascade). Sessions are ended, not deleted, so the row goes in the transaction that ends its Session (below). Account deletion does not exist; when it is built, it must delete the User's push tokens too.
- `PUT /users/me/push-token` with `{ token }` registers the signed-in Session's token and answers 204. The token must look like an Expo push token (`ExponentPushToken[…]` or `ExpoPushToken[…]`, at most 200 characters); anything else is refused with 400.
- Registering is an upsert. The Session's earlier token is replaced. A row with the same token under another Session is deleted first, so a phone passed from one User to another sends nothing more to the first. Two registrations of the same token at once can collide on the unique token; the transaction is then tried once more.
- When a Session ends on the server (sign-out, `replaced`, or `refresh_token_reused`), its token row is deleted in the same transaction that ends it.
- The server cannot see every end. The app's sign-out ignores a failed server call, and a Session whose refresh token expired after 30 days is never marked ended. Two rules cover these:
  - The server sends only to Sessions that are open (`endedAt` null) and hold a refresh token that is neither revoked nor expired.
  - The app unregisters the phone from push whenever its Session ends on the phone (sign-out, or the end the server announced), before it forgets its tokens. The phone then receives nothing, even when the server still holds the row.
- There is no route to remove a token. A User who turns notifications off in the phone's settings keeps a token, and Expo's push to it is simply not shown.

### Sending

- One push service on the main server sends a message to a list of Users. It reads the tokens of their usable Sessions and posts them to Expo's send endpoint (`https://exp.host/--/api/v2/push/send`), at most 100 messages per request, with a 5-second timeout.
- It is the delivery layer for every notification. The Iteration 5 notification service of the work split (schedule, replace, and cancel, with the stored notification table) calls it, and is its only other caller. This spec adds no signals.
- The outside call goes through an injected fetch, as the walking route's call to Kakao does, so tests replace it.
- Each message carries `to`, `title`, `body`, `data: { url }`, `channelId: 'default'`, and `priority: 'high'`. No `sound` field: it affects iOS only, and on Android the channel decides. The data holds only the address. No coordinates, no route, and no arrival time of anyone are ever in a message.
- A ticket whose error is `DeviceNotRegistered` deletes that token's row, with an info log line. Any other ticket error, a 4xx or 5xx answer, a timeout, or a network failure is logged as a warning.
- A log line holds only the row id, the error code (a ticket's `details.error`, or the `errors[].code` values of an answer), and the HTTP status. It never holds a token, Expo's `message` or `details`, the request body, or the response body. Expo's own error texts contain the whole token, and a leaked token lets anyone push to that phone while enhanced push security is off.
- Nothing is retried. Expo advises retrying network errors, 429, and 5xx with backoff; this version does not, on purpose, because the invitation stays in "알림" whatever happens to the push.
- Receipts are not read in code, against Expo's advice, on purpose. Errors such as wrong FCM credentials (`InvalidCredentials`) or a sender mismatch (`MismatchSenderId`) appear only in receipts, so the service logs each ok ticket's receipt id at debug level, and the manual checks read the receipt with curl. A token that fails only at the receipt step stays until a later send reports it on its ticket, and the app's unregistering keeps the phone quiet meanwhile.
- A send never fails the request that caused it. It starts after the transaction commits and is not awaited, as signals and the end of a Session are announced today. Each main server pod sends for the requests it handles, with no state kept between requests. The service keeps its sends in flight in a set, and `settled()` waits for them, for tests only.
- A User with no token, or with no usable Session, is skipped without an error. That User has the list only.
- No Expo access token. Enhanced push security stays off, so no new setting or secret is added.
- The closed list of pushed kinds in this spec has one entry: a received invitation. Every later kind (leave-by, booking, interest) adds its own message function and one call in its own ticket.

### The received invitation

- When a Leader invites a Friend into a Quest, the invitee gets a push after the invitation is stored: title "<Leader's name>님의 파티 초대" (<Leader>'s party invitation), body the Quest's title, address `/main?card=invitation:<invitationId>`. These are the words of the invitation's row in "알림". Board t3 draws a richer title (the meeting time and Place) and a body about the plan; that text needs a Plan and comes with `POST /plans`.
- The invitation is created with the fields the message needs, inside the same transaction, so the message never depends on a second read that could find the invitation already answered.
- Every invitation is created through the one service that creates invitations today. A later `POST /plans` creates its invitations through it too, and so pushes them.
- An accepted invitation sends no push. By the wireframe's rule (2) an acceptance stays only in the list. The Leader sees it on the map and in the Quest. Keeping it as a row of "알림" needs the stored notification table and comes with it.
- A declined invitation sends no push. By the design a decline is pushed only when a better option exists, which needs planning again after a decline. That is not built.
- Friend Requests, requests to join a Quest, and a Party turned on send no push. They are not moments the Assistant speaks first, and the permission sheet does not name them.

### The app: registration and the permission

- A component that draws nothing, mounted beside the live-updates connection, registers the token. It runs only when the Session is ready, the build asks the main server, and the native module is present. It registers when the permission is granted, at every app start and sign-in, and again whenever the token changes. A failed registration is tried again at the next start.
- When the Session ends on the phone, the app unregisters the phone from push before it forgets its tokens. A failure there is ignored.
- `ApiClient` gains `registerPushToken(token)`. The server client calls the new route. The mock client does nothing, so mock builds never register.
- The permission sheet lives in one host, `PushAskHost`, mounted once inside the app's overlay host. It owns the sheet's state and draws it through the design system's overlay, so the sheet stays on screen when the screen that asked for it navigates away. `useAskForPush()` returns one function that asks the host to show the sheet.
- The sheet is board t17. It shows "나설 시각을 휴대폰으로 알려 드릴까요?" (Shall I notify your phone at leave-by time?), "나설 시각, 초대, 예약, 관심만 보내요." (Only leave-by times, invitations, bookings, and interests are sent.), the buttons "알림 받기" (get notifications) and "나중에" (later), and the footer "나중에를 고르면 알림 목록에만 남아요." (If you choose later, they stay only in the notification list.).
- The sheet appears the first time the User presses one of the design's buttons that exists in the app: sending a Party that invites at least one Friend, from the Party form or from the Assistant's Proposal card, and booking a seat or a room. It is shown once the action has gone through, so the question never blocks or undoes the action. "여기로" (go here) and "이대로 초대" (invite as is) call the same function when the answer screen builds them.
- The sheet appears only when the phone's permission is undetermined and the sheet was never shown on this phone. On Android 12 and below the permission is granted without a prompt, and the token is registered without the sheet. "알림 받기" leads to the phone's prompt. "나중에" closes the sheet, and the phone remembers it was shown, across sign-outs.
- Nothing is asked at app start, at sign-in, at Onboarding, or during first run.

### The app: opening a tapped notification

- A notification's data carries one address of the form `/main?card=<kind>:<id>`. The app accepts only that form and ignores anything else.
- The tapped address is read in the signed-in layout, only while the User is "here" (past the loading screen, the consent, and Onboarding), as Invite Links are: the last response at start (the app was closed) and each response while the app runs. It is cleared once handled, so it does not open again at the next start. A response already handled, recognized by its notification's identifier, is skipped, so a tap that reaches both paths at a cold start navigates once. A tap while signed out opens after sign-in.
- The app goes to `/main` with `router.dismissTo`, as other screens do, so screens above the tabs close.
- `/main` reads `card` once, as it reads `person`, and clears it. When the map's cards hold a card with that id, the map moves to it and opens it. Otherwise the app opens the screen the matching row of "알림" opens: for `invitation`, the "파티" tab's invitations (`/party?tab=invites`). The card ids on the map already have the form `<kind>:<id>`; a Place group's id holds a latitude and longitude, so the id may contain digits, letters, `-`, `.`, and `,`.
- While the app is in front, a push drops no banner and makes no sound, and it goes to the phone's notification list. On Android a banner cannot show without sound, and the open app shows the change itself: the arrival fetches again the lists "알림" and the "파티" badge are made from, as the app does when it returns to the front.

### Ownership and merge order

- `main-server/src/quests/invitations.service.ts` and the app's real-time signal handling (`mobile/src/live/live-updates.tsx`) are package C's files, and `mobile/src/screens/main/main-screen.tsx` is package B's. The tickets change only the lines they name in them, and their pull requests name the owner as a reviewer.
- The push tokens migration is a schema change. By the work split, the schema is changed by one person at a time, and only package C's late-minutes column goes in before 11/18. Ticket 02 therefore merges after the 11/18 acceptance test, and no Release carries it before 11/19. If package C's migration is open when ticket 02 is ready, C's merges first, and ticket 02's migration is made again from the new schema.
- The native part merges once its review passes, and the builder makes the Release on 11/19. From that merge on, an update published from the iteration's Main does not reach the installed 1.0.1 APKs: until the Release, a fix that must reach them is published from a branch cut before the merge. Tickets 03 and 04 are built on ticket 01's branch and merge after it.

### What stays as it is

- "알림" stays composed from the live lists. A kind is pushed only when "알림" shows it, so the list remains the record of everything sent. A stored notification table is not part of this spec.
- The socket server takes no part in push. It relays signals to open connections only.

## Testing Decisions

A good test states a behavior a User or a reviewer depends on, through a public seam. It checks what reaches Expo's stand-in or what the app shows and asks, never how the code gets there. Expected values are written by hand.

- **The server, unit tests.** The invitation's message (title, body, address) from a waiting invitation. Which tokens a send answer drops: an ok ticket, a `DeviceNotRegistered` ticket, and an error ticket with another code, in message order. The log lines never contain `PushToken[`.
- **The server, integration tests.** The seam is the started server over the database container, with a stand-in for Expo's endpoint given in place of the injected fetch. The stand-in refuses every call by default in all integration tests, so no test can reach Expo. A test waits for the sends in flight with the push service's `settled()` before it checks what the stand-in received, including that it received nothing, and before it closes the app. Covered: registering, a malformed token, sign-out, a sign-in on another phone, a reused refresh token, an expired refresh token, the same token under another User, an invitation pushed to the invitee's usable Session only, an invitee without a token, `DeviceNotRegistered` deleting the row, Expo failing or hanging without failing the invitation, and no push on acceptance or decline. Prior art: the walking route's tests and their Kakao stand-in, and the saved answers under the server's test answers.
- **The app, unit tests.** The thin wrapper over the notifications library with the library mocked: the call order (channel, then permission, then token), "unavailable" without the native module, and a failing token call giving null. The address check: which addresses are accepted, and where each kind falls back.
- **The app, integration tests.** The router over the real route files with the fake main server, the real wrapper, and `expo-notifications` mocked. The token registered at start when granted, and not in a mock build. Unregistering on sign-out, also when the server call fails. The sheet after sending a Party with a Friend, from the form and from the Proposal card, still visible after the form navigates away: "알림 받기" leads to the prompt and the registration, and "나중에" never shows it again. A tapped address at start and while running opens the right card or screen, once, and only after the loading screen. An arrival fetches the invitations again. Every existing test passes unchanged, because the wrapper reports "unavailable" by default. Prior art: the notifications and live-update integration tests, and the server-build setup in the test support.
- **No end-to-end test.** A phone receiving a real push is checked by hand, as each ticket's check says.

## Out of Scope

- **Notifications that need a scheduler or a stored notification table**: leave-by times (alone and together, with the 5-minute rule), a Party still on after its Plan ends, a reminder before an event starts, a library arrival or departure, a booking window opening, and a room ending. They need a due time stored and one sender across the main server pods. The work split puts the notification table and timed sending in package D in Iteration 5.
- **Keeping answered or list-only rows in "알림"** (an acceptance, a decline, a result in a muted tone, rows grouped by date). They need the stored table.
- **A late member's push.** By the design it goes only to members whose Plan changes, and the list must keep it. It needs the late report of package C and the stored table, and comes with them.
- **A decline pushed when a better option exists.** It needs planning again after a decline.
- **Interests and bookings**: their notifications come with their features.
- **iOS push.** Only the Android APK is distributed. The iOS build is made by hand with a team that cannot sign push.
- **Per-kind settings.** The design leaves them out. The phone's permission is the only switch.
- **Buttons on the push itself** ("파티 켜기" (party on), "늦어요" (I'm late), "바꾸기" (change)). They belong to kinds that are out of scope. Every tap opens the card.
- **Reading receipts in code, retries, and an Expo access token.**
- **Crash reporting.** It is not part of push, and it is not in the 11/19 Release: React Native Firebase's setup changes how the iOS pods are linked and needs an iOS settings file (ticket 05).

## Further Notes

- Until the 11/19 Release, and on any phone without the permission, "알림" and the "파티" badge stand in for push, as the work split's section 7 says.
- The 11/19 APK is built with Production's settings and talks only to the Production main server. Production gets the route and the sending with the first main-server Release after ticket 02 merges. Until then the phone checks run on a development build against the local stack.
- The push tokens table is not the notification table that the work split schedules after 11/18.
- After the Release, a JavaScript update that touches none of the native files reaches the 11/19 APK as before. Tickets 02 to 04 touch none.
