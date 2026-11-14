# 06: After the review of tickets 01 to 04: three fixes, and what stays open

Parent: [spec](../spec.md) ("Tokens on the server", "Sending", "The app: registration and the permission")
Status: needs-triage
Blocked by: None
Native files: no

## What this is

Tickets 01 to 04 are merged. Their review fixed what blocked the merge. This ticket's pull request fixes three more of the review's points, and the rest is listed below for triage: each point can become a ticket of its own or be closed as `wontfix`.

## What to build

1. **A `DeviceNotRegistered` answer deletes only the row that still holds the token sent.** Registering upserts by Session, so a Session that registers another token keeps its row's id. When it does so while a send to its old token is in flight, the answer for the old token must not delete the row, which holds the new token by then. The delete matches the row's id and the token that was sent.
2. **Nothing about push is asked or registered on iOS.** The iOS build holds the notifications module but no push entitlement, so no push can arrive there. The one condition the registration and the sheet go through also requires Android.
3. **An unregistering that did not go through is tried again.** Unregistering is Firebase's delete of the phone's token and needs the network, so a sign-out with no network left the phone registered. The wrapper's `unregisterPush()` now answers whether it went through. When it did not, the phone keeps `pushUnregisterOwed`, and with nobody signed in the app tries again at a start and each time it comes to the front, until it goes through. A sign-in clears it, since the phone's token then moves to the new Session. No token of the ended Session is kept for this.

## Acceptance criteria

- [ ] A Session that registers another token before Expo answers `DeviceNotRegistered` for its old one keeps its row with the new token, and the next invitation is sent to the new token.
- [ ] On iOS, a Party sent with a Friend shows no sheet and reads no permission, and nothing is registered at a start.
- [ ] `unregisterPush()` answers true when the phone is unregistered or has no native module, and false when the library call fails or does not answer within 3 seconds.
- [ ] After a sign-out whose unregistering failed, the phone keeps `pushUnregisterOwed`. With nobody signed in, the app unregisters once when it next comes to the front and once at a start, and no more after it went through.
- [ ] A sign-in after a failed unregistering clears `pushUnregisterOwed`, registers the token for the new Session, and nothing unregisters the phone afterwards.
- [ ] An older stored value without `pushUnregisterOwed` reads as false.
- [ ] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `mobile/` and `main-server/`; no native file changes.

## What stays open

### The main server (ticket 02)

- **A row under an ended Session.** A registration that races with the end of its Session can insert its row after the Session's rows were deleted. The row is never sent to and never deleted, and it holds the unique token until that phone registers again.
- **The booking Party's invitations are not pushed.** `main-server/src/library/room-requests.service.ts` creates them itself, not through `invite()`. They belong with the booking's notifications.
- **The log line of a kept row.** When a `DeviceNotRegistered` answer meets a row that holds another token by then, the info line still says the row was deleted.
- **Tests.** The "Expo never answers" test waits the real 5 seconds. The second try after a unique-constraint collision in `register`, a database failure inside a send, and an answer with fewer or more tickets than messages have no test.

### The wrapper (ticket 01)

- `askPushPermission()` reads `granted` while `pushPermission()` reads `status`. On Android 13 and later the two would disagree if the runtime permission is granted while the app's notifications are switched off.
- The library records a permission as denied for good when the User dismisses Android's prompt without answering (`expo-modules-core`, `PermissionsService.kt`). The sheet shows once anyway.
- `mobile/assets/images/notification-icon.png` is not among the fingerprint's file sources: the plugin's settings are hashed as text, so redrawing the icon changes no fingerprint.
- `mobile/__tests__/push/device.unit.test.ts` is at the lint's 300 lines. Its next test needs a second file.

### Registration and the sheet (ticket 03)

- **Until the app runs again**, a phone whose unregistering did not go through is still registered, and the server's Session stays open until its refresh token expires. Closing that needs the phone to keep a credential after a sign-out, which it does not.
- **An unregistering that finishes late.** The wrapper stops waiting after 3 seconds, but the phone's own call goes on. When it ends after a quick sign-in on the same phone, it deletes the token the new Session just registered, and that Session gets no push until the app's next start registers again.
- `askForPush` reads the Session's state from the render before the send, so a Session that ends in the middle of a send can still be asked once.
- A permission granted later in the phone's settings registers only at the next start or sign-in.

### A tapped push (ticket 04)

- An invitation's tap waits for the map's cards before it falls back to the invitations tab. When the cards never load, it stays on the map. When a screen is opened above the tabs before they arrive, the fallback can add a second tab navigator.
- A tap made while signed out opens after the next sign-in, whoever signs in. It opens that User's own screens only.
- A last response whose data is not an address is never cleared, and the check for a tap that comes twice holds one identifier.

## Not checked by the review

- A real push from the main server to a phone, and its receipt. It needs the FCM V1 key in the EAS project.
- The phone checks of tickets 03 and 04, and ticket 01's phone check with the wrapper as it is now.
- `main-server/test/answers/expo-push-ok.json` is the documented format, not a captured answer.
- A Gradle build, and an Xcode build with signing. `expo prebuild` ran for both platforms: the manifest holds the default channel, icon, and color, Gradle applies the Google services plugin, and the iOS entitlements hold no `aps-environment`.

## What a person does

1. Uploads the FCM V1 service account key to the EAS project, by 11/17.
2. Restricts the Android API key of `mobile/google-services.json` in the Google Cloud console to the FCM Registration API and the Firebase Installations API, then checks that a development build still gets a token.
3. Checks a real push on a phone, on a development build of the iteration's Main.
4. Makes the 11/19 native Release, then the iOS build.

## Comments

### Decided (2026-11-14)

- **The phone alone tries again, and keeps no credential for it.** Telling the main server later would need an access or refresh token on a phone that has signed out. The phone keeps only that an unregistering is owed. Once the phone's token is deleted, the server's next send to it is answered with `DeviceNotRegistered` and its row goes; the Session itself ends when its refresh token expires, as it did before.
- **"When the network returns" is the app coming to the front.** The app has no network-state listener, and the front is when a User would notice.
- **iOS is closed at the condition the registration and the sheet share**, not in the wrapper, so the wrapper still answers about the library on both platforms.

### Agent usage (2026-11-14)

Up to the opening of the pull request. The session that reviewed and merged tickets 01 to 04, from the last of those merges on, with two Opus 5.5 subagents (the main server's fix; the app's two fixes and the split of a test file). The review that found these points is recorded on tickets 01 to 04.

- Agent time: about 38 minutes, an estimate from the transcripts' timestamps (the session's and the subagents' active stretches together, gaps of five minutes or more left out).
- Tokens: output 96,127; input 32,935,075, of which 32,689,662 were cache reads, 245,207 cache writes, and 206 uncached. Without cache reads: 341,540.
