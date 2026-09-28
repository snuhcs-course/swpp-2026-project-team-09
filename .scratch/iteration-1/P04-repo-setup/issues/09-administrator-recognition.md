# 09: Recognise an Administrator

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Sign in with an SNU Google account)

## What to build

The main server recognises an Administrator by email address, so that an Administrator can manage Global Events without a separate account. An Administrator is a User whose email address is on a list in the main server's settings. A route can be marked as administrative, and only an Administrator passes it.

The administrative routes themselves belong to P12.

## Acceptance criteria

- [ ] The Administrator email list is a setting, validated at startup and listed in the example settings file.
- [ ] A route can be marked as administrative in one step, the same way on every route.
- [ ] On an administrative route, an Administrator passes, another signed-in User gets 403, and a request without a valid access token gets 401.
- [ ] Administrator status is not stored in the token. The list is checked on every administrative request.
- [ ] Tests through the public API cover an Administrator recognised by the list and another User refused. Until P12 adds real routes, the tests may use a route marked administrative that exists only in the tests.
