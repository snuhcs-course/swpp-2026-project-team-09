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

## Private profile and manual timetable (main-public only)

GET /v1/me/profile -> Profile
PATCH /v1/me/profile {expectedVersion, ...editableFields} -> Profile
Profile = {displayName:string,department:string|null,admissionYear:number|null,
interests:string[],statusMessage:string|null,version:number}

Authenticated owner only; no owner parameter or public profile/timetable listing.
Initial profile uses the Google display name, null optional fields, [] interests,
and version 1. PATCH preserves omitted fields; null clears optional fields.
At least one editable field is required. Trimmed nonempty text limits: displayName
100, department 100, statusMessage 300, each interest 40; at most 20 unique interests.
Admission year is an integer 1900–2100. Google relogin updates identity email/avatar
but preserves the existing display name, including user edits.

GET /v1/me/timetable -> Timetable
PUT /v1/me/timetable {expectedVersion,timezone?,semesterStartsOn,semesterEndsOn,entries} -> Timetable
Timetable = {version:number,timezone:'Asia/Seoul',semesterStartsOn:string|null,
semesterEndsOn:string|null,entries:TimetableEntry[]}
TimetableEntry = {id:uuid,title:string,weekday:number,startMinute:number,
endMinute:number,locationName:string|null}

Initial timetable has version 1, null dates and [] entries. PUT replaces the complete
snapshot atomically. Dates must be real YYYY-MM-DD calendar dates; both are null or
both form an inclusive range (start <= end), and nonempty entries require dates.
Timezone defaults to Asia/Seoul and cannot be changed. Maximum 100 entries with
unique UUID IDs; title max 100, nullable locationName max 200, ISO weekday Mon=1
through Sun=7, integer minutes 0–1440 with end > start. Same-day overlapping entries
are rejected; adjacent entries are allowed. Overnight classes need separate entries.

Both writes require integer expectedVersion >= 1 and reject unknown fields,
including owner IDs. Profile and timetable versions are independent. Successful
writes increment the relevant version; stale concurrent saves return 409
{code:'VERSION_CONFLICT',message:string}. Validation returns 400 INVALID_INPUT.
Private snapshots are stored only in main-owned PostgreSQL and emit no public hints.
Manual recurring classes only: no OCR, image storage, AI provider, or inferred matching.

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

Party = {id,title,eventId:string|null,maxMembers:number,memberCount:number,isMember:boolean,
members:User[],createdAt,
sharingEnabled?:boolean} (own stored preference, present only for members).
GET /v1/parties -> {items:Party[]} (discoverable parties; membership visible to members).
POST /v1/parties {title,eventId?,maxMembers} -> Party (creator joins).
POST /v1/parties/:id/join -> Party; DELETE /v1/parties/:id/membership -> {ok:true}.
Serialize capacity checks, prohibit duplicate membership. Do not return private
member details to unaffiliated candidates: members is [] and sharingEnabled is absent.
memberCount remains the true count, isMember reflects the authenticated caller, and
eventId identifies the linked event. Internal calls without a user have isMember=false.
Linked event must currently be published to create a party or add a new member;
validation locks the event against concurrent status changes. Existing members can
reload their party after event cancellation; event cancellation does not implicitly
cancel independently managed shared quests.

GET /v1/friends -> {items:[{id,user:User,status:'pending'|'accepted',direction:
'incoming'|'outgoing',sharingEnabled:boolean}]}
POST /v1/friends {email} -> friend request; POST /v1/friends/:id/accept -> {ok:true}.
PATCH /v1/friends/:id/sharing {enabled:boolean} -> {ok:true} (own preference only).
PATCH /v1/parties/:id/sharing {enabled:boolean} -> {ok:true} (own preference only).

Quest = {id,partyId,title,startsAt,endsAt,locationName,version:number,
status:'active'|'cancelled'}
GET /v1/quests -> {items:Quest[]} (only member's quests).
POST /v1/quests {partyId,title,startsAt,endsAt,locationName} -> active Quest.
PATCH /v1/quests/:id {expectedVersion,title?,startsAt?,endsAt?,locationName?} -> Quest.
At least one editable field is required. The party cannot change.
PATCH /v1/quests/:id {expectedVersion,status:'cancelled'} cancels the plan without
changing its contents; cancellation must not mix in other fields. Cancelled quests
remain listed but are read-only: later edits, repeated cancellation and restore
requests return 409. No restore endpoint is provided.
All reads/writes require current party membership. Writes serialize against join/leave.
Every PATCH requires positive integer expectedVersion matching the returned version;
stale edits/cancels return 409 with code VERSION_CONFLICT, missing/invalid version 400.
A successful edit/cancel increments version and emits a member-only quest.changed hint.
Existing stored quests migrate to active; old PATCH clients must add expectedVersion
to avoid silently overwriting concurrent member changes.
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

## Concrete friend plans (main)

GET /v1/meetups -> {items:Meetup[]} (sender/recipient only).
POST /v1/meetups {friendId:otherUserId,title,startsAt,endsAt,locationName} -> Meetup.
POST /v1/meetups/:id/respond {action:'accept'|'decline'|'cancel',expectedVersion} -> Meetup.
Meetup = {id,sender:User,recipient:User,title,startsAt,endsAt,locationName,
status:'pending'|'accepted'|'declined'|'cancelled'|'expired',version,
partyId:string|null,questId:string|null,createdAt}.

This is a complete manual plan proposal, not a generic willingness-to-meet request
or an AI recommendation. Sender consents to the exact title/time/place at creation;
recipient explicitly accepts that plan. Accepted friendship required at creation and
acceptance. New proposals and new/time-changing quests are limited to 31 days per
interval to bound schedule expansion. Pending plans
expire at startsAt; only recipient may accept/decline, only sender may cancel.
Same-outcome authorized response retries return the recorded result; opposing
transitions/stale versions conflict. Acceptance atomically creates exactly one
private two-person party and shared quest. Nonmembers cannot discover or join that
party, and every state change emits only a participant-targeted meetup.changed hint.
Party DTO includes visibility:'public'|'private'; existing public parties stay public.
Registered schedule conflicts are rechecked at confirmation without disclosing
another user's course details. Missing schedules and walking time are not verified
availability. No push delivery claim is made.

## Realtime

Socket.IO server, handshake auth {token:accessToken}. Verify JWT, then server joins
events:public and user:<sub>. Clients cannot join arbitrary rooms.
Redis envelope on prototype:domain-events:
{id,type,entityId?,version?,audience:{kind:'public'|'users',userIds?:string[]}}
Emit domain.changed with {id,type,entityId?,version?}, no recipient list or raw location.
Never treat public audience as valid for private location/friend/quest/match/meetup events.
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
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, NAVER_MAP_CLIENT_ID build configuration.
PROTOTYPE_LOCAL_HTTP=true enables loopback-only Android HTTP exceptions for USB
adb reverse/local emulator testing; it does not enable background HTTP uploads.
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
