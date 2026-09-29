# 11: Socket server recognises a User by access token

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Socket server skeleton), 06 (Sign in with an SNU Google account)

## What to build

The socket server verifies a User's access token by itself, without calling the main server. When the app opens a Socket.IO connection with a valid access token, the socket server accepts it and knows which User it belongs to. A connection with a missing or invalid token is refused.

The socket server is the only other server that accepts connections from Users: the app never calls the match or worker server (P08). Placing a connection in the User's room and pushing messages belong to P08.

## Acceptance criteria

- [x] The socket server accepts Socket.IO connections.
- [x] A connection with a valid access token is accepted and associated with its User.
- [x] A connection with a missing, expired or altered token, or a token signed with another key, is refused.
- [x] Verification uses only the main server's public key, given as a setting. The socket server makes no request to the main server to verify a token.
- [x] The public key setting is validated at startup and listed in the example settings file.
- [x] Tests open a socket connection as the app would. They use tokens signed with a test key pair and cover acceptance of a valid token and refusal of each invalid case.

## Comments

### The connection check (2026-09-29)

- The gateway is `UsersGateway` in `src/users/`. It was created with `pnpm exec nest g module users` and `pnpm exec nest g gateway users --no-spec`, and the generated `message` handler was removed. `@WebSocketGateway()` listens on the HTTP server's port, 3001. P08 adds the User's room and pushing to this feature.
- The access token is checked in a Socket.IO middleware that `afterInit` registers, not in `handleConnection`. Nest's documentation covers gateways, their lifecycle hooks and guards, but not a check when a connection opens, and guards run only for message handlers. `afterInit` receives the Socket.IO server, as the documentation says, and Socket.IO's documentation names middleware for authentication. A refused app gets `connect_error` and Socket.IO does not reconnect it by itself. Nest calls `handleConnection` without waiting for it and binds the message handlers right after, so a check there would take messages from a client before disconnecting it.
- The app sends the access token as `io(url, { auth: { token } })`, without a `Bearer` prefix, as Socket.IO's documentation shows. Every refusal carries the message `Unauthorized`, like the main server's 401.
- The connection keeps its User as `socket.data.user = { id: sub }`, typed through Socket.IO's `SocketData` parameter. The test reads it back with `fetchSockets()` on the gateway's server, which Socket.IO documents together with `socket.data`. This reaches into the server, which the spec's testing rule avoids; 윤유상 chose it over a handler that exists only in the tests, because the app can observe nothing of the User until P08 adds rooms and pushed messages. P08 can then check the User through them.
- The token is checked when the connection opens. A connection stays open after its token expires, and the next connection needs a valid token.
- `server.use` covers the default namespace, where the gateway listens. A gateway with its own `namespace` would need the same middleware.

### Access token verification (2026-09-29)

- `UsersModule` registers `JwtModule.registerAsync` with `publicKey` alone and `verifyOptions: { algorithms: ['ES256'] }`, as agreed in ticket 06. The tests start no main server, so verification cannot depend on one.
- `ACCESS_TOKEN_PUBLIC_KEY` is checked at startup as the main server checks its keys: the PEM header, that Node can read it, and the P-256 curve. There is no pair check, because the socket server has no private key. Tests cover a missing key, text that is not PEM, a private key and an RSA key.
- Breaking the code made the matching tests fail: accepting every connection failed all five connection tests; decoding the token without verifying it failed the expired, altered and other-key tests; `ignoreExpiration: true` failed the expired test only. Removing `algorithms: ['ES256']` failed no test: jsonwebtoken 9 already limits a P-256 public key to ES256 and refuses `none`, so no token can show the difference. The option stays, as agreed.

### Settings (2026-09-29)

- Compose passes `socket-server/.env` to the socket server (`env_file`, not required), as it does for the main server. The key is copied from `main-server/.env` with `grep ACCESS_TOKEN_PUBLIC_KEY ../main-server/.env >> .env`, as `README.md` and `.env.example` say. The service's `environment` in `compose.yaml` is unchanged. Step 5 of the feature module note now says what the main server's step 7 says.
- `test/global-setup.ts` makes one ES256 key pair for the run. The public key is the setting, and the private key is provided as `accessTokenPrivateKey`, so that the tests sign tokens as the main server does. `test/keys.ts` copies the main server's key helpers.
- Checked by hand: a key pair written by the main server's `pnpm keys:generate` and copied with the `grep` above started the built server (`node --env-file=… dist/main`). A socket.io-client connection with a token signed by the matching private key opened; without a token, and with a token that is not a JWT, it got `connect_error` `Unauthorized` with `socket.active` false. `docker compose config` shows that Compose also turns the `\n` in the copied line into line breaks.

### Packages (2026-09-29)

- `@nestjs/websockets` and `@nestjs/platform-socket.io` (`~12.1.0`) as Nest's documentation installs them, `@nestjs/jwt` (`^12.0.2`) as in the main server, and `socket.io-client` (`^4.8.3`) for the tests.
- `socket.io` is pinned at 4.8.3, the exact version `@nestjs/platform-socket.io` 12.1 depends on, as Nest's gateway sample pins it. A range resolved 4.8.4 next to it, so the gateway's types and the running server came from two copies.

### Sign-out and open connections (2026-09-29, review)

- Ticket 07 says that signing out ends every session of the User, but it does not close a socket connection: the token
  is checked only when a connection opens, and the access token stays valid for up to an hour after sign-out. Nothing
  is sent over the connection yet, so nothing can leak now.
- It matters once P08 pushes positions to the User's room. The room is per User, not per session, so a connection
  left open on another device, a lost phone for example, would receive Friends' positions again as soon as the User
  signs in elsewhere and turns the Master Switch back on.
- When the [P08 spec](../../P08-matching-location-sync/spec.md) is split into tickets, the ticket that adds the User's
  room adds this acceptance criterion: signing out disconnects the User's connections. The main server sends an event
  over Redis, and the socket server disconnects the User's room. The app gets `disconnect` with the reason
  `io server disconnect`, and refreshing its tokens fails, so it shows sign-in.
- Disconnecting does not stop a modified client from reconnecting with its access token while the token is still
  valid. Disconnecting each connection when its token expires would limit that to an hour, as for HTTP requests.
