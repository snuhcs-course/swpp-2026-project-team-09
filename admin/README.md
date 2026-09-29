# admin

The SNU Now admin site, built with Next.js 16, the App Router and Tailwind CSS. For now it shows a placeholder page.

## Run it

You need Node.js 24. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The commands below
use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type `npx pnpm@12.6.0`
wherever this file says `pnpm`. In `admin/`:

```bash
pnpm install
pnpm dev
```

Open http://localhost:3100. The servers use ports 3000 to 3003, so the site uses 3100, in `pnpm dev` and `pnpm start`
alike. P12 registers this address for Sign in with Google and the Kakao map, which accept only registered addresses,
so keep the port.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `__tests__/`                 |

`pnpm lint` and `pnpm typecheck` first run `next typegen`, which writes the route types (`LayoutProps`, `PageProps`)
into `.next/types/`, so both checks also work on a fresh clone, before `pnpm dev` has run.

## Folder layout

```text
src/app/     pages; every page.tsx is a route and layout.tsx wraps the pages below it
__tests__/   Vitest tests, named *.test.tsx
```

Tests render a page with React Testing Library in jsdom. `vitest.setup.ts` adds the jest-dom matchers, such as
`toBeVisible()`.
