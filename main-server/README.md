# Main server

Node 22 / NestJS 11, independent pnpm manifest and lockfile. Run from this directory:

```sh
pnpm install --frozen-lockfile
pnpm build
# Load environment variables from your local configuration first.
pnpm start
pnpm test
# Against an isolated PostgreSQL/PostGIS database and cache Redis:
RUN_DB_TESTS=1 pnpm test
```

`APP_ROLE=public` mounts authenticated application APIs and key-protected internal APIs.
`APP_ROLE=admin` mounts auth and admin APIs; admin membership is recalculated from
`ADMIN_EMAILS` on every request. Admin routes are absent from the public runtime.
Google signature/audience/issuer/expiry verification uses Google's auth library;
verified exact `snu.ac.kr` email plus hosted-domain claim are required. No mock login.
Missing OAuth/JWT credentials return a configuration-required 503.

`DATABASE_URL` connects only to the main-owned database. Startup creates the schema
under a PostgreSQL advisory migration lock. Provision PostGIS as database admin first.
Migration failure fails startup; missing database configuration gives health/API 503.
`REDIS_CACHE_URL` stores event cache and latest location; no position history is kept.
See `.env.example` and `../docs/prototype-api.md` for configuration and API shapes.

## Invariants and prototype limits

- Joins serialize on the party row. Matching locks users in UUID order, persists a
  batch fingerprint and unique consumed request IDs, and retries return the same party.
  Matching requires `requestIds` paired with `userIds`; a new batch cannot reuse them.
  Required `timeStart`/`timeEnd` are the immutable whole-group overlap interval; the
  complete authoritative event interval must fit within it. Event validation locks
  the row against concurrent administrative updates. New party joins likewise reject
  cancelled/drafted events. Same-batch replay returns the existing party first.
- Main mutations and domain hints commit in one PostgreSQL transaction. A single
  outbox relay invalidates the event cache with a monotonic revision floor before
  publishing. Hints are at-least-once; consumers reload snapshots after reconnect.
  Public cache TTL is 30 seconds. Redis restart/eviction can lose the revision floor;
  a concurrent older snapshot may remain cached for at most that TTL. No measured
  performance improvement is claimed. Outbox retention cleanup remains future work.
- Only published/cancelled events appear publicly. A published-to-draft transition
  sends a removal/reload hint containing ID/version only. Draft edits send no public
  hints. Discoverable party lists hide members from nonmembers. Party responses
  include optional `sharingEnabled` only for the current authenticated member,
  reflecting their own stored preference; other members’ preferences are never sent.
- Every location snapshot checks current database consent. Positions expire after
  120 seconds; uploads require global opt-in, plausible coordinates and recent time.
  Global toggles advance a consent epoch so stale Redis data cannot reappear if an
  OFF deletion failed. Redis unavailability yields a clear unavailable response.
- Mutual friend ON allows sharing even if a party is OFF. Reverse overlaps (friend
  OFF while party ON), and disagreement across multiple shared parties, fail closed
  until the product policy is resolved. A party member's OFF only affects pairs
  involving that member. No private-zone editor, background tracking or history
  is implemented by this API; mobile owns explicit OS permission and upload opt-in.
- A location snapshot is authorized when its SQL checks run; an in-flight HTTP
  response can race a later consent change. Hints cause clients to clear/reload,
  and subsequent snapshots deny access immediately. Clients must discard in-flight
  responses after OFF/logout and superseded reloads. No coordinates enter hints.
  Location timestamps normalize to UTC; numeric ordering drops older/equal uploads
  without emitting misleading change hints.
- Campus APIs proxy authenticated worker requests; they do not fabricate feeds.
  No optional AI command endpoint is included in this first API slice.

Tests use fixture identities only inside tests, never a runtime authentication bypass.
