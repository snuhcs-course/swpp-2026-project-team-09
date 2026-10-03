# P06 to-do list

Everything P06's app has to deliver, and everything filled with fake data for now. [`spec.md`](./spec.md) decides what is built, the tickets in [`issues/`](./issues/) say how each part is accepted, and this list tracks it all. Each section names who does its items. When a decision defers something or fills it with fake data, add it here at once; tick it when it is done.

Who does what:

- **Frontend**: the app's code. 안진영 writes it.
- **Device check**: running a built app on a Mac and on the shared Android phone, and fixing what fails. 함재현 does it.
- **Design**: wireframes the team has to draw and texts it has to write.
- **People**: what code cannot do, such as getting keys and registering the app in a console.

Last updated: 2026-10-04

## 1. Frontend, in the order of work

### 1.1 Foundation (tickets 01, 02)

- [ ] Design tokens (colours, spacing, radii, sizes, the eight text sizes)
- [ ] The Pretendard font (five weights)
- [ ] The 22 icons
- [ ] The 14 shared components: Icon, Button, Chip, Badge, Avatar, MapPin, EventCard, ChatBubble, ActionConfirm, TextField, ChatInput, Switch, BottomNav, BottomSheet
- [ ] A shared Toast (the design system has none) and the "준비 중이에요" toast, shown by every control whose feature belongs to another task
- [ ] The light theme only (the design system has no dark theme): the app's configuration says light, not automatic
- [ ] The libraries the spec names, added with Expo's installer: TanStack Query, Expo's crypto, secure storage and location modules, the build properties plugin, the development client, the socket client. The sign-in library comes with 1.4
- [ ] The settings file: the main server's address, the socket server's address, the Kakao native app key, the Google client IDs. The values stay empty
- [ ] The API client: attaches the access token, renews the session once on a 401 and repeats the request, handles `SESSION_REPLACED` and `ONBOARDING_REQUIRED`, adds an `Idempotency-Key` to creating requests and follows the retry rules
- [ ] TanStack Query for loading, errors and refetching
- [ ] The fake API and the per-feature list that says which features are fake (the table in section 3). A fake keeps what the User saves in the phone's storage; sign-out clears it
- [ ] One connection to the socket server after a sign-in, listening for `session-ended`
- [ ] Build settings: the app's identifier `com.bonnieandclaude.snunow` on Android and iOS, Kakao's Maven repository, arm64; `android/` and `ios/` are generated, not committed
- [ ] How to make a build, in `mobile/README.md`

### 1.2 Map (tickets 03, 04)

- [ ] The map component's interface, as the spec's Map decisions list it: the camera's rectangle and zoom limits, camera moves, markers with an image and a text that can be added, changed and removed, Avatars that glide, one route line that can be cleared, taps, a long press, and the camera's stop with its centre and zoom
- [ ] The marker images, one picture per kind and state
- [ ] The camera stays inside the campus rectangle the spec gives and opens on all of it. Where the SDK does not limit panning, the module brings the camera back
- [ ] The stand-in map for Expo Go and the tests: the wireframe's campus picture with positions computed from latitude and longitude, panning, zooming and the same events
- [ ] Choosing the real map or the stand-in while the app runs, by whether the build holds the native map. The native module is loaded only when it is there
- [ ] The Android map module (Kotlin)
- [ ] The credit for the map data, "© OpenStreetMap · 국토지리정보원" in the smallest text size at the bottom left of the map; a tap opens a sheet with both attributions and their links
- [ ] Kakao's logo moved to the bottom right, above the bottom navigation, uncovered
- [ ] The checklist for 함재현 (section 2)

### 1.3 Main map screen (tickets 05 to 11; every element of the wireframe's `Main`)

P06's own features:

- [ ] The map fills the screen and opens on the campus
- [ ] The markers' detail follows the zoom: dots, pins, pins with names
- [ ] The User's Avatar at their real position, moving smoothly as they walk. Off campus there is no Avatar and the map shows the whole campus
- [ ] The zoom in, zoom out and "내 위치로 이동" buttons. Off campus, "내 위치로 이동" says so and shows the whole campus
- [ ] An explanation before the system's location prompt. After a refusal the map works without the Avatar
- [ ] Global Event markers and the event card (title, time, place, source). The data is fake (section 3)
- [ ] Private Event markers (connected in 1.7)
- [ ] The walking route: "길찾기" on a card draws the route line. With no route, a message appears and the map moves to the place. The route is dropped when the screen is left

Elements filled with fake data (inside the main screen they work as in the wireframe):

- [ ] The friend list on the left, collapsing, and the friend panel (search, status chips, "약속 잡기", the badge that counts the Friends sharing their location)
- [ ] The Quest list on the right, collapsing, the full-screen Quest view (the 전체/강의/파티/약속 chips, 오늘/내일/이번 주/이후) and the Meetup sheet ("개인 약속")
- [ ] The 편의기능 button and its three layers (식당, 셔틀버스, 공부공간), with the information sheet
- [ ] The AI input and the AI chat sheet (the wireframe's sample conversations)
- [ ] 오늘의 발자국 (replaying stories)
- [ ] The centre + button: the sheet for posting a story, and my story
- [ ] The bottom navigation's five slots (지도 / 파티 / 올리기 / 행사 / 내 정보)
- [ ] The event card's other buttons (같이 갈 사람 찾기, 참여하기, 알림 받기)

Places that lead to another screen (they show the "준비 중" notice; see section 4):

- [ ] The 파티 and 행사 tabs of the bottom navigation
- [ ] A Quest row that leads to the party screen or the events screen
- [ ] "친구 추가" in the friend panel
- [ ] "공유 설정" in the friend panel goes to the location sharing part of 내 정보 (not a "준비 중")

### 1.4 Sign-in, loading, Onboarding (tickets 12, 13, 14)

- [ ] The sign-in screen's three states (default, checking, not an SNU account), and the refused state with other words for any other failure ("잠시 후 다시 시도해 주세요")
- [ ] The screens that show the three legal documents (the texts are placeholders; see section 5)
- [ ] Google sign-in: real in a built app, fake in Expo Go, chosen while the app runs. On Android the account sheet first, then the button flow
- [ ] Tokens kept in the phone's secure storage
- [ ] The loading screen as in the wireframe: the bar fills while the Lobby is fetched, the screen stays for at least 0.5 seconds, and a failure offers "다시 시도"
- [ ] Entering the Lobby when the app starts, right after a sign-in and right after Onboarding
- [ ] The Onboarding screen (`Onboarding`): the name and the department suggested from the Google account, the save button enabled once both are there, a sign-out link, no way back
- [ ] The notice when a sign-in on another phone ended this Session, then the sign-in screen
- [ ] Sign-out: ends the Session, closes the socket connection, stops sending the position, clears the tokens, the fetched data and what the fakes stored

### 1.5 내 정보 and profile editing (tickets 15, 16, 17; every element of the wireframe's `Profile` and `ProfileEdit`)

- [ ] The profile card (the profile picture is the name's first letter) and the way into profile editing
- [ ] Profile editing: name, department (a searchable list), admission year, interests, course level, gender
- [ ] "사진 변경" in profile editing shows "준비 중" (section 4)
- [ ] The location sharing switch (the Master Switch): off at first, a consent notice the first time it is turned on, and it can be turned off at any time
- [ ] The position is sent only while the switch is on: every 5 seconds, and only after a move of 5 metres or more. Where it is sent is fake (section 3)
- [ ] The sign-out button and its confirmation
- [ ] The bell, the menu rows (친구 관리, 참여 중인 파티, 관심 행사, 알림 설정) and 비공개 구역 관리 are there and show "준비 중" (section 4)
- [ ] The menu's "내 퀘스트" opens the main screen's full-screen Quest view

### 1.6 Timetable (ticket 19)

- [ ] The timetable card in 내 정보 (a week's grid)
- [ ] The timetable screen (`Timetable`, `TimetableEmpty`): the semester's first and last day, the list of classes
- [ ] The class form (`TimetableClassForm`): a course name, one or more weekdays, a start and an end time, a Place, an optional room; delete with a confirmation
- [ ] The overlap warning in the form (`TimetableOverlap`) and the "겹침" badge in the list (`TimetableOverlapList`); saving stays possible
- [ ] An `Idempotency-Key` on the request that adds a class
- [ ] "이미지로 불러오기" and "빈 시간 말하기" on the card show "준비 중" (section 4)

### 1.7 Private Events and choosing a Place (tickets 18, 20, 21)

- [ ] A long press on the map drops a pin and shows "내 일정 만들기" (`MainLongPress`)
- [ ] The Private Event form (`PrivateEventCreate`, `PrivateEventEdit`): a title, a day, a start time, an optional end time, a place, an optional note; delete with a confirmation
- [ ] The Private Event's teal pin on the map and its card with "수정" and "길찾기" (`MainPrivatePin`)
- [ ] The screen for choosing a Place (`PlacePicker`, `PlacePickerClass`, `PlacePickerEmpty`): the list of Places and its search
- [ ] "지도에서 직접 찍기" (`PlacePickerMap`): the map moves under a pin fixed at its centre, and the sheet names the Place under or nearest to it. From the Private Event form only
- [ ] The app works the name out from the Places' positions
- [ ] An `Idempotency-Key` on the creating request

### 1.8 iOS (ticket 22)

- [ ] The iOS map module (Swift), written after the Android module was checked
- [ ] Google sign-in settings for iOS

### 1.9 Tests (every ticket)

- [ ] P06's own features in full, as the spec's Testing Decisions list them
- [ ] Elements filled with fake data: the screen appears and its main buttons respond
- [ ] The four checks pass: lint, format, types, tests

## 2. Device check (함재현)

What only a built app shows. 함재현 fixes what fails and merges. The list to check is at the end of the spec's Map decisions.

- [ ] On the Mac: Xcode 26, JDK 21 and the Android SDK
- [ ] Android, on the shared phone: the map's device check
- [ ] Android: a real Google sign-in (never tried so far)
- [ ] iOS, on the simulator: the map's device check. The simulator's location setting stands in for walking on campus
- [ ] iOS: a real Google sign-in
- [ ] iOS on an iPhone, when a signing account is at hand

## 3. Fake now, real later

The same content as the app's per-feature list, for a built app. Connecting a fake to the main server is not a ticket of this task: it is done when the main server serves the feature. In Expo Go every feature is fake. Before the demo build (P20), check that nothing here is still fake by accident.

| Feature | Now | Becomes real when |
|---|---|---|
| Sign-in, refresh, sign-out | The server exists (fake only in Expo Go) | In a built app |
| Onboarding, Lobby, profile (name, department, admission year, interests) | The server exists | At once |
| The list of Places and its search | The server exists (`GET /places`, `GET /places/search`) | At once |
| Walking route | The server exists (`GET /walking-route`) | At once |
| The profile's course level and gender | Fake | The main server stores them |
| Timetable | Fake | The main server serves it |
| Private Events | Fake | The main server serves them |
| The name of a point chosen on the map | Worked out in the app | The main server serves its lookup |
| Global Event markers | Fake, in the shape of PR #30 | P12 serves the published list |
| Sending the position, storing the Master Switch | Fake | P08 |
| The friend list and Friends' positions | Fake, in a provisional shape | P08 and P14 |
| The Quest list | Fake, in a provisional shape | P08 and P13 |
| The dining layer | Fake | P15 connects it (`GET /menus` exists) |
| The shuttle layer | Fake | P07-04 (PR #31) and P15 |
| Study space seats, the AI chat, stories, 오늘의 발자국 | Sample content inside the screen | No spec covers them |

## 4. Buttons that show "준비 중"

The control is there and only shows the toast. The task named is the frontend's proposal for who replaces it; P13 and P14's specs do not say so yet (section 6).

| Where | Button | Replaced by |
|---|---|---|
| Bottom navigation | 파티 tab | P13 |
| Bottom navigation | 행사 tab | P13 |
| A Quest row on the main screen | To the party screen or the events screen | P13 |
| Friend panel | 친구 추가 | P14 |
| 내 정보 | 친구 관리 | P14 |
| 내 정보 | 참여 중인 파티 | P13 |
| 내 정보 | 관심 행사 | In no Iteration 1 spec |
| 내 정보 | The bell and 알림 설정 | In no Iteration 1 spec |
| 내 정보 | 비공개 구역 관리 | Out of Iteration 1's scope (Private Zones) |
| Profile editing | 사진 변경 | When the main server takes photos |
| Timetable card | 이미지로 불러오기 | Iteration 2 (timetable OCR) |
| Timetable card | 빈 시간 말하기 | In no Iteration 1 spec |

## 5. Design: wireframes and texts (the frontend pair, with the team)

Drawn on 2026-10-03:

- [x] The Onboarding screen (`Onboarding`)
- [x] The timetable screen and the class form (`Timetable`, `TimetableEmpty`, `TimetableClassForm`, `TimetableOverlap`, `TimetableOverlapList`)
- [x] The Private Event form and how it opens (`MainLongPress`, `PrivateEventCreate`, `PrivateEventEdit`)
- [x] The Private Event's pin and card (`MainPrivatePin`)
- [x] Choosing a Place (`PlacePicker`, `PlacePickerClass`, `PlacePickerEmpty`, `PlacePickerMap`)

Still open:

- [ ] The texts of the three legal documents: 이용약관, 개인정보 처리방침, 위치정보 이용약관
- [ ] The final friend marker (candidates: 지금, A, B, C, D). Until it is chosen the app uses 지금
- [ ] The design system's brand book says not to reproduce the university's emblem, and that the name "SNU Now" is set in plain type; the `Login` frame uses the emblem as its button. Settle which holds before the sign-in screen is built (ticket 12)
- [ ] No frame shows the credit for the map data. The app puts it very small at the bottom left of the map, as the spec says
- [ ] No frame shows the main screen when the User is off campus. The app shows the whole campus without an Avatar, as the spec says
- [ ] The route is still one dashed line and a toast. A frame with the distance, the time and a way to end the route would improve it
- [ ] Onboarding's "그 외" admission year stores no year. Decide whether it should ask for one
- [ ] The switch reads "친구와 위치 공유", but the Master Switch turns off a Party's sharing too. Settle the label
- [ ] A Private Event of a past day cannot be reached again. Decide whether a list of Private Events is wanted
- [ ] A double major cannot be entered. Decide whether the department field should allow it

Built without a frame; the spec gives the wording, which the team may change:

- [ ] The explanation before the location prompt
- [ ] The consent notice of the Master Switch
- [ ] The notice of a sign-in on another phone
- [ ] The notice of a failed sign-in
- [ ] The toasts "캠퍼스 밖에 있어요", "길을 찾지 못했어요" and "준비 중이에요"

## 6. For people (안진영, unless a name is given)

- [ ] Get `KAKAO_REST_API_KEY` (the main server does not start without it)
- [ ] Get `KAKAO_NATIVE_APP_KEY` (the app's map)
- [ ] Ask for the iOS app `com.bonnieandclaude.snunow` to be registered in the Kakao console
- [ ] Check that Google Cloud holds an Android sign-in client for this app identifier and the development SHA-1; ask for one if not
- [ ] Ask for an iOS sign-in client in Google Cloud
- [ ] Tell the team: the frontend rewrote the P06 spec, iOS is in Iteration 1, and the whole main screen is built with fake data first
- [ ] Update P06's scope and workers in the schedule sheet
- [ ] Tell the owners of the other specs what P06 changed for them, as the spec's Further Notes list it: P13 and P14 (the lists and tabs of the main screen), P19 (nothing provisional left for these screens), P15, P07 and the main server's README (the attribution is on the map), P08 (in the app a class holds several weekdays, and P06 no longer holds the timetable API)
- [ ] Add an iOS section to `.scratch/research/external-sources.md` when the iOS side is built: Kakao's iOS SDK and its registration, the iOS Google client and its URL scheme, with sources
