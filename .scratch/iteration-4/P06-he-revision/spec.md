# P06: HE revision and feature clean-up

Status: ready-for-agent

Schedule row: Iteration 4, "Fix the HE issues and clean up the features outside the main UI (P06)" in the Team Meeting Log of 2026-11-09. The Testing Documentation §6.3 calls the same work P7, P8 and P9; P06 replaces those numbers. Five tickets are prepared before the first acceptance test on 2026-11-16, three after the second on 2026-11-18. A ticket is done when its pull request into `4.0/Main` is open and ready for review. Whether a ticket merges and ships before an acceptance test is decided by the team later, since `agentic-map-work-split.md` §6 keeps new work unreleased until 11/18; P06 only makes each one ready. If ticket 03 does not ship before 11/16, UAT-2 criteria 4 and 6 run on today's app on that day, where B is told only with the room open.

References:
- `references/he-improvements.md`: the HE findings, the code they point at, and the decisions of 2026-11-14 ("결정 기록", "확인된 사실", sections 5-3-1 and 5-3-2).
- Wiki Testing Documentation §6.2 (issues H1 to H12 and their planned fixes) and §6.3, at commit `3620902`.
- `.scratch/iteration-4/agentic-map-work-split.md` on `4.0/Main`: §4 (files only one person changes, the order of schema changes), §6 (nothing new released before 11/18), §8 (Iteration 5, package D: the notification table).
- `.scratch/iteration-4/agentic-map-design.md` on `4.0/Main`: "Watching interests" and "Many results on the map" (what the design puts on the everyday map, and how it groups marks), "First run", and "Screen words" (파티 켜기, 켜짐, 끄기 replaces 활성화).
- `he-revision-log.md` in this folder: one row per HE issue, kept up to date by every ticket.
- `CLAUDE.md`, "The app's native files"; ADR 0007 (test levels); ADR 0010 (travel time from the walking table).

## Problem Statement

Four evaluators used the app in the heuristic evaluation and found that a User loses track of what they did and of who sees them:

- A User who asks to join an Approval Quest cannot find the request again. It shows only on that Quest's post, and the withdraw button there was not found at all (H1, H2, both severity 3).
- A User whose 파티 was ended, or who was removed from it, is told so only if that 파티's room is open on screen. UAT-2 criteria 4 and 6 require that they are told, and the criteria cannot change.
- The map draws every Global Event that has not ended, weeks ahead and month-long exhibitions included, so the pins that matter today drown among the rest. Nothing says which events are new, and a User cannot keep an event they care about on the map.
- The production app still shows sample data: every visible Friend is "공강" even in class, every Friend is "도보 4분" away, and 오늘의 발자국 shows sample faces. The AI matching entry points remain although matching left the main UI on 11-10, and they promise "결과는 알림으로 와요", which never happens.
- The Master Switch and the per-Friend switches overlap, and nothing says which wins. The 위치 공유 card counts every Friend, not those who actually receive the User's location, and says nothing of the 파티 that is on (H3, H10).
- After signing up, a User cannot tell what the app does or where things are (H7, H8). After an action, they cannot tell where its result appears (H11).
- A User cannot send a Friend Request to someone in the same 파티 (H4). A member the Leader removed from an Open Quest can join again at once, so removing does nothing (Requirements UI-08).

## Solution

**Before the acceptance tests**

- **Sent requests (H1, H2).** The 파티 tab gets a "보낸 신청" section beside the invitations received. Each row shows the Quest's post title and opens that post when tapped. Each row has "신청 취소", which asks for confirmation, withdraws, and says "신청을 취소했어요". If the Leader answered at the same moment and the server refuses, the app reads the User's Quests again and says "이미 파티에 들어갔어요" when the User now holds it, or "파티장이 신청을 받지 않았어요" when not.
- **Told when a 파티 is gone (UAT-2).** Wherever the User is in the signed-in app, if a 파티 they held disappears from their list, a toast says "○○ 파티에서 빠졌어요". It is not shown when the User left or ended it themselves, and it is shown once even if the room is open. It does not tell removal from ending apart.
- **Events on the map.** The map keeps only three kinds of Global Event pin:
  - a **New Event**, published less than 24 hours ago and not yet checked by this User, drawn with an exclamation mark;
  - a **Favorite Event** (☆), drawn with a star until the event ends;
  - an event **held today**, drawn as today's plain pin. An event of several days counts only on its first and last day.
  A User checks a New Event by closing its card on the map (a single pin's card, or its row opened from a grouped pin's list) or by starring it anywhere. Seeing it in the 행사 tab or in chat does not check it. A checked event leaves the map when its card closes, unless it is a Favorite Event or held today. The ☆ toggle sits at the top right of each event card in the 행사 tab and in chat, and left of the close button on a single event's card on the map. Grouped and merged pins show one look, in the order exclamation mark, star, plain. Pins that overlap at the current zoom merge into one, as study pins do.
- **Real Friend data.** 오늘의 발자국 leaves the main screen. A visible Friend's line shows where they are (the nearest Place) and how old the position is, no longer "공강". A Friend who is not visible is "위치 꺼짐". "도보 N분" is the walking time between the Places nearest to the User and to the Friend, "근처" when that is the same Place, and nothing when the User's own position is unknown.
- **AI matching leaves the app.** The "✦ AI 매칭" entry on event cards, the matching screen, the watcher that toasts a match, and the "결과는 알림으로 와요" toast go away. The match server stays.

**After the acceptance tests**

- **Location sharing shows its rule (H3, H10).** The Master Switch is renamed "위치 공유". While it is off, every Friend and 파티 switch is shown off and disabled under one line, "전체 위치 공유가 꺼져 있어요 · 켜기". Each keeps its stored value, so turning the Master Switch back on restores them. Under the Master Switch the card says "친구 N명이 내 위치를 봐요", counting only Friends whose own switch is on, and, while a 파티 is on, "○○ 파티 M명이 내 위치를 봐요", counting its other members. The map does not change.
- **Learning the app (H7, H8, H11).** After Onboarding, a four-step tour points at the bottom tabs (지도, 파티, 행사, 내 정보) one at a time, with "건너뛰기" and "다시 보지 않기". 내 정보 can replay it. The 파티 tab, the 행사 tab and the sent-requests section, when empty, say what they are for and offer one first action. A toast can carry a link, and three actions use it: asking to join ("보낸 신청 보기"), joining or making a 파티 ("내 파티 보기"), and sending a Friend Request ("친구 목록 보기").
- **Members of the same 파티 (H4, UI-08).** Each member row has "친구 추가". It is hidden for a Friend, reads "요청됨" once sent and "수락" when the other member has sent one. The server accepts it only between Holders of the same Quest. A member the Leader removed from a Quest must be approved to come back, even into an Open Quest. That User sees "참여 신청" with one caption, "내보내진 파티라 파티장 승인이 필요해요", in place of the join button and on the sent-request row. The Leader sees "전에 내보낸 멤버" on the request. Acceptance clears the removal.

## User Stories

Sent requests
1. As a User who asked to join an Approval Quest, I want a list of my sent requests in the 파티 tab, so that I can see which 파티 I am waiting on.
2. As that User, I want each row to show the post's title, so that I can tell my requests apart.
3. As that User, I want to tap a row and land on the post, so that I can read it again or see its state.
4. As that User, I want "신청 취소" on each row, so that I can withdraw without hunting for the post.
5. As that User, I want to confirm before withdrawing, so that a slip of the finger does not cancel my request.
6. As that User, I want "신청을 취소했어요" after withdrawing, so that I know it worked.
7. As that User, I want a plain reason when the withdrawal fails because the Leader just answered, so that I know whether I am in.
8. As a User who asked through a 파티 card in chat, I want that request in the same list, so that it does not matter where I asked.
9. As a User with no sent requests, I want the empty section to say what it is for, so that I know where requests will appear.

Told when a 파티 is gone
10. As a Holder removed by the Leader, I want a toast on whatever screen I am on, so that I know I am out of the 파티.
11. As a Holder whose 파티 the Leader ended, I want the same toast, so that I do not wait for a 파티 that no longer exists.
12. As a Holder with the room open, I want the toast once, not twice, so that it reads as one event.
13. As a User who left or ended a 파티 myself, I want no toast, so that I am not told what I just did.
14. As an acceptance tester running UAT-2, I want B to be told on any screen, so that criteria 4 and 6 pass once this ships.

Events on the map
15. As a User, I want the map to show only new, favorite and today's events, so that it is not covered with pins for weeks ahead.
16. As a User, I want events published in the last 24 hours marked with an exclamation mark, so that I notice what is new.
17. As a User, I want a new event's mark to go once I have checked it, so that the map does not stay noisy.
18. As a User, I want a checked event to leave the map only when I close its card, so that the pin does not vanish while I read.
19. As a User reading an event's card on the map, I want to star it before closing, so that it stays on the map.
20. As a User, I want opening a grouped pin's card not to check every event in it, so that I do not lose events I never looked at.
21. As a User, I want a checked event to drop out of its grouped pin and the count to go down, so that the group shows what is left.
22. As a User, I want a group left with one event to become that event's own pin, so that it reads like any other pin.
23. As a User, I want a group with a new event to carry the exclamation mark, so that new events at a busy Place are not hidden.
24. As a User, I want pins that overlap at the campus zoom to merge, so that I can still read the map, and to split when I zoom in.
25. As a User, I want a merged or grouped pin to show the strongest look among its events, exclamation mark first, then star, then plain.
26. As a User, I want events held today to stay on the map as plain pins, so that an event whose mark I missed comes back on its day.
27. As a User, I want a festival of several days to show on its first and last day only, so that it does not sit on the map all week.
28. As a User, I want to star an event in the 행사 tab, in chat and on the map, so that I can keep it wherever I see it.
29. As a User, I want a starred event to show as a star pin until it ends, so that I can find it on the map.
30. As a User, I want the star to change at once and to change back with a toast if saving fails, so that I can trust what it shows.
31. As a User, I want starring an event to count as checking it, so that a starred event does not also carry an exclamation mark.
32. As a User, I want seeing an event in the 행사 tab or in chat not to check it, so that the map still points me to it.
33. As a User, I want a checked event to stay in the 행사 tab, so that I can always find it there.
34. As a User on a new install, I want only the last day's events marked new, so that I am not flooded with marks.
35. As a User, I want events an Administrator entered by hand marked new too, so that "new" means new to me, not how it was collected.
36. As a User whose event was cancelled, I want it gone from the map at once, as today.
37. As a User going to an event with a 파티, I want it shown as my 파티's pin, as today.
38. As a User whose favorites must survive a reinstall, I want them kept on the server, so that they are not lost with the phone.

Real Friend data
39. As a User, I want 오늘의 발자국 gone from the main screen, so that I do not see sample faces as if they were real.
40. As a User, I want a visible Friend shown with where they are and how old the position is, so that I do not read a false "공강".
41. As a User, I want a Friend I cannot see shown as "위치 꺼짐", as today.
42. As a User, I want "도보 N분" worked out from the walking table between the Places nearest to me and to my Friend, so that it is true.
43. As a User standing at the same Place as my Friend, I want "근처", so that it does not say "도보 0분".
44. As a User whose own position is unknown, I want no walking time, so that the app does not guess.
45. As a teammate reviewing the change, I want the pull request and the code to say why only the server's facts are shown, so that I can see it leaves 수업 중 and 이동 중 to FriendView.

AI matching leaves the app
46. As a User, I want no "✦ AI 매칭" entry on event cards, so that I do not use a feature the team has dropped.
47. As a User, I want no "결과는 알림으로 와요" promise, so that I am not waiting for a notification that never comes.

Location sharing shows its rule
48. As a User, I want the Master Switch called "위치 공유", so that I can tell it covers 파티 too, not only Friends.
49. As a User with the Master Switch off, I want the Friend and 파티 switches shown off and disabled, so that I can see that nobody receives my location.
50. As that User, I want one line saying why with a "켜기" link, so that I know how to turn sharing back on.
51. As a User turning the Master Switch back on, I want each Friend and 파티 switch as I left it, so that I do not set them one by one again.
52. As a User, I want to see how many Friends receive my location, so that I know my exposure at a glance.
53. As a User whose 파티 is on, I want to see how many of its members receive my location, so that I see the 파티 side too.

Learning the app
54. As a new User finishing Onboarding, I want a short tour of the bottom tabs, so that I know what each part of the app is for.
55. As that User, I want to skip the tour or never see it again, so that it does not get in my way.
56. As a User, I want to replay the tour from 내 정보, so that I can look again later.
57. As a User opening an empty 파티 tab or 행사 tab, I want to be told what it holds and given one first action, so that an empty screen is not a dead end.
58. As a User who just asked to join, I want the toast to link to my sent requests, so that I see where the request went.
59. As a User who just joined or made a 파티, I want the toast to link to my 파티, so that I find it at once.
60. As a User who just sent a Friend Request, I want the toast to link to my Friends list, so that I know where it will show.

Members of the same 파티
61. As a member of a 파티, I want "친구 추가" on another member's row, so that I can befriend someone I met there.
62. As that member, I want the button hidden for a Friend, "요청됨" once sent, and "수락" when they sent one, so that it always shows the next step.
63. As a User, I want the server to accept such a request only between Holders of the same Quest, so that strangers cannot reach me this way.
64. As a Leader who removed a member, I want them to need my approval to come back, so that removing means something in an Open Quest.
65. As a removed member, I want one caption telling me why an Open Quest asks for approval, so that I am not confused.
66. As a Leader, I want the request marked "전에 내보낸 멤버", so that I decide knowing who it is.
67. As a Leader who accepts that member, I want the removal forgotten, so that a later removal starts fresh.

Recording the work
68. As the person writing the HE revision log, I want one file that says, per HE issue, what was done and in which pull request, so that I can copy it to the Wiki.

## Implementation Decisions

**Tickets.** Eight, each one pull request into `4.0/Main`:

1. Favorite Events end to end: the migration (both columns), the favorite API, the ☆ toggle, the star pin, and the map keeping only Favorite Events and today's events.
2. New Events end to end: recording `publishedAt`, the exclamation pin, checking, and the looks of grouped and merged pins. Built after ticket 1.
3. The global watch for a 파티 that is gone, and removing the AI matching UI.
4. Sent requests and withdraw.
5. 오늘의 발자국 removed, Friend lines and walking times.
6. Location sharing display (after the acceptance tests).
7. Tab tour, empty states, toast links (after the acceptance tests). Built after ticket 4.
8. Friend Requests between members, and approval after removal (after the acceptance tests). Built after ticket 4.

Tickets 1, 3, 4, 5 and 6 do not depend on each other.

**Schema.** Two changes, each in one migration, each placed in the team's order of `schema.prisma` changes (work split §4; C's member late minutes come first):
- Ticket 1: `global_events.published_at` (nullable) and `global_event_favorites (user_id, global_event_id, created_at)`, unique on the pair, deleted with the User or the event.
- Ticket 8: `quest_removals (quest_id, user_id, created_at)`, unique on the pair, deleted with the Quest or the User.

**Global Events API (tickets 1 and 2).** Ticket 1: `GET /global-events` adds `publishedAt` (nullable, still null everywhere) and `favorite` (for the caller) to each event, and `PUT` and `DELETE /global-events/{id}/favorite` set and clear a favorite; both are idempotent, and both refuse an event that is not published. Ticket 2: every write that sets `state = published` records `publishedAt`. There are four: the rules that read a post and a Judgement (both when a session settles), an Administrator's publish of a Draft, and an Administrator's publish from the Same-event queue, which sets the same `administrator` route and is easy to miss. Events published before the change keep null and are never New Events. Editing an event's time does not change `publishedAt`.

**Which event pins stay (tickets 1 and 2).** One pure function in the map's event adapter decides it. Input: the published events, now, the ids this User has checked, and each event's `favorite`. Output: the events that stay, each with a look (`new`, `favorite` or `plain`). An event stays if `publishedAt` is within 24 hours and it is not checked (`new`), if it is a favorite (`favorite`), or if it is held today in Seoul time, for an event of several days only on its first or last day (`plain`). When several apply, the order is `new`, `favorite`, `plain`. Ticket 1 builds the function with `favorite` and `plain`; ticket 2 adds `new` and the checked ids. Starring an event adds it to the checked ids. The checked ids live on the phone, keyed by User, and an id is dropped once its event is more than 24 hours past `publishedAt`. A checked event leaves the map when its card closes, never while it is open. Same-Place grouping keeps its current behaviour and takes the strongest look of its members. The study layer's overlap merge applies to every event pin, with the merged pin taking the strongest look and the total count. The exclamation mark and the star are new marker looks drawn by the JS marker images, so they ship over the air and need no native Release.

**How this sits with the agentic map's design (tickets 1 and 2).** The design decides the same pins another way. Its "Watching interests" puts on the everyday map only the events and recruiting that match a watched interest, with a "!" on a newly posted one, and its "Many results on the map" groups every mark by one rule. Both are built in Iteration 5, by packages D and B (work split §8). Until then the rule above is the one the map follows. The tickets that build them settle how the two fit: whether Favorite Events and events held today stay beside the events that match a watched interest, when the "!" goes, the design's grouping in place of the zoom merge, and where the ☆ sits once a tap on a mark opens the answer.

**The ☆ toggle (ticket 1).** On the 행사 tab's and chat's event item, at the top right, with the source mark moved to its left. On the map, only on a single event's card, left of the close button; the card's data carries the event id and `favorite`. A grouped pin's list rows show ★ for a Favorite Event without a toggle. The hit area is 44pt, like the close button. The change is optimistic, rolled back with a toast on failure. The icon set gains a `star` shape that can be filled.

**Global watch (ticket 3).** A watcher mounted in the signed-in layout, the way the matching watcher was, takes over the logic the room screen uses to close when its Quest is gone. When `quests-changed` brings a list in which a Quest the User held is missing, it toasts "○○ 파티에서 빠졌어요" on any screen. The User's own leave and end actions mark that Quest so no toast follows. The room screen still closes, without a second toast.

**AI matching removed (ticket 3).** The event card's "✦ AI 매칭" entry, the matching screen and its route, the match watcher, and the "결과는 알림으로 와요" toast are deleted, with tests that only covered them. The main server's matching module and the match server stay.

**Sent requests (ticket 4).** No server change. The list reads the existing `GET /quest-join-requests`. Rows show the post's title and open the post. Withdraw uses the existing `POST /quest-join-requests/{id}/withdraw`. Accepting and declining both delete the request, so a withdraw after either fails with the same not-found; the server cannot say which. On that refusal the app refetches the User's Quests: holding the Quest means accepted ("이미 파티에 들어갔어요"), not holding it means declined ("파티장이 신청을 받지 않았어요"). The row leaves the list either way. Requests made through chat cards use the same query, so they appear without extra work.

**Friend lines (ticket 5).** In production the Friends' statuses still come from the mock, and a visible Friend becomes `free` ("공강"). The app now shows only what the main server knows: for a visible Friend the nearest Place and the position's age, for one not visible "위치 꺼짐". "수업 중" and "이동 중" are left to C's FriendView and its three Friend levels, which redefine Friend status in this iteration. The pull request and a comment at the line say so. C is told before the change, since C owns the Friends adapter.

**Walking times (ticket 5).** The walking table lives only in the main server (ADR 0010). `GET /positions` adds to each Friend's position `nearPlace` (the nearest Place's name) and `walkMinutes` (from the Place nearest the caller's last position to the Place nearest the Friend's, from the walking table), both null when unknown. The app shows "도보 N분", "근처" when both Places are the same, and nothing when null. This touches location sharing, which C also works on; C is told.

**오늘의 발자국 removed (ticket 5).** Its feature folder, its mock data, its types and client operations, and its design tokens go.

**Location sharing display (ticket 6).** No server change. The card's counts are computed from the Friends list (each Friend's own switch) and the 파티 that is on (its other members). The Master Switch's label becomes "위치 공유". While it is off, the Friend and 파티 switches render off and disabled; their stored values are untouched. Words follow the design's Screen words ("파티 켜기, 켜짐, 끄기").

**Tour, empty states and toast links (ticket 7).** The tour points only at the four tabs of the bottom tab bar, never at the map, the input bar or cards, which package B is rebuilding. The four tabs themselves stay in the design. The tab bar is still B's file (work split §4), so B is told before the work starts and the tour reaches the tabs from outside the tab bar where it can. Whether it has been seen is kept on the phone. It runs after Onboarding, and after D's First run once that exists. The toast gains an optional action (a label and what it does); three calls use it.

**Members and removals (ticket 8).** Friend Requests gain a way to name the receiver by user id, accepted only when both are Holders of the same Quest; the existing refusals (already Friends, already sent) still apply. Removing a member writes a `quest_removals` row in the same transaction; leaving does not. Joining an Open Quest with a removal refuses with `QUEST_REMOVED_ASK`. Asking to join accepts an Open Quest when a removal exists. The Leader's view of requests includes them and marks each with `removedBefore`. Accepting deletes the removal. The app shows "참여 신청" and the caption to the removed User, and "전에 내보낸 멤버" to the Leader. If the Leader's list of requests reads only Approval Quests today, it is widened.

**Files other people own** (work split §4). The owner is told before the ticket starts. Conflicts are resolved when they happen (decided 2026-11-14).
- Tickets 1 and 2: B's map card, map adapter, and marker looks and images.
- Ticket 5: B's main-screen layout, where 오늘의 발자국 is laid out with the button row, and the bottom controls that draw it; C's Friends adapter and location-sharing service (`GET /positions`).
- Ticket 7: B's tab bar.
- Ticket 8: C's Friends service (the Friend Request by user id).

**Wiki and glossary.** A plan the Testing Documentation has already submitted (§6.2's "Fix (Iteration 4)" column and §6.3) is not rewritten in place: the original stays, and a revision note right below it says what changed and why. Each ticket edits what it changes:
- Ticket 2: Requirements US-EVENT-01, UI-02, UI-03, UI-05, and a new story for Favorite Events; `GLOSSARY.md` gains **New Event** and **Favorite Event**. Testing §6.3 keeps its sentence about P7, P8, and P9 as submitted, and a revision note right below it says that the work is P06, with P8's issues (H5 and H12) deferred.
- Ticket 3: Requirements entries on AI matching in the main UI.
- Ticket 6: US-LOC-01 and UI-09 for the Master Switch's name. UAT-3's wording is not changed, as the criteria were fixed; the rename is noted.
- Ticket 8: US-QUEST-03 and UI-08 for approval after removal.

**Revision log.** `he-revision-log.md` in this folder has a row per HE issue (H1 to H12) and a second table for P06's other work. Every ticket's last step is to fill in its rows: what changed, the pull request, and the state. If the work differs from the plan, the row says what was done.

## Testing Decisions

A good test drives what a User or a client sees: an HTTP response, a rendered screen, a function's output for given inputs. It does not reach into how the result was built. Levels and file names follow ADR 0007.

- **Main server, integration (started server over HTTP, database container).**
  - Ticket 1: `favorite` per caller; PUT and DELETE are idempotent and refuse an unpublished event. Prior art: `global-events`.
  - Ticket 2: each of the four writes that publish sets `publishedAt`, the Same-event queue's publish included; an older event has null; editing time keeps it. Prior art: `published-global-events`.
  - Ticket 5: `nearPlace` and `walkMinutes` on `GET /positions`, null without the caller's position. Prior art: `friend-sharing`.
  - Ticket 8: removal then join refuses with `QUEST_REMOVED_ASK`; ask on an Open Quest succeeds only with a removal; the Leader sees `removedBefore`; acceptance clears it; leaving writes no removal; a Friend Request by user id only between Holders of the same Quest. Prior art: `party-join-requests`, `party-join-request-answers`, `friend-requests`.
- **App, unit (pure adapter functions).**
  - Ticket 1: the pin-selection function for favorite, today and the several-day rule, and Seoul midnight. Ticket 2: the 24-hour edge, checked and unchecked, the look order, grouped and merged looks. Prior art: `features/map-adapter-places`, the study merge.
  - Ticket 5: the Friend line without "공강", "근처", empty walking time. Prior art: `features/friends-adapter`.
  - Ticket 6: the two counts. 
- **App, integration (router and screens over a fake server).**
  - Ticket 1: starring is optimistic and rolls back with a toast. Ticket 2: closing a New Event's card removes its pin; a starred event stays. Prior art: `map-sources`, `study-layer`.
  - Ticket 3: a 파티 that disappears while another tab is shown toasts once; own leave or end does not; no matching entry remains. Prior art: `party-mine-activation`, `events-matching` (removed with the feature).
  - Ticket 4: rows, opening the post, the withdraw flow and its refusal. Prior art: `party-mine`, `party-invites`.
  - Ticket 7: the tour, its skip and replay; empty states; toast links. Prior art: `design-system/toast`.
  - Ticket 8: the member row's button states; the removed User's caption; the Leader's mark.
- No new Maestro or device end-to-end tests. The acceptance tests exercise the same paths on phones.

## Out of Scope

- Everything in `he-improvements.md` marked 보류: the Assistant's replies, one-tap make and 다시 만들기 (H5, H6), English evaluation (H12), app-help answers, and all of section 5-4; the cold-start invite link (5-2-1), party chat, photos and tags on the server (5-2-3), logs and security (5-2-5), NFR measurement (5-2-6), test clean-up (5-2-7), hidden 파티 across phones (5-2-8), and the terms' text (5-3-3).
- The notification history (section 4, A1 to A12), including an 알림 row when the Leader answers a request and a notice when a Favorite Event's time changes. Package D builds the notification table in Iteration 5.
- A badge on the 행사 tab, a "NEW" label in its list, a "새 행사 N개" chip on the map, and a 48-hour rule for new installs.
- Filtering events by interests.
- A tour of the main screen's inside (the map, the input bar, cards).
- A "공유 중" chip on the map.
- Computing "수업 중" or "이동 중" for Friends.
- Removing the match server or the unused active-파티 routes and `meetups` table.
- Shorter text across screens (H9); no change is planned beyond what the tour and empty states bring.
- The middle + button, "빈 시간 말하기", the event card's announcer caption, other parties' photos and tags, and the "관심사" parts of finding, which stay as they are.

## Further Notes

- None of the tickets changes a native file, so all ship over the air. Marker looks are JS marker images, checked for tickets 1 and 2.
- New Event and Favorite Event are User-relative: the same Global Event can be new to one User and checked by another.
- How many events a day are published in production was not measured; the merge handles a busy day without a cap.
