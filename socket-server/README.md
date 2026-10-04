# socket-server

The SNU Now socket server. It pushes signals to the apps over Socket.IO. It holds no data. It follows
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
opens the connection, and the server keeps the User's id on it. A missing, expired or altered token, one signed with
another key, or an Administrator's token (see the [main server](../main-server/README.md#administrators)) is refused
before the connection opens: the app gets `connect_error` with the message `Unauthorized`, and Socket.IO does not
reconnect by itself.

The server closes a connection when its access token expires, and the app gets `disconnect` with the reason
`io server disconnect`, after which Socket.IO does not reconnect by itself. A connection that drops, for example when the
phone loses its signal, is reconnected by Socket.IO, and the token is checked again. With a fixed `auth: { token }`,
Socket.IO would send an expired token again, and the app would stay disconnected without noticing. So the app gets new
tokens from the main server once and connects again, both when the server closes the connection and when
`connect_error` arrives with `socket.active` false:

```ts
let retried = false;
let ended = false;
socket.on('connect', () => {
  retried = false;
  // Also how an app whose session ended while it was offline learns it: the main server answers 401.
  fetchCurrentState();
});
socket.on('connect_error', async () => {
  // A network failure: Socket.IO tries again by itself.
  if (socket.active) return;
  // Refused: get new tokens once, then connect again. The tokens of an ended session cannot be renewed.
  if (!retried && (await refreshTokens())) {
    retried = true;
    socket.connect();
  } else {
    showSignIn();
  }
});
socket.on('session-ended', ({ code }) => {
  // The server disconnects right after.
  ended = true;
  showSignIn(code);
});
socket.on('disconnect', async (reason) => {
  // The server closed the connection because the access token expired.
  if (reason !== 'io server disconnect' || ended) return;
  if (await refreshTokens()) {
    socket.connect();
  } else {
    showSignIn();
  }
});
```

`getAccessToken`, `refreshTokens`, `fetchCurrentState` and `showSignIn` stand for the app's own code. `fetchCurrentState`
catches up with what changed while the app was not connected (P08). `showSignIn` also stops sharing the
location, and given `SESSION_REPLACED` it says that a sign-in on another phone signed the User out.

### Sessions

The token names its session, and a User has one (see the [main server](../main-server/README.md#sign-in)). The socket
server keeps no record of sessions:

- Each connection joins the room of its session. When a session ends, the main server sends the event `session-ended`
  over messaging. The socket server sends `session-ended` to the session's connections, with
  `{ code: 'SESSION_REPLACED' }` when a sign-in on another phone ended it and `{}` otherwise, and disconnects them.
- If that event is lost, the connections close when their access token expires, at most an hour later, and the app
  cannot connect again, because an ended session gets no new tokens.
- A connection with the access token of an ended session is accepted until the token expires, because the server
  checks only the token. Socket.IO reconnects by itself after a network drop, so a phone that was offline when its
  session ended connects again; its `fetchCurrentState` then gets 401, and the app shows sign-in and closes the
  connection.

## Signals

When one User changes something another User's app shows, the main server sends a signal, and the socket server
passes it on. It knows no signal by name: the main server names the Users each one is for, so a new signal needs no
change here.

- Each connection also joins its User's own room, beside its session's, so a signal for a User reaches every
  connection of that User.
- The main server sends each signal over messaging as the event `signal`:
  `{ "userIds": ["…"], "name": "friends-changed", "payload": … }`. The socket server sends it under `name` to the rooms
  of the Users in `userIds`, with `payload` as its one argument, or with no argument when there is no `payload`. A
  signal without `userIds` goes to every connection, and one with an empty list to none.
- Delivery is not guaranteed. The app fetches what it shows when it connects, when it reconnects and when it returns
  to the front (`fetchCurrentState` above), and never polls. A lost signal only makes a list update late.

The signals and what the app does on each:

| Signal            | Carries | The app                                                                    |
| ----------------- | ------- | -------------------------------------------------------------------------- |
| `friends-changed` | nothing | fetches `GET /friends` and `GET /friend-requests` of the main server again |

```ts
socket.on('friends-changed', () => {
  fetchFriends();
  fetchFriendRequests();
});
```

`fetchFriends` and `fetchFriendRequests` stand for the app's own code. `session-ended` and `shuttle-vehicles-updated`
are events of their own, handled by name (see [Sessions](#sessions) and [Shuttle vehicles](#shuttle-vehicles)).

## Shuttle vehicles

The main server sends each set of shuttle vehicles it stores, every 15 seconds while the shuttle runs, and the socket
server sends it to every connected app as the event `shuttle-vehicles-updated`, whether or not the app shows the
shuttle:

```ts
socket.on('shuttle-vehicles-updated', (vehicles) => {
  showVehicles(vehicles);
});
```

`vehicles` is the list that `GET /shuttle/vehicles` answers (see the
[main server](../main-server/README.md#shuttle)): each vehicle's `carId`, the `stop` the operator reports it at, with
the stop's `id`, `name`, `latitude` and `longitude`, and `receivedAt`, when the position was received. The list holds
every vehicle in service and replaces the one before; `[]` means that none runs. The app fetches `GET /shuttle/vehicles`
when it opens the map, and drops a vehicle whose `receivedAt` is more than a minute old, so that the vehicles disappear
from an open map when no further list arrives (P15). `showVehicles` stands for the app's own code.

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
├── users/                           a feature: the app's socket connection, the access token check on it, its rooms and
│                                    the end of a session
├── signals/                         a feature: sends each signal of the main server to the connections of the Users it
│                                    names, or to every connection
└── shuttle/                         a feature: sends the shuttle's vehicles to every connected app
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
