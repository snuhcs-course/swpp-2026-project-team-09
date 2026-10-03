# 24: Server: the Private Event API

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The main server stores a User's Private Events and serves them to their owner alone, so that the app's Private Events (ticket 20) stop being fake. 윤유상 builds it. The shape below is what the app's fake uses; the final shape is the server's to decide, and ticket 27 adapts the app.

## Acceptance criteria

- [ ] A Private Event holds an identifier, a title of 30 characters at most, a start, an optional end after the start, a place and a note of 200 characters at most, which may be empty.
- [ ] The place is either a Place's identifier or a point: a latitude, a longitude and a label text, which the app shows as it was chosen.
- [ ] Listing, creating, changing and deleting are separate requests, each with a User's access token.
- [ ] Only the owner reads or changes a Private Event. Another User's identifier answers as an unknown one does.
- [ ] Creating without an `Idempotency-Key` is refused, as P04 describes.
- [ ] The change is recorded as a migration, and every record is identified by a UUID.
- [ ] Tests at the API level against a real database: owner-only access, the validation of the times and of both kinds of place, and creating without a key refused.
- [ ] The main server's README records the routes and their answers.
