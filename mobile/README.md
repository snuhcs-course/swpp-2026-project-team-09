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
| `EXPO_PUBLIC_CAMPUS_WALK`    | `1`                                                   | The User's position is a walk on campus (see below) |

An operation is named as in the table under "Data" below, such as `listFriends`. `completeOnboarding` and `enterLobby`
have no empty answer, so `EXPO_PUBLIC_MOCK_EMPTY` leaves them as they are.

With `EXPO_PUBLIC_CAMPUS_WALK=1` the phone is not asked for its position or for the permission. The User's position
is a fixed round on campus (`src/position/walk.ts`) that starts where the `Main` wireframe draws the User and takes a
step every five seconds, so the User's Avatar is on the map and glides, also on the web and far from the campus.
The walk has no explanation and no permission to try: for those, start without it.

Nothing on the main screen signs a User out: sign-out is on 내 정보, which another task builds. To see the sign-in
screen again, start the app with `EXPO_PUBLIC_FIRST_STATE=1`.

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
src/position/       the User's own position: the phone's, or the development walk
src/storage/        what the phone keeps between two starts of the app
src/session/        where the User is in the flow between the screens, and the work of the start
src/screens/        the screens that the routes show; a screen of several files has a folder
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

The Onboarding screen (`src/screens/onboarding/`) starts from what the sign-in suggested: the name and the department,
each with the badge "Google 계정에서 가져옴" until the User changes that field. The department is a name from the
lists in `departments.ts`, found by a search. "저장하고 시작하기" is enabled once a name and a department are there: it
calls `completeOnboarding` and then `finishOnboarding`, and a save that failed says so in a toast and leaves the form.
"로그아웃" signs out. Nothing on the screen leads back.

The main screen (`src/screens/main/`) is the `Main` wireframe: the map on the whole campus with the people and places
on it, the zoom control or an open card over it, and the bottom navigation under it, above the phone's own bar.

- `useMainMap()` owns the map's handle and follows its camera: `camera`, `fitZoom`, the `detail` the zoom asks for
  (`overview`, `pins` or `names`), and the moves `zoomBy(steps)`, `goTo(position, level, orCloser)` and
  `showCampus()`. Every part of the screen that moves the map or draws by zoom takes it. A move asked before the map
  is ready is kept and carried out at the camera's first rest; of several, the last (`use-camera-moves.ts`).
- The screen stands in a `PositionProvider`, so every part of it reads the same position with `usePosition()`.
- `useMe(map)` gives the User's Avatar for the map, the position while it is on campus, "내 위치로 이동", the
  explanation before the location prompt, and `sayWhyNotHere()` for a part that needs a position and has none.
- What floats over the map is a child of `OverMap` in `main-screen.tsx` and places itself by the offsets of
  `layout.ts`, which are counted from the navigation's top edge: the zoom control's bottom is 136 above it, a
  toast's bottom 78 and a card's bottom 72.
- **Markers.** `useMapCards()` gives one `CardView` for each thing on the map, and `useThings(cards, detail,
selectedId)` turns them into the `markers` and `avatars` of `<Map>`, each under its card's id. A Friend who can be
  seen and a member of the User's Party who is no Friend are the wireframe's teardrop at every zoom, in the status's
  colour or the Party's: small while the whole campus is in view, at full size from the `pins` level, and with the
  given name under it from the `names` level. A Friend whose position is not known has no marker. The Global Event,
  the User's Party and a Shared Quest are dots while the whole campus is in view, pins from the `pins` level and pins
  with a short name from the `names` level. A Party's pin counts its members; a Global Event's counts the Parties
  that go to it when they are more than one. A short name is the title cut at a word's end within 8 characters. A
  marker is read as the wireframe reads it: "김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요", "공식 행사 · AI 커리어
  설명회". The selected marker has the selected look and is drawn above the others, the User's own Avatar included.
- **Cards.** `useSelection(cards)` holds what is selected: `selected` (the open card), `open`, `select(id)` and
  `close()`. A press on a marker selects it and opens its card (`card.tsx`) in place of the one that was open; the
  card's X and Android's back button close it; a press beside the markers leaves it open. The card shows the leading
  mark (a person's Avatar, or the place's icon on its kind's colour), the sub-label, the title, the lines and its
  button. "가까이 보기" is offered below the `names` level and brings the camera to the `close` level, keeping the
  card. "같이 갈 사람 찾기", "참여하기", "파티 만들기" and "파티 열기" say "준비 중이에요". While a card is open the zoom
  control is not shown; a part that a card hides asks `selection.open`. A row of a list opens a card with
  `selection.select(cardId.friend(id))` (`cardId` of `src/features/map/adapter.ts`) and moves the map with
  `map.goTo`.
- **The route.** `useRoute(map, me)` gives the one line for `<Map>` and `routeTo(place)`. When the screen opens, the
  way to the User's next Quest by time (`useNextQuest()`) is drawn, once, as soon as the User has a position on
  campus, without a toast and without moving the map; without a position none is drawn. "길찾기", on a Shared
  Quest's card, closes the card, asks the way from the User's position, fits both ends into what the screen's
  controls leave of the map (`ROUTE_PADDING` in `layout.ts`) and says "…까지 길 안내"; it replaces the line that is
  drawn. Without a position to start from it draws nothing and keeps the card: without the permission it shows the
  explanation; off campus it brings the map to the place and says "캠퍼스 밖에 있어요"; before the first position
  it says "위치를 찾는 중이에요". A way that is not found says "길을 찾지 못했어요". Leaving the screen drops the line.
  The line is the wireframe's: dots in the Quest's colour, 3 wide, 2 long and 6 apart (`ROUTE_STYLE`).
- The zoom in and zoom out buttons change the zoom by a factor 1.5 around the middle of the view. "내 위치로 이동"
  brings the map to the User at the larger of the current zoom and the `close` level; off campus it says "캠퍼스 밖에
  있어요" and shows the whole campus; without the permission it shows the explanation; with the permission and no
  position yet it says "위치를 찾는 중이에요" and starts the phone's watch again if that had failed.
- The explanation, "내 위치를 지도에 표시할까요?", appears by itself once on a phone: the first time the screen opens
  to a User whom the system never asked. "계속" leads to the system's prompt, "나중에" closes it, the phone keeps
  that it was answered, and from then on it comes only on "내 위치로 이동".
- When the system no longer prompts (the permission is `blocked`), the explanation says that the location is turned
  off for the app in the phone's settings, and its button is "설정 열기", which opens them. The permission is read
  again when the app returns to the front.
- The User's Avatar is shown while the position is inside the campus rectangle, at three quarters of its size while
  the whole campus is in view, and glides to each new position over the time that position took to come (`stepMs`).
  Both of its looks, `me` and `me:small`, are asked for when the screen opens.
- The bottom navigation's 파티, 올리기, 행사 and 내 정보 say "준비 중이에요". The number on 파티 is `usePartyBadge()`.
  The bar has no line on top but the frame's shadow (`shadow.nav`), and under its items 16 or the phone's own inset,
  whichever is larger (`navPaddingBottom` in `layout.ts`).
- The map ends at the navigation's top, so that its credit stays uncovered.

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

- `listFriendStatuses`, `listGlobalEventAnnouncers` and `getPartyNews`, the app's own, never fail a screen: it shows
  what it has without them.
- The friend list and the Quest list have `isError` and no `data`.
- The map has `isError` and keeps in `data` the cards that are still right: without the Global Events, the Friends'
  cards still show.

The walking route is asked when the User asks, not as the User's position moves:

```tsx
const { route, isPending, isError, ask, clear } = useWalkingRoute();
ask(myPosition, card.position); // on "길찾기": the start is where the User is now
clear(); // when the route is dismissed or the screen is left
```

A `CardView` holds what its card and its marker show: the card's words and buttons, `mark` (a person with the status,
or a place's kind), `marker` (what a screen reader says, the short name under it and the count on its pin) and the
position. Its `kind` is `global-event`, `party`, `shared-quest`, `friend` or `party-member`.

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
| `getPartyNews`                              | How many things wait for the User in Parties       | None: the app's own                           |
| `findWalkingRoute`                          | The way on foot between two points                 | `GET /walking-route`                          |

While the answers are mocks, the app's time is the moment the wireframe shows, 1 October 2026 at 13:37
(`src/clock.ts`), so that the screens read as the wireframe on any day.

The phone keeps that the User signed in, that the User agreed to the legal documents, what the sign-in suggested for
Onboarding, whether Onboarding is finished and its answers, and that the User answered the explanation before the
location prompt (`locationExplained`) (`src/storage/kept.ts`). A value stored by an older version, without a newer
field, reads as "not yet" for that field. `openKept()` is the read for the start of the app: it is the one that
honours `EXPO_PUBLIC_FIRST_STATE`, which clears all of it.

### The User's position

The User's own position is not a server's answer. A screen that shows it stands in a `PositionProvider` of
`@/position`, and every part of that screen reads it with one hook, `usePosition()`. The provider holds one
permission and one watch of the phone, however many parts read it; outside a provider the hook throws.

```tsx
<PositionProvider>…the screen…</PositionProvider>;

const { permission, position, stepMs, ask, retry } = usePosition();
permission; // 'checking' until the phone has said, then 'unasked', 'granted', 'refused' or 'blocked'
position; // LatLng, or null without the permission and until the first position comes
stepMs; // how long this position took to come after the one before, between 1000 and 5000: an Avatar's glide
await ask(); // shows the system's prompt and follows its answer
retry(); // starts the phone's watch again if it could not start
openLocationSettings(); // of `@/position`: the phone's settings of the app, for a `blocked` permission
```

- It reads the phone through `expo-location`, which `src/position/phone.ts` alone names: the permission for the time
  the app is in use, and a new position about every five seconds (`POSITION_EVERY_MS`) while a screen that asks is
  shown. On the web that is the browser's geolocation. Where the phone or the browser cannot answer, the permission
  counts as never asked or refused and the position stays null: nothing throws.
- `refused` is a refusal after which the system still prompts; `blocked` is one after which it does not
  (`canAskAgain` is false), so that only the phone's settings can allow the location.
- The first position is the last one the phone knows, where it knows one, until it measures one.
- A watch that cannot start, as with location services turned off, is started again when the app returns to the
  front and on `retry()`. The permission is read again when the app returns to the front.
- A phone may tell positions more often than every five seconds, as iOS does about every second. `stepMs` is the
  time since the position before, held between one and five seconds; the walk's is five seconds.
- With `EXPO_PUBLIC_CAMPUS_WALK=1` the hook answers the development walk instead and never asks the phone.
- The words of the system's prompt on iOS are in `app.json`, with the library's config plugin. The app asks for no
  position in the background.
- The position is sent nowhere. Sending it is built with the Master Switch, by another task.

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
  names and properties of the design system's types. `BottomNav` has two additions that the `Main` wireframe draws:
  an item with `action` is the one action in the middle, its icon of 22 in white on a round fill of 44 in `snuBlue`
  with the shadow `shadow.navAction`, inside the bar, its label not shown and kept as what a screen reader says; and
  `line={false}` leaves out the line on top, for a screen that draws its own edge above the bar. A component of the design system that no screen uses yet is
  ported by the task that needs it. Where the web's differ from React Native's, the app's follow React Native: a press
  is `onPress`, and an image is a `source`. The design system's sizes do not count a border, so a size here adds it:
  a pin's head is 36 and its border of 2 on each side.
  Inside the design system the names are the design system's, also where the glossary prefers another word: its
  `Avatar` is a person's picture anywhere, its event kind is `official`, and a card's place is its `venue`.
- **Dialog**: the design system has none and the frames ask questions with two answers. `Dialog` shows a title, a
  sentence and one or two Buttons over the screen.
- **Toast**: the design system has none and the wireframes use one. It is the `Main` wireframe's: a dark bar from 16
  to 16 from the sides with a check mark before its words, and no shadow. `useToast()` gives the call that shows a sentence for 2.4
  seconds, or for the time given as its second argument (`showToast(words, 2000)`), and `useNotReadyToast()` the call
  for a control whose feature belongs to another task: it says "준비 중이에요". A toast sits just above the phone's own
  bar; a screen with something fixed to its bottom calls `useToastAbove(height)` so that it sits above that too, as
  the main screen's navigation does.
- The app is light only. The design system has no dark theme, so `app.json` says `light`.

A repeated element that the design system lacks becomes a shared component here, not a copy in each screen.

`MapDot` is a marker from far away, which the frames draw and the design system does not name: the kind's colour in a
white border. A selected one is 4 larger, inside a ring of the key colour.

`MapPerson` is a person on the map, which the `Main` wireframe draws and the design system does not name: a teardrop
filled with a colour of `presence`, with the person's small Avatar in it, 24 wide in its `small` form and 36
otherwise. Its box ends at its tip. A selected one is 1.18 times as large, inside a white ring and a ring of the key
colour. `presence` names the colours of what a person is doing: `free`, `class`, `moving` and `off`, the statuses,
which an Avatar's dot uses too, and `member`, a member of the User's Party who is no Friend.

`MapPin` of the kind `me` has a `small` form, three quarters of its size, which the `Main` wireframe draws while the
whole campus is in view. The icons `chevronDown` and `minus` are the wireframes' and not the design system's.

To see every component in every variant, open `/catalogue`: in the browser's address bar, with the link
`snunow://catalogue` in a development build (on Android,
`adb shell am start -a android.intent.action.VIEW -d snunow://catalogue`), or with the link
`exp://<the development server's address>/--/catalogue` in Expo Go. No screen links to it. The catalogue is for
developers: a released app does not show it. Compare it with the design system's
own previews when a component changes: `pnpm web` serves the catalogue to a browser, where a phone-sized window
shows it as the previews do. `MapDot` and `MapPerson` are in its `MapPin` section.

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
  markers={[{ id: 'event:e1', name: '공식 행사 · AI 커리어 설명회', position, image: eventPin, text: 'AI 커리어' }]}
  avatars={[{ id: 'me', name: '내 위치', position: mine, image: myAvatar, glideMs: 5000, order: 1 }]}
  route={line} // LatLng[], or null for none
  routeStyle={{ color: color.quest, width: 3, dash: [2, 6] }} // left out, the map's own plain line
  onPress={(id) => {}} // a marker's or an Avatar's id
  onCameraIdle={({ centre, zoom }) => {}} // once when the map is ready, then each time the camera rests elsewhere
  onFitZoom={(zoom) => {}} // the zoom at which the whole campus is in view, before the first onCameraIdle
  ref={map}
/>;

map.current?.moveCamera({ centre, zoom, animated: true }); // each of the three may be left out
map.current?.fitTo([from, to], { padding: 48, animated: true }); // the closest view that shows all the points
map.current?.fitTo([from, to], { padding: { top: 288, right: 78, bottom: 142, left: 24 } }); // room for controls
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
- **`onFitZoom`** gives the fit zoom: the lowest zoom allowed, at which the map opens. It is sent once when the map
  is ready, before the first `onCameraIdle`, and again whenever the view's size changes it.
- **Zoom levels** are counted from the fit zoom, because it differs from phone to phone. `ZOOM_OFFSET` in
  `src/map/campus.ts` names them once, from the `Main` wireframe's zoom factor z as log2(z): `pins` (z 1.6, +0.68),
  from which a place is a pin and not a dot; `names` (z 2.4, +1.26), from which a name is under it; `close` (z 2.6,
  +1.38), where "가까이 보기", a Friend's row and "내 위치로 이동" bring the camera; and `step` (a factor 1.5, 0.585),
  one press of the zoom in or zoom out button. `zoomDetail(zoom, fitZoom)` answers `overview`, `pins` or `names`.
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
- **The route** is one line through the points given, or none. `routeStyle` says its look: a colour, a width in
  points on the screen and, for a dashed line, the length of a dash and of the gap after it, measured as SVG's
  `stroke-dasharray` is; the ends and the dashes are round, and the width and the dashes are the same at every zoom.
  Without it the line is the map's own.
- **`fitTo`** takes its `padding` as one number for all four edges or as one for each edge. The points are fitted
  into what the padding leaves of the view, and their middle comes to the middle of that.
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
  straight strokes, or as the dashes of a dashed `routeStyle` (`src/map/plain-route.tsx`). So `moveCamera`, `fitTo` and a moved Avatar are seen, and a screen can be laid out around it.
  An Avatar glides there too, unless the phone asks for less motion.
- On the plain ground each marker and Avatar is a button under its `name`, with the look's name as its `testID`,
  and the route is read as "경로가 그려져 있습니다". One outside the view is not drawn and stays such a button. So a
  screen reader, and a test, reach everything the map was asked to show. In a test the ground is as large as the
  window until it is laid out.

### Marker images

A native map draws images, not React views. An image is a picture of the design system's own marker view, made once
for each look and kept for as long as the app runs:

- A look (`MarkerLook` in `src/map/marker-looks.tsx`) is one of three:
  - the User's own Avatar: `MapPin` of the kind `me`, and its `small` form under the name `me:small`;
  - a person: `MapPerson` with the letters or the photo, in a `tone` (a status, or `member`), `small` or at full
    size, `selected` or not, such as `person:full:free:김민준:` and `person:small:member:오현우::selected`;
  - a place of each kind of the design system, as a `dot` from far away or a `pin` from close, a pin with its
    `count` when it has one, `selected` or not, such as `official:dot`, `party:pin:4` and `party:pin:4:selected`.
- Two looks that draw the same picture have the same name, so the pictures stay few: two for each person, a dot
  and a pin for each kind of place and count, and the selected look of the one thing that is selected. No look has
  a label: a name is the map's own text.
- A person's marker and a pin stand on their tip, the bottom of their view; a dot and the User's own Avatar sit on
  their middle (`anchor`).
- The main screen asks for every unselected look of its cards when the cards come, so that a change of the level of
  detail finds its pictures made. A selected look is made when something is selected.
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
view's size and with its shadow, and when a picture that no screen uses any more is released. Also: a marker whose
image changes to a look without a picture yet, as on a selection, keeps its last picture until the new one is there;
the route is drawn by `routeStyle`; and `fitTo` takes a padding for each edge.

### Trying it

`/map-check`, opened as `/catalogue` is (`snunow://map-check` in a development build), shows the component with sample markers,
Avatars and buttons that move the User's Avatar, draw and clear the route line, fit the camera to the route, zoom in
and show the whole campus. It says what was pressed and where the camera stopped. It is for developers: a released
app does not show it. The native modules are checked on it.
