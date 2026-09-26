# Socket server

Node 22, `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm start`. Copy `.env.example` and supply the same JWT secret as main/match. `pnpm test` checks signed expiring HS256 tokens and private hint routing.

Socket.IO handshake is `{auth:{token}}`. The server alone joins `events:public` and `user:<JWT sub>`. Connections close when the verified token expires. No arbitrary join or client location handlers exist. Redis `prototype:domain-events` hints are stripped to `{id,type,entityId?,version?}`; public delivery only permits `event.changed` and `campus.changed`. Main is responsible for excluding drafts from public event hints. Clients reload authorized HTTP snapshots after reconnect or `domain.changed`; this transport is not durable delivery.

`GET /health` returns 503 until JWT configuration and the Redis subscription are ready. HTTP/Socket.IO browser CORS uses `CORS_ORIGINS`.
