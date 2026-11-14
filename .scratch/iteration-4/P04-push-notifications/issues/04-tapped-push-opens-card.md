# 04: A tapped notification opens its card (app)

Parent: [spec](../spec.md) ("The app: opening a tapped notification")
Status: done
Who: the server-side member
Blocked by: None: 01 is on the iteration's Main, and so is this ticket. The check on a phone in "How a reviewer checks it" needs 02 and 03 on two devices.
Native files: no

## What to build

Tapping a push, whether the app was closed or open, takes the signed-in User to the address in its data, `/main?card=<kind>:<id>`, once the User is past the loading screen, the consent, and Onboarding. The map opens the card with that id when it has one, and otherwise the screen the matching row of "알림" (notifications) opens. For a received invitation that is the "파티" (party) tab's invitations, until the answer screen adds an invitation card. A push that arrives while the app is open drops no banner and makes no sound, goes to the phone's notification list, and makes the app fetch "알림" and the "파티" badge again.

## Files

Create (each with the AI-generated box):
- `mobile/src/push/card-address.ts`: pure functions. `readCardAddress(url: unknown): { kind: string; id: string } | null` accepts only `/main?card=<kind>:<id>`, where kind is lowercase letters and `-`, and id is letters, digits, `-`, `.`, and `,` (a Place group's id is `place:<latitude>,<longitude>`). `readCard(card: string)` reads the `card` parameter alone, for `use-asked-card.ts`. `fallbackFor(kind)` gives the screen of the list's row: `invitation` to `{ pathname: '/party', params: { tab: 'invites' } }`, and the main map for any other kind.
- `mobile/src/push/use-notification-links.ts`: `useNotificationLinks(here: boolean)`. While `here` is true, it reads `getLastNotificationResponse()` once and subscribes to `addNotificationResponseReceivedListener`; while false, it does neither. For each response with a valid address, it goes to `{ pathname: '/main', params: { card } }`, with `router.dismissTo` when `router.canDismiss()` (a screen sits above the tabs, and closes) and with `router.navigate` otherwise (on the tabs, where `dismissTo` does nothing), as `showMine` in `mobile/src/screens/party/use-party-actions.ts` does, and then calls `clearLastNotificationResponse()`. It keeps the last handled `response.notification.request.identifier` in a ref and skips a response with the same identifier, so a cold-start tap that reaches both paths navigates once. It ignores any other data. These are SDK 57's names; the `…Async` forms are deprecated.
- `mobile/src/push/push-arrivals.tsx`: `PushArrivals`, a component that draws nothing, mounted in `mobile/src/app-providers.tsx` beside `LiveUpdates`. When the native module is present, it sets the handler for a push in front (below) and subscribes to `addNotificationReceivedListener`, which invalidates the queries of `WAITING`, as `refetch` in `live-updates.tsx` does.
- `mobile/src/screens/main/use-asked-card.ts`: like `use-asked-person.ts`, it reads `card` once the cards are known, clears it with `router.setParams`, and either moves the map to the card and selects it, or routes to `fallbackFor(kind)`.
- `mobile/__tests__/push/card-address.unit.test.ts` and `mobile/__tests__/push/notification-links.integration.test.tsx`.

Change:
- `mobile/src/app/(signed-in)/_layout.tsx`: `SignedInLayout` calls `useNotificationLinks(away === null)` beside `useInviteLinks(away === null)`, before the early return.
- `mobile/src/screens/main/main-screen.tsx`: the call of `useAskedPerson` becomes a call of `useAskedByAddress` (in `use-asked-card.ts`), which calls `useAskedPerson` unchanged and then `useAskedCard`. A line of its own would pass the lint's 50 lines for `MainScreen`. The file is package B's; name B's owner as a reviewer in the pull request.
- `mobile/src/push/device.ts`: wrappers for the four library calls above and `setNotificationHandler`, each a no-op or null without the native module. The handler for a push in front is `{ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }`: on Android a banner cannot show without sound, and the open app shows the change itself.
- `mobile/src/live/live-updates.tsx`: export `WAITING`, unchanged. The file is package C's real-time signal handling; change nothing else, and name C's owner as a reviewer in the pull request.
- `mobile/README.md`: the section "Push notifications" says what a tap opens and what a push in front does.

## Must not change

- What `?person=`, `?quest=`, and `?tutorial=` do on `/main`, and Invite Links.
- The card ids in `mobile/src/features/map/adapter.ts` (package B's file); the hook matches the id string `<kind>:<id>` directly.
- Native files, and any screen of a mock build. The Maestro flows and the acceptance-test flows run as before.
- What the default mock of `@/push/device` in the test setup reports: unavailable. It gains a no-op entry for each new wrapper, since it is typed as the whole module. The new integration test opts in as ticket 03's do.
- `main-server/`.

## Acceptance criteria

- [x] Unit tests: `/main?card=invitation:<uuid>`, `/main?card=friend:<uuid>`, and `/main?card=place:37.4592,126.9524` are read; `/me`, `https://example.com`, `/main?card=`, `/main?card=friend`, a number, and null are refused; `invitation` falls back to the invitations tab, and an unknown kind to the main map.
- [x] Integration test: the app started signed in with a last response whose address is `/main?card=invitation:<id>` ends at `/party?tab=invites` only after the loading screen, and the last response is cleared.
- [x] Integration test: a last response present while Onboarding is unfinished opens its address after Onboarding ends.
- [x] Integration test: with a Friend on the map, a response to `/main?card=friend:<id>` received while the app runs moves the map to that Friend and opens the Friend's card, and `card` is gone from the address.
- [x] Integration test: the same response given both as the last response and through the listener (the test captures the listener passed to the mocked `addNotificationResponseReceivedListener` and calls it) navigates once.
- [x] Integration test: a response whose data is not a valid address leaves the app where it was.
- [x] Integration test: a push received while the app runs (the test calls the listener captured from the mocked `addNotificationReceivedListener`) makes the app fetch the invitations again from the fake main server.
- [x] The whole mobile suite passes, with no change to existing tests.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass in `mobile/`; CI's `app-fingerprint` passes without a native change.

## How a reviewer checks it

1. With 02 and 03 in place, on a development build against the local stack on two devices, invite device 2 from device 1 while the app on device 2 is closed. Tap the push: device 2 opens on the "파티" tab's invitations, with the invitation there.
2. Do it again with the app open on device 2: no banner drops and no sound plays, the push is in the phone's notification list, and the "파티" badge updates. Tapping it in the list opens the same screen.
3. Accept on device 2 and tap the old push again from the notification list if it is still there: the app opens the invitations tab without the invitation, and nothing breaks.

## Comments

### Agent usage (2026-11-14, review)

The review before the merge: two Opus 5.5 reviewers of this pull request (the ticket and the repository's rules; correctness and security), one Opus 5.5 subagent for the review's fix of a tap made above the tabs, and a quarter of the session that read the four pull requests of P04 and decided what merges, up to this commit. The implementation's own usage is not in these numbers.

- Agent time: about 20 minutes, an estimate from the transcripts' timestamps (a quarter of the session's active time, with the fixer's; the reviewers ran inside it).
- Tokens: output 104,209; input 21,817,018, of which 21,452,366 were cache reads, 364,430 cache writes, and 222 uncached. Without cache reads: 468,861.
