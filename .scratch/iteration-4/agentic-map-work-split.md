# The agentic map: work split

This document splits the work of building the agentic map design (`agentic-map-design.md`, the thirteen rows below the divider on the team canvas) into four packages. It gives the first path, which one person builds, and the work after it.

The screen words stay in Korean. A "계획" (plan) is what an answer proposes and what `POST /plans` turns into a party. A "파티" (party) on screen is a Quest that several Users hold, and its "단계" (steps) are its Sub Quests. "파티 켜기" (party on) is the glossary's Party.

## 1. At a glance

| Package | What it covers | Wireframe rows | Who fits |
|---|---|---|---|
| A. Engine and contract | The server calculation that picks the place, the time, and the merging point from several Users' Timetables and locations. The contract the other packages rely on | 1 Lunch, 7 Other questions | One person with development experience |
| B. The answer screen on the map | The frame of a pill at the top and one card at the bottom, drawing the answer on the map, the time band | 0 Frame, 6 Asking on the map, 8 What cannot be answered and what does not work | The two app-side people as a pair |
| C. Invitations, parties, and Friends' locations | Turning a "계획" (plan) into a "파티" (party) and inviting to it; accepting, declining, and being late; and the single entry point for reading Friends | 4 Events, 5 Parties, 9 Friends and location | The server-side member |
| D. Notifications, bookings, interests, and first run | The in-app notification list, Kwanjeong Library (관정) seats and study rooms, watching interests, and first run | 2–3 A seat to study, 10 Watching interests, 11 Notifications, 12 First run | The owner of A after the first path, with the server-side member |

Row 1, Lunch, is the "배고파" (I'm hungry) scene.

PR approval pairs: the two app-side members approve each other's PRs. The server-side member approves the server PRs of A's owner, and A's owner approves the server-side member's. One of the app-side members approves the app PRs of A's owner.

## 2. The size, plainly

- Estimated from reading the code, the killer feature alone takes one person 16–20 days. All thirteen rows run into Iteration 5 (11/21–12/04).
- The first thing that runs for real on two phones is one path: two people eating together. Asking, drawing on the map, dragging the time band, inviting, and accepting.
- Re-planning after a decline and "5분 늦어" (I'm 5 minutes late) are nice to have on the first path. Gatherings of three or more, mixing in the shuttle, count circles for grouped results (design section 5, Many results on the map), the Avatar's three looks (a green ring with a live dot for exact location, a green ring on the building for the building level, and a dashed ring for Timetable only), dashed lines, push notifications, interests, and first run come after it.

## 3. What to settle first (in A's first PR)

Every package builds against real answers from the real server. No package builds against a fake response.

1. Contract types: the request context (my location, the visible map area, the tapped building or person, the condition chips, and the plan id), the answer (AnswerReply), the map scene (MapScene), and the plan (Plan) with its input (PlanInput). The files are `mobile/src/api/assistant-types.ts` and `main-server/src/assistant/dto/assistant-messages.dto.ts`.
2. One example, computed for real: "화 11:50 배고파, 민수랑 같이" (Tue 11:50, I'm hungry, with Minsu). A's first PR makes the server return the real answer for it. The app's mock data (`mobile/src/api/mock/assistant.ts`), which only the tests, Expo Go, and the web use, is a copy of that real answer.
3. The promises between packages, as types: FriendView, `POST /plans`, `GET /quest-invitations/:id`, `POST /quests/:id/late`, the notification service (schedule, replace, cancel), the address a notification opens, `/main?card=<kind>:<id>`, and the signal names (invitation-accepted, invitation-declined, plan-changed, late, notice). Each owner builds the real one, and nothing returns a fake response in its place.
4. Empty slots each package fills on its own: a test-data file per package, answer rule files, signal handler files, and empty module registrations. This cuts the times one person has to ask another for a line in their file.
5. Test setup: two test accounts that are Friends of each other, and the Tuesday example Timetables (me: building 301 11:00–11:50, next class 13:00 in building 24. Minsu (민수): building 302 11:00–12:15).

The five states of a party member map onto today's tables like this: invited is a pending invitation, accepted is a member, declined is a decline record, N minutes late is the member's late minutes, and dropped out is removal from the members.

## 4. Files only one person changes

| Owner | Files |
|---|---|
| A | In `main-server/src/assistant/`: feature.ts, dto, chat/chat-assistant.ts, free-time/meal-fit.ts, free-time/meal-tools.ts, and assistant.module.ts. `main-server/src/travel/travel.ts`. All native files (`mobile/app.json`, `mobile/app.config.ts`, `mobile/plugins/`, and `mobile/modules/`) |
| B | In `mobile/src/screens/main/`: main-screen.tsx, map-bottom.tsx, layout.ts, use-things.ts, and card.tsx. In `mobile/src/map/`: types.ts, native-map.tsx, marker-looks.tsx, and marker-images.tsx. `mobile/src/features/map/adapter.ts`, `mobile/src/features/assistant/use-chat.ts`, and the tab bar |
| C | In `main-server/src/location-sharing/`: visibility.service.ts and location-sharing.service.ts. `main-server/src/friends/friends.service.ts`. In `main-server/src/quests/`: invitations.service.ts and dto/quest.dto.ts. `mobile/src/features/friends/adapter.ts`, and real-time signal handling |
| D | `main-server/src/app.module.ts`, `main-server/src/library/room-request-sync.service.ts`, `main-server/src/assistant/library/library-card.ts`, and `mobile/src/features/notifications/` |

`main-server/prisma/schema.prisma` is changed by one person at a time, in a set order. On the first path only one column goes in: the member's late minutes (C). The Friend levels and the notification table go in after 11/18.

## 5. The first path

One person, the owner of package A, builds the whole first path with agents, from A's column to D's. The table shows which package each part of the path belongs to. Each package goes to its owner once the path runs.

| | A. Engine and contract | B. The answer screen on the map | C. Invitations, parties, and Friends' locations | D. Notifications, bookings, and interests |
|---|---|---|---|---|
| First | The first PR: the contract types, and the gathering calculation that returns the real answer for the Tue 11:50 example, with its test | The answer frame (the pill, the card, and hiding the lists) with today's real answers inside the new card | Read the contract | Read the contract |
| Second | An endpoint that recalculates without the model, the tools return real answers | A's real answer drawn on a phone: solid colored routes, numbered dots, time flags, fitting between the pill and the card, hiding the list | `POST /plans` (the party, its two steps, and the invitations at once), reading an invitation, the accept and decline signals | Row 2's seat card filled with the longest time, counted from the arrival, the skeleton of the notification service |
| Then | Connect everything end to end once, midway | Connect it with A | | |
| Last | The tools read Friends only through FriendView, integration | The time band (dropping it recalculates), the condition chips and "＋ 같이" (+ together), "이대로 초대" (invite as is), the card of a received invitation | Carrying the member states on the party, FriendView (read from today's on and off) | Check that a received invitation shows in today's notification list, the text of each notification kind |
| Nice to have | Re-planning after a decline, the preview and confirmation of being late | The one-line plan after closing | Reporting lateness | Keeping the time to leave in the list |

The new answer screen sits behind one switch. The old chat screen is not deleted, and the old answers (the event, Kwanjeong, and Quest cards) go inside the new card as they are.

### What the three teammates do meanwhile

A PR does not merge without a teammate's approval, so approvals set the pace of the build. Apart from push notifications, the work below needs no new build; `metrics-revision.md` gives the reasons and the full list.

| Who | Work |
|---|---|
| The PM of this iteration (app side) | Owns the acceptance tests of 11/16 and 11/18, which run on today's app: adds SUS, the usefulness question, and the time and help columns to the sheet, runs the sessions, writes the one-page report, and puts the results into the Wiki. Closes the schedule's Iteration 4 rows and gives every measuring task an ID for the Iteration 5 kickoff on 11/21. In Iteration 5, reads every condition label |
| The other app-side member | Observes the acceptance sessions, and produces the coverage results for the 11/20 submission. If time allows, measures on two phones the owed non-functional requirements that need no server reading. In Iteration 5, checks the reference solver by hand, drafts the condition utterances, writes and pilots the lab-study protocol, and recruits participants and beta testers |
| The server-side member | Approves the builder's PRs quickly, and builds push notifications through the native Release (`P04-push-notifications`). In Iteration 5, builds the location question set, the reference solver and the checker, the two baselines, the scoring code, and the thresholds, makes the one freeze commit before any run (by 11/25), and writes the table of what the asker's map shows and the leak cases |
| The builder | Builds the first path, re-runs the existing AI suites on the submission commit, and pushes each Release tag after approval |

The path is checked at a time of day when a cafeteria is open, with test Timetables that have a next class.

## 6. The check of the first path

When the path runs, it is checked on two phones with today's Production APK installed, using only what they download, with no native build.

1. Phone 1 asks "배고파, 민수랑 같이" (I'm hungry, with Minsu).
2. The place and time the server picked, both people's routes, and the flag at the merging point show between the pill and the card.
3. Dragging and dropping the time band recalculates the routes and the times, and they change.
4. Phone 1 presses "이대로 초대" (invite as is).
5. The invitation shows in phone 2's notification list.
6. When phone 2 opens it, it shows its own route and leave-by time.
7. When phone 2 accepts, the person chip on phone 1 turns to ✓.

- The check passes when the seven steps run without a break.
- The acceptance tests (11/16, 11/18) run on today's app unless the path has passed before them. Until 11/18 the switch stays off and new work is not released.
- Every PR is merged only after CI's app-fingerprint check passes.

## 7. The native release (11/19, after the acceptance tests, once, by A)

What goes in: dashed lines on the map, tapping empty ground, and dimming the base map; push notifications (expo-notifications, FCM; ticket 01 of `P04-push-notifications`, on the iteration's Main already); and the location permission text for catching arrival at and leaving Kwanjeong. D writes the checklist, and A merges it once B approves, as for A's other app PRs. No native change reaches a User before this Release. Since push's native change is on the iteration's Main, an update published from Main reaches no installed 1.0.1 APK: a fix they need before the Release is published from a branch cut before that change.

What stands in until then:

| After the release | Before the release |
|---|---|
| Push notifications | The in-app notification list |
| Dashed routes | Solid lines in different colors |
| Tapping empty ground or a building on the map | Tapping a building marker |
| Dimming the base map | Hiding only the usual markers |
| Catching arrival and leaving by location | Notifications at set times |

## 8. Iteration 5 (11/21–12/04)

The freshman package (design section 6.5; rows 7 and 12) is a major storyline and is built first after the lunch path.

- A: polishing re-planning, lateness told in words, and shuttle estimates (row 7).
- B: cluster circles on every map, the Avatar's three shapes and badges, dashed lines and dimming, the building fact card (row 6), the failure cases (row 8), and removing the old chat screen.
- C: the answers for events and parties (rows 4–5), storing the three Friend levels and sending the location at the building level, asking once, and the "파티 켜기" (party on) button on the leave-by notification.
- D: the notification table and sending each kind at the right time as a push notification, keeping the study room plan and the booking window (row 3), storing and matching interests (row 10), and first run (row 12).
- Measures: the location question set and its one freeze commit by 11/25, before anything runs on it; then run the location measures on the frozen set, with the two baselines as design section 5 sets them, and run the lab study (`metrics-revision.md`).
