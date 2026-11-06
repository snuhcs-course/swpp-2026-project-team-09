# SNU Now

SNU Now is a social map for Seoul National University's Gwanak campus. A student signs in with an SNU Google account
and sees, on Kakao's map of the campus, the Global Events collected from the university's events list (published on
their own when the rules read their time and place, otherwise by an Administrator), their Friends and the members of
their active party moving as Avatars, the places of today's classes, today's menus, the shuttle and the places to study
(공부공간). A student who wants company for an event joins or opens a party (파티) for it, on a Board or among invited
Friends; Friends plan together in a private party (비공개 파티) with a place and a time. About to meet, any member
activates the party (활성 파티), and those who accept see each other on the map until they part. An AI assistant, "SNU
Now AI", answers about menus, the shuttle, events and parties, fits a party or a meal with Friends into a gap between
classes, and books 관정도서관 seats and rooms ([Features](#features-at-the-end-of-iteration-3)). New students get a
새내기 튜토리얼 of fifteen tutorial quests. A screenshot of a timetable becomes classes, read on the phone. The app's
screens are in Korean.

A **party** is any gathering of Users; the code still uses the Iteration 1 names (a party is a `Quest`), see
[GLOSSARY.md](GLOSSARY.md).

The system is an Android and iOS app, four servers (main, socket, worker and match) with PostgreSQL and Redis, and an
admin site for Administrators.

## Quick start

The fastest way to try the app needs no build and no server of your own:

1. Install the Production APK,
   [`snunow-app-26.11.03-2.apk`](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/snunow/app/26.11.03-2/snunow-app-26.11.03-2.apk),
   on an ARM Android phone ([APKs](#apks)). It talks to Production at `https://api.snunow.com` and updates its
   JavaScript by itself.
2. Sign in with an SNU Google account, on the Gwanak campus: nobody is shown outside the Campus Boundary.
3. Alone, you can try the 새내기 튜토리얼 (offered when the admission year is this year or later or the 소속 is
   교환학생, or turned on from 내 정보), 관정도서관 booking (with an SNU account that can log in to the library), SNU
   Now AI's answers about menus, the shuttle, events and parties, 공강 파티 (with today's classes in the timetable and a
   party or event in a gap), the map's 식당, 셔틀버스 and 공부공간 layers, the timetable and opening a party.
4. With a second account you can try Friends, Location Sharing, 공강에 밥, joining a party and an active party.
   [The three demo flows](#the-three-demo-flows) say what each flow needs.

Production holds no demo data: its events are collected from the university, and its Users are real. To run the whole
system on your own computer, with the demo data, follow [Setup](#setup), [Running the servers](#running-the-servers)
and [Running the app](#running-the-app); the build needs the team's Kakao keys.

## Table of contents

- [Quick start](#quick-start)
- [What the demo demonstrates](#what-the-demo-demonstrates)
  - [New in Iteration 3](#new-in-iteration-3)
- [Demo video](#demo-video)
- [Evaluation](#evaluation)
- [Known limitations and todos](#known-limitations-and-todos)
- [Development and execution environment](#development-and-execution-environment)
- [Requirements](#requirements)
- [Setup](#setup)
- [Settings](#settings)
- [Running the servers](#running-the-servers)
- [Running the admin site](#running-the-admin-site)
- [Running the app](#running-the-app)
- [Running the tests](#running-the-tests)
- [Deployment](#deployment)
- [Repository layout](#repository-layout)
- [AI-generated code](#ai-generated-code)
- [Data sources and attribution](#data-sources-and-attribution)
- [Links](#links)

## What the demo demonstrates

### New in Iteration 3

Iteration 3, "Advanced Testing and Evaluation", ran from 2026-10-24 to 2026-11-06, and its work was merged into
`3.0/Main` between 2026-10-27 and 2026-11-06. What it added is described once, in
[Features](#features-at-the-end-of-iteration-3), and measured in [Evaluation](#evaluation):

- 공강 파티 and 공강에 밥, join or recruit, 관정도서관 booking and the answers about the tutorial: SNU Now AI's
  "Added in Iteration 3" items.
- The 새내기 튜토리얼 and the 관정도서관 login: their own entries.
- Automatic publication, events over a period and the Publication Route: Global Events and the admin site.
- The 공부공간 layer: Dining, shuttle and study spaces.
- 프로필 편집: Sign-in and Onboarding.
- OTA updates: Updates.
- 시설 예약하기: SNU Now AI's last item.

What merged after the last Release, `snunow/all/26.11.04-1` (`803490b5`), is on `3.0/Main` and not released yet:
P11's walking and shuttle times and P12's changes to the searches and the recruiting replies. Features marks each.

### Features at the end of Iteration 3

- **Sign-in and Onboarding**: Sign in with Google, for SNU accounts only; a consent screen; Onboarding with a name and
  department suggested from the Google account; one Session per User, so a sign-in on another phone signs the first one
  out. 프로필 편집 keeps a 학번, a 학적상 이름 and a 소속 privately, for group study rooms and the tutorial.
- **Updates**: the app takes its JavaScript from EAS Update and runs a new bundle from its next start; when a newer
  native build is out, it says 업데이트가 필요합니다 at its start. 내 정보 shows the app's version and the Release it
  runs.
- **The map**: Kakao's map of the campus with the User's Avatar, Friends, the active party's members, Global Events and
  the User's parties, the Places' outlines, the to-do list (퀘스트) of today's classes and parties, a card for whatever
  is pressed, one marker for everything at one place (events, parties, restaurants and shuttle stops) whose card lists
  each kind, and a walking route on request.
- **Location Sharing**: the Master Switch (친구와 위치 공유) on 내 정보, off until the User turns it on; a switch for
  each Friend and each active party; the position sent every 5 seconds while the app is open and, on Android, every 30
  seconds in the background under a notification; Avatars dimmed after 2 minutes without a position and removed after
  10; nobody shown outside the Campus Boundary, and no history kept.
- **Friends**: Friend Requests by Friend ID, one-time Invite Links sent through any messenger, a sharing switch per
  Friend, and ending a friendship.
- **Parties (파티)**: a party for a Global Event or a plan of the User's own, with a capacity of 1 to 8 and a Join
  Policy: 공개 파티 recruit on the 식사, 진로, 취미 and 공연 Boards (바로 참여 or 승인 후 참여), 비공개 파티 only
  among invited Friends. The 파티 tab with 찾기, the Boards, 내 파티 and 초대, moved between by a sideways swipe; a card
  in 찾기 opens its post; 참여 중인 파티 on 내 정보 opens 내 파티 as a screen of its own; join requests and
  invitations, with waiting invitations the Leader can cancel; the room with the party's steps (일정), walking times,
  the Leader's controls and the hand-over of the Leader's role.
- **Active party (활성 파티)**: any member activates the party when they are about to meet; the members who accept see
  each other on the map, Friends or not, until they pause, leave or the Leader ends it. A User is in at most one.
- **Navigation**: on Android, a swipe from the screen's left edge goes back, as the back button does, and closes an
  open panel or sheet; inputs rise above the keyboard everywhere.
- **SNU Now AI**: a chat sheet from the map's input bar that answers about today's menus and the shuttle, finds Global
  Events and recruiting parties, and turns one sentence into a Proposal that the User makes or edits. 50 messages per
  User a day; the conversation stays on the phone. Its replies render bold, lists and links. Added in Iteration 3:
  - searches take a time window and leave out full parties, parties already started and those the User cannot enter;
    on `3.0/Main`, not released yet, each result says which words it matched, and a search with too many results
    says how to narrow it;
  - asked to recruit, it first shows the parties with room that the User could join, and makes a Proposal only when
    none fits or the User asks for a new one; on `3.0/Main`, not released yet, when an approval party is shown, the
    reply says the Leader accepts each request;
  - **공강 파티**: the parties and events the User can reach in a gap between two classes and still be back in time,
    each card with a 이동 시간 box, on foot or by shuttle; the walking table fitted to calibration walks and the
    shuttle rides from two logged days are on `3.0/Main`, not released yet;
  - **공강에 밥**: the Friends free at lunch or dinner, the time they share, and Restaurant cards with the menu and each
    person's walking time; 파티 만들기 fills in a 비공개 파티 there with them invited. It never tells a Friend's classes
    or position;
  - **관정도서관**: free seats, seat maps with seat numbers, and booking, cancelling and returning seats and rooms from
    cards that the phone fills and sends; a group study room is booked with Friends, each asked to share their 학번;
  - answers about the 새내기 튜토리얼's quests, from the tutorial's text;
  - a Proposal at a Place with an online booking page carries a 시설 예약하기 link.
- **새내기 튜토리얼**: fifteen tutorial quests in five categories (생활, 공부·학사, 이동, 건강, 문화·여가) in a pager,
  offered to Users whose admission year is this year or later or whose 소속 is 교환학생, and turned on by anyone from
  내 정보. A started tutorial quest goes to the to-do list; 지도에서 보기 drops a pin on its place; 완료했어요 completes
  it. Progress is kept on the server.
- **관정도서관 login**: the library's own login page in the app; the library session stays on the phone and never
  reaches the servers or the model, and it ends when the User signs out.
- **Timetable**: classes entered with their times and Places, or imported from an SNUTT or 에브리타임 screenshot read
  on the phone; up to 10 timetable versions on the phone; a week grid from 09 to 22 on 내 정보; today's classes appear
  on the map's to-do list.
- **Global Events and the admin site**: events collected four times a day from the university's events list and
  published shortly after each Collection when the rules read their time and place; an event over a period is
  published too, and its card reads M월 D일까지. On the admin site, Administrators review Drafts, correct and publish
  them, create and cancel events, see the Places on a map, see each Source's Collection status and the posts left
  unsettled, see each published event's Publication Route (an Administrator, a Rule or a Judgement) and filter by it,
  work the same-event queue, detach a Source Post attached by mistake, and make or end friendships between Users for
  demo accounts.
- **Dining, shuttle and study spaces**: the 편의기능 layers 식당, 셔틀버스 and 공부공간. The dining layer shows today's
  menus of the Co-op's restaurants, the dormitory and the veterinary college, and a 식당 pin's 메뉴 보기 opens the menus
  of the next seven days. The shuttle layer shows the loop's stops, its line and the vehicles moving from stop to stop.
  The 공부공간 layer pins the campus's study spaces by building, with their hours and who may use them; one the User's
  내 정보 does not qualify for is grey, and 관정관 shows its free seats when the User is logged in to the library.
- **Demo data**: a Compose profile that fills a local system with demo Users, events and parties
  ([Demo data](#demo-data)).

### The three demo flows

Each flow is what Users do with the app on campus. Each says what it needs; the Production APK
([Quick start](#quick-start)) runs all three.

1. **새내기 튜토리얼 and 관정도서관**: a User with this year's admission year opens 새내기 튜토리얼 시작하기, browses
   the tutorial quests by category and starts some; 지도에서 보기 drops a pin on a tutorial quest's place, and
   완료했어요 completes it. The User asks SNU Now AI about a tutorial quest, then "7A 열람실 2 구역 오늘 5시부터 두 시간
   잡아줘", logs in on the library's own page, sees the free seats on the seat map, taps a seat and presses 예약하기.
   Later, "취소해줘" cancels the booking.
   - Needs: one SNU Google account whose admission year is this year (or with the tutorial turned on from 내 정보),
     and an SNU account that can log in to the library.
2. **공강에 밥 and 공강 파티**: two Friends with timetables. One asks "오늘 점심에 누구 돼?" and the Assistant names the
   Friend who is free; "(the Friend's name)랑 밥" gives the time they share and Restaurant cards with menus and walking
   times. 파티 만들기 opens a filled-in 비공개 파티 with the Friend invited. Then "오늘 (one class)이랑 (the next
   class) 사이에 갈 수 있는 파티 있어?" lists the parties and events that fit the gap, each with its 이동 시간, and the
   User joins one from its card.
   - Needs: two SNU Google accounts that are Friends, each with today's classes in its timetable (the demo data makes
     no classes), and a recruiting party or an event in the gap.
3. **Join or recruit**: a collected event is published on its own after a Collection, and the admin site shows its
   Publication Route, Rule. A first User opens a 공개 파티 for the event on a Board. A second User asks the Assistant
   to recruit for the event; the Assistant first shows that party, which has room left, and the User joins it from the
   card. A third User who says to make a new one gets a Proposal and posts it on a Board, and a fourth joins. Members
   activate a party and see each other on the map.
   - Needs: four SNU Google accounts (the first party's Leader, the User who joins it, the User who recruits and the
     one who joins the new party), and an Administrator's account on the admin site to see the Publication Route.

To run the flows on your own servers: [Setup](#setup), [Running the servers](#running-the-servers) (collect the
Global Events by hand with `docker compose exec worker-server node dist/collect snu_events`, which publishes those the
rules read), [Running the admin site](#running-the-admin-site) only to see each event's Publication Route, and
[Running the app](#running-the-app) on a phone on campus. The Assistant's flows need an OpenRouter key.

### Iteration 2, as history

Iteration 2, merged into `2.0/Main` between 2026-10-17 and 2026-10-23, added SNU Now AI, the timetable read from a
screenshot, the 파티 tab and the room, the 비공개 파티 in place of the Meetup, the Dev Server's own deployments and
Production on Amazon EKS. Its demo flows still run; its README is on `2.0/Main`.

### Iteration 1, as history

Iteration 1 built an Android prototype in which a student joins a group for a campus event and finds its members on
the map, with the campus's data collected without anyone's help. Its Meetup between Friends was retired in Iteration
2, and its Matching became AI 매칭, which groups strangers interested in the same event and was frozen in Iteration 2.

## Demo video

The Iteration 3 demo is [Team09 iteration3 demo](https://www.youtube.com/watch?v=PB54HriEl-8) on YouTube. It shows
[the three demo flows](#the-three-demo-flows). The Iteration 1 and 2 videos are in
[this Google Drive folder](https://drive.google.com/drive/folders/1LnGPIOsQbjt4Or9v-cogjmvhMoUhx7y6).

## Evaluation

Every AI feature of Iteration 3 has an evaluation set frozen before its first run, with thresholds declared in advance;
it was measured, improved from its failures and measured again. A **development** reading scores the set the changes
were chosen from; a **held-out** reading scores cases no change was made from. All model runs used Claude Haiku 5.5
through OpenRouter with the provider's default decoding. Each row's record holds the commits, commands, costs and every
failure. The P11 and P12 figures measure code merged after Release `snunow/all/26.11.04-1`: it is on `3.0/Main`, not
yet in Production.

| What it tests                                                              | Reading      | Before → after                                                                                                                   | Target                                                                              | Met                                                                                                                                                                          | Record                                                                                                 |
| -------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 공강 파티 · 공강에 밥, 40 cases × 3                                        | Development  | 85/120 (70.8%) → 92/120 (76.7%) in P11; 90/120 (75.0%) on the latest run, with 공강 파티 32/45 and 공강에 밥 37/45               | ≥ 80% overall, ≥ 70% each category                                                  | Overall no, categories yes; runs of the same 40 cases range from 67.5% to 80%; change 1's code, run twice, gave 80.0% and 76.7%                                              | [p4/record.md](main-server/eval/p4/record.md), [p5/p12.md](main-server/eval/p5/p12.md) (P4 suite)      |
| The same, 12 reworded cases × 3                                            | Held-out     | 23/36 (63.9%) → 27/36 (75.0%)                                                                                                    | None: read only                                                                     | —                                                                                                                                                                            | [p4/record.md](main-server/eval/p4/record.md) (The holdout)                                            |
| Walking times, 30 test walks                                               | Held-out     | MAE 168.5 s → 70.4 s (straight line 124.6 s); within min(25%, 2 min) 3 → 16 of 30 (within ±2 min, beside it: 14 → 24)            | ≥ 70% within min(25%, 2 min) and MAE below the straight line's (revised 2026-11-05) | No: 16/30; MAE met; under the original ±2 min, 24/30                                                                                                                         | [P11 before-after](.scratch/iteration-3/P11-free-time-meals-parties-improve/before-after.md)           |
| Shuttle times, leave-one-day-out over 2 logged days                        | Held-out day | Ride MAE 55.7 s → 30.8 s; wait MAE 272.2 s → 347.0 s                                                                             | Each MAE below its baseline                                                         | No: the wait is worse, so the app keeps the fixed waits                                                                                                                      | [P11 before-after](.scratch/iteration-3/P11-free-time-meals-parties-improve/before-after.md)           |
| Join or recruit, and search: 100 cases in the small world, 80 in the large | Development  | Small world 118/300 → 227/300 (P05), 225/300 → 246/300 (P12); large world 55/240 → 160/240 (P05), 156/240 → 162/240 (P12)        | A floor and a target per measure                                                    | Every floor but two: the model's own reply on approval parties, 8/21 (≥ 0.7), and searches narrowed by a condition the User never said, 3/12 (≤ 0.1); several targets missed | [p5/r1.md](main-server/eval/p5/r1.md) (P05), [p5/p12.md](main-server/eval/p5/p12.md) (P12)             |
| Automatic publication: Judgements of Drafts, 64 sessions in 60 posts       | Development  | Published without an Administrator 27/64 → 40/64; wrongly published 0/27 → 1/41, 0/41 once a-021's answer-key error is corrected | ≥ 60% published, none wrongly                                                       | Yes, once corrected; C6's floor (events over a period) missed, 61/85                                                                                                         | [p5/p12.md](main-server/eval/p5/p12.md), [collection/README.md](main-server/eval/collection/README.md) |
| The same event posted twice, 32 true pairs                                 | Development  | Pairs reaching comparison 8/32 → 10/32; found, queue included, 8/32 → 9/32; wrong merges 0                                       | ≥ 95% reaching comparison, ≥ 80% found, no wrong merge                              | Only no wrong merge                                                                                                                                                          | [p5/p12.md](main-server/eval/p5/p12.md), [collection/README.md](main-server/eval/collection/README.md) |
| 관정도서관 and the tutorial, 64 cases × 3                                  | Development  | 4/192 (2.1%, before the tools existed) → 140/192 (72.9%)                                                                         | 9 thresholds                                                                        | 5 of 9, provisionally (2026-11-02)                                                                                                                                           | [p6/r1.md](main-server/eval/p6/r1.md)                                                                  |

The join suite runs in two worlds of test data, which never reach a server: the small world, about 90 parties and events
of its own, and the large world, 1,000 parties and 307 events. The two collection rows (automatic publication and the
same event) measure code that is off in Production: the Judgements ran with `AUTOMATIC_JUDGEMENT` on, and the same-event
row with `SAME_EVENT_TITLE_RULE` and `SAME_EVENT_AI_CHOICE` on; Production's switches are in [Known limitations and
todos](#known-limitations-and-todos). Case a-021 was ruled an answer-key error on 2026-11-06 (151 미술관 is the right
place), which is why `AUTOMATIC_PUBLICATION` stays on.

## Known limitations and todos

What the demo cannot show, and what is known not to work yet:

- **Background sharing on Android only.** The app runs on Android and iOS (see [mobile/README.md](mobile/README.md),
  "Build the app for iOS"), but sharing in the background is built for Android alone, in a build of the app (not Expo
  Go), and the APKs are Android builds. The iOS build is made by hand, and its update notice has nothing to download.
  A User who swipes the app away stops the sharing, and the app says so when opened again. On Android 13 and later the
  app does not ask for the notification permission, so the service's notification may not show, although the sharing
  runs.
- **Production is behind `3.0/Main`.** The last Release, `snunow/all/26.11.04-1`, deployed `803490b5` of 2026-11-04.
  What merged after it is not in Production yet: P11's walking table, shuttle times and chat fix, P12's collection and
  chat changes, and the fix that removes the tutorial's place pin on a tap. In Production, `AUTOMATIC_PUBLICATION` is
  on, and `AUTOMATIC_JUDGEMENT`, `SAME_EVENT_TITLE_RULE`, `SAME_EVENT_AI_CHOICE` and `EXTRA_SNU_COLLECTION` are off
  (`infra/production/k8s/parts/shared/kustomization.yaml`); `LIBRARY_BOOKING_ENABLED` and `TUTORIAL_KWANJEONG_CHECK`
  are left at their defaults, on and off. [infra/production/README.md](infra/production/README.md) says how to turn
  on the Judgements, the same-event rules and extra.snu's Collections, and how to stop automatic publication at once.
- **ARM only.** Kakao's map SDK ships ARM libraries only, so the app is built for `arm64-v8a` alone. It runs on an
  ARM phone or an arm64 emulator (an Apple Silicon Mac). On the x86_64 emulator of an Intel Mac or most Windows PCs, a
  development build made with `ANDROID_X86_64=1` adds `x86_64` and runs everything but Kakao's map; for the map, use a
  physical Android phone there.
- **Expo Go shows no map.** In Expo Go and on the web the map is a plain ground, the sign-in is a mock and every answer
  is the app's sample data. Kakao's map, Google sign-in and the servers need a development build.
- **Shuttle positions lag.** The operator reports each vehicle as a point on its own drawing of the route, always at a
  stop. The main server places the vehicle at the nearest stop, and the app keeps it at the last stop reported,
  gliding it along the line in 10 seconds when a new stop is reported; it does not estimate a position between stops.
  There are no arrival times, and vehicles are shown on weekdays from 08:00 to 21:00, the app's own fixed window, with
  no check of term time.
- **Collected events wait for an Administrator** unless the rules read both their time and their place: a start
  with a time of day from the post's body, and a place that names exactly one Place. Every other collected event is a
  Draft until an Administrator publishes it on the admin site: Judgements, which would read them with the AI, are
  built but off in Production ([Evaluation](#evaluation)). A post is read once, so a later edit at the source is
  not seen, and a post of the events list that describes several sessions is one event. With the same-event rules off,
  extra.snu is not collected, so its programmes are not shown.
- **Users outside the Campus Boundary are hidden** from everyone, by design: a demo must be run on campus. The app's
  development settings can replace the phone's position with a walk on campus ([mobile/README.md](mobile/README.md),
  "Development settings").
- **No dashed lines on the native map.** Neither the Android nor the iOS map module draws dashes, so the walking
  route and the shuttle's line are solid in a build.
- **An Invite Link that starts the stopped app opens the map** instead of the accept screen, on Android. With the app
  running, the same link opens the accept screen. The device run M2 found it at the end of Iteration 2 (Testing
  Documentation, 2.2); it is not fixed yet.
- **Targets not yet measured on phones.** The latency, scalability and stopping times of the non-functional
  requirements (a position on a viewer's map within 2 seconds, 10 Users at once, an Avatar removed within 2 seconds)
  are stated and not measured; they are to be measured in Iteration 4.
- **Plain http is allowed in every build**, so that a build reaches the servers on one's own computer and the Dev
  Server, which answers over http. Todo, once only Production is used: remove `usesCleartextTraffic` from
  `mobile/app.json`.
- **The walking route has a quota** of 1,000 routes a day for the team's Kakao app. A route is asked when the User
  asks for one and, while a party room is open, for each sharing member who has moved, at most once a minute each,
  looked at every 15 seconds.
- **Sample data in a build.** Friends' statuses (such as 공강), who announced a Global Event and "오늘의 발자국" are the
  app's own sample data even against the servers: no server serves them yet.
- **Kept on the phone only.** The party form's 사진 and 태그 and the room's 파티 채팅 are kept on the phone that made
  them: the main server stores none of them yet, so other members do not see them. Timetable versions other than the
  current one belong to one phone, and while a switch runs the server's timetable is empty or partial for a few
  seconds. The + button (올리기) answers "준비 중이에요", and the legal texts of the consent screen are being written.
- **SNU Now AI.** Its answers depend on the model and vary between runs of the same question; several suites still
  miss thresholds ([Evaluation](#evaluation)). They are measured only when a developer runs them, by hand. Replies
  are not streamed, a conversation is lost when the app restarts, and the Assistant cannot manage an existing party or
  activate one. Messages go to the model provider through OpenRouter, which the empty chat says; the move to the
  Anthropic API (A01) is in review. A meeting place and time proposed for an existing party is not built; for a meal,
  공강에 밥 proposes a Restaurant and a time.
- **Walking and shuttle times are estimates** ([Evaluation](#evaluation)). The figures there are for `3.0/Main` and
  not released yet: Production still uses the earlier walking table, within min(25%, 2 min) on 3 of 30 test walks
  (±2 min: 14), and has no logged shuttle times. The shuttle's waits are the operator's fixed values in both.
- **관정도서관.** The library's cards need the app 1.0.1 or later, whose native part has the web view. Booking works only for
  the spaces in the catalogue: a space that cannot be booked online gets a 현장 이용 answer, others 아직 미구현. A party holds at
  most 8, so a group study room for 9 or more is refused and the 20인실 is not offered. The tutorial's 관정 quest is
  completed by 완료했어요; the phone's check of the User's bookings is off. A forgotten seat is not announced, since there
  are no push notifications.
- **Timetable reading.** Photos of a screen, a professor's name printed inside a block and two overlapping classes
  drawn side by side are not read; the last are reported as left out. A real dark-mode screenshot is not yet among the
  test screenshots.
- **Left in the code.** AI 매칭 and the match server are frozen: they run in every deployment and are still tested.
  The active party's own join request and invitation routes and the `meetups` table remain, unused. Redis runs
  without a password.
- **Planned for later iterations**: switching on Judgements, the same-event rules and extra.snu once they reach their
  thresholds; a meeting place and time proposed for a party's members; the app's results shown on the map to explore;
  push notifications; Private Events, Private Zones and blocking; searching parties by meaning on the server; iOS
  builds through TestFlight or the App Store; usage data and a better admin site; organizer accounts; cafés and other
  restaurants in the dining layer; arrival estimates for the shuttle.
- **Slow tests under load.** A few Jest tests of the app can exceed their 60 seconds on a busy machine; they pass when
  their file is run alone.

## Development and execution environment

What the project was built and run with:

| Part                   | Used                                                                                                                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Development machine    | macOS on Apple Silicon                                                                                                                            |
| Node.js and pnpm       | Node.js 24.14.0, the version in `.nvmrc`; pnpm 12.6.0                                                                                             |
| Containers             | Docker Desktop (Docker 29, Compose 5), `compose.yaml` at the repository root                                                                      |
| Servers                | NestJS 12 on Node.js 24 in containers; Prisma 7; Socket.IO 4                                                                                      |
| Data stores            | PostgreSQL 18 with PostGIS 3, Redis 8                                                                                                             |
| Assistant              | Vercel AI SDK 7 with the OpenRouter provider; the model set by `ASSISTANT_MODEL`                                                                  |
| Admin site             | Next.js 16 with React 19, in a desktop browser                                                                                                    |
| App                    | Expo SDK 57, React Native 0.86, Expo Router, expo-updates; local modules: Kakao Maps SDK, ML Kit, cookies                                         |
| Android build          | JDK 17 (Temurin) locally, JDK 21 (Temurin) for the Production APK in CI; Android SDK Platform and Build-Tools 36, Gradle 9.3.1                    |
| Android devices        | Emulator: Android 16 (API 36), Google Play, `arm64-v8a`; ARM Android phones                                                                       |
| Device runs            | Maestro 2.11.0 on the Android emulator (API 36, `arm64-v8a`)                                                                                      |
| iOS build (not demo)   | Xcode 27 with the iOS 27 simulator, CocoaPods 1.17                                                                                                |
| Continuous integration | GitHub Actions on `ubuntu-latest`, each push: every project's four checks, `flow-tests`, the infra and Release-script checks, the app fingerprint |
| Deployment             | Dev Server: Docker Compose, Caddy; Production: Terraform, Amazon EKS in Seoul; the app: EAS Update                                                |

## Requirements

- Node.js 24. With nvm, `nvm install` and `nvm use` read `.nvmrc` at the repository root.
- pnpm 12.6.0, the version each `package.json` declares. If `pnpm -v` prints another version, type `npx pnpm@12.6.0`
  wherever this guide says `pnpm`.
- Docker with Docker Compose 2.24 or later, running.
- `git` and `openssl`, which macOS and Linux have.
- For the app's build: JDK 17, Android Studio with Android SDK Platform and Build-Tools 36, Platform-Tools and the
  Emulator ([mobile/README.md](mobile/README.md), "Build the app for Android", "Tools").
- An ARM Android phone, or an arm64 emulator with Google Play, with a Google account signed in.
- The team's Kakao keys (REST API, JavaScript and native app keys), which the Owner of the team's Kakao app shares
  privately: ask the team. To only try the app, use the [Quick start](#quick-start) instead.
- An SNU Google account to sign in to the app.
- For SNU Now AI only: an OpenRouter API key with a credit limit. Without it every other feature runs.
- For 관정도서관 booking only: an SNU account that can log in to the library's booking site, on the phone.
- For the device runs only: Maestro 2.11.0 ([mobile/README.md](mobile/README.md), "Device runs").
- About 30 GB of free disk space. On one Mac the Android build's Gradle cache took about 10 GB, Docker's images and
  build cache about 15 to 20 GB, and an iOS build's Xcode cache about 3 GB. When the disk fills, Docker stops with
  input/output errors.

## Setup

From a clean clone, in this order. The project READMEs explain each step. On a Mac whose Desktop and Documents are
synced to iCloud Drive, clone elsewhere, such as `~/Developer`: a checkout under them cannot be built for iOS
([mobile/README.md](mobile/README.md), "Keep the checkout out of iCloud Drive").

```bash
git clone https://github.com/snuhcs-course/swpp-2026-project-team-09.git
cd swpp-2026-project-team-09
nvm install
nvm use
```

The main server's settings, with an access token key pair and the two shared secrets of your own:

```bash
cd main-server
pnpm install
cp .env.example .env
pnpm keys:generate >> .env
echo "WORKER_TOKEN=$(openssl rand -hex 32)" >> .env
echo "MATCH_SERVER_TOKEN=$(openssl rand -hex 32)" >> .env
cd ..
```

Then open `main-server/.env`, fill in `KAKAO_REST_API_KEY` and, for SNU Now AI, `OPENROUTER_API_KEY`, and replace the
example address in `INITIAL_ADMINISTRATOR_EMAILS` with your Google account's address, so that you can sign in to the
admin site. The main server reads it only when it starts on a database that holds no Administrator: once the servers
have run with the example address, a new address is not taken until the data is deleted with `docker compose down -v`.

The other servers take the same public key and secrets from it:

```bash
cd socket-server
pnpm install
cp .env.example .env
grep '^ACCESS_TOKEN_PUBLIC_KEY=' ../main-server/.env >> .env
cd ../worker-server
pnpm install
cp .env.example .env
grep '^WORKER_TOKEN=' ../main-server/.env >> .env
cd ../match-server
pnpm install
cp .env.example .env
grep '^MATCH_SERVER_TOKEN=' ../main-server/.env >> .env
cd ..
```

The admin site and the app:

```bash
cd admin
pnpm install
cp .env.example .env
cd ../mobile
pnpm install
cp .env.example .env
cd ..
```

Fill in `admin/.env` and `mobile/.env` as [Settings](#settings) says. `pnpm install` in a server is needed only to
generate keys, run the server outside Docker or run its tests; Docker builds the images with their own.

## Settings

Each project reads its own `.env`, copied from its `.env.example`, which Git ignores. Every setting is listed here by
name; the values are in the `.env.example` files, the project READMEs or with the Owner of the team's Kakao app. Under
`docker compose`, the addresses, ports and database URLs of the servers are set in `compose.yaml` and override the
file's.

### main-server

| Setting                            | What it is                                                                                                                               |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                             | The port the HTTP server listens on.                                                                                                     |
| `DATABASE_URL`                     | The main database, reached with the main server's own role.                                                                              |
| `REDIS_HOST`                       | Redis's host, which carries messaging between the servers.                                                                               |
| `REDIS_PORT`                       | Redis's port.                                                                                                                            |
| `ACCESS_TOKEN_PRIVATE_KEY`         | The private key that signs access tokens; written by `pnpm keys:generate`, never shared.                                                 |
| `ACCESS_TOKEN_PUBLIC_KEY`          | The public key of the same pair, which the socket server is given; written by the same command.                                          |
| `GOOGLE_APP_CLIENT_ID`             | The app's Google OAuth client; already in `.env.example`.                                                                                |
| `GOOGLE_ADMIN_CLIENT_ID`           | The admin site's Google OAuth client, which must differ from the app's; already in `.env.example`.                                       |
| `INITIAL_ADMINISTRATOR_EMAILS`     | The Administrators registered when the database holds none; your own address.                                                            |
| `KAKAO_REST_API_KEY`               | The REST API key of the team's Kakao app, for walking routes; a secret the Owner shares.                                                 |
| `WORKER_TOKEN`                     | The secret the worker server sends with what it collects; generated in [Setup](#setup).                                                  |
| `PUBLIC_URL`                       | The address the apps reach this server at from outside, from which Invite Links are built.                                               |
| `ANDROID_CERTIFICATE_FINGERPRINTS` | The SHA-256 fingerprints of the app's signing certificates, for Invite Links' App Links.                                                 |
| `MATCH_SERVER_URL`                 | Where the match server is reached.                                                                                                       |
| `MATCH_SERVER_TOKEN`               | The secret the main and match servers send each other; generated in [Setup](#setup).                                                     |
| `DEMO_ACCOUNT_EMAILS`              | Read by the demo profile only: real SNU addresses that get demo Friends, requests, an invitation.                                        |
| `OPENROUTER_API_KEY`               | The OpenRouter key SNU Now AI calls its model with. Empty, the Assistant answers it is unavailable.                                      |
| `ASSISTANT_MODEL`                  | The OpenRouter id of the Assistant's model; `anthropic/claude-haiku-5.5` in `.env.example`.                                              |
| `ASSISTANT_DAILY_MESSAGES`         | Optional: the messages a User may send in a day in Korea; 50 unless set.                                                                 |
| `ASSISTANT_MAX_STEPS`              | Optional: the model calls per message; 8 unless set.                                                                                     |
| `ASSISTANT_TIMEOUT_MS`             | Optional: the milliseconds over all of a message's model calls; 30000 unless set.                                                        |
| `ASSISTANT_MAX_OUTPUT_TOKENS`      | Optional: the tokens the model may write in each call; 4000 unless set.                                                                  |
| `AUTOMATIC_PUBLICATION`            | Optional: `off` keeps every collected session a Draft, to stop publication; `on` unless set.                                             |
| `AUTOMATIC_JUDGEMENT`              | Optional: `on` lets the step after a Collection ask the model about Drafts; `off` unless set.                                            |
| `SAME_EVENT_TITLE_RULE`            | Optional: `on` lets that step attach a session by an equal title and start; `off` unless set.                                            |
| `SAME_EVENT_AI_CHOICE`             | Optional: `on` lets that step ask the model about the candidates the rules leave; `off` unless set.                                      |
| `JUDGEMENT_TIMEOUT_MS`             | Optional: the milliseconds of a Judgement's model call; 60000 unless set.                                                                |
| `JUDGEMENT_MAX_OUTPUT_TOKENS`      | Optional: the tokens the model may write in a Judgement; 4000 unless set.                                                                |
| `LIBRARY_BOOKING_ENABLED`          | Optional: `false` answers library requests with the official site and no card; `true` unless set.                                        |
| `TUTORIAL_KWANJEONG_CHECK`         | Optional: `true`, with `LIBRARY_BOOKING_ENABLED` on, completes the 관정 tutorial quest by the phone's booking check; `false` unless set. |

### socket-server

| Setting                   | What it is                                                                     |
| ------------------------- | ------------------------------------------------------------------------------ |
| `PORT`                    | The port of the HTTP server and the Socket.IO connections.                     |
| `REDIS_HOST`              | Redis's host.                                                                  |
| `REDIS_PORT`              | Redis's port.                                                                  |
| `ACCESS_TOKEN_PUBLIC_KEY` | The main server's public key, copied from `main-server/.env`, to check tokens. |

### worker-server

| Setting                | What it is                                                              |
| ---------------------- | ----------------------------------------------------------------------- |
| `PORT`                 | The port the HTTP server listens on.                                    |
| `MAIN_SERVER_URL`      | Where the main server is reached, to hand over what is collected.       |
| `WORKER_TOKEN`         | The same line as in `main-server/.env`.                                 |
| `EXTRA_SNU_COLLECTION` | `on` lets the schedule start extra.snu's Collections; `off` unless set. |

### match-server

| Setting                  | What it is                                                    |
| ------------------------ | ------------------------------------------------------------- |
| `PORT`                   | The port the HTTP server listens on.                          |
| `DATABASE_URL`           | The match database, reached with the match server's own role. |
| `MATCH_SERVER_TOKEN`     | The same line as in `main-server/.env`.                       |
| `MAIN_SERVER_URL`        | Where the main server is reached.                             |
| `ROUND_INTERVAL_SECONDS` | The seconds from one round of AI 매칭 to the next.            |

### admin

| Setting                            | What it is                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------ |
| `MAIN_SERVER_URL`                  | The main server's address, read on the site's server only.                     |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`     | The admin site's Google client: the main server's `GOOGLE_ADMIN_CLIENT_ID`.    |
| `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY` | The JavaScript key of the team's Kakao app, for the maps; the Owner shares it. |

### mobile

| Setting                            | What it is                                                                                                                                                          |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | The Google client of type "Web application" the ID token is issued for: the main server's `GOOGLE_APP_CLIENT_ID`. Without it the sign-in stays the mock.            |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | The Google client of type "iOS"; the iOS build only.                                                                                                                |
| `GOOGLE_IOS_URL_SCHEME`            | The iOS client's ID reversed; the iOS build only.                                                                                                                   |
| `EXPO_PUBLIC_MAIN_SERVER_URL`      | The main server's address as the phone reaches it. Without it the app keeps its sample data.                                                                        |
| `EXPO_PUBLIC_SOCKET_SERVER_URL`    | The socket server's address as the phone reaches it.                                                                                                                |
| `INVITE_LINK_HOST`                 | The host of the main server's `PUBLIC_URL`, for Invite Links' App Links; read when the build is made.                                                               |
| `KAKAO_NATIVE_APP_KEY`             | The native app key of the team's Kakao app, for the map; the Owner shares it; read when the build is made.                                                          |
| `UPDATE_CHANNEL`                   | The EAS Update channel the build asks for bundles; read when the build is made; `production` when empty.                                                            |
| `EXPO_PUBLIC_RELEASE_TAG`          | The Release tag the JavaScript was built from, shown in 내 정보; a Release sets it; empty, 내 정보 shows 개발 빌드.                                                 |
| `EXPO_PUBLIC_RELEASE_COMMIT`       | The commit of the same Release, shown beside it.                                                                                                                    |
| `ANDROID_X86_64`                   | `1` adds `x86_64` to a development build, for an x86_64 emulator, where everything but Kakao's map runs; given on the prebuild command line, not in `.env.example`. |

The app also takes development settings when it is started, such as answers that fail on purpose; they are in
[mobile/README.md](mobile/README.md), "Development settings".

## Running the servers

In the repository root, with Docker running:

```bash
docker compose up --build
```

This starts PostgreSQL, Redis and the four servers. The main server brings its database up to date and loads the seed
(the Places, the Campus Boundary and the shuttle's stops and line) before it starts. The main server answers on port
3000 and the socket server on 3001, on the network too, so that a phone can reach them; the worker (3002), the match
server (3003), PostgreSQL and Redis only on the loopback address. Anyone on the same network can reach the two ports
over plain http, so on a public Wi-Fi run the servers only while you use them. `http://localhost:3000/health/ready`
answers 200 once the main server can reach its stores.

- `docker compose down` removes the containers and keeps the data; `docker compose down -v` deletes the data too,
  with the collected Global Events, what Administrators did with them and the Administrators themselves.
- A setting that is missing or wrong stops its server with the setting's name in the log, for example when
  `KAKAO_REST_API_KEY` is empty.
- To fill the menus without waiting for the next Collection, at 05:00 or 10:00:
  `docker compose exec worker-server node dist/collect coop_menus dormitory_menus veterinary_menus`.
- To fill the Global Events without waiting for the next Collection, at 00:00, 06:00, 12:00 or 18:00:
  `docker compose exec worker-server node dist/collect snu_events`. Until then the admin site shows the Source as
  never collected.
- To run one server outside Docker while you work on it, see its README, "Run it".

### Demo data

To try every feature at once, start the system with the demo profile:

```bash
docker compose --profile demo up --build
```

It adds 8 demo Users and their friendships, 6 published Global Events today and this week, recruiting parties on every
Board, an active party, this week's menus and, outside the shuttle's hours, two shuttle vehicles, and keeps the demo
Users' Avatars walking along the shuttle's line on campus. List your own SNU address in `DEMO_ACCOUNT_EMAILS` of
`main-server/.env` before starting: once you have finished Onboarding, you receive demo Friends (the active party's
members among them), two Friend Requests and a party invitation within 5 seconds.
`docker compose --profile demo restart demo-seed` brings the times up to date, and
`docker compose --profile demo down -v` removes it all. The details are in
[main-server/README.md](main-server/README.md#demo-data).

## Running the admin site

With the servers running and `admin/.env` filled in:

```bash
cd admin
pnpm dev
```

Open http://localhost:3100 and sign in with Google, with an account whose address is registered as an Administrator:
on a new database, the addresses of `INITIAL_ADMINISTRATOR_EMAILS`. The port must stay 3100, the one registered with
Google and Kakao. See [admin/README.md](admin/README.md).

## Running the app

### In Expo Go, without a build

```bash
cd mobile
pnpm start
```

Press `a` for a running Android emulator, or scan the QR code with Expo Go on a phone. Every screen runs against the
app's sample data, with a mock sign-in and no map (a plain ground): enough for the screens, not for the demo flows.

### A development build on an emulator

The build holds the native map module and Google sign-in, and talks to the servers. In `mobile/.env`, fill in
`KAKAO_NATIVE_APP_KEY` and `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, and give `EXPO_PUBLIC_MAIN_SERVER_URL` and
`EXPO_PUBLIC_SOCKET_SERVER_URL` the addresses the emulator reaches your computer at, `http://10.0.2.2:3000` and
`http://10.0.2.2:3001`. Create and start an emulator with the system image Android 16.0 (API 36), Google Play,
arm64-v8a, sign in to a Google account on it, then:

```bash
cd mobile
pnpm android
```

It generates `android/`, builds and installs the app and starts the development server. The first build takes 15 to
30 minutes. After a change to `KAKAO_NATIVE_APP_KEY` or `INVITE_LINK_HOST`, generate the project again with
`pnpm expo prebuild --platform android`. The two server addresses are read when the development server starts: after
a change to them, such as when the computer's address on the network changes, restart it and reload the app, with no
new build. When the map stays blank, [mobile/README.md](mobile/README.md), "When the map does not appear", reads the
log.

### On a phone

Turn on Developer options and USB debugging, connect the phone, check that `adb devices` lists it, and run
`pnpm android --device` to choose it.

The phone must reach the main and socket servers:

- Every build allows plain http (`usesCleartextTraffic` in `mobile/app.json`), so on the same network as the computer
  the two addresses can be the computer's address on that network, with ports 3000 and 3001. Invite Links do not open
  the app there: Android opens the app only for links under the https host the build was made with
  (`INVITE_LINK_HOST`), and a build without it opens links only through `snunow://invite/<token>`
  ([mobile/README.md](mobile/README.md), "Invite Links on Android").
- From anywhere else, put the computer's ports 3000 and 3001 behind an https tunnel and use its two https addresses
  in `mobile/.env`. Set the main server's `PUBLIC_URL` to the tunnel's address for the main server and
  `INVITE_LINK_HOST` to its host, so that Invite Links open the app. If the tunnel's address changes on restart, links
  made before stop working.
- Or use a deployed server instead of the computer's: Production at `https://api.snunow.com` for both addresses, with
  `INVITE_LINK_HOST=api.snunow.com`, or the Dev Server at the address in the comments of `mobile/.env.example`
  ([Deployment](#deployment), [infra/production/README.md](infra/production/README.md)).

A debug build loads its JavaScript from the development server on the computer (port 8081), which `pnpm android`
starts: keep its terminal open, and keep the phone on the cable or on the same network as the computer. Without it the
app shows an error screen, on iOS "No script URL provided".

Positions are shared only inside the Campus Boundary, so the flows are run on campus.

### Keys registered with the signing key

Google and Kakao accept the app only when they know the key that signed it:

- A development build and the APKs are signed with the Expo template's debug key, which every checkout shares.
  Its key hash is registered at Kakao, and its SHA-256 is already in the main server's
  `ANDROID_CERTIFICATE_FINGERPRINTS`. Google sign-in needs an Android OAuth client in the Google Cloud project with
  the package name `com.bonnieandclaude.snunow` and the key's SHA-1.
- A build signed with another key, such as one signed on EAS, needs the same three registrations for its key: the
  SHA-1 at Google, the key hash at Kakao and the SHA-256 in `ANDROID_CERTIFICATE_FINGERPRINTS`.
  `.scratch/research/external-sources.md`, sections 7.2 and 8, has the commands that read them.

### APKs

Release builds of the app, attached to the repository's
[GitHub releases](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases). Each is built for `arm64-v8a`
alone and signed with the shared debug key, so Google and Kakao accept it as they accept a development build. None
needs a build of the app or a development server.

- **Production**: the app for `https://api.snunow.com`, the APK for testers:
  [`snunow-app-26.11.03-2.apk`](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/download/snunow/app/26.11.03-2/snunow-app-26.11.03-2.apk)
  on the
  [snunow/app/26.11.03-2 release](https://github.com/snuhcs-course/swpp-2026-project-team-09/releases/tag/snunow/app/26.11.03-2),
  the app's version 1.0.1, built in CI from `0e08f839`. It is the first build with the web view that 관정도서관 needs.
  Its JavaScript is updated by OTA, so it runs the latest Release's code, not only its own. Invite Links under
  `https://api.snunow.com/invite/` open it. A phone with an older Production APK should install this one. Later
  Production APKs are attached to the release page of the Release tag that built them, `snunow/app/YY.MM.DD-N` or
  `snunow/all/YY.MM.DD-N` ([Deployment](#deployment)).
- **Dev Server**: the app for the Dev Server, attached to a `dev-YYYY-MM-DD` release and listed at the Dev Server's
  [`/apk/`](http://swpp26t09.147-46-242-174.sslip.io/apk/) for a phone's browser. The newest, `dev-2026-10-19`, is
  the app's version 1.0.0, without the web view or OTA updates, so it cannot run Iteration 3's flows.

The Production app updates itself: a Release that changes only JavaScript reaches installed apps by EAS Update from
their next start, and a change to the native part needs a new APK, which older builds announce with 업데이트가
필요합니다 at their start ([infra/production/README.md](infra/production/README.md), "The Production APK").

The development settings are off in every APK, so a User away from the campus is shown to nobody: on an emulator, set
the location to a point on campus in the extended controls.

## Running the tests

Each project has the same four checks, which CI runs on every push. A test's level, unit, integration or end-to-end, is
in its file name ([ADR 0007](docs/adr/0007-test-levels-by-what-a-test-starts.md)), and follows what the test starts: a
unit test (`.unit.test.ts(x)`) calls one module with stand-ins and does no I/O; an integration test
(`.integration.test.ts(x)`) joins two of our layers or crosses a real boundary, such as a database container or a
started server; an end-to-end test (`.e2e.test.ts`) drives the whole system from outside, through a screen or the
servers' public interfaces. A Maestro flow's level is its folder. Each runner picks up only its own level's suffix. Run
them in the project's folder:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
```

| Project         | What `pnpm test` runs and needs                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main-server`   | Vitest against PostgreSQL and Redis containers it starts; Docker running; `pnpm test:unit` needs no Docker                                              |
| `socket-server` | Vitest against a Redis container it starts itself; Docker running; `pnpm test:unit` needs no Docker                                                     |
| `worker-server` | Vitest on saved pages of each Source; neither it nor `pnpm test:unit` needs Docker                                                                      |
| `match-server`  | Vitest against a PostgreSQL container it starts itself; Docker running; `pnpm test:unit` needs no Docker                                                |
| `admin`         | Vitest: `unit`, `integration-pages`, `integration-site`; neither it nor `pnpm test:unit` needs Docker                                                   |
| `mobile`        | Jest, against the mocks and a fake main server and socket; neither it nor `pnpm test:unit` needs Docker                                                 |
| `flow-tests`    | Iteration 1's demo flows (Event through AI 매칭, Friend, Campus services), A1, A2 and the stack checks, on the four built servers; Docker and `openssl` |

`flow-tests` builds the servers' images the first time, which takes some minutes, and leaves a running stack and its
data alone: [flow-tests/README.md](flow-tests/README.md). Its `pnpm test:admin-ui` runs the W1 and W2 journeys through
the admin site in a browser, which neither `pnpm test` nor CI runs.

Each project's `pnpm lint` runs the level check of `scripts/` with the globs its test runners include and exclude, so it
fails a test file that no runner of that project would run, as well as one without a level. After a coverage run,
`node ../scripts/coverage-by-file-set.ts coverage/coverage-summary.json` in a project's folder sums the report over the
P09 spec's file sets ([its coverage goals](.scratch/iteration-2/P09-unit-tests/spec.md)). The two scripts have tests of
their own, which no project runs. From the repository root:

```bash
node --test 'scripts/test/*.test.ts'
```

The Release script and the Dev Server's scripts have Bats tests, which CI runs: `bats --recursive .github/release` and
`bats --recursive infra/deploy`.

Not run by `pnpm test` or CI:

- **Coverage**: `pnpm test:cov` runs a project's whole suite with coverage, and `pnpm test:cov:unit` its unit tests
  only. The goals are in the
  [Testing Documentation](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Testing-Documentation), and
  the Iteration 3 figures, every target met, in
  [Testing Documentation – Iteration 3 Coverage Details](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Testing-Documentation-%E2%80%93-Iteration-3-Coverage-Details).
- **Device runs**: `pnpm build:mock-apk`, then `pnpm test:device` in `mobile/`, run the M1 and M2 flows with Maestro on
  an Android emulator against the app's own mock data ([mobile/README.md](mobile/README.md), "Device runs"). M2 on a
  cold start still fails (see [Known limitations and todos](#known-limitations-and-todos)).
- **The evaluations** ([Evaluation](#evaluation)) call the real model and spend OpenRouter credit, so they run by hand
  only, in `main-server/`. `pnpm eval` runs the Assistant's 62 P19 cases, and
  `pnpm eval --world <p4|p5|large-world-v1|p6>` one Iteration 3 suite; `pnpm eval:holdout` runs the P4 holdout;
  `pnpm eval:collection --run <name> --part held-out` runs evaluations A and B on saved posts, and B's runs (`r0b`,
  `title-rule`, `ai-choice`) also take `--from <a saved Judgement run.json>`. `pnpm eval:score` and
  `pnpm eval:compare` score and compare saved runs, and `pnpm walking:score` and `pnpm shuttle:score` the walking
  table and the shuttle's times, all without the model. The chat and collection suites' rules and records are in
  `main-server/eval/`; `eval/walking` and `eval/shuttle-days` hold only data, and their record is
  [P11's before-after](.scratch/iteration-3/P11-free-time-meals-parties-improve/before-after.md).

## Deployment

The **Dev Server** is the team's shared server, server B of the two the course lends the team. It runs the four
servers, PostgreSQL, Redis and the [Demo Data](#demo-data) under Docker Compose, behind a Caddy proxy, at
`http://swpp26t09.147-46-242-174.sslip.io`. The stack is `compose.yaml` with `compose.deploy.yaml` over it.

It follows the `development` branch by itself: every minute it fetches the branch and, once a new commit's server
checks have passed in CI, rebuilds and restarts what changed. Nothing pushes to it
([ADR 0003](docs/adr/0003-the-dev-server-pulls-its-deployments.md)). No pull request targets `development`: a team
member fast-forwards it to the iteration branch, now `3.0/Main`, from a checkout. **`development` is at `871886a7` of
2026-11-01**, before P06 and P13, so the Dev Server has no 관정도서관, tutorial or 공부공간 layer: run Iteration 3's
flows against Production or your own servers.

- `/deploy-status` shows the deployed commit and the last run's result, and `/apk/` lists the dev APKs for a
  phone's browser.
- To build the app against it, copy the two commented lines of `mobile/.env.example` into `mobile/.env`.
- The admin site is not deployed: run it on a laptop with `MAIN_SERVER_URL` in `admin/.env` set to the Dev Server's
  address.

The runbook, [infra/deploy/README.md](infra/deploy/README.md), says how to set up a server, read the status and the
journal, redeploy by hand, move `development`, restore a dump and add an APK.

**Production** is the system that people outside the team use, for user testing, the beta test, and the final demo.
It runs on Amazon EKS in AWS's Seoul Region, built with Terraform, and answers at `https://api.snunow.com` for the app
and at `https://admin.snunow.com` for the admin site. It starts with only the seed data and never carries Demo Data.
It changes only with a Release: a tag `snunow/<target>/YY.MM.DD-N` on a reviewed commit of the iteration branch, which
deploys one server, or all five with `all`, once every CI job has passed on that commit
([ADR 0006](docs/adr/0006-production-runs-on-eks-and-releases-are-pushed.md)); `all` also publishes the app's bundle,
and `app` publishes only the bundle. A Release of `app` or `all` that changes the native part also builds the
Production APK and attaches it to that tag's release page. What Production runs now, and its switches, are under
[Known limitations and todos](#known-limitations-and-todos). Two `t4g.small` nodes run the servers, the admin site and
Redis, the main and match databases are on RDS for PostgreSQL 18, and network policies allow only the listed
connections between pods. The runbook and the tool guide, [infra/production/README.md](infra/production/README.md),
say how to set up a laptop, release, deploy an earlier Release again, rotate a secret, publish the app's bundle by
hand, and move Production to another AWS account.

## Repository layout

| Folder           | What it holds                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| `main-server/`   | The main server: sign-in, Users, Friends, parties, sharing, events, SNU Now AI, tutorial, `eval/`                  |
| `socket-server/` | The socket server: pushes positions and signals to the apps over Socket.IO, keeps no data                          |
| `worker-server/` | The worker server: collects the events list, the menus and the shuttle on a schedule                               |
| `match-server/`  | The match server of the frozen AI 매칭: keeps its requests and groups them in rounds                               |
| `admin/`         | The admin site for Administrators                                                                                  |
| `mobile/`        | The app; its native map, OCR and cookie modules in `modules/`, its Maestro flows in `maestro/`                     |
| `flow-tests/`    | End-to-end tests across the four servers, and of the admin site in a browser                                       |
| `scripts/`       | The level check every project's `pnpm lint` runs (ADR 0007), the coverage sums, their tests                        |
| `infra/`         | The PostgreSQL image, the Dev Server (`deploy/`, `proxy/`), and Production (`production/`)                         |
| `docs/`          | Decision records (`adr/`), the agents' conventions (`agents/`), and Iteration 1's demo clips (`demo/iteration-1/`) |
| `.scratch/`      | Specs and tickets of each iteration's tasks, and research notes                                                    |
| `.github/`       | The CI and Release workflows and script, the pull request template, and the code owners                            |
| `.claude/`       | Shared skills for coding agents; `.agents/` links to them                                                          |

## AI-generated code

Everything the team wrote in this repository is AI-generated: the code, the tests, the CI workflow, the specs and
tickets in `.scratch/`, and the documents, this one among them. The exception is the gold labels of evaluations A and B
(below). It was written with Claude Code (Claude Fable 5.1 and Claude Opus 5.5) from 2026-09-28 on, and the wireframes
were drawn with Claude Design. Each source file starts with a box comment headed `AI-generated with Claude`, with a row
for each day an agent changed the file: the date, the Claude model, and the GitHub ID of the team member who prompted
it. Markdown, JSON, lockfiles, Prisma migrations, and test fixtures carry no box and are marked by this section, and
every commit of the team carries a `Co-Authored-By: Claude` trailer.

The team decided what to build, reviewed the specs and the table schemas, and checked the result on phones. People
also made the product decisions, such as the words party, active party and Quest, where API keys go and how much the
Assistant's benchmark may spend. Where something was wrong, the agent rewrote it; no code was edited by hand.

AI also runs inside the product: SNU Now AI calls a model through OpenRouter (Claude Haiku 5.5 in `.env.example`),
and so would Judgements and the same-event choice, which are off in Production. The timetable is read on the phone
with Google ML Kit's text recognizer.

Not AI-generated:

- the gold labels of evaluations A and B (`main-server/eval/collection/labels/`), which people attached by reading the
  source text, with no model drafting them; the one exception, a-039's owner field, Claude filled in and a person
  confirmed ([main-server/eval/collection/README.md](main-server/eval/collection/README.md));
- what came from elsewhere: the skills in `.claude/skills/`, the exported files in `main-server/seed/`, the saved
  pages that the worker's tests read, the images and the font in `mobile/assets/`, and the demo videos.

The AI Collaboration Reports on the Wiki, for
[Iteration 1](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/AI-Collaboration-Report-%E2%80%93-Iteration-1),
[Iteration 2](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/AI-Collaboration-Report-%E2%80%93-Iteration-2)
and [Iteration 3](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/AI-Collaboration-Report-%E2%80%93-Iteration-3),
tell how the work went, with the prompts in each iteration's Prompt Log.

## Data sources and attribution

| Source                                                                                                                | Used for                                                                   | Terms                                           |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------- |
| © OpenStreetMap contributors, through Overpass                                                                        | The Campus Boundary, the shuttle's line, two Places, outlines, 도보 시간   | [ODbL](https://www.openstreetmap.org/copyright) |
| NASA SRTM 30 m, through OpenTopoData                                                                                  | The elevation of the Places and shuttle stops for 도보 시간                | Public domain                                   |
| 국토지리정보원, 연속수치지형도 건물 (2026), from VWorld                                                               | The outlines of the campus's buildings and the Places the campus map lacks | 공공누리 제1유형 (source must be shown)         |
| SNU campus map, `map.snu.ac.kr`                                                                                       | The Places and the shuttle stops' coordinates                              | No terms published                              |
| Kakao                                                                                                                 | The map in the app and the admin site, and walking routes; nothing stored  | Kakao's terms and operating policy              |
| SNU Co-op (`snuco.snu.ac.kr`), 관악학생생활관 (`snudorm.snu.ac.kr`), College of Veterinary Medicine (`vet.snu.ac.kr`) | The menus                                                                  | Collected from public pages                     |
| SNU's events list, `www.snu.ac.kr/snunow/events`                                                                      | The Global Events                                                          | Collected from public pages                     |
| SNU's extracurricular programmes, `extra.snu.ac.kr`                                                                   | Programmes, when `EXTRA_SNU_COLLECTION` is on; posts for evaluations A, B  | Collected from public pages                     |
| The shuttle operator's route page and vehicle positions, `web.busin.co.kr` (route 41946)                              | The shuttle's stops, service hours and vehicles                            | Collected from public pages                     |
| Pretendard                                                                                                            | The app's font                                                             | SIL Open Font License 1.1                       |
| OpenRouter and the model it routes to                                                                                 | SNU Now AI's answers; conversations are not stored, locations never sent   | OpenRouter's terms                              |
| 관정도서관's booking site, `k-rsv.snu.ac.kr`, called from the phone with the User's own session                       | Free seats, seat maps and the User's bookings; nothing reaches our servers | The library's terms                             |
| SNU's public pages for students, read by hand                                                                         | The tutorial's quests, the study spaces and the facility booking links     | Facts checked by hand, with their sources       |
| The shuttle's vehicle positions, logged on the Dev Server on 2026-11-02 and 11-03                                     | The shuttle's ride times                                                   | Collected from public pages                     |
| Google ML Kit Text Recognition v2 (Korean), bundled in the app                                                        | Reading a timetable screenshot on the phone; nothing is sent               | ML Kit's terms                                  |

The app shows "© OpenStreetMap · 국토지리정보원" on every map, with a screen (지도 데이터 출처) that names its three
sources, OpenStreetMap, 국토지리정보원 and SRTM, and their licences. The exported seed files in `main-server/seed/`
record where they came from and when they were exported. No coordinate comes from Kakao's, Naver's or Google's maps.

## Links

- [The team's Wiki](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki): the proposal, the
  [Requirements and Specifications](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Requirements-and-Specifications),
  the [Design Documentation](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Design-Documentation), the
  [Testing Documentation](https://github.com/snuhcs-course/swpp-2026-project-team-09/wiki/Testing-Documentation), the
  AI Collaboration Reports and Prompt Logs, and the meeting logs.
- [GLOSSARY.md](GLOSSARY.md): the project's words, as the code names them. [docs/adr/](docs/adr/): its architecture
  decisions.
- Each project's README: [main-server](main-server/README.md), [socket-server](socket-server/README.md),
  [worker-server](worker-server/README.md), [match-server](match-server/README.md), [admin](admin/README.md),
  [mobile](mobile/README.md) and [flow-tests](flow-tests/README.md).
