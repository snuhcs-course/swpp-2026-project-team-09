# 02: Invite Link

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User creates an Invite Link and sends it through any messenger. Whoever opens it sees who sent it and, on accepting, becomes that User's Friend with no further step. The link works once and for 24 hours.

The link is an https address on the team's server. Android opens the app from it through App Links, for which the main server serves the Digital Asset Links file. Whether a messenger hands the link to the app can only be seen on a phone, once the app handles the link (P14): that check is a person's, and the agent records its result under Comments.

## Acceptance criteria

- [x] Creating an Invite Link returns its address, built from the main server's public address and a random token. The link expires 24 hours after it was created. A User may hold several unused links.
- [x] A signed-in User asks about a token and gets the sender's name and department, and whether the link can be used: usable, used, expired, the User's own, or from someone already a Friend.
- [x] Accepting a usable link creates the friendship and uses the link up. Accepting is refused, each with a code of its own, for a link that is used, expired, the User's own, or from a Friend, and for a token nobody made.
- [x] Declining is not a request: a link that nobody accepted stays usable until it expires.
- [x] Two Users accepting one link at the same moment leave one friendship: one is accepted and the other is told that the link is used.
- [x] `friends-changed` goes to both Users when a link is accepted.
- [x] The public address is a setting. The server stops at startup and names it when it is missing, and the example settings file lists it with a one-line comment.
- [x] The main server serves the Digital Asset Links file at the address Android asks for, without a redirect and without a token, with the app's package name and the fingerprints of its signing certificates. The fingerprints are a setting that takes several, so that a development build and the demo build both open.
- [x] Main server tests at the API: a link created and accepted, each refusal, the two simultaneous accepts, a link past its 24 hours, and the Digital Asset Links file with the configured fingerprints.
- [ ] A person opens an Invite Link on a phone from KakaoTalk and from the phone's message app, once the app handles the link (P14). Where a messenger shows the address in its own browser, a page is added at the link's address with a button that opens the app, and the check is repeated. What was seen is recorded under Comments.
- [x] The main server's README records the routes, the refusals, the two settings and how to compute a certificate's fingerprint.

## Comments

### Decisions (2026-10-04)

- **Routes**, all a User's: `POST /invite-links` → `201 { url, expiresAt }`, where `url` is
  `<PUBLIC_URL>/invite/<token>` and the token is 32 random bytes in base64url (43 characters);
  `GET /invite-links/:token` → `{ sender: { name, department }, status }` with `status` one of `usable`, `used`,
  `expired`, `own`, `friend`; `POST /invite-links/:token/accept` → 204. Looking up is the only step before accepting:
  declining sends nothing.
- **Refusals**: `INVITE_LINK_NOT_FOUND` 404 (looking up and accepting), `OWN_INVITE_LINK` 400, `INVITE_LINK_USED` 409,
  `INVITE_LINK_EXPIRED` 410, and `ALREADY_FRIENDS` 409 from ticket 01 for a Friend's link. Checked in that order: own,
  used, expired, Friend.
- **Table**: `invite_links (id, sender_id, token_hash unique, expires_at, used_at)`. Only the SHA-256 of the token is
  stored, as for refresh tokens.
- **`FriendsService.befriend(senderId, receiverId, alongside: (tx) => Promise<void>): Promise<void>`** makes two Users
  Friends at once under the lock of both Users, turning a Friend Request waiting between them (from either) into the
  friendship, and sends `friends-changed` to both. `alongside` runs in the same transaction; accepting uses the link up
  there, only while `used_at` is empty, so of two simultaneous accepts the second gets `INVITE_LINK_USED`. It refuses
  `ALREADY_FRIENDS` before running `alongside`.
- **Settings**: `PUBLIC_URL` (an http or https address, a trailing `/` dropped) and `ANDROID_CERTIFICATE_FINGERPRINTS`
  (SHA-256 fingerprints `AA:BB:…`, separated by commas, at least one). Startup stops and names either when it is
  missing or invalid.
- **Digital Asset Links**: `GET /.well-known/assetlinks.json`, `@Public()`, answers the file for the package
  `com.bonnieandclaude.snunow` (a constant in `src/invite-links/asset-links.controller.ts`, since `mobile/app.json` does
  not set one yet) and the configured fingerprints. The link's address `/invite/<token>` has no page yet.
- **Not checked**: opening a link on a phone from KakaoTalk and from the message app needs the app to handle the link
  (P14), so that criterion is left to a person.
