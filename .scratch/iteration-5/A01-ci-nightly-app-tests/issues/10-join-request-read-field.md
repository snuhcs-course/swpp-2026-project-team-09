# 10: The join-request Notification tests expect the read field that P06-38 added

Parent: [A01 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None

Native files: none. Releases: none; only a test file changes.

## What happens now

5.0/Main's push run is red since da54c9c18 (#752, P06-38): `main-server/test/join-request-notifications.integration.test.ts` fails three cases with "expected [ { …(8) } ] to deeply equal [ { …(7) } ]". `GET /notifications` now gives each Notification a `read` field; #752 added `read: false` to the other tests that list a Notification whole and missed this file. A pull request's CI skips the main server's integration level, so #752 merged green.

## What to build

The three listed Notifications (asked, accepted, declined) expect `read: false`: each has just rung and nobody has read it. No source changes.

## Acceptance criteria

- [x] The three cases expect the `read` field.
- [ ] 5.0/Main's push run passes.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 10 minutes in the orchestrating session (an estimate).
- Tokens (estimates; no exact counter was available): input about 700,000 (cache reads about 670,000, cache writes about 25,000); output about 3,000. No subagents.
