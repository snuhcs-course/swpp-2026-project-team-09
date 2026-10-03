# P06: Build the sign-in, map and timetable screens

Status: ready-for-agent

This spec replaces the first P06 spec. The frontend workers, 안진영 and 함재현, rewrote it on 2026-10-03. What changed and why is under [Further Notes](#further-notes). The spec decides; [`todo.md`](./todo.md) tracks what is done, what is still fake and who does what.

## Problem Statement

A User has no way to enter the app, see the campus, see where they are, or record their classes and their own events. The app is still a placeholder screen. Every other screen of Iteration 1 sits on top of the map, so nothing can be shown until the map and the screens around it exist. The frontend workers cannot wait for every server feature either: most of what the main screen shows belongs to tasks whose servers are not built yet.

## Solution

The app opens on a sign-in screen, takes a new User through Onboarding, and then shows a map of the campus that fills the screen. The User's Avatar moves on the map as the User walks. Events appear as markers. The User keeps a timetable and Private Events, turns Location Sharing on with the Master Switch, and sees a walking route to a place.

The screens follow the team's wireframes from the start. Each screen is first built whole with fake data, and its features are then connected one at a time, replacing the fake data with the server's. The main screen shows every element of its wireframe: the elements that belong to later tasks are filled with fake data until those tasks connect them. The app runs on Android and on iOS.

## User Stories

### Signing in

1. As an SNU student, I want to sign in with my SNU Google account from a system sheet, so that I do not type a password.
2. As a person with a Google account outside SNU, I want to see why I cannot sign in, so that I do not retry in vain.
3. As an SNU student whose sign-in failed for another reason, I want to be told to try again later, so that I do not think my account was refused.
4. As an SNU student, I want to read the terms I agree to from the sign-in screen, so that I know what I accept.
5. As a new User, I want my name and department suggested from my Google account, so that Onboarding takes a moment.
6. As a new User, I want to finish Onboarding with only a name and a department, so that the rest can wait.
7. As a new User, I want to sign out from the Onboarding screen, so that I can leave when I signed in with the wrong account.
8. As an SNU student, I want the app to open on the map when I am already signed in, so that I get to the campus at once.
9. As an SNU student, I want the loading screen to end when the loading does, after a moment long enough to read it, so that I am not kept waiting for show.
10. As an SNU student, I want the app to renew my Session silently, so that I am not interrupted every hour.
11. As an SNU student whose account was signed in on another phone, I want this phone to say so and show the sign-in screen, so that I understand why it stopped.
12. As an SNU student, I want to sign out from 내 정보, so that I can hand my phone to someone else.

### The map

13. As an SNU student, I want the map to fill the screen and open on the whole campus, so that the map is the app.
14. As an SNU student, I want to zoom and pan inside the campus, so that I can look closer.
15. As an SNU student, I want the map to stay on the campus, so that I never lose it by panning away.
16. As an SNU student, I want my Avatar at my position, gliding to each new position as I walk, so that the map feels live.
17. As an SNU student, I want a button that brings the map back to my position, so that I do not get lost after panning.
18. As an SNU student who is off campus, I want the map to show the whole campus without my Avatar, so that I can still see what is happening there.
19. As an SNU student who is off campus, I want the button for my position to say that I am off campus, so that I know why the map did not move to me.
20. As an SNU student, I want an explanation before the location permission prompt, so that I know why it is asked.
21. As an SNU student who refused the location permission, I want the map to work without my Avatar, so that I can still look around.
22. As an SNU student, I want more detail as I zoom in, dots first and then pins with names, so that the whole campus is not cluttered.
23. As an SNU student, I want published Global Events as markers, so that I see what is happening and where.
24. As an SNU student, I want to tap a Global Event and see its title, time, place and source, so that I can decide whether to go.
25. As an SNU student, I want to see a walking route from my position to a place, so that I know how to get there.
26. As an SNU student, I want a message when no route is found and the map moved to the place anyway, so that I am not left with nothing.
27. As an SNU student, I want the sources of the map data credited on the map, so that the project meets their licences.

### The rest of the main screen

28. As an SNU student, I want the main screen to show its friend list, Quest list, convenience layers, AI input, story controls and bottom navigation, so that I see the app as it is designed even before every feature works.
29. As an SNU student, I want a button whose feature is not ready to say so, so that I do not think the app is broken.

### My profile and Location Sharing

30. As an SNU student, I want to view and edit my name, department, admission year, interests, course level and gender, so that Matching and my companions know who I am.
31. As an SNU student, I want the Master Switch to be off until I turn it on, so that my location is never shared without my decision.
32. As an SNU student, I want an explanation of who will see my location the first time I turn the Master Switch on, so that I consent knowingly.
33. As an SNU student, I want to turn the Master Switch off at any time, so that I disappear for everyone at once.
34. As an SNU student, I want my position sent only while the Master Switch is on, so that the switch means what it says.

### The timetable

35. As an SNU student, I want to see my week's classes on 내 정보, so that I know my week at a glance.
36. As an SNU student, I want to set the first and last day of the semester, so that the app knows when my classes run.
37. As an SNU student, I want to enter a class with its name, weekdays, start and end time, Place and room, so that the app knows my week.
38. As an SNU student, I want to choose the class's Place from a list, so that the class has a place on the map.
39. As an SNU student, I want to edit and delete classes, so that I can follow a changed timetable.
40. As an SNU student, I want to be warned when two classes overlap, in the form and in the list, and still be able to save, so that I notice a mistake without being blocked.

### My Private Events

41. As an SNU student, I want to press and hold a spot on the map to create a Private Event there, so that I record a plan where it happens.
42. As an SNU student, I want to create a Private Event with a title, a day, a start time, an optional end time, a place and a note, so that I can record my own plans.
43. As an SNU student, I want to choose the place from the list of Places or by moving the map under a pin, so that I do not type coordinates.
44. As an SNU student, I want my Private Events as markers that only I see, so that my plans stay mine.
45. As an SNU student, I want to tap my Private Event and see its details, edit it and get a route to it, so that I can use it.
46. As an SNU student, I want to delete a Private Event after a confirmation, so that I do not lose one by a slip.

### Platform and people

47. As an SNU student, I want every label in Korean, so that I read the app in my language.
48. As an SNU student with an iPhone, I want the same app as on Android, so that my phone does not decide whether I can use it.
49. As a frontend worker without a Mac or an Android phone, I want to see every screen in Expo Go, so that I can check my work alone.
50. As a frontend worker, I want a built app to use the real map and the real sign-in without changing a setting, so that the same code serves both.
51. As a backend worker, I want the APIs the app needs written down with the shapes the app expects, so that I can build them without reading the app.

## Implementation Decisions

### Order of work

- Each screen is built whole with fake data first. Its features are then connected one at a time.
- The map is the exception: it comes first and is built with its real function from the start, because it is the riskiest part and a person other than its author has to check it on a device.
- The order:
  1. Foundation: design tokens, shared components, the API client, the fake API.
  2. Map: the map component's interface, the stand-in map, the Android module. The Android module is handed over for its device check as soon as it is written.
  3. Main map screen.
  4. Sign-in, loading, Onboarding.
  5. 내 정보 and profile editing.
  6. Timetable.
  7. Private Events and choosing a Place.
  8. The iOS module, written after the Android module's device check.

### Wireframes

- The wireframes are the team's Design canvas "SNU Now 와이어프레임". A screen's layout, wording, limits and behaviour follow its frames. Where a frame contradicts what the server does, this spec decides and says so.
- The frames this task builds:

| Screen | Frames |
|---|---|
| Sign-in | `Login`, `LoginLoading`, `LoginError` |
| Loading | `Splash` |
| Onboarding | `Onboarding` |
| Main map | `Main`, `MainFriends`, `MainQuests`, `MainLayers`, `MainCollapsed`, `MainChat`, `MainChatSeats`, `MainCompose`, `MainReplay`, `MapOverviewSelect`, `MapZoomed`, `MapDining`, `MainLongPress`, `MainPrivatePin` |
| 내 정보 | `Profile`, `ProfileShare`, `ProfileEdit` |
| Timetable | `Timetable`, `TimetableEmpty`, `TimetableClassForm`, `TimetableOverlap`, `TimetableOverlapList` |
| Private Event | `PrivateEventCreate`, `PrivateEventEdit` |
| Choosing a Place | `PlacePicker`, `PlacePickerClass`, `PlacePickerEmpty`, `PlacePickerMap` |

- The wireframes change while the app is built. Before work on a screen starts, its frames are read again.
- What this spec asks for and no frame shows is built as this spec says: the credit for the map data, the map when the User is off campus, and the dialogs and toasts under [Wording without a frame](#wording-without-a-frame).

### Design system

- The app copies the wireframes' design system "SNU Now": its colours, spacing, radii, sizes, the eight text sizes, the 22 icons and the 14 components (Icon, Button, Chip, Badge, Avatar, MapPin, EventCard, ChatBubble, ActionConfirm, TextField, ChatInput, Switch, BottomNav, BottomSheet).
- The frames also show toasts, which the design system has no component for. The app adds one shared Toast.
- A screen is put together from these components. A repeated element that the design system lacks becomes a shared component, not a copy in each screen.
- The font is Pretendard, shipped with the app in the weights the text sizes use.
- The app is light only. The design system has no dark theme, so the phone's dark setting changes nothing.
- A Friend's Avatar is the wireframe's 지금 design until the team chooses among its candidates.

### App structure

- The app uses Expo Router with the template's folder layout.
- The bottom navigation has the wireframe's five slots: 지도, 파티, 올리기, 행사, 내 정보. 지도 and 내 정보 are this task's screens.
- A User who is not signed in sees only the sign-in screen. A User who has not finished Onboarding sees only the Onboarding screen.
- The interface language is Korean.
- A control whose feature belongs to another task shows one shared toast, "준비 중이에요". The sections below name each such control.
- On Android the back button closes the topmost panel or sheet first.
- After a sign-in the app keeps one connection to the socket server open, with the access token. In this task it listens for one event, `session-ended`. Later tasks add theirs to the same connection.

### Fake and real

- Screens call the server only through the API client. Fake data is put in at that one place, never inside a screen.
- Each feature is real or fake by itself. One list in the app names the fake ones, and a line is removed when the task that owns the feature connects it.
- These features start fake: the profile's course level and gender, the timetable, Private Events, the Place at a position, Global Event markers, sending the position, the Master Switch's stored state, the friend list and Friends' positions, the Quest list, the dining layer and the shuttle layer.
- These are real from the start in a built app, because the server serves them: sign-in, refresh, sign-out, Onboarding, the Lobby, the profile's name, department, admission year and interests, the Places and their search, and the walking route.
- Fake data has the shape of the server's answer, so that removing a line changes no screen:
  - Where the server or an open pull request defines the shape, the fake copies it.
  - Where a spec describes the feature in words only, as for the friend list and the Quest list, the app gives it a provisional shape, marked as provisional. One adapter per feature turns the server's answer into what the screens use, so a different final shape changes the adapter alone.
  - Where no spec covers the feature, as for the AI chat, stories, 오늘의 발자국 and study space seats, the screen holds the wireframe's sample content and expects no server.
- A fake keeps what the User saves in the phone's storage, so that it survives a restart as the server's would. Sign-out clears it.
- A real feature with fake fields, as the profile is, merges the two in its adapter: the server's fields from the server, the fake fields from the phone's storage.
- A fake answers after a short wait and can also answer with a failure and with nothing, so that loading, error and empty states can be seen.
- An element filled with fake data follows its frame's script and no more. Its state lives in memory and starts again when the app restarts.
- In Expo Go every feature is fake and the sign-in is a fake sign-in, because Expo Go holds neither Google sign-in nor the native map. The app decides this while it runs, by whether the build holds the native modules, and loads those modules only when it does: loading them in Expo Go would stop the app.
- The demo build (P20) uses no fake by accident: the list is checked before that build.

### API client

- The client attaches the access token. On a 401 it renews the Session once and repeats the request; when renewal fails it shows the sign-in screen.
- The code `SESSION_REPLACED`, on a 401 from the main server or on `session-ended` from the socket server, means that the User signed in on another phone. The app does not renew the Session, stops sending its position, and shows the notice and then the sign-in screen.
  - Known gap: when the access token has already expired, the main server answers a plain 401 and then refuses the refresh with a plain 401, so the app shows the sign-in screen without the notice. The server request under [Server APIs the app needs](#server-apis-the-app-needs) closes it.
- A 403 with `ONBOARDING_REQUIRED` from any request shows the Onboarding screen, with the suggestion that the answer carries.
- Loading, errors, caching and refetching are left to TanStack Query. A screen asks for data and is told whether it is loading, failed or there.
- The client adds an `Idempotency-Key` header to every request that creates something. The server side is described in P04.
  - The key is a UUID made with Expo's crypto module, once for each action of the User, at the moment the User confirms.
  - The key and its request are saved in the phone's storage until the request is answered. Every retry of that action sends the same key, also after the app was closed and opened again: the app sends a saved request again when it starts. A new key is made only for a new decision of the User.
  - A saved request older than the server keeps keys, 24 hours, is dropped.
  - While a request is pending, its button is disabled.
  - What the client does with each answer:

| Answer | Meaning | Retry with the same key |
|---|---|---|
| No response | The request may or may not have been carried out | Yes |
| Success | Done. With `Idempotent-Replayed: true` it is the first attempt's result | No |
| 409 with the code for a key in use | The first attempt is still running | Yes, after the time the server names |
| Server error | The attempt failed and the key is free again | Yes, waiting longer each time |
| 422 with the code for a reused key | A defect in the app | No |
| Any other refusal | Final | No. A new attempt gets a new key |

  - The client looks at the code in the answer, not only at the status, because a 409 can also be a refusal by a rule.
  - In this task the key is required for adding a class to the timetable and for creating a Private Event.

### Map

- The map provider is Kakao. No maintained React Native library exists for its SDKs, so the app reaches them through the team's own native module, a local Expo module inside the app project with an Android side in Kotlin and an iOS side in Swift. Both sides are written from scratch.
- The map is not shown in a web view.
- The rest of the app depends on one map component with a provider-neutral interface. No screen calls the native module directly. The interface works in latitude and longitude and offers:
  - the rectangle the camera stays in, and the smallest and largest zoom;
  - moving the camera, with or without animation;
  - markers, each with an identifier, an image and an optional text under it; a marker can be added, changed and removed;
  - Avatars, which are markers that glide from their position to a new one over a given time;
  - one route line, which can be drawn and cleared;
  - tap events on a marker and on the map, and a long press on the map, each giving the position;
  - an event when the camera stops, giving its centre and its zoom.
- A marker's image is a picture file shipped with the app, one per kind and state: the native map draws images, not React views. A name under a marker is the SDK's own text. A profile picture's first letter on an Avatar is drawn as the marker's text.
- The camera stays on the campus. The rectangle runs from latitude 37.445 to 37.471 and from longitude 126.945 to 126.963, a little wider than the Campus Boundary. The map opens on the whole rectangle, which is also the furthest zoom out. The rectangle is a constant in the app; the Campus Boundary, which decides who is hidden, stays the server's.
  - Kakao's SDKs limit the zoom but were not found to limit panning. The module then brings the camera back inside when a move ends outside.
- Markers change with the zoom, as the wireframe shows: dots when the whole campus is in view, pins closer, and pins with names closest. The screen switches the detail from the camera's zoom; the map component only reports the zoom.
- The credit for the map data is one line in the smallest text size at the bottom left of the map, above the bottom navigation: "© OpenStreetMap · 국토지리정보원". A tap opens a sheet with both attributions and their links: OpenStreetMap's copyright page, and 국토지리정보원's 연속수치지형도 under 공공누리 type 1.
- Kakao's logo stays visible and unchanged. The module moves it to the bottom right, above the bottom navigation, so that the main screen's controls do not cover it.
- The component has a second implementation, the stand-in map, for a build without the native module: the wireframe's campus picture, with every position computed from latitude and longitude, panning, zooming, markers, Avatars, the route line and the same events. Expo Go and the Jest tests use it.
- The Android side:
  - Kakao Maps SDK for Android 2.15.2, from Kakao's Maven repository. It supports ARM only, so it runs on a phone or an arm64 emulator.
  - P05's trial build showed the map and a moving label under the New Architecture.
- The iOS side:
  - Kakao Maps SDK for iOS, a CocoaPods pod, 2.12.19 when this was written. Kakao's documents and the published SDK say it needs iOS 13 and holds simulator builds. Nobody on the team has built it yet.
  - The engine is started and stopped by hand: prepare, activate, add the view, pause, reset. The module drives these from the view's attachment to a window and from the app's moves to and from the background.
  - The module sets the map's size itself when the view's size changes. A view starts at size zero under the New Architecture.
  - What the screen asks for before the map is ready is kept and carried out once it is.
- 안진영 writes both sides without running them. 함재현 runs them, fixes what fails and merges. The Android side is written and handed over first; the iOS side is written after its device check, so that a mistake in the interface is found once.
- The device check, for each side: the map appears, a marker appears with its name, an Avatar glides to a new position, the route line appears and clears, the map survives leaving the screen and coming back, taps on a marker and on the map are answered, a long press is answered, the camera's stop is reported, and the camera cannot be left outside the campus.

### Main map screen

- The screen shows every element of the wireframe's `Main` and behaves as that frame does.
- This task's own features on it: the map, the User's Avatar, the zoom and position buttons, Global Event markers and their card, Private Event markers and their card, the long press that creates a Private Event, and the walking route.
- The Global Event markers use fake data in the shape of the Global Event that P07 stores, until P12 serves the published list.
- The other elements are filled with fake data: the friend list and the friend panel, the Quest list, its full-screen view and the Meetup sheet ("개인 약속"), the 편의기능 button with its three layers, the AI input and the chat sheet, 오늘의 발자국, the centre + button with the story sheets, and the event card's other buttons.
- These show the "준비 중이에요" toast, because they lead to a screen of another task: the 파티 and 행사 tabs, a Quest row's way to the party or events screen, and "친구 추가".
- "공유 설정" in the friend panel opens the location sharing part of 내 정보.

### Location

- Before the system's location prompt, the app shows its own explanation. It appears the first time the main screen opens, and again whenever the User, without the permission, presses "내 위치로 이동" or turns the Master Switch on. A User who chooses "나중에" or refuses the system's prompt gets the map without an Avatar.
- The Avatar is at the phone's real position and is shown only while that position is inside the map's rectangle. It glides to each new position over the time until the next one is due.
- Off campus, in this spec, means outside the map's rectangle. It decides only what this phone's map shows. Who is hidden from others is the server's decision, by the Campus Boundary.
- Off campus there is no Avatar and the map shows the whole campus. The button "내 위치로 이동" then shows "캠퍼스 밖에 있어요" and moves the camera to the whole campus.
- The Master Switch is the wireframe's switch "친구와 위치 공유" on 내 정보. It is off until the User turns it on.
  - The first time a User turns it on on this phone, a notice says who will see the User's location, and the switch turns on only when the User confirms. The phone remembers the confirmation for that User.
  - Without the location permission, the switch asks for it first and stays off when it is refused.
- While the app is open and the Master Switch is on, the app sends its position every 5 seconds, and only when the User moved by 5 metres or more since the last one sent.
- The app sends every such position, off campus too. Deciding whether the position is inside the Campus Boundary is the server's job.
- Where the position is sent, and where the Master Switch is stored, are fake until P08.
- Sign-out and a replaced Session stop the sending at once.
- Sending in the background belongs to P17. The switches for one Friend and for the Party belong to P14 and P13.

### Sign-in, loading, Onboarding

- Sign-in lives behind one module with two operations, sign in and sign out. The screens never call Google or the main server themselves. The module has a real implementation for a built app and a fake one for Expo Go, chosen while the app runs.
- The real one uses `react-native-nitro-google-signin`: Credential Manager with Sign in with Google on Android, and Google's sign-in on iOS. The ID token's audience is the Web client on both, so the main server's check does not change. If the library fails its device check, the team writes its own native module of the same shape.
- On Android the request filters accounts by the hosted domain `snu.ac.kr`. The app first tries the account sheet and falls back to the sign-in button flow when no account qualifies. The server check of P04 remains the authority on both platforms.
- How a sign-in ends:

| What happened | What the screen shows |
|---|---|
| The main server answers with tokens | The loading screen, or Onboarding for a User who has not finished it |
| The main server answers 403 | `LoginError`: not an SNU account |
| The User closes Google's sheet | `Login`, as before the press |
| Google reports an error, the network fails, or the main server answers anything else | `LoginError` with the words for a failed sign-in |

- Each of the three legal documents opens on a screen of its own. Their texts are not written yet, so each shows a placeholder.
- Tokens are kept in the phone's secure storage.
- The loading screen is the wireframe's `Splash`. It is shown while the app enters the Lobby: after a sign-in of a User who finished Onboarding, after Onboarding, and when the app starts with stored tokens.
  - Its bar fills while the Lobby is fetched and reaches the end when the answer is there. The step labels are the wireframe's and follow the bar, since the Lobby is one request today.
  - The screen stays for at least 0.5 seconds.
  - When the Lobby cannot be fetched, the screen says so and offers "다시 시도".
- Onboarding is the wireframe's `Onboarding`:
  - The name and the department are filled in from the suggestion that the sign-in's answer or the 403 carries, each with the badge "Google 계정에서 가져옴" until the User changes it. A part the suggestion lacks, or a department that is not in the list, stays empty.
  - The save button is enabled once a name and a department are there. Saving completes Onboarding and shows the loading screen.
  - "로그아웃" signs out and shows the sign-in screen.
  - There is no way back, on screen or with Android's back button.
  - The department is chosen from the wireframe's lists of undergraduate and graduate departments, which ship with the app. The server stores the department's name as text. One department is chosen: a double major is not entered here.
  - The admission year list runs from this year back twelve years. "그 외" stores no admission year.
  - Interests are the profile's hashtags, with the server's limits: 20 at most, 30 characters each, no whitespace, none twice whatever its case. The `#` is shown and not stored.
- Sign-out ends the Session on the server, closes the socket connection, stops sending the position, and clears the tokens, the fetched data and what the fakes stored. A sign-out that the server answers with 401, or does not answer, still signs the phone out.

### 내 정보 and profile editing

- 내 정보 is the bottom navigation's fifth tab and shows every element of the wireframe's `Profile`.
- This task's own features on it: the profile card, the timetable card, the Master Switch, and sign-out with its confirmation.
- The profile picture is the first letter of the name, until photos exist.
- Profile editing is the wireframe's `ProfileEdit`: name, department, admission year, interests, course level and gender. The name, department, admission year and interests are saved through P04's profile API. The course level and the gender are fake until the server stores them.
- A stored department that is not in the list, or an admission year older than the list, is shown as it is and kept unless the User changes it.
- "사진 변경" shows the "준비 중이에요" toast: the server has no photo upload.
- These show the toast too: the bell, 친구 관리, 참여 중인 파티, 관심 행사, 알림 설정 and 비공개 구역 관리.
- "내 퀘스트" opens the main screen's full-screen Quest view.

### Timetable

- The timetable card on 내 정보 draws Monday to Friday from the User's timetable, as its frame does. A class on a Saturday or a Sunday appears in the timetable screen's list only.
- "직접 입력" on the card opens the timetable screen. "이미지로 불러오기" and "빈 시간 말하기" show the "준비 중이에요" toast.
- The timetable screen is the wireframe's `Timetable`: the semester's first and last day, and the list of classes.
  - A changed day is saved at once. A last day before the first day is refused with the wireframe's message.
  - The semester's days are stored and shown. Nothing in this task hides a class by them; P08 uses them for Class Quests.
  - Classes are listed by their earliest weekday and then by start time.
- The class form is the wireframe's `TimetableClassForm`: a course name, one or more weekdays from Monday to Sunday, a start and an end time in steps of 5 minutes, a Place and an optional room. Its limits are the frame's: 30 characters for the name and 20 for the room.
  - A class holds several weekdays with one time. The first spec gave a class one weekday.
  - The Place is required and comes from the list of Places only.
  - Save is enabled once the name, a weekday, both times with the end after the start, and the Place are there.
- Overlap: two classes overlap when they share a weekday and their times cross. The app works this out from the timetable it holds.
  - In the form, a warning names each class that overlaps, and saving stays possible.
  - In the list, each overlapping class carries the badge "겹침".
  - The server accepts overlapping classes.
- Deleting a class asks first, with the wireframe's dialog.
- The timetable is fake until the server stores it. Adding a class carries an `Idempotency-Key`.

### Private Events

- A long press on the map, of about half a second without moving and not on a marker, drops a pin there and shows the button "내 일정 만들기". A touch elsewhere dismisses both.
- The form is the wireframe's `PrivateEventCreate` and `PrivateEventEdit`: a title, a day, a start time, an optional end time on the same day, a place and an optional note. It carries the badge "나만 보기". Its limits are the frame's: 30 characters for the title and 200 for the note.
  - Opened from a long press, the place is already that spot.
  - Save is enabled once the title, the day, the start time and the place are there, and the end, when given, is after the start.
- The place is a Place from the list or a point on the map. [Choosing a Place](#choosing-a-place) says how a point is named.
- A Private Event of today or later is a marker of the `private` kind on its owner's map, a teal pin, with dots and names by zoom like other markers.
- A tap on the marker shows the wireframe's card: "내 일정 · 나만 보기", the title, the time, the place and the note, with "수정" and "길찾기".
- After saving, the map moves to the marker and opens its card. After deleting, a toast says so.
- Deleting asks first, with the wireframe's dialog.
- A Private Event of a past day leaves the map and stays stored. Nothing in this task shows it again.
- Private Events are fake until the server stores them. Creating one carries an `Idempotency-Key`.

### Choosing a Place

- The screen is the wireframe's `PlacePicker`, shared by the class form and the Private Event form.
- The list and its search come from the main server's Places (`GET /places`, `GET /places/search`). A row shows the Place's name and, when it has one, its number as "{number}동".
- A tap on a row chooses that Place at once.
- A search that finds nothing shows the wireframe's empty state.
- From the Private Event form only, the first row is "지도에서 직접 찍기". It opens a map with a pin fixed at its centre; the User moves the map under the pin and confirms with "이 위치로 정하기". Each time the camera stops, the sheet names the point under the pin.
- A point on the map is named as the main server's lookup names a position:
  - in a Place, or within 5 metres of its outline: the Place's name and number, and choosing it chooses that Place;
  - within 20 metres of a Place: "{Place} 근처", stored as a point with that label;
  - farther from every Place: "지도에서 고른 위치", stored as a point with that label.
- Until the server answers that lookup for the app, the app measures to the Places' own positions with the same distances. It cannot tell "in" from "near" as well as the server will, which holds the outlines.

### Route

- "길찾기" on a card asks the main server for a walking route from the User's position to the place and draws the returned line. The server side exists (P07).
- When the server finds no route, or the request fails, the app shows "길을 찾지 못했어요" and moves the map to the place.
- When the app has no position to start from, off campus or without the location permission, "길찾기" moves the map to the place and says why: "캠퍼스 밖에 있어요", or the explanation before the location prompt.
- The route is cleared when its card is closed, when another route is asked for, and when the screen is left. The app never keeps a route after that.

### Wording without a frame

Built from the design system's confirmation dialog, the `LoginError` frame and the shared Toast. The team may change the words.

| Kind | Where | Words |
|---|---|---|
| Dialog | Before the location prompt | Title "내 위치를 지도에 표시할까요?". Body "지도에 내 아바타를 보여 주려면 위치 권한이 필요해요. 위치 공유를 켜기 전에는 다른 사람에게 보이지 않아요." Buttons "나중에" and "계속" |
| Dialog | First turn of the Master Switch | Title "위치 공유를 켤까요?". Rows "친구와 같은 파티의 멤버가 내 위치를 볼 수 있어요", "캠퍼스 밖에서는 아무에게도 보이지 않아요", "언제든 여기서 끌 수 있어요". Buttons "취소" and "켜기" |
| Dialog | A sign-in on another phone | Title "다른 기기에서 로그인했어요". Body "이 기기에서는 로그아웃됐어요. 다시 쓰려면 로그인해 주세요." Button "확인" |
| `LoginError` | A failed sign-in | Headline "로그인하지 못했어요", line "잠시 후 다시 시도해 주세요" |
| Loading screen | The Lobby cannot be fetched | Line "불러오지 못했어요", button "다시 시도" |
| Toast | My position, off campus | "캠퍼스 밖에 있어요" |
| Toast | No route | "길을 찾지 못했어요" |
| Toast | A feature of another task | "준비 중이에요" |

### Server APIs the app needs

윤유상 builds every server API, as tickets of this task. The shapes below are what the app's fakes use; 윤유상 decides the final shapes, and the app's adapters follow.

- **Timetable.** One per User, read and changed by its owner alone.
  - Reading answers the semester's first and last day, either of which may be missing, and the classes: an identifier, a course name of 30 characters at most, the weekdays, a start and an end time of day, the Place's identifier and a room text of 20 characters at most.
  - Setting the semester's days, adding a class, changing a class and deleting a class are separate requests.
  - Overlapping classes are accepted.
  - Adding a class without an `Idempotency-Key` is refused.
- **Private Events.** Read and changed by their owner alone.
  - Listing, creating, changing and deleting.
  - A Private Event has a title of 30 characters at most, a start, an optional end after the start, a place and a note of 200 characters at most.
  - The place is either a Place's identifier or a point: a latitude, a longitude and the label the app showed.
  - Creating without an `Idempotency-Key` is refused.
- **Profile.** Two more fields, both optional: the course level, undergraduate or graduate, and the gender, which is female, male or a text of the User's own. Onboarding and the profile's change accept them.
- **The Place at a position.** A route that answers the main server's own lookup: the Place a position is in or near, or none.
- **The code on a refused refresh.** A refresh refused because another sign-in ended the Session carries `SESSION_REPLACED`, so that the app can say so even when the access token has expired.
- **Later.** Uploading a profile photo. It is recorded in `todo.md` and not asked for yet.
- **From other tasks.** The list of published Global Events (P12); uploading a position, storing the Master Switch and serving the visible positions (P08); the friend list and the Quest list (P08).

### Builds

- The Android and iOS project folders are generated from the app's configuration and are not committed. What is written by hand for a platform lives in the native module.
- The app's identifier is `com.bonnieandclaude.snunow` on both platforms.
- Keys reach the app as `.scratch/research/external-sources.md` §7.1.1 says: a person fills in each value in a file that Git ignores, and the example file names the variable. The app needs the Kakao native app key, the Google client IDs and the servers' addresses.
- Google sign-in and the native map exist only in a built app. Expo Go shows everything else.

## Testing Decisions

- A good test drives a screen the way a User does and checks what the screen shows. It does not inspect component internals.
- Screens are tested with Jest against the fake API, placed at the app's API client, and with the stand-in map.
- This task's own features are tested in full: the sign-in flow with each ending, Onboarding, profile editing, the Master Switch with its first-time notice, sending the position only while the switch is on, the timetable with its overlap warning, Private Events, choosing a Place, and the walking route with and without a route.
- An element filled with fake data is tested lightly: the screen appears and its main controls respond. The task that connects it tests it in full.
- The API client is tested with Jest against a fake server: the token and the one renewal, the replaced Session, the same key on every retry, a new key for a new action, and the behaviour for each answer in the table.
- The native module cannot be tested that way. 함재현 checks it by hand on a device against the list at the end of the Map decisions above, and checks a real Google sign-in on each platform, which nobody has tried yet.
- The server APIs are tested by their own tickets, at the API level with Vitest against a real database, as P04's are.
- Every pull request passes the project's four checks: lint, format, types and tests.
- Prior art: the app's placeholder screen test, and the sign-in tests of P04.

## Out of Scope

- Reading a timetable from an image, and saying free time aloud. The schedule places the first in Iteration 2.
- Reading a poster into a Private Event.
- The party, events, friend management and friend adding screens.
- Connecting the friend list, the Quest list, the dining and shuttle layers, the AI chat, stories and 오늘의 발자국 to a server.
- Sending location in the background (P17).
- Private Zones.
- Uploading a profile photo.
- A list of the User's Private Events outside the map, and with it a way back to a Private Event of a past day.
- Entering a double major in the app.
- A dark theme.
- The texts of the legal documents.

## Further Notes

- What changed from the first spec, and why:
  - The screens follow the wireframes from the start. The first spec planned a provisional design that P19 would adapt; the wireframes now exist and the same two people do both tasks.
  - iOS is in scope. Kakao ships an iOS map SDK, and one of the two frontend workers develops on an iPhone.
  - The main screen shows all of its wireframe, with fake data where no server exists. The first spec left the Party, Quest and Friend screens out.
  - 내 정보 is a tab of the bottom navigation, as in the wireframe, not a panel over the map.
  - The credit for the map data is on the map, with its details one tap away. `.scratch/research/external-sources.md` §6.1 says that an information screen alone does not meet OpenStreetMap's guidelines.
  - A timetable class holds several weekdays, and a Private Event's place can be a point with a label, as the wireframes show.
  - The profile gains a course level and a gender.
- This spec was written from the frontend's decisions and does not wait for the other tasks' specs. Where they differ, those specs are the ones to update:
  - P13 and P14 lay the Quest list, the Party member list and the friend panels over the map as provisional panels. The wireframes give the main screen a friend list and a Quest list at its sides and separate party and events screens behind tabs. P06 builds those lists with fake data; P13 and P14 connect them and build the screens behind the tabs.
  - P19 adapts provisional screens to the wireframes. For the screens of this task nothing provisional is left to adapt.
  - P15, P07 and the main server's README put the map data's attribution on an information screen. P06 puts it on the map.
  - P08 depends on the timetable API "of P06" with one weekday per class. The API is now a server ticket of this task, built by 윤유상, and a class holds several weekdays.
- The wireframe's switch reads "친구와 위치 공유", while the Master Switch turns off all Location Sharing, a Party's included. The label is the design's to settle.
- People: 안진영 writes the app, both sides of the native module included. 함재현 does the device checks, on a Mac and on the shared Android phone, and fixes and merges the native module. 윤유상 builds the server APIs.
- 안진영 works on Windows with an iPhone and sees the app in Expo Go only. There every feature is fake, so the real APIs, the Session's renewal and the retries are exercised by the Jest tests and by 함재현's builds.
- A real Google sign-in has never been tried. P05 built the sign-in library into a trial app and ran its configuration, no more.
- Every build signing key needs its own registration: the key hash at Kakao and the SHA-1 fingerprint at Google. `.scratch/research/external-sources.md` §7 and §8 have the details for Android. They do not cover iOS yet: the bundle identifier's registration at Kakao, the iOS client at Google and its URL scheme are to be added there with their sources when the iOS side is built.
- The iOS release is not needed by the demo of Iteration 1, which is an Android APK (P20).
- The wireframes hold sample data in their own shapes. The app's fake data follows the server's shapes instead, as [Fake and real](#fake-and-real) says.
