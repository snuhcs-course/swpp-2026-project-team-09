# mobile

The SNU Now mobile app, built with Expo SDK 57 and Expo Router.

## Run it

You need Node.js 24. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root. The commands below
use pnpm 12.6.0, the version declared in `package.json`. If `pnpm -v` prints another version, type `npx pnpm@12.6.0`
wherever this file says `pnpm`: npm fetches it into its cache without a global install. In `mobile/`:

```bash
pnpm install
pnpm start
```

The development server keeps running in the same terminal. Press `a` there to open the app on a running Android
emulator or `i` on the iOS simulator. The first time, Expo installs Expo Go on it. On a phone, scan the QR code with
Expo Go.

Add packages with `pnpm expo install <package>`, not `pnpm add`. It picks the version that matches the Expo SDK.

### Development settings

A setting is an `EXPO_PUBLIC_` variable given when the app is started, for example
`EXPO_PUBLIC_MOCK_FAIL=listFriends pnpm start`. A released app ignores all of them.

| Variable                     | Value                                                 | What it does                                        |
| ---------------------------- | ----------------------------------------------------- | --------------------------------------------------- |
| `EXPO_PUBLIC_SIGN_IN_ENDING` | `signed-in`, `cancelled`, `not-snu-account`, `failed` | The sign-in is the mock and ends in this            |
| `EXPO_PUBLIC_MOCK_SLOW`      | operations, separated by commas                       | These mocks answer after three seconds              |
| `EXPO_PUBLIC_MOCK_FAIL`      | operations, separated by commas                       | These mocks answer with a failure                   |
| `EXPO_PUBLIC_MOCK_EMPTY`     | operations, separated by commas                       | These mocks answer with nothing                     |
| `EXPO_PUBLIC_FIRST_STATE`    | `1`                                                   | What the phone keeps is cleared when the app starts |

An operation is named as in the table under "Data" below, such as `listFriends`. `completeOnboarding` and `enterLobby`
have no empty answer, so `EXPO_PUBLIC_MOCK_EMPTY` leaves them as they are.

### Google sign-in

The sign-in module (`src/auth/sign-in.ts`) asks Google in a build that holds Google's sign-in module, and is a mock
everywhere else:

| Where the app runs                               | The sign-in                                            |
| ------------------------------------------------ | ------------------------------------------------------ |
| A development build on Android with the settings | Google's account sheet                                 |
| Expo Go, the web, the tests                      | The mock: it signs in after 0.3 seconds, with no sheet |
| Any of them with `EXPO_PUBLIC_SIGN_IN_ENDING`    | The mock, with the ending that the setting names       |

With Google, an account outside SNU is refused, a closed sheet returns to the default state, and anything else is a
failure. The main server is not asked yet. The app itself reads the ID token and takes an account for an SNU one when
its hosted domain, the `hd` claim, is `snu.ac.kr` (`src/auth/id-token.ts`). It does not check the token's signature, so
this decides only what the screen says. The main server's check takes its place with ticket 12 of P06.

The settings are a person's. Copy `.env.example` to `.env`, which is not committed, and fill in:

| Variable                           | Value                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The ID of the main server's Google client, of type "Web application"              |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | The ID of the Google client of type "iOS". Only the iOS build needs it            |
| `GOOGLE_IOS_URL_SCHEME`            | The iOS client's ID reversed (`com.googleusercontent.apps.…`). Only the iOS build |

The IDs are in the Google Cloud project's list of clients. The Web application client's ID is also the main server's
`GOOGLE_APP_CLIENT_ID`. Without the web client's ID the sign-in stays the mock in every build.

A development build on Android, with an emulator running or a phone attached:

```bash
npx expo run:android
```

It generates `android/`, which is not committed, builds the app with the native modules and installs it. The emulator
or phone needs Google Play and a Google account. Google answers only an app that it knows: the Google Cloud project
must hold a client of type "Android" with the package name `com.bonnieandclaude.snunow` and the SHA-1 of the key that
signed the build. A development build is signed with the debug key that every checkout shares; its SHA-1 and the ways
to read a key's SHA-1 are in `.scratch/research/external-sources.md`, sections 7.2 and 8. A build that Google does not
know ends in the failure state, or closes the sheet as if the User had.

`src/auth/google.ts` is the one file that touches the library, `react-native-nitro-google-signin`, and loads it only
in a build that holds it. On the web `google.web.ts` takes its place. The iOS build also needs the library's config
plugin, which `app.config.ts` adds when `GOOGLE_IOS_URL_SCHEME` is set.

## Checks

Each command fails when it finds a problem. Run all four before opening a pull request.

| Command             | Checks                                       |
| ------------------- | -------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules                 |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it) |
| `pnpm typecheck`    | TypeScript in strict mode                    |
| `pnpm test`         | Jest tests in `__tests__/`                   |

A test may take up to 60 seconds: the first test of a file that touches a text input or an animation loads those
parts of React Native, which is slow on a machine that has not run the tests before, as in CI.

## Folder layout

```text
src/app/            screens; every file is a route and _layout.tsx sets the navigation around them
src/design-system/  the tokens and the shared components
src/catalogue/      the sections of the design system's catalogue screen
src/hooks/          hooks shared by components and screens
src/api/            the API client, the main server's answers as types, and the mocks that answer for now
src/auth/           sign-in and sign-out
src/features/       one folder per feature: its adapter and the hooks a screen asks for data with
src/map/            the one map component, its interface and the pictures of its markers
src/storage/        what the phone keeps between two starts of the app
src/session/        where the User is in the flow between the screens, and the work of the start
src/screens/        the screens that the routes show
__tests__/          Jest tests
assets/             app icons, the splash image, the fonts, the loading screen's photos and the sign-in screen's pictures
```

Keep code that is not a screen, such as components and hooks, in `src/` outside `src/app/`.

## Screens and the flow between them

The app starts on the loading screen (`/`), once. While it shows, the app reads what the phone keeps and, for a User
who signed in, agreed to the legal documents and finished Onboarding, fetches the Lobby. Then it shows where the User belongs:

| The User                                                          | Sees        | Address       |
| ----------------------------------------------------------------- | ----------- | ------------- |
| is not signed in                                                  | Sign-in     | `/sign-in`    |
| signed in and has not agreed to the legal documents on this phone | Consent     | `/consent`    |
| agreed and has not finished Onboarding                            | Onboarding  | `/onboarding` |
| agreed and finished Onboarding                                    | Main screen | `/main`       |

`src/session/session.tsx` holds where the User is while the app runs. A screen that belongs to one of these places
starts with `useOwnPlace(...)`, which leads a User who does not belong there to where they do. A sign-in calls
`enter`, a saved Onboarding `finishOnboarding`, a sign-out `leave`, and the screens follow.

A screen's file in `src/app/` only says which place it is; the screen itself is in `src/screens/`.

The sign-in screen has one button. A press asks the sign-in module (`src/auth/sign-in.ts`), and the screen shows the
check, then follows the ending: `enter` for a User who signed in, the default state after a closed sheet, and a
refused state for an account outside SNU or any other failure. A press in a refused state tries again.

The consent screen asks once on a phone: a signed-in User who has not agreed there sees it after the sign-in, or after
the loading screen, and the Session remembers where they go next. "동의하고 시작" stores the consent and calls `agree`;
"로그아웃" signs out. A sign-out leaves the consent on the phone.

The three legal documents open from the consent screen on a screen of their own, `/legal/terms`, `/legal/privacy` and
`/legal/location` (`src/app/legal/[document].tsx`). It belongs to no place of the flow, so anyone may open it, and it
closes back to the screen it was opened from. The documents' texts are placeholders.

## Data

A screen holds no data of its own and never reads an answer of the main server. It calls a hook of a feature, which
tells it whether the data is loading, failed or there (`ScreenData` in `src/api/screen-data.ts`):

```tsx
const friends = useFriends();
if (friends.isPending) {
  /* loading */
}
if (friends.isError) {
  /* failed: friends.refetch() asks the failed operations again */
}
friends.data; // FriendView[], what the screen shows
```

TanStack Query keeps one cache entry per operation, each under its own key (`src/api/queries.ts`), and a hook combines
the entries it needs. So an operation that two screens need is asked once, and one entry can be asked again alone.

When an operation fails:

- `listFriendStatuses` and `listGlobalEventAnnouncers`, the app's own, never fail a screen: it shows what it has
  without them.
- The friend list and the Quest list have `isError` and no `data`.
- The map has `isError` and keeps in `data` the cards that are still right: without the Global Events, the Friends'
  cards still show.

The walking route is asked when the User asks, not as the User's position moves:

```tsx
const { route, isPending, isError, ask, clear } = useWalkingRoute();
ask(myPosition, card.position); // on "길찾기": the start is where the User is now
clear(); // when the route is dismissed or the screen is left
```

Behind a hook are three layers:

- **The API client** (`src/api/client.ts`): one operation per question to the main server. `src/api/types.ts` holds
  the answers' shapes. A shape marked "provisional" comes from an open pull request of the main server, and one marked
  "the app's own" is defined nowhere else yet.
- **An adapter** per feature (`src/features/<feature>/adapter.ts`): turns answers into what the screens use, such as
  `FriendView`, `QuestRowView` and `CardView`.
- **The mocks** (`src/api/mock/`): for now every operation is answered inside the app, in the main server's shape,
  with what the `Main` wireframe shows. A mock answers after 0.3 seconds. The sign-in is the one exception: see "Google
  sign-in" above.

| Operation                                   | Answers                                            | The main server's route                       |
| ------------------------------------------- | -------------------------------------------------- | --------------------------------------------- |
| `signIn`, `signOut` (`src/auth/sign-in.ts`) | Whether the User signed in, and Onboarding's state | `POST /auth/google`, `/auth/sign-out`         |
| `completeOnboarding`                        | Nothing                                            | `POST /users/me/onboarding`                   |
| `enterLobby`                                | The User's profile                                 | `POST /lobby`                                 |
| `listFriends`                               | The Friends                                        | `GET /friends` (provisional)                  |
| `listPositions`                             | The positions the User may see                     | `GET /positions` (provisional)                |
| `listFriendStatuses`                        | Each Friend's status, place and photo              | None: the app's own                           |
| `listQuests`                                | The User's Quests and today's Class Quests         | `GET /quests` (provisional)                   |
| `listGlobalEvents`                          | The published Global Events                        | None yet: the app's own                       |
| `listGlobalEventAnnouncers`                 | Who announced each Global Event                    | None: the app's own                           |
| `listParties`, `getMyParty`                 | The Parties, and the one the User is in            | `GET /parties`, `/parties/mine` (provisional) |
| `findWalkingRoute`                          | The way on foot between two points                 | `GET /walking-route`                          |

While the answers are mocks, the app's time is the moment the wireframe shows, 1 October 2026 at 13:37
(`src/clock.ts`), so that the screens read as the wireframe on any day.

The phone keeps that the User signed in, that the User agreed to the legal documents, what the sign-in suggested for
Onboarding, whether Onboarding is finished and its answers (`src/storage/kept.ts`). `openKept()` is the read for the
start of the app: it is the one that honours `EXPO_PUBLIC_FIRST_STATE`.

### From a mock to the main server

To connect one operation:

1. Write the operation against the main server and put it in place of the mock's in `src/api/client.ts`. A refusal is
   thrown as an `ApiError` with the status and the main server's code.
2. If the answer's shape changed, change it in `src/api/types.ts` and follow the type errors into the adapter.
3. Keep the mock: a test of a screen puts it back with `jest.mock('@/api/client', …)`, so that no test asks the main
   server.

No screen changes. When every operation of a feature is connected, remove its row from the mock list of
`.scratch/iteration-1/P06-login-map-timetable/todo.md`.

## Design system

The app's look is the team's design system "SNU Now", the one the wireframes are drawn with, ported to React Native in
`src/design-system/`. A screen imports from `@/design-system` and writes no look of its own:

- **Tokens** (`tokens.ts`): `color`, `space`, `radius`, `size`, `shadow`, and the eight text styles in `text`, under the
  design system's names. A style spreads a text style and adds a colour: `{ ...text.body, color: color.inkMuted }`.
- **Font**: Pretendard, one file per weight in `assets/fonts/`, loaded by the root layout before any screen appears.
  A style sets `fontFamily` from `font` and never `fontWeight`.
- **Components**: Icon, Button, Chip, Badge, Avatar, MapPin, EventCard, TextField, ChatInput and BottomNav, with the
  names and properties of the design system's types. A component of the design system that no screen uses yet is
  ported by the task that needs it. Where the web's differ from React Native's, the app's follow React Native: a press
  is `onPress`, and an image is a `source`. The design system's sizes do not count a border, so a size here adds it:
  a pin's head is 36 and its border of 2 on each side.
  Inside the design system the names are the design system's, also where the glossary prefers another word: its
  `Avatar` is a person's picture anywhere, its event kind is `official`, and a card's place is its `venue`.
- **Dialog**: the design system has none and the frames ask questions with two answers. `Dialog` shows a title, a
  sentence and one or two Buttons over the screen.
- **Toast**: the design system has none and the wireframes use one. `useToast()` gives the call that shows a
  sentence for a moment, and `useNotReadyToast()` the call for a control whose feature belongs to another task: it
  says "준비 중이에요". A toast sits just above the phone's own bar; a screen with a bottom navigation
  calls `useToastAbove(height)` so that it sits above that too.
- The app is light only. The design system has no dark theme, so `app.json` says `light`.

A repeated element that the design system lacks becomes a shared component here, not a copy in each screen.

`MapDot` is a marker from far away, which the frames draw and the design system does not name: the kind's colour in a
white border.

To see every component in every variant, start the app and press "디자인 시스템 보기" on a screen that is still a
placeholder, or open
`/catalogue`. The catalogue is for developers: a released app does not show it. Compare it with the design system's
own previews when a component changes: `pnpm web` serves the catalogue to a browser, where a phone-sized window
shows it as the previews do.

## Map

A screen shows a map with one component, `Map` from `@/map`, and nothing else. No screen calls a map SDK or the native
module: what the component's interface (`src/map/types.ts`) cannot say, a screen cannot ask of any map. The rules
below hold for every implementation, and `src/map/types.ts` states them for the native sides.

```tsx
const map = useRef<MapHandle>(null);
const [eventPin, myAvatar] = useMarkerImages([{ kind: 'official', form: 'pin' }, { kind: 'me' }]);

<Map
  bounds={CAMPUS_BOUNDS} // the visible area never leaves it
  minZoom={MIN_ZOOM}
  maxZoom={MAX_ZOOM}
  markers={[{ id: 'event:e1', name: 'AI 커리어 채용설명회', position, image: eventPin, text: 'AI 커리어' }]}
  avatars={[{ id: 'me', name: '내 위치', position: mine, image: myAvatar, glideMs: 5000, order: 1 }]}
  route={line} // LatLng[], or null for none
  onPress={(id) => {}} // a marker's or an Avatar's id
  onCameraIdle={({ centre, zoom }) => {}} // once when the map is ready, then each time the camera rests elsewhere
  ref={map}
/>;

map.current?.moveCamera({ centre, zoom, animated: true }); // each of the three may be left out
map.current?.fitTo([from, to], { padding: 48, animated: true }); // the closest view that shows all the points
```

- **Positions** are a latitude and a longitude in degrees. A **zoom** is the Web Mercator zoom level at the camera's
  centre, where the world is 256 × 2^zoom points wide. It may be a fraction. A native side converts it to its SDK's
  own scale.
- **The camera stays inside `bounds`**: the visible area never leaves the rectangle. So the lowest zoom allowed is
  the larger of `minZoom` and the zoom at which the view just fits inside the rectangle, which depends on the
  view's size, and the centre is kept far enough from the edges. The highest zoom is `maxZoom`. The map opens on
  the middle of the rectangle at the lowest zoom allowed. Whatever `moveCamera` or `fitTo` asks is first brought
  inside these rules.
- **`onCameraIdle`** is sent once when the map is ready, and each time the camera comes to rest somewhere else:
  after a User's pan or zoom ends, and after `moveCamera` or `fitTo`. A call that changes nothing sends nothing.
- **Markers** are what the list says: one that is new is added, one whose `id` stays is changed, one that is gone is
  removed. `name` is what a screen reader says; `text` is drawn under the image by the map, in the map's own text.
- **Avatars** are markers that glide. The map keeps each Avatar's last target and starts a glide only when
  `position` differs from it: the same position in a new list is no move. An Avatar that first appears is placed
  without a glide. A new position is reached over `glideMs`, and one that comes during a glide starts from where the
  Avatar is shown. A new `image` or `text` alone does not restart a glide. With a `glideMs` of 0 the Avatar is
  placed at once.
- **What is on top**: every Avatar is above every marker, and the route is under both. Among markers, and among
  Avatars, the higher `order` is on top; without one it is 0, and of two that are equal the later in the list is on
  top. The screen ranks what matters, such as the User's own Avatar or a selected marker.
- **The route** is one line through the points given, or none.
- `CAMPUS_BOUNDS`, the campus rectangle, and the limits `MIN_ZOOM` and `MAX_ZOOM` are constants in
  `src/map/campus.ts`. The rectangle is a little wider than the Campus Boundary, which stays the main server's.
- The credit "© OpenStreetMap · 국토지리정보원" is at the bottom left of every map, inside the component.

### Which map is shown

The component chooses while the app runs (`src/map/map.tsx`), by whether the build holds the native map module
`SnuNowMap`:

- **With the module**, it shows the native map, `src/map/native-map.tsx`. That file is loaded only then, and it is
  the only file that may name the native view. No build holds the module yet: its Android side is ticket 07's and
  its iOS side ticket 11's, and until then the file is a marked seam.
- **Without it**, which Expo Go, the web and the tests are, it shows the plain ground (`src/map/plain-map.tsx`) with
  the words "지도는 Android 빌드에서 보입니다". It is no stand-in map: it has no tiles and draws no campus, and a User
  cannot pan it. It follows the camera's rules (`src/map/projection.ts`) and places what it was asked to show by
  position: each marker and Avatar as the design system's own view with its `text` under it, and the route as
  straight strokes. So `moveCamera`, `fitTo` and a moved Avatar are seen, and a screen can be laid out around it.
  An Avatar glides there too, unless the phone asks for less motion.
- On the plain ground each marker and Avatar is a button under its `name`, with the look's name as its `testID`,
  and the route is read as "경로가 그려져 있습니다". One outside the view is not drawn and stays such a button. So a
  screen reader, and a test, reach everything the map was asked to show. In a test the ground is as large as the
  window until it is laid out.

### Marker images

A native map draws images, not React views. An image is a picture of the design system's own marker view, made once
for each look and kept for as long as the app runs:

- A look (`MarkerLook` in `src/map/marker-looks.tsx`) is the User's own Avatar (`MapPin` of the kind `me`), a Friend's
  Avatar (`Avatar` with the friend ring: the letters or the photo, and the status colour) or a marker of each kind
  of the design system. A Friend and a marker have two forms: a `dot` from far away, a `pin` from close. No look has
  a label: a name is the map's own text.
- `useMarkerImages(looks)` answers one `MarkerImage` for each look, in the order asked. An image names its look at
  once (`look`, such as `official:pin`, and `view`, the look itself) and gains its picture (`uri`, with `width`,
  `height` and the `anchor` that stands on the position) when it is made. A native side draws a marker once its
  picture is there, and reads the picture again whenever the `uri` under a look's name changes.
- Pictures are made only in a build that holds the native map module. There the look's view is drawn on a stage
  outside the screen, `MarkerImageStage`, which the app shows once around every screen, with clear room for its ring
  and shadow, and `react-native-view-shot` captures it as a PNG file in the phone's own pixels.
- A capture that gives no picture is tried again, four times in all, after 0.5, 1 and 2 seconds. A look whose tries
  are used up is tried again when a screen that asks for it is next shown.
- A look with a photo is captured when the photo is shown. After three seconds without it the picture is made with
  the letters, and made again under the same look when the photo comes.
- Without the module, as in Expo Go, on the web and in a test, no picture is made and `uri` stays null: the plain
  ground draws the view itself.

Left to the Android module (ticket 07): whether a native map draws these pictures as the design system does, at the
view's size and with its shadow, and when a picture that no screen uses any more is released.

### Trying it

`/map-check`, also behind "지도 보기" on a screen that is still a placeholder, shows the component with sample markers,
Avatars and buttons that move the User's Avatar, draw and clear the route line, fit the camera to the route, zoom in
and show the whole campus. It says what was pressed and where the camera stopped. It is for developers: a released
app does not show it. The native modules are checked on it.
