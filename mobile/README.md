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
| `EXPO_PUBLIC_SIGN_IN_ENDING` | `signed-in`, `cancelled`, `not-snu-account`, `failed` | How the mock sign-in ends. Without it: `signed-in`  |
| `EXPO_PUBLIC_MOCK_SLOW`      | operations, separated by commas                       | These mocks answer after three seconds              |
| `EXPO_PUBLIC_MOCK_FAIL`      | operations, separated by commas                       | These mocks answer with a failure                   |
| `EXPO_PUBLIC_MOCK_EMPTY`     | operations, separated by commas                       | These mocks answer with nothing                     |
| `EXPO_PUBLIC_FIRST_STATE`    | `1`                                                   | What the phone keeps is cleared when the app starts |

An operation is named as in the table under "Data" below, such as `listFriends`. `completeOnboarding` and `enterLobby`
have no empty answer, so `EXPO_PUBLIC_MOCK_EMPTY` leaves them as they are.

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
src/storage/        what the phone keeps between two starts of the app
src/session/        where the User is in the flow between the screens, and the work of the start
src/screens/        the screens that the routes show
__tests__/          Jest tests
assets/             app icons, the splash image, the fonts and the loading screen's photos
```

Keep code that is not a screen, such as components and hooks, in `src/` outside `src/app/`.

## Screens and the flow between them

The app starts on the loading screen (`/`), once. While it shows, the app reads what the phone keeps and, for a User
who signed in and finished Onboarding, fetches the Lobby. Then it shows where the User belongs:

| The User                                  | Sees        | Address       |
| ----------------------------------------- | ----------- | ------------- |
| is not signed in                          | Sign-in     | `/sign-in`    |
| signed in and has not finished Onboarding | Onboarding  | `/onboarding` |
| finished Onboarding                       | Main screen | `/main`       |

`src/session/session.tsx` holds where the User is while the app runs. A screen that belongs to one of these places
starts with `useOwnPlace(...)`, which leads a User who does not belong there to where they do. A sign-in calls
`enter`, a saved Onboarding `finishOnboarding`, a sign-out `leave`, and the screens follow.

A screen's file in `src/app/` only says which place it is; the screen itself is in `src/screens/`.

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
  with what the `Main` wireframe shows. A mock answers after 0.3 seconds.

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

The phone keeps that the User signed in, what the sign-in suggested for Onboarding, whether Onboarding is finished and
its answers (`src/storage/kept.ts`). `openKept()` is the read for the start of the app: it is the one that honours
`EXPO_PUBLIC_FIRST_STATE`.

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

To see every component in every variant, start the app and press "디자인 시스템 보기" on a screen that is still a
placeholder, or open
`/catalogue`. The catalogue is for developers: a released app does not show it. Compare it with the design system's
own previews when a component changes: `pnpm web` serves the catalogue to a browser, where a phone-sized window
shows it as the previews do.
