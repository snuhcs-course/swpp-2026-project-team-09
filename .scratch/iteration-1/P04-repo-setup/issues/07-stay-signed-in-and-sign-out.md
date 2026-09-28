# 07: Stay signed in and sign out

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

An SNU student stays signed in for weeks: when the access token expires, the app exchanges the refresh token for new tokens without the User doing anything. Signing out ends every session of that User and turns off their Master Switch, so that their location is not shared after they leave.

Turning the Master Switch on and what it controls belong to P06 and P08.

## Acceptance criteria

- [ ] A valid refresh token returns a new access token and a new refresh token. The used refresh token is refused afterwards.
- [ ] An expired, revoked or unknown refresh token is refused.
- [ ] Signing out revokes every refresh token of that User. None of them can be exchanged afterwards.
- [ ] The User has a Master Switch, off when the User is created.
- [ ] Signing out turns the Master Switch off.
- [ ] Tests through the public API cover: refresh replaces the token and the old one stops working; sign-out revokes; the stored Master Switch is off after sign-out.
