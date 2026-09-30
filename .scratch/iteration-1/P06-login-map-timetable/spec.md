# P06: Build provisional login, map and timetable screens

Status: ready-for-agent

## Problem Statement

A User has no way to enter the app, see the campus, see where they are, or record their classes and their own events. Every other screen in Iteration 1 sits on top of the map, so without it nothing can be shown.

## Solution

The app opens on a sign-in screen and then on a map of the campus that fills the screen. The User's Avatar moves on the map as the User moves. Events appear as markers. The User keeps a timetable and Private Events, turns Location Sharing on with the Master Switch, and can see a walking route to a place. The design is provisional; P19 adapts it to the wireframes.

## User Stories

1. As an SNU student, I want to sign in with my SNU Google account from a system sheet, so that I do not type a password.
2. As a person with a Google account outside SNU, I want to see why I cannot sign in, so that I do not retry in vain.
3. As an SNU student, I want the app to open on the map when I am already signed in, so that I get to the campus at once.
4. As an SNU student, I want the app to renew my session silently, so that I am not interrupted every hour.
5. As an SNU student, I want to sign out from a panel of my own that opens from the map, so that I can hand my phone to someone else.
6. As an SNU student, I want the map to fill the screen and open on the campus, so that the map is the app.
7. As an SNU student, I want my Avatar at my position, moving smoothly as I walk, so that the map feels live.
8. As an SNU student, I want a button that brings the map back to my position, so that I do not get lost after panning.
9. As an SNU student, I want an explanation before the location permission prompt, so that I know why it is asked.
10. As an SNU student who refused the location permission, I want the map to work without my Avatar, so that I can still look around.
11. As an SNU student, I want published Global Events as markers, so that I see what is happening and where.
12. As an SNU student, I want to tap a Global Event and see its title, time, place and source, so that I can decide whether to go.
13. As an SNU student, I want my Private Events as markers that only I see, so that my plans stay mine.
14. As an SNU student, I want to create a Private Event with a title, a start time, an optional end time, a place and a note, so that I can record my own plans.
15. As an SNU student, I want to choose the place from the building list or by pointing on the map, so that I do not type coordinates.
16. As an SNU student, I want to edit and delete my Private Events, so that they stay correct.
17. As an SNU student, I want to enter a class with its name, weekday, start and end time, building and room, so that the app knows my week.
18. As an SNU student, I want to choose the building from a list, so that the class has a place on the map.
19. As an SNU student, I want to set the first and last day of the semester, so that classes do not appear during vacation.
20. As an SNU student, I want to edit and delete classes, so that I can follow a changed timetable.
21. As an SNU student, I want to be warned when two classes overlap, so that I notice a mistake.
22. As an SNU student, I want the Master Switch to be off until I turn it on, so that my location is never shared without my decision.
23. As an SNU student, I want an explanation of who will see my location the first time I turn the Master Switch on, so that I consent knowingly.
24. As an SNU student, I want to turn the Master Switch off at any time, so that I disappear for everyone at once.
25. As an SNU student, I want my position sent only while the Master Switch is on, so that the switch means what it says.
26. As an SNU student, I want to see a walking route from my position to a place, so that I know how to get there.
27. As an SNU student, I want a message when no route is found and the map moved to the place anyway, so that I am not left with nothing.
28. As an SNU student, I want every label in Korean, so that I read the app in my language.
29. As an SNU student, I want to view and edit my name, department, admission year and interest hashtags in that panel, so that Matching and my companions know who I am.
30. As an SNU student, I want the sources of the map data credited in that panel, so that the project meets their licence.
31. As an SNU student whose account was signed in on another phone, I want this phone to say so and show the sign-in screen, so that I understand why it stopped.

## Implementation Decisions

### Map

- The map provider is Kakao. The app reaches the Kakao Maps Android SDK through the team's own native module that lives inside the app project. No maintained React Native library exists for this SDK.
- The map is not shown in a web view.
- The module offers: showing the map, moving the camera, image markers, Avatars that move smoothly between two positions, a route line, and tap events on markers and on the map.
- The SDK supports ARM devices only. A teammate on an Intel or Windows machine needs a physical phone to see the map.
- The rest of the app depends on one map component with a provider-neutral interface. No screen calls the native module directly.
- The map is the main screen. Lists and panels are laid over it.

### Sign-in

- Sign-in uses Android Credential Manager with Sign in with Google. The older Google Sign-In SDK was removed from Google's library in August 2026 and is not used.
- The request filters accounts by the hosted domain `snu.ac.kr`. The server check in P04 remains the authority.
- The app first tries the account sheet and falls back to the sign-in button flow when no account qualifies.
- Sign-in lives behind one module with two operations, sign in and sign out. The default implementation is the free library that Expo's guide lists for Credential Manager. If it fails verification, the team writes its own native module of the same shape.
- Tokens are kept in the phone's secure storage. When a request is refused as unauthorised, the app renews the session once and repeats the request; if renewal fails, it shows the sign-in screen.
- The app enters the lobby (P04), which gives it what it needs to run, after a sign-in or a start with stored tokens, and right after onboarding. A User who has not finished onboarding, as the sign-in's answer or a 403 `ONBOARDING_REQUIRED` from any request says, first sees an onboarding screen that asks for the name and the department, filled in from the suggestion in that answer and editable, and sends them to the main server.
- A User has one session (P04). The code for a replaced session, on a 401 from the main server or on `session-ended` from the socket server, means that the User signed in on another phone: the app does not renew the session, stops sending its position, background sharing included, and shows the sign-in screen with that reason.

### Location

- While the app is open and the Master Switch is on, the app sends its position every 5 seconds and only when the User moved by a few metres.
- The app sends every position it gets. Deciding whether the position is inside the Campus Boundary is the server's job.
- Sending in the background belongs to P17. The switches for one Friend and for the Party belong to P14 and P13.

### Timetable and Private Events

- The main server stores one timetable per User: the semester's first and last day and the class entries. An entry has a course name, a weekday, a start time, an end time, a building from the building list and a room text.
- Overlapping entries are accepted with a warning.
- The main server stores Private Events. Only the owner can read or change them.
- A Private Event's place is a building from the list or a point on the map.
- The building list comes from P07.

### Route

- The app asks the main server for a walking route between two points and draws the returned line. The server side belongs to P07.
- The app never keeps a route after the screen is left.

### Repeated requests

- The app's API client adds an `Idempotency-Key` header to every request that creates something. The server side is described in P04.
- The key is a UUID made with Expo's crypto module. It is made once for each action of the User, at the moment the User confirms, and saved with the pending request.
- Every retry of that action sends the same key, also after the app was closed and opened again. A new key is made only for a new decision of the User.
- While a request is pending, its button is disabled.
- What the API client does with each answer:

| Answer | Meaning | Retry with the same key |
|---|---|---|
| No response | The request may or may not have been carried out | Yes |
| Success | Done. With `Idempotent-Replayed: true` it is the first attempt's result | No |
| 409 with the code for a key in use | The first attempt is still running | Yes, after the time the server names |
| Server error | The attempt failed and the key is free again | Yes, waiting longer each time |
| 422 with the code for a reused key | A defect in the app | No |
| Any other refusal | Final | No. A new attempt gets a new key |

- The API client looks at the code in the answer, not only at the status, because a 409 can also be a refusal by a rule.
- In this task the key is required for adding a class to the timetable and for creating a Private Event.

### App structure

- The app uses Expo Router with the template's folder layout.
- A panel of the User's own opens from the map. It holds the profile, the Master Switch, the information screen and sign-out. The profile API belongs to P04.
- The interface language is Korean.

## Testing Decisions

- A good test drives a screen the way a User does and checks what the screen shows. It does not inspect component internals.
- Screens are tested with Jest against a fake API placed at the app's API client.
- The native map module cannot be tested that way. It is checked by hand on a device against a list: the map appears, a marker appears, an Avatar moves smoothly, the route line appears, the map survives leaving the screen and coming back.
- The timetable and Private Event APIs are tested at the API level with Vitest against a real database: owner-only access, validation of times, overlap warning, and a creating request without a key refused.
- The API client is tested with Jest against a fake server: the same key on every retry, a new key for a new action, and the behaviour for each answer in the table.
- Prior art: the sign-in tests of P04.

## Out of Scope

- Reading a timetable from an image. The schedule places it in Iteration 2.
- Reading a poster into a Private Event.
- Party, Quest, Friend and Meetup screens.
- Sending location in the background.
- The final layout. P19 adapts the screens to the wireframes of P09.
- Private Zones.
- An iOS build.

## Further Notes

- The schedule names 안진영 as the worker. The task was written as screen work. The timetable and Private Event APIs were added here because the restart left them without a task.
- P05 must confirm first: the Kakao key and key hash, that the native module shows the map and moves an Avatar under the New Architecture, and that the sign-in library builds together with the Kakao SDK. If the native map module is blocked, the team lead decides the next step; a web view is not the fallback.
- Every build signing key needs its own registration: the key hash at Kakao and the SHA-1 fingerprint at Google.
- The screen arrangement follows the team's reference: the map in the centre, the Party member list on one side and the Quest list on the other.
