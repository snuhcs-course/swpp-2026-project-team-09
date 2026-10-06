# P06 to-do list

What P06 has to deliver, what is a mock for now, and the interfaces between the screens and the data behind them. [`spec.md`](./spec.md) decides what is built and the tickets in [`issues/`](./issues/) say how each part is accepted; this list tracks it and describes the interfaces. When a decision defers something or fills it with mock data, add it here at once; tick an item when it is done.

Last updated: 2026-10-06

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

- [x] The map component's interface (section 2.9)
- [x] The plain ground with "지도는 Android·iOS 빌드에서 보입니다" for a build without the native module
- [x] Images for markers and Avatars, made from the design system's marker views
- [x] The credit for the map data at the bottom left
- [x] The Android module in Kotlin, with the build settings and the steps to a build in the app's README
- [x] The camera stays inside the campus rectangle
- [x] The device check on an Android emulator
- [ ] The device check once on the shared phone

### 1.7 Main screen (tickets 08 to 10; `Main` and its states)

- [x] The map with the User's Avatar, the zoom and position buttons, the location explanation, off campus
- [x] The walk on campus for development (section 5)
- [x] Avatars and markers with their detail by zoom: Friends, a member of the User's Party, a Global Event, a Party, a Shared Quest
- [x] A card for each, "가까이 보기", "길찾기" with the route line, the card's X
- [x] The route to the User's next Quest when the screen opens
- [x] On a native map, in TypeScript: the fit zoom, a fit with a padding for each edge and a closest zoom, the route's colour and width, a passive press dropped
- [ ] The Android module draws the route's dashes, takes no press on a passive marker, and is checked on a phone with the new looks (ticket 07)
- [x] The friend list and the Quest list, collapsing; a Friend's row; a Class Quest's row
- [x] "오늘의 발자국", "활성 파티", the 편의기능 button, the AI input, the bottom navigation, in place
- [x] The "준비 중이에요" toast on every control of section 4
- [x] The map's inset: the credit above the row of buttons, and the inset handed to the native map
- [ ] The Android and iOS modules read the inset and place Kakao's logo inside it: written in ticket 11's review, not yet seen in a build (ticket 11's Comments)

### 1.8 iOS map module (ticket 11)

- [ ] The iOS side of the map in Swift, to the same interface, checked on the simulator

### 1.9 Connecting to the server (ticket 12, the last)

- [x] For each feature the demo's flows use, and each other feature named: the client calls the main server, the adapter follows its answer, the mock stays for the tests
- [x] One connection to the socket server: the Session's end, the positions of the Users the app may see, and the signals that something changed
- [x] Google's ID token sent to the main server, its tokens kept in the phone's secure storage, and its word in place of the app's check of the account's domain
- [x] Section 3's table updated with what is connected
- [ ] Section 3's table checked again before the demo build (P20)
- [ ] A sign-in with an SNU account on the emulator against the main server, reaching the main screen, with a screenshot (a person's: section 7)

## 2. Interfaces

The screens reach data through these operations and nothing else. In a build that asks the main server (`asksMainServer()`: a build that signs in with Google and has the main server's address), the operations the main server serves come from it; every other operation, and every operation in Expo Go, on the web and in the tests, is answered by a mock.

- A mock answers in the main server's shape. "On the main line" means the main server serves it today. "The app's own" means nothing defines it yet. Section 3 says which operations a build that asks the main server takes from it.
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
// The main server's tokens are kept in the phone's secure storage. A 403 is an account outside SNU; a 401 and any other
// failure is 'failed'. The mock keeps no tokens: it remembers on the phone that the User signed in. So does a sign-in
// with Google in a build without the main server's address: the app reads the ID token's hosted domain and sends the
// token nowhere.
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

Shape: on the main line (`POST /lobby`). The answer also holds `profile.friendId` and `masterSwitch`, which nothing reads yet; P09 reads the switch.

### 2.4 Friends and their positions

```ts
listFriends(): Promise<Friend[]>;
listPositions(): Promise<Position[]>;
listFriendStatuses(): Promise<FriendStatus[]>;

// On the main line: GET /friends, in the order of the names.
interface Friend {
  id: string; // the Friend's User id
  name: string;
  department: string;
  sharing: boolean; // the User's own switch for this friendship
  visible: boolean; // whether the User can see the Friend on the map now, never why not
}

// On the main line: GET /positions, the positions the User may see now, and the socket's `position`.
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

// On the main line: GET /quests. The User's Quests, then today's Class Quests by their start. The main server's Quest
// also holds `leader`, `capacity` and `joinPolicy`, which the app does not read.
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
  title: string; // "AI 커리어 설명회"
  description: string;
  startsAt: string;
  endsAt: string | null;
  place: string | null; // "301동 대강당"
  latitude: number;
  longitude: number;
  sourceUrl: string | null;
}

// On the main line: GET /parties, the Parties the User may see and is not in, the newest first. The list holds open and
// approval Parties, never a closed one.
interface Party {
  id: string;
  title: string; // "AI 커리어 설명회 같이 가요"
  memberCount: number;
  capacity: number; // 1 to 8
  joinPolicy: 'open' | 'approval' | 'closed';
  quest: PartyQuest | null; // the Quest the Party is marked with; null once that Quest is deleted
  holdsQuest: boolean; // whether the User holds that Quest
  friends: { id: string; name: string; department: string }[]; // the User's Friends among the members
}

interface PartyQuest {
  id: string;
  title: string;
  globalEvent: { id: string; title: string } | null;
}

// On the main line: GET /parties/mine, the Party the User is in now; 404 NOT_IN_PARTY for a User in no Party. The
// frame's "활성 파티".
interface MyParty {
  id: string;
  title: string;
  capacity: number;
  joinPolicy: 'open' | 'approval' | 'closed';
  quest: PartyQuest | null;
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
// `checking` is the moment until the phone has said whether the User was asked before. `blocked` is a refusal after
// which the system no longer prompts: `openLocationSettings()` opens the phone's settings.
usePosition(): {
  permission: 'checking' | 'unasked' | 'granted' | 'refused' | 'blocked';
  position: LatLng | null;
  stepMs: number; // the time since the position before, between 1000 and 5000: an Avatar's glide
  ask: () => Promise<void>;
  retry: () => void; // starts the phone's watch again if it could not start
};
```

It is `usePosition` of `mobile/src/position`, on `expo-location`, read inside a `PositionProvider`, which the main screen has around it: one permission and one watch for every part that reads it. A new position is asked for about every five seconds; a phone may tell more often.

### 2.9 The map component

```tsx
// The one component a screen uses to show a map, from `@/map`. The native modules and the plain ground implement it,
// to the rules below; `mobile/src/map/types.ts` states them in full.
<Map
  bounds={CAMPUS_BOUNDS} // { south: 37.445, west: 126.945, north: 37.471, east: 126.963 }: the visible area stays inside
  minZoom={MIN_ZOOM} // 14, a floor: on a phone the rectangle sets the lowest zoom, 14.97 at 411 points wide
  maxZoom={MAX_ZOOM} // 19
  markers={[
    // name: what a screen reader says. image: a picture made from the design system's marker view.
    // text: shown under the marker by the map. order: higher is on top; left out, 0.
    { id: 'event:e1', name: '공식 행사 · AI 커리어 설명회', position: { latitude: 37.45016, longitude: 126.95259 },
      image: globalEventPin, text: 'AI 커리어' },
  ]}
  avatars={[
    // passive: it takes no press, and a press on it reaches what is under it; it is still read by its name.
    { id: 'me', name: '내 위치', position: { latitude: 37.45905, longitude: 126.9512 }, image: myAvatar, glideMs: 5000,
      order: 1, passive: true },
    { id: 'friend:f1', name: '김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요',
      position: { latitude: 37.45952, longitude: 126.95209 }, image: friendAvatar, text: '민준', glideMs: 5000 },
  ]}
  route={[{ latitude: 37.45905, longitude: 126.9512 }, { latitude: 37.4601, longitude: 126.9507 }]} // or null for none
  routeStyle={{ color: '#865600', width: 3, dash: [2, 6] }} // left out, the map's own plain line
  onPress={(id) => {}} // a marker's or an Avatar's id
  onCameraIdle={({ centre, zoom }) => {}} // the screen switches the detail of markers and Avatars from zoom
  onFitZoom={(zoom) => {}} // the zoom at which the whole campus is in view; the zoom levels are counted from it
  inset={{ bottom: 126, right: 62, left: 8 }} // what the screen's controls cover of the map's edges; left out, 0
  ref={map}
/>

map.current.moveCamera({ centre, zoom, animated: true }); // each of the three may be left out
map.current.fitTo(points, { padding: 48, animated: true }); // the closest view that shows all the points
map.current.fitTo(points, { padding: { top: 288, right: 108, bottom: 166, left: 46 } }); // clear room for each edge
map.current.fitTo(points, { padding: 48, maxZoom: 15.8 }); // and no closer than a zoom

// The images, one for each look, in the order asked. An image names its look at once and gains its picture when it
// is made; a native side draws a marker once the picture is there and reads it again when its uri changes.
const [globalEventPin, myAvatar, friendAvatar] = useMarkerImages([
  // A place of each kind of the design system, as a 'dot' or a 'pin'; a pin with `count`; either with `selected`.
  { kind: 'official', form: 'pin' },
  { kind: 'me' }, // with `small: true`, at three quarters of its size, while the whole campus is in view
  // A person: the frame's teardrop in a tone ('free', 'class', 'moving', 'off', or 'member' for a member of the
  // User's Party who is no Friend), with `small: true` while the whole campus is in view, and with `selected`.
  // `id` is the person's own and names the look; `name` and `photo` are what is drawn.
  { kind: 'person', id: 'f1', tone: 'free', name: '김민준', photo: null },
]);

interface MarkerImage {
  look: string; // "official:pin"
  view: MarkerLook; // the look itself; the plain ground draws the design system's view from it
  uri: string | null; // null until the picture is made, and wherever there is no native map
  width: number; // points
  height: number;
  anchor: { x: number; y: number }; // the point that stands on the position, as a share of the width and the height
}
```

The rules, for every implementation:

- A zoom is the Web Mercator zoom level at the camera's centre: the world is 256 × 2^zoom points wide. It may be a fraction. A native side converts it to its SDK's own scale.
- The camera stays inside `bounds`: the visible area never leaves the rectangle. The lowest zoom allowed is the larger of `minZoom` and the zoom at which the view just fits inside the rectangle, which depends on the view's size; the centre is kept far enough from the edges; the highest zoom is `maxZoom`. The map opens on the middle of the rectangle at the lowest zoom allowed.
- `moveCamera` and `fitTo` are first brought inside these rules. `fitTo` moves to the closest zoom at which all the points are inside what the padding leaves of the view, with their middle in the middle of that. The padding is one number for all four edges, or `{ top, right, bottom, left }`.
- `routeStyle` is the route line's look: `color`, `width` in points on the screen, and `dash`, the length of a dash and of the gap after it, measured as SVG's `stroke-dasharray`. The ends and the dashes are round, and the width and the dashes are the same at every zoom. Without it the line is the map's own.
- A look's name is the key of its picture, and two looks that draw the same picture have the same name: `me`, `me:small`, `person:<small|full>:<tone>:<id>` and the same with `:photo` for a person who has one, `<kind>:dot`, `<kind>:pin`, `<kind>:pin:<count>`, each of the last four also with `:selected`. A person's marker and a pin stand on their tip; a dot and the User's own Avatar sit on their middle.
- `onCameraIdle` is sent once when the map is ready and each time the camera comes to rest somewhere else: after a User's pan or zoom ends, and after `moveCamera` or `fitTo`. A call that changes nothing sends nothing.
- `onFitZoom` gives the fit zoom, which is the lowest zoom allowed: once when the map is ready, before the first `onCameraIdle`, and again whenever the view's size changes it. The main screen's levels are offsets from it, `ZOOM_OFFSET` in `mobile/src/map/campus.ts`: `pins` +0.68, `names` +1.26, `close` +1.38, `step` 0.585.
- A marker that is new in its list is added, one whose `id` stays is changed, one that is gone is removed.
- A `passive` marker or Avatar takes no press: `onPress` is never sent for it, and a press on it goes to what is drawn under it. It is drawn, and a screen reader reads its `name`.
- `fitTo` with `maxZoom` comes no closer than that zoom: points that are near each other are shown from there.
- A person's look is named by the person's id and by whether there is a photo, never by the photo's address, which changes with every answer.
- An Avatar glides. The map keeps each Avatar's last target and starts a glide only when `position` differs from it; the lists are new on every render. An Avatar that first appears is placed without a glide. A new position is reached over `glideMs`; one that comes during a glide starts from where the Avatar is shown. A new `image` or `text` alone does not restart a glide. A `glideMs` of 0 places it at once.
- `inset` is what a screen's controls cover of the map's edges, in points from each edge: `{ top?, right?, bottom?, left? }`, a side left out being 0. The credit for the map data and a provider's logo are drawn inside what is left, the credit at its bottom left and the logo at its bottom right, each with the map's margin of 8. The map is drawn under the controls as before and the cameras may ignore it. It may change while the map is shown.
- Every Avatar is above every marker, and the route is under both. Among markers, and among Avatars, the higher `order` is on top, and of two that are equal the later in the list. The screen ranks the User's own Avatar and a selected marker.

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
  // What the row is drawn as: 'open' is a Party that others may join; 'closed' is a Party that takes nobody else,
  // and a Quest that no Party names. The screen takes the colour from the design system's `questTone`.
  tone: 'class' | 'open' | 'closed';
  icon: 'clock' | 'users' | 'lock'; // in the row's round: by the tone, in that order
  joinPolicy: 'open' | 'approval' | 'closed' | null; // the Party's that names the Quest; null for a class and for a Quest no Party names
  kicker: string; // "다음 강의 · 23분 후"
  title: string; // "자료구조"
  meta: string; // "14:00 · 301동 118호"
  place: string; // "301동 118호", or ""; a class's row says "<title> · <place>" on a press
  position: LatLng | null; // where the map goes on a press
}

// What a card shows for anything pressed on the map, and what its marker shows. Its id is the marker's id:
// "event:<id>", "party:<the Quest's id>", "friend:<the User's id>", "party-member:<the User's id>" (`cardId`).
interface CardView {
  id: string;
  // 'shared-quest' is a Quest of the User's that no Party names, such as a dinner with a Friend.
  kind: 'global-event' | 'party' | 'shared-quest' | 'friend' | 'party-member';
  // At the card's head and as the marker: a person's Avatar, or a place's kind in the design system.
  // `presence` is null for a member of the User's Party who is no Friend.
  mark:
    | { type: 'person'; id: string; name: string; photo: string | null; presence: 'free' | 'class' | 'moving' | 'off' | null }
    | { type: 'place'; place: 'official' | 'party' | 'quest' };
  marker: {
    name: string; // what a screen reader says: "공식 행사 · AI 커리어 설명회", "김민준 · 공강 · 중앙도서관 근처 · …"
    short: string; // under the marker from the "names" level: "AI 커리어", "민준"
    count: number; // on a place's pin: a Party's members, or the Parties of a Global Event when more than one; else 0
  };
  subLabel: string; // "공식 행사 · 컴퓨터공학부 공지"
  title: string;
  lines: { icon: 'clock' | 'pin' | 'users' | 'info' | 'route'; text: string }[];
  primary: { label: string; action: 'route' | 'not-ready' };
  secondary: { label: string; action: 'not-ready' } | null;
  position: LatLng;
}

// The User's next Quest by time: where the route goes that is drawn when the main screen opens.
interface NextQuestView {
  id: string;
  title: string; // "자료구조"
  position: LatLng;
}

// What "오늘의 발자국" shows beside its name. From Footprints, the app's own:
// getFootprints(): Promise<{ friendCount: number; faces: { userId: string; name: string; photo: string | null }[] }>
interface FootprintsView {
  faces: { id: string; name: string; photo: string | null }[]; // three at most; none while nothing is known
  line: string; // "친구 5명의 오늘", or "" while nothing is known and when no Friend left a story
}

// "활성 파티": the Party the User is in now. From MyParty; null for a User in no Party.
interface ActivePartyView {
  id: string;
  title: string; // "AI 커리어 설명회 같이 가요"
  line: string; // "3명 공유 중": the members who share, the User left out; "응답 대기" when nobody else does
}
```

## 3. Mock now, server later

Ticket 12 connected every row that the demo's flows (P20) use and the main server serves on its main line (`origin/1.0/Main` at `61881c7`, 2026-10-06). A connected row is answered by the main server in a build that asks it (`asksMainServer()`: Google's sign-in module, the Google settings and `EXPO_PUBLIC_MAIN_SERVER_URL`), and by its mock in Expo Go, on the web, in the tests and in a build without the address. A row left a mock is answered by its mock in every build; the reason is in its row. Before the demo build (P20), check the table again against the main line.

| Feature | State | With the main server | Why |
|---|---|---|---|
| Sign-in, refresh, sign-out | Connected | `POST /auth/google`, `/auth/refresh`, `/auth/sign-out`; tokens in the phone's secure storage | The main server's 403 replaces the app's check of the domain |
| Onboarding: name, department, admission year, interests | Connected | `POST /users/me/onboarding` | |
| Whether a User finished Onboarding | Connected | The sign-in's answer, and every 403 `ONBOARDING_REQUIRED` with its suggestion | The main server's word replaces the phone's |
| Onboarding: course level, gender | The app's own, on the phone | Nothing | The main server has no field for them |
| Lobby | Connected | `POST /lobby`, with `masterSwitch` and `profile.friendId` | |
| The profile (프로필 편집) | Connected | `PATCH /users/me/profile` with the changed fields | |
| The Master Switch | Connected | `PUT /users/me/master-switch`; read from the Lobby | The mock keeps it in memory, off at each start |
| Sending the User's position | Connected | `POST /positions`, at most every 5 s while the switch is on, the permission granted and the app in front | `MASTER_SWITCH_OFF` turns the switch off; the 400s and no answer drop a position. On Android, with the row `백그라운드에서도 공유`, also every 30 s in the background under a notification (P17). The mock refuses while the switch is off and answers `offCampus` by the campus rectangle |
| The timetable (내 정보's week, 시간표 and the class form) | Connected | `GET /timetable/classes`, `POST /timetable/classes` with a new `Idempotency-Key` for each press of 저장, `PUT` and `DELETE /timetable/classes/:classId`; the classes and the Quests are fetched again after each change | The mock starts from the frame's four classes, keeps the changes in memory with the overlaps and the refusals, and does not change its Class Quests |
| The Places (the Place picker, the 식당 pins) | Connected | `GET /places`, `GET /places/search?q=` | The mock searches its Places by name and by number |
| Friend Requests | Connected | `GET /friend-requests`; fetched again on `friends-changed` | |
| Quest invitations, requests to join | Connected | `GET /quest-invitations`, `GET /quests/:questId/join-requests` for each Quest the User leads with Approval; fetched again on `quests-changed` | The mock leads no Quest, so it has no request to join |
| Meetups | Connected | `GET /meetups`; fetched again on `meetups-changed` | |
| Friends | Connected | `GET /friends`; fetched again on `friends-changed` | |
| Friends' switches and their end (`setFriendSharing`, `endFriendship`) | Connected | `PUT /friends/:userId/sharing`, `DELETE /friends/:userId` | |
| Friend IDs (`findFriendId`) and the User's own | Connected | `GET /friend-ids/:friendId`; the Lobby's `profile.friendId` | |
| Friend Requests (`sendFriendRequest`, `listFriendRequests`, `acceptFriendRequest`, `declineFriendRequest`, `cancelFriendRequest`) | Connected | `POST /friend-requests`, `GET /friend-requests`, `POST /friend-requests/:id/accept`, `/decline`, `/cancel`; fetched again on `friends-changed` and when the app returns to the front | |
| Invite Links (`createInviteLink`, `getInviteLink`, `acceptInviteLink`) | Connected | `POST /invite-links`, `GET /invite-links/:token`, `POST /invite-links/:token/accept` | App Links need `INVITE_LINK_HOST` in the build |
| Friends' positions | Connected | `GET /positions`, the socket's `position` and `position-removed` | Fetched when the connection opens and when the app returns to the front |
| Friends' status, place, walk and photo (`listFriendStatuses`) | Mock | Nothing | No answer holds them; a Friend without a status is shown by `visible` alone: "공강" or "위치 꺼짐" |
| Quests, Class Quests | Connected | `GET /quests`; fetched again on `quests-changed` and when the app returns to the front | |
| Global Events (`listGlobalEvents`) | Mock | Nothing | No route lists the published events for a User: they reach a User only as the attending Sub Quest of a Quest the User holds, through `matching-requests` by id, and through `GET /quests/recruiting?globalEventId=`. A build that asks the main server still shows the mock's event "AI 커리어 설명회"; its signal `global-events-changed` already fetches the list again |
| Who announced a Global Event (`listGlobalEventAnnouncers`) | Mock | Nothing | No answer holds it |
| The User's own id | Connected | The access token's `sub` | |
| The app's time | Connected | The phone's clock | A Quest row's "23분 후" is worded when the Quests are fetched: on a signal, when the connection opens again and when the app returns to the front |
| Parties | Connected | `GET /parties`, `GET /parties/mine` (404 `NOT_IN_PARTY` is null); fetched again on `party-changed` | The answers' shape replaced the provisional one: `quest` with `id`, and `holdsQuest` and `friends` |
| The number on the bottom navigation's 파티, and 알림 | Composed | The rows of 알림 from `GET /parties` (`holdsQuest`), `GET /friend-requests`, `GET /quest-invitations`, `GET /meetups` and the requests to join; 파티 counts all but the Friend Requests | Fetched again on their signals and when the app returns to the front. A Party's `leader` is optional until P08-16 |
| Walking route | Connected | `GET /walking-route` | Needs the main server's `KAKAO_REST_API_KEY`; without it the main server answers 502 and the app says "길을 찾지 못했어요" |
| What 오늘의 발자국 shows (`getFootprints`) | Mock: five Friends and three faces | Nothing | No spec covers stories |
| The AI input | No data | Nothing | It only says that it is not ready; no spec covers it |
| The Session's end | Connected | The socket's `session-ended`, and a 401 that one renewal cannot mend | `SESSION_REPLACED` shows "다른 기기에서 로그인했어요" |
| Menus (`listMenus`) | Connected | `GET /menus?date=` | The 식당 layer and the menu panel (P15); the mock is a week of lines from the saved menu pages |
| The shuttle's route (`getShuttle`) | Connected | `GET /shuttle` | The shuttle layer (P15); the mock is the main server's seed |
| The shuttle's vehicles (`listShuttleVehicles`) | Connected | `GET /shuttle/vehicles`, the socket's `shuttle-vehicles-updated` | Fetched when the layer is turned on and when the connection opens again while it is on; the mock is three vehicles at stops |
| A Quest's room: the Quest (`getQuest`) | Connected | `GET /quests/:questId`; fetched again on `quests-changed` | 404 `QUEST_NOT_FOUND` closes the room |
| Dropping a Quest (`dropQuest`) | Connected | `DELETE /quests/:questId` | The room's 나가기 |
| Sub Quests (`addSubQuest`, `editSubQuest`, `cancelSubQuest`, `markSubQuestDone`) | Connected | `POST /quests/:questId/sub-quests` with an `Idempotency-Key`, `PUT` and `DELETE /quests/:questId/sub-quests/:subQuestId`, `POST …/:subQuestId/done` | The room's 일정 |
| The Leader's controls (`handOverQuest`, `removeHolder`, `endQuest`) | Connected | `PUT /quests/:questId/leader`, `DELETE /quests/:questId/holders/:userId`, `POST /quests/:questId/end` | |
| Answering requests to join (`acceptJoinRequest`, `declineJoinRequest`) | Connected | `POST /quests/:questId/join-requests/:id/accept`, `/decline` | |
| The Leader's invitations (`listSentInvitations`, `cancelInvitation`) | Connected | `GET /quests/:questId/invitations`, `DELETE /quests/:questId/invitations/:id`; fetched again on `quests-changed` | The room's 초대 중 |
| 활성화 (`openParty`, `joinParty`, `leaveParty`, `setPartySharing`, `removePartyMember`, `endParty`) | Connected | `POST /parties`, `POST /parties/:partyId/join`, `POST /parties/mine/leave`, `PUT /parties/mine/sharing`, `DELETE /parties/mine/members/:userId`, `POST /parties/mine/end` | `거절` is the phone's own: the main server stores no decline |
| The map view's place (`findPlaceAt`) | Connected | `GET /places/at` | The mock answers by the nearest of its Places |
| The signal `matching-changed` | Not used | The socket | It names nothing these screens show |

## 4. Controls that say "준비 중이에요"

The control is there and only shows the toast. The last column is a proposal for where the real thing belongs.

| Where | Control | Opens | Proposed for |
|---|---|---|---|
| Friend panel | A Friend's calendar button, "{이름}님과 파티 만들기" | Proposing a Meetup to the Friend | P14 |
| Above the navigation | 오늘의 발자국 | The story replay | In no Iteration 1 spec |
| Above the navigation | The AI input, which is a button with the input's look and takes no focus and no text, and its send button, read as disabled | The AI chat, with the real text field | In no Iteration 1 spec |
| Bottom navigation | 올리기 | The story sheet | In no Iteration 1 spec |
| 파티 | + 만들기, and the bodies of 찾기, 내 파티 and 초대 | 파티 만들기 and the lists of Quests | P13 |
| 행사 | Its body | The list of Global Events | P13 |
| 내 정보 | 이미지로 불러오기, 빈 시간 말하기 | Reading a timetable from an image or from words | In no Iteration 1 spec |
| A Global Event's card | 같이 갈 사람 찾기 | The party screen | P13 |
| A Friend's card | 파티 만들기 | Making a Party | P14 |

## 5. Development settings

Each is a setting given when the app is started, as an `EXPO_PUBLIC_` variable. None is on in a released app.

| Setting | What it does | Ticket |
|---|---|---|
| The sign-in's ending | The sign-in is the mock, also in a build that could ask Google, and ends in `signed-in`, `cancelled`, `not-snu-account` or `failed` | 02 |
| A slow or failing mock | A named mock answers slowly, with a failure or with nothing | 02 |
| The first state | What the phone keeps is cleared when the app starts: not signed in, no Onboarding | 02 |
| The walk on campus, `EXPO_PUBLIC_CAMPUS_WALK=1` | The phone's position is replaced by a walk along a fixed path on campus | 08 |

## 6. Design: to settle

- [ ] The sign-in button holds the university's emblem, and the design system's brand book says not to reproduce it. Settle which holds
- [ ] The texts of the three legal documents: 이용약관, 개인정보 처리방침, 위치정보 이용약관
- [ ] The consent screen has no frame: its look and words are the app's own. The `Login` frame still asks for consent in its footer, which the app leaves out. Draw the consent screen and settle the sign-in frame's footer
- [ ] The two drawings beside the sign-in button are copied from the wireframes, and where they come from is not recorded. Record it and whether the app may ship them
- [x] A Friend's Avatar on the map: settled as the `Main` frame's teardrop in the status colour, at every zoom
- [x] The route drawn when the screen opens: settled as the way to the User's next Quest by time, where the frame draws it to the fixed "저녁 약속"
- [ ] Neither the frame nor the app has a way to clear a route. Settle whether one is meant
- [ ] The frame goes to its zoom 1.6 on the middle of a route after "길찾기". The app fits both ends between the controls
- [ ] The frame's pins say "AI 커리어", "AI 파티" and "저녁 약속", which are not cut from the titles. The app cuts a title at a word's end within 8 characters, so the Party's pin says "AI 커리어" too
- [ ] The frame's pin of the Global Event counts 3. The app counts the Parties that go to it, from two on: one in the mock, so no count
- [ ] The frame's card of the Party's member has "301동까지 도보 15분". No answer holds a member's distance, and the app leaves it out
- [ ] The frame's card of the dinner writes the place as "학생회관 (63동) 식당". The app shows the Quest's own label, "학생회관 (63동)"
- [ ] "길을 찾지 못했어요", for a way that is not found, and what "길찾기" does without a position have no frame; the spec gives their wording
- [ ] The frame's toast sits over the row of buttons above the navigation
- [x] The frame's friend pill says 12 whatever the list holds: settled as the number of Friends in the list
- [x] Where the credit for the map data goes on the main screen: settled as just above "오늘의 발자국", 16 from the left, and above a card while one is open
- [ ] The frame strokes the text of the lists in white under a glow. The app draws the glow alone, which React Native can; settle whether the lists are readable enough over Kakao's map
- [ ] The frame fades the friend list with a mask, also at the list's end. The app draws each row as strongly as the mask is at the row's middle, and lifts the fade at the list's end
- [ ] The frame lists the Friends in an order of its own. The app keeps the main server's, by name
- [ ] The frame's toast for a class has the professor's name ("자료구조 · 301동 118호 · 이정훈 교수"). No answer holds it, and the app leaves it out
- [ ] The AI input is a button with the look of the empty input until the AI chat is built: it takes no focus and no text, and its send button is read as disabled. Settle whether it should look disabled until then
- [ ] On a screen narrower than the frame's 390, "오늘의 발자국" drops its second line and all faces but one, and under 360 every face, so that "활성 파티" stays whole; the frame lets "활성 파티" shrink. Settle the look at 360 and 320
- [ ] On a low screen the lists show two rows, one or none, so that they end above the zoom control, the map's credit and an open card. No frame shows a low screen
- [ ] Nothing says that the friend list or the Quest list failed to load: the pill has no number and the list no rows. Settle the words and whether a press asks again
- [ ] "활성 파티" says "1명 공유 중" for one other member who shares; the frame says "응답 대기" there
- [ ] No frame shows the main screen off campus, the explanation before the location prompt and its form for a permission that only the phone's settings can allow, the toast while the position is looked for, or the credit for the map data; the spec gives their wording
- [ ] Onboarding's "그 외" admission year stores no year. Decide whether it should ask for one
- [ ] The credit for the map data is text alone. Decide whether a press should open the sources' pages
- [ ] The frame shows a photo for two Friends. The app has no pictures of people, so every Friend shows the name's letters
- [ ] The frame writes a Friend's year after the department ("컴퓨터공학부 22"). No answer holds a Friend's year, so the app shows the department alone
- [ ] The loading screen's two photos are copied from the wireframes. Record where they come from and whether the app may ship them
- [ ] The loading screen leaves out the frame's band of light and uses weight 700 for the wordmark, where the frame has 800. Settle whether either matters
- [ ] The frame's numbers for the one Party differ: "4/6명" on the card and "3명 공유 중" on the button. The mock has four members of six, three of them shared with the User. The Quest list says "공개 파티 · 활성화 중" for the Party the User is in, and "4명" only for one the User is not in
- [ ] The frame calls a dinner with one Friend a "비공개 파티". In the glossary it is a Shared Quest from a Meetup and no Party, and a User is in one Party at a time. The app uses the frame's words; settle the word
- [ ] A Party's card in the frame has the line "#AI커리어 관심사가 겹쳐요". No answer holds it, and the app leaves it out

## 7. For people

- [ ] `KAKAO_NATIVE_APP_KEY` filled in for the app
- [x] Google Cloud holds an Android sign-in client for `com.bonnieandclaude.snunow` and the development SHA-1
- [ ] `mobile/.env` filled in from `mobile/.env.example`: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, the ID of the main server's client, which must be of type "Web application"; for the iOS build also `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` and `GOOGLE_IOS_URL_SCHEME`
- [ ] A sign-in with Google tried in a development build on Android (`mobile/README.md`, "Google sign-in"): an SNU account, an account outside SNU and a closed sheet
- [x] Before the last ticket: a main server that a phone can reach: the emulator reaches one on the same computer as `10.0.2.2` (ticket 12)
- [ ] A main server that the shared phone can reach: a deployed one, for P20
- [ ] Google Cloud's Android client holds the SHA-1 of `mobile/android/app/debug.keystore`, `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`, and the SNU account used to test is a test User of the consent screen (ticket 12's Comments)
- [ ] A sign-in with an SNU account on the emulator against the main server reaches the main screen, with a screenshot for ticket 12's pull request
- [ ] For the iOS ticket: the iOS app registered at Kakao
- [ ] Update P06's row in the schedule sheet
