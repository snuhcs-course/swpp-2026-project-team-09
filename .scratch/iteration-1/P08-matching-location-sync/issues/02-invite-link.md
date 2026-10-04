# 02: Invite Link

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User creates an Invite Link and sends it through any messenger. Whoever opens it sees who sent it and, on accepting, becomes that User's Friend with no further step. The link works once and for 24 hours.

The link is an https address on the team's server. Android opens the app from it through App Links, for which the main server serves the Digital Asset Links file. Whether a messenger hands the link to the app can only be seen on a phone, once the app handles the link (P14): that check is a person's, and the agent records its result under Comments.

## Acceptance criteria

- [ ] Creating an Invite Link returns its address, built from the main server's public address and a random token. The link expires 24 hours after it was created. A User may hold several unused links.
- [ ] A signed-in User asks about a token and gets the sender's name and department, and whether the link can be used: usable, used, expired, the User's own, or from someone already a Friend.
- [ ] Accepting a usable link creates the friendship and uses the link up. Accepting is refused, each with a code of its own, for a link that is used, expired, the User's own, or from a Friend, and for a token nobody made.
- [ ] Declining is not a request: a link that nobody accepted stays usable until it expires.
- [ ] Two Users accepting one link at the same moment leave one friendship: one is accepted and the other is told that the link is used.
- [ ] `friends-changed` goes to both Users when a link is accepted.
- [ ] The public address is a setting. The server stops at startup and names it when it is missing, and the example settings file lists it with a one-line comment.
- [ ] The main server serves the Digital Asset Links file at the address Android asks for, without a redirect and without a token, with the app's package name and the fingerprints of its signing certificates. The fingerprints are a setting that takes several, so that a development build and the demo build both open.
- [ ] Main server tests at the API: a link created and accepted, each refusal, the two simultaneous accepts, a link past its 24 hours, and the Digital Asset Links file with the configured fingerprints.
- [ ] A person opens an Invite Link on a phone from KakaoTalk and from the phone's message app, once the app handles the link (P14). Where a messenger shows the address in its own browser, a page is added at the link's address with a button that opens the app, and the check is repeated. What was seen is recorded under Comments.
- [ ] The main server's README records the routes, the refusals, the two settings and how to compute a certificate's fingerprint.
