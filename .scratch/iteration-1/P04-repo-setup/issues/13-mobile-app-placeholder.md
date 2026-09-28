# 13: Mobile app placeholder

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Main server skeleton)

## What to build

The mobile app starts and shows a placeholder screen, so that screen work in P06 and later tasks can begin on a working base. It enforces the same strict quality rules as the main server through its own configuration.

## Acceptance criteria

- [x] `mobile` is its own project at the repository root, created from the official Expo template with Expo Router. It has its own package manifest, pnpm lockfile, lint, format and test configuration.
- [x] The Expo SDK is 57.
- [x] The template's TypeScript version is replaced with 6.0.x in strict mode.
- [x] The package manifest declares the same pnpm version as the main server.
- [x] The oxlint and Prettier settings are copied from the main server. The rule on type-only imports follows the spec: it is off only in the servers.
- [x] Lint, format check, type check and tests each run with one command and pass.
- [x] Jest is the test runner. One test checks that the placeholder screen renders.
- [x] The development command starts the app, and the placeholder screen shows on a simulator or a phone.

## Comments

### Template and TypeScript (2026-09-28)

`pnpm create expo@5.0.2 mobile --template default@sdk-57` created the project with Expo 57.0.25, React Native 0.86.3 and Expo Router. The template already ships TypeScript `~6.0.3` with `strict: true`, so nothing had to be replaced. The template's own `reset-project` script then removed the example screens. The images that only those screens used were deleted as well.

`create-expo` also writes `AGENTS.md`, `CLAUDE.md` and `.claude/settings.json` into the project. They are removed so that the agent instructions stay in the root files only.

TypeScript 6 no longer includes every `@types` package by default, so `tsconfig.json` lists `"types": ["jest"]`, as the main server lists its test types.

### Licence and app identity (2026-09-29)

Both were changed after review.

- `mobile/LICENSE`, Expo's MIT licence for the template files, is deleted. `package.json` declares `"license": "UNLICENSED"`, as main-server does.
- `app.json` sets `name`, `slug` and `scheme` to `SNU Now`, `snu-now` and `snunow`. The slug is awkward to change once the project is linked to EAS. P06 may register the scheme as the Google sign-in redirect.

### oxlint settings in the mobile app (2026-09-28)

The settings are copied from the main server with three differences:

- `typescript/consistent-type-imports` is an error. The spec turns it off only in the servers.
- The options for `no-extraneous-class` and `prefer-readonly-parameter-types` are left out. They exist for NestJS modules and constructor injection; this project has no classes, so they would change nothing.
- `env` stays `node: true` as copied. No enabled rule depends on it.

Type-aware linting runs with TypeScript 6 here too. A probe with a floating promise and an unsafe return failed `pnpm lint`.

`typescript/prefer-readonly-parameter-types` (pedantic) reports component props that are not deeply read-only, for example a `ReactElement` parameter. The placeholder screen has no props. Revisit this rule when the first component with props arrives in P06.

### Jest renderer (2026-09-28)

`@testing-library/react-native` 14 needs `test-renderer` as a peer. Its newest release, 1.3.0, uses react-reconciler 0.34, which targets React 19.3, while React Native 0.86 pins React 19.2.3. `test-renderer` is therefore declared as `~1.2.0` (react-reconciler 0.33, React 19.2). Raise it together with React when the Expo SDK moves.
