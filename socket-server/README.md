# socket-server

The SNU Now socket server. It will push signals and positions to the apps over Socket.IO. It holds no data. It follows
the [main server](../main-server/README.md): the same layout, settings and checks.

## Run it

You need Node.js 24 and Docker. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The
commands below use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type
`npx pnpm@12.6.0` wherever this file says `pnpm`: npm fetches it into its cache without a global install.

First create your settings file in `socket-server/`. The socket server checks access tokens with the main server's
public key, so create `main-server/.env` first (see the [main server](../main-server/README.md#run-it)). The third
command copies the key from it:

```bash
pnpm install
cp .env.example .env
grep ACCESS_TOKEN_PUBLIC_KEY ../main-server/.env >> .env
```

When the main server gets a new key pair, replace this line with its new public key. Otherwise the socket server
refuses every connection with `Unauthorized`.

To run the whole system, in the repository root:

```bash
docker compose up --build
```

While you work on the socket server, start only Redis in the repository root and run the server yourself in
`socket-server/`:

```bash
docker compose up -d redis
```

```bash
pnpm start:dev
```

The server answers two health checks:

- `GET http://localhost:3001/health/live`: liveness, the process is up.
- `GET http://localhost:3001/health/ready`: readiness, Redis can be reached. It answers 503 and names Redis when it
  cannot.

If a setting in `.env` is missing or invalid, the server stops and names it, for example
`Config validation error: PORT: Invalid input: expected string, received undefined`.

The server also stops at startup when it cannot reach Redis. Start it first with `docker compose up -d redis`.
Once the server is running, Redis going down makes readiness answer 503 instead.

## Socket connection

The app opens a Socket.IO connection on the same port and sends the access token it got from the main server. It gives
`auth` as a function, which Socket.IO calls on every attempt to connect, reconnections included, so that each attempt
sends the token the app holds at that moment:

```ts
const socket = io('http://localhost:3001', { auth: (cb) => cb({ token: getAccessToken() }) });
```

The socket server checks the token itself with `ACCESS_TOKEN_PUBLIC_KEY`, without asking the main server. A valid token
opens the connection, and the server keeps the User's id on it. A missing, expired or altered token, or one signed
with another key, is refused before the connection opens: the app gets `connect_error` with the message `Unauthorized`,
and Socket.IO does not reconnect by itself.

An open connection stays open after its token expires. When it drops, for example when the phone loses its signal,
Socket.IO reconnects by itself and the token is checked again. With a fixed `auth: { token }`, Socket.IO would send the
expired token again, and the app would stay disconnected without noticing. So when `connect_error` arrives and
`socket.active` is false, the app gets new tokens from the main server once and connects again:

```ts
let retried = false;
socket.on('connect', () => {
  retried = false;
});
socket.on('connect_error', async () => {
  // A network failure: Socket.IO tries again by itself.
  if (socket.active) return;
  // Refused: get new tokens once, then connect again.
  if (!retried && (await refreshTokens())) {
    retried = true;
    socket.connect();
  } else {
    showSignIn();
  }
});
```

`getAccessToken`, `refreshTokens` and `showSignIn` stand for the app's own code.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Vitest tests in `test/`                      |

`pnpm test` needs Docker running. It starts its own Redis container and removes it afterwards.

## Folder layout

```text
src/
├── main.ts                          starts the server and connects it to messaging
├── app.module.ts                    root module, imports every feature module
├── common/                          code shared by two or more features
│   ├── settings.ts                  settings schema, checked at startup
│   └── messaging.ts                 options for NestJS messaging over Redis
├── health/                          a feature: the liveness and readiness checks
└── users/                           a feature: the app's socket connection and the access token check on it
test/                                tests, run against Redis in a container
```

## Adding a feature module

The steps add a feature named `signal`. Use a short lowercase name, with dashes between words (`location-sharing`).

1. Create the module. It lands in `src/signal/` and is added to `AppModule`:

   ```bash
   pnpm exec nest g module signal
   ```

2. Create the controller, which holds the HTTP routes, and the service, which holds the logic. Both are registered in
   `SignalModule`. `--no-spec` skips unit test files, because this project tests through the running server (step 6):

   ```bash
   pnpm exec nest g controller signal --no-spec
   pnpm exec nest g service signal --no-spec
   ```

3. Put request and response shapes in `src/signal/dto/`. There is no `entities/` folder, because the socket server
   stores no records. Everything that belongs to the feature stays inside `src/signal/`.
4. If another feature needs `SignalService`, add it to `exports` in `SignalModule` and add `SignalModule` to the other
   module's `imports`. Code shared by two or more features goes in `src/common/`.
5. If the feature needs a new setting, add it to the schema in `src/common/settings.ts`, to `.env.example`, to your own
   `.env` and to the settings in `test/global-setup.ts`. Compose passes `.env` to the server. Add the setting to the
   `socket-server` service's `environment` in `compose.yaml` only when it needs another value inside Compose, as the
   Redis address does. Read it by injecting `ConfigService<Settings, true>` and calling `get('NAME', { infer: true })`.
6. Write `test/signal.e2e-spec.ts`. Start the server with `startApp` from `test/start-app.ts` and call its routes with
   `supertest`, as `test/health.e2e-spec.ts` does, or open a socket connection as the app does, as
   `test/users.e2e-spec.ts` does.
7. Run `pnpm format`, then the four checks.

Import classes with a plain `import { SignalService } from ...`, never `import type`. Nest looks the class up at
runtime to inject it.
