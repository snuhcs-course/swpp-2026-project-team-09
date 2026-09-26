# First prototype contract

Implementation agreement, 2026-09-27. Root projects: main-server, socket-server,
worker-server, match-server, mobile, admin-frontend. Independent package manifests
and lockfiles, no root workspace. Node 22, NestJS/TypeScript servers, Next.js admin,
React Native/Expo development build. PostgreSQL/PostGIS, Redis cache, separate
Redis queue with BullMQ. Local Compose. Versions should be compatible and locked.

This is the small initial contract for parallel implementation. If changing it,
coordinate with the lead and consumers first. Missing provider keys yield explicit
unavailable/configuration-required states, never mock users or fabricated feeds.
No original app name/branding. UI language Korean; neutral label `캠퍼스` is okay.

## Network

- main-public: 3000, main-admin: 3001 (same source/image, APP_ROLE public/admin).
- socket-server: 3002, worker-server: 3003, match-server: 3004.
- admin-frontend: 3100, Metro development server: 8081.
- All services: GET /health. All HTTP application paths start /v1.
- Browser/mobile HTTP errors: {message:string, code?:string}; use meaningful HTTP status.
- ISO 8601 date/time strings, UUID identifiers, JSON, no secret values in responses.
- Internal endpoints require INTERNAL_API_KEY via x-internal-key (reject unset keys).
- Browser CORS uses explicit configured origins; bearer auth, no cookies initially.

## Auth and main ownership

POST /v1/auth/google {idToken} -> {accessToken,user}
GET /v1/auth/me -> User
User = {id,email,displayName,avatarUrl:string|null,role:'student'|'admin'}

Verify Google token signature/audience/issuer/expiry, email_verified, exact school
domain snu.ac.kr and hosted-domain claim. Identify accounts by Google sub. Only
ADMIN_EMAILS allowlist grants admin. No public local/demo login or client role.
JWT_SECRET must be explicitly configured; HS256 tokens include sub,email,role and
expiry. Share verifier config with socket/match. Missing OAuth config returns 503.
Admin auth endpoints may run on main-admin; administrative routes are never mounted
on main-public. Admin role required in addition to runtime separation.

## Events

Event = {id,title,description,startsAt,endsAt,locationName,latitude:number|null,
longitude:number|null,status:'draft'|'published'|'cancelled',sourceUrl:string|null,
source:'manual'|'snu',version:number,updatedAt}

GET /v1/events -> {items:Event[],revision:number}; published/cancelled public events.
GET /v1/admin/events -> {items:Event[]}
POST /v1/admin/events -> Event; body title,description,startsAt,endsAt,locationName,
latitude?,longitude?,status,sourceUrl?. PATCH /v1/admin/events/:id accepts same
editable fields. Validate coordinates, dates and non-empty title, persist in PG.
Drafts must not leak through public lists or public socket notifications.
POST /v1/internal/events/import accepts {items:[{externalId,title,description,
startsAt,endsAt,locationName,latitude?,longitude?,sourceUrl}]} -> import summary.
Only import actual, sufficiently structured source events; skip incomplete dates
with diagnostics. Idempotently key source+externalId. Worker never writes main DB.

Main changes persist with outbox in the same transaction. Main relay invalidates
event cache before publishing a hint to Redis channel prototype:domain-events.
Main-public reads shared cache; use bounded TTL and version-aware invalidation.
Do not claim exactly-once delivery. Reconnect reloads snapshots.

## Parties, friends, quests and location (main)

Party = {id,title,eventId:string|null,maxMembers:number,members:User[],createdAt,
sharingEnabled?:boolean} (own stored preference, present only for members).
GET /v1/parties -> {items:Party[]} (discoverable parties; membership visible to members).
POST /v1/parties {title,eventId?,maxMembers} -> Party (creator joins).
POST /v1/parties/:id/join -> Party; DELETE /v1/parties/:id/membership -> {ok:true}.
Serialize capacity checks, prohibit duplicate membership. Do not return private
member details to unaffiliated candidates; trim discoverable party member lists.

GET /v1/friends -> {items:[{id,user:User,status:'pending'|'accepted',direction:
'incoming'|'outgoing',sharingEnabled:boolean}]}
POST /v1/friends {email} -> friend request; POST /v1/friends/:id/accept -> {ok:true}.
PATCH /v1/friends/:id/sharing {enabled:boolean} -> {ok:true} (own preference only).
PATCH /v1/parties/:id/sharing {enabled:boolean} -> {ok:true} (own preference only).

Quest = {id,partyId,title,startsAt,endsAt,locationName,version:number}
GET /v1/quests -> {items:Quest[]} (only member's quests).
POST /v1/quests {partyId,title,startsAt,endsAt,locationName} -> Quest.
PATCH /v1/quests/:id updates these fields; member check required.
Quest is a shared activity plan; no invented check-in/progress completion.

PATCH /v1/me/location-sharing {enabled:boolean} -> {enabled:boolean}.
PUT /v1/me/location {latitude,longitude,accuracyM,observedAt} -> {ok:true}.
GET /v1/locations -> {items:[{user:User,latitude,longitude,accuracyM,observedAt}]}.
Validate range, timestamps and accuracy; short TTL in Redis, no position history.
Require enabled global sharing for upload; no background socket dependency.
Party preference defaults ON, mutual ON per relationship. Party OFF does not hide
a friend with mutual friend ON. Unresolved overlap combinations must fail closed
and be documented, not silently widen access. Fresh main authorization on every
location snapshot; hints carry IDs only, never coordinates. Sharing OFF removes
markers in clients and invalidates both directions of applicable sharing. Main
auth/relationships are authoritative; socket never exposes arbitrary rooms.

POST /v1/internal/parties/match {requestId,requestIds,userIds,title,eventId?,maxMembers,
timeStart,timeEnd} -> Party. timeStart/timeEnd are the persisted whole-group overlap.
The full authoritative event interval must fit; lock event validation against edits.
Persist idempotency requestId and per-request consumption; validate users, event,
capacity and membership transactionally. Main owns final party creation.
GET /v1/internal/users/:id -> minimal User (authenticated internal call).

## Realtime

Socket.IO server, handshake auth {token:accessToken}. Verify JWT, then server joins
events:public and user:<sub>. Clients cannot join arbitrary rooms.
Redis envelope on prototype:domain-events:
{id,type,entityId?,version?,audience:{kind:'public'|'users',userIds?:string[]}}
Emit domain.changed with {id,type,entityId?,version?}, no recipient list or raw location.
Never treat public audience as valid for private location/friend/quest/match events.
Client reconnect/domain.changed triggers appropriate authenticated HTTP reload.
Main relay remains authoritative for main-domain changes.

## Worker and real feeds

GET /v1/campus/shuttle?routeId=41946 -> {sourceUrl,fetchedAt,observedAt:null,
status:'available'|'no_vehicles'|'unavailable',positionKind:'schematic',vehicles:
[{id,x,y,count,label}],stops:[{name,x,y}],message?:string}.
Allowed route IDs 41946 and 41914 only. Actual normal-TLS source:
POST https://web.busin.co.kr/BuslineCircleS.aspx/GetRoute
{data:',F,41946,snu_1'} (matching route ID). d is semicolon-delimited rows with
slash fields carid,busx,busy,carcnt,carnos,carcode. x/y are diagram pixels, not GPS.
No ETA/stop-arrival assertions from pixels. Empty d means no reported vehicles.
Use source HTML only for real stop labels/positions; no invented positions.
See research/shuttle-app-stop-info.md for full evidence under .scratch/architecture-planning.

GET /v1/campus/meals?date=YYYY-MM-DD -> {sourceUrl,fetchedAt,date,status:'available'|
'unavailable',items:[{restaurant,breakfast,lunch,dinner}],message?:string}.
Actual source https://snuco.snu.ac.kr/foodmenu/?date=YYYY-MM-DD; parse
table.menu-table, td.title/breakfast/lunch/dinner, verify requested source date.
Do not convert blank meal to closed. Use timeouts, caching, coalesced fetches,
conservative polling/backoff. No source polling per connected phone.

GET /v1/admin/integrations -> read status; POST /v1/admin/integrations/:source/refresh
on main-admin proxies internal authenticated worker refresh.
Worker POST /v1/internal/integrations/:source/refresh requires internal key.
Workers use BullMQ with queue Redis, persist/serve snapshots in cache Redis.
Main-public authenticated GET /v1/campus/* proxies worker or reads its shared cache.

## Matching (independent match-server)

POST /v1/matches {eventId?,activity,timeStart,timeEnd,partySize:number,
interests:string[],autoJoinConsent:true} -> MatchRequest.
GET /v1/matches -> {items:MatchRequest[]} (own only).
DELETE /v1/matches/:id -> MatchRequest (own, cancellation before finalization).
MatchRequest = {id,status:'searching'|'finalizing'|'matched'|'cancelled'|'expired',
activity,timeStart,timeEnd,partySize,eventId:string|null,partyId:string|null,
createdAt,explanation?:string,aiStatus?:string}.
Persist consent and requests in match-owned PG database. Redis candidate indexes,
bounded scoring (shared event/activity, whole-group time overlap, size, interests).
No fake matches, no auto-subscribe students who did not request matching.
Implement a truthful optional embedding provider behind configuration. Cache by
content/model hash. No credentials: show rules-only/AI-unconfigured, never claim AI.
Before finalization claim requests atomically; main internal idempotent creation
is authoritative. Never release uncertain finalization into duplicate formation.
Publish user-targeted state hints via same Redis envelope. Record limitations.

## UI, configuration and verification

Mobile tabs: 지도, 행사, 약속/파티, 생활. Google login, map with self/authorized peers,
events/parties/quests, simple matching request, meal and shuttle schematic states.
Background location uses explicit user opt-in + OS permissions + HTTPS uploads;
stop task on logout/OFF. Add provider configuration screens/messages, never fake
tokens. Admin: Google sign-in, event CRUD/status, integration status/refresh.

Mobile environment: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SOCKET_URL,
EXPO_PUBLIC_MATCH_URL, EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, GOOGLE_MAPS_ANDROID_API_KEY build configuration.
Admin environment: NEXT_PUBLIC_API_URL (main-admin), NEXT_PUBLIC_GOOGLE_CLIENT_ID.
Server environment: PORT, APP_ROLE, DATABASE_URL, REDIS_CACHE_URL, REDIS_QUEUE_URL,
JWT_SECRET, INTERNAL_API_KEY, GOOGLE_WEB_CLIENT_ID, ADMIN_EMAILS, CORS_ORIGINS,
MAIN_INTERNAL_URL, WORKER_URL, OPENAI_API_KEY?, EMBEDDING_MODEL?.

Meaningful checks: auth/domain/admin rejection, party capacity and idempotency,
location relationship privacy, outbox/cache ordering, socket unauthorized rejection,
real feed parsing including empty responses, matching no duplicate finalization,
all builds/types, Compose validation and service health. Test fixtures only in
test code, never shown as external live data. Do not spend prototype time on
unnecessary abstractions or elaborate styling. Report missing keys honestly.
