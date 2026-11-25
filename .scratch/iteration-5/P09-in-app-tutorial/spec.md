# P09: The Tour (앱 둘러보기), with 샤샤 and Practice

Status: ready-for-agent

References: the decisions come from the grilling of 2026-11-25. [ADR 0016](../../../docs/adr/0016-the-tour-practises-on-the-phone-not-the-server.md) records why Practice stays on the phone. The words Tour, Practice and Practice Person are in `GLOSSARY.md` ("The Tour"). 샤샤's two pictures are under `references/`: `shasha-default.png` for every step and `shasha-cheer.png` for the end. The heuristic evaluation's items H7, H8 and H9 are in `.scratch/iteration-4/P06-he-revision/references/he-improvements.md`.

## Problem Statement

Students from other teams tried SNU Now in the course's user testing. Many could not tell what the app is for or what they could do with it (H7: "가입 후 무엇을 하는 앱인지, 기능별 안내가 부족함"; H8: "기능이 많아서 새 사용자가 길을 잃기 쉬움").

The app's only guide to itself is the tour of the bottom tabs. It lights each of the four tabs in turn with one sentence, and it never shows what is inside a tab.

A new User also cannot try the app's main things. Planning a meal with a Friend in a 공강, posting a 승인제 파티 and accepting a request, and turning a 파티 on all need other people, and a new User has no Friends and no 파티. Real made-up people or 파티 on the server would be seen by other Users.

## Solution

The **Tour** replaces the tour of the tabs. It is offered right after Onboarding with a card: "1분 둘러보기" or "건너뛰기".

The Tour goes into the tabs one chapter at a time, in this order, which does not follow the order of the tab bar:

1. **지도**
   - What the map shows: me, Friends, 파티 and places.
   - The three layers: 식당, 셔틀 and 공부공간.
   - What the Assistant does: "가능해요" (밥 · 약속 · 파티 찾기 · 행사 · 길찾기 · 공부 자리 · 관정 예약 · 셔틀) and "못 해요" (캠퍼스 밖 · 과제 · 친구 대신 수락 · 관정 외 도서관). It has example chips that answer when pressed: "배고파" shows a meal plan and "과제 도와줘" shows the refusal.
   - The line "AI가 제안하면, 실행은 내가 눌러서".
   - ★ **Try it**: the User writes "@샤샤" with the "@" mention, asks for a meal in a 공강, gets a Plan and sends it, which makes a 비공개 파티 with 샤샤.
2. **파티**
   - The three Join Policies: 바로 참여, 승인 후 참여 and 비공개.
   - The 찾기, 내 파티 and 초대 tabs.
   - ★ **Try it**: the User posts a 승인제 공개 파티. 관악이, a stranger, asks to join, and the User accepts.
   - ★ **Try it**: the User turns that 파티 on, and 관악이's position shows on the map.
3. **행사**: finding or recruiting a 파티 to go to an event with.
4. **내 정보**
   - The two ways to add a Timetable: typing it in, and reading a screenshot.
   - The two ways to add a Friend: by Friend ID, and by invite link (one person, within 24 hours).
   - Location Sharing: the Master Switch, the three levels per Friend and Private Zones.
   - Where the 알림 bell is.
   - That the Tour can be seen again here.

The whole Tour runs in **Practice**: the app's real screens show made-up data that stays on the phone and is gone when the Tour ends. While Practice lasts:
- A band "연습 중 · 실제로 저장되지 않아요" with 그만하기 stays on screen.
- Only the thing a step points at can be pressed.

**샤샤** guides the Tour. Its default picture stands beside each speech bubble, and it speaks in plain, unhurried 반말 ("이건 뭐야. 이렇게 할 수 있어."). It is quietly caring through a useful tip, and it is never sarcastic, grumpy or cute. Each bubble is one or two lines. Within Practice, 샤샤 is also the User's Friend. 관악이 is a stranger with a letter avatar. The app's own words (buttons, the band, the Assistant's "가능해요 / 못 해요" list) stay in 해요체.

The Tour ends with 샤샤 cheering ("끝. 연습한 건 다 지워져. 이제 진짜로 써 봐.") and a button "진짜로 시작하기". The button ends Practice, and the first run's cards follow: the Timetable, interests, then one Friend.

A User whose Tour was cut off (the app closed or was killed) is offered "이어서 둘러볼까요?" on the next start, and goes on from the start of the chapter where it stopped.

A User who already uses the app and has not seen the Tour is offered it once. The row "탭 안내 다시 보기" in 내 정보 becomes "앱 둘러보기", which starts the Tour again at any time.

Whether the Tour was finished or declined, and the chapter reached, are kept on the phone only.

## User Stories

### Being offered the Tour

1. As a new User who just finished Onboarding, I want a card offering "1분 둘러보기" before anything else, so that I learn what the app does before it asks me for anything.
2. As a new User, I want "건너뛰기" on that card, so that I can start using the app at once if I do not want a guide.
3. As a new User who skipped the Tour, I want the first run's cards to follow at once, so that skipping costs me nothing.
4. As a User who already used the app before the Tour existed, I want the Tour offered once on my next start, so that I also learn what I missed.
5. As a User who declined or finished the Tour, I want it never offered again by itself, so that it does not get in my way.
6. As any User, I want "앱 둘러보기" in 내 정보, so that I can take the Tour again whenever I forget something.
7. As a User whose Tour was cut off, I want "이어서 둘러볼까요?" on the next start, so that I can pick up where I stopped.
8. As a User resuming the Tour, I want it to start again at the start of the chapter where I stopped, so that the chapter makes sense from its beginning.
9. As a User offered to resume, I want to be able to decline, so that I am not made to finish.

### Practice

10. As a User in the Tour, I want to see the app's real screens, so that what I learn is what I will use.
11. As a User in the Tour, I want a band "연습 중 · 실제로 저장되지 않아요" on screen the whole time, so that I never mistake a Practice 파티 for a real one.
12. As a User in the Tour, I want 그만하기 on that band, so that I can leave at any moment.
13. As a User who pressed 그만하기, I want the Tour to end and my real screens to come back, so that nothing of Practice is left behind.
14. As a User in the Tour, I want nothing I do in Practice to reach anyone else, so that I can try things without worry.
15. As a User in the Tour, I want my real Friends, Timetable, 파티 and location settings untouched and out of sight during Practice, so that I cannot change them by mistake.
16. As a User in the Tour, I want only the thing the bubble points at to be pressable, so that I do not get lost off the guide.
17. As a User pressing Android's back button in the Tour, I want it to ask whether to stop, so that I do not leave by accident.

### 샤샤

18. As a User, I want 샤샤 beside each bubble, so that the guide feels like one companion and not a manual.
19. As a User, I want each bubble short (one or two lines), so that I am not made to read much (H9).
20. As a User, I want 샤샤 to speak plainly and kindly, so that the guide feels friendly without being childish or rude.
21. As a User finishing the Tour, I want 샤샤 cheering, so that the end feels like an achievement.

### Chapter 1: 지도

22. As a User, I want to be shown what the map shows (me, Friends, 파티 and places), so that I can read the main screen.
23. As a User, I want to be shown the 식당, 셔틀 and 공부공간 layers, so that I know where to find them.
24. As a User, I want a short list of what the Assistant does and does not do, so that I know what to ask it.
25. As a User, I want example chips I can press, one that the Assistant answers and one it refuses, so that I feel the boundary myself.
26. As a User, I want to be told that the Assistant only proposes and I press to make things happen, so that I trust it not to act for me.
27. As a User, I want to write "@샤샤" and see the Assistant know 샤샤 at once, so that I learn how to name a Friend to it.
28. As a User, I want to ask for a meal with 샤샤 in a 공강 and get a Plan on the map, so that I see the app's main use for myself.
29. As a User, I want to send the Plan and see a 비공개 파티 with 샤샤 made, so that I see how a Plan becomes a 파티.

### Chapter 2: 파티

30. As a User, I want the three Join Policies explained in one bubble, so that I know who can enter my 파티.
31. As a User, I want the 찾기, 내 파티 and 초대 tabs pointed out, so that I know where my 파티 and invitations are.
32. As a User, I want to post a 승인제 공개 파티 myself, so that I learn the form.
33. As a User, I want 관악이, a stranger, to ask to join, so that I see that a 공개 파티 is open to people who are not my Friends.
34. As a User, I want to accept 관악이's request, so that I learn how approval works.
35. As a User, I want to turn the 파티 on and see 관악이 on the map, so that I learn that a 파티's members see each other only while it is on.

### Chapter 3: 행사

36. As a User, I want to be shown that an event leads to finding or recruiting a 파티 for it, so that I know how to find company for an event.

### Chapter 4: 내 정보

37. As a User, I want to be shown the two ways to add my Timetable, so that I know a screenshot is enough.
38. As a User, I want to be shown the two ways to add a Friend, so that I can bring my friends in.
39. As a User, I want to be shown the Master Switch, the three levels per Friend and Private Zones, so that I know I control what each Friend sees.
40. As a User, I want to be shown where 알림 is, so that I find the Assistant's Notifications.
41. As a User, I want to be shown that the Tour is here to see again, so that I am not afraid to skip a part.

### The end

42. As a User at the end, I want to be told that what I made in Practice is gone, so that I am not surprised it disappeared.
43. As a User at the end, I want "진짜로 시작하기" to bring me to the real app and then the first run's cards, so that I go straight from trying to doing.

### The team

44. As a developer changing a screen the Tour points at, I want a test to fail when the Tour's target is gone, so that the Tour never silently breaks.
45. As a developer changing what the Assistant or a 파티 exchanges, I want the build to fail until the Practice script follows, so that Practice never drifts from the app.

## Implementation Decisions

### Practice
- **Where it runs.** The app's one client already chooses, at each call, between the main server's client and the mock client. While Practice lasts, it chooses a Practice client instead (ADR 0016).
- **The Practice client.**
  - It implements the same interface as the other two.
  - It holds Practice's data in memory: 샤샤, 관악이, a sample Timetable, a few events, and the 파티 the User makes.
  - It reuses the mock client's parts where they exist, the Assistant's answers in particular, but only after re-dating them (below).
  - It never calls the main server for what Practice shows or does.
- **Practice is dated to the phone's day.** The mock is built for one fixed moment, the frame's (1 October 2026, 13:37): its menus, answers and copies carry that day and time, and outside the mock build the app's clock is the phone's. Practice's data is therefore made for the phone's day and time when the Tour starts: the Timetables and the shared 공강, the Plan's time, the meal answer's menus and the events. A mock part is reused only after it is re-dated that way, so that no answer speaks of 1 October and none finds "오늘은 수집된 메뉴가 없어요."
- **The query cache.** The Tour has a query cache of its own, which the screens use while Practice lasts, so that Practice's answers never land in the cache the real screens use. When Practice ends, that cache is dropped and every real key is fetched again, so that nothing Practice answered stays behind.
- **What else the app sends.** The app's traffic that is not Practice's is not changed by the Tour: the Practice client hands `uploadPosition` (the User's own position under Location Sharing, in the foreground and the background) and `registerPushToken` to the real client, so that the User's position keeps reaching Friends during the Tour. Every other operation answers from Practice, `setMasterSwitch` included, since chapter 4 shows the switch. The rule is that nothing *Practice* does reaches the server.
- **Real-time updates.** Socket events and pushes that arrive during Practice are not drawn into Practice's screens: they invalidate the real cache, not the Tour's. Their effect shows once Practice ends, when every real key is fetched again.

### The script
- **Contents.** The Tour is a script: the chapters, the steps of each chapter, and for each step:
  - what it points at;
  - 샤샤's line;
  - whether it waits for "다음" or for a press of what it points at;
  - for a ★ step, the Practice data it needs at its start.
- **Wording.** All of 샤샤's lines live in the script, in one place, in the tone above. The lines given in this spec are the agreed starting point.
- **Each chapter stands alone.** It sets up its own Practice data at its start, so that a resumed chapter works without the chapters before it. Chapter 2 makes its own 비공개 파티 with 샤샤 when chapter 1's is not there.
- **The Assistant step.** In chapter 1's ★ step the input accepts only the scripted message.
  - The User types "@" and picks 샤샤 from the real mention list, the only Friend listed in Practice.
  - A chip then completes the request ("공강에 밥 먹자"), and only the scripted message can be sent.
  - The example chips before it ("배고파" and "과제 도와줘") answer from the Practice client: a meal Plan for today, and the Assistant's refusal for homework. That wording is the server's; the mock already keeps a copy of the homework refusal, which the script uses.
- **The 파티 form.** In chapter 2 the form opens filled in by the script. The User chooses 공개 with 승인 후 참여 and posts. 관악이's request arrives a moment later, as a request does.

### Pointing
- Each element the Tour points at carries a Tour anchor, a stable name registered by the screen that draws it. The Tour finds the anchor's place on screen and lights it.
- When an anchor is not found, the step's bubble shows in the middle of the screen with nothing lit, and the Tour goes on.
- The dimmed layer blocks every press except on the lit element and the bubble's own buttons, as the tour of the tabs does.
- Android's back button asks whether to stop the Tour.

### Start, resume, stop
- **The Tour's state.** A pure module decides where the Tour stands, from what the phone keeps and what the app knows:
  - whether to offer the start card, the resume card or nothing;
  - which chapter and step come next;
  - what happens on 다음, 그만하기 and the end.
- **What the phone keeps.** Per signed-in User, on the phone only: finished, declined, and the chapter reached while in progress. Signing out forgets it as other first-run state is forgotten.
- **Order on the main screen.** Onboarding, then the Tour's card, then (after the Tour ends, is declined or is skipped) the first run's cards.
  - The first run's cards wait while the Tour's card or the Tour is up.
  - The 새내기 튜토리얼's start button is hidden while the Tour is up.
- **Existing Users.** A User with no record of the Tour is offered it once on the next start, wherever they are in the first run. That includes a User who saw the tour of the tabs.

### What goes
- The tour of the tabs, its stored flag and its row in 내 정보 are removed.
- The row becomes "앱 둘러보기", which starts the Tour from chapter 1.

### 샤샤
- Two pictures: the default pose for every step and the cheering pose for the end. Both are generated with ChatGPT; neither is a university character.
- The default pose as given (`references/shasha-default.png`) has its background and a name tag drawn in. It is cut out to a transparent picture without the tag before use. The cheering pose already has a transparent background.

### Release
- App only: an OTA update. No server change, no native file and no new native dependency.
- The pictures are JavaScript-bundled assets, so they do not change the fingerprint.

## Testing Decisions

A good test here drives the app as a User does, through the screens, and checks what the User sees and what the main server receives. It does not check the Tour's internal state or which client answered.

- **The app-level integration test (the main seam).**
  - Shape: the whole app is started against the fake main server, as the tour of the tabs' test does now, and that test is replaced.
  - It covers:
    - the start card after Onboarding;
    - the four chapters step by step, with each ★ step done by pressing what is lit;
    - the end, and the first run's cards after it;
    - 건너뛰기, 그만하기, resuming after a restart at the start of the cut-off chapter;
    - replaying from 내 정보;
    - the one-time offer to an existing User.
  - It asserts that the fake main server received no request from Practice: no 파티 made, joined, accepted or turned on, and no Assistant message.
  - It asserts that after the Tour the real lists show none of Practice's data.
  - It fails when a step's anchor is not found, so that a screen change that loses the Tour's target is caught.
  - Prior art: the tab tour's and the first run's integration tests, and the helpers they share for Onboarding, the first run, the main screen and the fake server.
- **Unit tests of the Tour's state.**
  - The pure module that decides the card, the next step, resuming, declining and finishing is tested with no screen.
  - Prior art: the unit tests of the tour of the tabs' and the first run's rules.
- **Not tested apart.** The Practice client, the script and the pointing are covered through the app-level test. The Practice client's agreement with the real client is checked by the type checker.
- **Levels.** File names follow ADR 0007: the app test is an integration test and the state's tests are unit tests. CI runs them; they are not run locally in full.

## Out of Scope

- The 새내기 튜토리얼 (campus life), which stays as it is and is not merged with the Tour.
- Teaching anything outside the four chapters above. Left out on purpose:
  - building and Friend cards on the map;
  - 만나고 싶다;
  - past chats;
  - the four Boards;
  - event favourites and filters;
  - interests;
  - 관정 booking;
  - what is never recorded.
- Being invited to someone else's 비공개 파티 in Practice.
- Keeping the Tour's progress on the server or across phones.
- Measuring the Tour (started, finished or skipped) as a metric.
- An English Tour.
- Free typing to the Assistant during Practice.

## Further Notes

- The tab bar may change while this is built: P06 ticket 04, on hold, moves the map to the middle and adds 식단. The chapters keep their own order, and anchors, not positions, find their targets, so the Tour does not depend on the bar's order.
- The main screen is still being reworked by P04. Anchors and the app-level test are what keep the Tour honest through it.
- The Assistant's capability list in chapter 1 is a summary of the Assistant's rules and refusals as of 2026-11-25. It is fixed text in the script and is reviewed when the Assistant's scope changes.

## Tickets

1. [01: The Tour's frame: the start card, Practice, the 내 정보 chapter and the end](issues/01-tour-frame.md). Blocked by none.
2. [02: A cut-off Tour resumes, existing Users are offered it once, and back asks first](issues/02-resume-existing-users-back.md). Blocked by 01.
3. [03: Chapter 1, 지도: what the map shows, and what the Assistant does](issues/03-map-chapter-and-assistant-bounds.md). Blocked by 01.
4. [04: Chapter 1 ★: "@샤샤" and a meal in a 공강, made into a 비공개 파티](issues/04-map-try-meal-with-shasha.md). Blocked by 03.
5. [05: Chapter 2, 파티, with ★ a 승인제 파티 and 관악이's request, and chapter 3, 행사](issues/05-party-and-events-chapters.md). Blocked by 01.
6. [06: Chapter 2 ★: the 파티 turned on, and 관악이 on the map](issues/06-party-turn-on.md). Blocked by 05.

After 01, tickets 02, 03 and 05 can run at the same time; 04 follows 03, and 06 follows 05. 02, 03 and 05 all change the Tour's script, so each merges the integration branch before its pull request.
