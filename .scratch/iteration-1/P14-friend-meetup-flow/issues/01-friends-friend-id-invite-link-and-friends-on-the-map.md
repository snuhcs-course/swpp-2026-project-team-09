# 01: Friends: 친구 관리, 친구 추가 by Friend ID and Invite Link, and Friends on the map

Parent: [P14 spec](../spec.md)
Status: ready-for-human
Blocked by: P19's ticket 01 (The shell, the shared components, the Quest full screen and the Friend panel)

## What to build

A User manages their Friends in the app. They:

- see their Friends, search them, turn Location Sharing off for one Friend, and end a friendship after confirming;
- answer the Friend Requests sent to them and cancel those they sent;
- add a Friend by Friend ID: they show and copy their own, and look another's owner up before sending a Friend Request;
- add a Friend by Invite Link: they create one and send it through Android's share sheet;
- open the app from an Invite Link, signed in or signed out, and accept or decline on a screen that shows who sent it.

On the map, Friends' Avatars move as their positions arrive, dim when the last report is old, and disappear when the main server says so. A Friend the User cannot see is marked `위치 꺼짐` in the friend rows.

The screens are built in the wireframe's arrangement on P19's shell and shared components: the app bars, the full-screen panel, the side panel, the bottom sheet, the confirm dialog, the search field, the list row, the section header, the switch row and the states. Words marked "(new)" are not in any frame. Every other word is the frame's, verbatim.

The frames:

- `Friends`: 친구 관리, its list and its 친구 요청 view;
- `FriendsAdd`: 친구 추가. Its search by name is replaced by the Friend ID and the Invite Link, since no User is found by name;
- `MainFriends`: the Friend panel, which P19's ticket 01 built;
- `Main`: the floating friend list, Friends' Avatars and the Friend's card.

The Invite Link's accept screen, the per-Friend switch and 친구 끊기 have no frame.

The server routes, all served already (`main-server/README.md`, "Friends", "Invite Links" and "Location Sharing"):

- `GET /friends`, `PUT /friends/:userId/sharing` and `DELETE /friends/:userId`;
- `GET /friend-ids/:friendId` and `POST /friend-requests`;
- `GET /friend-requests` and `POST /friend-requests/:id/accept|decline|cancel`;
- `POST /invite-links`, `GET /invite-links/:token` and `POST /invite-links/:token/accept`;
- `POST /lobby`, for `profile.friendId`;
- `GET /positions`, and the socket's `position`, `position-removed` and `friends-changed`.

Each new operation goes into the API client with its mock, so that the screens run in Expo Go and on the web against the mocks and in a build against the main server (`mobile/README.md`, "From a mock to the main server"). The mock keeps Friends, requests and links in memory, and refuses as the main server does. P19's ticket 02 also reads `GET /friend-requests` and the Lobby's `friendId`. The app has one operation and one query for each. Whichever ticket lands first adds them, and the other uses them.

## Acceptance criteria

### 친구 관리 (`Friends`)

- [x] It is a screen above the tabs, with `뒤로` and `친구 {n}`. It opens from:
  - 내 정보's row `친구 관리 {n}` (P19's ticket 02);
  - the Friend panel's `+ 친구 추가`, which opens 친구 추가 directly (P19's ticket 01);
  - 알림's row `{name}님의 친구 요청` (P19's ticket 02), which opens 친구 요청 directly.

  Each of these shows "준비 중이에요" today. This ticket replaces the toast of the panel's button. Whichever of this ticket and P19's ticket 02 lands second connects the two rows of 내 정보 and 알림. Back returns to where the screen was opened from.
- [x] The search field reads `친구 검색` and filters by name and department. Nothing found says `결과 없음`.
- [x] At the top are the row `친구 추가`, with a navy round plus, and the entry row `친구 요청 {n}`, where n counts the requests received. `친한 친구` and `차단` are not built: no task covers them.
- [x] Under the header `친구 {n}` are the Friends in the main server's order, by name. A row has:
  - the Avatar;
  - the name;
  - the department as the meta line, followed by ` · 위치 꺼짐` when the Friend is not `visible`;
  - the shared switch, labelled `{이름}님과 위치 공유` (new), which is on while `sharing` is.

  A note under the header says `위치 공유를 끄면 서로의 위치가 보이지 않아요` (new), because sharing is mutual.
- [x] Turning a switch sends `PUT /friends/:userId/sharing` with `{ on }` and shows the new state at once. After a failure, it turns back and the toast says `위치 공유를 바꾸지 못했어요`, the words P19's ticket 02 gives the Master Switch. After a change, the Friends and the positions are fetched again, so that the Friend's Avatar goes or comes.
- [x] A press on a Friend's row opens a bottom sheet with the Friend's Avatar, name and department, and the danger button `친구 끊기` (new). The button opens the danger dialog:
  - title `{이름}님과 친구를 끊을까요?` (new);
  - body `서로 위치가 보이지 않고, 답을 기다리는 파티 초대도 취소돼요.` (new);
  - buttons `취소` and `끊기` (new).

  Confirming sends `DELETE /friends/:userId`. The toast says `{이름}님과 친구를 끊었어요` (new), and the Friend leaves the list, the Friend panel and the map. A 404 `FRIEND_NOT_FOUND`, a friendship that ended already, fetches the Friends again without a message.
- [x] With no Friend, the list says `아직 친구가 없어요` (new) over the row `친구 추가`. While loading and after a failure it shows the shared states.

### 친구 요청

- [x] The view has `뒤로`, which goes back to the list, and `친구 요청 {n}`. Under the note `수락하면 서로의 위치를 지도에서 볼 수 있어요` (new) come two sections:
  - `받은 요청 · {n}` (new): each request with the sender's Avatar, name and department, and `거절` and `수락`;
  - `보낸 요청 · {n}` (new): each request with the receiver's Avatar, name and department, and `요청 취소` (new).

  Both come from `GET /friend-requests`, the newest first.
- [x] `수락` accepts the request, and the toast says `{name}님과 친구가 됐어요`. `거절` declines it, and the row goes without a toast, as in the frame. `요청 취소` cancels the request, and the toast says `친구 요청을 취소했어요` (new).
- [x] A 404 `FRIEND_REQUEST_NOT_FOUND`, a request answered or cancelled meanwhile, shows `이미 처리된 요청이에요` (new) and fetches the requests again.
- [x] With no received request, that section says `받은 요청이 없어요`. A section without sent requests is left out.

### 친구 추가 (`FriendsAdd`)

- [x] It has `뒤로` and `친구 추가`, and three parts in this order.
- [x] `내 친구 ID` (new): the User's Friend ID, from the Lobby's profile, large and spaced, with the button `복사` (new). The button copies the ID to the phone's clipboard, using `expo-clipboard`, which is added with `npx expo install`. The toast says `친구 ID를 복사했어요` (new). Under it is the hint `친구 ID를 알려 주면 친구 요청을 받을 수 있어요` (new).
- [x] `친구 ID로 추가` (new): a field labelled `친구 ID` (new), with the placeholder `친구 ID 8자리` (new). It takes letters and digits, shows them in capitals, and holds at most 8. The button `찾기` (new) is enabled at 8 characters and asks `GET /friend-ids/:friendId`.
  - The owner is shown as a list row with the Avatar, the name and the department, and `추가`.
  - `추가` sends `POST /friend-requests` with `{ friendId }`. On `waiting`, the button turns into the disabled `요청됨`, and the toast says `{name}님에게 친구 요청을 보냈어요`. On `friends`, a request from the owner was waiting: the toast says `{name}님과 친구가 됐어요`.
  - The User's own Friend ID is caught before the lookup.
- [x] Each refusal is shown under the field in the field's error style, and nothing is sent:
  - 404 `FRIEND_ID_NOT_FOUND`: `이 친구 ID를 가진 사람이 없어요` (new);
  - 400 `OWN_FRIEND_ID`, or the User's own ID: `내 친구 ID예요` (new);
  - 409 `ALREADY_FRIENDS`: `{name}님과는 이미 친구예요` (new);
  - 409 `FRIEND_REQUEST_ALREADY_SENT`: `이미 친구 요청을 보냈어요` (new);
  - no answer: `연결하지 못했어요. 다시 시도해 주세요` (new).

  Changing the field clears the result and the message.
- [x] `초대 링크로 추가` (new): the outlined button `초대 링크 보내기` (new), with the note `링크는 한 사람만, 만든 뒤 24시간 동안 쓸 수 있어요` (new). The button sends `POST /invite-links` and opens Android's share sheet through React Native's `Share` with the message `SNU Now에서 친구 해요! {url}` (new). A failure shows the toast `초대 링크를 만들지 못했어요` (new). Each press makes a new link, as the main server allows.

### Opening the app from an Invite Link

- [x] The link `<PUBLIC_URL>/invite/<token>` and `snunow://invite/<token>` both open the route `/invite/[token]` (Expo Router's linking).
- [x] Android declares the https address for App Links. The app's configuration adds an intent filter with `autoVerify` for `https://<host>/invite/`. The host comes from the setting `INVITE_LINK_HOST`, the host of the main server's `PUBLIC_URL`, read from `.env` when a native build is made. Without it, the build declares no App Link, and links open only through the scheme. `.env.example` lists it with a one-line comment, and `mobile/README.md` says how App Links are verified against the main server's `/.well-known/assetlinks.json`, and that the build's signing certificate must be among the main server's `ANDROID_CERTIFICATE_FINGERPRINTS`.
- [x] The app keeps the link's token on the phone (`Kept`) as soon as it is opened, and shows the accept screen once the User is `ready`:
  - from a start of the app, after the loading screen;
  - while signed out, after sign-in, consent and Onboarding, whichever of them the User goes through;
  - while signed in, at once, over whatever is shown.

  The token is dropped once the accept screen shows it. A second link replaces the first.
- [x] The accept screen is a screen above the tabs, with ✕ `닫기` and `친구 초대` (new). It asks `GET /invite-links/:token`. When `status` is `usable`, it shows:
  - the sender's Avatar in its large size;
  - `{name}님의 친구 초대` (new) and the department;
  - the consent note `수락하면 친구가 되고, 서로의 위치를 지도에서 볼 수 있어요. 위치 공유는 친구마다 끌 수 있어요.` (new);
  - `거절` and `수락`.
- [x] `수락` sends `POST /invite-links/:token/accept`. The screen closes on 지도, and the toast says `{name}님과 친구가 됐어요`. `거절` closes the screen and sends nothing: the link stays usable for someone else until it expires.
- [x] A link that cannot be accepted shows its message, with the sender where the answer names one, and a `확인` (new) that closes the screen:
  - `used`, or 409 `INVITE_LINK_USED` on accepting: `이미 사용된 초대 링크예요` (new);
  - `expired`, or 410 `INVITE_LINK_EXPIRED`: `기간이 지난 초대 링크예요` (new), with `초대 링크는 만든 뒤 24시간 동안 쓸 수 있어요. 새 링크를 받아 주세요.` (new);
  - `own`, or 400 `OWN_INVITE_LINK`: `내가 보낸 초대 링크예요` (new), with `친구에게 보내 주세요.` (new);
  - `friend`, or 409 `ALREADY_FRIENDS`: `{name}님과는 이미 친구예요` (new);
  - 404 `INVITE_LINK_NOT_FOUND`: `찾을 수 없는 초대 링크예요` (new).

  While loading and after a failure, it shows the shared states.

### Friends on the map and in the lists

- [x] A Friend's Avatar is shown only where the main server sends that Friend's position (`GET /positions`, the socket's `position`), and only while `GET /friends` says the Friend is `visible`. The app never decides by itself who may be seen. A person who is both a Friend and a member of the User's Party has one Avatar, as today.
- [x] Each `position` moves the Avatar by a glide, as the map component does (`glideMs`). `position-removed` removes it at once.
- [x] A position measured more than 2 minutes ago is old: the Avatar is drawn dimmed, its marker image a look of its own. At the "names" level its text reads `{short name} · {n}분 전` (new). The Friend's card, its row in the floating friend list and its row in the Friend panel add `{n}분 전 위치` (new) to their line. A position measured more than 10 minutes ago, the main server's keep, is removed, as `GET /positions` would no longer answer it. The age is counted against the app's clock (`now()`) and looked at again every 30 seconds. The two limits are constants beside `POSITION_EVERY_MS`.
- [x] The rule is one for every person's Avatar, a Friend's or a Party member's (P13). Whichever of this ticket and P13's Avatar work lands first builds it in the map feature, and the other uses it.
- [x] A Friend who is not `visible` has no Avatar. Their rows in the floating friend list and in the Friend panel read `위치 꺼짐`, and a press on the floating list's row says `{이름}님은 위치가 꺼져 있어요`, as P06 built. In a build that asks the main server, the presence comes from `visible` alone, since the statuses (`FriendStatus`) are still the mock's.
- [x] The Friend panel keeps the rows and the footer of P19's ticket 01. They follow the data: a Friend moves between `공강` and `위치 꺼짐` as `visible` changes, and `친구 {n}명과 위치 공유 중` counts the Friends who are `visible` now. `공유 설정` leads to 내 정보, as P19's ticket 01 built. `+ 친구 추가` opens 친구 추가.
- [x] `friends-changed` fetches the Friends, the positions and the Friend Requests again. The app's signal table (`live-updates.tsx`) gains the requests. They are also fetched when the app returns to the front.

### Records and checks

- [x] P06's `todo.md` §3 gains a row for each new operation with its route, and §4 loses the friend controls this ticket connects. `mobile/README.md` ("Screens and the flow between them", "Data", "The connection to the socket server") describes the friend screens, the link's route and how it survives a sign-in, and the dimming rule.
- [x] Jest tests through `startApp` on the real routes:
  - against the mocks: 친구 관리's search and empty states, the switch on and off and a failed change, 친구 끊기 confirmed and cancelled, 친구 요청's accept, decline and cancel with their toasts, copying the Friend ID with the clipboard mocked, the lookup and `추가` with `waiting` and with `friends`, each refusal message, and the share sheet called with the link's address;
  - against the fake server and the fake socket (`mobile/__tests__/support/`):
    - each new operation, with its route, its body and its refusals;
    - `/invite/<token>` opened while signed in, and while signed out, through sign-in and on to the accept screen, and on a start of the app, after the loading screen;
    - `수락` and `거절` on the accept screen, and each status and each refusal on accepting;
    - a Friend's Avatar appearing on `position`, gliding on the next, dimming after 2 minutes with `{n}분 전`, gone after 10 minutes and gone on `position-removed`;
    - a Friend who is not `visible`, without an Avatar and with `위치 꺼짐`;
    - `friends-changed` refreshing 친구 관리, 친구 요청 and the Friend panel's count.
- [ ] A person opens an Invite Link on an Android phone with a development build, against a main server whose `PUBLIC_URL` is the https address of P05, from KakaoTalk and from the phone's message app, signed in and signed out. What was seen is recorded under Comments of P08's ticket 02 (Invite Link), whose criterion it closes. Where a messenger shows the address in its own browser, the page that opens `snunow://invite/<token>` is that ticket's, on the main server, and not this pull request's.
- [x] Under Comments, "Differences from the frame" lists each difference with its reason. Expected among them:
  - 친구 추가 by Friend ID and by Invite Link in place of the search by name;
  - no `친한 친구` or `차단`;
  - the meta line without `학번`, which `GET /friends` does not answer;
  - the per-Friend switch, 친구 끊기, the 친구 요청 note and its sent section, and the accept screen, which have no frame;
  - the dimmed Avatar and its words;
  - every word marked (new).
- [ ] Screenshots of the web target are in the pull request under Test Results, each compared with its frame: 친구 관리, 친구 요청, 친구 추가 and the accept screen. A screenshot from the phone shows the accept screen opened from a link.
- [x] The app's four checks pass: `pnpm lint`, `pnpm format:check`, `pnpm typecheck` and `pnpm test` in `mobile/`.

## Comments

### For a person

Two criteria are left for a person:

- opening an Invite Link on an Android phone with a development build, from KakaoTalk and from the message app, signed in and signed out, against a main server whose `PUBLIC_URL` is P05's https address and whose `ANDROID_CERTIFICATE_FINGERPRINTS` holds the build's certificate, with `INVITE_LINK_HOST` set when the build is made; what was seen goes under Comments of P08's ticket 02;
- the screenshots of the web target (친구 관리, 친구 요청, 친구 추가, the accept screen, each beside its frame) and one from the phone, in the pull request. On the web, the mocks answer: `/me/friends` and `/invite/from-yujian` open the screens.

### Differences from the frame

- 친구 추가 shows the User's Friend ID with `복사`, a Friend ID field with `찾기` and `초대 링크 보내기` in place of the search by name, because no User is found by name.
- No `친한 친구` or `차단` entry: no task covers them.
- A Friend's meta line is the department without `학번`, which `GET /friends` does not answer.
- The search field is on the list only; the frame keeps it on 친구 요청 too, which this ticket does not ask for.
- No frame draws the per-Friend switch, 친구 끊기 with its sheet and dialog, 친구 요청's note and its `보낸 요청` section, or the accept screen. They follow the shared components: a `ListRow` with a `Switch`, a `BottomSheet`, a danger `Dialog`, and a `FullScreenPanel` that slides up.
- The dimmed Avatar (opacity 0.45), `{short name} · {n}분 전` under it and `{n}분 전 위치` in the card and the rows have no frame.
- The friend screens' rows use the shared 40-high `Button` where the frame draws 34-high buttons.
- Words marked (new) in the criteria are the ticket's. Where a change fails in a way no words cover (ending a friendship, answering a request, accepting a link), the toast says the ticket's `연결하지 못했어요. 다시 시도해 주세요`.

### Result (2026-10-06)

Where things are, in `mobile/`:

- Routes: `src/app/(signed-in)/me/friends/{index,requests,add}.tsx` and `src/app/(signed-in)/invite/[token].tsx`, screens above the tabs in the signed-in stack. The screens are in `src/screens/friends/`.
- The API client gained `setFriendSharing`, `endFriendship`, `findFriendId`, `sendFriendRequest`, `listFriendRequests`, `accept/decline/cancelFriendRequest`, `createInviteLink`, `getInviteLink` and `acceptInviteLink`, with their checks in `answers.ts`; the Lobby's profile gained `friendId`. The mock keeps friendships, requests and links in memory (`src/api/mock/friendships.ts`) and refuses as the main server does; `startFresh()` resets it in the tests.
- `src/features/friends/`: `useFriendRequests`, `useMyFriendId`, `useInviteLink` (404 `INVITE_LINK_NOT_FOUND` is a status) and `useFriendChanges`, which fetches the Friends, the positions or the requests again after each change, done or refused.
- An Invite Link opened before the User is `ready` is kept by the signed-in layout's guard (`Kept.inviteToken`), and the layout opens its accept screen once the User is there; the accept screen drops it.
- Ageing: `OLD_POSITION_MS`, `KEPT_POSITION_MS` and `POSITION_AGE_EVERY_MS` beside `POSITION_EVERY_MS`; `useNow` looks at the clock every 30 seconds in `useFriends` and `useMapCards`, while the clock moves (under the mocks it stands at the frame's moment); the person look gained `old`, `MapPerson` gained `dimmed`. A Friend's app status is used only when it agrees with `visible`.
- `app.config.ts` adds the App Links intent filter from `INVITE_LINK_HOST`; `.env.example` lists it; `expo-clipboard` was added with `pnpm expo install`.
- Tests: `__tests__/friends-list-test.tsx`, `friend-requests-test.tsx`, `friends-add-test.tsx` (mocks), `friends-server-test.tsx` (fake server and socket: links, the accept screen, ageing, `friends-changed`) and `api/server-friends-test.ts` (each route, body and refusal). The glide and `position-removed` stay covered by `live-test.tsx`.

Not checked: nothing ran in a browser, on a phone or in a native build.

### Agent usage (2026-10-06)

Estimates, not read from the transcripts: about 2 hours of agent time in one session. Tokens: about 25 M input, of which about 24 M cache reads and 0.4 M cache writes, and about 0.12 M output. No subagents.
