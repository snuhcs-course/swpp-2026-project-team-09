# P06 to-do list

What P06 has to deliver, what is a mock for now, and the interfaces between the screens and the data behind them. [`spec.md`](./spec.md) decides what is built and the tickets in [`issues/`](./issues/) say how each part is accepted; this list tracks it and describes the interfaces. When a decision defers something or fills it with mock data, add it here at once; tick an item when it is done.

Last updated: 2026-10-05

## 1. The work, in order

### 1.1 Design system (ticket 01)

- [x] Tokens: colours, spacing, radii, sizes, shadows, the eight text styles
- [x] The Pretendard font, loaded before any screen appears
- [x] The icons
- [x] The components the four screens use, and a shared Toast with the "준비 중이에요" call
- [x] The app's configuration says light, not automatic
- [x] On an Android emulator: a Chip, a ChatInput suggestion and a middle-sized Button take a press 48 high (their touch areas reach past their own height)
- [ ] The same on an iPhone and on the shared Android phone
- [x] A Toast's place on a screen without the bottom navigation and with the phone's gesture inset
- [ ] A Toast over an open Dialog, when a screen needs one

### 1.2 Mocks and the API client (ticket 02)

- [x] The sign-in module and the API client with the operations of section 2, every one answered by a mock
- [x] One adapter per feature between the answer and the screens (section 2.10)
- [x] A mock answers after a short wait and can answer with a failure and with nothing
- [x] The phone keeps that a User signed in, the suggestion, whether Onboarding is finished, and the Onboarding's answers
- [x] The development settings of section 5, except the walk on campus

### 1.3 Loading screen (ticket 03; `Splash`)

- [x] The frame's look: the photos, the wordmark, the bar, the step labels
- [x] The bar follows the real work: what the phone keeps and, for a User who finished Onboarding, the Lobby
- [x] At least 0.5 seconds
- [x] "불러오지 못했어요" and "다시 시도" on a failure
- [x] Then the sign-in screen, Onboarding or the main screen, as the spec's flow says

### 1.4 Sign-in screen (ticket 04; `Login`, `LoginLoading`, `LoginError`)

- [x] The three states, and the refused state with other words for any other failure
- [x] The three legal documents' placeholder screens
- [x] The consent screen after the first sign-in, with the three documents, "동의하고 시작" and "로그아웃"
- [x] The mock sign-in behind the sign-in module
- [x] Google's account sheet in a build that holds Google's sign-in module, with the account's domain checked in the app
- [ ] A sign-in with Google tried in a development build on an emulator or a phone

### 1.5 Onboarding screen (ticket 05; `Onboarding`)

- [x] The six fields with the frame's choices and limits
- [x] The suggestion filled in, with its badges
- [x] Save enabled once a name and a department are there; saving shows the main screen
- [x] "로그아웃" back to the sign-in screen; no way back
- [x] The answers kept on the phone, so that Onboarding is shown once

### 1.6 Map component and the Android module (tickets 06, 07)

- [ ] The map component's interface (section 2.9)
- [ ] The plain ground with "지도는 Android 빌드에서 보입니다" for a build without the native module
- [ ] Images for markers and Avatars, made from the design system's marker views
- [ ] The credit for the map data at the bottom left
- [ ] The Android module in Kotlin, with the build settings and the steps to a build in the app's README
- [ ] The camera stays inside the campus rectangle
- [ ] The device check on an Android emulator, then once on the shared phone

### 1.7 Main screen (tickets 08 to 10; `Main` and its states)

- [ ] The map with the User's Avatar, the zoom and position buttons, the location explanation, off campus
- [ ] The walk on campus for development (section 5)
- [ ] Avatars and markers with their detail by zoom: Friends, a member of the User's Party, a Global Event, a Party
- [ ] A card for each, "가까이 보기", "길찾기" with the route line, the card's X
- [ ] The friend list and the Quest list, collapsing; a Friend's row; a Class Quest's row
- [ ] "오늘의 발자국", "활성 파티", the 편의기능 button, the AI input, the bottom navigation, in place
- [ ] The "준비 중이에요" toast on every control of section 4

### 1.8 iOS map module (ticket 11)

- [ ] The iOS side of the map in Swift, to the same interface, checked on the simulator

### 1.9 Connecting to the server (ticket 12, the last)

- [ ] For each feature the demo's flows use, and each other feature named: the client calls the main server, the adapter follows its answer, the mock stays for the tests
- [ ] One connection to the socket server: the Session's end, the positions of the Users the app may see, and the signals that something changed
- [ ] Google's ID token sent to the main server, its tokens kept in the phone's secure storage, and its word in place of the app's check of the account's domain
- [ ] Section 3's table updated with what is connected, and checked before the demo build (P20)

## 2. Interfaces

The screens reach data through these operations and nothing else. In this task each is answered by a mock.

- A mock answers in the main server's shape. "On the main line" means the main server serves it today. "Open pull request" means a pull request of P08 defines it and it may still change. "The app's own" means nothing defines it yet.
- An adapter turns an answer into what a screen uses (section 2.10). What a frame shows and no answer holds comes from a mock of the app's own beside the answer.
- All times are ISO 8601 instants. All positions are a latitude and a longitude in degrees.

### 2.1 Sign-in

```ts
// The sign-in module's two operations.
signIn(): Promise<SignInResult>;
signOut(): Promise<void>;

type SignInResult =
  | { outcome: 'signed-in'; onboarding: Onboarding }
  | { outcome: 'cancelled' } // the User closed Google's sheet
  | { outcome: 'not-snu-account' } // the main server's 403; until it is asked, the app's own check
  | { outcome: 'failed' }; // any other refusal, or no answer

type Onboarding =
  | { completed: true }
  | { completed: false; suggestion: { name: string | null; department: string | null } };

// What a sign-in brings from the main server (POST /auth/google with { "idToken": "…" }):
// {
//   "accessToken": "…",
//   "refreshToken": "…",
//   "onboarding": { "completed": false, "suggestion": { "name": "홍길동", "department": "컴퓨터공학부" } }
// }
// A part of the suggestion that cannot be read is null. After Onboarding: "onboarding": { "completed": true }.
// The mock keeps no tokens: it remembers on the phone that the User signed in. So does a sign-in with Google until
// the main server is asked: the app reads the ID token's hosted domain and sends the token nowhere.
```

Shape: on the main line (`POST /auth/google`, `POST /auth/refresh`, `POST /auth/sign-out`).

### 2.2 Onboarding

```ts
completeOnboarding(answers: OnboardingAnswers): Promise<void>;

interface OnboardingAnswers {
  name: string; // 1 to 30 characters
  department: string; // 1 to 50 characters, a name from the app's list
  admissionYear: number | null; // 2022; null for "그 외" and for no choice
  hashtags: string[]; // without '#', at most 20, 1 to 30 characters each, no whitespace, none twice whatever the case
  courseLevel: 'undergraduate' | 'graduate'; // the app's own; starts as 'undergraduate'
  gender: { kind: 'female' | 'male' } | { kind: 'custom'; text: string } | null; // the app's own
}

// Example:
// { "name": "홍길동", "department": "컴퓨터공학부", "admissionYear": 2022,
//   "hashtags": ["AI커리어", "러닝"], "courseLevel": "undergraduate", "gender": null }
```

Shape: on the main line for the first four fields (`POST /users/me/onboarding`, answered 204). The course level and the gender are the app's own and stay on the phone.

### 2.3 Lobby

```ts
enterLobby(): Promise<Lobby>;

interface Lobby {
  profile: { name: string; department: string; admissionYear: number | null; hashtags: string[] };
}

// Example (POST /lobby, no body):
// { "profile": { "name": "홍길동", "department": "컴퓨터공학부", "admissionYear": 2022, "hashtags": ["AI커리어"] } }
// The main server refuses the Lobby with 403 ONBOARDING_REQUIRED until Onboarding is finished,
// so the app asks for it only for a User who finished Onboarding.
```

Shape: on the main line (`POST /lobby`). An open pull request adds `masterSwitch` to it.

### 2.4 Friends and their positions

```ts
listFriends(): Promise<Friend[]>;
listPositions(): Promise<Position[]>;
listFriendStatuses(): Promise<FriendStatus[]>;

// Open pull request: GET /friends, in the order of the names.
interface Friend {
  id: string; // the Friend's User id
  name: string;
  department: string;
  sharing: boolean; // the User's own switch for this friendship
  visible: boolean; // whether the User can see the Friend on the map now, never why not
}

// Open pull request: GET /positions, the positions the User may see now.
interface Position {
  userId: string;
  latitude: number;
  longitude: number;
  measuredAt: string;
}

// The app's own: what the frame's list and card show and no answer holds.
interface FriendStatus {
  userId: string;
  presence: 'free' | 'class' | 'moving' | 'off'; // 공강, 수업 중, 이동 중, 위치 꺼짐
  where: string; // "중앙도서관"; "" for a Friend whose location is off
  detail: string; // "공강 · 중앙도서관 근처 · 15:00까지 비어 있어요"
  walk: string; // "도보 4분"; "" when it is not known
  photo: string | null; // an image address; null shows the name's letters
}

// Example:
// friends:   [{ "id": "f1", "name": "김민준", "department": "컴퓨터공학부", "sharing": true, "visible": true }]
// positions: [{ "userId": "f1", "latitude": 37.4598, "longitude": 126.9521, "measuredAt": "2026-10-05T05:00:00.000Z" }]
// statuses:  [{ "userId": "f1", "presence": "free", "where": "중앙도서관",
//               "detail": "공강 · 중앙도서관 근처 · 15:00까지 비어 있어요", "walk": "도보 4분", "photo": null }]
```

### 2.5 Quests

```ts
listQuests(): Promise<Quest[]>;

// Open pull request: GET /quests. The User's Quests, then today's Class Quests by their start.
interface Quest {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
  holders: { id: string; name: string; department: string }[];
  subQuests: SubQuest[]; // the attending one first
  classQuest: boolean; // true for a Class Quest
}

interface SubQuest {
  id: string;
  attending: boolean;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: { placeId: string | null; label: string; latitude: number; longitude: number } | null;
  completion: 'by_time' | 'by_hand';
  cancelled: boolean;
  done: boolean;
  ended: boolean;
}

// Example (a Class Quest):
// { "id": "c1", "title": "자료구조", "globalEvent": null,
//   "holders": [{ "id": "me", "name": "홍길동", "department": "컴퓨터공학부" }],
//   "subQuests": [{ "id": "c1", "attending": false, "title": "자료구조",
//                   "startsAt": "2026-10-05T05:00:00.000Z", "endsAt": "2026-10-05T06:15:00.000Z",
//                   "place": { "placeId": "…", "label": "301동 118호", "latitude": 37.4499, "longitude": 126.9525 },
//                   "completion": "by_time", "cancelled": false, "done": false, "ended": false }],
//   "classQuest": true }
```

### 2.6 What is on the map

```ts
listGlobalEvents(): Promise<GlobalEvent[]>;
listGlobalEventAnnouncers(): Promise<{ eventId: string; announcer: string }[]>; // the app's own: "컴퓨터공학부 공지"
listParties(): Promise<Party[]>;
getMyParty(): Promise<MyParty | null>; // the main server answers 404 NOT_IN_PARTY; the client turns it into null

// The published Global Events, with the fields the main server stores for one. No route lists them for a User yet,
// so the list itself is the app's own. A published event has a title, a start and a position.
interface GlobalEvent {
  id: string;
  title: string; // "AI 커리어 채용설명회"
  description: string;
  startsAt: string;
  endsAt: string | null;
  place: string | null; // "301동 대강당"
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
}

// Open pull request: GET /parties, the newest first. The list holds open and approval Parties, never a closed one.
interface Party {
  id: string;
  title: string; // "AI 커리어 설명회 같이 가요"
  capacity: number; // 1 to 8
  joinPolicy: 'open' | 'approval' | 'closed';
  memberCount: number;
  mark: PartyMark | null; // the Quest the Party is marked with; null once that Quest is deleted
}

interface PartyMark {
  questId: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
}

// Open pull request: GET /parties/mine, the Party the User is in now. The frame's "활성 파티".
interface MyParty {
  id: string;
  title: string;
  capacity: number;
  joinPolicy: 'open' | 'approval' | 'closed';
  mark: PartyMark | null;
  sharing: boolean; // the User's own switch for sharing a position with this Party
  members: { id: string; name: string; department: string; leader: boolean; visible: boolean }[]; // the User among them
}
```

Where a Party is and when it starts are not in its answer: they are those of the Quest it is marked with, and a User reads only the Quests the User holds. So the map shows the Parties of the User's own Quests; a listed Party of others has no place to stand on. A member's position comes from `listPositions()`.

A Quest that neither the User's own Party nor a listed Party names is no Party's: it is a Shared Quest, such as an accepted Meetup with a Friend, or a Quest the User holds alone. The frame words a Shared Quest as a "비공개 파티" (its row "비공개 파티 · 김민준", its card "비공개 파티 · 김민준과"), and the adapter uses the frame's words without calling it a Party: its `joinPolicy` is null.

### 2.7 Walking route

```ts
findWalkingRoute(from: LatLng, to: LatLng): Promise<WalkingRoute>;

interface LatLng {
  latitude: number;
  longitude: number;
}

type WalkingRoute =
  | { status: 'OK'; route: { line: LatLng[]; distance: number; duration: number } } // metres, seconds
  | { status: NoRouteStatus; route: null }; // SAME_POINT, START_LINK_NOT_FOUND, END_LINK_NOT_FOUND,
                                            // TOO_MANY_SEARCH_LINK, TOO_FAR_AWAY or ROUTE_RESULT_NOT_FOUND

// Example (GET /walking-route?startLatitude=…&startLongitude=…&endLatitude=…&endLongitude=…):
// { "status": "OK", "route": { "line": [{ "latitude": 37.46632, "longitude": 126.94829 }, …],
//   "distance": 1105, "duration": 1216 } }
// The mock answers a short curved line between the two points.
```

Shape: on the main line (`GET /walking-route`).

### 2.8 My position

```ts
// Not a server's answer: the phone's own position, behind one hook, so that the development walk can replace it.
usePosition(): { permission: 'unasked' | 'granted' | 'refused'; position: LatLng | null; ask: () => Promise<void> };
```

### 2.9 The map component

```tsx
// The one component a screen uses to show a map. The native modules and the plain ground implement it.
<Map
  bounds={{ south: 37.445, west: 126.945, north: 37.471, east: 126.963 }} // the camera stays inside
  minZoom={14} // the whole rectangle; the numbers are settled with the Android module
  maxZoom={19}
  markers={[
    // image: a picture made from the design system's marker view. text: shown under the marker by the map.
    { id: 'event:e1', position: { latitude: 37.4499, longitude: 126.9525 }, image: globalEventPin, text: 'AI 커리어' },
  ]}
  avatars={[
    // An Avatar glides to a new position over glideMs. A move that starts during another starts from where it is shown.
    { id: 'me', position: { latitude: 37.45905, longitude: 126.9512 }, image: myAvatar, glideMs: 5000 },
    { id: 'friend:f1', position: { latitude: 37.4598, longitude: 126.9521 }, image: friendAvatar, text: '민준', glideMs: 5000 },
  ]}
  route={[{ latitude: 37.45905, longitude: 126.9512 }, { latitude: 37.4601, longitude: 126.9507 }]} // or null for none
  onPress={(id) => {}} // a marker's or an Avatar's id
  onCameraIdle={({ centre, zoom }) => {}} // the screen switches the detail of markers and Avatars from zoom
  ref={map} // map.current.moveCamera({ centre, zoom, animated: true })
/>
```

### 2.10 What the screens use

The adapters' outputs. A screen reads these, never an answer.

```ts
// One row of the friend list, and a Friend's Avatar on the map. From Friend, Position and FriendStatus.
interface FriendView {
  id: string;
  name: string;
  department: string;
  presence: 'free' | 'class' | 'moving' | 'off';
  line: string; // "공강 · 중앙도서관"
  detail: string;
  walk: string; // "도보 4분", or ""
  photo: string | null;
  position: LatLng | null; // null when the Friend cannot be seen
}

// One row of the Quest list. From Quest, and from MyParty for a Party's row.
interface QuestRowView {
  id: string;
  kind: 'class' | 'party'; // 'party' is every Quest that is not a class
  joinPolicy: 'open' | 'approval' | 'closed' | null; // the Party's that names the Quest; null for a class and for a Quest no Party names
  kicker: string; // "다음 강의 · 23분 후"
  title: string; // "자료구조"
  meta: string; // "14:00 · 301동 118호"
  position: LatLng | null; // where the map goes on a press
}

// What a card shows for anything pressed on the map.
interface CardView {
  id: string;
  kind: 'global-event' | 'party' | 'friend' | 'party-member';
  subLabel: string; // "공식 행사 · 컴퓨터공학부 공지"
  title: string;
  lines: { icon: string; text: string }[];
  primary: { label: string; action: 'route' | 'not-ready' };
  secondary: { label: string; action: 'not-ready' } | null;
  position: LatLng;
}
```

## 3. Mock now, server later

Every row is a mock until the last ticket. That ticket connects every row the demo's flows (P20) use, where the main server serves it by then, and any other row that is named.

Sending the User's own position is not in this table: it is built in P09 with the Master Switch, which is on 내 정보. The main server refuses every position while the switch is off, so the two are built together.

| Feature | Mock's shape | Connects to |
|---|---|---|
| Sign-in, refresh, sign-out | On the main line. A build that holds Google's sign-in module already asks Google and checks the account's domain in the app; nothing is sent | `POST /auth/google`, `/auth/refresh`, `/auth/sign-out` |
| Onboarding: name, department, admission year, interests | On the main line | `POST /users/me/onboarding` |
| Onboarding: course level, gender | The app's own | Nothing yet |
| Lobby | On the main line | `POST /lobby` |
| Friends | Open pull request | `GET /friends` |
| Friends' positions | Open pull request | `GET /positions` and the socket's `position` |
| Friends' status, place and photo | The app's own | Nothing yet |
| Quests, Class Quests | Open pull request | `GET /quests` |
| Global Events | The stored event's fields | Nothing lists them for a User yet |
| Who announced a Global Event (`listGlobalEventAnnouncers`) | The app's own | Nothing yet |
| The User's own id | The mock's fixed one | The access token |
| The app's time | The moment the `Main` frame shows | The phone's time |
| Parties | Open pull request | `GET /parties`, `GET /parties/mine` |
| Walking route | On the main line | `GET /walking-route` |
| The AI input, stories, 오늘의 발자국 | Sample content inside the screen | No spec covers them |

## 4. Controls that say "준비 중이에요"

The control is there and only shows the toast. The last column is a proposal for where the real thing belongs.

| Where | Control | Opens | Proposed for |
|---|---|---|---|
| Friend list | The friend pill | The friend panel | P14 |
| Quest list | The full-screen button | The full-screen Quest view | P13 |
| Quest list | A Party's row | The party screen | P13 |
| Above the navigation | 오늘의 발자국 | The story replay | In no Iteration 1 spec |
| Above the navigation | 활성 파티 | The party screen | P13 |
| Above the navigation | The 편의기능 button | The dining, shuttle and study layers | P15 |
| Above the navigation | The AI input and its send button | The AI chat | In no Iteration 1 spec |
| Bottom navigation | 파티, 행사 | The party and events screens | P13 |
| Bottom navigation | 올리기 | The story sheet | In no Iteration 1 spec |
| Bottom navigation | 내 정보 | 내 정보, with the Master Switch, sign-out and the timetable | P09 |
| A Global Event's card | 같이 갈 사람 찾기 | The party screen | P13 |
| A Party's card | 참여하기, 파티 열기 | The party screen | P13 |
| A Friend's card | 파티 만들기 | Making a Party | P14 |

## 5. Development settings

Each is a setting given when the app is started, as an `EXPO_PUBLIC_` variable. None is on in a released app.

| Setting | What it does | Ticket |
|---|---|---|
| The sign-in's ending | The sign-in is the mock, also in a build that could ask Google, and ends in `signed-in`, `cancelled`, `not-snu-account` or `failed` | 02 |
| A slow or failing mock | A named mock answers slowly, with a failure or with nothing | 02 |
| The first state | What the phone keeps is cleared when the app starts: not signed in, no Onboarding | 02 |
| The walk on campus | The phone's position is replaced by a walk along a fixed path on campus | 08 |

## 6. Design: to settle

- [ ] The sign-in button holds the university's emblem, and the design system's brand book says not to reproduce it. Settle which holds
- [ ] The texts of the three legal documents: 이용약관, 개인정보 처리방침, 위치정보 이용약관
- [ ] The consent screen has no frame: its look and words are the app's own. The `Login` frame still asks for consent in its footer, which the app leaves out. Draw the consent screen and settle the sign-in frame's footer
- [ ] The two drawings beside the sign-in button are copied from the wireframes, and where they come from is not recorded. Record it and whether the app may ship them
- [ ] A Friend's Avatar on the map: the frame draws a teardrop in the status colour; the candidates frame (지금, A, B, C, D) is still open
- [ ] The frame draws a route when the screen opens, without a press, and has no way to clear a route. The app follows it; settle whether both are meant
- [ ] The frame's toast sits over the row of buttons above the navigation
- [ ] The frame's friend pill says 12 whatever the list holds. The app shows the number of Friends in the list
- [ ] No frame shows the main screen off campus, the explanation before the location prompt, or the credit for the map data; the spec gives their wording
- [ ] Onboarding's "그 외" admission year stores no year. Decide whether it should ask for one
- [ ] The credit for the map data is text alone. Decide whether a press should open the sources' pages
- [ ] The frame shows a photo for two Friends. The app has no pictures of people, so every Friend shows the name's letters
- [ ] The frame writes a Friend's year after the department ("컴퓨터공학부 22"). No answer holds a Friend's year, so the app shows the department alone
- [ ] The loading screen's two photos are copied from the wireframes. Record where they come from and whether the app may ship them
- [ ] The loading screen leaves out the frame's band of light and uses weight 700 for the wordmark, where the frame has 800. Settle whether either matters
- [ ] The frame's numbers for the one Party disagree: "4명" in the Quest list, "4/6명" on the card, "3명 공유 중" on the button. The mock has four members of six, three of them shared with the User
- [ ] The frame calls a dinner with one Friend a "비공개 파티". In the glossary it is a Shared Quest from a Meetup and no Party, and a User is in one Party at a time. The app uses the frame's words; settle the word
- [ ] A Party's card in the frame has the line "#AI커리어 관심사가 겹쳐요". No answer holds it, and the app leaves it out

## 7. For people

- [ ] `KAKAO_NATIVE_APP_KEY` filled in for the app
- [x] Google Cloud holds an Android sign-in client for `com.bonnieandclaude.snunow` and the development SHA-1
- [ ] `mobile/.env` filled in from `mobile/.env.example`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, the ID of the main server's client, which must be of type "Web application"; for the iOS build also `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `GOOGLE_IOS_URL_SCHEME`
- [ ] A sign-in with Google tried in a development build on Android (`mobile/README.md`, "Google sign-in"): an SNU account, an account outside SNU and a closed sheet
- [ ] Before the last ticket: a main server that a phone can reach
- [ ] For the iOS ticket: the iOS app registered at Kakao
- [ ] Update P06's row in the schedule sheet
