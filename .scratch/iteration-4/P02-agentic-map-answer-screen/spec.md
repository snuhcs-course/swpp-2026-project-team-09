# P02: The answer screen on the map

Status: ready-for-agent

Schedule row: Iteration 4 P02, package B of the agentic map (the answer screen on the map), as far as the first path needs it.

References:
- `.scratch/iteration-4/agentic-map-design.md`: the design. Section 4 (the answer frame), section 5 ("The time band", "Many results on the map", and "Screen words"), and section 6.1 (the lunch storyline).
- `.scratch/iteration-4/agentic-map-work-split.md`: sections 4 (who changes which files), 5 (the first path), and 7 (what stands in until the native Release).
- `.scratch/iteration-4/P01-agentic-map-engine/spec.md`: the contract the screen draws, the recalculation, and how words change a Plan.
- `.scratch/iteration-4/P03-agentic-map-invitations/spec.md`: a Plan made into a Quest (`POST /plans`), the invitee's own way (`GET /quest-invitations/:id`), a Quest's members, and the signals of an answer to an invitation.
- `.scratch/iteration-4/P05-agentic-map-notifications/spec.md`: a Notification's address, `/main?card=<kind>:<id>`, which opens a card of the main screen.
- The team wireframe canvas, rows "0. 틀" and "1. 배고파" (for the invitation, boards "같이 ⑪" to "⑬").
- ADR 0007 (test levels).

## Problem Statement

The main server answers "배고파, 민수랑 같이" with a Plan: a Restaurant, a time, a Merging Point, and each person's way there. The app does not show it. The Assistant's reply opens in a chat sheet that covers the map, the request does not say where the User is, and the Plan in the reply is dropped. A User cannot see the Place, the routes, or where to meet, and cannot correct the answer except by writing another message.

## Solution

Behind a switch on the phone, off by default, an answer is shown on the map in one shape. What the User asked stays at the top as a pill, and one card at the bottom holds the rest. A Plan is drawn on the map: one line per person, the Restaurant, the flag at the Merging Point, and the other candidates, with the map moved so that all of it is visible between the pill and the card. The User corrects the answer where it is shown: a condition chip, a Friend added or removed, or a drag of the time band sends the changed conditions to the main server, which recalculates without the language model, and the map is drawn again. Words typed in the card go to the Assistant with the Plan on screen as their context.

With the switch off, the app is today's: the same chat sheet, the same request, and the same screens.

## User Stories

1. As an SNU student, I want what I asked to stay at the top while the answer is shown, so that I know what the answer is for.
2. As an SNU student, I want the answer in one card at the bottom, so that the map stays visible above it.
3. As an SNU student, I want the Friend list, the Quest list, the footprints row, and the bottom menu to give way while an answer is shown, so that the answer has the screen.
4. As an SNU student, I want to close the answer with one press and have the everyday map back.
5. As an SNU student on Android, I want the back button to close the answer, so that it does not leave the app.
6. As an SNU student, I want the cards I get today (an event, a recruiting Quest, a Restaurant, a library booking, and a Proposal) inside the new card with their buttons, so that nothing I can do today is lost.
7. As an SNU student, I want the Assistant to know where I am when I ask, so that I do not have to say it.
8. As an SNU student, I want to see on the map which Restaurant was picked and from when, so that I do not read it from a list.
9. As an SNU student, I want one line for each person from where they set out, so that I see who comes from where.
10. As an SNU student, I want a flag where I meet a Friend on the way, so that I know where to wait and when.
11. As an SNU student, I want the Place of my next Class on the map, so that I see how near the Restaurant is to it.
12. As an SNU student, I want the other Restaurants numbered on the map, and a press on one to show it, so that I compare them where they stand.
13. As an SNU student, I want arrows and a count such as "3/5" in the card, so that I can go through the candidates in order.
14. As an SNU student, I want the map to move so that the whole answer is visible between the pill and the card, so that I do not pan and zoom to find it.
15. As an SNU student, I want the map's usual markers out of the way while a Plan is drawn, and my Friends' faces to stay, so that the Plan reads clearly.
16. As an SNU student, I want the answer in at most two lines, and what it rests on only when I ask for it.
17. As an SNU student, I want chips that say which conditions the answer used: where from, until when, and with whom.
18. As an SNU student, I want to take a Friend out with the ✕ on their chip and see the Plan recalculated at once.
19. As an SNU student, I want to add a Friend from a list in the card, or by pressing their face on the map, so that I can add one whose position is not known too.
20. As an SNU student, I want to drag a handle of the time band and see the Plan recalculated when I let go, so that correcting the time is faster than writing.
21. As an SNU student, I want to see where the band was before I dragged it, and to go back with "되돌리기".
22. As an SNU student, I want a person's lane to show where the time I chose runs into their Class, so that I see why they cannot make it.
23. As an SNU student, I want to change where I set out from by pressing the chip that says it.
24. As an SNU student, I want the chip that says the time to take me to the band's handle, so that nothing else opens.
25. As an SNU student, I want to type "지은이도 불러 줘" in the card and have the Assistant change the Plan on screen, so that I can say what is easier said.
26. As an SNU student, I want the map's answer to stay visible while I type.
27. As an SNU student, I want the answer to stay and a short message when a recalculation fails, so that I lose nothing.
28. As an SNU student, I want the card to say why when no Restaurant fits the conditions I set, and a way back.
29. As a User whose phone has the switch off, I want the app to work as it does today, so that an update changes nothing for me.
30. As a member of the team, I want to turn the new screen on on my own phone without a new build, so that I can try it before it is the default.
31. As a developer of invitations, I want the Plan on screen and its conditions held in one place, so that the card's main button can be added there.
32. As a developer, I want the app's mock data for a recalculation to be copies of real answers, so that the screen never meets a shape the server does not send.
33. As a User of a screen reader, I want each mark on the map and each control of the card to have a name.
34. As an SNU student, I want one press of "이대로 초대" to make the Quest and send every invitation, so that I do not type the Plan again.
35. As an SNU student, I want a second press to make no second Quest, and a Plan that changed while I looked to be shown again and not sent.
36. As an SNU student, I want the chip of each Friend to say whether they have seen, accepted, or declined, and to change while I look.
37. As an invited Friend, I want the invitation to open on the map with my own way and when to set out, so that I can answer at once.
38. As an invited Friend, I want to accept or decline on that card, and to see nobody else's location on it.

## Implementation Decisions

### The switch

- A flag the phone keeps, off by default. A long press on the build line at the bottom of 내 정보 turns it on or off, and a toast says which. It has no visible control, so with the flag off no screen differs from today's.
- The main screen follows a change of the flag while the app runs.
- With the flag off the main screen takes the old path whole: the chat sheet, a request without a context, and the library capability alone.

### The answer frame

- The frame is shown while the flag is on and the conversation holds something: a message waiting for its reply, or a turn. A turn is the User's last message and everything after it: the Assistant's reply, a failure, and the app's own bubbles.
- **The pill** holds what the User asked, on one line, cut with an ellipsis, with a speech-bubble icon and a ✕. The ✕ forgets the conversation, a reply still on its way included, and the everyday map is back. Android's back button does the same.
- **The card** is attached to the bottom edge of the screen. While the frame is shown on the main tab the tab bar is not shown. The card's parts, from the top: the condition chips with "근거" at their right, the answer, the time band, the buttons, and the input. The card takes at most about half of the screen above it, and its content scrolls inside it.
- While the Assistant works, the card says "보는 중이에요".
- A turn is drawn with the chat's own parts, without a bubble around them: the text as Markdown, the cards with their buttons, a Proposal, the map buttons, and "다시 시도" under a failure.
- A reply that carries a Plan shows the Plan's two lines, which the server wrote, in place of the model's sentence. A reply whose answer has no Plan shows the lines that say why.
- While the frame is shown, the Friend list, the Quest list, the row of buttons with the footprints, the 편의기능 button, the zoom control, the shuttle's notice, the tutorial's start button, and the card of a pressed thing are not shown, and a press on a marker opens no card.
- **The input** is the same bar, with the placeholder "이어서 말하기" while the frame is shown. While the keyboard is up, the card's content gives way and the bar stands over the keyboard, so the map's answer stays visible.
- A card that leads elsewhere (an event to the 행사 tab, a Quest to its post, the party form, and a Proposal once made) leaves the frame as it is. A map button closes the frame and turns its layer on.
- Every way of asking the Assistant from the main screen shows the frame: the bar, 관정관's "좌석 현황", and the tutorial's ask.
- "대화 내용은 AI 제공자에게 전송돼요", which the empty chat shows today, stands above the bar while the keyboard is up and nothing is asked yet.
- A toast sits above the card.

### The request context

- With the flag on every request to the Assistant carries a request context, which also tells the server that this app draws answers. `location` is the User's position while the User is on campus, and null otherwise. `conditions` and `planId` are those of the Plan on screen, or null without one. `viewport` and `tapped` are null until an answer of the server reads them.
- "다시 시도" sends the context again.

### The answer on the map

- The conversation keeps the answer of each reply. The answer on screen is the latest reply's, or the recalculation that replaced it. It is held with the index of the Plan on screen in one place, which the map, the card, and the request context read.
- One pure function decides what the map shows for an answer and the Plan on screen: the marks, the lines, and the points the camera fits.

| What | The mark | Its words |
|---|---|---|
| The User | The User's own dot at the scene's position | The tag ("나 · 15분") |
| A Friend of the Plan | A round face with the name, with a solid ring for an exact position and a dashed ring for one taken from the Timetable | The tag ("민수 · 18분") |
| The picked Restaurant | A dot in the Quest colour with the Plan's number | The Restaurant's name and, under it, the words of the flag at that Place ("12:33 점심") |
| Another candidate | A grey dot with the number of its Plan; a press shows that Plan | The Restaurant's name |
| A Restaurant that does not fit | A faint grey dot | The reason |
| The Place of the next Class | A navy square | The tag ("13:00 수업 · 24동") |
| The Merging Point | No dot of its own | A dark flag ("12:18 민수와 만남") |

- **A face's tag** leaves out the name the face shows already: for a name of two characters or fewer, a tag that is the name alone draws no label and "민수 · 18분" reads "18분", while the name read aloud stays the whole tag.

- **Where the words go.** Places and people of one answer often stand at one point: a Friend sets out from the building whose Restaurant is a candidate. Each mark is one picture: a symbol on its point, and its words as a label at one side of it. At one point (marks within 15 metres of each other) one symbol is drawn, by this order: a person, the picked Restaurant, the next Class, a candidate, and a Restaurant that does not fit; a picked Restaurant or a candidate whose dot is not drawn carries its number in its label. Each label takes the first free side of its kind's list: the Merging Point's flag above, then below, right, and left; the picked Restaurant below, then above; a person right, then left; the next Class left, then below, right, and above; a candidate left, then right, below, and above; a Restaurant that does not fit the same as a candidate. A side is free when no earlier label at the point took it, and no other point of the answer lies within the label's reach on that side: 400 metres sideways and 50 metres up or down for a label at the left or the right, and 120 metres up or down and 150 metres sideways for one above or below. When no side is free that way, the label takes the first side of its list that no earlier label took. A label with no side left is left out, and its mark's name still says it to a screen reader. Metres are counted on a flat map: a degree of latitude is 111,320 metres, and a degree of longitude that times the cosine of the latitude.
- **The labels' area.** Labels stay inside one area of the map's view: 16 points from the left and the right edges, from 8 under the pill (under the status bar for a received invitation, which has no pill) down to 8 over the card. At the camera the answer is shown at, the sides are chosen in the view's points instead of in metres: the labels of the whole answer take sides by kind, the flags first, then the picked Restaurant, the people, the next Class, the candidates, and the Restaurants that do not fit, and a side is free when its label box stays inside the area and covers neither the symbol box (36 square) at another point nor a label placed before it. A label takes the first free side of its list that no earlier label at its point took, and one with none is left out, its mark's name still said to a screen reader. A label's box is the one `MapAnswerMark` draws: 20 from its point on its side, one or two lines high, and as wide as its words at Pretendard's letter widths with its padding, at most 180. Labels at the left of marks within 60 points of each other up and down and 36 across end on one right edge, the one furthest from their marks, and labels at the right start on one left edge; a label moves only as far as the area lets it, and not onto another mark or onto another label where that label then stands, moved or not.
- **The lines.** One straight line for each route of the scene, from its start to its end: the User's in navy, a Friend's in the Friend colour, and the way to the next Class thinner and grey. All are solid until the native Release.
- **What gives way.** While a Plan is drawn, the markers of events, Quests, Restaurants, Study Spaces, and the shuttle, the shuttle's line, and a walking route are not drawn. Friends' Avatars stay, except those of people in the Plan, whom the scene draws, and those near one of the Plan's own marks (its people, its picked Restaurant, its next Class, and its flags), within the reach of a label above or below it: the map draws every Avatar above every marker, and such an Avatar would lie over the mark or its words. The User's own Avatar gives way to the scene's.
- **The camera** goes, in one move, to where the points of the answer fit into the labels' area, with room for the labels: the room that the marks at the top and at the bottom need, and no closer than the "close" level. It is worked out from the labels' sides chosen in metres, before the camera is known; the labels then take their sides at that camera, in the area's points, and the marks are drawn so. It moves again when the Plan on screen changes and when the card's height changes. Where a campus map's lowest zoom is too close for all the points, the Plan's own points (its people, its picked Restaurant, its next Class, and its flags) are centred there instead, with the room that their own marks at the top and at the bottom need; when they do not fit either, the camera goes further out until they do, but no further than a quarter of a level inside Kakao's level 14, and where even that is too close, the picked Restaurant's side is kept in view. While a Plan is drawn, a native map may go one level further out than the level 15 at which a campus map's pinch out stops, which on a phone is closer than that lowest zoom, and the map lets its camera go to that zoom; its fit zoom, from which the screen counts its levels, stays the campus map's. Closing the answer leaves the camera where it is, but for a camera further out than the everyday map's lowest zoom, which first glides in to that zoom at the same centre; the map keeps the answer's limits until it rests there, so that it does not jump.
- The marks are pictures as every other look is. The looks of all the answer's Plans, each with its labels at the camera it is shown at, are asked for when the answer comes, so that the arrows never wait for a picture.
- **The Plan in the card**: the two lines, with their strong parts in the key colour; "근거", which opens and closes the basis; and "‹" and "›" with "3/5" when the answer has more than one Plan. The arrows go round.
- An answer without a Plan draws nothing on the map, and the everyday map stays.

### Correcting the answer

- **The chips** are the answer's, in lines that wrap rather than scroll, so that none is cut, with "근거" at the right of the first line. The chip of where the User sets out from opens the map view of 장소 선택, and the Place chosen there is sent as the User's own `from` constraint; a point that is no Place is refused with a toast. The chip of the time puts the focus on the band's end handle, and opens nothing. A person's chip has a ✕ that takes the person out. "＋ 같이" opens, in the card, the Friends who are not in the Plan in two columns of equal cells, each by the name their face shows and the distance to the picked Restaurant, nearest first; a press adds the Friend. A press on a Friend's Avatar on the map adds that Friend too.
- **The open list** follows the wireframe: the card's lines ask "누구와 같이 먹을까요?", "그대로" stands where "근거" did and closes the list, the band, the arrows, and the input give way, and the list shows whole rows only, at most four, scrolling inside the card.
- **The last row** keeps its slots: the arrows at its two ends as high as the buttons, the count in a box of its own right before "›", and "되돌리기" at a fixed width from the row's start.
- **The time band** draws the Plan's band: a lane for each person with their busy stretches, the line of now, the band from the Plan's start to its end with a handle at each end, the two ends of the range, and the band's words. A handle is dragged in steps of five minutes, inside the range, and no nearer than 15 minutes to the other handle. Letting go of the start handle sends its time as the window's `from`, and of the end handle as the window's `until`; the other bound stays as the conditions hold it. The handles are also adjustable controls, five minutes a step, for a screen reader.
- While a recalculation is on its way the band stays where it was dropped, and the chips, the handles, and the arrows take no press. One recalculation runs at a time.
- **After a drag** the band's place before it stays as a dashed outline, which stays on the band of whichever Plan is on screen, through the arrows, and "되돌리기" brings back the answer shown before the drag, without a request. Any other change of the conditions drops the outline.
- A busy stretch is drawn in the warning colour on its lane where it overlaps the window the User fixed, a bound the User did not fix counting as the Plan's own.
- **A recalculation** sends the changed conditions and the User's position to the recalculation endpoint, and its answer replaces the one on screen. After a drag of the band, the Plan with the same id stays on screen when the new answer has it, otherwise the first: the User moved the time of the Plan they look at. After any other change (a person out or in, or where the User sets out from) the first Plan of the new answer is shown, because who eats or where from changed the order of the Plans. When it fails, a toast says so and the answer on screen stays.
- **Words** typed in the card go to the Assistant with the conditions and the id of the Plan on screen in the request context. The reply's answer replaces the one on screen.
- **The mock client** answers a recalculation from stored copies of the main server's real answers, picked by who is in the conditions, whether the window's start is fixed, and where the User sets out from. It does not calculate.

### What the changes to a `PlanInput` are

Pure functions, so that the screen and the tests share them: a person taken out, a Friend added with no constraints, a bound of the window set, and the User's `from` constraint replaced. Everything else of the conditions is carried over as it is.

### Inviting as it is

- **The main button.** The card of a Plan with at least one Friend has "이대로 초대" in its last row, between the arrows, with the count after it. A Plan of the User alone has none: "여기로" is package D's.
- **The press** makes the Quest from the Plan on screen in one request (`POST /plans`): the answer's `input`, the Plan's id and start, and the User's position, as a recalculation sends it. It carries an idempotency key, one for each Plan of the answer on screen, kept until another answer is on screen: a second press, a press after a failure, and a press after looking at another Plan and coming back repeat the key, and another answer (a new reply, a recalculation, ✕) takes new ones. One request is on its way at a time: while it is, the button of whatever Plan is on screen says so and takes no press, and the chips, the handles, the arrows, and the swipe take nothing. A Quest made after its answer left the screen is told with the toast "파티를 만들고 초대를 보냈어요": it is among the User's Quests. A refusal that comes after its answer left says nothing.
- **A Plan that changed** (409 `PLAN_CHANGED`): the app recalculates from the same conditions, shows the answer as it is now, and says "계획이 바뀌었어요. 다시 확인해 주세요". Any other failure says "초대하지 못했어요. 잠시 후 다시 시도해 주세요" and leaves the card as it was.
- **After inviting** the card is the invited Quest's: its two lines say that the Quest was made and the invitations sent, and when to be there ("파티를 만들고 초대를 보냈어요", "답이 없어도 12:33에 가면 돼요", the time being the Plan's start); under them the Quest's steps in order, each with its start; and "닫기", which closes the answer. The time band, the arrows, the swipe, "＋ 같이", and the ✕ of the person chips are gone, and the chips of where from and until when take no press: the Plan is sent.
- **How each Friend stands.** A person's chip reads the name and the state: "민수 · 아직 안 봄" for an invitation that waits, "지은 · 수락" for a Friend who is in, "민수 · 거절" for one who declined, "민수 · 5분 늦음" for a late Holder, and "민수 · 빠짐" for a Friend no longer among the Quest's members (one who left, or whose invitation was taken back). The face of that person on the map carries a "?" while the invitation waits and a ✓ for a Friend who is in, accepted or late; a Friend who declined or is dropped has none. The latest word counts: the signal of an acceptance or a decline that names the Quest and the User carries the time it was heard, and the Quest's members, when the User's Quests hold the Quest with members, the time they were read. A signal heard after the members were read gives the state; otherwise the members give it, dropped for a Friend not among them. With no members known and no signal, every Friend of the request's reply is invited.
- The invited state belongs to the answer on screen: a new reply or ✕ leaves it, and the Quest stays among the User's Quests. Opening it again from the everyday map is ticket 07's.
- Words typed after inviting go to the Assistant as before.

### A received invitation

- **A card of the main screen.** With the switch on, each invitation the User received is a card of the main screen whose id is `invitation:<invitationId>`, so that a Notification's address opens it. The address is answered once the phone's switch is read and, with it on, the list of invitations is known. With the switch off there is no such card, and the address leads to the "파티" tab's invitations as today.
- **The frame without a pill.** The card nobody asked for is shown as the bottom card alone: no pill, and ✕ at the card's own corner. The lists, the bottom controls, and the tab bar give way as for an answer.
- **The map** draws the scene the server gives for the invitee (`GET /quest-invitations/:id`, with the phone's position while it is on campus): the User's own dot, a line for each leg of their way, the flags at the Merging Point and at the destination, and the Place of what follows, by the marks, the rule of labels, and the camera of an answer, the camera fitting the scene under the status bar alone. The address moves no camera itself, and opening it again while its card is shown moves nothing. Nobody else is drawn: no Avatar of a Friend or of the User's Party, also when there is no scene and the everyday map stays.
- **The card** shows whose invitation it is ("유상의 파티 초대"), the destination step's start and title ("12:33 학생회관식당에서 점심"), who is in so far ("유상, 지은과 함께"), the way's lines as the server wrote them, the Quest's steps in order, "수락" as the main button with "거절" beside it, and "초대장에는 내 길만 보여요. 다른 사람의 위치는 파티를 켠 뒤에 보여요." Off campus the app sends no position, so the server cannot tell the way (`unknown`); the card then says the server's own words for a phone off campus, "캠퍼스 밖이라 길은 그리지 못해요."
- **수락** accepts and **거절** declines, each with the endpoints the "파티" tab uses today, once for each invitation at a time; another invitation's buttons stay free. After either a toast says what happened, and the card closes to the everyday map while that invitation's card is still the one shown. A failure says so and leaves the card.
- **An invitation that waits no more**: a 404 read, the list of invitations read again without the shown one (the Leader cancelled it, or it was answered on another device), or an address of one that the known list does not hold. The toast says "이미 끝난 초대예요", the card closes or the map stays, and after a 404 the list is read again. A `quests-changed` signal reads the shown card again, since the Leader may have changed the steps.

## Testing Decisions

A good test states a behaviour a User depends on, through a seam a User or another package meets, with expected values taken from a real answer of the server or chosen by hand, never recomputed the way the code does.

- **The main screen, integration tests.** The seam is the started app's main screen over the fake main server, as the chat's tests are today. They cover: the old path with the flag off, down to the request's body; the frame's parts and what gives way; today's cards inside the card; the Plan's marks, lines, and camera fit on the plain map, by the marks' names; the arrows and a press on a candidate; the chips, the Friend list, the handles, and "되돌리기", each down to the body of the request it sends; a failed recalculation; and words sent with the Plan's context.
- **The marks, unit tests.** The seam is the function from an answer to its marks. The stored copies of real answers are its input, and the expected sides and numbers are worked out by hand from the rule above. Boundaries: two marks at one point, three, a point whose sides are all taken, an answer with a Restaurant that does not fit, and an answer without a Plan.
- **The band's arithmetic and the changes to the conditions, unit tests**, with boundaries: a drag to each end of the range, a drag past the other handle, a time between two steps, and a person who is not in the conditions.
- **Inviting and a received invitation, integration tests** at the main screen over the fake main server: the press down to the body and the key of `POST /plans`, a second press, each refusal, the card after inviting, a signal that changes a chip; the address that opens an invitation's card, its marks, and both buttons down to their requests. The replies are the stored copies of the main server's real replies that package C keeps.
- **The switch, unit and integration tests**: what the phone keeps, and the long press with its toast.
- **The marks' looks, unit tests**: each look's name, and that two looks that draw the same picture share one.
- Prior art: the chat's integration tests and their fake main server, the route and marker tests of the main screen, the marker look and marker image unit tests, and the app's API answer tests.
- The fixtures are copies of the main server's real answers. No test invents an answer's shape.
- Each screen is also run on an Android emulator with Kakao's map, and the pull request carries the screens.

## Out of Scope

- The flag of a made Quest on the everyday map and the one line above the input after closing: ticket 07. "계획 바꾸기" and "카톡으로도 보내기" of the card after inviting, the report of being late, and the offer after a decline.
- "여기로", the leave-by notification, and "파티 켜기": package D's.
- Dashed routes, a press on empty ground or on a building, and dimming the base map: the native Release. Until then the routes are solid, a Place is chosen in the map view of 장소 선택, and the usual markers are hidden.
- The count circles for many results, the "+" badge on a Friend who can be added, and the icons of the pill for a pressed building or Friend.
- The card of a pressed building and of a pressed Friend, the visible area as "이 근처", and what was tapped in the request context (row "지도에서 묻기").
- The cases of row "답할 수 없는 말과 안 되는 경우" beyond a failed request.
- Removing the chat sheet and the switch: ticket 04, once the acceptance tests are over and a Plan can become a Quest.
- The answers on the map other than a meal's Plan.

## Further Notes

- The frame is not released before 2026-11-18: the acceptance tests run on today's app. The switch stays off by default after that until the first path has passed its check; ticket 04 then makes the frame the only screen and removes the switch and the chat sheet.
- No native file of the app changes. The marks are pictures made in JavaScript, as today's looks are, and the lines are the map's own solid lines.
- A straight line stands for a route: the scene gives a route's two ends and its minutes, not its path.
