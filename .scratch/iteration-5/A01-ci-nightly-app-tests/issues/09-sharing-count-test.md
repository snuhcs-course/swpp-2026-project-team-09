# 09: The active Party's sharing count test counts the User, as the rule of P06-30 says

Parent: [A01 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None

Native files: none. Releases: none; only a test file changes.

## What happens now

`mobile/__tests__/features/main-controls-data.integration.test.tsx`, case "counts the members of the User's Party who share their position", expects `3명 공유 중` and gets `4명 공유 중`. It fails the same way on 5.0/Main at 167b923b4. P06-30 (#720) made the count include the User once they share in the Party; it updated `main-controls.integration` and the unit tests and missed this case. A pull request's CI skips the integration level, so #720 merged green.

## What to build

The case expects `4명 공유 중` and its name says the User is counted once they share in it. No app source changes.

## Acceptance criteria

- [x] The case expects the count that P06-30's rule gives.
- [ ] The file passes at the nightly level.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 10 minutes, in the orchestrating session and the review session that found it (an estimate).
- Tokens (estimates; no exact counter was available): input about 600,000 (cache reads about 570,000, cache writes about 25,000); output about 3,000. No subagents.
