# 57: A 관정 login takes effect at once, the time is a bar, and a seat is picked on the room's picture

Parent: [P15 spec](../spec.md), item 57; the owner's request of 2026-11-18 and a tester's report of 2026-11-18 ("when the library needs a login, the Assistant still says it showed the result"); the team canvas's row "공부할 자리 · 혼자" (y = 28328: `AmStudy`, `AmStudy-a1` … `AmStudy-a3s`), the kit's time band (`AmKit`, drawn dragged in `AmFrame-f14`), and the older seat-picture boards `GestureAskSeats` and `MainChatLibSeats` for the picture's look
Status: ready-for-agent
Owner: AhnJinYoung
Blocked by: none

Native files: none. Releases: an app OTA update only (no main-server Release, no native Release).

## What happens now

### The login needs a second press

A card that needs the library session says "관정도서관 로그인이 필요해요" with 로그인 (`mobile/src/screens/main/library/library-parts.tsx:124-150`). 로그인 opens the login web view (`mobile/src/library/login-view.tsx`). Each time that view lands on `/pc/main`, `/pc/booking` or `/pc/mybooking` (`isLoginDone`, `mobile/src/library/site.ts:72-75`) it asks the check `loginWorks` (`mobile/src/library/client.ts:309-312`): the hidden web view is mounted, loads `/pc/main`, and reads the User's bookings for today. Only a check that works closes the login and sets the flag.

The cause: the view lands on `/pc/main` twice. Once before the school's login, because the site serves its main page first and only then sends the User to the school's login; then again after the login. The first landing starts a check with no session yet. That check waits for the hidden view's page (up to 20 seconds, `PAGE_LOAD_MS`) and its read (up to 15 seconds, `CALL_MS`, `mobile/src/library/hidden-transport.ts:9-10`), because the hidden page itself is sent off to the school's login part-way. While it runs, `useCheckThenFinish` drops every other landing (`if (checking.current) return;`, `mobile/src/library/login-view.tsx:49-52`). A User who logs in within that time lands on `/pc/main` while the first check still runs, so the landing that would have worked is dropped. The first check then answers "no session", and nothing asks again, since the view stays on `/pc/main` and does not navigate. The User sees the library's own page, logged in, and presses ✕. The login ends as "no session", and the card keeps its red line. A second 로그인 opens the view already logged in: its one landing finds the session, and the login takes effect.

Two smaller gaps sit next to it:

- Only the card whose 로그인 was pressed reads again (`retryAfterLogin`, `client.ts:299-305`, through `useLogInReload`, `use-library-call.ts:80-90`). Every other mounted card that failed for want of a session keeps its red line, and so does every card after a login from the 내 정보 row. `useLibraryLoad` (`use-library-call.ts:35-63`) reads only on mount, on its key and on `reload`, never when the flag changes.
- A check run again while the hidden view is still mounted would reuse its page: the transport keeps a page that was sent off the site as `ended` and answers every later call "session ended" without loading it again (`hidden-transport.ts:166-169`).

### How the time and the seat are chosen today

- The seat book card (`book-seat-card.tsx`) shows its time as words ("오늘 17:00–18:00"). Only a card the app gave for a tapped seat (`adjustable`) can change it, with two rows of buttons, "시작 HH:MM −30분 +30분" and "이용 N분 −30분 +30분" (`slot-steps.tsx`). A card the Assistant gave keeps its time.
- "다른 자리 고르기" opens the large seat map (`seat-map.tsx`, `LargeSeatMap`): the room's `area_<sector>.png` 300 high, scrolled sideways, each seat a box at its POSX/POSY with its number, free seats orange. A tap on a free seat chooses it at once and closes the view, so the User cannot see which seat they pressed before it is taken. The map cannot be zoomed. The seats card's "크게 보기" opens the same view, and a tap there gives a seat book card at once.

## What changes

### (a) The login takes effect at once

- A landing on the site's screens that comes while a check runs is no longer dropped: it is remembered, and when the running check ends without a session, the check runs once more. The login closes as soon as one check finds the session, with no second press.
- Each check starts the hidden view's page afresh (`HiddenViewTransport.reloadPage()`), so a check never reuses a page that was sent off the site.
- Every mounted library card that reads (`useLibraryLoad`) follows the flag: when it is set, a card whose read failed for want of a session (`noSession`, `sessionEnded`) reads again at once; when it is cleared (로그아웃 on 내 정보, a session that ended, a sign-out), a card that had read reads again and shows "관정도서관 로그인이 필요해요" with 로그인. A write that failed for want of a session clears its red line once the flag is set, and is not sent again by itself: the User presses 예약하기 again.
- The 내 정보 row already follows the flag (`useLibrarySession().loggedIn`), and stays as it is.
- Nothing about the session reaches the main server or the model: no flag, no student number, no cookie.

### (b) The time is a bar

The seat book card shows its time as the kit's time band, as `AmStudy-a1` draws it in the ribbon and `AmFrame-f14` draws it dragged:

- The track runs from the space's opening to its closing time that day (`space.hours`), with those two times under its ends. A line marks now when the date is today.
- The band covers the card's start to its end, a light quest fill (`color.questSoft`) with a quest outline (`color.quest`), and the words under it say "14:00–20:00 · 6시간" (the board's `bandText`: start–end and the length in 시간/분).
- A white handle at each end drags that end; a drag on the band moves it whole. Every move snaps to 30 minutes (`STEP_MINUTES`). The start is never before the next 30 minutes today (`nextStart`) nor before opening; the end never after closing; the length stays between the space's `minMinutes` and `maxMinutes` (a seat's 1 to 6 hours). While a drag lasts, the band follows the finger and a dashed outline marks where it was; the card reads the seats again only when the finger is let go.
- A screen reader steps each handle and the band by 30 minutes ("시작 시각", "끝 시각", "시간 띠", as the answer's band names them).
- It replaces the −30분/+30분 rows (`slot-steps.tsx`, removed), and it shows on every seat book card, the Assistant's too, while no booking is on its way. The room chip's list opens in the band's place (as `AmStudy-a2` draws the list over the ribbon), and its counts are for the band's time; a new time reads the seats and the counts again.

### (c) 자리 선택하기 opens the seat picture

- The seat book card's "다른 자리 고르기" is renamed "자리 선택하기", the owner's word.
- It opens the room's seat picture full screen, as the large view does today: its title "<room> 좌석 현황" and ✕, the picture, a key of the colours, and the hint.
- Zoom: two fingers pinch it (`react-native-gesture-handler`'s `Gesture.Pinch`, already installed, as the edge-back swipe uses it), and the buttons "확대" (+) and "축소" (−) step it, from the picture fitted 300 high up to 4 times that. The picture scrolls both ways once it is larger than the screen. No new package and no native change.
- Every seat is drawn with its number (VNAME), at every zoom, with the number's size following the box.
- Colours: a free seat is the site's orange, a taken seat pale (no button), an accessible seat grey (no button), and the seat pressed is the key colour (`color.snuBlue`) with a white number. A press on a free seat selects it and changes that seat's colour only; a press on another free seat moves the selection there.
- A full-width button "<number>번 선택" appears at the foot once a seat is selected, and not before. It closes the picture and puts that seat in the book card ("관정관 7층 7A 열람실 2 구역 · 7300번"). ✕ closes it with the card's seat as it was.
- The seats card's "크게 보기" opens the same picture: there "<number>번 선택" gives the seat book card for that seat, as a tap does today.
- Where the positions come from: the library's own `getSeatBookingList` gives each seat's `POSX`, `POSY`, `POSW` and `POSH` in the pixels of the room's picture `area_<sectorNo>.png`, which loads with no cookie; the server's space catalogue (`kwanjeong-spaces.yaml`) gives each picture's size as `mapImage`. The eight seat sectors of 7층 and 8층 have both: 17101, 17201, 17202, 17301, 18101, 18201, 18202 and 18301 (their seat lists are recorded in the fixtures `getSeatBookingList_17101` … `_18301`). A seat space without `mapImage`, such as 캐럴 1-40 (17401), gets no picture: its card offers no 자리 선택하기 and offers the first free seat, as now. Rooms (스터디룸, 스튜디오) are booked by room, not seat, and keep their list.

## What stays as it is

- The reply's words: the server's library tools still answer `result: 'shown'`, and the model still says it showed the card (the owner's choice for this ticket).
- The session stays on the phone (ADR 0012): the login web view, the hidden view, the flag, the logout, the cookie module.
- The seat book card's 예약하기, 닫기, 되돌리기, the kiosk foot, the notes, the room chip and its list, and the seats card's small map.
- The room book card's time (its own slot rows in `book-room-card.tsx`).

## Acceptance criteria

- [x] With no session, a seat book card shows "관정도서관 로그인이 필요해요" with 로그인. After 로그인, the login view lands on `/pc/main` before the school's login (its check still waiting), then on `/pc/main` after it; once the first check answers "no session", the check runs again, the login closes, and the card loads its seats, with no second press. (Integration test, fails on the old code.)
- [x] Two cards that failed for want of a session both load after one login from one of them, and a card that loaded shows the login line at once after 로그아웃. (Integration test.)
- [x] The seat book card shows the time band with "17:00–18:00 · 1시간" under it and the space's hours at its ends; a screen reader's step of the end handle makes it "17:00–18:30 · 1시간 30분", reads the seats for the new time and shows "오늘 17:00–18:30". (Integration test.)
- [x] The band's rules, by unit test: snapping to 30 minutes, the start not before the next 30 minutes today nor before opening, the end not after closing, the length within the space's least and most, a whole move keeping its length.
- [x] 자리 선택하기 opens "<room> 좌석 현황"; every seat shows its number; a press on a free seat changes only that seat's colour and shows "<n>번 선택"; a press on another moves it; a taken seat is no button; "<n>번 선택" puts the seat in the card. (Integration test.)
- [ ] 확대 and 축소 change the picture's size between 1 and 4 times, and a pinch changes it within the same limits. (Integration test for the buttons; the pinch by reading, and by a person on a phone.) The buttons are tested (1, 1.5, 2, 3, 4 times); the pinch waits for a person on a phone.
- [x] No test calls the real library; the fake library and its fixtures only.
- [x] No native file changes; oxlint, Prettier and tsc pass on the app.

## Open questions for the owner

- The band shows no lane of the User's timetable, unlike the board's ribbon ("나" with the classes at 13:00 and 16:00): the seat book card does not have the timetable today. Should it draw the User's classes too?
- Should a tap on a free seat of the seats card's small map (in the chat) also select first, as the large picture now does, or keep giving the book card at once?
- The login's first landing on `/pc/main`, before the school's login, still starts a check whose hidden page goes to the school's login too. If the school's login refuses a second login page in the same cookie jar, the first try may still fail on a phone; the fix here cannot show that without a real login.

## Comments

### Notes from the implementation (2026-11-18)

- The owner's answers to the open questions: no "나" lane on the band; a tap on the small seat map in the chat keeps giving the book card at once, and only the large picture confirms with "<n>번 선택"; the cookie-jar risk of the first check is left to a person on a phone (the pull request lists what to try).
- The flag now says why it was cleared (`clearLibraryLoggedIn('ended' | 'loggedOut')`), and the session gives a `logouts` count. Only a logout on purpose (`endLibrarySession`) makes the cards that had read read again. A session that ended under a call stays the failed card's own to show, so that its 로그인 still sends the pressed write once more (P06 ticket 08's rule).
- The band's words, ends and steps follow the space's own `stepMinutes`, `minMinutes` and `maxMinutes` from the server's catalogue; for the seats these are 30, 30 and 360 minutes.
- The seat picture is a centred white sheet over the map in `GestureAskSeats`'s look, rather than the earlier dark full-screen view. Its hint is new: "밀어서 옮기고, 두 손가락으로 확대해요".
- The pinch could not be tested here: `react-native-gesture-handler`'s jest utilities drive pans, and the zoom's buttons share its limits (`zoomWithin`). A person checks the pinch on a phone.
- The seat book card's tests for the picture and the band are in their own files (`answer-frame-library-seat-picker`, `answer-frame-library-slot-band`), since the book card's file reached the 300-line limit.
- On this machine, Jest in the worktree resolved `@babel/runtime` only through a link at `/workspace/a02-04/node_modules/@babel/runtime` to the shared `.pnpm` copy, outside git; CI is not affected.

### Agent usage (2026-11-18)

Estimates from the session transcript, with the waits for the shared machine (a full disk, other agents' test runs) left out:

- Agent time: about 2 hours 40 minutes, in one Opus 5.5 session (a subagent of the orchestrating session), stopped once when the disk filled and resumed.
- Tokens: output about 110,000. Input about 9 million: about 8.6 million cache reads, 0.4 million cache writes and a few thousand uncached.
