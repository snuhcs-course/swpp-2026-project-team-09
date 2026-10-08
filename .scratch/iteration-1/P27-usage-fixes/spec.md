# P27: Fix what using the app turned up

Status: resolved

## Problem Statement

Using the app on a phone turned up small faults, places where it does something other than what was meant:

- A User whose phone offered only a non-SNU Google account cannot sign in with another account from the app. Reinstalling does not help; the only way is to add the account in a browser first.
- When two Global Events share a Place, their names under the markers overlap and the letters break. The markers themselves overlap, so the one underneath cannot be pressed.
- The map snaps back to campus as soon as the User drags a little past it, and pinching out past the lowest zoom snaps back too ("팅").
- Choosing a Global Event in 파티 만들기 locks the Quest's title to the event's.
- In 파티 만들기, the time sheet of `언제` opens behind the keyboard.
- Marking a Sub Quest (일정) done cannot be undone, and marking every one done drops the Quest from the User's 내 파티 while it stays on the other Holders' phones.
- A Sub Quest's place cannot be typed: words without a point on the map are refused, so a place off campus such as 서울대입구역 cannot be given at all.
- In the 행사 tab, pressing a Quest in 파티 찾기/모집 asks "참여할까요?" without letting the User read the recruiting post first.
- A Leader learns of a request to join only from 알림 or the 파티 tab's count, not on the Quest itself.

## Solution

Nine fixes, each small:

1. The sign-in screen offers `다른 서울대 계정으로 로그인`, which opens Google's account chooser where another account can be added. The usual sign-in and the kept Session are untouched.
2. Place markers carry no words on the map. Global Events at one Place are one marker with their count; pressing it lists them, and choosing one opens its card.
3. The camera may move over a wider area around campus, and pinching out stops at the lowest zoom instead of snapping back.
4. Choosing a Global Event fills in the title, which the Leader may change, at creation and later.
5. Pressing `언제` closes the keyboard before the time sheet opens.
6. A Sub Quest marked done can be unmarked, and done marks no longer take a Quest out of 내 파티 or the main screen's Quest list.
7. A typed place is kept: as a Place when the words name one, otherwise as the words alone.
8. Pressing a Quest in the 행사 tab's 파티 찾기/모집 opens its recruiting post, where the User joins or asks to.
9. Each Quest the User leads shows, on its block in 내 파티, a red badge with the number of requests to join waiting for an answer.

## User Stories

### Signing in

1. As a User whose phone shows only my personal Google account, I want `다른 서울대 계정으로 로그인` on the sign-in screen, so that I can sign in with my SNU account without leaving the app.
2. As a User, I want that link to open Google's account chooser with its option to add an account, so that an account not yet on the phone can be used.
3. As a User who was refused with `@snu.ac.kr 계정만 가능해요`, I want the same link under that line, so that I can try another account at once.
4. As a User, I want the link hidden while the account is being checked, so that I cannot start two sign-ins.
5. As a User who closes the account chooser, I want to be back on the sign-in screen as before, so that cancelling is not a failure.
6. As a signed-in User, I want to stay signed in as before, so that the change costs me nothing.
7. As a User, I want `서울대 계정으로 로그인` to keep opening the quick sheet it opens today, so that the usual sign-in stays one tap.

### The map's markers

8. As a User, I want no words drawn under the markers of Places (Global Events, Quests, Parties, dining and shuttle), so that overlapping words do not break.
9. As a User, I want my Friends' names to stay under their Avatars, so that I can tell them apart.
10. As a User, I want the name and details of a Place marker in its card when I press it, so that nothing is lost by removing the words.
11. As a User, I want the Global Events at one Place shown as one marker with their count, so that none hides another.
12. As a User, I want pressing that marker to list the Global Events at that Place, so that I can reach each of them.
13. As a User, I want choosing one in that list to open its card as a single event's marker does, so that I can act on it.
14. As a User, I want a Place with one Global Event to behave as today, so that the common case is unchanged.
15. As a screen reader user, I want the merged marker read with its count and the Place, so that I know what it holds.

### The map's camera

16. As a User, I want to drag the map to about half the campus's width past its east and west edges and half its height past its north and south edges, so that I can look just outside campus.
17. As a User, I want pinching out to stop at the lowest zoom without snapping back, so that the map feels like Kakao's own.
18. As a User, I want the lowest zoom to stay as it is today, so that the campus still fills the screen when zoomed out.
19. As a User, I want a drag past the wider area to come back when I let go, as today, so that I cannot lose the campus.
20. As a User, I want my own Avatar shown and hidden by the same rule as today, so that widening the view does not change who is on campus.

### Titles of Quests for a Global Event

21. As a User making a Quest, I want choosing a Global Event to fill the title with the event's, so that I need not type it.
22. As a User making a Quest, I want to change that filled-in title, so that I can name the Quest my way.
23. As a Leader, I want to change the title of a Quest for a Global Event in 파티 수정, so that I can rename it later.
24. As a Leader, I want my title kept when an Administrator renames the Global Event, so that my name for the Quest is not overwritten.
25. As a Holder, I want the event's own title still shown on the Quest's event Badge and card, so that I know which event it is for.
26. As a User, I want choosing another Global Event to fill in that event's title, and `행사 빼기` to leave the title as it is, so that the form does what I expect.
27. As a User placed by Matching, I want my new Quest titled with the event's title, as today, so that Matching is unchanged.

### The keyboard and the time sheet

28. As a User writing in 파티 만들기, I want pressing `언제` to close the keyboard and then open the time sheet, so that the sheet is not hidden.
29. As a User adding a Sub Quest in the room, I want the same for its `언제`, so that both forms behave alike.

### Marking Sub Quests done

30. As a Holder, I want to press a Sub Quest marked done to unmark it, so that a wrong press can be undone.
31. As a Holder, I want my mark and its undoing to be mine alone, as today, so that other Holders' progress is untouched.
32. As a Holder who marked every Sub Quest done, I want the Quest to stay in 내 파티, so that I see what the other Holders see.
33. As a Holder, I want the Quest to stay in the main screen's Quest list after I mark its Sub Quests done, so that both lists agree.
34. As a Holder, I want a Sub Quest marked done shown faded, as today, so that I can see what is done.
35. As a Holder, I want a Quest to leave my lists only when its Sub Quests are over by their time, cancelled, or the Quest ends or I leave it, so that it goes when it is really over.

### Typing a place

36. As a Holder adding a Sub Quest, I want to type its place and save, so that I need not find it on the map.
37. As a Holder, I want typed words that name a campus Place to become that Place, so that it has a pin and a route.
38. As a Holder, I want words that name no Place, such as 서울대입구역 or 홍대, kept as they are, so that a place off campus can be given.
39. As a Holder, I want a Sub Quest with only words shown with those words and without a pin or a route, so that nothing pretends to know where it is.
40. As a User making a Quest, I want the same for `어디서` in 파티 만들기, so that both forms accept typed places.
41. As a Holder, I want a point picked on the map kept as today, so that the map choice still works.
42. As a Holder, I want to edit a Sub Quest's typed place later, so that I can correct it.

### Finding a Quest for a Global Event

43. As a User in the 행사 tab's 파티 찾기/모집, I want pressing another's Quest to open its recruiting post, so that I read it before deciding.
44. As a User on that post, I want its `참여하기` or `참여 신청`, so that I join from there.
45. As a User, I want pressing my own Quest there to open its room, as today, so that nothing else changes.
46. As a User in the 파티 tab's boards, I want them to behave as today, so that only the 행사 tab changes.

### Requests to join on 내 파티

47. As a Leader, I want a red badge with a white number at the top right of my Quest's block in 내 파티, counting the requests to join waiting for my answer, so that I see them where the Quest is.
48. As a Leader, I want the number to go down as I accept or decline requests, and the badge to go when none waits, so that it shows what is left.
49. As a Leader, I want the number to follow a new request or a withdrawn one without reopening the screen, so that it is current.
50. As a Holder who does not lead the Quest, I want no such badge, so that only the Leader is prompted.

## Implementation Decisions

### Signing in

- The Google boundary module gains a second way to ask: the explicit sign-in, which shows Google's account chooser with its option to add an account. The existing way, the sheet of the phone's accounts, stays the default of `서울대 계정으로 로그인`.
- The sign-in operation takes which way to ask; everything after the ID token is shared, including the main server's check and the SNU-account refusal.
- The sign-in screen shows the link `다른 서울대 계정으로 로그인` below the line under its headline, in the default state and after a refusal, and not while checking.
- Keeping and restoring the Session (the kept tokens) is not changed.
- Where Google's module is not available (Expo Go, the tests, the web), the link runs the same mock sign-in as the button.

### The map's markers

- Place markers are given no `text`; only Avatars keep theirs. The marker's `name` for screen readers stays.
- Global Events at the same Place (the same position) become one marker. One event keeps today's marker and card. Two or more make one marker with the count on its pin; pressing it opens a list of those events, and choosing one opens that event's card. The marker's identifier is derived from the Place so that it stays stable as events come and go.

### The map's camera

- The camera's area and the on-campus rectangle become two values. The camera's area is the current rectangle widened by half its height to the north and to the south and by half its width to the east and to the west. The on-campus rectangle, which decides whether the User's own Avatar is shown and where 장소 선택 may pick, stays as it is.
- The lowest zoom stays at today's: it is taken from the current campus rectangle, not from the wider camera area.
- The map component takes a lowest native camera level and passes it to Kakao's SDK on Android and iOS (`setCameraMinLevel` / `cameraMinLevel`). The SDK takes whole levels only, so the level is 15, a hair closer than today's lowest of about 14.97. Pinching past it is then refused by the SDK.
- Kakao's SDK has no way to restrict panning and reports only the end of a move, so a drag past the camera's area still settles back when it ends.

### Titles of Quests for a Global Event

- The main server no longer refuses a title change for a Quest with a Global Event (`QUEST_TITLE_FROM_GLOBAL_EVENT` goes).
- Creating a Quest for a Global Event accepts a title; without one it takes the event's title, as Matching's Quests do.
- A Quest's title is its own and does not follow later changes to the Global Event's title. The attending Sub Quest still reads the event's title, time and place.
- In 파티 만들기 and 파티 수정 the title field is never locked. Choosing an event replaces the title with the event's; removing the event leaves the title.

### The keyboard and the time sheet

- Pressing `언제` dismisses the keyboard before opening the time sheet, in 파티 만들기 and in the room's Sub Quest form.

### Marking Sub Quests done

- The main server gains the undoing of a done mark: the Holder's progress for that Sub Quest is removed. Undoing a mark that does not exist is not an error. Like marking, it tells no other Holder.
- A Sub Quest's `ended` no longer counts the Holder's done mark: it is ended only when cancelled or past its end time. Its `done` stays as the Holder's mark.
- The Quest list therefore leaves out only Quests whose Sub Quests are all cancelled or past their end time. A Sub Quest without an end time never ends by time, so a Quest made in the app stays until the Leader ends it or its Holders leave; a Quest for a Global Event leaves when the event's end has passed.
- When a Quest is deleted is not changed: when the Leader ends it, or when its last Holder leaves.
- The app's Sub Quest row toggles: pressing a done Sub Quest unmarks it. Done Sub Quests stay faded.

### Typing a place

- A Sub Quest's place becomes one of three: a Place, a point with its words, or words alone. The database's check on a Sub Quest's place columns is relaxed by a migration so that the words may stand without a point; no column is added.
- The request body for a Sub Quest's place accepts words alone; the answer's place has no latitude or longitude for words alone.
- The app turns typed words into a Place when, ignoring spaces, they equal exactly one Place's name, its number, its number followed by `동`, or the words the app shows for it (such as `제1공학관 (301동)`). Otherwise the words are sent alone. A point picked on the map is sent as today.
- A place with words alone is shown with its words and has no marker on the map and no route.
- Both 파티 만들기's `어디서` and the room's Sub Quest form drop the hint `지도에서 위치를 골라 주세요` and accept typed words.

### Finding a Quest for a Global Event

- In the 행사 tab's 파티 찾기/모집, pressing another User's Quest opens its recruiting post. The question "참여할까요?" is no longer asked there. Joining and asking to join happen on the post as they already do.
- The 파티 tab's boards and other places that ask "참여할까요?" are not changed.

### Requests to join on 내 파티

- Each Quest in the main server's answer for the User's Quests carries the number of requests to join waiting for an answer, counted only when the User leads it (0 otherwise).
- The app shows it as a red circle with a white number at the top right of the Quest's block in 내 파티 when it is above 0. The existing `quests-changed` signal on a new, withdrawn or answered request refetches the list, so the number follows.

### The mock API

- The app's mock API mirrors every server change above (title changes for event Quests, undoing a done mark, `ended` without done marks, places with words alone, the waiting request count), so that the app's screen tests and the server's tests describe the same rules.

## Testing Decisions

- Tests describe behaviour a User or a client sees, through the existing seams, and never the inner shape of a module.
- App behaviour is tested at the screen seam: screens rendered over the mock API, pressed and read by what is shown (React Native Testing Library). Prior art: `party-form-test`, `events-party-form-test`, `room-plan-test`, `events-recruiting-test`, `party-mine-test`, `map-native-test`, `map-camera-test`, `sign-in-test`.
- Server behaviour is tested at the HTTP seam with the end-to-end specs. Prior art: `quest-settings`, `quest-progress`, `sub-quests`, `quest-join-requests`.
- Existing tests that assert the behaviour this spec changes are changed with it, and the change is named in the PR: `quest-settings` (event titles refused), `quest-progress` (done marks hide a Quest), `room-plan-test` (typed words refused), `events-recruiting-test` (the join question in 파티 찾기/모집). Every other existing test must pass unchanged, including `party-find-test` and `room-joining-test`, whose join questions stay.
- The map's camera is tested up to what the app hands the map component (the camera area and the lowest native level); the native modules' use of it is checked on a phone.
- What only a phone shows is checked by hand and listed in each ticket: Google's account chooser (1), the words gone from the map (2), the native zoom stop on Android and iOS (3), the keyboard closing before the time sheet (5).

## Out of Scope

- Making 파티 from a Friend's 캘린더 icon or card (the Meetup's entry points), and Meetups in general: their logic, entry points and the 초대 tab stay as they are.
- An end time for Sub Quests made in the app, and any rule ending a Quest by time beyond the existing one.
- Restricting panning natively: Kakao's SDK has no way to do it.
- Changing the on-campus rectangle or the Campus Boundary.
- The 파티 tab's boards and the join question outside the 행사 tab.
- Unread state for requests to join; the badge counts waiting requests only.

## Further Notes

- The items come from the User's own use of the app on Android; they were settled in one grilling session on 2026-10-08. The original items 6 and 7 (the Friend's 캘린더 icon) were withdrawn for later review.
- `GLOSSARY.md`'s Sub Quest now says a Sub Quest's place is a Place, a point on the map or only the User's words.
