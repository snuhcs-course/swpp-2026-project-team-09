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

Expo Go shows every screen, but the map only as a plain ground: Kakao's map needs a build of the app with its native
module, which "Build the app for Android" and "Build the app for iOS" below make. `pnpm android` and `pnpm ios` make
that build; `pnpm start` is the way to Expo Go.

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

"로그아웃" on 내 정보 signs a User out. To start at the sign-in screen with nothing kept, start the app with
`EXPO_PUBLIC_FIRST_STATE=1`.

### Google sign-in

The sign-in module (`src/auth/sign-in.ts`) asks Google in a build that holds Google's sign-in module, and is a mock
everywhere else:

| Where the app runs                                                         | The sign-in                                                   |
| -------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A development build with the Google settings and the main server's address | Google's account sheet, then the main server                  |
| A development build with the Google settings and no main server's address  | Google's account sheet, and the app's own check of the domain |
| Expo Go, the web, the tests                                                | The mock: it signs in after 0.3 seconds, with no sheet        |
| Any of them with `EXPO_PUBLIC_SIGN_IN_ENDING`                              | The mock, with the ending that the setting names              |

With the main server's address (`asksMainServer()` in `src/api/servers.ts`), Google's ID token goes to
`POST /auth/google`, and the main server's answer gives the ending: 200 signs in, with whether the User finished
Onboarding and the suggestion; 403 is an account outside SNU; anything else, and no answer, is a failure. A closed sheet
returns to the default state and sends nothing. The main server's access and refresh tokens are kept in the phone's
secure storage (`src/auth/tokens.ts`, on `expo-secure-store`). The same build then asks the main server for every
operation it serves (see "Data" below) and opens the connection to the socket server.

Without the main server's address, the app itself reads the ID token and takes an account for an SNU one when its
hosted domain, the `hd` claim, is `snu.ac.kr` (`src/auth/id-token.ts`). It does not check the token's signature, so
this decides only what the screen says, and every answer stays a mock.

The settings are a person's. Copy `.env.example` to `.env`, which is not committed, and fill in:

| Variable                           | Value                                                                                                     |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The ID of the main server's Google client, of type "Web application"                                      |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | The ID of the Google client of type "iOS". Only the iOS build needs it                                    |
| `GOOGLE_IOS_URL_SCHEME`            | The iOS client's ID reversed (`com.googleusercontent.apps.…`). Only the iOS build                         |
| `EXPO_PUBLIC_MAIN_SERVER_URL`      | The main server's address; from the Android emulator, `http://10.0.2.2:3000` for one on the same computer |
| `EXPO_PUBLIC_SOCKET_SERVER_URL`    | The socket server's address; from the emulator, `http://10.0.2.2:3001`                                    |

The IDs are in the Google Cloud project's list of clients. The Web application client's ID is also the main server's
`GOOGLE_APP_CLIENT_ID`. Without the web client's ID the sign-in stays the mock in every build. The servers run on the
computer with `docker compose up --build` at the repository root (see the main server's README); the emulator reaches
the computer as `10.0.2.2`, and a debug build allows plain HTTP. A phone needs an address it can reach.

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

## Build the app for Android

A build of the app holds the native map module, `modules/snu-now-map`, and shows Kakao's map. These are the steps
from a clean checkout to the app on an emulator and on a phone, on a Mac with Apple Silicon. They were checked on
2026-10-05.

### Tools

| Tool                                                    | Version                                                     |
| ------------------------------------------------------- | ----------------------------------------------------------- |
| Node.js and pnpm                                        | As in "Run it": Node.js 24, pnpm 12.6.0                     |
| JDK                                                     | 17 (Temurin 17.0.8 was used); a build with JDK 21 also ran  |
| Android Studio, for the SDK and the emulator            | Any recent one                                              |
| Android SDK Platform and Build-Tools                    | 36                                                          |
| Android SDK Platform-Tools (`adb`) and Android Emulator | The latest                                                  |
| NDK                                                     | 27.1.12297006, which Gradle installs during the first build |
| Gradle                                                  | 9.3.1, which the project's wrapper fetches                  |

Install the SDK parts in Android Studio under Settings > Languages & Frameworks > Android SDK, and point the build at
the JDK and the SDK, for example in `~/.zshrc`:

```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 17)
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

### The emulator

Kakao's SDK ships ARM libraries only, so the app is built for `arm64-v8a` alone (`app.json`) and runs on an ARM
emulator or a phone, not on an x86_64 emulator. In Android Studio's Device Manager, create a phone with the system
image **Android 16.0 (API 36), Google Play, arm64-v8a** (`system-images;android-36;google_apis_playstore;arm64-v8a`)
and start it.

### The settings

```bash
cp .env.example .env
```

Fill in `KAKAO_NATIVE_APP_KEY` in `.env` with the native app key of the team's Kakao app; the Owner shares it. Git
ignores `.env`. The app's configuration writes the key into the Android project when the project is generated, so
after a change to it, generate the project again with `pnpm expo prebuild --platform android`.

The app's identifier is `com.bonnieandclaude.snunow`. Kakao accepts the map only from this identifier and a signing
key whose key hash is registered. A development build is signed with the debug key that Expo's template ships, whose
key hash, `Xo8WBi6jzSxKDVR4drqm84yr9iU=`, is registered, so a teammate needs no key of their own.

### The commands

```bash
pnpm install
pnpm android
```

### Invite Links on Android

Set `INVITE_LINK_HOST` in `.env` to the host of the main server's `PUBLIC_URL`, such as `snunow.example`, before the
project is generated. The build then declares an App Link with `autoVerify` for `https://<host>/invite/`
(`app.config.ts`), and Android checks it against `https://<host>/.well-known/assetlinks.json`, which the main server
answers. The check passes only when the build's signing certificate is among the main server's
`ANDROID_CERTIFICATE_FINGERPRINTS`; the debug key's fingerprint is in the main server's `.env.example`. Without the
host the build declares no App Link, and a link opens the app only through `snunow://invite/<token>`.

`pnpm android` generates the Android project in `android/` (not committed), builds the app, installs it on the
running emulator, opens it and starts the development server. The first build takes 15 to 30 minutes; later ones a
few minutes. Then press "지도 보기" on a placeholder screen, or open `/map-check`, to see the map.

On a phone: turn on Developer options and USB debugging, connect it with a cable, accept the prompt on the phone,
check that `adb devices` lists it, and run `pnpm android --device` to choose it.

### When the map does not appear

Read what the map says with `adb logcat -s SnuNowMap K3fAApi`:

- **A wrong key hash or identifier**: the map stays blank and the log says `The map could not start` with
  `MapAuthException(401)` and `android keyhash mismatched!`. Kakao's own words for it are
  `invalid android_key_hash or ios_bundle_id or web_site_url`. The app was signed with a key whose hash is not
  registered at Kakao, or built under another identifier.
- **An empty key**: the log says `KAKAO_NATIVE_APP_KEY was empty when the app was built`. Fill it in and generate the
  project again.
- **`MapTimeoutException`**: the map's engine took longer than 10 seconds to start, which a busy machine can do to
  an emulator. Close what else is running and open the screen again.
- `MapAuthException(429)`: the day's quota is used up.

## Build the app for iOS

A build for iOS holds the same module, `modules/snu-now-map`, around Kakao Maps SDK for iOS. These are the steps from
a clean checkout to the app on the iOS simulator and on an iPhone, on a Mac with Apple Silicon. They were checked on
2026-10-06 with the iPhone 17 simulator (iOS 27.0) and an iPhone 14 Pro.

### Tools

| Tool                         | Version                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| Node.js and pnpm             | As in "Run it": Node.js 24, pnpm 12.6.0                                     |
| Xcode, with an iOS simulator | 27.0 (27A266a), with the iOS 27.0 simulator                                 |
| CocoaPods                    | 1.17.0 (`brew install cocoapods`); it fetches `KakaoMapsSDK` 2.12.19 itself |

After installing Xcode, point the command line at it, accept its licence and install a simulator's runtime:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -downloadPlatform iOS
```

**Keep the checkout out of iCloud Drive.** When the Mac's Desktop and Documents are synced to iCloud Drive, a checkout
under them cannot be built for iOS: iCloud marks the folders that the build makes inside `node_modules` and `ios/`,
and `codesign` refuses them with `resource fork, Finder information, or similar detritus not allowed`. Clone the
repository elsewhere, such as `~/Developer`.

### The settings

The same `.env` as for Android: `KAKAO_NATIVE_APP_KEY` is the team's native app key (see "Build the app for
Android", "The settings"). The app's configuration writes it into the iOS app's `Info.plist` when the project is
generated, so after a change to it, generate the project again with `pnpm expo prebuild --platform ios`.

Kakao accepts the map only from an app whose bundle ID is registered in the team's Kakao app, under [앱] > [플랫폼] >
[iOS]. The app's bundle ID, `com.bonnieandclaude.snunow`, is registered; iOS needs no key hash.

### The commands

```bash
pnpm install
pnpm ios
```

`pnpm ios` generates the iOS project in `ios/` (not committed), installs the pods, builds the app, installs it on a
simulator, opens it and starts the development server. The first `pod install` downloads about 200 MB of React
Native and Hermes builds; when it seems stuck, it is a slow download, which a second try takes from the cache. The build
itself took 5 minutes on an Apple Silicon Mac. Then press "지도 보기" on a placeholder screen, or open `/map-check`, to
see the map. A link that opens the app on the simulator asks "Open in “SNU Now”?" first.

On an iPhone: connect it with a cable, trust the Mac on the phone, and turn on Developer Mode under Settings > Privacy &
Security. Open `ios/SNUNow.xcworkspace` in Xcode once and, under the target's Signing & Capabilities, choose a team.
Then run `pnpm ios --device` and choose the phone, and on the phone trust the developer under Settings > General > VPN
& Device Management. A personal team of a free Apple ID can sign the app, for 7 days at a time, if no other team has
taken the bundle ID; otherwise the phone build needs the team's Apple Developer account.

- Signing asks for the login keychain's password once for each framework in the app. To be asked no more, run
  `security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k '<the Mac's password>'
~/Library/Keychains/login.keychain-db` once.
- The map is only on the development screens, which a release build does not show, so check it with a debug build. A
  debug build loads its JavaScript from the development server: the phone and the Mac must be on the same Wi-Fi, and
  the phone must allow the app on the local network.

Two things in the app's configuration exist for the iOS build alone:

- `plugins/ios-scene-life-cycle.ts`: an app built with the iOS 27 SDK quits at launch unless it adopts the scene
  life cycle, and Expo SDK 57's project template, up to 57.0.28, does not. The plugin makes the generated project use
  Expo's own `ExpoAppSceneDelegate`. Remove it once Expo's template does the same.
- `app.config.ts` lets CocoaPods link three of Google's pods as static libraries when `GOOGLE_IOS_URL_SCHEME` is
  empty, which the sign-in library's plugin otherwise does; without it `pod install` fails on `AppCheckCore`.

### When the map does not appear

Read what the map says in the simulator's log:

```bash
xcrun simctl spawn booted log stream --predicate 'eventMessage CONTAINS "SnuNowMap"'
```

- **A bundle ID that is not registered, or a wrong key**: the map stays blank and the log says
  `The map could not start: 401` with Kakao's `invalid android_key_hash or ios_bundle_id or web_site_url`.
- **An empty key**: the log says `KAKAO_NATIVE_APP_KEY was empty when the app was built`. Fill it in and generate
  the project again.
- **`The map could not be added`**: the map's configuration did not arrive within 10 seconds. Check the network.
- `The map could not start: 429`: the day's quota is used up. `499`: no network.

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
index.ts            the bundle's entry: defines the background task, then starts Expo Router
src/app/            screens; every file is a route and _layout.tsx sets the navigation around them
src/design-system/  the tokens and the shared components
src/catalogue/      the sections of the design system's catalogue screen
src/hooks/          hooks shared by components and screens
src/api/            the API client, the main server's answers as types, the main server's client and the mocks
src/auth/           sign-in and sign-out, and the main server's tokens
src/live/           the one connection to the socket server
src/features/       one folder per feature: its adapter and the hooks a screen asks for data with
src/map/            the one map component, its interface and the pictures of its markers
src/position/       the User's own position: the phone's, or the development walk, and its sending
src/storage/        what the phone keeps between two starts of the app
src/session/        where the User is in the flow between the screens, and the work of the start
src/screens/        the screens that the routes show; a screen of several files has a folder
modules/            the native map module, a local Expo module
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

**The signed-in place** is the route group `src/app/(signed-in)/`. Its layout is the guard (`useOwnPlace('ready')`)
for every route in it, the `PositionProvider` that every tab and every screen above them reads, the
`PositionSending` inside it (see "The User's position"), and a stack:

- **The tabs** (`(signed-in)/(tabs)/`): Expo Router's `Tabs`, with `TabBar` (`src/screens/shell/tab-bar.tsx`)
  drawing the design system's `BottomNav`. 지도 is the main screen at `/main`; 파티 is `/party`, 행사 `/events`, 내
  정보 `/me`. 올리기 is no tab and says "준비 중이에요". A tab stays mounted while another is shown, so the map keeps
  its native view, its camera, the open card, the route and the collapsed lists. The bar has no line on top but the
  frames' shadow (`shadow.nav`), and under its items 16 or the phone's own inset, whichever is larger
  (`navPaddingBottom` in `src/screens/shell/layout.ts`). The number on 파티 is `usePartyBadge()`: the rows of 알림
  that concern 파티, every row but the Friend Requests. While the lists load, and when every one failed, there is no
  badge.
- 파티, 행사 and 내 정보 are a `TabScreen` (`src/screens/shell/tab-screen.tsx`): the tab's app bar on the grey ground.
  파티 has "+ 만들기" and the tabs 찾기, 내 파티 and 초대; its address names the tab (`/party?tab=invites`). 내 정보's
  address can ask for its 위치 공유 card (`/me?show=sharing`). The bodies of 파티 and 행사 say "준비 중이에요" until
  their tasks fill them; 내 정보 is described below.
- **Screens above the tabs** are routes of the stack: the Quest list on the whole screen (`/quests`), 알림
  (`/notifications`) and 프로필 편집 (`/profile-edit`). Each is a
  `FullScreenPanel` and slides in over 0.28 s, from the bottom for `/quests` and from the right for a pushed screen,
  or appears without sliding where the phone asks for less motion (`slideFrom` in the layout). The tabs lie under
  them also when the app opens at their address (`unstable_settings`).
- **Android's back button** closes the topmost thing: a Dialog through its Modal; a side panel, a bottom sheet and
  the open card on the map through `useBackToClose(open, close)` (`src/hooks/use-back-to-close.ts`), the latest to
  open first; a screen above the tabs through the stack. With nothing open, back on 파티, 행사 or 내 정보 shows 지도
  (`backBehavior: 'firstRoute'`), and on 지도 it leaves the app. The card answers only while the map is in front.
- **A toast** sits where the screen in front says (`useToastAbove(height, inFront)`): on 지도 where the main screen
  puts it, on another tab 16 above the navigation (the frames' 96 from the bottom), and on a screen above the tabs
  just above the phone's own bar.
- Side panels and bottom sheets are drawn in the `OverlayHost` of `AppProviders`: over every screen and the
  navigation, and under the toast, which a Modal would hide.

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

The main screen (`src/screens/main/`) is the `Main` wireframe and the first tab: the map on the whole campus with the
people and places on it; over it the friend list, the Quest list, the zoom control or an open card, and the controls
above the navigation.

- `useMainMap()` owns the map's handle and follows its camera: `camera`, `fitZoom`, the `detail` the zoom asks for
  (`overview`, `pins` or `names`), and the moves `zoomBy(steps)`, `goTo(position, level, orCloser)` and
  `showCampus()`, and `fitTo(points, padding)`, which comes no closer than the `pins` level. Every part of the
  screen that moves the map or draws by zoom takes it. A move or a fit asked before the map is ready is kept and
  carried out at the camera's first rest; of several, the last (`use-camera-moves.ts`). The zoom buttons count from
  where the last of them is on its way to.
- The signed-in place's layout holds the `PositionProvider`, so every part of the screen reads the same position with
  `usePosition()`.
- `useMe(map)` gives the User's Avatar for the map, the position while it is on campus, "내 위치로 이동", the
  explanation before the location prompt, and `sayWhyNotHere()` for a part that needs a position and has none.
- What floats over the map is a child of `OverMap` in `main-screen.tsx` and places itself by the offsets of
  `layout.ts`, which are counted from the navigation's top edge: the zoom control's bottom is 136 above it, a
  toast's bottom 78, the row of buttons' and the 편의기능 button's 78, a card's bottom 72 and the AI input's 12. The
  input is 50 high, so a card ends 10 above it. The two lists are counted from the top: 52 from the screen's top
  edge, or 8 under a status bar that leaves less. While a card is open a toast sits 8 above the card, never over
  its buttons: the card tells its height and the screen tells the toast while it is in front (`useToastAbove`). The children are in the
  wireframe's order, the later above the earlier: the lists, the zoom control or the card, the controls.
- **Markers.** `useMapCards()` gives one `CardView` for each thing on the map, and `useThings(cards, detail,
selectedId)` turns them into the `markers` and `avatars` of `<Map>`, each under its card's id. A Friend who can be
  seen and a member of the User's Party who is no Friend are the wireframe's teardrop at every zoom, in the status's
  colour or the Party's: small while the whole campus is in view, at full size from the `pins` level, and with the
  given name under it from the `names` level. A Friend whose position is not known has no marker. The Global Event,
  the User's Party and a Shared Quest are dots while the whole campus is in view, pins from the `pins` level and pins
  with a short name from the `names` level. A Party's pin counts its members; a Global Event's counts the Parties
  that go to it when they are more than one. A short name is the title cut at a word's end within 8 characters,
  counted in whole characters, so that an emoji is never cut. A given name is the name without its first syllable for
  a Korean name of three syllables, and the whole name otherwise (`src/features/map/short-name.ts`). A marker is read as the wireframe reads it: "김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요", "공식 행사 · AI 커리어
  설명회". The selected marker has the selected look and is drawn above the others, the User's own Avatar included.
- **Cards.** `useSelection(cards)` holds what is selected: `selected` (the open card), `open`, `select(id)` and
  `close()`. A press on a marker selects it and opens its card (`card.tsx`) in place of the one that was open; the
  card's X and Android's back button close it, the button only while the map is in front; a press beside the
  markers leaves it open. A card whose thing leaves
  the map, such as a Friend who turns their location off, is closed for good: it does not open again on their return. The card shows the leading
  mark (a person's Avatar, or the place's icon on its kind's colour), the sub-label, the title, the lines and its
  button. "가까이 보기" is offered below the `names` level and brings the camera to the `close` level, keeping the
  card. "같이 갈 사람 찾기", "참여하기", "파티 만들기" and "파티 열기" say "준비 중이에요". While a card is open the zoom
  control is not shown; a part that a card hides asks `selection.open`. A row of a list opens a card with
  `selection.selectOrWait(cardId.friend(id))` (`cardId` of `src/features/map/adapter.ts`) and moves the map with
  `map.goTo`. A row may be pressed before the map's cards came: `selectOrWait` waits for an id that no card has
  until the cards change, and opens its card then if it is among them; another selection or a close ends the wait.
  A press on the map uses `selection.select`, which does nothing for an id that no card has.
- **The route.** `useRoute(map, me)` gives the one line for `<Map>` and `routeTo(place)`. When the screen opens, the
  way to the User's next Quest by time (`useNextQuest()`) is drawn, once, as soon as the User has a position on
  campus, without a toast and without moving the map; without a position none is drawn. The next Quest is the first
  of today's, in Korea's time, that has not ended: a class in progress is the next one until it ends. "길찾기", on a
  Shared Quest's card, closes the card, asks the way from the User's position, fits both ends into what the screen's
  controls and a pin's name leave of the map (`ROUTE_PADDING` in `layout.ts`), no closer than the `pins` level as
  in the wireframe, and says "…까지 길 안내"; it replaces the line that is drawn. Without a position to start from it
  draws nothing and keeps the card: without the permission it shows the explanation; off campus it brings the map to
  the place and says "캠퍼스 밖에 있어요"; before the first position it says "위치를 찾는 중이에요". Nothing is drawn
  for it later either, when the position comes: neither that way nor the opening route. A way that is not found says
  "길을 찾지 못했어요". Leaving the screen drops the line and the opening route that was still to come, and coming
  back draws nothing by itself.
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
  Both of its looks, `me` and `me:small`, are asked for when the screen opens. It takes no press (`passive`), as in
  the wireframe: a press on it reaches a Friend's marker that it stands over.
- **The lists.** `FriendList` (`friend-list.tsx`) is at the left and `QuestList` (`quest-list.tsx`) at the right, each
  with the wireframe's pill and a round button beside it that collapses the list and is read as "친구 목록 접기" or
  "친구 목록 펼치기" ("퀘스트 목록 …"); the two collapse separately, and a pill stays as it is. The friend pill
  counts the Friends in the list and opens the friend panel; the Quest pill counts the rows, and its round button
  opens the Quest list on the whole screen. The rows are in a window of up to three rows
  (`RowWindow` in `list-parts.tsx`) that scrolls and snaps to the rows; the web does not snap. The text over the map
  has a white glow (`textHalo`).
  - **Only a row takes a touch.** A row is as wide as its words; the window is as wide as its widest row, never
    wider than its column, and stands at the list's side; the window, its content and the box around each row are
    `box-none`, as is everything around the window. So a touch beside a row, between two rows or under the last one
    reaches the map. A scroll view that is `box-none` does not scroll on Android, so the window takes touches from
    the moment a touch starts on a row until that touch or its drag ends: a drag that starts on a row scrolls the
    list.
  - **The fade.** With more rows than it shows, a window of two rows or more fades as the wireframe's mask does:
    each row is drawn as strongly as the mask is at the row's middle, so the rows above the last place are solid,
    the row in it is at 40%, and a row that scrolls out at the end goes down to nothing. The fade lifts as the list
    reaches its end. React Native has no mask, and a gradient over the window would colour the map under it, so
    each row's own strength follows the scroll.
  - **The room** (`Room` in `layout.ts`: the stage's size, which `OverMap` tells, and the open card's height). A
    window shows the whole rows that fit above what is under it, with 8 clear (`listRows`): three, or two, one or
    none on a low screen. Under the Quest list is the zoom control; under the friend list is the strip of the
    map's credit, on "오늘의 발자국"; while a card is open, under both is the credit's strip on the card. The Quest
    column is 182 wide; the friend column is 160 or, on a screen narrower than 374, what the Quest column leaves
    (`friendsWidth`), 146 at 360, so the two never share a point.
  - A Friend's row has the dot in the status's colour (`presence`), the name and the line, "공강 · 중앙도서관" or
    "위치 꺼짐". A press brings the map to the Friend at the `close` level and opens their card; for a Friend whose
    position is not known it says "<이름>님은 위치가 꺼져 있어요" for 2 seconds.
  - A Quest's row has the round with its icon, the kicker, the title and the time with the place, and the rail joins
    the rounds. The adapter says the row's `tone` and `icon`: a class is `clock` in grey; `open`, a Party that
    others may join, is `users` in blue; `closed`, a Party that takes nobody else and a Shared Quest, is `lock` in
    the Party's colour (`questTone`). A press on a class's row brings the map to its place at the `names` level,
    closes an open card and says "<title> · <place>", "자료구조 · 301동 118호"; any other row says "준비 중이에요".
    Without a Quest the list says "오늘 일정 없음".
  - While a list's data is loading, and after a failure, its pill has no number and the list has no rows.
- **The controls above the navigation** (`bottom-controls.tsx`): "오늘의 발자국", with up to three faces and "친구
  5명의 오늘" from `useFootprints()`; "활성 파티", shown only while the User is in a Party, with "<n>명 공유 중" for
  the members who share their position, the User left out, or "응답 대기" when nobody else does
  (`useActiveParty()`); the 편의기능 button (`layers.tsx`, below); and the AI input. Each but the 편의기능 button says
  "준비 중이에요".
  - The AI input (`ai-input.tsx`) is not a text field yet. It is a button with the look of the wireframe's empty
    input, the placeholder "무엇이든 부탁해 보세요" and the grey send button: nothing takes the focus, no keyboard
    comes up and nothing can be typed. A press on it says "준비 중이에요"; so does a press on the send button, which
    a screen reader reads as disabled. The field comes with the AI chat's own task; the design system's `ChatInput`
    is that field and no screen uses it yet.
  - On a screen narrower than the wireframe's 390, "오늘의 발자국" gives way to "활성 파티", whose two lines stay
    whole (`footprintsForm` in `layout.ts`): it drops its second line and keeps one face, has no face under 360,
    and is the one button of the row that shrinks, its name cut with an ellipsis. Alone in the row it is whole.
- While a card at the bottom is open, the row of "오늘의 발자국" and "활성 파티", the 편의기능 button and its stack
  are not shown, as the zoom control is not; both lists, the AI input and the navigation stay. A 식당's card sits at
  the top instead (52 from the top, 16 from the sides): the two lists give way to it, and the zoom control, the row
  and the 편의기능 button stay.
- **The 편의기능 stack** (`layers.tsx`, the `MainLayers` frame). The button, "편의기능 (식당 · 셔틀버스)", opens and
  closes it and says whether it is open; it is navy with a white icon while the stack is open, and under its icon a
  dot of 5 in each colour of a layer that is on. The stack rises 8 above it, or appears at once where the phone asks
  for less motion: from the bottom up the toggles 식당 and 셔틀버스, 60 by 64, read as toggle buttons "식당 켜기" or
  "식당 끄기", filled with their layer's colour while on; above them the tile 메뉴 ("메뉴 보기"), which closes the
  stack and opens the menu panel at the meal served next. A transparent scrim over the map ("편의기능 레이어 닫기")
  and Android's back button close it, the button before a card under it; the zoom control is hidden while it is
  open. 셔틀버스 says "준비 중이에요" and stays off until P15's ticket 02. The layers start off when the app starts
  and stay as they are while another tab is shown.
- **The 식당 layer** (`src/features/dining/`, the `MapDining` frame). Turning it on fetches today's menus, a day of
  Korea's calendar, and the Places, every time; failing either shows no pins and says "식당 정보를 불러오지
  못했어요". A pin stands on the Place of each restaurant of the restaurant → Place table (see "Data") that has a
  line today; restaurants that share a Place share it. A pin is the frame's single 학식 mark (`MapRestaurant`), with
  the restaurant's name under it from the `names` level, or "{first} 외 {n}곳". Its card says "식당 · 학식 · 63동",
  the restaurant's name (the Place's when several share it), the Place, and the meals each restaurant serves today
  ("오늘 점심 · 저녁"); "메뉴 보기" opens the menu panel at the meal served next, at the first of its restaurants.
  Turning the layer off takes the pins away and closes a 식당's card. The frame's clusters, cafés and convenience
  stores are not built.
- **The map's credit** is a button, "지도 데이터 출처 보기", that opens the sources of the map's data.
- Every control has a Korean name for a screen reader, the wireframe's where it has one. A touch area is at least 48
  high: a row is 56, and the pills and the round buttons of 32 and 40 reach past their shapes (`hitSlop`), never
  into a neighbour's shape.
- **The map's credit.** The map ends at the navigation's top and is told what the controls cover of its edges
  (`mapInset` in `layout.ts`, the `inset` of `<Map>`): 126 at the bottom, the row of buttons' top, and 62 at the
  right, the zoom control. So the credit is just above "오늘의 발자국", 16 from the left, and a provider's logo
  belongs left of the zoom control, above "활성 파티". While a card is open the inset's bottom is the card's top,
  and the credit sits above the card. Nothing is drawn over the credit: the lists end 8 above its strip
  (`CREDIT_ROOM` of `@/map`, the credit's margin and its line), on a low screen with fewer rows.

**The friend panel** (`friend-panel.tsx`, the `MainFriends` frame) is a `SidePanel` from the left over the whole
screen: "친구 {N}" and ✕ "닫기"; the search "이름, 학과 검색" ("친구 검색"), by name and department, spaces aside, with
"결과 없음" when nobody is found; the chips 전체, 공강, 수업 중, 이동 중 and 위치 꺼짐 with their counts, those of 0
hidden but 전체; and the Friends grouped by presence ("공강 · 4"), each row with the Avatar and its status, the name
and the department, the detail (or the line where the app has no detail), and the round calendar button "{이름}님과
파티 만들기", which says "준비 중이에요". Its footer has the live Badge "친구 {n}명과 위치 공유 중", n the Friends the
User sees now (`visible`); "공유 설정", which closes the panel and shows 내 정보 at `/me?show=sharing`; and "+ 친구
추가", which closes the panel and opens 친구 추가. The scrim ("친구 패널 닫기"), ✕ and Android's back button close it.
A Friend is under "위치 꺼짐" whenever the main server says the User cannot see them (`visible`), whatever the app's
own status says.

**The friend screens** (`src/screens/friends/`, the `Friends` and `FriendsAdd` frames) are screens above the tabs that
slide in from the right, each a `FullScreenPanel` whose "뒤로" goes back to where it was opened from:

- **친구 관리** (`/me/friends`, from 내 정보's "친구 관리"): "친구 {n}"; the search "친구 검색", by name and department, with "결과 없음"; the row
  "친구 추가"; the row "친구 요청 {n}", n the requests received; and under "친구 {n}" every Friend in the main server's
  order, with the department (and " · 위치 꺼짐" for a Friend the User cannot see) and the switch "{이름}님과 위치 공유".
  A switch shows its new state at once, sends `setFriendSharing`, and turns back with "위치 공유를 바꾸지 못했어요" when
  that fails; the Friends and the positions are fetched again after it. A press on a Friend opens a bottom sheet with
  "친구 끊기", which a danger dialog confirms; the Friend then leaves the list, the friend panel and the map. A
  friendship that ended already is fetched again without a word. With no Friend it says "아직 친구가 없어요".
- **친구 요청** (`/me/friends/requests`, also from a Friend Request in 알림): "받은 요청 · {n}" with "거절" and "수락", and "보낸 요청 · {n}" with "요청 취소",
  left out when empty. A request that waits no more says "이미 처리된 요청이에요" and the requests are fetched again.
- **친구 추가** (`/me/friends/add`): the User's Friend ID from the Lobby, which "복사" puts on the clipboard
  (`expo-clipboard`); the field "친구 ID", which keeps letters and digits in capitals, at most 8, and "찾기", which looks
  the owner up before "추가" sends the Friend Request; each refusal under the field; and "초대 링크 보내기", which makes
  an Invite Link and opens the phone's share sheet (React Native's `Share`).
- **The accept screen** of an Invite Link (`/invite/[token]`), which slides up: who sent it, "수락" and "거절", or why it
  cannot be accepted, with "확인". "수락" closes it on 지도 with "{name}님과 친구가 됐어요"; "거절" only closes it.

Only the friend panel's "+ 친구 추가" opens one of them in the app so far: 내 정보 and its 알림 lead to the others when
they are built.

**An Invite Link** is `<PUBLIC_URL>/invite/<token>`, and the main server's page opens `snunow://invite/<token>` where a
messenger shows the address in its own browser. Both reach the route `/invite/[token]`. A link opened before the User
belongs to the signed-in place (at the start of the app, or signed out) meets the signed-in place's guard, which keeps
its token on the phone (`inviteToken` of `Kept`) before it leads away; once the User is there, after the loading
screen or after the sign-in, the consent and Onboarding, the layout opens the accept screen of the kept token. Opened
while signed in, the link shows its screen at once. The accept screen drops the kept token, and a later link replaces
it. Android opens the https address in the app only through App Links (see "Invite Links on Android" below).

**The Quest list on the whole screen** (`src/screens/quests/`, the `MainQuests` frame, `/quests`) is a
`FullScreenPanel` that comes up from the bottom: ✕ "닫기" and "퀘스트 {n}", n the Quests that have not ended; the
chips "전체", "강의" and "파티", whose counts stay while one filters; and the rows grouped by the Korean day of the
start of the Sub Quest each shows (`toQuestGroups` in the quest feature's adapter): "오늘 · 10월 1일 (목)", "내일 ·
…", "이번 주" (2 to 4 days ahead), "다음 주" (5 to 11), "그 이후", and "시간 미정" last for a Quest without a start.
A Quest whose Sub Quests all ended or were cancelled is not shown. A row is 72 high: the round of 40 in its
`questTone`, the kind ("강의", "공개 파티", "비공개 파티 · 김민준"), the title, the place and the time. A class's row
closes the screen and goes back to the map by `/main?quest=<id>`, which the Quest list on the map carries out as a
press of its own row; any other row says "준비 중이에요". Without a Quest it says "퀘스트가 없어요"; while the Quests
load and after a failure it shows the shared states.

**내 정보** (`src/screens/me/me-screen.tsx`, the `Profile` frame) has the bell, "알림" or "알림 {n}개" with the
number of 알림's rows in red ("9+" above nine), and four cards from the top:

- the profile from the Lobby: the Avatar, the name, "컴퓨터공학부 · 22학번" (the department alone without an
  admission year), "SNU 계정 인증됨" and "프로필 편집";
- 시간표 (`week-card.tsx`): Monday to Friday from 09 to 18, today's day in navy, a block for each time of a class
  (`GET /timetable/classes`, with `GET /places` for the numbers) in the colour of the class's place in the timetable
  (`classColors`), reading "운영체제" over "301-118", "301동" or "118호". The tiles "직접 입력", "이미지로 불러오기"
  and "빈 시간 말하기" say "준비 중이에요";
- 위치 공유 (`sharing-card.tsx`): the switch "친구와 위치 공유", which is the Master Switch, with the number of
  Friends, and "캠퍼스 밖이라 위치가 공유되지 않아요" while the last upload was off campus. Turning it on without the
  location permission shows the map's explanation and the system's prompt first; a refusal leaves it off with
  "위치 권한을 허용해야 공유할 수 있어요". The new state shows at once, and turns back with "위치 공유를 바꾸지
  못했어요" when the main server did not take it. At `/me?show=sharing` the screen scrolls to the card and outlines
  it for 1.2 s;
- "친구 관리 {n}" (친구 관리), "참여 중인 파티 {n}" (파티 at 내 파티) and "내 퀘스트" (the Quest list on the
  whole screen).

"로그아웃" asks "로그아웃할까요?", then stops the sending, signs out and shows the sign-in screen. 프로필 편집
(`profile-edit-screen.tsx`) edits the name, the department, the admission year and the interests with Onboarding's
fields, sends the changed ones with `PATCH /users/me/profile`, puts the answer in the Lobby and goes back; a failure
says "저장하지 못했어요. 다시 시도해 주세요" and stays.

알림 (`notifications-screen.tsx`) is composed from the main server's lists (`useNotices()` of the notifications
feature), in this order: a Party running for a Quest the User holds ("{name}님이 파티를 활성화했어요", or "파티가
활성화됐어요" without its Leader), a Friend Request received, a Quest invitation, a Meetup proposed to the User and
waiting ("{name}님의 파티 초대"), and the requests to join each Quest the User leads with Approval ("참여 신청
{n}명"). An invitation's and a Meetup's row open 파티 at 초대, a Friend Request's 친구 요청; the others say "준비 중이에요". A list that failed is
left out; when every one failed it shows the error state. Without rows it says "새 알림이 없어요".

**The menu panel** (`src/screens/menus/`, `/menus`) has no frame. It is a `FullScreenPanel` that comes up from the
bottom: ✕ "닫기" and "메뉴"; under the app bar the 7 days from today as `DayTile`s ("오늘", "내일", then the weekday),
the tabs 아침, 점심 and 저녁, and "{M월 d일 HH:mm}에 가져온 메뉴예요" from the oldest collection of the day. It opens
on the meal served next by Korea's clock: 아침 before 10:00, 점심 from 10:00, 저녁 from 15:00, and 내일's 아침 from
20:00 (`NEXT_MEAL_FROM` in the dining adapter). Its address may name the day, the meal and a restaurant
(`/menus?date=2026-10-06&meal=lunch&restaurant=학생회관식당`), whose section is then scrolled to the top. A day is
fetched once when it is chosen, and kept; a meal fetches nothing. The restaurants are cards in the server's order,
the name with "{number}동" where the table places it, and the chosen meal's lines in the page's order (ADR 0001): a
line with a name and a price as a row with the price at the right ("6,000원"), a heading in 14/700, a note in 13
muted, any other line as written; a restaurant without lines for the meal says "운영하지 않아요". An empty day says
"이날 올라온 메뉴가 없어요"; the shared loading and error states cover the rest.

**The sources of the map's data** (`src/screens/map-sources-screen.tsx`, `/map-sources`), opened from the map's
credit, slide in from the right: "뒤로" and "지도 데이터 출처", a card for OpenStreetMap (ODbL, with its copyright
page) and one for 국토지리정보원's 연속수치지형도 건물 under 공공누리 type 1 (with the VWorld page it is downloaded
from). Each link opens the browser. The year in the second card is that of the files' renewal on the VWorld page.

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

- `listFriendStatuses`, `listGlobalEventAnnouncers` and `getFootprints`, the app's own, never fail a screen: it shows what it has without them.
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

- **The API client** (`src/api/client.ts`): one operation per question to the main server. `src/api/types.ts` (with
  `waiting-types.ts`, the lists of what waits for the User, and `menu-types.ts`, the menus) holds the answers' shapes.
  A shape marked "provisional" comes from an open pull request of the main server, and one marked "the app's own" is
  defined nowhere else yet.
- **An adapter** per feature (`src/features/<feature>/adapter.ts`): turns answers into what the screens use, such as
  `FriendView`, `QuestRowView`, `CardView`, `FootprintsView` and `ActivePartyView`.
- **The main server's client** (`src/api/server/`): the operations the main server serves, in a build that asks it
  (`asksMainServer()`). `http.ts` is the one way to the main server: it attaches the access token, renews the Session
  once on a 401 and asks again, and ends the Session when that cannot mend it. `answers.ts` (with `waiting-answers.ts`
  and `menu-answers.ts`) checks each answer's shape before the app believes it; an answer of another shape fails as
  no answer does.
- **The mocks** (`src/api/mock/`): every other operation, and every operation where the app asks no main server, is
  answered inside the app, in the main server's shape, with what the `Main` wireframe shows. A mock answers after 0.3
  seconds. The tests use the mocks, or a fake main server behind `fetch` (`__tests__/support/fake-server.ts`).

| Operation                                                            | Answers                                            | Where it comes from with the main server                       |
| -------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| `signIn`, `signOut` (`src/auth/sign-in.ts`)                          | Whether the User signed in, and Onboarding's state | `POST /auth/google`, `/auth/sign-out`                          |
| `completeOnboarding`                                                 | Nothing                                            | `POST /users/me/onboarding`                                    |
| `enterLobby`                                                         | The User's profile and Master Switch               | `POST /lobby`                                                  |
| `updateProfile`                                                      | The changed profile                                | `PATCH /users/me/profile`                                      |
| `setMasterSwitch`                                                    | Nothing                                            | `PUT /users/me/master-switch`                                  |
| `uploadPosition`                                                     | Whether the position was off campus                | `POST /positions`                                              |
| `listFriends`                                                        | The Friends                                        | `GET /friends`                                                 |
| `setFriendSharing`, `endFriendship`                                  | Nothing                                            | `PUT /friends/:userId/sharing`, `DELETE /friends/:userId`      |
| `findFriendId`                                                       | The owner of a Friend ID                           | `GET /friend-ids/:friendId`                                    |
| `sendFriendRequest`                                                  | Whether the request waits or made two Friends      | `POST /friend-requests`                                        |
| `listFriendRequests`                                                 | The Friend Requests received and sent              | `GET /friend-requests`                                         |
| `acceptFriendRequest`, `declineFriendRequest`, `cancelFriendRequest` | Nothing                                            | `POST /friend-requests/:id/accept`, `/decline`, `/cancel`      |
| `createInviteLink`                                                   | A new Invite Link's address                        | `POST /invite-links`                                           |
| `getInviteLink`, `acceptInviteLink`                                  | Who sent the link and its status; nothing          | `GET /invite-links/:token`, `POST /invite-links/:token/accept` |
| `listPositions`                                                      | The positions the User may see                     | `GET /positions`, and the socket's `position`                  |
| `listFriendStatuses`                                                 | Each Friend's status, place and photo              | The mock: the app's own                                        |
| `listQuests`                                                         | The User's Quests and today's Class Quests         | `GET /quests`                                                  |
| `listQuestInvitations`                                               | The invitations into a Quest                       | `GET /quest-invitations`                                       |
| `listJoinRequests`                                                   | The requests to join a Quest the User leads        | `GET /quests/:questId/join-requests`                           |
| `listMeetups`                                                        | The Meetups proposed to the User and by the User   | `GET /meetups`                                                 |
| `listClasses`, `listPlaces`                                          | The User's classes, and the Places                 | `GET /timetable/classes`, `GET /places`                        |
| `listGlobalEvents`                                                   | The published Global Events                        | The mock: no route lists them for a User yet                   |
| `listGlobalEventAnnouncers`                                          | Who announced each Global Event                    | The mock: the app's own                                        |
| `listParties`, `getMyParty`                                          | The Parties, and the one the User is in            | `GET /parties`, `/parties/mine`                                |
| `getFootprints`                                                      | What "오늘의 발자국" shows: a number and faces     | The mock: the app's own                                        |
| `findWalkingRoute`                                                   | The way on foot between two points                 | `GET /walking-route`                                           |
| `listMenus`                                                          | One day's menus by restaurant                      | `GET /menus?date=`                                             |

The mock keeps the Friends, the Friend Requests and the Invite Links in memory while the app runs
(`src/api/mock/friendships.ts`), with Friend IDs for the frame's people, and refuses as the main server does. The
User's Friend ID is `7KX2M9QD`; `/invite/from-yujian` opens a link the User can accept.

`getMyParty` turns exactly the main server's 404 `NOT_IN_PARTY` into null. A 401 with `SESSION_REPLACED` ends the
Session without a renewal and shows the notice "다른 기기에서 로그인했어요" with the sign-in screen; a 403 with
`ONBOARDING_REQUIRED` shows Onboarding with the suggestion it carries (`src/session/session-events.ts`, which
`SessionProvider` follows).

**The restaurant → Place table** (`src/features/dining/restaurant-places.ts`) gives the number of the Place of each
restaurant whose menus are collected, by the restaurant's name as `GET /menus` gives it. A restaurant missing from
it, or whose number `GET /places` does not answer, has no pin and is still in the menu panel. When the Co-op renames
or moves a restaurant, correct its row there, with the name exactly as the worker sends it and the number as the
main server's Places have it (`main-server/seed/`).

The User's own id is the access token's subject, and the app's time is the phone's. Where the answers are mocks, the
User is the mock's `me` and the time is the moment the wireframe shows, 1 October 2026 at 13:37 (`src/clock.ts`), so
that the screens read as the wireframe on any day.

The phone keeps that the User signed in, that the User agreed to the legal documents, what the sign-in suggested for
Onboarding, whether Onboarding is finished and its answers, that the User answered the explanation before the
location prompt (`locationExplained`), and the token of an Invite Link until its accept screen shows it
(`inviteToken`) (`src/storage/kept.ts`). A value stored by an older version, without a newer
field, reads as "not yet" for that field. `openKept()` is the read for the start of the app: it is the one that
honours `EXPO_PUBLIC_FIRST_STATE`, which clears all of it.

### The User's position

The User's own position is not a server's answer. A screen that shows it stands in a `PositionProvider` of
`@/position`, and every part of that screen reads it with one hook, `usePosition()`. The provider holds one
permission and one watch of the phone, however many parts read it; outside a provider the hook throws.

```tsx
<PositionProvider>…the screens…</PositionProvider>;

const { permission, position, stepMs, ask, retry } = usePosition();
permission; // 'checking' until the phone has said, then 'unasked', 'granted', 'refused' or 'blocked'
position; // LatLng, or null without the permission and until the first position comes
stepMs; // how long this position took to come after the one before, between 1000 and 5000: an Avatar's glide
await ask(); // shows the system's prompt and follows its answer
retry(); // starts the phone's watch again if it could not start
openLocationSettings(); // of `@/position`: the phone's settings of the app, for a `blocked` permission
```

- It reads the phone through `expo-location`, which `src/position/phone.ts` and `background.ts` alone name: the permission for the time
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
- The words of the system's prompt on iOS are in `app.json`, with the library's config plugin, which also gives
  Android the background location and foreground service permissions. iOS asks for no position in the background.
- `accuracy` is the radius in metres the phone places itself within, and `measuredAt` the time it measured the
  position. The walk gives an accuracy of 10 and the time it moves.
- `ask()` gives the answer, so that the switch on 내 정보 knows whether to turn on.

**Sending.** `PositionSending` (`src/position/sending.tsx`), inside the provider in the signed-in layout, sends each
new position to `POST /positions` while the Master Switch is on, the permission is granted and the app is in front,
on every tab: at most one upload every `POSITION_EVERY_MS`, one at a time, a newer position replacing one that
waits. It stops at once when the switch is turned off, the app goes to the background, the User signs out
(`useSending().stop()`) or the Session ends, and starts again in front. An answer `offCampus: true` shows the line
on 내 정보 until a position is kept again; 409 `MASTER_SWITCH_OFF` turns the switch off and fetches the Lobby
again; the 400s and no answer drop that position. The mock keeps the switch in memory, off at each start, refuses
positions while it is off and answers `offCampus` by the campus rectangle.

- The signed-in place's layout holds the provider, so the tabs and the screens above them share one watch.

**Sending in the background.** On Android, in a development build (not Expo Go), the row "백그라운드에서도 공유" under
the Master Switch on 내 정보 keeps the sending going once the app is in the background. The background permission is
asked only there, after the app's explanation; the foreground one stays the Master Switch's. While the Master Switch
is on, the User chose the row and the permission is granted, `BackgroundSharingProvider`
(`src/position/background-sharing.tsx`, inside `PositionSending`) runs `expo-location`'s updates as a foreground
service with a permanent notification (`background.ts`): a position every 30 s (`BACKGROUND_EVERY_MS`), told to the
task that `index.ts` defines before the screens (`background-task.ts`), since Android may start the app for the task
alone.

- Each run (`background-upload.ts`) reads what the phone keeps (`src/storage/kept.ts`): the sign-in, the Master
  Switch, which the provider keeps there, and the User's choice. It stops itself when one is off, sends nothing while
  the app is in front, where `PositionSending` sends, and otherwise sends the newest position of the batch to
  `POST /positions`. The decisions are in `background-rules.ts`, without device calls.
- The tokens are read from the secure storage first, so that the client renews the Session on a 401 also without the
  screens. `MASTER_SWITCH_OFF` keeps the switch off on the phone and stops; a 401 the renewal cannot mend,
  `SESSION_REPLACED` and a 403 stop; the 400s and no answer drop that position.
- It stops at once when the Master Switch or the row goes off, when the permission is taken back, at sign-out and at
  any end of the Session; the last two also forget the choice.
- The service ends with the app when the User swipes it away, and nothing restarts it while the app is closed. The
  next start of the app finds that it was running and the signed-in screens say "백그라운드 위치 공유가 멈췄어요"; it
  starts again while the app is open.
- On a phone the main server's address (`EXPO_PUBLIC_MAIN_SERVER_URL`) must be https: Android refuses plain
  connections outside a debug build, and a phone on campus reaches the servers only through the https tunnel they run
  behind, whose address goes there. The emulator's `http://10.0.2.2` works only in a debug build.
- What a person checks on a phone is in the P17 ticket (`.scratch/iteration-1/P17-background-sharing/`).

### The connection to the socket server

In a build that asks the main server, the app keeps one Socket.IO connection to the socket server open while the User
is past the sign-in and Onboarding (`LiveUpdates` in `src/live/live-updates.tsx`, on `src/live/connection.ts`), as the
socket server's README describes:

- It opens with the access token, which it asks for again at every attempt. When the socket server closes it at the
  token's expiry, or refuses the token, it renews the Session once and opens again; a refused renewal, or a second
  refusal, ends the Session. When nothing answers a renewal it tries again after five seconds.
- `session-ended` ends the Session, with the notice when its code is `SESSION_REPLACED`.
- `position` replaces that User's position in the cache, and the Avatar glides there; `position-removed` takes it
  out. A position for a Friend or a member whom the answers call unseen fetches those answers again.
- The positions are fetched when the connection opens, and everything it shows when it opens again after a drop. When
  the app returns to the front, the positions and the Quests are fetched again.
- A person's position ages by the app's clock (`now()`), looked at again every 30 seconds. Measured more than 2 minutes
  ago (`OLD_POSITION_MS`), it is old: the Avatar is drawn dimmed, a look of its own, its name reads "민준 · 3분 전" from
  the `names` level, and the Friend's card, row in the friend list and row in the friend panel add "3분 전 위치".
  Measured more than 10 minutes ago (`KEPT_POSITION_MS`, the main server's keep), it is no longer on the map. The rule
  is the same for a Friend and for a member of the User's Party; the limits are beside `POSITION_EVERY_MS`.
- The signals fetch what they name again: `friends-changed` the Friends, the positions and the Friend Requests,
  `quests-changed` the Quests, the invitations and the requests to join, `meetups-changed` the Meetups, `party-changed`
  the Parties and the positions, `global-events-changed` the Global Events and the Quests. When the app returns to the
  front, the lists of 알림, the Friend Requests among them, are fetched again too.

The app sends its own position over `POST /positions`, not over the connection (see "The User's position").

### From a mock to the main server

To connect one more operation:

1. Write it in `src/api/server/client.ts` with `call()` and a check of its answer in `answers.ts`. A refusal is thrown
   as an `ApiError` with the status and the main server's code.
2. If the answer's shape differs, change it in `src/api/types.ts`, then the mock, and follow the type errors into the
   adapter.
3. Keep the mock: the screens' tests use it. Test the operation against the fake main server.

No screen changes. Keep `.scratch/iteration-1/P06-login-map-timetable/todo.md`, section 3, in step.

## Design system

The app's look is the team's design system "SNU Now", the one the wireframes are drawn with, ported to React Native in
`src/design-system/`. A screen imports from `@/design-system` and writes no look of its own:

- **Tokens** (`tokens.ts`): `color`, `space`, `radius`, `size`, `shadow`, and the eight text styles in `text`, under the
  design system's names. A style spreads a text style and adds a colour: `{ ...text.body, color: color.inkMuted }`.
- **Font**: Pretendard, one file per weight in `assets/fonts/`, loaded by the root layout before any screen appears.
  A style sets `fontFamily` from `font` and never `fontWeight`.
- **Components**: Icon, Button, Chip, Badge, Avatar, MapPin, EventCard, TextField, ChatInput, BottomNav and Switch,
  with the names and properties of the design system's types. `BottomNav` has two additions that the `Main` wireframe draws:
  an item with `action` is the one action in the middle, its icon of 22 in white on a round fill of 44 in `snuBlue`
  with the shadow `shadow.navAction`, inside the bar, its label not shown and kept as what a screen reader says; and
  `line={false}` leaves out the line on top, for a screen that draws its own edge above the bar. A component of the design system that no screen uses yet is
  ported by the task that needs it. Where the web's differ from React Native's, the app's follow React Native: a press
  is `onPress`, and an image is a `source`. The design system's sizes do not count a border, so a size here adds it:
  a pin's head is 36 and its border of 2 on each side.
  Inside the design system the names are the design system's, also where the glossary prefers another word: its
  `Avatar` is a person's picture anywhere, its event kind is `official`, and a card's place is its `venue`.
- **Dialog**: the design system has none and the frames ask questions with two answers. `Dialog` shows a title in
  18/700, a sentence and one or two Buttons over the screen; `tone="danger"` fills the confirming answer in red
  (the Button variant `destructive`) for what cannot be taken back. Android's back button is its cancel.
- **The parts the screens around the map repeat**, which the design system lacks and the frames draw:
  - `AppBar`: a tab's (title 22/700, actions at the right) or, with `leave`, a sub-screen's (✕ "닫기" or the chevron
    "뒤로" in 48, title 20/700), with an optional count after the title ("퀘스트 12"). `IconButton` is an icon in 48.
  - `FullScreenPanel`: a screen above the tabs, white, with an app bar, what stays under it, a body that scrolls and
    an optional footer.
  - `SidePanel` (from the left, 324 wide, radius 24 at its right, the scrim) and `BottomSheet` (a handle, top radius
    24, the scrim). The scrim, Android's back button and, for the sheet, a drag down from its handle close them.
    They slide over 0.28 s, or appear at once where the phone asks for less motion (`use-slide.ts`), and are drawn
    in the `OverlayHost` (`Overlay`).
  - `SegmentedTabs` (48 high, the selected one underlined in navy, a count pill in grey or red), `ChipRow` (chips
    with counts that scroll sideways; `hideEmpty` hides those of 0), `SearchField` (with ✕ "지우기").
  - `ListRow` (an Avatar or a `RoundIcon` of 40, the name in 15/600 or 16/600 for `large`, an aside, a kicker, one
    or two lines, a trailing slot, 56 to 72 high over a line of 1, one button when it has a press) and
    `SectionHeader` ("공강 · 4").
  - `Switch`, React Native's switch in navy, and `SwitchRow` with a label and a description.
  - `EmptyState` (the caller's words in `inkFaint`), `LoadingState` ("불러오는 중") and `ErrorState` ("불러오지
    못했어요" and "다시 시도").
- **Toast**: the design system has none and the wireframes use one. It is the `Main` wireframe's: a dark bar from 16
  to 16 from the sides with a check mark before its words, and no shadow. `useToast()` gives the call that shows a sentence for 2.4
  seconds, or for the time given as its second argument (`showToast(words, 2000)`), and `useNotReadyToast()` the call
  for a control whose feature belongs to another task: it says "준비 중이에요". A toast sits just above the phone's own
  bar; a screen with something fixed to its bottom calls `useToastAbove(height, inFront)` so that it sits above that
  too while it is in front, as the tabs do. Of several screens that say so, the latest still in front wins.
- The app is light only. The design system has no dark theme, so `app.json` says `light`.

A repeated element that the design system lacks becomes a shared component here, not a copy in each screen.

`MapDot` is a marker from far away, which the frames draw and the design system does not name: the kind's colour in a
white border. A selected one is 4 larger, inside a ring of the key colour.

`MapPerson` is a person on the map, which the `Main` wireframe draws and the design system does not name: a teardrop
filled with a colour of `presence`, with the person's small Avatar in it, 24 wide in its `small` form and 36
otherwise. Its box ends at its tip. A selected one is 1.18 times as large, inside a white ring and a ring of the key
colour. `presence` names the colours of what a person is doing: `free`, `class`, `moving` and `off`, the statuses,
which an Avatar's dot uses too, and `member`, a member of the User's Party who is no Friend.

`MapRestaurant` is the `MapDining` frame's single 학식 on the map: a round of 22 in the dining colour with 학, a white
ring and a small tail; selected, 26 inside a ring of the key colour. `DayTile` is a day to choose as the
`PartyCreate` frame's date sheet draws it: 52 by 60, the day's name over its number, Sunday in red, Saturday in blue,
the chosen one in navy.

`MapPin` of the kind `me` has a `small` form, three quarters of its size, which the `Main` wireframe draws while the
whole campus is in view. The icons `chevronDown`, `chevronLeft`, `chevronRight`, `chevronUp`, `expand` and
`minus` are the wireframes' and not the design system's.

For what the `Main` wireframe draws over the map and the design system does not name, `tokens.ts` has `questTone`
(the colour of a Quest's row: `class`, `open`, `closed`), `onKey` (the dot and the muted text on a fill of the key
colour), `textHalo` (the white glow around text that sits on the map; the wireframe also strokes that text, which
React Native cannot), `mapText` (the sizes of the lists' and the buttons' text) and the shadows `mapMark`,
`mapRail`, `faceRing` and `floatKey`.

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
  // passive: it takes no press, and a press on it reaches what is drawn under it
  avatars={[{ id: 'me', name: '내 위치', position: mine, image: myAvatar, glideMs: 5000, order: 1, passive: true }]}
  route={line} // LatLng[], or null for none
  routeStyle={{ color: color.quest, width: 3, dash: [2, 6] }} // left out, the map's own plain line
  onPress={(id) => {}} // a marker's or an Avatar's id
  onCameraIdle={({ centre, zoom }) => {}} // once when the map is ready, then each time the camera rests elsewhere
  onFitZoom={(zoom) => {}} // the zoom at which the whole campus is in view, before the first onCameraIdle
  inset={{ bottom: 126, right: 62, left: 8 }} // what the screen's controls cover of the map's edges; left out, 0
  ref={map}
/>;

map.current?.moveCamera({ centre, zoom, animated: true }); // each of the three may be left out
map.current?.fitTo([from, to], { padding: 48, animated: true }); // the closest view that shows all the points
map.current?.fitTo([from, to], { padding: { top: 288, right: 108, bottom: 166, left: 46 } }); // room for controls
map.current?.fitTo([from, to], { padding: 48, maxZoom: 15.8 }); // and no closer than a zoom
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
  A `passive` marker or Avatar takes no press: `onPress` is never sent for it, and a press on it goes to what is
  drawn under it, another marker or the map. It is still drawn and still read by its `name`.
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
  into what the padding leaves of the view, and their middle comes to the middle of that. With `maxZoom` the camera
  comes no closer than that zoom: points that are near each other are shown from there.
- `CAMPUS_BOUNDS`, the campus rectangle, and the limits `MIN_ZOOM` and `MAX_ZOOM` are constants in
  `src/map/campus.ts`. The rectangle is a little wider than the Campus Boundary, which stays the main server's.
- The credit "© OpenStreetMap · 국토지리정보원" is on every map, inside the component, drawn by the app over the map,
  so no native module draws it. With `onCreditPress` it is a button, "지도 데이터 출처 보기", and is still written.
- **`inset`** says what a screen's controls cover of the map's edges, in points from each edge; a side left out is 0. The credit and a provider's logo are drawn inside what is left: the credit at its bottom left and the logo at
  its bottom right, each 8 from it. Nothing else follows it: the map is drawn under the controls, and the cameras
  may ignore it, so a move centres on the whole view and a fit takes its own `padding`. It may change while the map
  is shown.

### Which map is shown

The component chooses while the app runs (`src/map/map.tsx`), by whether the build holds the native map module
`SnuNowMap`:

- **With the module**, it shows the native map, `src/map/native-map.tsx`. That file is loaded only then, and it is
  the only file that may name the native view. A build for Android or iOS holds the module (see "The Android
  module" and "The iOS module" below).
- **Without it**, which Expo Go, the web and the tests are, it shows the plain ground (`src/map/plain-map.tsx`) with
  the words "지도는 Android·iOS 빌드에서 보입니다". It is no stand-in map: it has no tiles and draws no campus, and a User
  cannot pan it. It follows the camera's rules (`src/map/projection.ts`) and places what it was asked to show by
  position: each marker and Avatar as the design system's own view with its `text` under it, and the route as
  straight strokes, or as the dashes of a dashed `routeStyle` (`src/map/plain-route.tsx`). So `moveCamera`, `fitTo` and a moved Avatar are seen, and a screen can be laid out around it.
  An Avatar glides there too, unless the phone asks for less motion.
- On the plain ground each marker and Avatar is a button under its `name`, with the look's name as its `testID`,
  and the route is read as "경로가 그려져 있습니다". A passive one is a picture under its `name`, not a button, and
  takes no pointer events. The `text` under a marker is the `Main` wireframe's name: 11/16 in the bold weight on a
  white round, 3 under the marker's foot. One outside the view is not drawn and stays in the tree under its name. So a
  screen reader, and a test, reach everything the map was asked to show. In a test the ground is as large as the
  window until it is laid out.

### Marker images

A native map draws images, not React views. An image is a picture of the design system's own marker view, made once
for each look and kept for as long as the app runs:

- A look (`MarkerLook` in `src/map/marker-looks.tsx`) is one of three:
  - the User's own Avatar: `MapPin` of the kind `me`, and its `small` form under the name `me:small`;
  - a person: `MapPerson` with the letters or the photo, in a `tone` (a status, or `member`), `small` or at full
    size, `selected` or not, named by the person's `id` and by whether there is a photo, such as
    `person:full:free:f1`, `person:full:free:f2:photo` and `person:small:member:pm1:selected`. The photo's address,
    which is new with every answer of the server, is no part of the name;
  - a place of each kind of the design system, as a `dot` from far away or a `pin` from close, a pin with its
    `count` when it has one, `selected` or not, such as `official:dot`, `party:pin:4` and `party:pin:4:selected`.
- Two looks that draw the same picture have the same name, so the pictures stay few: two for each person in each
  tone the person was seen in, a dot and a pin for each kind of place and count, and the selected look of the one
  thing that is selected. No look has
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
  outside the screen, `MarkerImageStage`, which the app shows once around every screen, with clear room of 12
  (`IMAGE_MARGIN`) for its rings and shadow, and `react-native-view-shot` captures it as a PNG file in the phone's own pixels.
- A capture that gives no picture is tried again, four times in all, after 0.5, 1 and 2 seconds. A look whose tries
  are used up is tried again when a screen that asks for it is next shown.
- A look with a photo is captured when the photo is shown. After three seconds without it the picture is made with
  the letters, and made again under the same look when the photo comes.
- Without the module, as in Expo Go, on the web and in a test, no picture is made and `uri` stays null: the plain
  ground draws the view itself.

On Kakao's map a picture is drawn pixel for pixel, at the view's size and with its shadow. No picture is released
while the app runs: there is one small file per look, and the looks grow only with the Friends a User has and the
tones they are seen in. A person whose name or photo changes keeps the picture made first until the app starts
again. `src/map/marker-looks.tsx` lists what a release of unused pictures has to cover.

### The Android module

`modules/snu-now-map` is a local Expo module, in Kotlin, around Kakao Maps SDK for Android 2.15.2. Expo links it
into every build for Android; `src/map/native-map.tsx` hands it the interface, flattened, and the colours and sizes
of the design system's tokens. How it keeps the rules:

- **Zoom**: the SDK takes whole levels only. The module measures the Web Mercator zoom from what the view's width
  shows, and sets a fractional zoom through the camera's height, whose relation to the zoom it measures once when the
  map is ready.
- **The rectangle**: the SDK does not keep the camera inside one. When a move ends outside the rules, the module
  moves the camera back inside, at once, and reports only a camera inside them.
- **Markers and Avatars** are labels on two layers, the Avatars' above the markers', ranked by `order` and their
  place in the list. A label is drawn once its picture is there; its `text` is the SDK's own text under it. An Avatar
  glides at an even speed, from where it is shown.
- **The route** is the SDK's route line, under the labels: a solid line in the colour and the width of `routeStyle`.
  It does not draw the dashes yet.
- **In TypeScript**, `src/map/native-map.tsx` keeps what the interface gained after the module was written, with the
  sums of `src/map/projection.ts`, which the module's Kotlin repeats:
  - the fit zoom, which the module does not send, from the view's size as it is laid out. `onFitZoom` is told before
    the first `onCameraIdle`, which is kept back until then, and again when the size changes;
  - a fit, worked out once the view's size is known and sent as the module's `moveCamera`, so that a padding for
    each edge and `maxZoom` hold. Before that, the module's own `fitTo`, which takes one number, is asked with the
    largest side of the padding;
  - a passive marker's press, which the module sends, is dropped. A marker under a passive one still cannot be
    pressed on a phone: that is the module's to add.
    None of this was checked on a phone.
- **Kakao's logo** stays as it is, moved to the bottom right, apart from the credit at the bottom left. The module
  places it 8 from the bottom right of the whole view and does not read `inset` yet, which `native-map.tsx` hands
  it with all four sides: until it does, the main screen's controls cover the logo.
- **The screen**: the module starts the SDK with the key when the app starts, and pauses and resumes each map when
  the app leaves and comes back to the screen.

The module cannot be tested with Jest: Jest runs without it. It is checked by hand on `/map-check`, against the
device check of the spec. `native-map.tsx` is tested with the module's view mocked
(`__tests__/map-native-view-test.tsx`).

### The iOS module

The module's iOS side is in Swift, in `modules/snu-now-map/ios/`, around Kakao Maps SDK for iOS 2.12.19, taken as the
CocoaPods pod `KakaoMapsSDK`. Expo links it into every build for iOS. It takes the same view, with the same props and
calls, as the Android side, and keeps the rules the same way: the zoom through the camera's height, the camera brought
back inside the rectangle after a move, markers and Avatars as the SDK's Pois on two layers, its own glide, and the
SDK's route line under them. What is different:

- **The engine**: the SDK starts nothing by itself. Each map view prepares and activates Kakao's engine when it is put
  in a window, and pauses and resets it when it leaves, which frees the map. When the app goes to the background the
  engine is paused and keeps what it shows; it is activated again when the app is active.
- **The size**: the module sets the map's size whenever the view's size changes, a first size of zero included. The
  SDK refuses to prepare an engine whose view has no size yet, so the engine is prepared on the first layout that gives
  the view one.
- **Zoom**: as on Android, through the camera's height. The SDK answers a point on the view's right or bottom edge as
  outside the map, so the zoom is measured from the left edge to the middle; and the scale is measured again after
  each move the module makes, since one measured while the view still takes its size is off.
- **Calls before the map is ready**: a `moveCamera` or `fitTo` that comes before the map is ready is kept and
  carried out once it is.
- **Pixels**: the SDK draws its pixels at half the screen's scale, so a picture is handed over at twice its size in
  points, and the text and the route's width likewise. A picture is redrawn in 8-bit RGBA: the SDK throws, and the app
  quits, on one in a wider format.
- **Markers, Avatars and camera moves** are read from plain dictionaries rather than Expo's records, which refuse the
  `null` that the component sends for a picture not made yet or a marker without text. Expo drops such a prop without
  a word.
- **Kakao's logo** stays where the SDK puts it, at the bottom right, apart from the credit at the bottom left.

### Trying it

`/map-check`, opened as `/catalogue` is (`snunow://map-check` in a development build), shows the component with sample markers,
Avatars and buttons that move the User's Avatar, draw and clear the route line, fit the camera to the route, zoom in
and show the whole campus. It says what was pressed and where the camera stopped. It is for developers: a released
app does not show it. The native modules are checked on it.
