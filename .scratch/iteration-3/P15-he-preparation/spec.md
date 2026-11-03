# P15: Preparing SNU Now for the Heuristic Evaluation

Status: ready-for-agent

## Problem Statement

On Wednesday 2026-11-04, students of other teams evaluate SNU Now in class against usability heuristics. The evaluation runs in two 30-minute rounds with two evaluators each. Every evaluator uses one of the team's two Galaxy phones and signs in with an account of their own. For this, the course asks for three things:

- an APK, zipped and uploaded to eTL by 2026-11-03 23:59 and installed on those phones;
- dummy data and test accounts that show the concept and the main flows;
- a server that keeps running for the whole evaluation.

The app as it stands cannot be shown that way.

- **Sign-in:** the app accepts only an SNU Google account. Evaluators cannot sign in with theirs on our phones. A member's account would leave a personal Google account on the phone, skip the first run and give every evaluator the same state.
- **Empty accounts:** a new account has no Friends, no Timetable and nothing for Free Time to work with. 공강에 밥 and the 공강 answers of the Assistant would have nothing to show. The demo Users have no Timetables either.
- **Servers:** the Dev Server is the team's working server, and Production is for real Users. Neither can hold evaluation accounts and fake Timetables.
- **APK stability:** an APK built the usual way may take later over-the-air updates and shows the update dialog. What evaluators see could change after the APK is submitted.
- **Shared phones:** the phone remembers consent and the location explanation. The second evaluator on a phone would skip both.
- **AI 매칭:** Matching was dropped but is still on the event cards and in the chat. A request there waits forever.

## Solution

An HE-only branch, `3.0/P15-he`, is cut from 3.0/Main and never merged back. It runs on the idle course server swpp-a with an APK of its own.

- **Account list:** the sign-in screen shows a list of seven HE accounts in place of Google's sheet. An evaluator picks the one the host names.
- **First run:** every account starts at the first run: consent, Onboarding, then the main screen. Onboarding suggests the account's name and department, as an SNU account's Google name would.
- **Ready-made data:** each account already has a weekly Timetable and Friends with Timetables of their own. 공강에 밥, the Free Time answers and the friend list have something real to work with from the first minute.
- **Rounds:**
  - Four accounts belong to the two rounds, two per round. The two accounts of a round start as strangers, so each round begins with a Friend Request between the evaluators.
  - Each round account starts with two of the three spare accounts as Friends.
  - The spares are there to replace an account that goes wrong, and they play the round accounts' Friends.
- **Recruiting Quests:** eight recruiting Quests are on the Boards, two of them led by round accounts. In each round, one evaluator can ask to join the partner's Approval Quest, and the partner can accept.
- **Real data:**
  - Menus, events and the shuttle come from the real Collections.
  - The demo data runs as it does on the Dev Server, untouched.
  - 관정도서관 booking works with the evaluator's own SNU login if they choose to try it.
- **Frozen app:** the APK takes no over-the-air update and shows no update dialog. What was submitted is what is evaluated.
- **Signing out:** the phone returns to its first run, so the next evaluator sees consent and the location explanation again.
- **AI 매칭:** pressing it says 준비 중이에요, as 오늘의 발자국 does.

## User Stories

1. As an evaluator, I want to sign in by picking an account from a list on the sign-in screen, so that I can try the app without a Google account of my own.
2. As an evaluator, I want each row of the list to show the account's name and whether it is for round 1, round 2 or a spare, so that I pick the one the host names.
3. As an evaluator, I want to close the list without picking, so that a wrong tap leaves me on the sign-in screen.
4. As an evaluator, I want either Google button on the sign-in screen to open the same account list, so that whichever I press leads to the accounts.
5. As an evaluator, I want the consent screen after signing in, so that I evaluate the first run a real User goes through.
6. As an evaluator, I want Onboarding to suggest the account's name and department, so that I can finish it quickly or change them.
7. As an evaluator, I want to choose my admission year in Onboarding, so that choosing 2026 starts the 새내기 튜토리얼 as it would for a freshman.
8. As an evaluator, I want the main screen to explain location sharing before Android asks for the permission, so that I evaluate that explanation too.
9. As a round 2 evaluator on a phone that round 1 used, I want the same first run as round 1, so that both rounds evaluate the same thing.
10. As a host, I want signing out to forget this phone's consent and location explanation, so that the next evaluator starts from the first run.
11. As a host, I want signing out to end the 관정도서관 Library Session and its cookies, as it does today, so that the next evaluator never sees the previous one's bookings.
12. As a host, I want an account signed in on the other phone to end its Session on this one, as Sessions always do, so that a mix-up shows at once.
13. As a host, I want the APK to offer no Google sign-in, so that no evaluator's or member's Google account is left on the phones.
14. As an evaluator, I want my account to start with two Friends who have Timetables, so that the friend features have someone to show.
15. As the two evaluators of a round, we want our accounts to start as non-Friends, so that we begin with a Friend Request to each other.
16. As an evaluator, I want to read my Friend ID on 친구 추가 and give it to my partner, so that they can send me a Friend Request.
17. As an evaluator, I want to send a Friend Request by my partner's Friend ID, so that I try adding a Friend.
18. As an evaluator, I want to accept my partner's Friend Request, so that we become Friends and appear in each other's lists.
19. As two evaluators who are now Friends, we want to see each other's Avatars once we both turn on Location Sharing on campus, so that we try the map with a real Friend.
20. As an evaluator, I want my starting Friends listed with their names even though nobody signs in as them, so that the friend list looks real.
21. As a host, I want three spare accounts, so that an account that goes wrong can be replaced.
22. As a host, I want the seven Friend IDs fixed in advance, so that I can keep them on a sheet for the rounds.
23. As an evaluator, I want a full weekly Timetable for my account's persona, so that I can look through it.
24. As an evaluator, I want to add a Class to my Timetable by hand, so that I evaluate manual entry.
25. As a round 1 evaluator, I want my account to be in Free Time during the evaluation with a Class at 16:00, so that my 공강 questions meet a gap that ends at the next Class.
26. As a round 2 evaluator, I want one account in Free Time until a 17:00 Class and the other free for the rest of the day, so that the two of us see different days.
27. As an evaluator, I want to ask the Assistant who can have dinner with me today, so that I see some of my Friends free and others not, and never why.
28. As an evaluator, I want to ask about lunch tomorrow, so that Thursday's different Free Time shows.
29. As an evaluator, I want to ask the Assistant for a 파티 that fits my Free Time now, so that the recruiting Quest held during the evaluation comes up.
30. As an evaluator, I want to ask the Assistant to recruit people for dinner at 학생회관, so that it offers the existing recruiting Quest to join first.
31. As an evaluator, I want to ask for a 파티 going to the band show, so that the Assistant finds the recruiting Quest that goes to it.
32. As an evaluator, I want Restaurant cards with today's collected menus, so that 공강에 밥 shows real data.
33. As an evaluator, I want to pick a Restaurant and make a 비공개 파티 that invites my round partner, so that my partner can accept the invitation on the other phone.
34. As an evaluator, I want recruiting Quests on every Board (식사, 커리어, 취미, 공연·전시), so that browsing the 파티 tab shows variety.
35. As an evaluator, I want to join an Open recruiting Quest at once, so that I can try its room afterwards.
36. As an evaluator, I want to ask to join my partner's Approval Quest, so that I try the approval flow.
37. As the Leader of a pre-made Approval Quest, I want to see my partner's request and accept it, so that the approval flow completes within the round.
38. As a round account's evaluator, I want my pre-made Quest listed among my own, so that I find where to accept requests.
39. As an evaluator, I want capacities large enough that earlier evaluators do not fill the Quests, so that every round can still join.
40. As an evaluator, I want to create my own recruiting Quest, so that my partner can find it and ask to join.
41. As an evaluator, I want shuttle positions, menus and events from the real Collections, so that I judge real content.
42. As an evaluator, I want the 행사 tab to keep the demo Global Events beside the collected ones, so that the tab is never sparse.
43. As an evaluator, I want AI 매칭 to say 준비 중이에요 when I press it, so that a dropped feature does not lead me into a dead end.
44. As an evaluator, I want every other feature left as it is in the app, so that I evaluate the real app.
45. As an evaluator, I want 관정도서관 booking to work with my own SNU login if I choose to try it, so that the library flow can be evaluated.
46. As an evaluator, I want the 새내기 튜토리얼 available, at once for a 2026 admission year or from 내 정보 otherwise, so that I can evaluate it.
47. As a host, I want the HE APK never to take an over-the-air update, so that the app being evaluated is the one we submitted.
48. As a host, I want no update dialog when the app starts, so that evaluators are never told to update.
49. As the PM, I want the HE server on swpp-a, so that the Dev Server and Production stay as they are.
50. As the PM, I want the HE branch never merged into 3.0/Main, so that HE-only code never reaches the product.
51. As the PM, I want to merge 3.0/Main into the HE branch later if P07 lands, so that its features can join without rewriting the branch.
52. As a developer, I want the HE setting off by default, so that the branch's CI, flow-tests included, passes as it does on 3.0/Main.
53. As the PM, I want swpp-a to deploy the HE branch's tip once its checks pass, as the Dev Server does with development, so that a fix reaches the server without a hand-made build.
54. As a host, I want one command to put the HE data in, so that preparing the server is a single step.
55. As a host, I want that command safe to run again, so that a second run neither duplicates data nor undoes what evaluators did.
56. As a host, I want the command to stop with a clear message when the campus Places or the demo data are missing, so that a wrong order is obvious.
57. As a host, I want the Collections run once by hand right after the first deploy, so that menus, events and the shuttle are there before the evaluation.
58. As a developer, I want a test to check the HE data at the moment of the evaluation, so that a mistyped time cannot quietly break a scenario.
59. As the PM, I want the stack, its keys and the evaluators' Onboarding answers removed from swpp-a after the evaluation when I say so, so that nothing of theirs stays on a course server.
60. As the PM, I want an APK and a ZIP of it, so that I can upload the ZIP to eTL and install the APK on the phones.

## Implementation Decisions

### Terms used here

These words are local to this spec. The PM chose to leave GLOSSARY.md as it is for them.

- **HE:** the course's Heuristic Evaluation of 2026-11-04 in class.
- **HE account:** one of the seven accounts below. They are not Demo Accounts, which are the members' own accounts.
- **Round account:** one of the four HE accounts used in the rounds.
- **Spare account:** one of the three HE accounts kept in reserve, which also play the round accounts' starting Friends.
- **HE server:** swpp-a at `http://swpp26t09.147-46-242-169.sslip.io`, reachable from the campus network.
- **Host:** the team member running a round.
- **파티:** as in the PM's words, a recruiting Quest: an Open or Approval Quest on a Board. It is not a Party.

### The HE branch

- **Origin:** `3.0/P15-he` is cut from 3.0/Main at `0e08f83`, with all of P06 merged and without P07.
- **Merging:** it is never merged into 3.0/Main and never rebased. If P07 lands, 3.0/Main can be merged into it.
- **Isolation:** no other branch, the Dev Server or Production changes. Only the branch is pushed, once, before the first deploy, on the PM's word. CI then runs on it.
- **Without P07:** P07 is not on the branch. Nothing in this spec depends on it or stands in for its features. If it is merged in later, its features come with the merge and nothing else.

### Sign-in

- **The HE stand-in:** a main-server setting, `HE_ACCOUNTS`, is off by default. When on, an HE stand-in sits in front of the Google check. An ID token equal to one of the seven account keys is answered with that account's claims:
  - the key as the Google subject;
  - the SNU hosted domain;
  - a verified address on a reserved `.invalid` domain, since the app never shows it;
  - the Google name `<name> / 학생 / <department>`.
- **Other tokens:** every other token goes through the Google check unchanged. With the setting off, nothing changes.
- **Real code from there on:** the rest of sign-in is the real code. That covers the User found by Google subject, the one-Session rule, consent and Onboarding.
- **Why a setting:** flow-tests sign in with test-key Google tokens through the real check. Replacing the check outright would fail CI and keep the deploy gate shut. The setting is on only on swpp-a.
- **The app's list:** on the HE branch, the Google step of sign-in becomes an in-app list of the seven accounts.
  - Each row shows the role and the persona's name, such as `1라운드 · 김하늘`.
  - Picking a row sends its key to the sign-in endpoint, where Google's ID token would go. Closing the list is a cancel.
  - Both Google buttons of the sign-in screen open this list. The screen is otherwise unchanged.
  - The app and the server share no code, so both keep the same seven keys.
- **Signing out:** the phone's consent and location explanation are forgotten as well. The background-sharing choice is already forgotten at sign-out. The Android location permission itself stays, since the app cannot revoke it.

### The HE accounts

The PM confirmed the roles, personas, Friends and Leaders. The keys and Friend IDs are this spec's choice. Friend IDs use the Friend ID alphabet, which has no 0, O, 1, I or L.

| Account | Role | Key | Friend ID | Friends at start | Leads |
|---|---|---|---|---|---|
| 김하늘 · 컴퓨터공학부 | round 1 | `he-r1a` | `HERA2345` | 박서진, 오세린 | none |
| 최유나 · 심리학과 | round 1 | `he-r1b` | `HERB2345` | 박서진, 오세린 | #3 |
| 한지우 · 산업공학과 | round 2 | `he-r2a` | `HERC2345` | 박서진, 오세린 | none |
| 정민재 · 경제학부 | round 2 | `he-r2b` | `HERD2345` | 이도현, 오세린 | #5 |
| 이도현 · 경영학과 | spare | `he-s1` | `HESA2345` | 정민재 | #2, #6 |
| 박서진 · 기계공학부 | spare | `he-s2` | `HESB2345` | 김하늘, 최유나, 한지우 | #7, #8 |
| 오세린 · 생명과학부 | spare | `he-s3` | `HESC2345` | all four round accounts | #1, #4 |

- **Not Friends:** the two accounts of a round, accounts of different rounds, and the spares with each other.
- **Random draw:** the spares each round account starts with were drawn at random once, on 2026-11-03, and the draw is fixed.
- **Account rows:** each account is a User that has not finished Onboarding.
  - Its name and department are set, so that friend lists show them before anyone signs in as it.
  - Its Google name matches the one the stand-in sends.
  - Its Master Switch is off.
  - Every department is in Onboarding's department list.
- **Nothing else is seeded:** no Friend Requests, no Quest invitations and no Party memberships. Each friendship keeps the default switches, on at both ends.

### The Timetables

All seven accounts get one. Monday repeats Wednesday's Classes and Tuesday repeats Thursday's. The weekend is empty.

- **Classes and Places:** a Class with only a start time lasts 75 minutes. The number in brackets is the campus-map Place of the building, chosen to fit the department.
- **Rooms:** they are left empty.

| Account | Wed | Thu | Fri |
|---|---|---|---|
| 김하늘 | 11:00 알고리즘 (302), 16:00–16:50 공학수학2 (301) | 09:30 자료구조 (301), 14:00 운영체제 (302) | 16:00–16:50 공학수학2 (301) |
| 최유나 | 11:00 심리학개론 (16) | 12:30 사회심리학 (16), 15:30 심리통계 (83) | 10:00–11:50 심리학실험 (16) |
| 한지우 | 14:00 확률모형 (43-1), 17:00 생산관리 (43-1) | 11:00 경영과학 (301), 15:30 공학경제 (43-1) | 13:00–13:50 산업공학세미나 (43) |
| 정민재 | 12:30 미시경제이론 (16) | 09:30 거시경제이론 (16), 14:00 경제수학 (83) | 11:00 경제사 (16) |
| 이도현 | 11:00 회계원리 (58), 15:30 마케팅관리 (58) | 12:30 조직행동론 (59) | none |
| 박서진 | 09:30 열역학 (301), 17:00–19:50 기계공학실험 (301) | 11:00 유체역학 (301), 12:30 동역학 (302) | 09:00–09:50 공학수학1 (43-1) |
| 오세린 | 09:30 생물학 (24), 11:00 화학 (26) | 14:00–16:50 생물학실험 (24) | 10:00–10:50 대학글쓰기 (1) |

The seed test checks the following effects, with the Leaders' own Quests counted as busy as Free Time counts them.

- **During the evaluation (Wed 15:30–16:45):**
  - 김하늘 is free, and the next item is 공학수학2 at 16:00, so a question about the gap now ends there.
  - 최유나 is free all afternoon, and her #3 makes her busy from 17:30 to 18:30.
  - 한지우 is free from 15:15 until 생산관리 at 17:00.
  - 정민재 is free from 13:45 for the rest of the day.
- **Wednesday dinner (17:00–19:30):**
  - 박서진 is busy with his lab.
  - 오세린 is free from 17:30, after her #1 ends.
  - 이도현 is free 17:00–18:00 and 19:00–19:30, around his #2.
  - So 김하늘, 최유나 and 한지우 each have one of their two starting Friends free, and 정민재 has both.
- **The round partners at dinner:** they overlap once they become Friends. 김하늘 and 최유나 share 17:00–17:30 and 18:30–19:30, and 한지우 and 정민재 share 18:15–19:30.
- **Thursday lunch (11:00–14:30):** the free stretches differ by account. 김하늘 and 정민재 are free 11:00–14:00, 한지우 12:15–14:30, 최유나 and 이도현 11:00–12:30 and 13:45–14:30, and 오세린 11:00–12:00 and 13:00–14:00. 박서진 has only the 15-minute break 12:15–12:30, which still counts since the shortest meal is 15 minutes, and 13:45–14:30.

### The recruiting Quests

The PM confirmed the eight Quests and their Leaders. The capacities and the short recruiting posts in Korean are this spec's choice.

| # | Title | Board · Join Policy | When · where | Leader | Capacity |
|---|---|---|---|---|---|
| 1 | 중도에서 같이 과제해요 | 취미 · Open | Wed 11-04 15:30–17:30 · 중앙도서관 (62) | 오세린 | 6 |
| 2 | 학관에서 저녁 같이 먹어요 | 식사 · Open | Wed 11-04 18:00–19:00 · 학생회관 (63) | 이도현 | 6 |
| 3 | 302동 식당 저녁 | 식사 · Approval | Wed 11-04 17:30–18:30 · 제2공학관 (302) | 최유나 | 4 |
| 4 | 자하연에서 점심 | 식사 · Open | Thu 11-05 12:00–13:00 · 자하연식당 (109) | 오세린 | 4 |
| 5 | 마케팅 공모전 팀원 구해요 | 커리어 · Approval | Thu 11-05 19:00–21:00 · SK경영관 (58) | 정민재 | 5 |
| 6 | 밴드 공연 같이 가요 | 공연·전시 · Open | the demo Global Event `band-show` | 이도현 | 6 |
| 7 | 토요일 아침 러닝 | 취미 · Open | Sat 11-07 08:00–09:00 · 체육관 (71) | 박서진 | 8 |
| 8 | 면접 스터디 | 커리어 · Open | Fri 11-06 16:00–18:00 · 인문사회계멀티미디어강의동 (83) | 박서진 | 6 |

- **Holders:** each Quest is held by its Leader alone, with one Sub Quest at the time and Place above.
- **#6:** it goes to the demo Global Event `band-show` through its attending Sub Quest, whose time and place follow the event.
- **Recruiting at the evaluation:** all eight recruit at Wed 15:30. #1 has started and recruits until 17:30.
- **The P05 and P04 scenarios:** #1 is the 공강 answer during the evaluation. #2 and #4 are the existing Quests that a request to recruit dinner at 학생회관 or lunch at 자하연 finds first. #6 is the one that a 파티 for the band show finds.

### The HE seed

- **The command:** `he-seed` is a main-server command beside the demo seed. It is run once after the deploy, inside the main-server container.
- **What it needs:** the campus Places and the demo data, because of #6. It stops with a clear message when either is missing.
- **Creating, never overwriting:** it creates only what is missing, found by stable ids of its own. It never overwrites anything. A second run changes nothing, and an account an evaluator onboarded keeps its answers.
- **Fixed dates:** every time is a fixed date of the week of 2026-11-04 in Korean time, not counted from the run.
- **One table:** the data is one table that the stand-in also reads for the keys and Google names. There is no schema change.

### Deploying to swpp-a

- **Tracked branch:** bootstrap clones the HE branch, and the deploy run tracks it in place of `development`. The gate on the required checks stays. `PUBLIC_URL` is server A's address. The deploy scripts' tests change with them.
- **Environment:** the PM's keys are copied from swpp-b's environment file by hand without being printed: the OpenRouter key, the Kakao REST key, the two Google client IDs and the initial Administrator emails.
  - `HE_ACCOUNTS` is on.
  - `DEMO_ACCOUNT_EMAILS` is empty.
  - `COMPOSE_PROFILES` stays `demo`, and the demo refresh timer stays.
  - `EXTRA_SNU_COLLECTION` stays off.
- **First deploy:** right after it, the Collections are run once by hand inside the worker container: `coop_menus`, `dormitory_menus`, `veterinary_menus`, `shuttle_stops` and `snu_events`. Then `he-seed` runs. `shuttle_vehicles` follows its own schedule.
- **Teardown:** on the PM's word after the evaluation, the stack stops, and the environment file with the keys and the database volume are removed.

### App changes on the HE branch

- **AI 매칭:** a press that would open Matching shows the shared 준비 중이에요 toast that 오늘의 발자국 shows, and opens nothing. The buttons stay visible. This covers:
  - the event card's AI 매칭 and 매칭 중;
  - the events bar's request-list icon;
  - the chat event card's AI 매칭.
- **Update check:** the check at start is off. The app requests no version file and shows no dialog.
- **Everything else:** nothing else is hidden. 관정도서관, 올리기, 오늘의 발자국, Invite Links and photo OCR stay as they are.

### The HE APK

- **Build settings:** it is built from the HE branch with the following, and with the Dev APK guide's steps and the shared debug keystore:
  - the HE server's address for both server URLs;
  - `INVITE_LINK_HOST` empty;
  - `UPDATE_CHANNEL=he`, a channel nobody publishes to.
- **Native files:** the channel is only a build environment value. The app's native files (app.json, the app config's settings, the config plugins) are not touched.
- **Replacing installs:** it has the same package name, so it replaces any other SNU Now install on a phone.
- **Delivery:** it is delivered as an APK and a ZIP for eTL. The PM uploads the ZIP.

## Testing Decisions

- **What a good test is.** It drives the feature from outside and checks what a User or a client sees: an HTTP request and its reply, a press and what the screen shows, a command and what the server then answers. It does not check internal calls.
- **Server: the existing seam, the started main server over a test database.**
  - **HE sign-in** (prior art: the `auth` and `sign-out` integration tests with the test-key Google check).
    - With `HE_ACCOUNTS` on, a key signs in as the seeded User with the same id. Onboarding is still to do, and the suggestion is the persona's name and department.
    - An unknown key is refused.
    - With the setting off, every key is refused.
    - A test-key Google token signs in with the setting on and off.
  - **HE seed** (prior art: the `demo-seed`, `free-time-judgement` and `recruiting-quests` integration tests).
    - The seed runs over the campus Places and the demo data with the clock fixed at 2026-11-04 15:30 KST.
    - Each account signs in with its key and finishes Onboarding through the API, as an evaluator would, because the API refuses an account before Onboarding. Through the API, the test then checks the friend list, the Timetable's Classes and the eight recruiting Quests, with their Leaders, capacities and recruiting state.
    - Through the Free Time module the Assistant uses, it checks the effects listed under The Timetables.
    - A second run changes nothing, and an onboarded account's answers survive it.
    - A missing demo Global Event stops the seed with its message.
- **App: the existing seam, the app's router over the fake server** (prior art: the `sign-in`, `consent`, `events-matching`, `chat-event-cards` and `update-check` integration tests).
  - **Account list:** either Google button opens it, and it shows the seven rows with their roles. A pick sends the key to the sign-in endpoint and leads to consent and Onboarding with the suggestion. Closing it stays on the sign-in screen.
  - **Signing out:** after sign-out, the next sign-in shows consent and the location explanation again.
  - **AI 매칭:** each press point shows the toast, opens no screen and sends no Matching request.
  - **Update check:** starting the app requests no version file and shows no dialog.
  - **Existing tests:** the Matching and update tests that expect today's behaviour change to the HE behaviour.
- **Deploy scripts: their existing bats tests**, which now expect the HE branch for the clone and the tracked ref.
- **Manual end to end: the HE APK on the emulator against swpp-a from the campus network.**
  - Sign in, then consent, Onboarding and the map.
  - A Friend Request between two HE accounts, with the other side played through the API with its key.
  - Joining an Open Quest.
  - An Assistant answer about dinner with Friends.
  - A socket connection kept over five minutes, since the ingress cuts requests over 120 seconds.
  - Menus, events and the shuttle present.
- **Levels and CI:** test levels and file names follow ADR 0007. CI must be green on the HE branch, since the deploy gate reads its required checks.

## Out of Scope

- **The PM's operations:** the eTL upload, installing the APK on the course's phones, connecting them to the campus Wi-Fi and checking access, and running the evaluation itself (rounds, laptops, hosts).
- **Outages:** a fallback such as a Mock APK or another server.
- **Self-evaluation:** a heuristic evaluation by the team before the HE, and fixing what the HE finds, which is Iteration 4's.
- **P07:** its features, and any stand-in for them.
- **Demo data:** any change to Demo Data or the demo Users. There is no automatic accepting, no Timetables for them and no HE account among the Demo Accounts.
- **Glossary and ADRs:** changes to GLOSSARY.md or the ADRs.
- **Other features:** hiding any feature other than AI 매칭, and the admin site, which cannot sign in on an http host.
- **Merging and other servers:** merging the HE branch into 3.0/Main, and any change to development, 3.0/Main, swpp-b or Production.

## Further Notes

- **Deadlines:** the APK ZIP is due on eTL by 2026-11-03 23:59, and the HE is on 2026-11-04 from 15:30. App changes must be in the APK before it is built. Server changes, the seed among them, can continue until the HE.
- **The demo data at the HE:** the demo seed counts its times from the demo refresh at 04:00. At the HE, 4 of its 6 Global Events and 4 of its 8 recruiting Quests remain. Three of those Quests are Approval Quests, whose demo Leaders never answer.
- **#6 before the HE:** `band-show` moves with each demo refresh. #6 sits on Thursday 19:00 only after the refresh of 11-04.
- **Approval Quests and rounds:** an Approval Quest led by a round account is accepted only while that account is in use, so each round has one: #3 for round 1 and #5 for round 2.
- **Rehearsal:** a rehearsal with a spare account must not send Friend Requests or join requests to the round accounts, which would change their starting state.
- **Location permission:** sign-out does not reset Android's location permission. Turning it off in the phone's settings brings the prompt back for round 2. That is part of the PM's operations.
- **The network:** swpp-a is reliable only from the campus network. The phones and the manual check need it. Anyone on that network who knows a key can sign in as an HE account. The data is fake, and the Assistant's daily limit per User applies.
- **The OpenRouter key:** the HE server uses the same key as the Dev Server.
- **관정도서관:** booking uses the evaluator's own SNU login and makes real bookings. A Room Request needs each companion's real Student Number.
- **Where this came from:** the design was settled with the PM in a grilling on 2026-11-02 and 2026-11-03, session `77938261-34e0-441c-ab77-2752bebcdd25`. Its agent time and tokens belong in P15's usage report.
