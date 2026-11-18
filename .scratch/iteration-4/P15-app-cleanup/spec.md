# P15: App clean-up before release

Status: ready-for-human

Schedule row: Iteration 4, P15 "Clean up features outside the main UI", due 2026-11-19. Workers: 김태현 (`TaeHyun79`) and 안진영 (`AhnJinYoung`).

References:

- The team canvas (SNU Now 와이어프레임, https://claude.ai/code/artifact/004b1b85-ec1c-47c1-a8f9-d429b971846f): the after wireframe of each item is drawn there before its ticket is written.
- `CLAUDE.md`, "The app's native files"; ADR 0007 (test levels).

## Problem Statement

The app is about to be used by people outside the team, and small things get in their way. The same control sits on two screens, a button does nothing, a press leads nowhere, a field draws its words over its own icon. None is large, but together they make the app feel unfinished. They also keep turning up while the app is used, so the full list cannot be known before the work starts.

## Solution

P15 is an umbrella for these small items. Each item is one change a User can see, such as removing a duplicate switch, making a timetable block open its class, or keeping a field's words clear of its icon. Most touch only the app. A few may touch the main server or the database.

This spec does not decide how an item is fixed. It lists what each item is about in one line. The way to fix it, and every decision taken for it (what changes, what stays as it is), is written in the item's ticket.

## How the work runs

### Collecting and drawing

An item is found by using the released app, on a phone or an emulator, and checked against the code. Items are collected first. Each one then gets its after wireframe on the team canvas, and the drawing is approved before its ticket is written.

An item that changes no screen, such as the app's icon, has no board. Its ticket names the drawing that was approved instead, and its pull request shows screenshots of the emulator where the others show the boards.

### Tickets

- One ticket per item, at `issues/<NN>-<slug>.md`. Items so small that they change the same file together may share one ticket.
- The ticket holds the detail: what is on screen now, what changes, what stays as it is, and the acceptance criteria.
- Its head has these lines:
  - `Parent:` this spec, and where the item came from, such as "the canvas board X" or "found using `snunow/all/26.11.17-2` on 2026-11-17".
  - `Status:` as in `docs/agents/triage-labels.md`.
  - `Owner:` the GitHub ID of the person who does it. A change of hands changes only this line.
  - `Blocked by:` other tickets, pull requests, or nothing.
- Numbers are split between the two workers so that new tickets never collide: 김태현 takes `01`–`49`, 안진영 takes `51`–`99`. Each takes the next free number in their own range.
- When a ticket is finished, the agent work it took is recorded under that ticket's `## Comments`, as `CLAUDE.md`, "Usage reporting" says: one record per ticket, none for the spec as a whole.

### Items found during the work

Items keep turning up while the others are being fixed. One found during the work may be drawn, written as a ticket, and fixed in the same pull request, with the ticket's acceptance criteria checked there. Its line is added to the list below in the same pull request.

### Implementing a ticket

- Before the code is touched, the item's after board is opened on the team canvas and kept at hand: the screen is made to match its layout and words. Where the board and the ticket differ, the ticket decides, and the difference is reported to the ticket's owner.

### Pull requests

- Each ticket, or each set of tickets that share a file, is one pull request into `4.0/Main`. A branch takes `4.0/Main` by merge, never by rebase.
- Two people do not change the same file at the same time. Items are split by screen where they can be.
- A ticket that adds a database migration is ordered behind any other ticket that does (`Blocked by:`), since two branches that each add one collide. It also says that its change needs a Release of the main server.
- A ticket that touches the app's native files (`CLAUDE.md`, "The app's native files") says so in its head, since its change needs a native Release.
- The pull request's body shows the item's before and after boards from the team canvas as screenshots, where the body says what the pull request does, so that the reviewer compares the app against the drawing that was approved.

## The items

One line per item: what it is about. The ticket holds the rest. A line gets its ticket's link once the ticket exists.

### 김태현 (`01`–`49`)

1. 위치 공유 switch on two screens: keep it on 내 정보 only, and remove the counts under it. Ticket [01](issues/01-one-sharing-switch.md).
2. Each Friend's level (시간표만 / 지금 있는 건물 / 정확한 위치) on two screens: keep it on 위치 공유 only, and leave 친구 관리 a list of Friends. Ticket [02](issues/02-friend-levels-on-one-screen.md).
3. The 시간표 card on 내 정보: remove "빈 시간 말하기", a pressed class block opens that class, and reading an image comes back to 내 정보. Ticket [03](issues/03-timetable-card.md).
4. The map's friend panel: remove the green "친구 N명과 위치 공유 중" banner. Ticket [04](issues/04-friend-panel-banner.md).
5. The 학과 field (프로필 편집, Onboarding): the words cover the search icon once the field is pressed. Ticket [05](issues/05-department-field-icon.md).
6. The app's icon, splash and notification icon are still Expo's defaults: give the app its own, the "SNU / now" wordmark. A native change. Ticket [06](issues/06-app-icon.md).
7. The map's credit and Kakao's logo float far above the AI input, over the place of a row of buttons that is no longer drawn: nothing stands over an empty place above the input. Ticket [07](issues/07-credit-above-the-input.md).
8. The sign-in screen: remove the drawn character, put the sign-in button in the middle, and show the app icon's wordmark in place of the name and its tagline. Ticket [08](issues/08-sign-in-wordmark.md).
9. The AI input's keyboard goes down only on a send: a press anywhere outside the input puts it down, and does nothing else. Ticket [09](issues/09-keyboard-down-on-press-outside.md).
10. An Invite Link that starts the stopped app lands on the map, on Android, and in a browser its address answers 404: the stopped app shows the accept screen, and the address is a page that opens the app. Ticket [10](issues/10-invite-link-cold-start-and-page.md).

### 안진영 (`51`–`99`)

51. The chat's system prompt: cache it across Users and minutes, with the time after the breakpoint, and teach it the campus's short names (학관, 중도, …). Ticket [51](issues/51-system-prompt-cache-and-campus-terms.md).
52. 이미지로 불러오기 reads real screenshots badly: read them with the AI on the blocks the phone finds, for any timetable layout. Ticket [52](issues/52-timetable-image-reading.md).
53. The 새내기 튜토리얼 as the canvas draws it: fewer words, a list with category tabs and icons in place of the pager, and each quest as a guide on the map. Ticket [53](issues/53-freshman-tutorial-as-drawn.md).
54. The 행사 tab is hard to read: long titles and places run over many lines, and a card without its badge has an empty band. Draw it as the `Events` board does: a date column, one row per event, and a sheet for the details. Ticket [54](issues/54-events-tab-as-drawn.md).
55. A walking route on the map cannot be cancelled, and its line stays: a tap on empty map clears it. Ticket [55](issues/55-cancel-the-walking-route.md).
56. An answer's walking routes are drawn as straight lines: each walk follows the path the walking route service finds. Ticket [56](issues/56-answer-routes-along-the-paths.md).
57. 관정 booking: a login takes effect only on a second 로그인, the time moves only by ±30분 buttons, and a pressed seat is taken at once without showing which: the login takes effect at once, the time is a bar, and a seat is picked on the room's picture. Ticket [57](issues/57-kwanjeong-login-and-seat-picker.md).
58. 관정 booking, after #360: a card left open across its start can show the old time while it books, and a login closed while its check runs can close the login opened again after it. Ticket [58](issues/58-kwanjeong-follow-ups.md).
59. The 행사 search field says only "행사 검색": it names what the search reads, the title, the place and the description. Ticket [59](issues/59-events-search-hint.md).
60. The name and the department can be changed in onboarding and 프로필 편집, though the service runs on real names: both come from the SNU account and are fixed, with a line saying so. Ticket [60](issues/60-name-and-department-from-account.md).

## Testing Decisions

Each ticket names its own tests by ADR 0007. A ticket that only removes something checks that it is gone and that what stays still works. A ticket that changes what a press does tests the press.
