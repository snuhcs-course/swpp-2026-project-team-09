# 12: Admin site placeholder

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Main server skeleton)

## What to build

The admin site starts and shows a placeholder screen, so that screen work in P12 can begin on a working base. It enforces the same strict quality rules as the main server through its own configuration.

## Acceptance criteria

- [x] `admin` is its own project at the repository root, created from the official Next.js template with the App Router, a source folder and Tailwind. It has its own package manifest, pnpm lockfile, lint, format and test configuration.
- [ ] Next.js is 16.3.x at the newest patch. The security release announced for 2026-09-30 is taken when it is out.
- [x] The template's TypeScript version is replaced with 6.0.x in strict mode.
- [x] The package manifest declares the same pnpm version as the main server.
- [x] The oxlint and Prettier settings are copied from the main server. The rule on type-only imports follows the spec: it is off only in the servers.
- [x] Lint, format check, type check and tests each run with one command and pass.
- [x] Vitest is the test runner. One test checks that the placeholder screen renders.
- [x] The development command starts the site, and the placeholder screen shows in a browser.

## Comments

### Template and TypeScript (2026-09-29)

`pnpm dlx create-next-app@16.3.7 admin --ts --tailwind --app --src-dir --import-alias "@/*" --use-pnpm --no-eslint --no-biome --no-react-compiler --disable-git --yes` created the project with Next.js 16.3.7, React 19.2.8 and Tailwind CSS 4.3.3. `--no-eslint` keeps the template's ESLint configuration out, since oxlint takes its place. The first commit is this output, unchanged.

- The template ships TypeScript `^5`, which locked 5.9.3. It is replaced with `~6.0.3`, the main server's specifier, which locks 6.0.3. `strict` was already on. `next build` passes with it.
- TypeScript 6 no longer includes every `@types` package by default, so `tsconfig.json` lists `"types": ["vitest/globals"]` for the test globals. Node's types need no entry: `next-env.d.ts` loads Next's global types, which reference them.
- `@types/node` follows the main server's `^24.0.0` instead of the template's `^20`, because every project runs on Node.js 24. `package.json` declares `"engines": { "node": "24.x" }`, as the main server does.
- `create-next-app` writes `AGENTS.md` and `CLAUDE.md`. They are removed so that the agent instructions stay in the root files only. `next dev` writes them again when it detects an AI coding agent, and it detects Claude Code, so `next.config.ts` sets `agentRules: false`. With it, `next dev` run by Claude Code left them absent. This version of `create-next-app` writes no `LICENSE` and no `.claude/`. `package.json` declares `"license": "UNLICENSED"`, as the main server does.
- The template page is replaced with the placeholder, the heading "SNU Now Admin", and the page title is the same. The template's page description is dropped. The images in `public/` and the Geist fonts are deleted, because only the template page used them.
- The template's `pnpm-workspace.yaml` is kept as generated.

### Next.js version (2026-09-29)

- `next` is pinned exactly to 16.3.7, the newest 16.3.x patch on 2026-09-29, the day it was published. The template already pins it exactly.
- The security release announced for 2026-09-30 is not part of this change. It is taken after it is out, on a separate branch and pull request that only raises the version. Its acceptance criterion stays unchecked until then.
- pnpm 12 installs no version younger than one day (`minimumReleaseAge`, 1440 minutes by default). `create-next-app` therefore lists `next@16.3.7` and its nine `@next/*` packages under `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`. The version bump has to replace those entries with the new version's, or wait a day.

### oxlint settings in the admin site (2026-09-29)

The settings are copied from the main server with the same differences as in the mobile app:

- `typescript/consistent-type-imports` is an error. The spec turns it off only in the servers.
- The option for `no-extraneous-class` is left out. It exists for NestJS modules.
- `env` stays `node: true` as copied. No enabled rule depends on it.

oxlint, oxlint-tsgolint and Prettier use the main server's specifiers and lock the same versions: 1.85.0, 7.0.2003 and 3.9.9.

Type-aware linting runs with TypeScript 6 here too, so no separate strict `tsc` run has to stand in for it. A probe with a floating promise and an unsafe return failed `pnpm lint`. `pnpm typecheck` still runs `tsc` in strict mode as its own check.

`pnpm lint` and `pnpm typecheck` run `next typegen` first. It writes the route types, such as `LayoutProps` and `PageProps`, into `.next/types/`, which is not committed. On a fresh clone without them, `tsc` fails with `Cannot find name 'LayoutProps'`, and type-aware lint reported `no-unsafe-member-access` for a probe that read `props.children` from `LayoutProps<'/'>`.

### Tests (2026-09-29)

P12 builds on this setup:

- Vitest runs in jsdom, as in the Next.js Vitest guide bundled in `node_modules/next/dist/docs/`.
- React Testing Library (`@testing-library/react` and `@testing-library/dom`) renders the pages. `@testing-library/jest-dom` adds matchers such as `toBeVisible()` and `toBeDisabled()`; `vitest.setup.ts` loads them.
- Tests live in `__tests__/` and are named `*.test.tsx`.
- `globals` is on, as in the main server, so React Testing Library cleans up after each test by itself.

The guide also installs `@vitejs/plugin-react` and `vite-tsconfig-paths`. They are left out: Vite 8, which Vitest 4.1 runs on, transforms JSX and resolves the `@/*` path with `resolve.tsconfigPaths` by itself.

`__tests__/page.test.tsx` failed against the template page (`Unable to find an accessible element with the role "heading" and name "SNU Now Admin"`) and passed after the page was replaced. It renders the page component alone, not through the layout. The browser run below covers the whole start.

### Port (2026-09-29)

The site runs on port 3100, in `pnpm dev` and `pnpm start` alike. `compose.yaml` maps 3000 to 3003 to the four servers. P12 registers `http://localhost:3100` among the JavaScript origins of the admin site's Google client and at Kakao.

### Checks (2026-09-29)

- Without `node_modules`, `.next/` and `next-env.d.ts`, `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test` and `pnpm build` exit 0, on Node.js 24.14.0 with pnpm 12.6.0.
- A format probe makes `pnpm format:check` exit 1. An implicit `any` makes `tsc` exit 2.
- `pnpm dev` started Next.js 16.3.7 with Turbopack on http://localhost:3100. The browser showed the heading "SNU Now Admin" under the page title "SNU Now Admin", with no console errors.

### Agent usage (2026-09-29)

- Agent time: about 40 minutes, an estimate, over two sessions.
  - Implementation, in one session in the main checkout: about 25 minutes.
    - The session worked about 20 minutes: 19 minutes of wall time up to this section, less about 4 minutes waiting for the answers on the port and the tests, plus about 5 minutes for the commit, the push and the pull request.
    - Subagents: the Standards and Spec reviews about 2 minutes each, at the same time, added on top.
  - Review and fixes, in one session in a separate worktree: about 15 minutes up to this part, not counting time waiting for answers. Its Standards and Spec review subagents ran within that time. The commit, the push and the pull request update come after.
- Tokens, each session and its two review subagents, counted when that session wrote its part. The subagents' transcripts record only a few output tokens for most of their steps, so their shares of the output are lower bounds.
  - Implementation: input 15,003,385, of which 14,678,113 were cache reads, 325,040 cache writes and 232 uncached. Output 65,898, of which the subagents' share is 2,090.
  - Review and fixes: input 8,868,556, of which 8,594,300 were cache reads, 274,080 cache writes and 176 uncached. Output 43,330, of which the subagents' share is 1,976.
  - Total: input 23,871,941, of which 23,272,413 were cache reads, 599,120 cache writes and 408 uncached. Output 109,228.
