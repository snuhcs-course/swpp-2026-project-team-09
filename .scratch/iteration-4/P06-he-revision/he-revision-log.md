# HE revision log (P06)

What was done for each issue of the heuristic evaluation (Wiki Testing Documentation §6.2, H1 to H12), and in which pull request. Each P06 ticket fills in its own rows when its pull request opens; a row whose work differs from the plan says what was done. The tables are written to go into the Wiki's Testing Documentation §6 as a new subsection. §6.2's table and §6.3 stay there as submitted, and where a row differs from §6.2's "Fix (Iteration 4)" column it also gives the reason.

Spec: `spec.md`. Tickets: `issues/`.

## Issues from the evaluation

| ID | Sev. | Issue | Fix | Ticket | PR | State |
|---|---|---|---|---|---|---|
| H1 | 3 | After asking to join an Approval Quest, the User cannot see which 파티 they asked to join. | A 보낸 신청 section in the 파티 tab. Each row shows the post's title and opens the post. The 알림 row when the Leader answers moves to package D's notification table (Iteration 5). | 04 | #264 | PR open |
| H2 | 3 | The evaluator found no way to withdraw a join request. | Withdrawing already existed on the post; it is now on each 보낸 신청 row too, with a confirmation and 신청을 취소했어요. An existing feature made easy to find, not a new one. The post's own 신청 취소 now says 신청을 취소했어요 too, and both say 이미 파티에 들어갔어요 or 파티장이 신청을 받지 않았어요 when the Leader answered first. | 04 | #264 | PR open |
| H3 | 2 | The Master Switch and the per-Friend switches overlap, and it is unclear which wins. | While the Master Switch is off, Friend and 파티 switches show off and disabled under one line with a 켜기 link; stored values are kept. The Master Switch is renamed 위치 공유. Since P02-11 a Friend has three levels in place of a switch, so while it is off each Friend's chosen level stays checked, dimmed and disabled, on 위치 공유; P15 ticket 02 took the levels and the line off 친구. | 06, P15-02 | #285, #351 | PR open |
| H4 | 2 | A User cannot send a Friend Request to another member of the same 파티. | 친구 추가 on member rows (hidden for Friends, 요청됨, 수락), accepted by the server only between Holders of the same Quest. | 08 | #326 | In review |
| H5 | 2 | Using a feature takes a lot of reading; the Assistant ends up needing more taps. | Deferred: the Assistant's replies are being reworked by the agentic map work. Judged again after it. | — | — | Deferred |
| H6 | 2 | Every plan is made from the start. | Deferred with H5: 다시 만들기 and filling a plan from past ones belong to the Assistant's rework. | — | — | Deferred |
| H7 | 2 | After signing up it is hard to tell what the app does. | A four-step tour of the bottom tabs after Onboarding, replayable from 내 정보, and empty states that say what a screen is for. The planned tour of the main screen's inside was dropped: package B is rebuilding that screen, and package D's First run covers the first launch. The tour shows once the First run has no card left to ask; 건너뛰기 closes it until the next start, 다시 보지 않기 for good. The empty 내 파티, 보낸 신청 and 행사 each say what they hold and offer 파티 찾기. | 07 | #348 | PR open |
| H8 | 1 | There are many features, and a new User can get lost. | H7's tour and empty states. | 07 | #348 | PR open |
| H9 | 1 | There is too much to read before using a feature. | No change in P06 beyond H7's empty states. The Assistant's share waits for H5. | — | — | Not planned |
| H10 | 1 | The User cannot see at a glance whom they share their location with. | Differs from the plan. #285 put two counts under the switch on the 위치 공유 card: 위치 공유를 허용한 친구 N명 and, while a 파티 is on, ○○ 파티에서 위치 공유를 허용한 멤버 M명. P15 ticket 01 (#347) removed them, because a count does not tell the User what they need to know. A list shows better whom they share their location with and whom they do not. 친구마다 on the 위치 공유 screen, one tap from the card, lists each Friend with what the two see of each other. | 06, P15-01 | #285, #347 | PR open |
| H11 | 1 | It is hard to tell where a tap or a decision shows up. | Toasts can carry a link: 보낸 신청 보기 after asking to join and 친구 목록 보기 after a Friend Request. 내 파티 보기 was left out: joining or making a 파티 already moves to 내 파티. | 07 | #348 | PR open |
| H12 | – | Does the Assistant work in English or other languages? | Deferred with H5: English questions are added to the evaluation once the Assistant's rework settles. | — | — | Deferred |

## Other P06 work

Not raised by the evaluators; found by comparing the Wiki and the code (`references/he-improvements.md`, section 5).

| Item | Why | Fix | Ticket | PR | State |
|---|---|---|---|---|---|
| A 파티 that is gone (UAT-2 criteria 4, 6) | A removed member, or a member whose 파티 ended, was told only with the room open. | A watcher in the signed-in app toasts ○○ 파티에서 빠졌어요 on any screen, not for the User's own leave or end. | 03 | #260 | PR open |
| AI matching in the main UI | Removed from the main UI on 11-10; its toast promised a notification that never came. | The event card entry, the matching screen, the watcher and the toast are removed. The servers stay. | 03 | #260 | PR open |
| Events on the map | Every unended event was a pin; nothing marked new events; no way to keep one. | Only Favorite Events (star) stay on the everyday map, with a ☆ toggle on event cards kept on the server; the events that match a watched interest, with "!" on a newly posted one, are the agentic map's (#296, #306). Today's events were dropped in review of #261, and a "!" on every event of the last 24 hours in review of #279 (2026-11-16), so that "!" has one meaning. Events' pins that overlap at the campus zoom merge into one with their count. | 01, 02 | #261 (01), #279 (02) | 01 merged; 02 in review |
| Sample data in production | Every visible Friend was 공강 and 도보 4분; 오늘의 발자국 showed sample faces. | 오늘의 발자국 removed with its feature, mock, types, client operation and tokens. `GET /positions` adds `nearPlace` and `walkMinutes` (walking table, from the Place nearest the User). The production app serves no Friend statuses: a visible Friend's line is the nearest Place (위치 켜짐 while unknown) with the age of an old position, grouped as 위치 켜짐 in the friend panel; others are 위치 꺼짐. The walk is 도보 N분, 근처, or nothing. 수업 중 and 이동 중 are left to C's FriendView. | 05 | #280 | PR open |
| Removed members joining again (UI-08) | Removing a member from an Open Quest did nothing. | A removed member needs the Leader's approval to come back, with a caption for them and a mark for the Leader. | 08 | #326 | In review |
