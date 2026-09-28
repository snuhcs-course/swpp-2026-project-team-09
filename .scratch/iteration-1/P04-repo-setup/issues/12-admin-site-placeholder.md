# 12: Admin site placeholder

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Main server skeleton)

## What to build

The admin site starts and shows a placeholder screen, so that screen work in P12 can begin on a working base. It enforces the same strict quality rules as the main server through its own configuration.

## Acceptance criteria

- [ ] `admin` is its own project at the repository root, created from the official Next.js template with the App Router, a source folder and Tailwind. It has its own package manifest, pnpm lockfile, lint, format and test configuration.
- [ ] Next.js is 16.3.x at the newest patch. The security release announced for 2026-09-30 is taken when it is out.
- [ ] The template's TypeScript version is replaced with 6.0.x in strict mode.
- [ ] The oxlint and Prettier settings are copied from the main server. The rule on type-only imports follows the spec: it is off only in the servers.
- [ ] Lint, format check, type check and tests each run with one command and pass.
- [ ] Vitest is the test runner. One test checks that the placeholder screen renders.
- [ ] The development command starts the site, and the placeholder screen shows in a browser.
