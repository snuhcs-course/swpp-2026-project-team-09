# P06: The endpoints the server needs

For: 윤유상 (main server). From: 안진영 (P06 frontend). Written 2026-10-18 for [ticket 08](issues/08-endpoints-the-server-needs.md). Spec: [spec.md](spec.md), Mocks.

## Why this document

P06 brings the 파티 tab, the room, the form and the Quest list to the wireframe. The wireframe draws parts the main server cannot give yet: photos and tags on a post, official recruiting, hiding a post, people looking for company, members' faces, an invitation's time and place, a join request's note, 파티 채팅 and past Quests. The app builds each of them against a **mock adapter of its own** behind the API client, so that nothing else in the app knows it is a mock.

The build connected to the server already shows some mocks (photos, tags, hiding a post, 파티 채팅, past Quests: the last is empty there) and **hides** every mock that would say something false about real people or real Quests (members' faces besides the Leader, an invitation's time, place and companions, a join request's note, people looking for company, official recruiting). What a User enters into a mock (a photo, tags, `관심 없음`, a chat message, a decline) stays on the phone and nobody else sees it.

### How the app replaces a mock

The screens ask `apiClient` (`mobile/src/api/client.ts`). It picks the server client (`mobile/src/api/server/*.ts`) or the mock client, and wraps either in `withQuestParts` (`mobile/src/api/quest-parts/with-parts.ts`), which adds each mocked part from its adapter in `mobile/src/api/quest-parts/`. Once an endpoint below exists:

1. the server client gets the operation (or reads the new field in its answer check, `mobile/src/api/server/answers.ts` and friends);
2. `withQuestParts` stops adding that part from the adapter and passes the server's value through;
3. the adapter and its mock data are deleted, and the server build stops hiding the part.

No screen changes, because each answer already has the shape the screens read. Each section below names the adapter it replaces and the screens that read it.

### Conventions followed

Everything follows `main-server/README.md`: routes of a User need the access token and finished onboarding; a body that does not match gets 400 with a message naming the field; refusals have a `code` in `UPPER_SNAKE_CASE`; a route that creates something a User would notice twice takes `Idempotency-Key` (`@Idempotent({ required: true })`) unless a repeat is refused anyway; signals carry nothing unless said, go out after the transaction commits, and the app refetches on each. Rows of a Quest go with the Quest (`onDelete: Cascade`). Every Prisma sketch below is a sketch: names and limits are proposals for you to change.

### Contents

1. [Official recruiting](#1-official-recruiting)
2. [Photos](#2-photos)
3. [Tags: the User's and a Quest's](#3-tags-the-users-and-a-quests)
4. [Hiding a post](#4-hiding-a-post)
5. [People looking for company](#5-people-looking-for-company)
6. [Members' names and faces in summaries](#6-members-names-and-faces-in-summaries)
7. [An invitation's time and place](#7-an-invitations-time-and-place)
8. [A join request's note](#8-a-join-requests-note)
9. [파티 채팅](#9-파티-채팅)
10. [Past Quests](#10-past-quests)
11. [A declined activation stored on the server](#11-a-declined-activation-stored-on-the-server)
12. [Changing a Quest's Global Event](#12-changing-a-quests-global-event)
13. [A Global Event's kind and tags](#13-a-global-events-kind-and-tags)
14. [Rules to decide](#rules-to-decide)
15. [Order we would suggest](#order-we-would-suggest)

---

## 1. Official recruiting

An organisation (총학생회, a club) gathering people. 찾기 turns them in a banner; 전체 파티 › `공식` lists them. They are not Users' Quests: an Administrator writes them on the admin site.

**Routes**

- `GET /official-recruiting` (User): the running ones, the soonest first. A recruiting is running while it is published and its `endsAt` has not passed (or it has none).
- `POST /official-recruiting/:id/join` (User): the User joins; answers 204. A second join changes nothing and answers 204, so it takes no `Idempotency-Key`.
- `DELETE /official-recruiting/:id/join` (User, optional): undoes it; answers 204. The wireframe draws no undo, so this can wait.
- `GET|POST /admin/official-recruiting`, `PATCH|DELETE /admin/official-recruiting/:id` (`@AdministratorOnly()`): the admin site writes them, like Global Events.

**Answer** of `GET /official-recruiting`, as the app's `OfficialRecruiting` (`mobile/src/api/quest-parts-types.ts`) reads it:

```json
[
  {
    "id": "…",
    "org": "총학생회",
    "title": "가을 축제 2:2 미팅\n'만나샤'에서 인연 찾기!",
    "subtitle": "총학생회 주관 · 2인 1팀 신청 · 10/20–10/24",
    "photo": { "url": "/quest-photos/…", "caption": "축제 사진" },
    "time": "10/24(금) 18:00",
    "place": "행정관 (60동) 앞 잔디광장",
    "fill": "2인 1팀",
    "host": "총학생회 주관",
    "joined": false
  }
]
```

- `title` may break into two lines at `\n`. `time`, `place`, `fill` and `host` are words the Administrator writes, shown as written. If you prefer structured times, add `startsAt` and the app formats it; keep `time` for now so that the client changes alone.
- `photo` is `null` or a stored photo (see [Photos](#2-photos)); the app shows a drawn square for `null`.
- `joined` is the reading User's.

**Validation and errors**: `org` 1–30, `title` 1–60, `subtitle` 0–80, `time`, `place`, `fill`, `host` 0–50 characters; `capacity` optional, 1–1000. Joining one that is unknown, unpublished or past: 404 `OFFICIAL_RECRUITING_NOT_FOUND`; joining a full one: 409 `OFFICIAL_RECRUITING_FULL`.

**Data model**

```prisma
model OfficialRecruiting {
  id        String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  org       String
  title     String
  subtitle  String    @default("")
  time      String    @default("")
  place     String    @default("")
  fill      String    @default("")
  host      String    @default("")
  capacity  Int?
  photoId   String?   @map("photo_id") @db.Uuid
  published Boolean   @default(false)
  endsAt    DateTime? @map("ends_at")
  createdAt DateTime  @default(now()) @map("created_at")
  entries   OfficialRecruitingEntry[]

  @@map("official_recruiting")
}

model OfficialRecruitingEntry {
  recruitingId String             @map("recruiting_id") @db.Uuid
  recruiting   OfficialRecruiting @relation(fields: [recruitingId], references: [id], onDelete: Cascade)
  userId       String             @map("user_id") @db.Uuid
  user         User               @relation(fields: [userId], references: [id])
  joinedAt     DateTime           @default(now()) @map("joined_at")

  @@id([recruitingId, userId])
  @@map("official_recruiting_entries")
}
```

**Signal**: `official-recruiting-changed`, to `'everyone'`, when an Administrator publishes, edits or removes one (as `global-events-changed`). Joining sends nothing; it is the User's own.

**Replaces**: `mobile/src/api/quest-parts/official.ts` — `listOfficialRecruiting`, `joinOfficialRecruiting` (mock data `mobile/src/api/mock/data/finding.ts`, kept ids `snunow.joined-official`). The server build shows none today.

**Screens**: 찾기 banner, 전체 파티 › `공식`.

---

## 2. Photos

A Quest's photo, shown on the 찾기 card, the 파티 모집글 and the form (`사진`: 카메라, 앨범, remove). Today a picked photo is a file on the phone and a server Quest gets a drawn square picked by a hash of its id.

**Storage choice.** The stack has Postgres and Redis and no object store (`compose.yaml`). Two options:

| Option                                     | For                                                                                 | Against                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **A. Postgres `bytea`** (suggested now)    | No new service or secret; backed up and deleted with the Quest; e2e tests need none | Grows the database; every image read goes through the main server             |
| B. S3-compatible bucket (MinIO in compose) | Scales; the phone can upload with a presigned URL; CDN later                        | A new service, keys and a bucket policy to deploy; tests need MinIO or a fake |

We suggest **A** for this course: images are small after the phone shrinks them, there are few, and the route shape below works for B too (only the storage behind it changes).

**Size limits.** The phone already crops and compresses (`expo-image-picker`, `quality: 0.7`). It will also resize to at most 1280 px on the long side before upload. The server accepts `image/jpeg`, `image/png` and `image/webp` up to **2 MB**, checks the type by the file's first bytes and not by the header, and refuses anything else.

**Routes**

- `PUT /quests/:questId/photo` (the Leader): `multipart/form-data` with `file` (the image) and `caption` (optional text). Replaces the photo and answers 200 with the Quest. A repeat replaces it again, so no `Idempotency-Key`.
- `DELETE /quests/:questId/photo` (the Leader): removes it; answers 204. Without a photo it changes nothing.
- `GET /quest-photos/:photoId` (User): the image bytes with its `Content-Type`, `Cache-Control: private, max-age=31536000, immutable` (a new upload gets a new id). The app's `<Image>` sends the access token in `source.headers`. Whoever can read the Quest's id can see its photo; the id is a UUID, so it is not guessable.

**Answer**: every Quest shape that the app reads a photo from gains `photo` — the Quest (`GET /quests`, `GET /quests/:questId`, …), the recruiting entry and the summary in requests and invitations:

```json
{
  "id": "…",
  "title": "저녁 같이 먹어요",
  "photo": { "url": "/quest-photos/6f1c…", "caption": "학관 앞" },
  "…": "…"
}
```

`photo` is `null` without one. `url` is a path on the main server; the app adds its host. The app maps it to its `QuestPhoto` as `{ kind: 'picked', uri, caption }`.

**Validation and errors**: no file, or the field misnamed: 400 `file: …`; a type outside the three: 415 `PHOTO_TYPE_NOT_ALLOWED`; over 2 MB: 413 `PHOTO_TOO_LARGE`; `caption` 0–40 characters; another Holder: 403 `NOT_QUEST_LEADER`; a Quest the User does not hold: 404 `QUEST_NOT_FOUND`; a Class Quest: 409 `CLASS_QUEST`; an unknown photo id: 404 `PHOTO_NOT_FOUND`.

**Data model**

```prisma
model QuestPhoto {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  questId     String   @unique @map("quest_id") @db.Uuid
  quest       Quest    @relation(fields: [questId], references: [id], onDelete: Cascade)
  contentType String   @map("content_type")
  bytes       Bytes
  caption     String   @default("")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("quest_photos")
}
```

Replacing deletes the old row and inserts a new one (new id). The list routes select the id and caption only, never `bytes`.

**Signal**: `quests-changed` to the Holders when the photo changes (as a change of settings).

**Replaces**: `mobile/src/api/quest-parts/photos.ts` — `photoOf`, used by `withQuestParts` for `listQuests`, `getQuest`, `joinQuest`, `acceptInvitation`, `listRecruitingQuests`, `listQuestInvitations`; and the photo half of the phone's `snunow.quest-entries` (`mobile/src/storage/quest-entries.ts`) that `makeQuest`, `attendGlobalEvent` and `changeQuest` keep. After the change, `makeQuest` / `attendGlobalEvent` / `changeQuest` upload the picked photo with `PUT …/photo` after the Quest is made or changed.

**Screens**: 찾기 card, 파티 모집글, the form (`사진`), 내 파티 card.

---

## 3. Tags: the User's and a Quest's

### The User's tags

**Already on the server**: the profile's `hashtags` (`GET /users/me/profile`, `PATCH /users/me/profile`). The app reads them already (`listMyTags` → `getProfile`). The mock only gives the frame's tags in the mock build when the profile has none. **No endpoint needed.**

### A Quest's tags

**Routes**: no new route. `tags` joins the bodies that make and change a Quest:

- `POST /quests/own`: `{ "title": "…", "subQuest": { … }, "tags": ["러닝", "운동"], … }`, optional, `[]` when left out.
- `POST /quests` (attending): `{ "globalEventId": "…", "title"?: "…", "tags"?: [ … ] }`; on a repeat that answers the existing Quest, tags are ignored like the title.
- `PATCH /quests/:questId` (the Leader): `tags` replaces them; `[]` empties them.

**Answer**: every Quest shape gains `tags`, the same places as `photo`:

```json
{
  "id": "…",
  "title": "버들골 저녁 러닝",
  "tags": ["러닝", "운동", "저녁"],
  "…": "…"
}
```

**Validation and errors**: the profile's hashtag rules (`src/users/dto/update-profile.dto.ts`): each kept without `#`, 1–30 characters without whitespace, none twice whatever the case; at most **10** per Quest (the form shows them on one line). A wrong tag gets 400 `tags: …`. A change by another Holder: 403 `NOT_QUEST_LEADER`.

**Search**: the app searches and orders the posts itself over the list it has (title, text, place and tags; order by overlap with the User's tags), so `GET /quests/recruiting` needs no search parameter now. A `?tag=` filter can come later.

**Data model**

```prisma
model Quest {
  // …
  tags String[] @default([])
  @@index([tags], type: Gin) // only if a ?tag= filter comes
}
```

**Signal**: `quests-changed` to the Holders when the Leader changes them (already sent for `PATCH /quests/:questId`).

**Replaces**: `mobile/src/api/quest-parts/tags.ts` — `tagsOf` (in `withQuestParts`, the same operations as the photo) and the tag half of `snunow.quest-entries`. `myTagsOf` stays a pass-through of `hashtags`.

**Screens**: 찾기 search and ordering, 파티 모집글 and `추천 이유` › `관심사`, the room (under the text), the form (`태그`).

---

## 4. Hiding a post

`관심 없음` on a 찾기 card or a 파티 모집글 hides that post for the User, and 찾기 says `숨긴 파티 {n}개 · 다음 추천에 반영할게요`.

**Routes**

- `PUT /users/me/hidden-quests/:questId` (User): hides it; answers 204. A repeat changes nothing (no key).
- `GET /users/me/hidden-quests` (User): the hidden Quests' ids, the newest first, of Quests that still exist.
- `DELETE /users/me/hidden-quests/:questId` (User, optional): shows it again. Not drawn yet.

**Answer** of `GET /users/me/hidden-quests`, as `listHiddenPosts` answers it:

```json
["9b1e…", "c03a…"]
```

The app keeps filtering `GET /quests/recruiting` itself, so the list route does not change. (If you prefer, `GET /quests/recruiting` may leave hidden ones out; tell us and the app drops its filter. The count `{n}` then still comes from this route.)

**Validation and errors**: hiding a Quest that does not exist or is not in the User's recruiting list (closed, or held by the User): 404 `QUEST_NOT_FOUND`. A Quest the User holds cannot be hidden.

**Who**: the User, for themselves only. Nobody else learns of it.

**Data model**

```prisma
model HiddenQuest {
  userId   String   @map("user_id") @db.Uuid
  user     User     @relation(fields: [userId], references: [id])
  questId  String   @map("quest_id") @db.Uuid
  quest    Quest    @relation(fields: [questId], references: [id], onDelete: Cascade)
  hiddenAt DateTime @default(now()) @map("hidden_at")

  @@id([userId, questId])
  @@map("hidden_quests")
}
```

**Signal**: none; it is the User's own and the User has one session.

**Replaces**: `mobile/src/api/quest-parts/hidden-posts.ts` — `listHiddenPosts`, `hidePost` (kept ids `snunow.hidden-posts`).

**Screens**: 찾기, 파티 모집글.

---

## 5. People looking for company

`같이 할 사람을 찾는 중` in 찾기: students who want company without writing a post, with what they want, their tags and when the two are both free, and `같이 하자고 하기`.

**Routes**

- `PUT /users/me/seeking` (User): `{ "want": "이번 주에 볼더링 처음 가보고 싶어요", "tags": ["클라이밍"] }` starts or replaces the User's entry; answers 200 with it. It lasts **7 days** from the last `PUT` (proposal).
- `DELETE /users/me/seeking` (User): ends it; answers 204.
- `GET /companion-seekers` (User): the running entries of others, the most free time in common first, at most 20.
- `POST /companion-seekers/:seekerId/ask` (User): asks one; answers 204. A second ask is refused (409), so no key.

**Answer** of `GET /companion-seekers`, as the app's `CompanionSeeker` reads it:

```json
[
  {
    "id": "…",
    "name": "한도경",
    "department": "산업공학과 23",
    "want": "이번 주에 볼더링 처음 가보고 싶어요",
    "tags": ["클라이밍", "운동"],
    "freeTogether": "수 16:00 이후",
    "asked": false
  }
]
```

- `department` is the profile's department and the last two digits of `admissionYear`, as the frame writes it (`산업공학과 23`); without a year, the department alone.
- `freeTogether` is computed from both Users' timetables (the server has them, `TimetableService.classesOf`): the first time in the next 7 days, from 09:00 to 21:00 Asia/Seoul, when neither has a class, written as the frame writes it (`오늘 17:00 이후`, `수 16:00 이후`). `null` when either has no timetable.
- `asked` is the reading User's.

**Validation and errors**: `want` 1–60 characters; `tags` as a Quest's (at most 5 here). Asking oneself, or an entry that ended: 404 `COMPANION_SEEKER_NOT_FOUND`; a second ask: 409 `COMPANION_ASK_ALREADY_SENT`.

**Who**: every User sees every running entry (the wireframe shows strangers here, not only Friends). That is a privacy choice for the team: an entry shows a name and a department to everyone. Alternative: Friends and Friends of Friends only.

**What asking does — to decide.** The wireframe draws the button and not what the asked User sees. A proposal: the ask appears to the seeker in 초대 as "{name}님이 같이 하자고 해요", and accepting makes a 비공개 Quest with both as Holders (`QuestsService.createWithSubQuest`), titled from `want`. Until that is drawn, the route can just store the ask.

**Data model**

```prisma
model CompanionSeeking {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  user      User     @relation(fields: [userId], references: [id])
  want      String
  tags      String[] @default([])
  until     DateTime
  createdAt DateTime @default(now()) @map("created_at")
  asks      CompanionAsk[]

  @@map("companion_seekings")
}

model CompanionAsk {
  seekingId String           @map("seeking_id") @db.Uuid
  seeking   CompanionSeeking @relation(fields: [seekingId], references: [id], onDelete: Cascade)
  userId    String           @map("user_id") @db.Uuid
  user      User             @relation(fields: [userId], references: [id])
  sentAt    DateTime         @default(now()) @map("sent_at")

  @@id([seekingId, userId])
  @@map("companion_asks")
}
```

**Signal**: `seekers-changed` to the seeker when asked (for the ask's screen, once drawn). The list itself is not pushed; the app fetches it when 찾기 opens.

**Replaces**: `mobile/src/api/quest-parts/seekers.ts` — `listCompanionSeekers`, `askCompanionSeeker` (mock data `mobile/src/api/mock/data/finding.ts`, kept ids `snunow.asked-seekers`). The server build shows none today. The app has no screen to start an entry yet; `PUT /users/me/seeking` can wait for one.

**Screens**: 찾기 (`같이 할 사람을 찾는 중`).

---

## 6. Members' names and faces in summaries

A 찾기 card and the 파티 모집글 members line show up to three faces and `{name} 외 {n}명 · 친구 {k}명 포함`; an 초대 card says `{names} 함께`, the **invitation's companions** (the Holders who are already in). A summary (recruiting entry, a request as its User lists it, an invitation) names only its `leader` and a `holderCount`, so the server build shows the Leader alone today.

**Routes**: no new route. The summary gains `members`:

- `GET /quests/recruiting` entries;
- `GET /quest-invitations` entries' `quest`;
- `GET /quest-join-requests` entries' `quest`.

**Answer**

```json
{
  "id": "…",
  "title": "버들골 저녁 러닝",
  "leader": { "id": "u1", "name": "서하린", "department": "체육교육과" },
  "holderCount": 5,
  "members": [
    { "id": "u1", "name": "서하린", "department": "체육교육과", "photo": null },
    { "id": "u2", "name": "강민재", "department": "기계공학부", "photo": null },
    {
      "id": "u3",
      "name": "김민준",
      "department": "컴퓨터공학부",
      "photo": null
    }
  ],
  "…": "…"
}
```

- Up to **three** Holders, the Leader first, then in the order they entered. `holderCount` stays the full count; the app writes `외 {n}명` from it and counts the Friends among all Holders it knows.
- `photo` is `null` for now: Users have no profile pictures, and the app shows the name's letters. Keep the field so that pictures can come without a change of shape. (If the app's `MemberFace` becomes `{ id, name, photo }`, the Friend count can use ids; today it matches by name.)
- For an invitation, `members` are the companions the 초대 card names (the Leader and the Holders already in).

**Who**: as today, whoever can see the summary. A recruiting post then shows three Holders' names to any User; the wireframe draws it, but tell us if the team wants Friends' names only.

**Validation and errors**: none new.

**Data model**: none; read from `quest_holders` joined to `users`, ordered by `joined_at`, Leader first (`take: 3` per Quest; one query for the page with a window function, or one `findMany` with `include: { holders: { take: 3 } }` and the Leader added).

**Signal**: none new; `quests-changed` already goes when someone enters or leaves.

**Replaces**: `mobile/src/api/quest-parts/faces.ts` — `facesOfSummary` (in `withQuestParts` for `listRecruitingQuests` and `listQuestInvitations`; mock names `NAME_POOL`, `FRAMED_PARTS[…].companions` in `mobile/src/api/mock/data/quest-parts.ts`). `facesOfQuest` already reads the full Quest's `holders` and stays.

**Screens**: 찾기 card, 파티 모집글 members line, 초대 card (companions).

---

## 7. An invitation's time and place

An 초대 card reads `{when} · {where} · {names} 함께`. The invitation's `quest` summary has no Sub Quest, so the server build shows neither today.

**Routes**: no new route. The summary in `GET /quest-invitations` (and, for one shape everywhere, `GET /quest-join-requests`) gains `nextSubQuest`, exactly as the recruiting entry already has it:

```json
{
  "id": "inv-…",
  "quest": {
    "id": "…",
    "title": "자료구조 스터디",
    "leader": { "id": "…", "name": "정하은", "department": "컴퓨터공학부" },
    "holderCount": 2,
    "members": [ … ],
    "nextSubQuest": {
      "id": "…",
      "attending": false,
      "title": "스터디",
      "startsAt": "2026-10-20T10:00:00.000Z",
      "endsAt": null,
      "place": { "placeId": "…", "label": "중앙도서관 (62동)", "latitude": 37.459, "longitude": 126.952 }
    },
    "…": "…"
  },
  "sentAt": "…"
}
```

`nextSubQuest` is the first Sub Quest ahead, or `null` (no Sub Quest ahead, or no time). The app shows `startsAt` as `{when}` and `place.label` as `{where}`, and leaves either out when `null`.

**Validation and errors**: none new. **Data model**: none (the code that builds the recruiting entry's `nextSubQuest` is reused). **Who**: the invited User, as today.

**Signal**: `quests-changed`. Today it reaches an invited User when invited and when the invitation is cancelled, but not when a Sub Quest changes, which goes to the Holders only. Please also send it to the Users with a waiting invitation when a Sub Quest is added, edited or cancelled, so that the card's time stays right.

**Replaces**: `mobile/src/api/quest-parts/invitation-times.ts` — `invitationStartOf`, and `mobile/src/api/quest-parts/invitation-places.ts` — `invitationPlaceOf` (both used by `withQuestParts` for `listQuestInvitations`, mock data `FRAMED_INVITATION_TIMES`, `INVITATION_TIME_SET`, `FRAMED_INVITATION_PLACES`, `INVITATION_PLACE_SET`; from P06-05). The companions are [section 6](#6-members-names-and-faces-in-summaries).

**Screens**: 초대.

---

## 8. A join request's note

> Checked against P06-06 (`2.0/P06-06-the-room`): the app reads a request as `ShownJoinRequest = JoinRequest & { note: string | null }`.

A User who asks to join an Approval Quest writes a short note; the Leader sees it under the request in the room's `신청`.

**Routes**

- `POST /quest-join-requests` gains an optional `note`: `{ "questId": "…", "note": "러닝 처음인데 괜찮을까요?" }`. Answers 201 as today.
- `GET /quests/:questId/join-requests` (the Leader): each entry gains `note`.
- `GET /quest-join-requests` (the asking User): each entry gains `note`, so the User sees what they wrote.

**Answer** of `GET /quests/:questId/join-requests`:

```json
[
  {
    "id": "…",
    "user": { "id": "…", "name": "한도경", "department": "산업공학과" },
    "note": "러닝 처음인데 괜찮을까요?",
    "sentAt": "2026-10-18T03:00:00.000Z"
  }
]
```

`note` is `null` when none was written (an empty or blank note is stored as `null`).

**Validation and errors**: `note` 0–100 characters after trimming; longer gets 400 `note: …`. Other refusals as today. A note cannot be edited; withdraw and ask again.

**Who**: the asking User writes it; the Leader and the asking User read it.

**Data model**

```prisma
model QuestJoinRequest {
  // …
  note String?
}
```

**Signal**: `quests-changed` to the Leader when a request arrives, as today.

**Replaces**: `noteOf(requestId, build)` in `mobile/src/api/quest-parts/notes.ts`, which adds `note` to `listJoinRequests`' answer in `withQuestParts` (a mock note picked by request id; null in the server build). Once the server keeps a note, the join sheet sends it with `askToJoinQuest`.

**Screens**: room › `신청` (the Leader); the join sheet (the asking User, if it gets a note field).

---

## 9. 파티 채팅

> Checked against P06-06: `PartyMessage` in `quest-parts-types.ts`; `from` is null for the User's own message.

The room's `파티 채팅`: the members of a Quest talk, with `파티에 메시지 보내기`. It is the **Quest's** chat (the room is the Quest's), so its members are the Holders, whether or not the Party is switched on.

**Routes**

- `GET /quests/:questId/messages?before=<messageId>&limit=50` (Holder): the messages, the newest first, at most `limit` (1–100, default 50), older than `before` when given.
- `POST /quests/:questId/messages` (Holder): `{ "body": "10분 늦어요!" }` sends one; answers 201 with it. **Requires `Idempotency-Key`**: a lost answer must not send the message twice.

**Answer** of one message (and each entry of the list):

```json
{
  "id": "…",
  "author": { "id": "…", "name": "정하은", "department": "컴퓨터공학부" },
  "body": "10분 늦어요!",
  "sentAt": "2026-10-18T09:02:11.000Z"
}
```

A former Holder's messages stay, with their name. The app marks the reading User's own by `author.id`.

**Validation and errors**: `body` 1–500 characters after trimming, else 400 `body: …`; a Quest the User does not hold: 404 `QUEST_NOT_FOUND`; a Class Quest: 409 `CLASS_QUEST`; more than 30 messages a minute from one User: 429 `TOO_MANY_MESSAGES` (proposal).

**Who**: the Holders read and send. A Party member who does not hold the Quest does not see it (entering a Party changes no Quest).

**Data model**

```prisma
model QuestMessage {
  id       String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  questId  String   @map("quest_id") @db.Uuid
  quest    Quest    @relation(fields: [questId], references: [id], onDelete: Cascade)
  authorId String   @map("author_id") @db.Uuid
  author   User     @relation(fields: [authorId], references: [id])
  body     String
  sentAt   DateTime @default(now()) @map("sent_at")

  @@index([questId, sentAt])
  @@map("quest_messages")
}
```

Messages go with the Quest when it is deleted (last Holder drops it, the Leader ends it).

**Socket signal**: `quest-message`, to the Holders other than the sender, **with a payload** (like `position`): `{ "questId": "…", "message": { …the message above… } }`. The app appends it to an open room and marks the room unread otherwise. A lost signal is caught up by `GET …/messages` when the room opens or the app reconnects. The socket server needs no change; add the row to its README's table.

**Replaces**: `chatOf(questId, build)` and `sendChat(questId, words)` in `mobile/src/api/quest-parts/chat.ts`, behind the client's `listPartyChat(questId)` and `sendPartyChat(questId, words)`; sent messages are kept on the phone under `snunow.party-chat.<userId>` today.

**Screens**: the room (`파티 채팅`).

---

## 10. Past Quests

내 파티 › `지난 일정`: the User's Quests that are over.

**Routes**

- `GET /quests/past` (User): the User's stored Quests **whose Sub Quests have all ended** (each cancelled or past its end time) — exactly the ones `GET /quests` leaves out — the most recently ended first, at most 30. Declare it before `GET /quests/:questId`, as `recruiting` is.

**Answer**: an array of Quests in the usual Quest shape (with `photo` and `tags` once sections 2 and 3 exist), each Sub Quest `ended: true`.

```json
[
  {
    "id": "…",
    "title": "자료구조 중간고사 스터디",
    "globalEvent": null,
    "leader": { "id": "…", "name": "정하은", "department": "컴퓨터공학부" },
    "capacity": 4,
    "joinPolicy": "closed",
    "holders": [ … ],
    "subQuests": [{ "…": "…", "startsAt": "2026-10-15T10:00:00.000Z", "ended": true }],
    "classQuest": false,
    "waitingJoinRequests": 0,
    "board": null,
    "description": "",
    "createdAt": "…"
  }
]
```

Class Quests are never in it.

**Note on what is kept.** An ended Quest stays stored until its Holders drop it, so this route needs no migration. But `POST /quests/:questId/end` **deletes** the Quest, so a Quest the Leader ended never shows here. If the team wants those too, `end` would set `endedAt` instead of deleting (and every other route would leave such Quests out). We suggest leaving that for later.

**Validation and errors**: none. **Who**: the User, their own Quests. **Data model**: none (optional `endedAt` above).

**Signal**: `quests-changed` already goes when a Quest changes; the passing of time sends nothing, and the app refetches when 내 파티 opens.

**Replaces**: `mobile/src/api/quest-parts/past-quests.ts` — `pastQuestsOf`, behind the client's `listPastQuests(me)` (mock data `mobile/src/api/mock/data/past-quests.ts`; from P06-05). The server build shows none today; with the route, `listPastQuests` no longer needs `me`.

**Screens**: 내 파티 (`지난 일정`).

---

## 11. A declined activation stored on the server

When a Holder's Quest has a running Party (활성화) the Holder is not in, 내 파티 and the room show `거절` and `참여`. `거절` puts it under `다른 활성 파티` as `활성화 중 · 참여하지 않는 중`, where `참여` still works. Today the phone keeps the declines, so another phone (after a sign-in elsewhere) asks again.

**Routes**

- `PUT /parties/:partyId/decline` (User): declines; answers 204. A repeat changes nothing (no key).
- `GET /parties/declined` (User): the ids of the running Parties the User declined. Declare it before `/parties/:partyId`.
- Entering the Party by any way (`POST /parties/:partyId/join`, an accepted invitation) removes the decline. No undo route is drawn.

Or, instead of the list route, each `GET /parties` entry gains `"declined": true|false`. We prefer the separate list: it matches the app's `declinedPartiesQuery` (`string[]`) and changes no other answer.

**Answer** of `GET /parties/declined`:

```json
["2d4c…"]
```

**Validation and errors**: a Party the User cannot see (`PartiesService.canSee`) or not running: 404 `PARTY_NOT_FOUND`; a Party the User is a member of: 409 `ALREADY_MEMBER`.

**Who**: a User who can see the Party, for themselves.

**Data model**

```prisma
model PartyDecline {
  partyId    String   @map("party_id") @db.Uuid
  party      Party    @relation(fields: [partyId], references: [id], onDelete: Cascade)
  userId     String   @map("user_id") @db.Uuid
  user       User     @relation(fields: [userId], references: [id])
  declinedAt DateTime @default(now()) @map("declined_at")

  @@id([partyId, userId])
  @@map("party_declines")
}
```

Deleted with the Party when it ends, so a new activation of the same Quest asks again.

**Signal**: none required (the User's own). Optional: `party-changed` to the members, if the room should one day show who declined.

**Replaces**: `mobile/src/features/parties/declined.ts` — `declinedPartiesQuery` and `useDeclineParty` (kept in `mobile/src/storage/kept.ts` as `declinedParties`). This one lives in `features/`, not behind the client: the change adds `listDeclinedParties` and `declineParty` to the client and points both hooks at them.

**Screens**: 내 파티 (activation strip, `다른 활성 파티`), the room (activation box).

---

## 12. Changing a Quest's Global Event

The form edits a Quest's `관련 행사` (spec story 34). The main server cannot change it: `quests.global_event_id` "never changes", and each `quest_holders` row repeats it under the unique index on the User and the Global Event. So the form shows a Quest's own event **locked** (P06-04, `eventLocked` in `mobile/src/screens/party/form/use-form-state.ts`), and for a Quest without one a picked event only fills the time, the place and the tags.

**Route**

- `PUT /quests/:questId/global-event` (the Leader): `{ "globalEventId": "…" }` ties the Quest to that published event, or `{ "globalEventId": null }` unties it. Answers 200 with the Quest. A repeat with the same value changes nothing, so no key.

**What it does**, in one transaction, after locking the Quest and then every Holder in the order of their ids:

1. Every Holder must be free for the new event: holding no other Quest for it. A Holder who holds one **alone** is not silently changed (unlike entering): the route refuses, naming them, because the Leader acts for others. Proposal; the alternative is to drop that solo Quest as `RecruitingService.enter` does.
2. The attending Sub Quest of the old event is removed (with the Holders' progress on it); for a new event an attending Sub Quest is added first in the order. Untying a Quest whose only Sub Quest is the attending one is refused (`LAST_SUB_QUEST`).
3. `quests.global_event_id` and every `quest_holders.global_event_id` are set.
4. The Quest's title stays; the app sends a new title with `PATCH` if the User changed it.

**Validation and errors**

| Refusal                                                                 | Status | `code`                   |
| ----------------------------------------------------------------------- | ------ | ------------------------ |
| An event that is unknown or not published                               | 404    | `GLOBAL_EVENT_NOT_FOUND` |
| A Holder holds another Quest for the event; `userIds` names them        | 409    | `GLOBAL_EVENT_HELD`      |
| Untying a Quest whose only Sub Quest is the attending one               | 409    | `LAST_SUB_QUEST`         |
| A Quest made by Matching (`matchId` set), whose Holders the event chose | 409    | `MATCHED_QUEST`          |
| Another Holder                                                          | 403    | `NOT_QUEST_LEADER`       |
| A Quest the User does not hold                                          | 404    | `QUEST_NOT_FOUND`        |
| A Class Quest                                                           | 409    | `CLASS_QUEST`            |

**Data model**: no new column; the comment "Never changes" on `Quest.globalEventId` goes, and the README's "One Quest for a Global Event" gains this route. The unique index keeps the rule.

**Signal**: `quests-changed` to the Holders and to Users with a waiting request or invitation; `party-changed` to a running Party's audience, since its `quest.globalEvent` changes.

**Replaces**: the lock in the form — `eventLocked` in `mobile/src/screens/party/form/use-form-state.ts` and the edit path of `mobile/src/screens/party/form/use-send.ts` (`change`). The app adds a client operation `changeQuestEvent(questId, globalEventId | null)`.

**Screens**: the form (`관련 행사` when editing).

---

## 13. A Global Event's kind and tags

The form's event picker has tabs 진로, 이벤트, 축제, and a picked event fills the Quest's tags. A Global Event has neither a kind nor tags, so the app reads both from its title and description (`mobile/src/features/party/event-kinds.ts`: `eventKindOf`, `eventTagsOf`).

**Routes**: no new route. `GET /global-events` entries gain:

```json
{
  "id": "…",
  "title": "AI 커리어 설명회",
  "kind": "career",
  "tags": ["AI커리어", "취업"],
  "…": "…"
}
```

- `kind`: `career` (진로), `event` (이벤트) or `festival` (축제).
- `tags`: as a Quest's tags (at most 10).
- The admin routes take and show both; the worker server's collected events get them from the same word lists the app uses now (move them to the server), and an Administrator corrects them.

**Validation and errors**: an unknown `kind`: 400 `kind: …`; tags as a Quest's.

**Data model**

```prisma
enum GlobalEventKind {
  career
  event
  festival
}

model GlobalEvent {
  // …
  kind GlobalEventKind @default(event)
  tags String[]        @default([])
}
```

**Signal**: `global-events-changed`, as for any change of an event.

**Replaces**: `eventKindOf`, `eventTagsOf` in `mobile/src/features/party/event-kinds.ts`.

**Screens**: the form › `관련 행사`.

---

## Rules to decide

The wireframe draws two rules differently from the server and the app. P06 follows the server; these need a team decision before anyone changes them.

### Capacity: up to 12, or 1 to 8

- **Wireframe**: `인원` goes from 2 to 12.
- **Server and app now**: 1 to 8 for Quests and Parties alike, checked in the migrations (`quests.capacity`, `parties.capacity`) and in the DTOs; the form's lower bound is the current Holders plus the invited Friends.
- **To raise it to 12**: two check constraints and two DTOs on the server (a migration), `MAX_CAPACITY` in `mobile/src/features/party/making.ts`, and Matching's pool sizes if they assume 8. Location Sharing works for any size, but a Party of 12 puts 12 Avatars on each member's map.
- **Question**: keep 8, or move both Quests and Parties to 12?

### Switching a Party on: the Leader only, or any Holder

- **Wireframe**: `파티장이 활성화하면…` — only the Leader switches on.
- **Server and app now**: any Holder opens the Quest's Party (`POST /parties` with `questId` checks only that the opener holds the Quest); any member leaves and comes back; only the Party's Leader ends it for everyone (`POST /parties/mine/end`). The app says `멤버가`.
- **To make it the Leader only**: `POST /parties` refuses a Holder who does not lead the Quest with 403 `NOT_QUEST_LEADER`; the app hides the switch for other Holders and changes the wording.
- **Question**: keep any Holder (a member who arrives first can start sharing), or the Leader only (one person decides when everyone's position is shared)?

---

## Order we would suggest

The cheap ones first; each is one client change in the app.

1. Section 7 (`nextSubQuest` in summaries) and section 6 (`members`): no migration, read only; they let the server build show the 초대 card and the faces.
2. Section 3 (Quest tags) and section 10 (past Quests): one column, one read route.
3. Section 8 (a request's note), section 4 (hiding), section 11 (declines): small tables.
4. Section 2 (photos) and section 9 (파티 채팅): storage and a new signal.
5. Section 12 (changing the event), section 13 (event kind and tags), section 1 (official recruiting, with the admin site), section 5 (people looking for company, which needs a decision on asking).
