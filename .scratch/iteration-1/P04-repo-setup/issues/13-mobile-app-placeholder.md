# 13: Mobile app placeholder

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Main server skeleton)

## What to build

The mobile app starts and shows a placeholder screen, so that screen work in P06 and later tasks can begin on a working base. It enforces the same strict quality rules as the main server through its own configuration.

## Acceptance criteria

- [ ] `mobile` is its own project at the repository root, created from the official Expo template with Expo Router. It has its own package manifest, pnpm lockfile, lint, format and test configuration.
- [ ] The Expo SDK is 57.
- [ ] The template's TypeScript version is replaced with 6.0.x in strict mode.
- [ ] The package manifest declares the same pnpm version as the main server.
- [ ] The oxlint and Prettier settings are copied from the main server. The rule on type-only imports follows the spec: it is off only in the servers.
- [ ] Lint, format check, type check and tests each run with one command and pass.
- [ ] Jest is the test runner. One test checks that the placeholder screen renders.
- [ ] The development command starts the app, and the placeholder screen shows on a simulator or a phone.
