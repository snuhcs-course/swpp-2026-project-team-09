# P19: Adapt prototype screens to the wireframe design

Status: ready-for-agent

## Problem Statement

The screens of P06 follow the wireframes of P09, but they stop at the map. The bottom navigation's tabs, the panels over the map and 내 정보 say "준비 중이에요". The app has no way between screens, no shared look for the elements that every later screen repeats, and no screen for the Master Switch, so it sends no position. Until these exist, P13, P14 and P15 would each lay out their screens on their own, and the app would not look like one product.

## Solution

P19 builds what the other screens stand in, and the screens that belong to no other task:

- **The shell**: the bottom navigation's 지도, 파티, 행사 and 내 정보 as tabs, with the map as the main screen keeping its state; screens above the tabs; and Android's back button closing the topmost thing.
- **The shared components** the wireframe repeats: app bars, full-screen, side and bottom panels, dialogs, segmented tabs, chips, search fields, list rows, section headers, switches, and the empty, loading and error states.
- **The Quest full screen and the Friend panel** that open from the lists on the map.
- **내 정보**: the profile and its edit form, the week of classes, the Master Switch with the User's position sent while the app is open, the 알림 centre and the 파티 badge composed from the server's lists, and sign-out.
- **The timetable screen**, with the class form and the Place picker.

P13, P14 and P15 then build their screens directly in the wireframe's arrangement, on this shell and these components.

## User Stories

1. As an SNU student, I want every screen to follow one arrangement, so that the app feels like one product.
2. As an SNU student, I want the map to stay the main screen with my Avatar on it, so that the app is about where people are.
3. As an SNU student, I want my Friends and my Quests listed at the sides of the map, and each list to open in full, so that I see my people and my plans without leaving the map.
4. As an SNU student, I want panels to open over the map and close back to it, so that I never lose my place.
5. As an SNU student, I want to move between screens as the wireframes define, so that navigation is predictable.
6. As an SNU student, I want buttons, lists, cards and switches to look and behave the same everywhere, so that I learn them once.
7. As an SNU student, I want empty, loading and error states to look the same everywhere, so that I recognise them.
8. As an SNU student, I want the back button of my phone to close the topmost panel, so that it does what Android users expect.
9. As an SNU student, I want text and touch targets large enough to use while walking, so that I can use the app on the move.
10. As a developer, I want shared components for the repeated elements, so that a later design change is made in one place.
11. As the project manager, I want each screen compared with its wireframe, so that differences are decisions and not accidents.
12. As an SNU student, I want one switch on 내 정보 that turns all my Location Sharing on or off, so that I decide when I am seen.
13. As an SNU student, I want my position sent while the switch is on and the app is open, so that my Friends see where I am.
14. As an SNU student, I want to be told when I am off campus and therefore not shared, so that I am not mistaken about being visible.
15. As an SNU student, I want to see my profile and change my name, department, admission year and interests, so that others see me as I am.
16. As an SNU student, I want to see what waits for me (Friend Requests, invitations, Meetups, requests to join, Parties opened for my Quests) in one place, with a count on the bell and on 파티, so that I miss nothing.
17. As an SNU student, I want to enter my classes with their days, hours and Places, so that the app knows my day and my Friends see my free time.
18. As an SNU student, I want to be warned when two classes overlap and still be allowed to save, so that I can keep an unusual week.
19. As an SNU student, I want to sign out from 내 정보 after confirming, so that I leave the app knowingly.

## Implementation Decisions

- The input is the wireframe canvas "SNU Now 와이어프레임" of P09. A screen follows its frames. Where a frame and a task's spec disagree on arrangement, wording or flow, the frame wins and the spec is corrected.
- Where a frame shows a feature that no task covers and no server route serves, it is not built. The control stays absent or shows "준비 중이에요", and the ticket records it among its differences from the frame.
- The screens of P06 already follow the frames, and this task does not rearrange them.
- The signed-in place is a tab layout of Expo Router. Its tab bar draws the design system's bottom navigation, and its tabs are 지도, 파티, 행사 and 내 정보. A tab's screen stays mounted, so the map keeps its camera, selection, route and lists while another tab is shown. 올리기 is no tab.
- A screen that covers the whole screen is a route above the tabs, and the stack's back closes it. What leaves the screen behind it visible (a side panel, a bottom sheet, a dialog, the card on the map) closes on Android's back through one shared means, topmost first.
- Elements that repeat across screens are shared components of the design system, shown in its catalogue: app bar, full-screen panel, side panel, bottom sheet, confirm dialog, segmented tabs, chip row, search field, list row, section header, switch row, and empty, loading and error states.
- The 파티, 행사 and 내 정보 tabs open real screens. P13 fills 파티 and 행사; this task fills 내 정보.
- The Quest full screen and the Friend panel belong to this task because they show data the app already fetches. Their buttons that lead to P13's rooms and P14's Meetups and 친구 추가 say "준비 중이에요" until those tasks connect them.
- 내 정보 is the `Profile` frame:
  - the profile card and 프로필 편집, with the fields the main server stores: name, department, admission year and interests;
  - the week grid from the server's classes;
  - the switch `친구와 위치 공유`, which is the Master Switch;
  - the rows to 친구 관리, 참여 중인 파티 and 내 퀘스트;
  - 알림;
  - 로그아웃.
- While the Master Switch is on, the permission is granted and the app is in front, the app uploads the User's position about every 5 seconds, from the one watch of the phone. The server's answers decide what follows: off campus, the switch off, a position refused. P17 adds sending in the background on top of this.
- 알림 is composed on the app from the server's existing lists, with no server change and no read or unread state. The 파티 badge counts its rows that concern 파티.
- The timetable screen is built against the server's timetable routes. The frame's class (one name, several weekdays, one time, one Place, one room) is saved as one time per weekday. It is the last ticket.
- This task changes no server behaviour and no rule.
- The screen tests of P06 keep passing. A test that fails because it looked for an element by its position is rewritten to look for it by its meaning.
- Where a frame cannot be followed because of the map module's limits, the difference is recorded with the reason.

## Testing Decisions

- The existing screen tests are the safety net: they pass before and after.
- Each screen is compared with its wireframe by a person, and the result is recorded as same, or different with the reason.
- Navigation is tested with Jest: each transition the frames define leads to the screen it names, and the back button closes the topmost panel.
- 내 정보, the sending, 알림 and the timetable are tested with Jest against the mocks, and their operations against the fake main server and the fake socket of the app's tests.
- Prior art: the screen tests of P06, and its tests against the fake server.

## Out of Scope

- New features beyond the frames, and the frames' features that no task covers: stories, the AI chat, Private Events, Private Zones, 관심 행사, 알림 설정, 친한 친구, blocking, and the 프로필 편집 fields the server does not store.
- Visual design beyond the wireframes: brand, illustrations, animation.
- The admin site.
- Changes to the wireframe canvas. It is not edited. When the screens are built, a duplicate of the canvas with the amended artboards is published as a separate artifact, so that the two can be compared side by side.
- Sending the position in the background. It belongs to P17.
- Accessibility auditing. The heuristic evaluation in Iteration 3 covers usability.

## Further Notes

- The schedule names 안진영 and 함재현 as workers.
- P19's shell and shared components come first: P13, P14 and P15 build their screens on them. P19 depends on P06 and on the API of P08.
