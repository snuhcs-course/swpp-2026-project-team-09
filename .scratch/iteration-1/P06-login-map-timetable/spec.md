# P06: Build the loading, sign-in, Onboarding and main map screens

Status: ready-for-agent

[`todo.md`](./todo.md) tracks the work and describes the interfaces between the screens and the data behind them.

## Problem Statement

A User has no way to enter the app or see the campus: the app is one placeholder screen. Every other screen of Iteration 1 sits on the map, so nothing can be shown until the app opens, lets a User in and shows the map. The app's developers cannot wait for the server either. Some of what the main screen shows is not served yet, and the rest is served by a server that no phone can reach yet.

## Solution

The app opens on a loading screen, lets a User sign in, takes a new User through Onboarding and shows the main screen: Kakao's map of the campus with the User's Avatar, Friends, events and the frame's lists and buttons around it. The screens follow the team's wireframes.

Every piece of data is a mock inside the app, in the shape the server gives or will give, behind one seam. The last ticket connects the mocks to the main server, feature by feature, for the features the app's developers name at that time. The map is real from the start: a native module shows Kakao's map on Android, and a ticket lets a teammate write the iOS side to the same interface.

## User Stories

### Opening the app

1. As an SNU student, I want a loading screen while the app gets ready, so that I never see a half-drawn screen.
2. As an SNU student, I want the loading screen to end when the loading does, after a moment long enough to read it, so that I am not kept waiting for show.
3. As an SNU student who signed in before, I want the app to go from the loading screen straight to the map, so that I get to the campus at once.

### Signing in

4. As an SNU student, I want one button that signs me in with my SNU Google account, so that I do not type a password.
5. As an SNU student, I want to see that my account is being checked, so that I do not press again.
6. As a person with a Google account outside SNU, I want to see why I cannot sign in, so that I do not retry in vain.
7. As an SNU student whose sign-in failed for another reason, I want to be told to try again later, so that I do not think my account was refused.
8. As an SNU student, I want to open the terms I agree to from the sign-in screen, so that I know what I accept.

### Onboarding

9. As a new User, I want my name and department suggested from my Google account, so that Onboarding takes a moment.
10. As a new User, I want to finish Onboarding with only a name and a department, so that the rest can wait.
11. As a new User, I want to add my course level, admission year, gender and interests if I like, so that my companions know who I am.
12. As a new User, I want to sign out from the Onboarding screen, so that I can leave when I signed in with the wrong account.
13. As a User who finished Onboarding, I want never to see it again on this phone, so that opening the app stays quick.

### The map

14. As an SNU student, I want the map to fill the screen and open on the whole campus, so that the map is the app.
15. As an SNU student, I want to zoom and pan inside the campus, and the map to stay on the campus, so that I never lose it.
16. As an SNU student, I want my Avatar at my position, gliding to each new position as I walk, so that the map feels live.
17. As an SNU student, I want a button that brings the map to my position, so that I do not get lost after panning.
18. As an SNU student who is off campus, I want the map to show the whole campus without my Avatar, and the button for my position to say that I am off campus, so that I can still look around and know why the map did not move.
19. As an SNU student, I want an explanation before the location permission prompt, so that I know why it is asked.
20. As an SNU student who refused the location permission, I want the map to work without my Avatar, so that I can still look around.
21. As an SNU student, I want my Friends, Global Events and Parties on the map, with more detail as I zoom in, so that the whole campus is not cluttered.
22. As an SNU student, I want to tap a marker and read its card, so that I can decide what to do.
23. As an SNU student, I want a card's "길찾기" to draw the way there, so that I know how to get there.
24. As an SNU student, I want the sources of the map data credited on the map, so that the project meets their licences.

### Around the map

25. As an SNU student, I want my Friends in a list at the left and my Quests in a list at the right, each of which I can collapse, so that I see my people and my day without leaving the map.
26. As an SNU student, I want to tap a Friend in the list and have the map go to them, so that I find them at once.
27. As an SNU student, I want the frame's buttons, its AI input and its bottom navigation in their places, so that I see the app as it is designed.
28. As an SNU student, I want a control whose feature is not ready to say so, so that I do not think the app is broken.

### Platform and people

29. As an SNU student, I want every label in Korean, so that I read the app in my language.
30. As a developer with an iPhone and no Mac, I want every screen but the map itself in Expo Go, so that I can check my work alone.
31. As a developer, I want the Android map checked on an emulator on my own machine, so that I do not write native code without running it.
32. As the teammate with a Mac, I want a ticket and a settled interface for the iOS side of the map, so that I can write it without reading the Android side's history.
33. As a reviewer, I want screenshots of each screen in its pull request, so that I can judge it without building the app.

## Implementation Decisions

### Scope and order

- The task builds four screens, in this order: the loading screen, the sign-in screen, the Onboarding screen and the main screen.
- The design system comes first, as the first ticket. Connecting the mocks to the main server comes last, as the last ticket.
- The Android side of the native map is part of the task. The iOS side is a ticket of this task, for a teammate with a Mac.

### The flow between screens

- The first time: the app starts, shows the loading screen, then the sign-in screen, then the consent screen, then Onboarding, then the main screen.
- The consent screen is shown once on a phone, to a signed-in User who has not agreed there yet: after the sign-in, or after the loading screen. A sign-out and a new sign-in do not show it again.
- A User who signed in and finished Onboarding on this phone: the app starts, shows the loading screen, then the main screen.
- A User who signed in, agreed and did not finish Onboarding: the loading screen, then Onboarding.
- The loading screen is shown once, when the app starts. It is not shown again after a sign-in or after Onboarding.
- Nothing in this task signs a User out of the main screen: sign-out is on 내 정보, which P09 builds. A development setting puts the app back in its first state.

### Wireframes and design system

- The wireframes are the team's Design canvas "SNU Now 와이어프레임", and its design system is the team's Design System "SNU Now". A screen's layout, wording and behaviour follow its frames.
- The frames this task builds:

| Screen | Frames |
|---|---|
| Loading | `Splash` |
| Sign-in | `Login`, `LoginLoading`, `LoginError` |
| Onboarding | `Onboarding` |
| Main | `Main`, `MainCollapsed`, `MapOverviewSelect`, `MapZoomed` |

- The wireframes change while the app is built. Before work on a screen starts, its frames are read again, and the ticket's Comments record what changed.
- The first ticket ports the design system to React Native: its tokens, the Pretendard font, its icons and the components the four screens use, with a Toast, which the frames use and the design system lacks. A component the four screens do not use is left for the task that needs it.
- Every control carries a Korean accessibility label and a touch area of the design system's minimum, and motion respects the phone's reduced-motion setting.
- The app is light only. The design system has no dark theme.
- The sign-in button holds the university's emblem, as the `Login` frame draws it. The design system's brand book says not to reproduce the emblem; until the team settles which holds, the frame does.

### Mock data and the seam

- A screen never holds data of its own. It asks one API client, and in this task every answer of that client is a mock inside the app.
- Loading, errors and refetching are left to TanStack Query: a screen asks for data and is told whether it is loading, failed or there.
- A mock answers in the shape the main server gives, or will give, for that feature:
  - where the main server serves the feature on its main line, the mock copies that answer;
  - where an open pull request defines the answer, the mock copies it and is marked provisional;
  - where nothing defines it, the app gives it a shape of its own, marked provisional.
- One adapter per feature turns the answer into what the screens use, so that connecting the server changes the adapter and the client, not a screen. What a frame shows and no answer holds, such as a Friend's status line, comes from a mock of the app's own beside the answer, not from fields added to it.
- A mock answers after a short wait and can answer with a failure and with nothing, so that loading, error and empty states can be seen.
- The phone keeps what the app needs to open again: that the User signed in, that the User agreed to the legal documents, the suggestion the sign-in brought, whether Onboarding is finished, and the Onboarding's answers.
- A feature that the main server already serves is still a mock here. The last ticket connects it.
- What the app needs from the server is not written into this task's documents. It is passed on in person.

### Loading screen

- The screen is the `Splash` frame: the campus photos, the wordmark, the bar with its percentage and the step labels.
- It is shown while the app reads what the phone keeps of the User and, for a User who is signed in and finished Onboarding, fetches the Lobby. After a sign-in or Onboarding the Lobby is fetched as the main screen opens, without the loading screen.
- The font is loaded before the loading screen appears. A font that fails to load does not stop the app: it goes on in the system font.
- Its bar fills as that work goes and reaches the end when the work is done. The step labels are the frame's and follow the bar.
- It stays for at least 0.5 seconds.
- When the work fails, the screen says "불러오지 못했어요" and offers "다시 시도".

### Sign-in

- The screen is the `Login` frame, with its three states: default, checking and refused.
- Sign-in lives behind one module with two operations, sign in and sign out. A sign-in that succeeds brings whether the User finished Onboarding and, when not, the suggestion.
- In a build that holds Google's sign-in module, the module asks Google: Google's account sheet opens, and the app itself checks the account's domain in the ID token. An account whose hosted domain is not `snu.ac.kr` is outside SNU and is signed out of Google again. Nothing is sent to the main server, and the suggestion is the Google account's name with no department. The app does not verify the token, so its check only decides what the screen shows until the main server's word replaces it ("Connecting to the server").
- Everywhere else, in Expo Go, on the web and in the tests, the module is a mock: it signs in after a short wait.
- How a sign-in ends, and what the screen shows:

| Ending | What the screen shows |
|---|---|
| Signed in | The consent screen the first time on this phone; after that Onboarding, or the main screen for a User who finished it on this phone |
| The account is outside SNU | The refused state: "로그인하지 못했어요", "@snu.ac.kr 계정만 가능해요" |
| The User closed Google's sheet | The default state |
| Any other failure | The refused state with other words: "로그인하지 못했어요", "잠시 후 다시 시도해 주세요" |

- The mock ends in "signed in" unless a development setting names another ending. With that setting the module is the mock in every build.
- The sign-in screen does not ask for consent to the legal documents and has no links to them, unlike the frame's footer.

### Consent

- The consent screen comes after the first sign-in on a phone and before Onboarding. No frame draws it: it is built from the design system.
- It lists the three legal documents, 이용약관, 개인정보 처리방침 and 위치정보 이용약관. Each opens on a screen of its own with a placeholder text, the frame's legal overlay, and closes back to the consent screen.
- "동의하고 시작" stores on the phone that the User agreed and leads to Onboarding, or to the main screen for a User who finished Onboarding, as the sign-in would have.
- "로그아웃" signs the User out and shows the sign-in screen, so that a User who does not agree is not held there.
- The Lobby is fetched at the start of the app only for a User who agreed and finished Onboarding.

### Onboarding

- The screen is the `Onboarding` frame: name, course level, department, admission year, gender and interests. The course level starts as undergraduate, as in the frame.
- The name and the department are filled in from the suggestion that the sign-in's answer carries, each with the badge "Google 계정에서 가져옴" until the User changes it. A part the suggestion lacks, or a department that is not in the list, stays empty.
- The department is chosen from the frame's lists of undergraduate and graduate departments, which ship with the app. Changing the course level clears the department.
- The admission year list holds twelve years, this year and the eleven before it. "그 외" stores no admission year.
- Interests follow the main server's limits for hashtags: 20 at most, 30 characters each, no whitespace, none twice whatever its case. The `#` is shown and not stored.
- The save button is enabled once a name and a department are there. Saving completes Onboarding and shows the main screen.
- "로그아웃" signs out and shows the sign-in screen.
- There is no way back, on screen or with Android's back button.
- The answers are kept on the phone. The main server stores four of the six today; the course level and the gender have no place there yet.

### Map

- The map provider is Kakao. No maintained React Native library exists for its SDKs, so the app reaches them through the team's own native module, a local Expo module inside the app project.
- The map is not shown in a web view.
- The rest of the app depends on one map component with a provider-neutral interface. No screen calls the native module directly. The interface works in latitude and longitude and offers:
  - the rectangle the camera stays in, and the smallest and largest zoom;
  - moving the camera, with or without animation;
  - markers, each with an identifier, an image and an optional text under it; a marker can be added, changed and removed;
  - Avatars, which are markers that glide from their position to a new one over a given time; a move that starts during another starts from where the Avatar is shown;
  - one route line, which can be drawn and cleared;
  - a press on a marker or an Avatar, giving its identifier;
  - an event when the camera stops, giving its centre and its zoom.
- A marker's image is a picture the app makes from the design system's own marker views, once for each look, and hands to the map: the native map draws images, not React views. A name under a marker is the SDK's own text.
- The camera stays inside the campus rectangle: a fixed rectangle a little wider than the Campus Boundary. The rectangle is a constant in the app; the Campus Boundary stays the server's. The map opens on the whole rectangle, which is also the furthest zoom out. Where the SDK does not limit panning, the module brings the camera back inside when a move ends outside.
- The credit for the map data is one line in the smallest text size at the bottom left of the map: "© OpenStreetMap · 국토지리정보원". Kakao's logo stays visible and unchanged.
- In a build without the native module, which Expo Go and the web are, the map's place holds a plain ground and the words "지도는 Android 빌드에서 보입니다". Everything around the map is shown as usual. There is no stand-in map.
- The app chooses while it runs, by whether the build holds the native module, and loads the module only when it does.
- The Android side:
  - Kotlin, with Kakao Maps SDK for Android 2.15.2 from Kakao's Maven repository, built for arm64.
  - The Kakao native app key is a setting that a person fills in. The app's identifier `com.bonnieandclaude.snunow` and the development key hash are registered at Kakao.
  - The Android and iOS project folders are generated from the app's configuration and are not committed.
- The iOS side is written in Swift to the same interface, on a Mac, after the Android side is checked. Its ticket carries the interface, the device check and what the Android check taught.
- The device check, for either side: the map appears, a marker appears with its name, an Avatar glides to a new position, the route line appears and clears, the map survives leaving the screen and coming back, a press on a marker is answered, the camera's stop is reported, and the camera cannot be left outside the campus.

### Main screen

- The screen shows every element that the `Main` frame shows in its default state, with mock data.
- What works, because it ends inside the screen:
  - The friend list and the Quest list collapse and expand.
  - A Friend's row moves the map to that Friend and opens their card, or says "…님은 위치가 꺼져 있어요" for a Friend without a position.
  - A Class Quest's row moves the map to its Place and says what the frame says.
  - The zoom in, zoom out and "내 위치로 이동" buttons.
  - A tap on a marker opens its card. "가까이 보기" zooms in on it. The card's X closes it.
  - "길찾기" on a card draws the route line from the User's position, moves the map to show it and says "…까지 길 안내".
- What is on the map follows the frame. Avatars, which glide: the User's own, the Friends who can be seen, and a member of the User's Party. Markers: a Global Event and a Party. The frame's Private Event is left out.
- Their detail follows the camera's zoom, as in the frames: dots when the whole campus is in view, pins closer, and pins with names closest. The screen switches the detail from the zoom the map reports.
- A route to the User's next Quest is drawn when the screen opens, as in the frame, once the app has a position inside the campus rectangle; without one, none is drawn. Another "길찾기" replaces it, and leaving the screen drops it.
- When the app has no position to start from, "길찾기" moves the map to the place and says "캠퍼스 밖에 있어요" off campus, or shows the explanation before the location prompt when the permission is missing.
- Every other control shows one shared toast, "준비 중이에요", because it opens a panel, a sheet or another screen that this task does not build:
  - the friend pill, the Quest list's full-screen button, a Party's row in the Quest list;
  - "오늘의 발자국", "활성 파티", the 편의기능 button, the AI input and its send button;
  - the bottom navigation's 파티, 올리기, 행사 and 내 정보;
  - on a card: "같이 갈 사람 찾기", "참여하기", "파티 만들기", "파티 열기".
- On Android the back button closes an open card before it leaves the app.

### Location

- The User's Avatar is at the phone's real position.
- Before the system's location prompt, the app shows its own explanation. It appears the first time the main screen opens, and again when the User, without the permission, presses "내 위치로 이동". A User who chooses "나중에" or refuses the system's prompt gets the map without an Avatar.
- Off campus, in this task, means outside the campus rectangle. The Avatar is shown only while the position is inside it. Off campus there is no Avatar, the map shows the whole campus, and "내 위치로 이동" says "캠퍼스 밖에 있어요".
- A development setting replaces the phone's position with a walk along a fixed path on campus, so that the Avatar's gliding can be seen anywhere.
- This task does not send the User's position. The Master Switch is on 내 정보, which P09 builds, and the main server refuses every position while the switch is off. Sending is therefore built with the switch, in P09, so that a User turns sharing on and off in one place from the first day it exists.

### Wording without a frame

Built from the design system's dialog and the shared Toast. The team may change the words.

| Kind | Where | Words |
|---|---|---|
| Dialog | Before the location prompt | Title "내 위치를 지도에 표시할까요?". Body "지도에 내 아바타를 보여 주려면 위치 권한이 필요해요." Buttons "나중에" and "계속" |
| Consent screen | After the first sign-in | Title "약관에 동의해 주세요". Body "SNU Now를 쓰려면 아래 약관에 동의해야 해요." Rows "이용약관", "개인정보 처리방침", "위치정보 이용약관". Buttons "동의하고 시작" and "로그아웃" |
| Refused state | A failed sign-in | "로그인하지 못했어요", "잠시 후 다시 시도해 주세요" |
| Loading screen | The loading failed | "불러오지 못했어요", button "다시 시도" |
| Map's place | A build without the native map | "지도는 Android 빌드에서 보입니다" |
| Dialog | A sign-in on another phone ended this Session (ticket 12) | Title "다른 기기에서 로그인했어요". Body "이 기기에서는 로그아웃됐어요. 다시 쓰려면 로그인해 주세요." Button "확인" |
| Toast | My position, off campus | "캠퍼스 밖에 있어요" |
| Toast | A control of another task | "준비 중이에요" |

### Connecting to the server

- The last ticket replaces mocks with the main server, one feature at a time.
- Every feature that the demo's flows (P20) use on these screens is connected, where the main server serves it by then: sign-in, Onboarding, the Lobby, Friends and their positions, Quests, Parties, Global Events and the walking route. What the main server does not serve by then stays a mock and is recorded as such. Any other feature is connected when the app's developers name it.
- For each feature it connects, the client and the adapter change and the screens do not.
- Once sign-in is connected, the main server says whether a User finished Onboarding, and what the phone kept gives way to it.
- The app keeps one connection to the socket server open with the access token. Through it the app learns that the Session ended, receives the positions of the Users it may see, and is told when something it shows has changed, which it then fetches again.
- Before the demo build (P20), the list of mocks is checked, so that none is left by accident.
- The sign-in module already asks Google in a built app. The last ticket sends Google's ID token to the main server, keeps the main server's tokens in the phone's secure storage, and lets the main server's answer replace the app's own check of the account's domain.
- A real sign-in needs a built app, a Google sign-in client registered for the app's identifier and signing key, and a main server that the phone can reach. The ticket records which of these hold when it starts.

## Testing Decisions

- A good test drives a screen the way a User does and checks what the screen shows. It does not inspect component internals.
- Screens are tested with Jest against the mocks at the API client. The seams are the screens themselves and the API client; nothing below them is tested apart.
- In Jest the map is the plain ground of a build without the native module, which also lists what it was asked to show, so that a test reads a marker's name as a User would.
- The design system's components are tested as the screens are: what a User sees and does.
- The native module cannot be tested that way. Its Android side is run on an Android emulator on the developer's machine against the device check, and checked once more on the team's shared phone before its pull request is merged. Its iOS side is checked on the simulator by the teammate who writes it.
- Every pull request passes the app's four checks: lint, format, types and tests.
- Every pull request of a screen carries screenshots at the end of the template: of the app's web target for a screen without the map, and of the emulator for the map. Each screenshot is compared with its frame before the pull request is opened.
- Prior art: the app's placeholder screen test.

## Out of Scope

- The timetable, which opens from 내 정보. P09 builds both.
- Private Events: a Private Event on the map, the long press that makes one, its form, choosing a Place, and editing.
- 내 정보: the profile, the Master Switch and sign-out. P09 builds it.
- The panels and sheets of the main screen: the friend panel, the full-screen Quest view, the 편의기능 layers, the AI chat, the story sheets and 오늘의 발자국.
- The party and events screens.
- Sending the position: in the foreground with the Master Switch, in P09; in the background, in P17.
- A stand-in map for Expo Go and the web.
- A dark theme.
- The texts of the legal documents.

## Further Notes

- The timetable API, the Place at a position, Friends, positions, Quests and Parties are P08's, as tickets and open pull requests. This task's mocks copy their answers where they exist.
- Work reaches the main line as the team's rule says: this spec and its tickets in one pull request, then one branch and one pull request per ticket.
