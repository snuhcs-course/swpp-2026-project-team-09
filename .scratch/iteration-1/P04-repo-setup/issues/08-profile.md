# 08: View and edit the profile

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

A signed-in SNU student views and edits their own name, department, admission year and interest hashtags, so that others and Matching know who they are.

The profile screen belongs to P06.

## Acceptance criteria

- [ ] A signed-in User reads their own profile: name, department, admission year and interest hashtags.
- [ ] A signed-in User changes any of these fields. The response and a later read show the saved values.
- [ ] Invalid values are refused with 400 and a message naming the field, for example an empty name, an admission year outside a plausible range, or too many or too long hashtags. The limits chosen are stated in the API's data transfer objects.
- [ ] A User can only read and change their own profile through these routes.
- [ ] A request without a valid access token gets 401.
- [ ] Tests through the public API cover reading, editing, and each validation rule.
