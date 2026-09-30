# 18: Data stores closed to the network

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 17 (Ready for 1.0/Main)

## What to build

`compose.yaml` published PostgreSQL and Redis on every network interface of the laptop. On a shared network, such as the campus Wi-Fi, another machine could sign in to PostgreSQL as the `postgres` superuser with the development password, and use Redis, which has no password: read and delete its records, or send the servers' messages, such as `session-ended`. Only what a phone needs is published to the network. A security review of the rest of `1.0/Main` came with it.

## Acceptance criteria

- [x] Only the main and socket servers, which the app on a phone calls, are published to the network. PostgreSQL, Redis, the worker server and the match server are published on `127.0.0.1` alone.
- [x] A server run on the laptop with the settings of `.env.example` still reaches the data stores, and the servers in Compose still reach them by name.
- [x] No `.env` file, whatever its name, goes into a server's image.
- [x] The log holds no email address.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm build` and `pnpm test` pass in the main server, the one project whose code changed. The four server images build.

## Comments

### Exposure (2026-10-01)

- Before the change, Docker Desktop listened on `*:5432` and `*:6379`. Through the laptop's LAN address, Redis answered `PING` without a password and reported `protected-mode no`, which the official image sets when it is given no config file, and PostgreSQL accepted `postgres` / `postgres`.
- After the change, both listen on `127.0.0.1` alone. The LAN address gets `ECONNREFUSED`, and `localhost`, as `.env.example` writes it, and `127.0.0.1` connect. The worker and match servers in Compose answered `/health/ready` with `ok`. Checked with a Compose project of another name, so the data volume of the usual one was not touched.
- The worker and match servers answer only their health checks, and the app never calls them (ticket 11), so they are closed too. The main and socket servers stay open for a phone on the same Wi-Fi.
- On Linux, Docker writes its own firewall rules for a published port, so ufw does not close it. Binding to `127.0.0.1` does.
- A laptop that runs the old containers picks the change up at its next `docker compose up`. The data volume stays.

### Security review (2026-10-01)

The main server's sign-ins, tokens, sessions and routes, the socket server, the Dockerfiles, `compose.yaml`, the git history of every branch and `pnpm audit --prod` of every project were checked. Fixed here:

- Each server's `.dockerignore` leaves out `.env*`, as the root `.gitignore` does. It left out only `.env`, so a `.env.local` went into the image.
- The warning on an odd Google name gives the User's id instead of the email address. The ticket 17 review found it and did not take it up.

Found sound:

- Access tokens: only ES256 is accepted, and a User's and an Administrator's tokens are told apart by their audience, on the socket server too. `@nestjs/jwt` merges the options of a call into the module's, so the Administrator's guard, which passes its own audience, keeps the algorithm.
- Refresh tokens: 32 random bytes, stored as SHA-256 and replaced on each use. A used one that comes back after 60 seconds ends its session.
- The app's sign-in checks the `hd` claim, and an Administrator is bound to a Google subject at the first sign-in.
- Raw SQL goes through Prisma's tagged templates only.
- No key, password or `.env` file was ever committed, on any branch, `0.0/Main` included.

Left as found:

- `next` 16.3.8, the security release: ticket 17.
- The access token of an ended session still opens a socket connection until it expires: ticket 07's known limits.
- `pnpm audit`: in the main and match servers, `mysql2` and `deepmerge-ts` (high) come with the Prisma CLI; the databases are PostgreSQL, and `deepmerge-ts` merges only Prisma's config. In the app, `uuid` and `decode-uri-component` (moderate) come with Expo's tooling. They wait for releases upstream.
- For a deployment, which P04 does not set up: Redis needs a password, because any client that reaches it can send the servers' messages; PostgreSQL needs passwords of its own and no published port; the images run as root; the sign-ins and the refresh have no rate limit; the main server has no CORS setting for the admin site.

### Agent usage (2026-10-01)

- Agent time: about 20 minutes, an estimate, for the one session that did the work, counted from its transcript up to the writing of this section. Gaps of more than 5 minutes, about 12 minutes in all, are left out as waiting for answers. No subagents.
- Tokens, for that session, counted when this section was written:
  - Input: 8,339,027 in total, of which 8,177,296 were cache reads, 161,613 cache writes and 118 uncached.
  - Output: 50,041.
