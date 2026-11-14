# HE revision log (P06)

What was done for each issue of the heuristic evaluation (Wiki Testing Documentation §6.2, H1 to H12), and in which pull request. Each P06 ticket fills in its own rows when its pull request opens; a row whose work differs from the plan says what was done. The tables are written to go into the Wiki's Testing Documentation §6 as a new subsection. §6.2's table and §6.3 stay there as submitted, and where a row differs from §6.2's "Fix (Iteration 4)" column it also gives the reason.

Spec: `spec.md`. Tickets: `issues/`.

## Issues from the evaluation

| ID | Sev. | Issue | Fix | Ticket | PR | State |
|---|---|---|---|---|---|---|
| H1 | 3 | After asking to join an Approval Quest, the User cannot see which 파티 they asked to join. | A 보낸 신청 section in the 파티 tab. Each row shows the post's title and opens the post. The 알림 row when the Leader answers moves to package D's notification table (Iteration 5). | 04 | | Planned |
| H2 | 3 | The evaluator found no way to withdraw a join request. | Withdrawing already existed on the post; it is now on each 보낸 신청 row too, with a confirmation and 신청을 취소했어요. An existing feature made easy to find, not a new one. | 04 | | Planned |
| H3 | 2 | The Master Switch and the per-Friend switches overlap, and it is unclear which wins. | While the Master Switch is off, Friend and 파티 switches show off and disabled under one line with a 켜기 link; stored values are kept. The Master Switch is renamed 위치 공유. | 06 | | Planned |
| H4 | 2 | A User cannot send a Friend Request to another member of the same 파티. | 친구 추가 on member rows (hidden for Friends, 요청됨, 수락), accepted by the server only between Holders of the same Quest. | 08 | | Planned |
| H5 | 2 | Using a feature takes a lot of reading; the Assistant ends up needing more taps. | Deferred: the Assistant's replies are being reworked by the agentic map work. Judged again after it. | — | — | Deferred |
| H6 | 2 | Every plan is made from the start. | Deferred with H5: 다시 만들기 and filling a plan from past ones belong to the Assistant's rework. | — | — | Deferred |
| H7 | 2 | After signing up it is hard to tell what the app does. | A four-step tour of the bottom tabs after Onboarding, replayable from 내 정보, and empty states that say what a screen is for. The planned tour of the main screen's inside was dropped: package B is rebuilding that screen, and package D's First run covers the first launch. | 07 | | Planned |
| H8 | 1 | There are many features, and a new User can get lost. | H7's tour and empty states. | 07 | | Planned |
| H9 | 1 | There is too much to read before using a feature. | No change in P06 beyond H7's empty states. The Assistant's share waits for H5. | — | — | Not planned |
| H10 | 1 | The User cannot see at a glance whom they share their location with. | The 위치 공유 card says how many Friends the User allows to see their location (위치 공유를 허용한 친구 N명) and, while a 파티 is on, how many of its members (○○ 파티에서 위치 공유를 허용한 멤버 M명). It counts the User's own end only; who sees the User now, which also needs the other end, is not shown. | 06 | | Planned |
| H11 | 1 | It is hard to tell where a tap or a decision shows up. | Toasts can carry a link: 보낸 신청 보기 after asking to join, 내 파티 보기 after joining or making a 파티, 친구 목록 보기 after a Friend Request. | 07 | | Planned |
| H12 | – | Does the Assistant work in English or other languages? | Deferred with H5: English questions are added to the evaluation once the Assistant's rework settles. | — | — | Deferred |

## Other P06 work

Not raised by the evaluators; found by comparing the Wiki and the code (`references/he-improvements.md`, section 5).

| Item | Why | Fix | Ticket | PR | State |
|---|---|---|---|---|---|
| A 파티 that is gone (UAT-2 criteria 4, 6) | A removed member, or a member whose 파티 ended, was told only with the room open. | A watcher in the signed-in app toasts ○○ 파티에서 빠졌어요 on any screen, not for the User's own leave or end. | 03 | | Planned |
| AI matching in the main UI | Removed from the main UI on 11-10; its toast promised a notification that never came. | The event card entry, the matching screen, the watcher and the toast are removed. The servers stay. | 03 | | Planned |
| Events on the map | Every unended event was a pin; nothing marked new events; no way to keep one. | Only New Events (exclamation mark, 24 hours, until checked), Favorite Events (star) and today's events stay. A ☆ toggle on event cards, kept on the server. | 01, 02 | | Planned |
| Sample data in production | Every visible Friend was 공강 and 도보 4분; 오늘의 발자국 showed sample faces. | 오늘의 발자국 removed. Friend lines show the nearest Place and the position's age; walking times come from the walking table. | 05 | | Planned |
| Removed members joining again (UI-08) | Removing a member from an Open Quest did nothing. | A removed member needs the Leader's approval to come back, with a caption for them and a mark for the Leader. | 08 | | Planned |
