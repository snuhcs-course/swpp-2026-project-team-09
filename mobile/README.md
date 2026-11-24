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

A package with native code, `app.json`, and the config plugins are the app's native part. Any edit to them, a
comment included, needs a new native build before updates reach phones again (see the repository's `CLAUDE.md`, "The
app's native files").

### Development settings

A setting is an `EXPO_PUBLIC_` variable given when the app is started, for example
`EXPO_PUBLIC_MOCK_FAIL=listFriends pnpm start`. A released app ignores all of them. The build settings of a released
app, such as `EXPO_PUBLIC_RELEASE_TAG`, are not development settings: they are listed in
[the Production APK](../infra/production/README.md#the-production-apk).

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
the computer as `10.0.2.2`, and every build allows plain HTTP. A phone needs an address it can reach.

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

On a computer without an ARM emulator, such as an x86_64 Linux machine, a development build can add `x86_64` for an
x86_64 emulator: generate the project with `ANDROID_X86_64=1` (`app.config.ts` adds the ABI beside `arm64-v8a`).
Everything but Kakao's map runs there, which is how the text recognition below was checked: Kakao's library has no
x86_64 build, so the map module logs that it could not be loaded and the map stays blank. `KAKAO_NATIVE_APP_KEY`
must still be set, to any value, or the SDK refuses to start and the app with it. It is a development setting:
generate the project again without it before a release build.

```bash
ANDROID_X86_64=1 pnpm expo prebuild --platform android --clean
pnpm android
```

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

A release build uploads its source map to Sentry and fails without `SENTRY_AUTH_TOKEN`; `.env.example` sets
`SENTRY_DISABLE_AUTO_UPLOAD=true`, which skips the upload. A debug build uploads nothing. See "Crash reports".

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
host the build declares no App Link, and a link opens the app only through `snunow://invite/<token>`: the https
address opens the main server's page in the browser, whose button opens that.

`pnpm android` generates the Android project in `android/` (not committed), builds the app, installs it on the
running emulator, opens it and starts the development server. The first build takes 15 to 30 minutes; later ones a
few minutes.

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
itself took 5 minutes on an Apple Silicon Mac. A link that opens the app on the simulator asks "Open in “SNU Now”?"
first.

On an iPhone: connect it with a cable, trust the Mac on the phone, and turn on Developer Mode under Settings > Privacy &
Security. Open `ios/SNUNow.xcworkspace` in Xcode once and, under the target's Signing & Capabilities, choose a team.
The choice is in the generated project, so after `ios/` is deleted or generated again with `--clean`, choose it
again. Then run `pnpm ios --device` and choose the phone, and on the phone trust the developer under Settings >
General > VPN & Device Management. A personal team of a free Apple ID can sign the app, for 7 days at a time, if no
other team has taken the bundle ID; otherwise the phone build needs the team's Apple Developer account.

- Signing asks for the login keychain's password once for each framework in the app. To be asked no more, run
  `security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k '<the Mac's password>'
~/Library/Keychains/login.keychain-db` once.
- A debug build loads its JavaScript from the development server: the phone and the Mac must be on the same Wi-Fi,
  and the phone must allow the app on the local network.

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

| Command             | Checks                                                                |
| ------------------- | --------------------------------------------------------------------- |
| `pnpm lint`         | oxlint with type-aware rules, and that each test file names its level |
| `pnpm format:check` | Prettier formatting (`pnpm format` fixes it)                          |
| `pnpm typecheck`    | TypeScript in strict mode                                             |
| `pnpm test`         | Jest tests in `__tests__/`                                            |

Each test file names its level ([ADR 0007](../docs/adr/0007-test-levels-by-what-a-test-starts.md)). A
`.unit.test.ts(x)` file calls one module, a function, hook or component, whose collaborators are pure code or
stand-ins. A `.integration.test.ts(x)` file starts the app's router over the mocks or the fake main server, or runs
several of the app's layers together, such as a hook over the API client and its mocks. `pnpm test:unit` and
`pnpm test:integration` run one level each; `pnpm test:cov` and `pnpm test:cov:unit` also measure the coverage of every
file in `src/`, written to `coverage/`.

A test may take up to 60 seconds: the first test of a file that touches a text input or an animation loads those
parts of React Native, which is slow on a machine that has not run the tests before, as in CI.

## Device runs

Two journeys run a release build of the app on an Android emulator, driven by Maestro. M1 is a first run, from the
sign-in through the consent and Onboarding to the map, and a relaunch that opens the map without signing in again
(US-AUTH-01, scenario 1). M2 opens an Invite Link from outside the app, on a cold and on a warm start, and accepts it
(US-FRIEND-01, scenario 2). The app answers from its own mock data and reaches no server, so they are integration
tests ([ADR 0007](../docs/adr/0007-test-levels-by-what-a-test-starts.md)): their flows are in `maestro/integration/`
and the steps they share in `maestro/subflows/`. Neither `pnpm test` nor CI runs them. Run them after changing a
screen they pass through, on a Mac with Apple Silicon and the tools of "Build the app for Android".

### The mock APK

```bash
pnpm build:mock-apk
```

It builds `android/app/build/outputs/apk/release/app-release.apk` with Homebrew's JDK 17 (`brew install openjdk@17`;
JDK 25 breaks the build). The main server's and the socket server's addresses, Google's web client ID and
`INVITE_LINK_HOST` are empty for the build, so the app signs in by its mock, answers from its mock data with the clock
at the wireframes' moment, and opens Invite Links only through `snunow://`. The rest comes from `.env`, which needs
`KAKAO_NATIVE_APP_KEY`: Kakao's SDK refuses to start without it. `ANDROID_X86_64` is unset, so the APK is for
`arm64-v8a` alone, and it is signed with the debug key of Expo's template, as the dev APK is. The build generates
`android/` again (`expo prebuild --clean`); after it, `pnpm android` makes a development build again.

### The emulator

The runs are made on one emulator: the system image `system-images;android-36;google_apis_playstore;arm64-v8a`
(API 36, Google Play, `arm64-v8a`) with Android Studio's "Medium Phone" device profile, here an AVD named
`Medium_Phone`. For a run whose result is reported, boot it cold and wait until it has started:

```bash
$ANDROID_HOME/emulator/emulator -avd Medium_Phone -no-snapshot-load -no-audio &
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = 1 ]; do sleep 2; done
```

The first runs, on 2026-10-23, used the emulator 37.1.11 and the system image's revision 7. Stop the emulator with
`adb emu kill`.

### Maestro

Maestro CLI 2.11.0, which runs on JDK 17. Download `maestro.zip` from the release `cli-2.11.0` of
`mobile-dev-inc/maestro` on GitHub and unpack it so that the CLI is `~/.maestro/bin/maestro`. `pnpm test:device` adds
that folder to `PATH` and points `JAVA_HOME` at JDK 17 itself.

### The command

With the emulator started and nothing else connected:

```bash
pnpm test:device
```

It checks that exactly one device is connected, with ABI `arm64-v8a` and API 36, and that `maestro --version` prints
2.11.0; turns the emulator's window, transition and animator scales to 0; reinstalls the mock APK; and runs
`maestro test --format junit` over `maestro/integration/`. Each flow starts with a launch that clears the app's state,
and the relaunch in M1 keeps it. The flows grant the app no permission: granted the location, the app watches it, and
Google Play services may ask over the map to turn on Location Accuracy, a system screen that depends on the emulator's
settings. So the app explains the location once on the map, and the flows answer "나중에".

M1 and M2, on a cold and on a warm start, pass.

Each run writes into its own folder under `device-results/`, which git ignores, named by the date, the time and the
commit, such as `device-results/2026-10-23T001807-74381a9b/`. It holds `report.xml`, the JUnit report, and Maestro's
output, a folder for each flow: the screenshot of each checkpoint in `takeScreenshot/`, Maestro's log and the
emulator's logcat in `logs/`, and for a failed step the screen and its hierarchy. The logcat holds the Kakao key that
the map sends, so share the report and the screenshots, not the logs.

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
src/library/        관정도서관: the library client, its hidden web view and login, and the end of its session
src/update/         the check at start for a newer native build, and its dialog
src/push/           the wrapper over the notifications library: the permission, the Expo push token, the channel
src/telemetry/      crash reports: the only folder that imports Sentry, its scrubbing, and the error boundary
src/screens/        the screens that the routes show; a screen of several files has a folder
modules/            the native modules, local Expo modules: the map (snu-now-map), text recognition (snu-now-ocr) and
                    the web views' cookie clearing (snu-now-web-cookies)
__tests__/          Jest tests
maestro/            the device runs' Maestro flows: integration/ holds M1 and M2, subflows/ the steps they share
scripts/            the device runs' two commands: build-mock-apk.sh and test-device.sh
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
  정보 `/me`. 올리기 is no tab: it opens 파티 만들기 (`/party-form`) empty above the tabs, and 뒤로 shows the tab it
  was pressed on. A tab stays mounted while another is shown, so the map keeps its native view, its camera, the open
  card, the route and the collapsed lists. The bar has no line on top but the
  frames' shadow (`shadow.nav`), and under its items 16 or the phone's own inset, whichever is larger
  (`navPaddingBottom` in `src/screens/shell/layout.ts`). The number on 파티 is `usePartyBadge()`: the rows of 알림
  that wait for the User and concern 파티, every row but the kept Notifications and the Friend Requests. While the
  lists load, and when every one failed, there is no badge.
- 파티, 행사 and 내 정보 are a `TabScreen` (`src/screens/shell/tab-screen.tsx`): the tab's app bar on the grey ground.
  파티 has "+ 만들기" and the tabs 찾기, 내 파티 and 초대; its address names the tab (`/party?tab=invites`). 내 정보's
  address can ask for its 위치 공유 card (`/me?show=sharing`), and 행사's marks one Global Event (`/events?focus=<id>`).
  파티, 행사 and 내 정보 are described below.
- **Screens above the tabs** are routes of the stack: the Quest list on the whole screen (`/quests`), 알림
  (`/notifications`), 프로필 편집 (`/profile-edit`), 시간표 (`/me/timetable`) and its class form
  (`/me/timetable/class`), a Quest's room (`/room/<questId>`), the map view of the place picker (`/place-map`), 전체
  파티 (`/boards`), a board (`/boards/meal`), 파티 모집글 (`/post/<questId>`), 파티 만들기 (`/party-form`, and
  `/party-form?questId=<id>` for its edit mode). Each is a `FullScreenPanel`
  and slides in over 0.28 s, from the bottom for `/quests` and from the right for a pushed screen,
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
  full name under it from the `names` level. A Friend whose position is at the exact level (`Position.level`) carries
  a green dot at the face, none at the building level or while dimmed. A live position's level replaces the one before; one without a
  level keeps it. A Friend whose position is not known has no marker. The Global Event,
  the User's Party and a Shared Quest are dots while the whole campus is in view, pins from the `pins` level and pins
  with a short name from the `names` level. A Party's pin counts its members; a Global Event's counts the Quests
  that gather for it (`GET /quests/recruiting`) when they are more than one. Of the Global Events, only Favorite Events
  stand on the map (`src/features/map/event-pins.ts`), unless the interest marks keep them: once the main server
  answers the matches, every event goes to the marks, which keep one mark per place for what matches a watched
  interest, with "!" on what is new (`src/features/map/interest-marks.ts`); the others are in the 행사 tab only. A
  Favorite Event is the official pin with a filled star at every zoom, and so is a place one of whose events is one.
  With the whole campus in view, events' pins that would overlap merge, as study pins do
  (`src/features/map/event-merges.ts`), into one official pin with their count, the star when one is a Favorite Event,
  and an interest mark's "!" first; a press zooms in to them. A short name is the title cut at a word's end within 8 characters,
  counted in whole characters, so that an emoji is never cut. A given name is the name without its first syllable for
  a Korean name of three syllables, and the whole name otherwise (`src/features/map/short-name.ts`). A marker is read as the wireframe reads it: "김민준 · 공강 · 중앙도서관 근처 · 15:00까지 비어 있어요", "공식 행사 · AI 커리어
  설명회". The selected marker has the selected look and is drawn above the others, the User's own Avatar included.
  A Friend's or a member's Avatar whose position was measured 2 minutes ago or more is dimmed (the look `stale`,
  a picture of its own), and its card's line says "마지막 위치 {n}분 전"; at 10 minutes it leaves the map, while the
  Friend's row stays in the list. `useMapCards()` checks the age every 15 seconds and whenever a position arrives.
- **Cards.** `useSelection(cards)` holds what is selected: `selected` (the open card), `open`, `select(id)` and
  `close()`. A press on a marker selects it and opens its card (`card.tsx`) in place of the one that was open; the
  card's X and Android's back button close it, the button only while the map is in front; a press beside the
  markers leaves it open. A card whose thing leaves
  the map, such as a Friend who turns their location off, is closed for good: it does not open again on their return. The card shows the leading
  mark (a person's Avatar, or the place's icon on its kind's colour), the sub-label, the title, the lines and its
  button. "가까이 보기" is offered below the `names` level and brings the camera to the `close` level, keeping the
  card. On the card of a Party that others may join, "파티 열기" and "참여하기" open the Quest's room; on a Party
  member's card, "파티 열기" does what "활성 파티" does. "같이 갈 사람 찾기" opens 파티 만들기 with the Global Event
  chosen, as `+ 파티 모집` of the 행사 tab does; "파티 만들기" says "준비 중이에요". The
  room's member list shows a member by the main screen's address, `/main?person=<userId>`: the map goes to the
  Friend's or the member's Avatar at the `close` level and opens its card. While a card is open the zoom
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
  back draws nothing by itself. A tap on empty map clears the line too (`route.clear`, P15 ticket 55): a tap that no
  mark keeps, on the everyday map, where `GET /places/at` finds no Place or cannot answer (`onEmptyTap` of
  `usePressedPlace`). A tap that opens a card leaves it, "새 대화" and closing the answer frame leave it, and once
  cleared the opening route is not drawn again until the screen starts anew; a tap before it was asked, as before the
  first position, changes nothing, and it still comes.
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
    map's credit, on what stands at the left above the AI input or on the input; while a card is open, under both is
    the credit's strip on the card. The Quest column is 182 wide; the friend column is 160 or, on a screen narrower
    than 374, what the Quest column leaves (`friendsWidth`), 146 at 360, so the two never share a point.
  - A Friend's row has the dot in the status's colour (`presence`), the name and the line. Against the main server,
    which serves no statuses, the line is the Place nearest the Friend from `GET /positions`'s `nearPlace`
    ("중앙도서관 본관", or "위치 켜짐" while it is not known) or "위치 꺼짐", with "· N분 전 위치" after an old
    position; the mock's statuses give "공강 · 중앙도서관". The Friend's card has the walk from
    `walkMinutes`: "도보 N분", "근처" for the same Place, and nothing while the User's own position is unknown.
    "수업 중" and "이동 중" wait for the FriendView of the Friend levels. A press brings the map to the Friend at the `close` level and opens their card; for a Friend whose
    position is not known it opens the same card without moving the map.
  - A Quest's row has the round with its icon, the kicker, the title and the time with the place, and the rail joins
    the rounds. The adapter says the row's `tone` and `icon`: a class is `clock` in grey; `open`, a Party that
    others may join, is `users` in blue; `closed`, a Party that takes nobody else and a Shared Quest, is `lock` in
    the Party's colour (`questTone`). A press on a class's row brings the map to its place at the `names` level,
    closes an open card and says "<title> · <place>", "자료구조 · 301동 118호"; any other row opens the Quest's
    room.
    Without a Quest the list says "오늘 일정 없음".
  - While a list's data is loading, and after a failure, its pill has no number and the list has no rows.
- **The controls above the navigation** (`bottom-controls.tsx`): "활성 파티", shown only while the User is in a Party, with "<n>명 공유 중" for
  the members who share their position, the User left out, or "응답 대기" when nobody else does
  (`useActiveParty()`); the 편의기능 button (`layers.tsx`, below); and the AI input. "활성 파티" opens the room of the
  Party's Quest, or, for a Party tied to no Quest, which has no room, asks "활성화에서 나갈까요?" and leaves it
  (`use-active-party-room.tsx`). A message sent from the AI input opens the answer frame (below).
  - The AI input (`ai-input.tsx`) is a field with the placeholder "무엇이든 부탁해 보세요". It grows with
    its text from 40 to 120 and then scrolls, its corners going from 28 to 22 once it holds more than a line; Enter
    starts a new line, and only the send button sends. It takes at most 1,000 characters, as much as the main server
    takes in a message. The send button is `snuBlue` while there is something to send,
    and grey and disabled while the input is empty or the Assistant works. Speech input and autocomplete would attach
    to it. While its keyboard is up, a transparent scrim ("키보드 내리기", `keyboard-scrim.tsx`) lies over the map,
    the lists, the zoom control and an open card: a press or a drag there only puts the keyboard down. The bar, the
    examples and the answer frame's card and pill stand over it, and a press on the pill beside its buttons does the
    same.
  - "활성 파티" never shrinks: its two lines stay whole on a screen narrower than the wireframe's 390.
- **The answer frame** (`answer/answer-frame.tsx`), the one screen of the conversation with the Assistant. While the
  bar has the keyboard and nothing is asked, the three examples of the empty chat stand above it as chips with an icon
  in their layer's colour, 배고파 (식당), 오늘 볼 만한 거 있어? (the Party's) and 공부할 자리 (공부공간), with
  the line "대화 내용은 AI 제공자에게 전송돼요" (`answer/asked-examples.tsx`); a press sends the example as the
  User's message. Once something is asked, what the User asked last stands as a pill at the top left with "답 닫기"
  (✕) and the round "새 대화" at its right, and one white card at the bottom of the screen holds the rest of the turn
  (`turn.ts`) without bubbles, the question as a grey line first, with the bar under it ("이어서 말하기"). While the
  Assistant works, the card keeps the height it had and shows the question with the waiting dots (`WaitingDots`, read
  aloud as "보는 중") and the round stop button "그만" in place of the reply; the bar stays, and a message sent then
  takes the waiting question back, as anywhere else. A card's button whose answer is on its way ("여기서 먹기",
  "만나고 싶다") shows the dots in place of its label (`Button`'s `busy`). A reply whose answer has a Plan shows the
  Plan's two lines (`answer-lines.tsx`) in place of the model's sentence. A reply to a message that asked for two or
  more things ("관정 갔다가 저녁") lists its `steps` above, numbered in time order (`reply-steps.tsx`): each one's time,
  title and where it sets out from, "예약 카드는 아래에 있어요" for a booking, and the reason of a step that was not
  done. Any other reply is drawn with the chat's own parts (`chat-bubbles.tsx`'s `BubbleParts`): the text as Markdown, the cards with their buttons, a Proposal, the map
  buttons, and "다시 시도" under a failure. Under the reply on screen, up to two follow-ups in cells of one width
  (`follow-up-chips.tsx`, `features/assistant/follow-ups.ts`) send whole sentences filled from the reply: the next
  meals of a meal's Plan ("오늘 저녁 배고파", or "김민수랑 내일 저녁 먹자" with its Friends), "{친구}랑 같이 밥 먹자"
  and tomorrow's meet under a meet, "같이 갈 파티 있어?" and tomorrow's under a day's events, "{친구}랑 같이 밥
  먹자" under a Friend's Lookup, tomorrow's menu under a menu's, "운동 파티만 보여줘" under parties and "다른 열람실"
  under a seat card; none under a refusal, a reply with its own offers, a failure or an answer without a Plan. The
  lists, the row of buttons, 편의기능, the zoom control, the selected thing's card, and the tabs give way, and a
  marker takes no press. Another card leads where it
  does and leaves the frame as it is. A send puts the keyboard down, and the map's credit sits above the card once it
  is laid out.
  - Leaving the frame hides it and keeps the conversation (`use-kept-conversation.ts`): ✕, Android's back button, a
    card's "닫기", a map button, which also turns its layer on, and the start of route guidance. A reply on its way
    still comes and is kept. While the frame is hidden, the map is the everyday map, without the answer's marks, and
    its presses and cards work as without a conversation; the AI input has the round "이전 답" at its left, which shows
    the frame again at the turn on screen as it was, with the answer's marks and camera. A reply that arrived while
    the frame was hidden puts a red dot on it until the frame is shown. The frame's own way out (✕, back, a card's
    "닫기") brings the camera back to where the everyday map was when the frame was shown (`use-camera-back.ts`); a
    map button and route guidance leave it to their own moves. A message sent from the
    everyday map goes on with the conversation and shows the frame, and so does any turn a card's button or a mark
    asks. "새 대화" forgets the conversation and closes the frame, and the toast "대화를 지웠어요" offers 되돌리기 for 5
    seconds, which brings every turn back while nothing new was said (`forget-with-undo.ts`); it is the only way the
    conversation is forgotten while the app runs. "그만" takes the question on its way back and drops its reply when it comes: the frame shows
    the turn before, or closes when there is none.
  - When the conversation has turns before the one on screen, "지난 답 N개" under its reply opens them below it, the
    latest first, read-only (`earlier-turns.tsx`): for each, the words asked, the reply's lines (a Plan's first
    Plan's, a Lookup's, or any other reply's words), and its cards' names. "접기" closes them.
  - While the keyboard is up, the card shows one line in place of its content, cut to fit (`keyboard-headline.tsx`):
    the headline of the turn on screen, which is the Plan's first line as its card draws it, the Lookup's title, or
    the reply's first line, or the dots while the reply is on its way. The map is left as it is.
  - The conversation (`chat-sheet.tsx`, whose chat sheet is gone, and `useChat()` in
    `src/features/assistant/use-chat.ts`) lives in memory, held by the main screen, so it stays while the app runs and
    restarting the app loses it. The server stores none of it. Each message sends the latest 20 messages of the
    conversation (`askAssistant`, `messagesToSend`), the Assistant's with the cards they showed, and fewer while they
    hold more than 24,000 characters. A failure is left out of what the next message sends. When the server cannot
    answer, the card says so with "다시 시도", which sends the User's message again in its place; once the User's
    messages of the day are used up (429), it says "오늘은 여기까지 답할 수 있어요. 내일 다시 물어봐 주세요", without
    "다시 시도".
  - Every request carries a context with the User's position on campus, the capabilities `library`, `answer`, `area`,
    `meet`, and `events`, and the map's visible area at rest as `viewport` (`useViewport`: the stage under the status
    bar at the camera, null until both are known). A `study` Lookup ("이 근처") outlines the area its request sent,
    leaves the camera where it is, and adds the free seats the phone reads from its own library session to the flag
    towards 관정 (`study-area.ts`, `use-away-seats.ts`); its card's main button reads "가는 길", and its `ask` action
    "관정 보기" sends its words as the User's.
  - While a meal's Plan is on screen, a press on a building recalculates the conditions with that Place fixed and
    shows "여기면 어때?" over the Plan, which stays underneath: each person's arrival, the time together against the
    Plan, "여기로 바꾸기" and "그대로" (`use-how-about.ts`, `how-about-card.tsx`); "그대로", the pill's ✕, and Android's
    back return to the Plan.
  - A Restaurant card of a 공강에 밥 answer (`chat-restaurant-cards.tsx`) shows the name, "63동 · 오늘 점심", "식사 가능 시간
    N분", the first two menu lines with "외 N개", a chip per person, "{name} {도보|셔틀} N분" or "{name} —", with the
    longest highlighted, and 파티 만들기, which opens the party form filled from the card's Proposal as 수정 does, with
    no model call.
- **The answer on the map** (`use-answer-map.ts`, `use-map-view.ts`). The answer on screen is that of the
  conversation's last reply (a failure and the app's own bubble are none), so it stays while a follow-up waits or has
  failed, or a recalculation that replaced it, held with the index of the Plan on screen and whether its basis is open
  (`useShownAnswer` in `src/features/assistant/use-shown-answer.ts`, read through the chat control's `answer`). While
  it has a Plan, the map draws what `drawingOf` (`src/features/assistant/answer-marks.ts`) gives for it, and nothing
  else of the everyday map: each mark is an `answer` look, one symbol at a point and its label at the first free side,
  and a candidate's mark takes a press, which shows its Plan; each route is a solid line. A walked route (one whose
  `mode` is absent or `walk`, never a shuttle's ride) follows the path `GET /walking-route` gives for its two ends,
  joined onto them, in its own colour and width, and stays straight while that is on its way, when it fails and when
  no path is found (`useAnswerWalks`, `use-answer-walks.ts`; P15 ticket 56, pending the owner's decision on Kakao's
  rule). Only the scene on screen is asked, at most `WALKS_PER_SCENE` (3) walks, each pair of ends once, the people's
  ways before the way on to the next Class; a scene that leaves the screen gives its requests up and keeps nothing, so
  one shown again asks again. The minutes shown stay the main server's. The markers of
  events, Quests, Restaurants, Study Spaces, and the shuttle, the shuttle's line, a walking route, the tutorial's pin,
  the shuttle's vehicles, and the User's own Avatar give way; the Avatars of Friends and of the other people of the
  User's Party stay, but for those of the Plan's people, whom the marks draw, and those near one of the Plan's own
  marks, which they would lie over (`nearOwnMark`). A face shows two characters of the name, so its tag leaves out a
  name that short ("18분" beside the face "민수"). A face's ring says how the Friend is seen: a green dot at its lower
  right for the source `exact`, a plain ring for `building`, and a dashed one for `timetable`. The looks of every Plan
  are asked for when the answer comes. The camera
  goes in one glide to where `answerCamera` (`src/features/assistant/answer-camera.ts`) works it out for the view:
  the fit of the answer's points between the pill and the card, with the room the marks there need (`roomsOf`) and 64
  at the sides, no closer than the "close" level; where a campus map's lowest zoom is too close for all of them, the
  Plan's own points centred there, or, when they do not fit either, the picked Restaurant's side kept in view. It moves
  again when the Plan on screen changes and when the card's height or the stage's size changes; after an answer replaced
  the one on screen, as a recalculation's does, it moves once, when the drawing and the card's height have stayed the
  same for 120 ms. Closing the answer moves nothing. While a Plan is drawn the map is handed Kakao's level 14 as its
  lowest in place of 15, which on a phone is closer than that lowest zoom. The card shows "근거" (or "근거 접기") at the right
  of its chips' first line, the Plan's two lines, the basis while it is open, and, when the answer has more than one
  Plan, round buttons "‹" ("이전 후보") and "›" ("다음 후보") at the two ends of the last row, 40 high as its buttons are, with
  "되돌리기" at a fixed width at the row's start while a drag is kept and the count ("3/5") in a box of its own right before
  "›"; a sideways swipe over the two lines does the same, to the left the next Plan and to the right the previous one.
  The arrows and the swipe go round, and a new Plan closes the basis. An answer without a Plan draws nothing and keeps
  the everyday map.
- **Correcting the answer** (`answer/plan-card.tsx`, `answer/use-corrections.ts`). The card's first row holds the
  answer's chips (`condition-chips.tsx`) and "＋ 같이", in lines that wrap so that no chip is cut. The ✕ of a person's
  chip takes the person out; "＋ 같이" lists in the card the User's Friends who are not in the conditions in the design
  system's `ChoiceGrid` (`friend-choices.tsx`): two columns of equal cells, each with the given name and the distance
  to the picked Restaurant ("350m", "1.2km"), "N분 전" for an old position, or "자리 모름", nearest first. While the
  list is open the card's lines ask "누구와 같이 먹을까요?", "그대로" stands where "근거" did and closes it, the band,
  the arrows, and the input give way, and the grid shows at most four whole rows that scroll inside, with a fade
  while more are below; its second line says "지도의 얼굴을 누르거나 아래에서 골라요" while a Plan is drawn, and
  "가까운 친구부터 보여요" over an answer without one, whose map takes no press on a face. A press on a cell adds the Friend,
  as does a press on the Avatar of a Friend who is not in the conditions, which carries a "+" (the person look's
  `addable`) until "이대로 초대". Both start one add (`add` and `pendingAdd` of `useShownAnswer`): the Friend's cell
  reads "넣는 중" with a spinner, the face takes the selected look at once (its "+" and selected looks are asked for
  ahead), the list stays open until the answer comes, and a wrong add is undone with that person's ✕. The origin
  chip opens 장소 선택's map view, and a Place chosen there becomes the User's own `from` (a point that is no Place
  says "건물을 골라 주세요"); the time chip closes the list and puts the focus on the band's end handle for two seconds. Letting go of a
  handle of the time band (`time-band.tsx`), dragged or stepped by a screen reader, fixes that bound of the window.
  Each change goes to `POST /assistant/answers` with the User's position (`change` of `useShownAnswer`, the changes
  in `src/features/assistant/plan-input.ts`), one at a time: meanwhile the chips, the Friends, the handles, the arrows,
  and "되돌리기" take no press. Its answer replaces the one on screen: after a drag, keeping the Plan with the same
  id or else the first; after any other change, showing the first; a failure says "다시 계산하지 못했어요. 잠시 후 다시 시도해 주세요" and changes nothing, and an answer that
  comes after the conversation was forgotten or replaced is dropped. After a drag the band before it stays as a
  dashed outline, and "되돌리기" brings back what was shown before the drag without a request; any other change or a
  new reply drops it. Words sent while an answer is on screen carry its `input` and the id of the Plan on screen in
  the request context, and the reply's answer replaces the one on screen. The mock answers a recalculation from the
  stored copies of real answers by who is in the conditions, whether the window's start is fixed, and where the User
  sets out from.
- **Inviting as it is** (`src/features/assistant/use-plan-invitation.ts`, `answer/invited-card.tsx`). The card of a
  Plan with a Friend has "이대로 초대" in what the last row's middle leaves after "되돌리기", before the count's box.
  A press sends the answer's `input`, the Plan's id and start, and the User's position to `POST /plans` with an
  `Idempotency-Key` kept for each Plan while its answer is on screen, so that a second press, one after a failure, or
  one after coming back from another Plan repeats it. One request is on its way at a time: the button of whatever
  Plan is on screen reads "보내는 중이에요", and the chips, the band, the arrows, the swipe, and the map take no press.
  A Quest made after its answer left the screen is told with the toast "파티를 만들고 초대를 보냈어요". 409
  `PLAN_CHANGED` recalculates from the same conditions and says "계획이 바뀌었어요. 다시 확인해 주세요"; any other failure says
  "초대하지 못했어요. 잠시 후 다시 시도해 주세요". The made Quest's card shows the chips without a press, each Friend's
  with the state ("민수 · 아직 안 봄", "수락", "거절", "5분 늦음", "빠짐"), "파티를 만들고 초대를 보냈어요" and "답이 없어도
  12:15에 가면 돼요", the Quest's steps in three columns (`quest-steps.tsx`: a white number on navy, the start, and
  the title), and "닫기" across the card, which hides the answer as ✕ does. The latest word counts
  (`invited-friends.ts`): a signal of an answer heard after the Quest's members were last read, else those members
  ("빠짐" for a Friend no longer among them), else the reply's invitations; a Friend's face on the map carries "?"
  while invited and "✓" once in (accepted or late), its name read aloud the state after the name, and its tag the
  state alone beside a face that shows the whole name ("아직 안 봄"). A new answer, another Plan, or "새 대화" drops
  the made Quest from the screen; ✕ hides it with the frame, and "이전 답" brings it back.
- **A made Quest after closing** (`src/features/assistant/made-quests.ts`, `made-quest-ids.ts`, `use-made-quests.ts`,
  `use-made-quest-card.ts`, `answer/made-quest-frame.tsx`, `made-quest-line.tsx`). Nothing the server sends tells a
  Quest made from a Plan from a matched Shared Quest or a library booking's, so the phone keeps the id of each Quest
  `POST /plans` made (`Kept.madeQuests`); a Quest whose id is kept, which the User leads, and whose
  destination (the last step not cancelled with a start and a point) has not ended by the clock when the Quests were
  read counts as made from a Plan. Ids of Quests gone or ended are dropped when the Quests are read. It is drawn as a
  flag at its destination, the pick's dot with two lines above it, "12:15 점심" over "수락 0/1" (the start and the meal
  the title names after "에서", or a meeting step's title once the meal was cancelled, over the day when not today and
  the Friends accepted or late out of all in its members; its name says them in one line): a card of kind
  `made-quest`, `made-quest:<id>`, outside the place groups, with the Quest's own card `party:<id>` within it, which
  an address or a row of the Quest list opens with its "길찾기" as before. The first made Quest's line says the same
  in one line at the left above the row of buttons or in its place (and above the start button and the line that
  asks for interests), and gives way to the keyboard, a card at the bottom, and the answer frame. A
  press on either opens the card after inviting again, built from the Quest: a chip for each Friend with the state,
  the lines with the destination's start, the steps, and "닫기"; without a pill, the input, or the tab bar, as a
  received invitation's, with the destination, a dark flag at each other step, and the User's own dot where the phone
  was at the press or first was after it, and no Avatar. Its drawing is kept by what it draws, so a signal moves no
  camera. The signals of an answer count at once, after which the Quests' members do; the flag and its card go when
  the Quests come again without it or with its meal ended. The mock lists the Quest its `POST /plans` made, with the mock's User as its asker.
- **A received invitation** (`use-received-invitation.ts`, `answer/received-invitation-card.tsx`). Each invitation of
  `GET /quest-invitations` is a card of the main screen, `invitation:<invitationId>`, with no marker, so
  `/main?card=invitation:<id>` opens it once the list is read. The address moves no camera. While its card is open (and no answer frame is),
  the app reads `GET /quest-invitations/:id` with the User's position on campus (`invitationCardQuery`, under the
  invitations' key, so `quests-changed` reads it again), draws the invitee's own way by the marks and the camera of
  an answer (`drawingOfScene`) and no one else's Avatar, and the lists, the bottom controls, the zoom control, the AI
  input, and the tab bar give way, without a pill. The card in the frame's card container shows "유상의 파티 초대"
  with ✕, the destination step's start and title, "유상과 함께", the way's lines in body text after the route arrow
  (off campus, where the server cannot tell the way, its words "캠퍼스 밖이라 길은 그리지 못해요."), the steps, "수락"
  and "거절", and that only the User's own way is shown. 수락 and 거절 use the 파티 tab's endpoints, toasts, and
  fetches again ("파티에 참여했어요", or "초대를 거절했어요"), once for each invitation at a time, and close the card
  while it is still shown. "이미 끝난 초대예요" closes it after a 404 read (which reads the list again) or when the
  list comes back without it, and an address of an invitation the known list does not hold says it on the map;
  another failure offers "다시 시도". Android's back button closes it as ✕ does.
- While a card at the bottom is open, the row of buttons with "활성 파티", the 편의기능 button and its stack
  are not shown, as the zoom control is not; both lists, the AI input and the navigation stay. A 식당's card sits at
  the top instead (52 from the top, 16 from the sides): the two lists give way to it, and the zoom control, the row
  and the 편의기능 button stay.
- **The first run** (`src/features/first-run/`, `first-run/first-run-ask.tsx`, P05 ticket 09). A User who finishes
  Onboarding on this phone is asked three things, one card at a time at the bottom card's place, each under
  "시작하기 · n/3" and with "나중에", which skips it: "시간표부터 넣어 주세요" ("수업 사이의 빈 시간에 맞춰 짜요",
  "친구에게는 수업 건물과 끝나는 시각만 보여요"), whose "시간표 넣기" opens 시간표; "무엇에 관심이 있어요?", whose chips
  (채용, 공연, 동아리 모집, 배드민턴, 스터디, 전시, 축제, and 러닝, the wireframe's) are kept with "{n}개 맡기기", one
  `POST /interests` each, or "관심을 맡기지 못했어요"; and "친구 한 명을 불러 보세요" ("친구에게는 먼저 내가 있는 건물이
  보여요"), whose "초대 링크 보내기" makes an Invite Link and opens the share sheet as 친구 추가 does
  (`useSendInviteLink`). The end of Onboarding keeps the three cards for the signed-in User (`src/storage/first-run.ts`,
  under `snunow.first-run:{userId}`), and each answered or skipped card leaves the list; a User without a list, as
  every User who finished Onboarding before, sees none, and the main screen asks the main server nothing more for
  them. A card shows only while the User has no Class, no watched interest, or no Friend, and counts as answered once
  the User has it, by the card or elsewhere (`rules.ts`); one that waits for a list not yet fetched shows nothing.
  The interests card is passed over for a main server that keeps no interests. A card gives way to a selected
  thing's card and the answer frame, and hides what a card at the bottom hides. A User of the first run
  who watches no interest sees "관심을 맡기면 맞는 행사를 알려 드려요" at the left, 8 above the row of buttons or the
  tutorial's start button, or in the row's place for a User in no Party (`InterestsHint`), which opens the interests
  card again; the friend list and the map's credit stand above it.
- **The 편의기능 stack** (`layers.tsx`, the `MainLayers` frame). The button, "편의기능 (식당 · 셔틀버스)", opens and
  closes it and says whether it is open; it is navy with a white icon while the stack is open, and under its icon a
  dot of 5 in each colour of a layer that is on. The stack rises 8 above it, or appears at once where the phone asks
  for less motion: from the bottom up the toggles 식당 and 셔틀버스, 60 by 64, read as toggle buttons "식당 켜기" or
  "식당 끄기", filled with their layer's colour while on; above them the tile 메뉴 ("메뉴 보기"), which closes the
  stack and opens the menu panel at the meal served next. A transparent scrim over the map ("편의기능 레이어 닫기")
  and Android's back button close it, the button before a card under it; the zoom control is hidden while it is
  open. The layers start off when the app starts and stay as they are while another tab is shown.
- **The 식당 layer** (`src/features/dining/`, the `MapDining` frame). Turning it on fetches today's menus, a day of
  Korea's calendar, and the Places, every time; failing either shows no pins and says "식당 정보를 불러오지
  못했어요". A pin stands on the Place `GET /menus` gives each restaurant that has a
  line today; restaurants that share a Place share it. A pin is the frame's single 학식 mark (`MapRestaurant`), with
  the restaurant's name under it from the `names` level, or "{first} 외 {n}곳". Its card says "식당 · 학식 · 63동",
  the restaurant's name (the Place's when several share it), the Place, and the meals each restaurant serves today
  ("오늘 점심 · 저녁"); "메뉴 보기" opens the menu panel at the meal served next, at the first of its restaurants.
  Turning the layer off takes the pins away and closes a 식당's card. The frame's clusters, cafés and convenience
  stores are not built.
- **The shuttle layer** (`src/features/shuttle/`, the `Main` frame). Turning 셔틀버스 on fetches the route
  (`GET /shuttle`) and the vehicles (`GET /shuttle/vehicles`), every time; a failure of the route shows nothing and
  says "셔틀버스 정보를 불러오지 못했어요", and a failure of the vehicles alone leaves the route until the socket's next
  set. The route's line is drawn purple, 3 wide, dashed 8 and 6, under every marker; each stop is the shuttle's dot
  of `MapDot`, with its name under it from the `names` level; each vehicle in service is the shuttle's pin of
  `MapPin`, an Avatar above the stops, with "운행 중" under it, so that a vehicle standing at its stop is seen. A stop's card says "셔틀버스 · 교내 순환", "{stop} 정류장" and the next stop
  in loop order, and has no button but "가까이 보기"; a vehicle's says "셔틀버스 · 운행 중", "교내 순환 셔틀" and
  "{stop}에 있어요 · 다음 정류장 {next}", follows the vehicle's sets and closes when it goes, and "노선 보기" fits the
  camera to the whole line and closes the card. Outside weekdays from 08:00 to 21:00 in Korea's time
  (`SERVICE_HOURS`), a toast with the bus icon says "지금은 셔틀버스가 운행하지 않아요 · 평일 08:00–21:00" for 3.5
  seconds: each time the layer is turned on, and once when the hours end while it is on (checked every 5 seconds).
  Nothing else at the bottom moves for it. Turning the layer off takes everything away and closes a stop's or a
  vehicle's card.
- **How a vehicle travels.** The operator reports a vehicle only at a stop. A vehicle seen for the first time is
  placed at its stop. One reported at a new stop travels there along the line in the line's direction, the order of
  the stops, past any stops skipped between two sets, in 10 seconds (`TRIP_MS`): every second it glides for a second
  to the next point along the line, so that the straight glides follow the line's bends. A stop is where the line
  comes nearest to it, found once when the route arrives. A stop more than half the loop ahead counts as behind the
  last one, and the vehicle is placed there at once, as every move is on a phone that asks for less motion. A
  vehicle missing from a newer set goes at once, and one whose report is more than a minute old goes too, checked
  every 5 seconds against the phone's clock, so that the vehicles leave when the service ends or no set comes.
- **The map's credit** is a button, "지도 데이터 출처 보기", that opens the sources of the map's data.
- Every control has a Korean name for a screen reader, the wireframe's where it has one. A touch area is at least 48
  high: a row is 56, and the pills and the round buttons of 32 and 40 reach past their shapes (`hitSlop`), never
  into a neighbour's shape.
- **The map's credit.** The map is as high as the screen and lies under the navigation (`main-map-view.tsx`), so its
  view keeps one size when the navigation gives way to the answer frame and nothing on it moves then; while the
  navigation is shown, its height is added to the inset's bottom and to the bottom padding of the everyday map's
  fits (`useNavCoverOnMain`). It is told what the controls cover of its edges (`mapInset` in `layout.ts`, the
  `inset` of `<Map>`), counted from the navigation's top: at the bottom, the top of what stands at the left above
  the AI input, or the input's top where nothing does or the input is higher; 62 at the right, the zoom control. The
  row of buttons keeps its place only while it is drawn, for a User in a Party: its top is 126. With no row, the
  tutorial's start button and the lines above the input come down into its place, 16 above the input's top, and
  with nothing there the credit is 8 above the input. The keyboard's lift does not count. So the credit is never
  over an empty place, 16 from the left, and Kakao's logo is at its height left of the zoom control and the 편의기능
  button. While a card is open the inset's bottom is the card's top, and the credit sits above the card. Nothing is
  drawn over the credit: the lists end 8 above its strip (`CREDIT_ROOM` of `@/map`, the credit's margin and its
  line), on a low screen with fewer rows.

**The friend panel** (`friend-panel.tsx`, the `MainFriends` frame) is a `SidePanel` from the left over the whole
screen: "친구 {N}" and ✕ "닫기"; the search "이름, 학과 검색" ("친구 검색"), by name and department, spaces aside, with
"결과 없음" when nobody is found; the chips 전체, 공강, 수업 중, 이동 중 and 위치 꺼짐 with their counts, those of 0
hidden but 전체; and the Friends grouped by presence ("공강 · 4"), each row with the Avatar and its status, the name
and the department, the detail (or the line where the app has no detail), and the round calendar button "{이름}님과
파티 만들기", which says "준비 중이에요". Its footer has "공유 설정" on the right, which closes the panel and shows 내
정보 at `/me?show=sharing`, and "+ 친구 추가", which closes the panel and opens 친구 추가. The scrim ("친구 패널
닫기"), ✕ and Android's back button close it.
A Friend is under "위치 꺼짐" whenever the main server says the User cannot see them (`visible`), whatever the app's
own status says.

**The friend screens** (`src/screens/friends/`, the `Friends` and `FriendsAdd` frames) are screens above the tabs that
slide in from the right, each a `FullScreenPanel` whose "뒤로" goes back to where it was opened from:

- **친구 관리** (`/me/friends`, from 내 정보's "친구 관리"): "친구 {n}"; the search "친구 검색", by name and department, with "결과 없음"; the row
  "친구 추가"; the row "친구 요청 {n}", n the requests received; and under "친구 {n}" every Friend in the main server's
  order, with the department (and " · 위치 꺼짐" for a Friend the User cannot see) and no level or 위치 공유 line:
  each Friend's level is chosen on 위치 공유. A press on a Friend opens a bottom sheet with
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

**After a Plan became a Quest**, whatever screen made it, `apiClient.makePlanQuest` tells `src/api/plan-asks.ts` the
Friends the reply's `askLevels` names, and `PlanLevelsQuestion` (`src/screens/friends/plan-levels-question.tsx`,
inside the overlay host beside the push sheet) asks once: "{이름들}에게 평소에 어디까지 보일까요?", a line of what they
see now ("지금은 둘에게 시간표만 보여요. 뺀 친구는 그대로 둬요."), each name a chip with an ×, the three levels as
cells of one width with the current one chosen when all are at it, "넘기기", and "넘기면 지금처럼 둬요. 친구에게
알림은 가지 않아요". A level sets it with `setFriendLevel` for the Friends left ("{이름들}에게 지금 있는 건물까지
보여요"); a removed Friend stays as they are. An answer, a skip, and closing the sheet record the question for every
Friend named with `recordFriendsAsked(ids, 'plan')`.

**An Invite Link** is `<PUBLIC_URL>/invite/<token>`. Opened in a browser, such as a messenger's own, an iPhone's or one
on a phone without the app, the address answers the main server's page, whose button "SNU Now에서 열기" opens
`snunow://invite/<token>`. Both reach the route `/invite/[token]`. A link that starts the app has its token kept on the
phone (`inviteToken` of `Kept`) by the router's hook for the address the system opens the app with
(`src/app/+native-intent.ts`), before the first screen renders. On Android the router gets that address as a promise,
after its first render, and starts at `/` without it when React Native answers after 150 ms, so the hook reads it from
expo-linking, which holds it and each later link, and clears it at every address so that none opens twice. A link
opened while the app runs and the User is signed out meets the signed-in place's guard, which keeps its token before it
leads away. Once the User is in the signed-in place, after the loading screen or after the sign-in, the consent and
Onboarding, the layout opens the accept screen of the kept token. Opened while signed in, the link shows its screen at
once. The accept screen drops the kept token, and a later link replaces it. Android opens the https address in the app
only through App Links (see "Invite Links on Android" above).

**The Quest list on the whole screen** (`src/screens/quests/`, the `MainQuests` frame, `/quests`) is a
`FullScreenPanel` that comes up from the bottom: ✕ "닫기" and "퀘스트 {n}", n the Quests that have not ended; the
chips "전체", "강의" and "파티", whose counts stay while one filters; and the rows grouped by the Korean day of the
start of the Sub Quest each shows (`toQuestGroups` in the quest feature's adapter): "오늘 · 10월 1일 (목)", "내일 ·
…", "이번 주" (2 to 4 days ahead), "다음 주" (5 to 11), "그 이후", and "시간 미정" last for a Quest without a start.
A Quest whose Sub Quests all ended (past their end time) or were cancelled is not shown; marks of done do not count.
A row is 72 high: the round of 40 in its `questTone`, the kind ("강의", "공개 파티", "비공개 파티 · 김민준"), the
title, the place and the time. A class's row closes the screen and goes back to the map by `/main?quest=<id>`, which the
Quest list on the map carries out as a press of its own row; any other row opens the Quest's room above it. Without a
Quest it says "퀘스트가 없어요"; while the Quests load and after a failure it shows the shared states.

**내 정보** (`src/screens/me/me-screen.tsx`, the `Profile` frame) has the bell, "알림" or "알림 {n}개" with the
number of rows of 알림 that wait for the User in red, the kept Notifications left out ("9+" above nine), and four
cards from the top:

- the profile from the Lobby: the Avatar, the name, "컴퓨터공학부 · 22학번" (the department alone without an
  admission year), "SNU 계정 인증됨" and "프로필 편집";
- 시간표 (`week-card.tsx`, the grid in `week-grid.tsx`): Monday to Friday from 09 to 22, with 토 (and 일) and wider
  hours when a class falls outside them, drawn as a table with a line at each hour and a fainter one at each half
  hour; eight hours show at a time and the rest scroll under the days behind a fade, opening at a running class's
  start, else, while today has a class to come, at the current hour or later so that the class shows whole, else at
  the week's earliest class. Today's day in navy, a block for each time of a class
  (`GET /timetable/classes`, with `GET /places` for the numbers) in the colour of the class's place in the timetable
  (`classColors`), reading "운영체제" over "301-118", "301동" or "118호". A press on a block opens its class's 수업
  수정, as the class's row in 시간표 does. Under the week, two tiles of one width: "직접 입력/수정" opens 시간표, and
  "이미지로 불러오기" reads a timetable screenshot from the album on the phone (`use-import-from-image.ts`), makes a
  new version of the timetable from it, switches to it and stays on 내 정보 with "시간표를 만들었어요" or "N개 중
  15개만 넣었어요", ending in "· M개는 넣지 못했어요" when some could not be put in; it says "준비 중이에요" where the
  build has no text recognition;
- 위치 공유 (`sharing-card.tsx`): the switch "위치 공유", which is the Master Switch. While the Master Switch is off,
  the Friends' levels on 위치 공유 and the room's "내 위치 공유" show off and disabled under "전체 위치 공유가 꺼져
  있어요 · 켜기", keeping their stored values; and "캠퍼스 밖이라 위치가 공유되지 않아요" while the last upload was off
  campus. Turning it on without the location permission shows the map's explanation and the system's prompt first; a
  refusal leaves it off with "위치 권한을 허용해야 공유할 수 있어요". The new state shows at once, and turns back with
  "위치 공유를 바꾸지 못했어요" when the main server did not take it. While the Lobby's `masterOffAsked` is false,
  turning it off asks first with the Friends' question in the words "모든 친구에게는 지금 있는 건물만 보여 줄 수도
  있어요." and "어느 쪽을 골라도 친구에게는 아무 표시도 가지 않아요.": "위치 끄기" turns it off ("껐어요 · 친구에게
  알림은 가지 않아요"), "건물까지만" leaves it on and sends `lowerFriendLevels('building')` ("모든 친구에게 지금 있는
  건물까지만 보여요"), and "취소" leaves it on; each sends `recordMasterOffAsked`. Its last row, "위치 공유 보기", opens
  the 위치 공유 screen. At `/me?show=sharing` the screen scrolls to the card and outlines it for 1.2 s;
- "친구 관리 {n}" (친구 관리), "참여 중인 파티 {n}" (파티 at 내 파티), "내 퀘스트" (the Quest list on the
  whole screen), and "관심사 {n}" (관심사, with the number of watched interests).

위치 공유 (`/me/location-sharing`, `src/screens/me/location-sharing-screen.tsx`, P02 ticket 11, board n7b), from the
card's "위치 공유 보기", has no switch of its own and starts with "친구마다". While the Master Switch is off, "친구마다"
shows "전체 위치 공유가 꺼져 있어요 · 켜기", whose 켜기 turns it on as 내 정보's switch does (`master-off-line.tsx`).
"친구마다" lists the Friends of `GET /friends`, each with what the two see of each other from `seen`, "서로 시간표만
보여요", "서로 지금 있는 건물까지 보여요" or "서로 정확한 위치까지 보여요", and the User's own end as three cells, which
the next paragraph describes. The line is lowered at once by a choice or a switch on its way, and raised only once
`GET /friends` says so, since the app does not know the Friend's end. Its foot: "시간표의 건물과 끝나는 시각은 친구
모두에게 보여요. 위치를 꺼도 시간표는 보여요." and "새 친구는 '지금 있는 건물'에서 시작해요.". "남기지 않는 것" has the
rows "누가 나를 찾았는지 · 기록 안 함" and "지난 위치 · 저장 안 함", the name at the start and the fact at the end, over
"과목과 강의실은 보이지 않고, 후보로 검토된 것은 누구에게도 알리지 않아요.". Above it, the "비공개 구역" row ("칠한 곳
안에서는 시간표만 보여요", the number of zones) opens the zone screen (`me/private-zones/`).

A Friend's level on "친구마다" (`level-track.tsx` and `use-levels.ts` in `src/screens/friends/`) is three cells of
one width in a row, "시간표만", "지금 있는 건물", and "정확한 위치" ("{이름}님에게 보일 위치"). A choice shows at once,
sends `setFriendLevel`, and turns back with "위치 공유를 바꾸지 못했어요" when that fails; the Friends and the positions
are fetched again after it. The first "시간표만" for a Friend above it asks first, in a bottom sheet
(`src/screens/friends/off-question.tsx`): "{이름}에게는 지금 있는 건물만 보여 줄 수도 있어요." over "어느 쪽을 골라도
{이름}에게는 아무 표시도 가지 않아요.", the cells "위치 끄기", "건물까지만", and "취소" of one width, and "시간표는
계속 보여요" under them. "위치 끄기" sets `timetable` ("껐어요 · {이름}에게 알림은 가지 않아요"), "건물까지만"
`building` ("{이름}에게 지금 있는 건물까지만 보여요"), and "취소" or closing the sheet nothing; each records the
question with `recordFriendsAsked([id], 'off')`, and a Friend whose `askedOff` is true is not asked again.

관심사 (`/me/interests`, `src/screens/me/interests-screen.tsx`, P05 ticket 08) has two cards. "프로필 관심사" shows the
profile's hashtags from the Lobby as chips ("#러닝"), or "프로필에 넣은 관심사가 없어요", over "프로필 편집에서 바꿀 수
있어요". "맡겨 둔 관심" says "지켜봐 드리는 것은 행사와 모집뿐이에요" and lists the watched interests
(`GET /interests`), the newest first: the words as said, the topics they were read as where those differ from the
words (`interestRow` in `src/features/interests/adapter.ts`), and "지우기", which sends `DELETE /interests/:id`, says
"관심을 지웠어요", and fetches the list again; an interest removed already (404 `INTEREST_NOT_FOUND`) counts as
removed, and any other failure says "지우지 못했어요". Without one it says "맡겨 둔 관심이 없어요". A main server older
than the route answers 404, which `listInterests` turns into null: the screen then shows the hashtags and the empty
list, and 내 정보's row no number.

"로그아웃" asks "로그아웃할까요?", then stops the sending, signs out and shows the sign-in screen. 프로필 편집
(`profile-edit-screen.tsx`) edits the name, the department, the admission year and the interests with Onboarding's
fields, sends the changed ones with `PATCH /users/me/profile`, puts the answer in the Lobby and goes back; a failure
says "저장하지 못했어요. 다시 시도해 주세요" and stays.

시간표 (`/me/timetable`, `src/screens/timetable/timetable-screen.tsx`, the `Timetable` frame without its 학기 card,
since the main server stores no semester) lists the classes in the main server's order: a bar in the class's colour of
the week, the name with "겹침" when the answer's `overlaps` names another class, "월·수 10:30–12:00" and "제1공학관
301동 118호" or "장소 미정" from the first time. Without classes it says "등록된 수업이 없어요". A row and "+ 수업 추가"
open the class form (`/me/timetable/class`, with `?classId=` for an edit; `class-form-screen.tsx` and
`class-fields.tsx`): 과목명, the seven days, the hour and minute selects of 시작 시각 and 종료 시각, 장소 and 강의실
선택. It is saved as one time per chosen day with the same hours, Place and room (`saveOf` in
`src/features/timetable/class-form.ts`); a class whose times differ opens with its first time's. While the days and
hours cross another class by the main server's rule, a warning names each one, and saving is still allowed. "저장"
waits for a name, a day, both times with the end after the start and a Place, and goes back with "수업을
추가했어요", "수업을 수정했어요" or "저장했어요 · 겹치는 수업이 있어요"; a refusal keeps the form open with its words.
"삭제" asks "이 수업을 삭제할까요?". After each change `useClassChanges()` fetches the classes and the Quests again.

장소 선택 (`src/screens/places/place-picker.tsx`) is a component, not a route: the screen that needs a Place draws
`<PlacePicker picked onPick onClose />` over itself, and Android's back closes it. It lists `GET /places`, and
`GET /places/search?q=` once the User has stopped typing for 300 ms. The timetable's class form is its only user.

A plan with a Friend is a 비공개 파티: the Meetup of Iteration 1, with its form and its invitations, was retired in
Iteration 2 (P06), and commit `2f4f201` holds its code.

알림 (`notifications-screen.tsx`) is composed from the main server's lists (`useNotices()` of the notifications
feature). First come the Notifications the main server keeps (`GET /notifications`), the latest first, each with its
time at the right: "HH:MM" on today's date in Korea, "M월 D일" on another day. A Notification whose time is still to
come shows its title for that (`ahead`), such as "12:18 나설 시각" for the time to leave (`leave-by`, a clock on the
navy round), and its own title once the time has come. A room request's kinds have their own rounds: a companion out
(`room-declined`, a person) and everyone agreed (`room-agreed`, a group) as an acceptance's, the room's end
(`room-ending`) as the time to leave's, and the booking window opening (`room-window`, a calendar) in the colour of
the requests to join, which also wait for the User. A new match of a watched interest (`interest-new`, "채용박람회가
떴어요") is on the navy round too, a calendar for an event and people for a recruiting party, by its address. What a party's members would have said, for the room has no chat, is kept too: a step changed
(`step-changed`, a calendar) as an acceptance's, a member arrived at the step's point (`arrived`, a pin) on the navy
round, and a member late (`late`, a clock) in the colour of the requests to join; the room's row of a late member
starts with "N분 늦어요". A kind
the app does not know shows as an invitation's. The rows of what waits for the User follow, in this order: a Party running for a Quest the User
holds ("{name}님이 파티를 활성화했어요"), a Friend Request received, a Quest invitation ("{name}님의 파티 초대"), and
the requests to join each Open or Approval Quest the User leads ("참여 신청 {n}명"); an Open one has them only from Users the Leader removed. A row with a card's address, `/main?card=<kind>:<id>`, opens it as a tapped push does
(`src/features/notifications/address.ts`): a kept Notification's address is the main server's, and an invitation's is
`/main?card=invitation:<id>`, which ends at 파티's 초대 while the map holds no invitation card. A Friend Request's row
opens 친구 요청, and a running Party's and the requests' the Quest's room. The count in the panel's title is of the rows
that wait. A list that failed is left out; when every one failed it shows the error state. The main server names each Party's Leader, and an answer of `GET /parties` with a Party without one is refused
whole, so 알림 then leaves out every Party. Without rows it says "새 알림이 없어요".

**The menu panel** (`src/screens/menus/`, `/menus`) has no frame. It is a `FullScreenPanel` that comes up from the
bottom: ✕ "닫기" and "메뉴"; under the app bar the 7 days from today as `DayTile`s ("오늘", "내일", then the weekday),
the tabs 아침, 점심 and 저녁, and "{M월 d일 HH:mm}에 가져온 메뉴예요" from the oldest collection of the day. It opens
on the meal served next by Korea's clock: 아침 before 10:00, 점심 from 10:00, 저녁 from 15:00, and 내일's 아침 from
20:00 (`NEXT_MEAL_FROM` in the dining adapter). Its address may name the day, the meal and a restaurant
(`/menus?date=2026-10-06&meal=lunch&restaurant=학생회관식당`), whose section is then scrolled to the top. A day is
fetched once when it is chosen, and kept; a meal fetches nothing. The restaurants are cards in the server's order,
the name with "{number}동" of the Place `GET /menus` gives it, and the chosen meal's lines in the page's order (ADR 0001): a
line with a name and a price as a row with the price at the right ("6,000원"), a heading in 14/700, a note in 13
muted, any other line as written; a restaurant without lines for the meal says "운영하지 않아요". An empty day says
"이날 올라온 메뉴가 없어요"; the shared loading and error states cover the rest.

**The sources of the map's data** (`src/screens/map-sources-screen.tsx`, `/map-sources`), opened from the map's
credit, slide in from the right: "뒤로" and "지도 데이터 출처", a card for OpenStreetMap (ODbL, with its copyright
page) and one for 국토지리정보원's 연속수치지형도 건물 under 공공누리 type 1 (with the VWorld page it is downloaded
from), and one for SRTM, in the public domain. Each link opens the browser. The year in the second card is that of the
files' renewal on the VWorld page.

**A Quest's room** (`src/screens/room/`, the frame's `PartyDetail`, `/room/<questId>`) is the room of every Quest the
User holds but a Class Quest: its `파티장` is the Quest's Leader, its `멤버` the Holders and its `일정` the Sub Quests.
It reads the Quest (`GET /quests/:questId`), the User's Party and the listed Parties (`useRoom()` of the quests
feature, `room-adapter.ts`), and closes once the main server no longer answers the Quest, after a removal, a drop on
another phone or the Leader's end. `GoneQuestsWatch` (`src/features/quests/gone-watch.tsx`), in the signed-in layout,
tells it on whatever screen is shown: a Quest that was in `GET /quests` and is not when the list comes again, and that
`GET /quests/:questId` no longer answers (`QUEST_NOT_FOUND`, or no answer at all), says "{title} 파티에서 빠졌어요" once. A Quest that only left the
list because all its Sub Quests ended, a Class Quest, and the User's own 나가기 or 파티 없애기 on this phone, which
mark the Quest while they run, are not told; nor is what happened before the app started. From the top:

- in the app bar, "모집글 보기" for an Open or Approval Quest, which opens its post, and "수정" for the Leader, which
  opens 파티 만들기 in its edit mode;
- the Badges, "파티 · {holders}/{capacity}명" or "파티 · {holders}명" for a Closed Quest, "내가 만든 파티", "비공개" and
  the Global Event's title, the title, and the Quest's description in a quote box when it has one; for a Quest with a
  Global Event, the event as the design system's `EventCard` (`room-event.tsx`) under the title, whose press opens the
  행사 tab marked at it;
- the box `파티 활성화` (`activation-box.tsx`). `활성화` is the domain Party opened for the Quest. While none runs,
  any Holder opens it (`POST /parties`, closed, for 8, titled as the Quest) after the sheet "파티를 활성화할까요?",
  which also says when the User leaves another Party for it and when the Master Switch is off; a Party another Holder
  opened at the same moment (409 `PARTY_EXISTS_FOR_QUEST`) is entered instead. The User in it sees how many share,
  the switch "내 위치 공유" (`PUT /parties/mine/sharing`, shown at once and turned back after a failure) and
  "활성화 끄기" for its Leader (`POST /parties/mine/end`) or "활성화에서 나가기". A Party running without the User
  names its Leader, with "거절" and "참여"; "거절" sends nothing and is kept on the phone by the Party's id
  (`declinedParties` of `src/storage/kept.ts`), so the box then says "활성화 중인 파티예요" with "참여";
- `일정` (`plan-section.tsx`): the Sub Quests by their start, the next one in the Party's colour, the ended ones and
  those done dimmed; "완료로 표시" for every Holder, and on one done "완료 취소", which unmarks it; "+ 추가",
  "일정 수정" and "일정 삭제" for the Leader alone. The rules of who edits Sub Quests and who opens the Party are in
  one module, `src/features/quests/rules.ts`. The inline form
  (`plan-form.tsx`) asks `내용`, `언제` through the date·time sheet and `어디서`, typed or chosen on the map view; it
  waits for a point while the place has words of its own. A Place is sent as `{ placeId }`, a point as a point with
  the words shown; an add carries an `Idempotency-Key` kept for its retries;
- `신청 {n}` and `초대 중 {n}` for the Leader, and `멤버 {n}` with what the User sees of each Holder while in the
  Party, "내보내기" and "파티장 넘기기" for the Leader, and a press that shows a seen member on the map;
- the footer's "나가기" (`DELETE /quests/:questId`, after leaving the Party when it is the Quest's) or, for the Leader,
  "파티 없애기" (`POST /quests/:questId/end`, after ending or leaving the Party).

A refusal says why in the words of one table, `src/features/quests/refusals.ts`, and the room fetches what it shows
again.

**The 파티 tab** (`src/screens/party/`, the frames `Party`, `PartyPost`, `PartyJoin`, `PartyMine`, `PartyInvites`,
`PartyCreate` and `PartyAppt`) reads its lists through `src/features/party/`: `posts.ts` makes a post of another's
recruiting Quest (`GET /quests/recruiting`) or of the User's own, `mine.ts` the cards of 내 파티, `use-party.ts` the
hooks. The tabs count the User's Quests but the Class Quests (`내 파티 {n}`) and what waits under 초대, the Quest
invitations (`초대 {n}`, red).

- **찾기**: the search `파티 검색` over the titles and descriptions, and `모집 중인 파티`, the recruiting Quests the
  newest first. A card has the Badges, the fill, the next Sub Quest's time and place ("시간 미정", "장소 미정"), the
  Leader, `자세히 ›` to the post and `참여하기`, or `참여 신청` for an Approval Quest, which opens the join confirm
  sheet (`join-sheet.tsx`). Joining (`POST /quests/:questId/join`) says "{title} 참여 완료" and shows 내 파티; asking
  (`POST /quest-join-requests`) says "참여를 신청했어요". `전체 보기 ›` opens 전체 파티.
- **전체 파티** lists the four boards (`src/features/party/boards.ts`) with their counts and `N` for a post of today in
  Korea's time. **A board** (`GET /quests/recruiting?board=`) merges the others' posts with the User's own Open or
  Approval Quests on it with a Sub Quest ahead, which the recruiting list leaves out, the newest first: "내 파티" for
  the User's lead, "참여 중" for another's held Quest, the time posted ("13:21" today, "10/03 (토) 15:57" before). Its
  own posts open the room, the others' the post.
- **파티 모집글** shows the post and a footer by who reads it: `참여하기`, `참여 신청` or the waiting request with `신청
취소` (`GET /quest-join-requests`, `POST /quest-join-requests/:id/withdraw`); for the Leader `없애기`, which ends the
  Quest as the room's `파티 없애기` does, and `수정하기`; for another Holder "이미 참여 중인 파티예요".
- **파티 만들기** (`form/`) asks `제목`, `본문` ({n}/200), `언제` through the date·time sheet, `인원` from 2 to 8 in
  public, `어디서` as the room's 일정 form, `공개 범위` with `바로 참여` and `승인 후 참여` under 공개, `게시판` in public
  through a sheet of the boards, and `친구 초대` from `GET /friends`. `파티 올리기` (public) sends `POST /quests/own`
  with the board, the capacity and the Join Policy; `파티 만들기` (private) a Closed Quest for 8 without a board; both
  with a fresh `Idempotency-Key`, then invite each chosen Friend and show 내 파티. The rules of the body and of what
  changed are in `src/features/party/making.ts`. The edit mode leaves out `언제` and `어디서`, which the room's 일정
  changes, sends `PATCH /quests/:questId` with what changed and invites the newly chosen Friends.
- **From a Friend** (the frame `PartyAppt`): `파티 만들기` on a Friend's card on the map and the Friend panel's
  `{name}님과 파티 만들기` open `/party-form?friendId=<id>`, the form as 비공개 with that Friend chosen under `친구 초대`.
  Making it posts the Closed Quest and invites the Friend, with the toast `비공개 파티를 만들었어요 · 1명에게 초대 요청`.
- **관련 행사**, before `제목` in a new form (`event-field.tsx`): `행사 선택` opens the event picker, the 행사 list's
  cards without their buttons under the search `행사 검색`. A chosen event shows in a navy box with its source, title,
  time and place and ✕ `행사 빼기`, and gives the form its title, which cannot be changed, its start as `언제` and its
  place as `어디서`. `/party-form?eventId=<id>` opens the form with the event chosen. Submitting attends the event
  (`POST /quests` with `{ globalEventId }`, which gives the User's Quest for it, Closed and titled as the event), then
  sends `PATCH /quests/:questId` with the description, the capacity, the Join Policy and the board, adds the Sub Quest
  `모이기` when `언제` moved from the event's start, and invites (`form/use-send.ts`). When a step after attending is
  refused, the Quest stays: the form says why and opens its room.
- **내 파티**: the chips `전체`, `비공개` and `공개`, and the groups `활성화 중`, `활성화 알림`, then the next Sub Quest's
  day (`오늘`, `내일`, `이번 주` to Sunday, `다음 주`, `그 이후`, `시간 미정`). A card has the kind, a Badge of its
  members, its recruiting or its running Party, the next Sub Quest and the Holders; a Party running without the User
  adds the strip "{name}님이 활성화했어요" with `참여`, which enters as the room's `참여` does. A card of a Quest the User
  leads has, at its top right, a red circle with the number of requests to join waiting (`waitingJoinRequests`), and
  none at 0; `quests-changed` keeps it current.
- **초대** lists `GET /quest-invitations` with `거절` and `수락` under `받은 초대 · {n}`, or "받은 초대가 없어요"; a
  refused acceptance keeps the invitation.

Every joining, asking, withdrawing and answer fetches the recruiting Quests, the User's Quests, requests and
invitations again, as `quests-changed` does. Refusals take their words from the same table as the room's; where the
User enters a Quest, `QUEST_ENDED` says "이미 끝난 파티예요".

**행사** (`src/screens/events/`, the `Events` frame, `/events`) lists the published Global Events (`GET
/global-events`) by their start, with the data of `useEventSources()` and the words of `src/features/events/adapter.ts`:

- The app bar (`events-bar.tsx`) has "행사" and the search, which puts the field "행사 검색" and ✕ "검색 닫기" in
  place of the title and keeps the events whose title, place or description holds the words.
- The filters "전체", "오늘", "이번 주" (to Sunday in Korea's time) and "파티 모집 중" (an event with a recruiting Quest
  the User can join; the User's own 파티 is not one) filter the list; the chosen one is bold navy on light blue. Under them, on the white ground,
  "다가오는 행사" heads the list. Empty: "여기서는 학교 행사를 모아 볼 수 있어요" with "파티 찾기" without any event,
  "해당하는 행사가 없어요" after a filter, and "검색 결과가 없어요" after a search.
- A row (`event-row.tsx`, P15 ticket 54) has the date column (the day of the month, and "{M}월 · 오늘", "내일" or the
  weekday; today for an event that has begun and not ended, such as an exhibition until 11월 30일), then the source from the app's own list of announcers, the title, and the hours and the place on one line
  ("18:00–20:00 · 301동 대강당"; "M월 D일까지" for an event whose end is more than 24 hours after its start), each of
  the two cut at 2 lines. Its party line says "모집 중인 파티 {n}" (the recruiting Quests of `GET /quests/recruiting`,
  which the User does not hold, as the map card and the chat card count them) or "함께 갈 파티 찾기", and opens 파티
  찾기/모집; beside it, "내 파티" when the User holds a Quest for the event with others or open to them, closed ones
  too. The 48-point touch area of the line and of the filters reaches past their 40-point height. A press elsewhere on the row
  opens the detail sheet (`event-detail-sheet.tsx`, the `EventsDetail` frame): the source, "내 파티" as on the row, the whole title, "언제",
  "어디", the description, "원문 보기", which opens `sourceUrl` in the browser and is left out without one, and
  "파티 찾기/모집" ("모집 중인 파티 {n} · 찾기/모집"), which leads on to 파티 찾기/모집. At `/events?focus=<id>` the
  list shows every event, scrolls to the row and marks it with a light blue ground for 2.6 s (`use-focus.ts`). The
  frame's 분류 tabs and "대상" are not drawn: a Global Event has no category or audience. AI matching left the main
  UI on 2026-11-10 (P06-03), and its calls and the routes and server behind them left the code in
  Iteration 4 (A04). The chat's event cards are `event-item.tsx`, with "자세히" and "파티 찾기/모집".
- The ☆ at a row's top right and in the detail sheet (`favorite-toggle.tsx`), named "즐겨찾기" as everywhere in the
  app, keeps the event or drops it (`PUT` and `DELETE /global-events/:id/favorite`): a Favorite
  Event. It changes at once and back with "즐겨찾기를 바꾸지 못했어요" when the main server refuses. The chat's event
  cards have it as the ☆ "즐겨찾기", and so does the map's card of one event, left of the X; a grouped pin's card
  marks a Favorite Event's row with ★ instead. Whether the User starred an event is read from `GET /global-events`
  alone, so every screen shows the same.
- **파티 찾기/모집** (`recruiting-sheet.tsx`) lists the User's own Quest for the event ("내 파티" when the User leads it,
  "참여 중" with its Leader otherwise), then the Quests gathering for it (`GET /quests/recruiting?globalEventId=`),
  each with its fill and its next Sub Quest. The User's own opens its room; another's asks "‘{title}’에
  참여할까요?" and joins an Open Quest (`POST /quests/:questId/join`, then its room) or asks to join an Approval one
  (`POST /quest-join-requests`). "+ 파티 모집", like the map card's "같이 갈 사람 찾기", opens the room of a Quest the
  User already holds with others for the event, with "이 행사에 함께 가는 파티가 이미 있어요", and 파티 만들기 with the
  event chosen otherwise (`/party-form?eventId=<id>`, `use-party-create.ts`).

**The date·time sheet** (`src/screens/date-time-sheet.tsx`) is shared: "언제" with the choice in words ("오늘 19:00"),
21 days from today in Korea's time, the hours and the minutes by tens, and "확인". **The map view**
(`src/screens/place-map/`, `/place-map`) is the frame's `PlacePickerMap`: the map under a teal pin fixed at its
middle, which lifts while the map moves. It opens on the User's position when it is known and on the campus, else on
the campus; when the camera stops it asks `GET /places/at` and the sheet says the Place
("{name} {number}동", "건물 위치예요"), a point near one ("{name} 근처") or a point at none ("지도에서 고른 위치").
"이 위치로 정하기" gives the choice back to the screen that opened it (`src/features/places/picked-place.ts`).

The three legal documents open from the consent screen on a screen of their own, `/legal/terms`, `/legal/privacy` and
`/legal/location` (`src/app/legal/[document].tsx`). It belongs to no place of the flow, so anyone may open it, and it
closes back to the screen it was opened from. The documents' texts are placeholders.

**The update check** (`src/update/`) runs once at every start: `UpdateCheck`, in the root layout beside the stack,
fetches `app-version.json` from the `app-version` Release on GitHub with a 5-second timeout, without holding back the
first screen. `app-version.ts` decides from the file's `latest` and `minimum` and the installed version: a build
older than `latest` sees 업데이트가 필요합니다 with 업데이트 하기 and 계속 사용하기, a build older than `minimum` the same
without 계속 사용하기. 업데이트 하기 opens the platform's `download`; where it is `null`, as on iOS, the dialog asks the
User to install the new version and has no 업데이트 하기. Nothing is kept, so the dialog comes back at the next start.
Any failure, offline, a timeout or a malformed file, shows nothing. The installed version is
`Constants.expoConfig.version`, the running JavaScript's own `version`. It is the native build's too: `version` is part
of the fingerprint (raising 1.0.0 to 1.1.0 changes it from `d0581b58…` to `5d2e4656…`), so an update made with
another `version` never reaches an older build. The web is not checked.

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

- `listFriendStatuses` and `listGlobalEventAnnouncers`, the app's own, never fail a screen: it shows what it has without them.
- The friend list and the Quest list have `isError` and no `data`.
- The map has `isError` and keeps in `data` the cards that are still right: without the Global Events, the Friends'
  cards still show; without the recruiting Quests, an event's card only lacks its line of them.
- The 행사 tab waits for the Global Events and fails with them; a card lacks what another failed operation adds.

The walking route is asked when the User asks, not as the User's position moves. Pending the owner's decision (P15
ticket 56), an answer's walks are asked by themselves too (`useAnswerWalks`): at most three for the scene on screen,
none kept once it leaves, and a request whose scene leaves is given up. The everyday route keeps its asking only
while it is drawn (`gcTime: 0`):

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
  `waiting-types.ts`, the lists of what waits for the User, `menu-types.ts`, the menus, `shuttle-types.ts`, the
  shuttle, and `walking-route-types.ts`, the way on foot) holds the answers' shapes.
  A shape marked "provisional" comes from an open pull request of the main server, and one marked "the app's own" is
  defined nowhere else yet.
- **An adapter** per feature (`src/features/<feature>/adapter.ts`): turns answers into what the screens use, such as
  `FriendView`, `QuestRowView`, `CardView` and `ActivePartyView`.
- **The main server's client** (`src/api/server/`): the operations the main server serves, in a build that asks it
  (`asksMainServer()`). `http.ts` is the one way to the main server: it attaches the access token, renews the Session
  once on a 401 and asks again, and ends the Session when that cannot mend it. `answers.ts` (with `waiting-answers.ts`,
  `menu-answers.ts` and `shuttle-answers.ts`) checks each answer's shape before the app believes it; an answer of
  another shape fails as no answer does.
- **The mocks** (`src/api/mock/`): every other operation, and every operation where the app asks no main server, is
  answered inside the app, in the main server's shape, with what the `Main` wireframe shows. A mock answers after 0.3
  seconds. The tests use the mocks, or a fake main server behind `fetch` (`__tests__/support/fake-server.ts`). The
  mocks of a Quest's room (`src/api/mock/room.ts`) and of the 파티 tab (`src/api/mock/party.ts`) answer as the main
  server does and keep no change: the next read is the frame's again. The recruiting Quests are the posts of the
  `Party` frame's boards (`src/api/mock/data/boards.ts`).

| Operation                                                            | Answers                                                      | Where it comes from with the main server                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `signIn`, `signOut` (`src/auth/sign-in.ts`)                          | Whether the User signed in, and Onboarding's state           | `POST /auth/google`, `/auth/sign-out`                                   |
| `completeOnboarding`                                                 | Nothing                                                      | `POST /users/me/onboarding`                                             |
| `enterLobby`                                                         | The User's profile and Master Switch                         | `POST /lobby`                                                           |
| `updateProfile`                                                      | The changed profile                                          | `PATCH /users/me/profile`                                               |
| `setMasterSwitch`                                                    | Nothing                                                      | `PUT /users/me/master-switch`                                           |
| `uploadPosition`                                                     | Whether the position was off campus                          | `POST /positions`                                                       |
| `listFriends`                                                        | The Friends                                                  | `GET /friends`                                                          |
| `setFriendLevel`, `endFriendship`                                    | Nothing                                                      | `PUT /friends/:userId/level`, `DELETE /friends/:userId`                 |
| `recordFriendsAsked`, `recordMasterOffAsked`                         | Nothing                                                      | `POST /friends/asked`, `POST /users/me/master-switch/asked`             |
| `lowerFriendLevels`                                                  | Nothing                                                      | `PUT /users/me/friend-levels`                                           |
| `findFriendId`                                                       | The owner of a Friend ID                                     | `GET /friend-ids/:friendId`                                             |
| `sendFriendRequest`                                                  | Whether the request waits or made two Friends                | `POST /friend-requests`                                                 |
| `listFriendRequests`                                                 | The Friend Requests received and sent                        | `GET /friend-requests`                                                  |
| `acceptFriendRequest`, `declineFriendRequest`, `cancelFriendRequest` | Nothing                                                      | `POST /friend-requests/:id/accept`, `/decline`, `/cancel`               |
| `createInviteLink`                                                   | A new Invite Link's address                                  | `POST /invite-links`                                                    |
| `getInviteLink`, `acceptInviteLink`                                  | Who sent the link and its status; nothing                    | `GET /invite-links/:token`, `POST /invite-links/:token/accept`          |
| `listPositions`                                                      | The positions the User may see                               | `GET /positions`, and the socket's `position`                           |
| `listFriendStatuses`                                                 | Each Friend's status, place and photo                        | The mock's in a mock build; none against the main server                |
| `listQuests`                                                         | The User's Quests and today's Class Quests                   | `GET /quests`                                                           |
| `listQuestInvitations`                                               | The invitations into a Quest                                 | `GET /quest-invitations`                                                |
| `listJoinRequests`                                                   | The requests to join a Quest the User leads                  | `GET /quests/:questId/join-requests`                                    |
| `listClasses`, `listPlaces`                                          | The User's classes, and the Places                           | `GET /timetable/classes`, `GET /places`                                 |
| `listGlobalEvents`                                                   | The published Global Events                                  | The mock: no route lists them for a User yet                            |
| `listGlobalEventAnnouncers`                                          | Who announced each Global Event                              | The mock: the app's own                                                 |
| `listParties`, `getMyParty`                                          | The Parties, and the one the User is in                      | `GET /parties`, `/parties/mine`                                         |
| `findWalkingRoute`                                                   | The way on foot between two points                           | `GET /walking-route`                                                    |
| `listMenus`                                                          | One day's menus by restaurant                                | `GET /menus?date=`                                                      |
| `getShuttle`                                                         | The shuttle's route: hours, stops and line                   | `GET /shuttle`                                                          |
| `listShuttleVehicles`                                                | The shuttle's vehicles in service, at their stops            | `GET /shuttle/vehicles`, and the socket's set                           |
| `getQuest`, `dropQuest`                                              | One Quest, ended or not; nothing                             | `GET`, `DELETE /quests/:questId`                                        |
| `addSubQuest`, `editSubQuest`                                        | The Sub Quest                                                | `POST /quests/:questId/sub-quests`, `PUT …/:subQuestId`                 |
| `cancelSubQuest`, `markSubQuestDone`                                 | Nothing                                                      | `DELETE …/:subQuestId`, `POST …/:subQuestId/done`                       |
| `unmarkSubQuestDone`                                                 | Nothing                                                      | `DELETE …/:subQuestId/done`                                             |
| `handOverQuest`, `removeHolder`, `endQuest`                          | Nothing                                                      | `PUT /quests/:questId/leader`, `DELETE …/holders/:userId`, `POST …/end` |
| `acceptJoinRequest`, `declineJoinRequest`                            | Nothing                                                      | `POST /quests/:questId/join-requests/:id/accept`, `/decline`            |
| `listSentInvitations`, `cancelInvitation`                            | The Leader's invitations that wait; nothing                  | `GET`, `DELETE /quests/:questId/invitations…`                           |
| `openParty`, `joinParty`                                             | The User's Party                                             | `POST /parties`, `POST /parties/:partyId/join`                          |
| `leaveParty`, `setPartySharing`                                      | Nothing                                                      | `POST /parties/mine/leave`, `PUT /parties/mine/sharing`                 |
| `removePartyMember`, `endParty`                                      | Nothing                                                      | `DELETE /parties/mine/members/:userId`, `POST /parties/mine/end`        |
| `findPlaceAt`                                                        | The Place a point is inside or near, or none                 | `GET /places/at`                                                        |
| `listRecruitingQuests`                                               | The recruiting Quests, of all, one board or one Global Event | `GET /quests/recruiting`, `?board=`, `?globalEventId=`                  |
| `joinQuest`, `askToJoinQuest`                                        | The Quest; nothing                                           | `POST /quests/:questId/join`, `POST /quest-join-requests`               |
| `listMyJoinRequests`, `withdrawJoinRequest`                          | The User's waiting requests; nothing                         | `GET /quest-join-requests`, `POST …/:id/withdraw`                       |
| `makeQuest`, `changeQuest`                                           | The Quest                                                    | `POST /quests/own` with an `Idempotency-Key`, `PATCH /quests/:questId`  |
| `attendGlobalEvent`                                                  | The User's Quest for the Global Event                        | `POST /quests` with `{ globalEventId }`                                 |
| `inviteToQuest`                                                      | Nothing                                                      | `POST /quests/:questId/invitations`                                     |
| `acceptInvitation`, `declineInvitation`                              | The Quest; nothing                                           | `POST /quest-invitations/:id/accept`, `/decline`                        |
| `askAssistant`                                                       | The Assistant's reply to the conversation                    | `POST /assistant/messages`                                              |
| `getTutorial`, `enableTutorial`, `stopTutorial`, `hideTutorialRow`   | The 새내기 튜토리얼 with the User's progress, after each     | The mock until P06-02: `GET /tutorial`, `POST /tutorial/enable`, …      |
| `startTutorialQuest`, `completeTutorialQuest`                        | The 새내기 튜토리얼 with the User's progress                 | The mock until P06-02: `POST /tutorial/quests/:key/start`, `/complete`  |

The mock keeps the Friends, the Friend Requests and the Invite Links in memory while the app runs
(`src/api/mock/friendships.ts`), with Friend IDs for the frame's people, and refuses as the main server does. The
User's Friend ID is `7KX2M9QD`; `/invite/from-yujian` opens a link the User can accept.

`getMyParty` turns exactly the main server's 404 `NOT_IN_PARTY` into null. A 401 with `SESSION_REPLACED` ends the
Session without a renewal and shows the notice "다른 기기에서 로그인했어요" with the sign-in screen; a 403 with
`ONBOARDING_REQUIRED` shows Onboarding with the suggestion it carries (`src/session/session-events.ts`, which
`SessionProvider` follows).

The User's own id is the access token's subject, and the app's time is the phone's. Where the answers are mocks, the
User is the mock's `me` and the time is the moment the wireframe shows, 1 October 2026 at 13:37 (`src/clock.ts`), so
that the screens read as the wireframe on any day.

The phone keeps that the User signed in, that the User agreed to the legal documents, what the sign-in suggested for
Onboarding, whether Onboarding is finished and its answers, that the User answered the explanation before the
location prompt (`locationExplained`), the token of an Invite Link until its accept screen shows it (`inviteToken`),
and the running Parties whose 활성화 the User declined (`declinedParties`) (`src/storage/kept.ts`). A value stored by
an older version, without a newer
field, reads as "not yet" for that field, and one an older version stored that this one no longer keeps, such as the
switch of the answer frame (`answerOnMap`), leaves the rest as it was. `openKept()` is the read for the start of the
app: it is the one that honours `EXPO_PUBLIC_FIRST_STATE`, which clears all of it.

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
- `app.json` also gives Android `RECEIVE_BOOT_COMPLETED`. The task manager hands each background position to a job
  that Android keeps across a restart of the phone, and Android refuses such a job from an app without the
  permission: the app then stops at the first position.
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
- The main server's address (`EXPO_PUBLIC_MAIN_SERVER_URL`) must be one the phone reaches. Every build allows plain
  http (`usesCleartextTraffic` in `app.json`): from the emulator `http://10.0.2.2:3000`, and from a phone on the same
  Wi-Fi the computer's address on it.
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
- A person's position ages by the app's clock (`now()`), looked at again every 15 seconds. Measured 2 minutes ago or
  more (`OLD_POSITION_MS`), it is old: the Avatar is drawn dimmed, a look of its own (`stale`), its name reads "민준 ·
  3분 전" from the `names` level, its card says "마지막 위치 3분 전", and the Friend's row in the friend list and in
  the friend panel adds "3분 전 위치". Measured 10 minutes ago or more (`KEPT_POSITION_MS`, the main server's keep),
  it is no longer on the map. The rule is the same for a Friend and for a member of the User's Party; the limits are
  beside `POSITION_EVERY_MS`.
- The signals fetch what they name again: `friends-changed` the Friends, the positions and the Friend Requests,
  `quests-changed` the Quests (the open room's Quest among them), the invitations, the requests to join and the
  Leader's invitations, the recruiting Quests and the User's requests to join,
  `party-changed` the Parties and the positions, `global-events-changed` the Global Events and the Quests, `notice` the kept
  Notifications of 알림, which are also fetched again when the connection opens again. When the app returns to the
  front, the lists of 알림, the Friend Requests among them, are fetched again too.
- `shuttle-vehicles-updated` replaces the shuttle's vehicles in the cache of `GET /shuttle/vehicles` while the
  shuttle layer is on, which is while that query is in use; a set that comes while it is off is dropped. When the
  connection opens again while the layer is on, the vehicles are fetched again.

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
  18/700, a sentence and up to two Buttons over the screen: a confirming answer, a cancel, both, or none for a
  statement that nothing in the app answers. `tone="danger"` fills the confirming answer in red (the Button variant
  `destructive`) for what cannot be taken back. Android's back button is its cancel (`onCancel`); without one, back
  leaves the dialog open.
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
  - `WaitingDots`: three dots of 8 that pulse in turn while something is on its way, still where the phone asks for
    less motion, read aloud as the words they stand for ("보는 중", "보는 중이에요").
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
colour. `exact` puts a green dot of 11 on the drop's rim at the face's lower right, outside the Avatar, and `addable` a
"+" at its upper right; with either the box grows at the sides and the top, and the tip keeps its place. `presence`
names the colours of what a person is doing: `free`, `class`, `moving` and `off`, the statuses, which an Avatar's dot
uses too, and `member`, a member of the User's Party who is no Friend.

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
  bounds={CAMERA_BOUNDS} // the visible area never leaves it
  fitBounds={CAMPUS_BOUNDS} // the lowest zoom fits the view inside it; left out, bounds
  minZoom={MIN_ZOOM}
  nativeMinLevel={NATIVE_MIN_LEVEL} // a native SDK holds a pinch out to this whole level
  maxZoom={MAX_ZOOM}
  markers={[{ id: 'event:e1', name: '공식 행사 · AI 커리어 설명회', position, image: eventPin, text: 'AI 커리어' }]}
  // passive: it takes no press, and a press on it reaches what is drawn under it
  avatars={[{ id: 'me', name: '내 위치', position: mine, image: myAvatar, glideMs: 5000, order: 1, passive: true }]}
  lines={[{ id: 'walking-route', points: line, style: { color: color.quest, width: 3, dash: [2, 6] } }]}
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
- **The camera stays inside `bounds`**: the visible area never leaves the rectangle. The lowest zoom allowed is the
  larger of `minZoom` and the zoom at which the view just fits inside `fitBounds` (`bounds` when left out), which
  depends on the view's size, and the centre is kept far enough from the edges of `bounds`. The highest zoom is
  `maxZoom`. The map opens on the middle of the rectangle at the lowest zoom allowed. Whatever `moveCamera` or `fitTo`
  asks is first brought inside these rules.
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
- **What is on top**: every Avatar is above every marker, and every line is under both. Among markers, and among
  Avatars, the higher `order` is on top; without one it is 0, and of two that are equal the later in the list is on
  top. The screen ranks what matters, such as the User's own Avatar or a selected marker.
- **Lines** are what the list says, as markers are: a line with a new `id` is added, one whose `id` stays is the
  same line with its points or its style changed, and one that is gone is removed; the same points and style in a
  new list draw nothing again. Among lines, the later in the list is on top. A line runs through its `points` in
  order, and its `style` says its look: a colour, a width in points on the screen and, for a dashed line, the length
  of a dash and of the gap after it, measured as SVG's `stroke-dasharray` is; the ends and the dashes are round, and
  the width and the dashes are the same at every zoom. The main screen draws the shuttle's line under the walking
  route.
- **`fitTo`** takes its `padding` as one number for all four edges or as one for each edge. The points are fitted
  into what the padding leaves of the view, and their middle comes to the middle of that. With `maxZoom` the camera
  comes no closer than that zoom: points that are near each other are shown from there.
- **`nativeMinLevel`** is the lowest whole level of Kakao's SDK on Android and iOS (`setCameraMinLevel` /
  `cameraMinLevel`): pinching out stops there instead of going below the lowest zoom and snapping back. The plain
  map has no levels. The SDK cannot hold panning, so a drag past `bounds` still settles back when it ends.
- `CAMPUS_BOUNDS`, the on-campus rectangle, `CAMERA_BOUNDS`, the camera's area, the limits `MIN_ZOOM` and
  `MAX_ZOOM` and `NATIVE_MIN_LEVEL` (15) are constants in `src/map/campus.ts`. The on-campus rectangle is a little
  wider than the Campus Boundary, which stays the main server's; it decides whether the User's own Avatar is shown,
  and the lowest zoom fits it. The camera's area is it widened by half its height to the north and to the south and
  by half its width to the east and to the west.
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
  position: each marker and Avatar as the design system's own view with its `text` under it, and each line as
  straight strokes, or as the dashes of a dashed style (`src/map/plain-route.tsx`), under `line:{id}`. So `moveCamera`, `fitTo` and a moved Avatar are seen, and a screen can be laid out around it.
  An Avatar glides there too, unless the phone asks for less motion.
- On the plain ground each marker and Avatar is a button under its `name`, with the look's name as its `testID`,
  and each line is read as "경로가 그려져 있습니다". A passive one is a picture under its `name`, not a button, and
  takes no pointer events. The `text` under a marker is the `Main` wireframe's name: 11/16 in the bold weight on a
  white round, 3 under the marker's foot. One outside the view is not drawn and stays in the tree under its name. So a
  screen reader, and a test, reach everything the map was asked to show. In a test the ground is as large as the
  window until it is laid out.

### Marker images

A native map draws images, not React views. An image is a picture of the design system's own marker view, made once
for each look and kept for as long as the app runs:

- A look (`MarkerLook` in `src/map/marker-looks.tsx`) is one of four:
  - the User's own Avatar: `MapPin` of the kind `me`, and its `small` form under the name `me:small`;
  - a person: `MapPerson` with the letters or the photo, in a `tone` (a status, or `member`), `small` or at full
    size, `selected` or not, named by the person's `id` and by whether there is a photo, such as
    `person:full:free:f1`, `person:full:free:f2:photo` and `person:small:member:pm1:selected`. The photo's address,
    which is new with every answer of the server, is no part of the name;
  - a place of each kind of the design system, as a `dot` from far away or a `pin` from close, a pin with its
    `count` when it has one, `selected` or not, such as `official:dot`, `party:pin:4` and `party:pin:4:selected`;
  - a mark of an answer (`answer`): `MapAnswerMark`, a symbol box of 36, which may be empty, and a label at one side
    of it, words included, named by what it draws, such as `answer:[…]`. It stands on the centre of its symbol box.
- Two looks that draw the same picture have the same name, so the pictures stay few: two for each person in each
  tone the person was seen in, a dot and a pin for each kind of place and count, and the selected look of the one
  thing that is selected. No look but an answer's has a label: a name is the map's own text.
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
  map is ready, which holds only while the view keeps its height (see "In TypeScript" below).
- **The rectangle**: the SDK does not keep the camera inside one. When a move ends outside the rules, the module
  moves the camera back inside, at once, and reports only a camera inside them.
- **Markers and Avatars** are labels on two layers, the Avatars' above the markers', ranked by `order` and their
  place in the list. A label is drawn once its picture is there; its `text` is the SDK's own text under it. An Avatar
  glides at an even speed, from where it is shown. A press goes to the thing whose picture is drawn where the finger
  came down, an Avatar before a marker: the SDK would give it to the label whose whole picture, clear room included,
  holds the point, so a small pin beside an Avatar could not be pressed. Where no picture is drawn, as on a label's
  text, the SDK's label takes it.
- **Lines** are the SDK's route lines, under the labels, one for each `id`: a new one is added, a kept one whose
  points, colour or width changed takes the new ones (`changeSegments`), and one no longer listed is removed. Each
  line's z order is its place in the list, so the later is on top. A line is solid, in its colour and width: the
  module does not draw the dashes, and is handed no dash. The SDK's own patterns repeat a picture along a line, which
  would draw dashes only with a picture for each look; that is not built.
- **In TypeScript**, `src/map/native-map.tsx` keeps what the interface gained after the module was written, with the
  sums of `src/map/projection.ts`, which the module's Kotlin repeats:
  - the fit zoom, which the module does not send, from the view's size as it is laid out. `onFitZoom` is told before
    the first `onCameraIdle`, which is kept back until then, and again when the size changes;
  - a fit, worked out once the view's size is known and sent as the module's `moveCamera`, so that a padding for
    each edge and `maxZoom` hold. Before that, the module's own `fitTo`, which takes one number, is asked with the
    largest side of the padding;
  - on Android, a camera in a view whose height changed since the module opened. The module measures how the
    camera's height gives the zoom once, and Kakao's camera shows as much from top to bottom at one height whatever
    the view's height: in a view taller than then, as when the tab bar gives way to the answer frame or a received
    invitation's card, every camera would show closer than asked by the binary logarithm of the heights' ratio (10% on
    a phone 914 high over a tab bar of 88). A zoom is sent less that logarithm, and the module's lowest zoom is lowered
    by as much; the view's height at the module's first report stands for its height when it opened. The module's
    next native release can measure the scale again where the camera rests, as the iOS module does, and drop this;
  - a passive marker's press, which the module sends, is dropped. A marker under a passive one still cannot be
    pressed on a phone: that is the module's to add.
    None of this was checked on a phone.
- **Kakao's logo** stays as it is, moved to the bottom right, apart from the credit at the bottom left. The module
  places it 8 from the bottom right of the whole view and does not read `inset` yet, which `native-map.tsx` hands
  it with all four sides: until it does, the main screen's controls cover the logo.
- **The screen**: the module starts the SDK with the key when the app starts, and pauses and resumes each map when
  the app leaves and comes back to the screen. A map whose view leaves the window, as when another tab or a screen
  over the map hides it, keeps its engine: the SDK would pause its drawing there and never take it up again, leaving
  the map black, so the module tells it that the map is finished by hand (`setFinishManually`) and finishes it when
  the view is destroyed.

The module cannot be tested with Jest: Jest runs without it. It is checked by hand on `/map-check`, against the
device check of the spec. `native-map.tsx` is tested with the module's view mocked
(`__tests__/map-native-view.unit.test.tsx`).

### The iOS module

The module's iOS side is in Swift, in `modules/snu-now-map/ios/`, around Kakao Maps SDK for iOS 2.12.19, taken as the
CocoaPods pod `KakaoMapsSDK`. Expo links it into every build for iOS. It takes the same view, with the same props and
calls, as the Android side, and keeps the rules the same way: the zoom through the camera's height, the camera brought
back inside the rectangle after a move, markers and Avatars as the SDK's Pois on two layers, its own glide, and the
lines under them. What is different:

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
- **Lines** are routes of one route layer, each under its line's `id`, with a style set for each colour and width,
  registered once. A new one is added, one whose points, look or place in the list changed is removed and added again
  under its `id`, with its place in the list as its z order, and one no longer listed is removed. A line is solid, as
  on Android.

### Trying it

`/map-check`, opened as `/catalogue` is (`snunow://map-check` in a development build), shows the component with sample markers,
Avatars and buttons that move the User's Avatar, draw and clear two lines, one of them dashed, fit the camera to the solid one, zoom in
and show the whole campus. It says what was pressed and where the camera stopped. It is for developers: a released
app does not show it. The native modules are checked on it.

## Text recognition (OCR)

`modules/snu-now-ocr` is a local Expo module around Google ML Kit Text Recognition v2 with the Korean recogniser, for
reading a timetable screenshot on the phone (P13). Android uses `com.google.mlkit:text-recognition-korean`, whose
model is bundled in the app, so no download is needed at first use; iOS uses the pod `GoogleMLKit/TextRecognitionKorean`.

`src/features/timetable-ocr/native-ocr.ts` is the one file that touches it. `readImageText(uri)` takes a `file://` or
`content://` URI, such as the image picker gives, and answers one of:

- `read`, with the image's `width` and `height`, its `lines` (each with its `text`, its `box` `{x, y, w, h}` in the
  image's pixels, its `confidence` and its `elements`, the words, alike) and `pixels`: a copy about 330 pixels wide, the
  aspect kept, as RGBA bytes in base64, with the `scale` back to the original (original = copy × scale);
- `unavailable` where the build has no module: Expo Go, the web and the tests;
- `failed`, with a message, when the image could not be opened or ML Kit failed.

ML Kit gives a confidence on Android only; on iOS every `confidence` is null. Nothing reads it (P15-52).

`/ocr-check` (`snunow://ocr-check` in a development build) picks an image from the album (`expo-image-picker`, images
only, no editing), reads it, lists the lines and saves the module's whole answer as JSON in the app's documents folder.
It is for developers: a released app does not show it. The address can name the image and the file, which is how the
fixtures in `__tests__/fixtures/timetable-ocr/` were made on the emulator (see their README):

```bash
adb push snutt-1.png /data/local/tmp/
adb shell run-as com.bonnieandclaude.snunow cp /data/local/tmp/snutt-1.png files/
adb shell am start -a android.intent.action.VIEW \
  -d "'snunow://ocr-check?uri=file:///data/data/com.bonnieandclaude.snunow/files/snutt-1.png&name=snutt-1'"
adb exec-out run-as com.bonnieandclaude.snunow cat files/snutt-1.json > snutt-1.json
```

### Reading a timetable screenshot (`이미지로 불러오기`)

From P15-52 the main server's AI reads the picked screenshot
([ADR 0015](../docs/adr/0015-a-timetable-screenshot-is-read-by-the-ai-with-the-phones-blocks.md)). Before the first
send the app asks once, in a dialog: "시간표 사진을 AI로 읽어요" / "더 정확하게 읽도록 사진을 서버를 거쳐 외부 AI 서비스에
보내요. 우리 서버에는 저장하지 않아요." with "보내기" and "휴대폰에서 읽기"; a yes is remembered on the phone until a
sign-out or the end of the Session (`src/storage/reading-notice.ts`). Then `use-import-from-image.ts`:

1. runs the native module on the picture, as before, for its small copy of the pixels (`readImageText`; the copy comes
   with ML Kit's answer, which is otherwise not used on this path);
2. finds the grid from those pixels alone (`grid-geometry.ts`): how many day columns, and each class block's column,
   top and bottom, colour, and whether its bottom fades out. No OCR'd label is used, so a label ML Kit misreads cannot
   misplace a block;
3. sends the picture in base64 with that grid to `POST /timetable/readings` (`apiClient.readTimetableImage`); the
   server's AI reads the labels and the text, and the server places the blocks. The answer's rooms are linked to
   buildings on the phone (`server-reading.ts`);
4. reads it with the phone's own pipeline, as P13 did, when the User said no, the main server does not answer within
   25 s or refuses (a server without the route answers 404), the server's reading has no class, or the build does not
   ask the main server (the mock build); when neither reading has a class, the User is told 시간표를 찾지 못했어요.
   Without the native module, or when no grid is found, the server's AI reads the whole picture.

## Push notifications

From the 11/19 Release the app can receive a push through `expo-notifications`; Expo's push service hands it to
Firebase Cloud Messaging. `src/push/device.ts` wraps the library for the rest of the app. Without its native module
(the web, a build before 11/19, and the tests, whose setup mocks the wrapper) every function reports "unavailable"
and none throws.

- **Channel.** One Android channel, id `default`, named "알림", with high importance. The config plugin's default
  channel, the wrapper's channel creation and the main server's `channelId` use the same id. The channel is created
  before the permission is asked, since Android 13 shows no prompt before a channel exists.
- **Permission.** Android 13 and later report a permission that was never asked as denied but still askable. On
  Android the wrapper reads that as `undetermined`, so `undetermined` means the phone's own prompt can still show.
- **Icon.** `assets/images/notification-icon.png`, 96 by 96, white on transparent: the app icon's pin, with its hole
  cut out (`docs/design/app-icon/`). Android tints it with the plugin's `color`, `#001A72`.
- **Firebase.** `google-services.json` is Firebase's Android settings file for `com.bonnieandclaude.snunow` in the
  project `snunow-b5827`. It holds no secret, and its bytes are part of the app's fingerprint. The FCM V1 service
  account key lives in the EAS project's credentials only, never in the repository.
- **iOS has no push.** The iOS build is signed by a free Apple ID's team, which cannot sign the push entitlement, so
  `plugins/ios-without-push.ts` removes `aps-environment`. It is listed before `expo-notifications` in `app.json`
  because the plugin listed first runs last.

`/push-check` (`snunow://push-check` in a development build) shows the permission, asks for it, and shows the phone's
Expo push token. It is for developers: a released app does not show it. To send a test push, open Expo's push tool at
<https://expo.dev/notifications>, paste the token as the recipient, give a title and a body, and send it with the app
in the background. It arrives with the app's icon in the channel "알림", and tapping it opens the app.

A token shown on `/push-check` is never pasted into issues, pull requests, or chats: anyone holding it can push to
that phone.

- **A tap.** A push's data carries one address, `/main?card=<kind>:<id>` (`src/push/card-address.ts`); any other data
  is ignored. The signed-in layout reads the tap that started the app and each tap while it runs, once the User is
  past the loading screen, the consent, and Onboarding, as Invite Links are (`src/push/use-notification-links.ts`). A
  tap opens once, then the library forgets it, so the next start does not open it again. A screen above the tabs
  closes (`router.dismissTo`); on the tabs, where `dismissTo` does nothing, the app goes there with
  `router.navigate`. `/main` reads `card` once: the map moves to the card with that id and opens it, and without
  one the app opens the screen of the matching row of "알림". For an invitation that is the "파티" tab's
  invitations, `/party?tab=invites`. A party's card whose room request this phone made from a card that waited for
  the booking window also opens that room card again in the answer frame (Group study rooms).
- **A push in front.** While the app is open, a push drops no banner and plays no sound; it goes to the phone's
  notification list. On Android a banner cannot show without sound. The app instead fetches again the lists "알림"
  and the "파티" badge are made from (`src/push/push-arrivals.tsx`).

### When the app asks, registers, and unregisters

Asking and registering happen only on Android, in a build that asks the main server, holds the native module, and has
a ready Session. The iOS build has no push entitlement, so nothing is asked or registered there. A mock build never
asks and never registers, and its `registerPushToken` does nothing.

- **Asking.** Nothing is asked at app start, at sign-in, at Onboarding, or in first run. `PushAskHost`
  (`src/push/push-ask-host.tsx`, inside the overlay host) shows the sheet of board t17 ("나설 시각을 휴대폰으로 알려
  드릴까요?") once the action that asked went through: a Party sent with at least one Friend invited, from the Party
  form or the Assistant's Proposal card, and a library seat or room booked. Screens ask with `useAskForPush()`. The
  sheet shows only while the wrapper reports the permission as undetermined, which means the phone's own prompt can
  still show (on Android 13 and later that is a permission never asked, reported as denied but still askable), and
  never before on this phone (`pushAsked` in what the phone keeps, which a sign-out leaves as it is). "알림 받기"
  leads to the phone's prompt; "나중에" closes it for good. With the permission already granted (Android 12 and
  below), the token is registered at once without the sheet.
- **Registering.** `PushRegistration` (`src/push/push-registration.tsx`, beside `LiveUpdates`) sends the phone's
  Expo push token with `PUT /users/me/push-token` when the permission is granted: at every start, at every sign-in,
  and whenever the phone says its token changed. Until one has gone through, it is tried again each time the app
  comes back to the front, which also picks up notifications allowed later in the phone's settings. It never asks
  for the permission.
- **Unregistering.** When the Session ends on the phone, by a sign-out or by the main server's word, the app calls
  `unregisterPush()` before it forgets its tokens, whatever the main server answered, so a signed-out phone receives
  nothing even when the server could not be told. Unregistering goes through Firebase and needs the network. When it
  does not go through, the phone keeps `pushUnregisterOwed` and tries again at a start and each time the app comes
  to the front while no Session is ready on it (nobody signed in, or a User still at the consent or in Onboarding).
  No token of the ended Session is kept for this. What is owed goes before the next registration, and a registration
  that goes through clears it.

## Crash reports

A Release's build reports to Sentry (sentry.io, US): unhandled JavaScript errors and promise rejections, native crashes
on Android and iOS, Android's ANR and iOS app hangs, and sessions, which give the share of sessions and Users without a
crash for each release. Tracing, profiling, session replay, screenshots, the view hierarchy and Sentry's logs are
off. The SDK is `@sentry/react-native` 8.36.0, with its Expo config plugin (`app.json`) and its Metro plugin
(`metro.config.js`), which give each bundle and its source map one Debug ID so that a stack is read against its own
source map.

### The layer

`src/telemetry/` is the only folder that imports `@sentry/react-native`, and a test that reads the source tree fails
on an import anywhere else (`__tests__/telemetry/sentry-import-boundary.unit.test.ts`). App code calls what
`src/telemetry/index.ts` exports:

- `startTelemetry()`, called once by the root layout before the first screen. Without `EXPO_PUBLIC_SENTRY_DSN` it
  starts nothing and every other function does nothing: tests, a local build, the mock APK and the Dev Server's and a
  UAT's APK report nothing.
- `reportError(error, where)`, for an error the app caught. `where` is one of a closed list in
  `src/telemetry/sentry.ts`: `screen` and `test-error`.
- `TelemetryBoundary` and `RouteBreadcrumb`, below.

Every report is tagged with `release_tag` and `release_commit` (the build's `EXPO_PUBLIC_RELEASE_TAG` and
`EXPO_PUBLIC_RELEASE_COMMIT`, which 내 정보 shows), `ota_update_id` and `runtime_version` (from `expo-updates`),
`app_version` and `platform`; a missing value is `none`. `environment` is `production`, or `development` in a
development build. `release` and `dist` are left to the SDK, which takes them from the native build.

A refusal the main server answers on purpose, an `ApiError` with a 4xx status, is not an error of the app and is never
reported, whether it was passed to `reportError` or nothing caught it.

### What is taken out before a report leaves

`beforeSend` and `beforeBreadcrumb` pass every report and breadcrumb through `src/telemetry/scrub.ts`:

- every URL loses its query string and fragment, and each path segment that is a UUID or a number becomes `:id`
  (`/quests/3f2a…?lat=37.45&lng=126.95` becomes `/quests/:id`). This holds for the report's request, for each HTTP
  breadcrumb and for the URLs in other breadcrumbs' data;
- console breadcrumbs are dropped, and of an HTTP breadcrumb only the method, the scrubbed path and the status are
  kept;
- an error's message, and a breadcrumb's, is cut to 200 characters;
- the User is the id alone, and the device's name and the server name are dropped.

`sendDefaultPii` is off. The native SDKs' own breadcrumbs never pass `beforeBreadcrumb`, so those that could hold a
URL or a touch are off: iOS's network breadcrumbs and automatic breadcrumbs, and Android's user interaction
breadcrumbs. A native crash and an ANR are sent by the native SDK at the next start and do not pass `beforeSend`
either: they carry the scope the JavaScript set, which was scrubbed, and the native stack.

### The screens before a crash

`RouteBreadcrumb`, in the root layout, leaves a breadcrumb at each change of screen with the route's pattern from
expo-router's segments, without the groups: `/room/[questId]`, never the id. Touches are not recorded.

### A screen that fails to draw

`TelemetryBoundary` is around the root layout's `Stack`. A screen that throws while drawing shows "문제가 생겼어요"
with "다시 시도", and the error is reported once. "다시 시도" draws the Stack anew, which starts from the start
screen, as a start of the app does.

### The test error

A long press on the build line at the bottom of 내 정보 asks "시험 오류를 보낼까요?", and "보내기" reports one handled
error, "A test error, sent from the build line in 내 정보", with `where` `test-error`. The line looks as it did; the way
in is unmarked, and what it sends is one harmless report. Use it to check a build: in Sentry's Issues, the error should
appear with the Release's `release_tag`, and with a stack that names `src/screens/me/build-line.tsx` when the build's
source map was uploaded.

### The settings

| Variable                     | Read by                   | What it does                                                         |
| ---------------------------- | ------------------------- | -------------------------------------------------------------------- |
| `EXPO_PUBLIC_SENTRY_DSN`     | the app's bundle          | Where reports go. Without it the app reports nothing                 |
| `SENTRY_ORG`                 | a native build, an upload | The organisation's slug in Sentry                                    |
| `SENTRY_PROJECT`             | a native build, an upload | The project's slug in Sentry                                         |
| `SENTRY_AUTH_TOKEN`          | a native build, an upload | Uploads source maps and native symbols. Never committed              |
| `SENTRY_DISABLE_AUTO_UPLOAD` | a native release build    | `true` skips the upload, which fails a release build without a token |

The DSN is in the app's bundle by design: it only allows sending. Neither the DSN nor the token is committed, pasted
into a chat or shown in a screenshot. The organisation and the project are not in `app.json`: the plugin reads them
from the environment when a native build is made, so they change no fingerprint. To check reports from a development
build, put a test project's DSN in `.env` and start the app again; a debug build uploads no source map, and its stack
is read by the development server.

Adding Sentry changed the app's native part, so it came with `version` 1.0.4 and a new APK
([The Production APK](../infra/production/README.md#the-production-apk)).

## 관정도서관 (P06)

The app books 관정도서관 itself, as the User, through the library's booking site `k-rsv.snu.ac.kr`. Why the library
session stays on the phone is [ADR 0012](../docs/adr/0012-a-third-partys-session-stays-on-the-phone.md). The code is in
`src/library/`:

```text
site.ts              the site's addresses, the allow-list, and which pages belong to the site
client.ts            the library client: one function per call, over a transport (`createLibraryClient`)
transport.ts         what a transport is: `call(endpoint, body)` and `logout()`
hidden-transport.ts  the app's one transport, the hidden web view: waits for its page, injects, matches the reply
hidden-view.tsx      the hidden web view, mounted at the app's root while the flag is set
call-script.ts       the one fixed script injected per call, and the message protocol
login-view.tsx       the full-screen login web view
library-session.tsx  the login, the flag and the logout for the screens (`useLibrarySession()`)
flag.ts              the "logged in" flag, `kwanjeong.loggedIn` in AsyncStorage
end-session.ts       "end the library session", the one shared logout step
web-cookies.ts       the JS wrapper of modules/snu-now-web-cookies
errors.ts            the failure kinds and what a card says for each
press.ts             the confirm press that a write needs
room-bookings.ts     the phone's map from a room booking's BSEQNO to its room request, and the requests that wait for
                     the booking window with their cards
cards/               the library cards' logic: the payloads, seats, rooms, bookings, times, the done message and a room
                     request's companions
```

### The endpoints

Every call is a form POST to `/NEW_SNU_BOOKING/json/<name>`, except the room form, a `GET` of the page
`/NEW_SNU_BOOKING/pc/booking/roomForm`. The script and the client hold the same allow-list (`site.ts`) and refuse
anything else with `notAllowed`.

| Kind      | Endpoint              | Client       | What it gives                                                          |
| --------- | --------------------- | ------------ | ---------------------------------------------------------------------- |
| Read      | `getSectorList`       | `sectors`    | The sectors of a floor                                                 |
| Read      | `getRoomList`         | `roomTimes`  | The rooms of a sector on a date, with their free 30-minute starts      |
| Read      | `getSeatBookingList`  | `seats`      | The seats or rooms of a sector for a time, free or taken               |
| Read      | `getSeatInfoFromList` | `seatInfo`   | A room's GR_MIN and GR_MAX, the people it takes                        |
| Read      | `getUserCheck`        | `checkUser`  | Whether the library knows a companion's name and 학번                  |
| Read      | `getMyBookingList`    | `myBookings` | The User's own bookings between two dates (the site's null is `[]`)    |
| Room form | `roomForm`            | `roomForm`   | Only the applicant's name and 학번, and the prefilled phone and email  |
| Write     | `setRoomBooking`      | `book`       | Books a seat or a room                                                 |
| Write     | `setCancelBooking`    | `cancel`     | Cancels a booking (STATUS 1 or 2), or returns a seat in use (STATUS 3) |

`setSeatReturn` is not used and is not on the list: no button of the site uses it, and a return is `setCancelBooking`.
A write is sent only with the `ConfirmedPress` a card's confirm button makes (`confirmedPress()`); without one the
client throws `notAllowed` and nothing reaches the site. The client retries nothing by itself: a write that timed out
is never sent again, and the card reloads 내 예약 to show what happened. The hidden view's page has 20 seconds to load,
and each call 15 seconds, after which it counts as `network`.

A call fails with a `LibraryError` whose `kind` is one of:

- `sessionEnded`: HTTP 999, a redirect, a reply that is not JSON (for the room form, a page without the applicant's
  fields), or the hidden view's page landing anywhere off the site's `/NEW_SNU_BOOKING/pc/` screens;
- `network`: no answer in time, an HTTP error, or a reply the client cannot read;
- `notAllowed`: an endpoint off the list, or a write without a confirm press;
- `noSession`: the flag is not set, so the client did not call at all.

The error names only the kind and the endpoint, never a form field or a reply, so that nothing of the library
reaches a log or an error report.

### The session ended

On `sessionEnded` the client clears the flag, which unmounts the hidden view, and the card shows "관정도서관 로그인이
끝났어요. 다시 로그인해 주세요." with 로그인. 로그인 opens the login again (`retryAfterLogin`), and after it the action the
User pressed is tried once more; a second failure is the card's to show.

The login opens `…/pc/main` in a visible web view and injects nothing into it. It is done once the view is back on
`/pc/main`, `/pc/booking` or `/pc/mybooking` and one read through the hidden view, the User's own bookings for today,
answers with JSON (`loginWorks`); only then is the flag set. ✕ is "no session", and after 5 minutes the view closes
with "로그인하지 못했어요".

The site serves `/pc/main` before it sends the User to the school's login too, so the first landing starts a check
with no session, which can take up to 35 seconds. The checks belong to the provider, not to the view
(`login-checks.ts`): one runs at a time, on the hidden view's page loaded afresh (`reloadPage()`). A landing that comes
while one runs is kept, and so is ✕ pressed while one runs; when the running check finds no session, one more check is
made, but not while the visible view is off the site's screens (the User in the school's login): it waits for the
next landing or the close. After ✕ or the five minutes, the login's outcome (and "로그인하지 못했어요") waits for a check
still to come. A check that finds the session sets the flag even after the view was closed, so a User who logged in and then
closed the view is still logged in, and the cards follow. Every check ends with the hidden view unmounted unless the
flag is set, and a logout or the provider's end cancels the checks (P15 ticket 57).

Every mounted card follows the flag (`useLibraryLoad`): after a login, a card whose read failed for want of a session
reads again; after the session was ended on purpose (`endLibrarySession`, which clears the flag as `loggedOut`), a card
that had read reads again and shows "관정도서관 로그인이 필요해요". A session that ended under a call is the failed card's
to show, with its 로그인 that sends the pressed write once more.

### The seat book card's time and seat (P15 ticket 57)

The seat book card shows its time as a band (`slot-band.tsx`, rules in `cards/slot-band.ts`): a track from the
space's opening to its closing time, the band with a handle at each end, and "14:00–20:00 · 6시간" under it. A drag
moves an end or the band whole, by the space's step (30 minutes), never before the next 30 minutes today, after
closing, or outside the space's shortest and longest length; the seats and the room chip's counts are read again when
the finger is let go. `now` is read at each render, at the let-go and at 예약하기: a start that went by moves on with the
end along, a day with no room left says "오늘은 예약 시간이 끝났어요", and the booking (`seat-booking.ts`) refuses a slot
that is no longer valid. The time and the seat on screen are kept with the chat where the room is (`CardRoom`), so
later requests send the key of the card as it is on screen.
자리 선택하기 opens the room's seat picture (`seat-picker.tsx`): the site's `area_<sectorNo>.png` with each seat at its
`POSX`/`POSY` from `getSeatBookingList` and its number, zoomed by two fingers or 확대 and 축소 (1 to 4 times). A press
picks a free seat and colours it alone; "<n>번 선택" puts it in the card. A space without `mapImage` has no picture.

### Logout

`endLibrarySession()` (`end-session.ts`) is the one step that ends the library session. Three paths take it:

- the 내 정보 row "관정도서관 로그인", which shows 로그아웃 while the flag is set;
- the app's `signOut()` (`src/auth/sign-in.ts`), once the main server's tokens are forgotten;
- the forced end of the app's Session, `endSession()` (`src/session/session-events.ts`), right after it forgets the
  tokens. It is a refused token or the Session replaced on another phone, and does not go through `signOut()`.

The two sign-outs take it whether or not the flag is set and do not wait on it (`endLibrarySessionInBackground()`).
In order: with the flag set, or once a login view was opened since the session last ended (the cookie jar may then hold
a session the flag never knew of, as after a login closed before its check), the hidden view is mounted if it is not
and loads the site's logout URL (15 seconds at most, and a failure does not stop the rest; otherwise there is no view,
no call and no wait); every web-view cookie is cleared by
`clearWebViewCookies()`; and the flag is cleared. The cookies and the flag are cleared even when an earlier part fails.

### The cookie module and its lint rule

`modules/snu-now-web-cookies` is a local Expo module that only clears cookies (its own README has the details). Its one
function, `clearWebViewCookies()`, calls `CookieManager.removeAllCookies` and then `flush()` on Android, and on iOS
removes the cookies of the default `WKWebsiteDataStore` and of `HTTPCookieStorage`. It has no function that reads,
lists or sets a cookie. `src/library/web-cookies.ts` is its JS wrapper; in a build without the module (Expo Go, the
web, Jest) it does nothing.

`.oxlintrc.json`'s `no-restricted-imports` forbids importing `web-cookies` (`**/web-cookies`,
`@/library/web-cookies`) anywhere but `src/library/end-session.ts` and `__tests__/`, and forbids
`@react-native-cookies/cookies` everywhere. That package was the first choice; its 6.2.1 does not build under Gradle
9.3.1.

### The fake library

No test reaches the real site. `__tests__/support/kwanjeong/fake-library.ts` is a fake 관정도서관: `FakeLibrary`
answers by endpoint and form fields from the redacted replies recorded from the site, the JSON files beside it
(`getSectorList_all.json`, `getRoomList_<sectorNo>_<YYYYMMDD>.json`, `getSeatBookingList_<sectorNo>.json`,
`getSeatInfoFromList_all.json`, `getMyBookingList_20260901-20261004.json` and the `seatinfo_*` files), copied from the
P06 references. The room form answers `FAKE_ROOM_FORM`, a fake applicant (`2026-00001`, `010-0000-0000`,
`student@example.com`). It records every request in `requests`, and `writes()` lists those that change a booking,
which is how a test checks that no write left before the confirm press. `logouts` records each logout.

- `fakeTransport(library)` is the transport to give `createLibraryClient` in a test of the client.
- `answerFromFakeLibrary(library)` (`__tests__/support/library-session.tsx`) makes the app's hidden transport answer
  from it, for the tests of the screens and cards. The same file stands in for the cookie module's native side with
  a `jest.fn`.

A test tells it to fail with:

- `answerNext('sessionEnded' | 'network' | 'notAllowed', …)`: the next calls answer these error kinds, one each, in
  order;
- `refuseBookings(message)`: `setRoomBooking` answers the site's `bookingFailInfo` with the message;
- `takeSeat(seatNo)`: the seat shows as taken, and booking it is refused with "이미 예약된 좌석입니다.";
- `refuseUser(schoolNo)`: `getUserCheck` does not know that 학번;
- `refuseCancels(message)`: `setCancelBooking` answers with a failure;
- `holdWrites()` and `release()`: writes are answered only on `release`, as a slow library would.

`addBooking(booking)` adds a booking to `getMyBookingList`, and a cancelled or returned one is listed as 예약취소 or
본인반납.

### Group study rooms

A group study room with companions goes through a room request on the main server (`src/api/room-requests.ts`,
main-server `src/library/`), the app's routes and never the Assistant's: `POST /library/room-requests` with an
`Idempotency-Key`, `GET /library/room-requests` (the requests that ask the User, and the one-time notices),
`GET /library/room-requests/:id` (which the booker's card polls), `POST …/:id/consent`, `POST …/:id/decline` (거절 and
철회), `GET …/:id/companions`, `POST …/:id/companions { friendId }` with an `Idempotency-Key` (one more Friend),
`POST …/:id/result { ok, failedUserId? }`, `POST …/:id/cancelled` and `POST /library/room-notices/:id/seen`. A
companion who declines, or does not answer by 20:00 the day before, goes out and the request keeps gathering. The
booker's card then says who consented, who is asked and who is out (`companions`), and "N명 더 필요해요"
(`moreNeeded`); while a request made for booking gathers, it offers "친구 한 명 더 부르기", the party form's Friend
picker for one Friend (`room-ask-more.tsx`). From a server that sends neither field, the card reads `consents` alone.
In the mock build (`src/api/mock/room-requests.ts`) every companion still asked consents by the second look.
A card of a study plan for a date after the booking window has a key that ends in `:wait`
(`src/library/cards/room-window.ts`): while the window (today to 3 days later) does not hold its date, the card reads
no rooms, shows the day, the time, the room's size and each person's note, gathers the consents, and says
"11월 6일 09:00 예약 창이 열리면 예약할 수 있어요" (for 9 November) with 예약하기 unavailable (`waiting-room-card.tsx`). The phone
keeps the request with its card by its Quest in `room-bookings.ts`, until the room is booked; the room-window
Notification's address, `/main?card=party:<questId>`, then opens the answer frame with "예약 창이 열렸어요" and that card
again, bound to the request, which reads the rooms and books once everyone agreed (`waiting-room.ts`). The server
keeps no way to find a requester's request by its Quest, so a request made on another phone, or before the app was
reinstalled, opens only the party's card.
Once the request is ready, the booker's phone reads the companions' names and 학번 (the one reply that holds them,
`Cache-Control: no-store`), checks each with `getUserCheck`, books with `setRoomBooking` and reports only `ok` or the
companion the library did not know. The BSEQNO stays on the phone, in `room-bookings.ts`'s map, so that a later cancel
can tell the server "the booking of request X was cancelled" with no body.

### The seat card's room

A seat card the Assistant gave for one of 관정관's seat spaces starts with the room chip ("7층 열람실 ▾",
`cards/seat-rooms.ts`): the floor and kind of room in use. Tapping it lists the rooms in a column per floor and a row
per kind, each cell with the free seats, for the card's time, of the seat space of that room with the most of them;
only then are the sectors the 공부공간 layer gives read, all at once (`screens/main/library/use-room-counts.ts`). One
tap fills the same time in that space, and 되돌리기 returns to the room the card first showed. Without a library
session the cells show names only, and a tap fills the largest space of the room. When the card's own room has no free
seat for its time, the phone fills the space of the same kind with the most free seats, else the one with the most.
The chat keeps the room shown with the card, and later requests send the card by the key of that room's book card,
which names the space and the time and no count.

### Privacy

Library data never leaves the phone. The session stays in the web views' cookie jar, which no app code reads; the
client gets back only parsed JSON or an error kind. No library reply, seat, booking, BSEQNO, phone number or email is
sent to our servers or the model: the Assistant's library cards carry only the space, date, time, duration and
`useDesc`, and the done message after a booking is the app's own bubble, never sent to the model. The only thing the
main server hears of the library is a room request's result and its cancel, with no library data. Errors and logs
name a failure's kind and endpoint only. A companion's 학번 and registered name come from the main server only to the
booker's phone, after that companion consents, and go only to the library.

Examples, tests and fixtures hold no real 학번, name, session or library reply: 학번 are fake (`2026-00001` and so
on), and the fixtures are redacted.
