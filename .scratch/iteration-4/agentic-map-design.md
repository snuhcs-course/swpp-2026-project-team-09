# The agentic map: design

This document records the design of the agentic map: what SNU Now does when a User asks a question that involves location, how the answer looks on the map, and which rules hold behind it. The final wireframes are on the team wireframe canvas below the divider, in 13 rows with 233 boards. The notes under each row hold the details decided for that row.

## 1. The big picture

**One sentence.** From a map that shows, to a map that decides and does.

**The big picture.** SNU Now is an Assistant for questions that involve location. The questions are asked on the map, and the answers appear on the map.

**The killer feature.** From Friends' Timetables and locations and the campus's walking times, the Assistant decides the place, the time, and the merging point where everyone stays together longest while nobody is late for their next class. It draws each person's route on the map, and it sends the invitations and each person's leave-by notification. When a decline comes or someone is late, it plans again, and when I drag the time band, it recalculates on the spot.

- What others expect: it recommends a nearby restaurant.
- One step further: it decides the place, the time, and the merging point from Friends' Timetables and locations, and draws each person's route.
- Two steps further: it plans again when a decline or a late member comes in, recalculates on the spot when the time band is dragged, and tells each person when to leave.

**What is new.** The novelty claimed is the map-based agent itself: an Assistant for questions that involve location, with an interface made for it, bound to the map in both directions. The answer is drawn on the map in the shape the answer needs, and the map is where the answer is corrected.

- Conversational assistants inside map apps shipped in 2026: Ask Maps in Google Maps, Kanana in KakaoMap, and the Place Agent in Naver Map. They are steered by text and draw one user's results on the map (section 11).
- Four things were found in no product or paper that was checked. First, correcting the answer on the map: pressing a building or a face, dragging the time band, or moving the view recalculates the plan on the spot. Second, deciding the place, the time, and the merging point for several Friends from each one's Timetable, consented location, and walking time, drawn as one route per person. Third, fitting everyone's plan again after a decline or a late member. Fourth, an Assistant that uses a Friend's location only up to the level that Friend chose (Timetable only, current building, or exact location).
- The parts exist separately: midway spots for friends (Ask Maps, MeetHalfway), a meeting time (Gemini in Calendar), Friends' locations on a map (KakaoMap Friend Location), and approximate location sharing (Life360 Bubbles). So the claim is "we found none that does these together", never "the first" or "none exists".

| Map apps today | The agentic map |
|---|---|
| A search for "식당" (restaurant) shows a list | "배고파" (I'm hungry) gets one place, with the route and the leave-by time |
| Entering a start and a destination shows a route | Knowing the next item and its deadline, it decides where to stop on the way and how to travel |
| Tapping a stop shows arrival information | It decides whether to ride or to walk |
| Stops at showing | Books, invites, and marks things done |
| Answers only when asked | Speaks first, when the time comes, about what the User left to it |

## 2. What a veteran student cannot do alone

Telling a student who has been on campus for years where to eat is not attractive. Coding agents beat experienced programmers not by knowing more, but by how much work they take over and by never tiring. The Assistant earns its place the same way, where even a veteran student falls short, and there are five such places.

| | Why a veteran cannot do it | Scenes |
|---|---|---|
| Know the state now | Today's menu, places about to close, and free seats change every time | "배고파" (I'm hungry), "공부할 자리" (a seat to study) |
| Know other people's state | A Friend's Free Time and location are known only by asking | "같이" (together) |
| Find what nobody can know in full | Events and recruiting are scattered over many boards | Events, parties |
| Do the tedious work | Booking, inviting, and returning are a chore even when one knows how | "공부할 자리", parties |
| Keep watching | Nobody can keep checking boards for events and recruiting of interest | Events, parties |

**The veteran test.** A scene's answer holds at least one thing that can only be known now, or one thing the Assistant does for the User. A scene with neither is a scene for freshmen. For example, "배고파" fails when it only names nearby restaurants. It passes when the answer holds today's menu, the places closing now, the exact time left to eat, and the Friends who are free now.

## 3. A day's decisions

The app takes over the decisions of a day on campus, from classes until going home. In every scene the User speaks first. Not every feature has to fit into one day.

| When | What I say | What the Assistant decides and does | Together |
|---|---|---|---|
| Free Time starts (main scene) | "배고파" (I'm hungry) | One place on the way to the next class, the route, and the leave-by time | Tapping a nearby Friend whose Free Time overlaps gives a join-up plan and an invitation |
| Afternoon (main scene) | "공부할 자리" (a seat to study) | Books a Kwanjeong Library (관정) seat for the longest time from my arrival, reminds me of the kiosk check-in and the leave-by time, and asks about returning it when I leave the building | A study group: a time that weaves together four or more people coming and going, and a room booking |
| After class | "오늘 볼 만한 거 있어?" (Anything worth seeing today?) | One event I can go to between my remaining items, how long I can stay, the way there, and the leave-by time | Join that event's recruiting party, or, if there is none, recruit one and invite Friends |
| Evening | "배드민턴 칠 사람" (Anyone for badminton?) | Recruiting parties I can reach before they start come first; tapping "새로 모집" (recruit anew) gives a new recruiting party with the place and time filled in | Invite Friends who are free at that time; with the party on, members see each other's locations and arrival times |

- Events have two stories: a career fair for a veteran student, and the university festival for a freshman.
- The freshman package is the fifth storyline: the Tutorial's quests are placed on my own day (section 6.5).

## 4. The answer frame

**One shape.** A screen with an answer on it has one shape, however the question was asked: in words, by tapping a building, or by tapping a Friend's face. Row 0, Frame, on the team canvas draws it. Each meaning has one way of being drawn on the map: my route is navy, a Friend's route is a dashed green line, the chosen place is in the Quest color (brown), and a filtered-out place is faded gray with its reason. Only values from the snunow design system are used.

**Top pill.** The top of the screen holds only what was asked, as a pill, with an icon for how it was asked (a speech bubble for words, a pin for a building or a mark, a person for a Friend or my own dot) and a ✕ that closes the answer. While an answer is shown, the Friend list, the Quest list, the "오늘의 발자국" (today's footprints) pill, and the bottom menu are hidden.

**Bottom card.** One card attached to the bottom of the screen holds the rest: the condition chips the answer used, two lines of answer, the time band, what can be tapped, and the input field. Invitations, booking cards, and a party's "단계" (steps) are drawn inside this card too.

**Condition chips.** Each chip names a condition the answer used: where from, until when, and with whom ("301동에서", from building 301; "13:00 수업까지", until the 13:00 class). Tapping a chip changes that condition on the map, and the answer is recalculated without the model. People are added by tapping "＋ 같이" (+ together) and choosing from the Friends listed in the card, or by tapping a face on the map. The ✕ on a person chip removes that person. Tapping the chip that states the time opens nothing separate and goes to the time band's handle.

**The answer and its basis.** The answer is at most two lines. What it rests on opens only when "근거" (basis), next to the condition chips, is tapped.

**The time band.** A plan's time band has handles. The time is changed by dragging a handle or in words ("12:30까지만", only until 12:30). The band can be dragged only inside a plan, never on the everyday map. What a drag recalculates is in section 5, The time band.

**Buttons and input.** The buttons default to "‹ main button ›": the arrows move to other candidates, and a number shows which candidate is on screen ("1/4"). The input field is always visible at the bottom of the card. Tapping it brings up the keyboard in the card's place, and the answer on the map stays visible.

**What stays on the map.** Every Friend's face stays on the map while an answer is shown. A Friend who can be added to the plan carries a +. A Friend's face shows where the position comes from: a green dot for an exact location measured now, a plain border for the building the Friend is in now, and a dashed border for a position taken from the Timetable. The dashed border appears for a Friend seen through the Timetable only (during class and for 15 minutes after it ends), and for a Friend whose position at a future plan time is taken from the Timetable. Once the invitations are sent and the plan becomes a party, the person chips show who has accepted and who has not yet ("지은 · 수락", Jieun · accepted; "민수 · 아직 안 봄", Minsu · not seen yet).

**Cards nobody asked for.** A card I did not ask for, such as a received invitation, appears as the bottom card alone, with no pill.

**Closing.** Closing an answer returns to the everyday map. A party already made stays on the map as a flag ("12:33 점심 · 수락 1/2", 12:33 lunch · 1 of 2 accepted) and as one line above the input field, and tapping it opens the party again.

**How the map fits the answer.** While an answer is shown, the map moves so that the whole answer is visible between the pill and the card. When the card is too tall for all of it to fit, the map shows the destination's side.

## 5. Decisions

### The map and the Assistant

- The center is an agentic map, not a social map. The design concentrates on using what the Assistant does well together with location.
- A core feature must use the map.
- My current location is the Assistant's default context.
- The Assistant picks one answer. The other candidates are browsed with arrows on the map, not read as a list of text.
- Answers use little text and are tapped on the map.
- Every answer rests on the "지도 위 단어장" (vocabulary on the map) on the team canvas. The Assistant picks and combines seven tools to answer: reach, route, what is here, people, time fit, meeting, and order. Each tool has one way of drawing on the map. The four scenes and the other questions (menus, the shuttle, places, and search) are answered with the same tools and the same ways of drawing. The design takes the vocabulary's basic idea and adapts it to this design.
- The changes to the vocabulary: the Assistant picks one result and the rest are browsed with arrows, with no result list; the answer is one line, and the basis shows when tapped; the default start is the building of the previous class, then the current location; the meeting place is where the time together is longest, not where everyone is evenly close within 10 minutes; the people tool also uses the building of a Friend's class from the Timetable; tapping a building, tapping a face, and the time band inside a plan are added as inputs on the map; a one-line suggestion is added to the facts and question chips when the time fits; and reach is never drawn as an area, only calculated, so each candidate carries whether it can be reached, the minutes I can stay, and, for one that cannot, the reason.
- A question asked from off campus about a class on campus ("9시 수업인데 늦나", Will I be late for my 9:00 class?) is answered from the main gate ("정문을 08:50까지 지나면 09:00 수업에 맞아요", pass the main gate by 08:50 to make your 9:00 class), without using the off-campus location.
- Asking on the map has no modes. Tapping a building makes it the question's "여기" (here), tapping a Friend's face makes that Friend "이 사람" (this person), and moving the map makes the visible area "이 근처" (around here).
- On the everyday map, the things to tap are a building, a Friend's face, my own dot, and the mark of an event or a recruiting party. A tap makes that thing the question, and closing the answer returns to the everyday map. A Restaurant, Study Space, or Shuttle Stop pin, shown when its layer is turned on, opens its own card as it does today; a pin on a building takes the tap, and the rest of the building opens the building's card. In a Party that is on, the face of a member who is not a Friend opens today's card with "파티 열기" (open the party).
- Tapping a building leaves the map as it is, with the building highlighted, and the card shows its facts in my time: the minutes to get there, the minutes I can stay before my next item, and what is there now (menus, events, and Friends). A Friend my map shows in that building is one line of the card, and tapping the line opens that Friend's card. Question chips sit below, only for what has an answer: "여기서 먹기" (eat here) where there is a place to eat, "행사 보기" (see the event) and "같이 갈 파티" (a party to go with) where there is an event, and "가는 길" (the way there). When the time fits, the Assistant adds a one-line suggestion: tapping the Student Center (학생회관) at 12:10 adds "점심시간이에요. 여기서 드실래요?" (It's lunchtime. Eat here?). A building tapped during a plan becomes "여기면 어때?" (How about here?) and shows each person's arrival time and the time together; its ✕ and "그대로" (keep as is) return to the plan.
- Tapping a Friend's face on the everyday map, or the Friend in the Friend list on the map screen, opens that Friend's card; inside an answer, tapping a face adds the Friend to the plan instead. Every Friend has the same card. At current building or exact location it shows the class and until when, the building, and the minutes from me, and its subtitle names the level; at Timetable only it shows the class from the Timetable and "지금 위치는 보여 주지 않아요" (current location is not shown). Its chips are "만나고 싶다" (I want to meet), "파티 만들기" (make a party), and "어디까지 보이나" (how far we see each other). Choosing "만나고 싶다" shows on the time band when the two are both free, and shows a meeting place on the map; every plan to meet someone works this way, not only meals. "파티 만들기" opens the party form as private with that Friend chosen, as the app does today.
- Tapping my own dot shows what each Friend sees of me now ("지금 친구에게 보이는 나", what my Friends see of me now), with "바꾸기" (change), which opens the location sharing settings.
- The candidates for a meeting place are places where people gather (restaurants, cafés, and lounges) and the buildings the two people are in.
- The starting point is changed by tapping a building on the map. Turning off my own dot is not offered.

**Location questions.** Each question or action that involves location, the tools it combines, what the map shows, and what the Assistant does. Reach is not drawn; it is a calculation inside the other tools. Questions 9 to 16 are ones the app answers today in text and cards, and row 7, Other questions, draws them on the map.

| | Question or action | Tools | What the map shows | What the Assistant does |
|---|---|---|---|---|
| 1 | "배고파" (I'm hungry) | time fit, what is here (menus), people, meeting, and route | Two candidates and their routes. Tapping faces brings each person's line to one place | Invitations and the leave-by notification (section 6.1) |
| 2 | "공부할 자리" (a seat to study) | time fit, what is here (free seats), and route | The route to Kwanjeong Library, with the arrival and leave-by times | The booking card, and the check-in and return reminders (section 6.2) |
| 3 | "민수, 지은, 서준이랑 이번 주에 스터디" (a study session this week with Minsu, Jieun, and Seojun) | people, time fit, and meeting | The four people on that day and time, with each one's arrival and leave-by times | Invitations and consents, and the room booking card (section 6.2) |
| 4 | "오늘 볼 만한 거 있어?" (Anything worth seeing today?) | what is here (events), time fit, and route | One event, its route, and the minutes I can stay. What does not fit is faded with the reason | The leave-by time and recruiting parties (section 6.3) |
| 5 | "배드민턴 칠 사람" (Anyone for badminton?) | what is here (recruiting parties), time fit, and people | Parties I can reach before they start, and the ones I cannot, with the reason | A new recruiting party and invitations (section 6.4) |
| 6 | Tapping a Friend's face, then "만나고 싶다" (I want to meet) | people, time fit, and meeting | When both are free, on the time band, and a meeting place on the map | An invitation |
| 7 | Tapping a building | route, time fit, and what is here | The building highlighted; the card gives the minutes to get there, the minutes I can stay, and what is there now | Question chips, and a one-line suggestion when the time fits |
| 8 | Tapping a building during a plan ("여기면 어때?", How about here?) | meeting | Each person's arrival time and the time together | Changing the place |
| 9 | "문화관이 어디야?" (Where is Culture Hall?) | what is here and route | The building highlighted, the way there, and the minutes | Route guidance |
| 10 | "24동까지 몇 분? 늦나" (How many minutes to building 24? Will I be late?) | route and time fit | The route, the arrival time, and the leave-by time | The leave-by notification |
| 11 | "셔틀 탈까 걸을까" (Shuttle or walk?) | route | The nearest stop, the stop the shuttle passed last, and the comparison with walking | The leave-by time |
| 12 | "민수 어디야?" (Where is Minsu?) | people | Minsu's building and until when | Answers only up to the level I can see, and neither asks nor tells Minsu |
| 13 | "이 근처 조용히 공부할 곳" (a quiet place to study around here) | what is here (study spaces) | Study spaces in the visible area, with Kwanjeong's free seat count | The booking card |
| 14 | "오늘 301동식당 메뉴 뭐야?" (What's on the menu at the building 301 cafeteria today?) | what is here and route | That cafeteria, the minutes to get there, and the time I can eat | |
| 15 | "가는 길에 카페" (a café on the way) | route and what is here | Candidates on the way and the extra minutes of each detour | |
| 16 | "새내기 퀘스트 뭐부터?" (Which Tutorial Quest first?) | order | A numbered order and a time line | Guidance to the next step |

The map changes only when the answer needs a place, a route, or people. A question about a procedure or a fact gets text first, and a button opens the map.

### Scope

- The two main scenes are "배고파" (I'm hungry) and "공부할 자리" (a seat to study).
- The freshman package is a major storyline as well: it puts the Tutorial on the map (section 6.5).
- The scenes of coming to campus and going home are left out. Locations off campus are not handled.
- Every row of the wireframes is built, and the scope is not narrowed. Much of the code underneath exists already.
- Effort goes to the big picture and the killer feature. Detailed settings unrelated to the big picture are left out, since they only add work.
- User stories are not shaped by what the code does today. What is needed gets built.
- Class times in examples are time slots that exist at SNU, such as 11:00–11:50, 11:00–12:15, and 14:00–15:15.

### Friends and location

- The social part stays. Friends are always on the map screen, which is the app's philosophy. A Friend whose whereabouts are known appears on the map, and a Friend whose whereabouts are not known stays as a face in the map screen's Friend list. Friends in Free Time are at the top of that list. A Friend whose whereabouts are not known is added to a plan from the "＋ 같이" (+ together) list.
- Every Friend is assumed to be a User of this app. There is no path for a Friend without the app.
- A Friend's label rests on what the Timetable and the building decide: in class (until a time), Free Time (until a time), classes over for today, a building's name, and on the move.
- Activities such as "공부 중" (studying) or "식사 중" (eating) are never inferred. Being in a building does not mean doing that building's activity.
- Friends see the time each other's classes end and the class building, for example "12:15 302동 수업 끝" (class at building 302 ends at 12:15). The course name and the room are not shown. The current requirements (US-AI-07 and NFR-06), Iteration 3's P04 spec, and the UAT document say a Friend's classes and buildings are not shown, and they are changed together with the implementation.
- Friends see each other's Timetables. The buildings and end times of a Timetable are visible to every Friend.
- Above the Timetable, each User chooses a level for each Friend: the building they are in now, or their exact location. Each sees the other up to the lower of the two choices. A new Friend starts at the building.
- The Assistant uses only what the asker's map shows, and the server enforces this in one place.
- Another person's mention or recommendation does not change anyone's level, and creates no question or notification.
- The Assistant asks once, at two moments: when I am about to turn location off, and when I first make a plan with that Friend.
- The only change that happens without asking is lowering by place: off campus and inside a Private Zone. Buildings whose name alone reveals a person's situation would also be lowered, but no list of them is kept, because the current Place data has none: the health clinic (보건진료소) and the counseling center (상담센터) are inside the Student Center.

### Alone and together

- The storyline of "배고파" takes going alone as the baseline. When the User moves to going together, the Assistant says what changes.
- The center is a party with Friends. Public recruiting is the way when a User has no Friends or too few. The event and party scenes also show parties that Friends are in first.
- Meals are a story of eating with Friends, and events are a story of going to a party.

### Parties and invitations

- A party on screen is a Quest that several Users hold. "파티 켜기" (party on) is the glossary's Party, the "활성 파티" (active party) of the current app.
- Each person turns their Party on by hand, as today. The Assistant never turns it on or off by itself. The rule that a User is in at most one active party at a time stays. The Assistant suggests the moment by adding a "파티 켜기" button to the leave-by notification.
- A party is made in one order: a plan (time and place), then the invitation, then the acceptance.
- In the event scene, going together shows that event's recruiting parties first. When the User taps "새로 모집" (recruit anew), the Assistant plans a new party and shows the Friends free at that time as people to invite.
- The party scene uses the same frame as the event scene. Recruiting parties that I can reach before they start come first, and tapping "새로 모집" invites Friends to a new recruiting party with the place and time filled in.
- A party posted publicly for recruiting starts at the earliest time everyone in the plan can reach it, rounded up to the next 10 minutes (reaching it at 17:02 gives 17:10). A plan to meet Friends right away uses the times each person arrives as they are (the join-up at 12:18, the meal at 12:33).
- After an invitation is sent, its link can also be sent through a messenger. Opening the link opens the invitation in the app.
- A party member has one of five states: invited, accepted, declined, N minutes late, and dropped out. The person chips of the User who made the plan show them as they are.

### A study seat

- Class group projects are left out. Going together in "공부할 자리" is studying with Friends.
- Alone, the Assistant spends its effort on what comes before and after a booking, not on choosing a place. Without asking for a time, it fills a Kwanjeong Library seat's booking card for the longest time from my arrival. It reminds me of the kiosk check-in when I arrive, of the leave-by time when it comes, and of returning the seat when I leave the building. The arrows browse other floors and areas inside Kwanjeong Library. Seats are mostly free, so "where" is worth little, and the check-in and the return carry penalties.
- The wireframes draw the reading-room check-in deadline as 30 minutes after booking. The library's rules confirm it during the build.
- Together, it is a study group of four or more. The work is fixing a date, and the place is a group study room. The Kwanjeong reading rooms are for studying alone.
- The only space handled for now is Kwanjeong Library. The design leaves room to add other spaces, but Kwanjeong Library is the only place that is booked, so the main storyline is Kwanjeong Library.
- A room is not booked only for a time when all four are free. The booking also weaves in members who start first and join later, or who leave early.
- A booking takes the longest time the system allows: 6 hours for a seat and 3 hours for a group study room. When the User names a length, the booking takes that length.
- A study group that has not reached four is not dropped. The Assistant suggests other Friends free at that time, and shows the booking card once four have joined. Even after a decline, the room is booked as planned while those left are at least the room's minimum number.
- Inside the booking window (today to 3 days later), the room is booked at once. For other days and for weekly study groups, the plan and the consents are gathered first, and on the day the booking window opens a filled-in booking card appears.

### Watching interests

- The User can ask the Assistant to watch for one kind of thing: events and recruiting that match the User's interests. This belongs to the event and party scenes. Results are not filtered by the Timetable; an overlap with the Timetable is only marked.
- The everyday map shows only the events and recruiting that match the interests being watched. Other events are not put on the map, and are found by asking the Assistant ("오늘 볼 만한 거 있어?", Anything worth seeing today?).
- A newly posted event or recruiting party that matches a watched interest gets a "!" mark at its place on the map. Tapping the mark gives the same answer as asking. The events or recruiting parties at one place share one mark ("채용박람회 외 1", the job fair and 1 more), and the answer browses only those with the arrows. The "!" disappears once the mark has been opened, and a mark without it gives the same answer.
- Matching an interest means catching the same meaning in different words ("채용박람회", "커리어 페어", and "기업 설명회", all a job fair or company session), and this is the Assistant's job. In the implementation, topic tags are added in the same model call that reads collected event posts for their time and place, and a User's interests are the profile's hashtags together with the interests told to the Assistant. A match on a profile hashtag only shows on the map; notifications go only for interests told to the Assistant.

### A late member

- When a party member is late on the day, the member tells their own Assistant, with "늦어요" (I'm late) on the leave-by notification or in words such as "5분 늦어" (I'm 5 minutes late).
- The Assistant calculates from the member's actual location how late they will be and what changes in the plan, shows it to the member first, and tells the other members when the member taps.
- Only the join-up and the leave-by times change. The place and the time are not decided again.
- A member whose plan changes gets a push notification. For a member whose plan does not change, only the person chip on the party card changes.
- When the member is so late that less than 10 minutes together would be left, the Assistant asks the member whether to go anyway or drop out (15 minutes late, Minsu would arrive at 12:47 and have 8 minutes together).
- What reaches others is only the "N minutes late" the member sent and the arrival time that follows. The member's location is not passed on.
- Planning across a week, remembering "이때는 안 돼요" (I can't make it then), and planning again when a Timetable changes are not part of this design.

### The time band

- Dragging a handle on a plan's time band recalculates each person's arrival, the time together, the merging point, and the meeting place without the model, and draws them on the map at once. Where the band was before the drag stays as a dashed outline, and "되돌리기" (undo) goes back to it.
- For a person who cannot come at the new time, their row on the band marks where it overlaps their class, and the answer says who comes when.

### Many results on the map

- The map zooms out or in so that every person or place the answer found is visible (close for two, wide for nine).
- Things close to each other on the screen are grouped into one circle with a count ("자하연 쪽 5명", 5 near Jahayeon).
- When the User zooms by hand, groups merge and split again when the finger lifts. Tapping a group zooms in until that group fills the screen. People in the same building, who do not split apart, are chosen from the card.
- When four or fewer marks remain on the screen after grouping, each mark gets a tag (name, building, and minutes away). With five or more, only the one the answer's sentence points at gets a tag.
- Friends, events, and recruiting parties on the everyday map are grouped by the same rule. Events or recruiting parties at one place do not split apart, so they share one mark, named after the first with the number of the rest ("채용박람회 외 1"). Tapping that mark opens the answer, and the arrows browse what the mark holds.
- In the implementation, this rule is one function that decides the marks on the map.

### The shuttle in every route answer

- Every route answer includes the circular shuttle.
- The shuttle's actual position is not known, only the stop it passed last. The Assistant estimates its arrival from the running time between that stop and the stop where I would board, answers in the form "약 5분 뒤" (in about 5 minutes), and compares it with walking to give the leave-by time.

### Notifications

- Push notifications are part of the implementation. The moments when the Assistant speaks first (the leave-by time, an invitation, a decline when a better place exists, a booking's check-in and return, a booking window opening, and a watched interest) arrive as push notifications even when the app is closed, and also stay in the app's notification list. An acceptance stays in the list without a push. The app has no push today, so this needs one native Release.
- The leave-by notification for a route taken alone is sent only when the walk takes 5 minutes or more.

### First run

- A User opening the app for the first time is asked, in this order, for their Timetable, their interests, and one Friend to invite.
- A User who has asked the Assistant to watch no interest at all sees two or three of today's events, faded, on the map.

### Screen words

- "계획" (plan) is an answer the Assistant made that has not been sent to anyone.
- "파티" (party) is a plan whose invitations have been sent or that has been posted publicly: in the glossary, a Quest that several Users hold.
- "모집" (recruiting) is taking people into a party posted publicly. "새로 모집" (recruit anew) is the button that starts a new one.
- "단계" (step) is one thing to do in a party: a Sub Quest.
- "파티 켜기, 켜짐, 끄기" (party on, on, off) is the state in which a party's members see each other's locations: the glossary's Party, the "활성 파티" (active party) of the current app.
- "퀘스트" (quest) is used only for plans a User makes alone and for the freshman Tutorial Quests.
- "약속" (appointment) is not used on screen.

### Depth and measures

- Depth is described in two parts.
- The model's part: it pulls conditions out of words ("5분 늦어", I'm 5 minutes late; "지은은 빼고", leave out Jieun; "12:30까지만", only until 12:30), picks and combines tools, and says in one line what changed.
- The server's part: the time window of several people (Free Time minus the time to get there and the time to get to the next class), walking times and the shuttle, recalculation after a decline, a late member, or a drag of the time band, and the check of visible levels. Recalculation does not go through the model. Facts such as Timetables and locations are computed by the server directly. Users' Assistants do not talk to each other: both sides are the same server, so a conversation adds nothing and makes answers slower and less stable.
- The measures are named LQ-1 to LQ-5, after the location question set. The set (`main-server/eval/location/`) has at least 50 cases. They are built from real SNU class times, the walking table, and a fixed world and clock. Its categories are the five storylines, declines, late members, and drags of the time band. Each threshold holds per category. A category whose kind of plan is not built yet is reported as not run.

| Measure | Checked against | Passing |
|---|---|---|
| LQ-1 Everyone arrives on time | A checker written apart from the engine. From a frozen copy of the walking table, it recomputes when each person reaches the meeting and when they reach their next class | Given the right conditions, and after chips, drags, and late reports: 100%. From words: 90% of cases in all three runs. The engine beats each baseline on the same cases (exact McNemar test, p < 0.05) |
| LQ-2 Time together is the best possible | A reference solver written in a separate session from the written planning rules, without reading the engine, and checked by hand against the examples in section 6 | Time together equals the solver's, at one of the places it ranks best. Given the right conditions, and after chips, drags, and late reports: 100%, with no model call. From words: 90% of cases in all three runs |
| LQ-3 Conditions pulled out of words | At least 40 utterances in the set. An agent labels them, a person reviews the labels, and they are compared field by field after names and times are normalized | 90% of utterances fully right in all three runs. 80% of ambiguous ones asked back. No one added whom nobody named |
| LQ-4 The Assistant says no more than the asker's map shows | A table of what the asker's map shows at each level (section 7), applied to the text, cards, map data, invitation results, and socket events of every case. Also at least 30 cases that try to draw out more | No leak in any run. The table test runs on every merge, and it must fail when the visibility check is removed |
| LQ-5 Time to the answer on the map | On the server, p95 over the set, measured in one process with the model provider's network included. On a phone, p95 over 20 trials per input kind, on a mid-range Android phone over LTE that the freeze commit names | Server: 8 seconds for words. Phone: 10 seconds for words, 2 seconds for other inputs |

- There are two baselines. The first is the model alone: the same model gets the same facts as text (Timetables, Free Time, the positions the asker may see, the walking table, and the places), has no tools, and answers in a fixed JSON form. The second is the nearest place. For lunch, that is the restaurant serving the meal that is nearest the asker's start, from the earliest time everyone can arrive. Each other category writes its own rule along with its cases. Cases that call the model run three times, and the nearest-place rule runs once. Where a measure applies to a baseline, the baseline's result is reported beside the engine's.
- NFR-15 measures the walking table's own error (`main-server/eval/walking/`). A plan keeps no margin before a class. So the share of timed walks that took longer than the minutes the app shows is reported beside LQ-1.
- The set, the walking-table copy, the planning rules, both baselines, and the thresholds go into one commit before anything runs on the set, baselines included. Cases may be added later with a note, but never edited or removed.

## 6. The five storylines

Each storyline starts with what I say. The alone version is the baseline, and the Assistant says what changes when Friends join. The fifth, the freshman package, has no together version. Walking minutes in the examples are the app's walking table values, and class times are real SNU class slots.

### 6.1 Lunch: "배고파" (I'm hungry)

**Example.** Tuesday, 11:50. My class in building 301 (11:00–11:50) has just ended, and my next class is at 13:00 in building 24. Minsu has a class next door in building 302 until 12:15 (11:00–12:15). Jieun has a class in Doosan Humanities Hall (두산인문관) until 12:15 and another in the same building at 13:00, so her Free Time is only 45 minutes.

| Step | What I do | What the Assistant does | What the map shows |
|---|---|---|---|
| Alone 1 | I say "배고파" | From my location, my next class, today's menus, and closing times, it offers two places: the building 301 cafeteria (301동식당) in the building I am in, and the Student Center cafeteria (학생회관식당) next to my next class | Two cards side by side. Each card's bold line is today's menu and closing time ("오늘 제육덮밥 · 14:00까지", today: spicy pork rice bowl, until 14:00). Below it are where the place is and how long I can eat ("지금 있는 건물 · 식사 55분", the building I am in, 55 minutes to eat; "다음 수업 옆 · 식사 54분", next to my next class, 54 minutes to eat). The chosen card's route and leave-by time show |
| Alone 2 | I tap a card or swipe with the arrows | It recalculates for the chosen place. The arrows also bring the building 302 cafeteria (302동식당, the building next door) and Cafeteria 3 (3식당, on the way) | The route and eating time change. The Student Center cafeteria needs 15 minutes of walking first, but I can eat until 12:59 |
| Alone 3 | | It looks for Friends who could eat with me | Minsu (class ends 12:15 in building 302) and Jieun (class ends 12:15 in Doosan Humanities Hall) are highlighted |
| Alone 4 | I tap "여기로" (go here) | It guides me. For the building 301 cafeteria it says it will notify me at 12:45. The Student Center cafeteria is 1 minute from my next class, so it sends no leave-by notification ("수업까지 1분이라 나설 알림은 없어요", 1 minute to class, so no leave-by notification) | My route |
| Together 5 | I tap Minsu and Jieun | It picks the time all three of us can make and the place where we can eat longest: 12:33 at the Student Center cafeteria. It drops the building 301 cafeteria, which is far for Jieun | Three lines meet at one place, each with its walking time (me 15 minutes, Minsu 18 minutes, Jieun 5 minutes). The dropped building 301 cafeteria stays faded, with the reason |
| Together 6 | | It says what changes from eating alone: eating time drops from 55 minutes to 22 | |
| Together 7 | | It adds a join-up with Minsu, who is next door | A flag at building 301, "12:18 민수와 만남" (meet Minsu at 12:18) |
| Together 8 | I tap "이대로 초대" (invite as is) | It makes the plan a Quest and sends the invitations | |
| Together 9 | | It shows each Friend their own route and leave-by time. If nobody answers, my plan stays. If someone declines, it asks whether to change only when a better option exists | Each Friend's screen shows only their own route |
| Together 10 | I tap "파티 켜기" (party on) | It notifies at leave-by time and recalculates routes from each person's real location | Those who turned the Party on see each other's location and expected arrival |
| Together 11 | | At 12:55, when lunch is over and the Party is still on, it asks in a notification whether to turn it off ("파티 끄기", party off, or "켜 두기", keep it on). It never turns the Party off by itself | |

The walking times are: building 301 to the Student Center 15 minutes, to Cafeteria 3 13 minutes, and to the Jahayeon cafeteria (자하연식당) 17 minutes; building 302 to building 301 3 minutes; Doosan Humanities Hall to the Student Center 5 minutes, to the Jahayeon cafeteria 3 minutes, to Cafeteria 3 10 minutes, and to building 301 16 minutes; and to building 24, 15 minutes from building 301, 17 minutes from building 302, 1 minute from the Student Center, 5 minutes from the Jahayeon cafeteria, and 6 minutes from Cafeteria 3. Minsu leaves building 302 at 12:15 and passes the front of building 301 at 12:18, so that is the merging point.

Restaurants on the way have almost the same eating time (building 301 cafeteria 55 minutes, Student Center cafeteria 54 minutes, Cafeteria 3 51 minutes), because the total walking is the same when a place is on the way. So the alone version names no single right answer. Eating near where I am or near my next class is a matter of taste, so the Assistant shows two cards side by side, each with its reason ("지금 있는 건물", the building I am in; "다음 수업 옆", next to my next class). The other candidates come with the arrows.

With several people, one place becomes clearly better, because each person's location and time left overlap. Adding Jieun drops the building 301 cafeteria: she would arrive only at 12:31 and have to leave at 12:44, so she could eat for 13 minutes. The eating time of the remaining places depends on who joins.

| Who eats with me | First choice | Next choices |
|---|---|---|
| Jieun | Jahayeon cafeteria, 37 minutes from 12:18 | Student Center cafeteria 35 minutes, Cafeteria 3 25 minutes |
| Minsu | building 301 cafeteria, 27 minutes from 12:18 | Student Center cafeteria 26 minutes, Cafeteria 3 23 minutes |
| Minsu and Jieun | Student Center cafeteria, 22 minutes from 12:33 | Jahayeon cafeteria 20 minutes |

**Rules**

- The starting point is the building of the class right before the plan (from the Timetable) if there is one, and the current location if not. If neither is known, the invitation goes without travel time. The plan screen shows the basis ("12:15 302동 수업 끝", class in building 302 ends at 12:15; "지금 중앙도서관", now at the Central Library). The assumption that a person will still be near their current location when the meal starts is used only when eating right away.
- The plan screen shows my Friends' starting points and routes.
- An invitation carries nobody else's location. An invited Friend sees only their own route, whether or not the invited Friends are Friends with each other.
- A join-up is planned only between me and a Friend near me, never between invited Friends, whether or not they are Friends with each other.
- A join-up is part of the plan. It is set before the Quest is made, shows in the plan I confirm, and goes out with the invitation.
- A join-up is a Sub Quest. The example Quest has two steps: "12:18 301동 앞에서 만나기" (meet in front of building 301 at 12:18) and "12:33 학생회관식당에서 식사" (eat at the Student Center cafeteria at 12:33). Sub Quests are visible to every Holder, as now, so the step's name says whose step it is ("(my name), 민수: 301동 앞에서 만나기"). They are about to eat together, so knowing that two of them arrive together helps, and the merging point is an agreed Place, not anyone's current location.
- Steps are not completed on arrival. Completion stays manual, since walking past a building could complete a step by mistake.
- The only assumption is that each invited person is my Friend. Invited Friends need not be Friends with each other or be online. Being in the Friend list means using the app.
- Travel Time is the faster of walking and the circular shuttle. The shuttle time adds the walk to the stop, the wait, the ride, and the walk from the stop. The answer uses the shuttle only when it is at least 3 minutes faster than walking, and only on weekdays from 08:00 to 21:00. The wait is a value per time of day.
- A leave-by notification for a walk alone is sent only when the walk takes 5 minutes or more. The Student Center cafeteria is 1 minute from building 24, so it gets none.
- Those who turned the Party on see each other's location. Other people's routes are faint, and their expected arrivals are clear.
- A plan starts from what I say, not from a Quest. Time and place are set before the Quest is made, in the same order as today's Proposal and make, with the place and route now drawn on the map.
- When the Quest starts, only the route guidance moves to real locations. Place and time are not set again.
- A restaurant reached just before it closes may have stopped taking orders. The Assistant knows the closing time and tells the User, fading a place it would reach too close to closing ("학생회관식당 · 13:52 도착, 14:00 닫아요", Student Center cafeteria, arrive 13:52, closes at 14:00). Suggesting a convenience store when the restaurants are closed is only a fallback; the useful part is this judgment at the boundary.

**When someone is late.** A member who is late tells their own Assistant, with "늦어요" (I'm late) on the leave-by notification or by saying "5분 늦어" (I'm 5 minutes late). The Assistant works out from that member's real location how late they will be and what changes in the plan, and shows it to that member first. The others are told only when the member taps. Only the join-up and leave-by times change; the place and time stay. Members whose plan changes get a push notification, and members whose plan does not change see only the person chip change. If less than 10 minutes together would be left, the Assistant first asks them whether to go anyway or drop out (15 minutes late means arriving at 12:47, with 8 minutes together). If they drop out, the others receive only "민수 · 이번엔 빠짐" (Minsu: out this time). Others receive only the minutes late and the arrival time that follows, never the location. Row 1, Lunch, draws this in boards l1 to l6.

### 6.2 A seat to study: "공부할 자리" (a seat to study)

Studying alone and studying together are different jobs. A Kwanjeong Library (관정) reading room is for studying alone, and studying together is a study group of four or more that books a room. So the together version starts from its own sentence, not from tapping a Friend in the alone version. The only space is Kwanjeong Library for now. Study spaces outside Kwanjeong mostly serve one college and are booked their own way, so even with more spaces the app books only at Kwanjeong.

**Kwanjeong's rules**

- Reading-room seat: same day only, in 30-minute steps from 30 minutes to 6 hours, and it can be extended. A booking not confirmed at the seat kiosk (좌석배정기) within 30 minutes is released. Five unconfirmed or unreturned seats in one month block seat booking for 10 days.
- Group study room: from today to 3 days ahead, in 30-minute steps from 30 minutes to 3 hours, with no extension. The maximum is the same whatever the number of companions. The booker's and companions' names and Student Numbers are needed. Each room has a minimum: the smallest takes 4 or more (6-person room 4–6, 8-person room 6–8, 10-person room 7–10). A Quest holds up to 8, so a group of 4 to 8 can book a room through the app.
- The maximum time depends on the kind of facility: group study rooms, 창의미디어스페이스 (creative media space), and 미디어캐럴 (media carrel) 3 hours, XR Experience Center 2 hours, Creative Media Studio 4 hours, and a reading-room seat 6 hours.
- Kwanjeong is the only study space with live free seats. The other 14 have opening hours only.

**Booking rules**

- A booking takes the maximum time the system allows: 6 hours for a seat and 3 hours for a group study room. If I name a length, that length is used.
- In the alone version the Assistant does not spend its effort on choosing the place. It fills the booking card for my arrival without asking the time, and looks after what comes before and after the booking: the kiosk confirmation on arrival, the leave-by time, and the return when I leave the building. Seats are usually free, so "where" is worth little, and confirmation and return carry penalties.
- A room is not booked only for times when all four are free. Starting before someone joins and someone leaving early are planned in.
- If the group does not reach four, the plan stays and the Assistant suggests another Friend who is free at that time. When four agree, it shows the booking card. If someone declines but the rest still meet the room's minimum, the booking goes ahead.
- Inside the booking window (today to 3 days ahead) the room is booked right away. For a later date or a weekly study group, the plan and consents are collected first, and the filled booking card appears on the day the booking window opens.

#### Alone

**Example.** Wednesday, 13:50. My class in building 24 (13:00–13:50) has just ended, and my next class is at 16:00 in Doosan Humanities Hall. Building 24 to Kwanjeong is 4 minutes on foot, and Kwanjeong to Doosan Humanities Hall is 4 minutes.

| Step | What I do | What the Assistant does | What the map shows |
|---|---|---|---|
| Alone 1 | I say "공부할 자리" | It does not ask the time. It fills the booking card for a 7th-floor reading-room seat at Kwanjeong to match my arrival (13:54): from 14:00 for the maximum 6 hours (until 20:00). It also works out when I must leave for my next class (15:56) | The route from building 24 to Kwanjeong, and "관정 7층 열람실 · 13:54 도착" (Kwanjeong 7th-floor reading room, arrive 13:54) and "16:00 수업이라 15:56엔 나서요" (class at 16:00, so leave at 15:56) |
| Alone 2 | I swipe with the arrows | It shows the next candidate, the 8th-floor laptop zone (노트북존) at Kwanjeong (2 of 2). Arrival and leave-by times stay the same, since it is the same building | The seat changes |
| Alone 3 | I book from the booking card | It guides me there and says to confirm at the seat kiosk by 14:20, 30 minutes after I booked at 13:50. If the walk to Kwanjeong takes 15 minutes or more, half of the 30-minute confirmation limit, it does not book now and offers the filled booking card when I get close | The seat and my route |
| Alone 4 | I arrive at Kwanjeong | It reminds me to confirm at the kiosk | |
| Alone 5 | | It shows the leave-by time, 15:56, on the plan line of the everyday map. When I leave the building (15:57), it asks whether to return the seat or come back. If I tap "돌아올 거예요" (I'll come back), it asks once more when my class ends at 16:50. The booking runs until 20:00, so leaving without returning it and not coming back counts toward the penalty | The way to my next class |

Kwanjeong to Doosan Humanities Hall is 4 minutes, under the 5 minutes that a leave-by notification needs, so 15:56 shows only on the plan line of the everyday map. The push notification comes when I leave the building (15:57), and once more at 16:50, when my class ends, if I said I would come back. If the 7th-floor reading room is full, the card is filled with a floor that has free seats (the 6th floor in the wireframes), and the arrival and leave-by times stay the same.

#### Together

**Example.** On Tuesday I say "민수, 지은, 서준이랑 이번 주에 스터디" (a study session this week with Minsu, Jieun, and Seojun). Thursday's Timetables are below. Walking minutes are the walking table's values, and the room's free times are example values.

| | Class before | Arrives at Kwanjeong | After |
|---|---|---|---|
| Seojun | building 24, 13:00–14:50 | 14:54 | nothing |
| Jieun | Doosan Humanities Hall, 14:00–15:15 | 15:19 | class at 17:00 in Doosan Humanities Hall, leaves at 16:56 |
| I | building 301, 14:00–15:15 | 15:29 | nothing |
| Minsu | building 302, 15:30–16:45 | 17:01 | nothing |

The four are never there at the same time: Jieun leaves at 16:56 and Minsu arrives at 17:01. Booking 15:30–18:30 still gives Seojun and me the full 3 hours, Jieun 86 minutes, and Minsu 89 minutes, and three or more are together for 175 minutes. The 3 hours are chosen so that nobody is left out and the shortest stay is as long as possible; on a tie, the larger total time together wins. Taking the total alone would pick an evening slot that leaves one person out entirely (here 18:00–21:00, which Jieun cannot make). When the User names a length ("두 시간만", only two hours), that length is used.

| Step | What I do | What the Assistant does | What the map shows |
|---|---|---|---|
| Together 1 | I say "민수, 지은, 서준이랑 이번 주에 스터디" | Within the booking window, it picks 3 hours from the four Timetables and the walking times from where each person will be, and takes a room free then: "목 15:30–18:30 관정 4층 6인실. 지은은 16:56에 먼저 나서고 민수는 17:01에 합류해요" (Thursday 15:30–18:30, Kwanjeong 4th-floor 6-person room. Jieun leaves early at 16:56 and Minsu joins at 17:01) | The map for that day and time. Four lines meet at Kwanjeong, each with that person's arrival and leave-by times |
| Together 2 | I swipe with the arrows or the date band | It recalculates for other days and times | Candidates by date, with each person's time together |
| Together 3 | I tap "이대로 초대" | It makes the Booking Party (a Quest) and sends the invitations and the requests to share Student Numbers. Each invitation carries that person's arrival and leave-by times. Answers are due by 20:00 on the day before the meeting ("답은 수 20:00까지 받아요", answers by Wednesday 20:00); if four have not agreed by then, it is handled like a decline. The invitation link can also go through KakaoTalk. Answers are due by 20:00 on the day before the meeting ("답은 수 20:00까지 받아요", answers by Wednesday 20:00); if four have not agreed by then, it is handled like a decline. The invitation link can also go through KakaoTalk | |
| Together 4 | | When all agree, it shows the booking card. If the room fills in the meantime, it switches to another room at the same time and says so. If declines or silence leave fewer than four, the plan stays and it suggests another Friend free at that time ("하은이 목요일 그 시간에 비어요. 부를까요?", Haeun is free at that time on Thursday. Invite her?) If no Friend is free at that time, it offers to recruit the one missing person publicly ("한 명 모집하기", recruit one), and I accept the requests to join. The recruiting post shows only the date, time, and Kwanjeong | |
| Together 5 | I book from the booking card. On the day, I tap "파티 켜기" | It tells each person when to leave and makes sure nobody arrives so late that the booking is canceled | Those who turned the Party on see each other's location and expected arrival |
| Together 6 | | It notifies before the end. Rooms cannot be extended | |

**Outside the booking window.** For a time more than 3 days ahead, such as "다음 주 월요일에" (next Monday) or "매주 목요일에" (every Thursday), the plan, invitations, and consents come first. Three days before that day, the Assistant says "예약 창이 열렸어요" (the booking window is open) and shows the filled booking card. A weekly study group repeats this every week.

**To confirm**

- The group study room's entry rules (canceled if nobody enters within 1 hour; 3 unused bookings in 7 days block use for 3 days) are assumed in planning, and the room booking card states them. The library site states them for the 6th-floor media facilities but not for the group study rooms on the 2nd and 4th floors.
- Whether a booking holds when someone other than the booker enters first. Until this is known, the Assistant offers only plans in which the booker arrives within 1 hour of the start.

**What changes in the app**

- Today the Assistant asks back "몇 시부터 몇 시까지 예약할까요?" (from what time to what time?) when no time is given. The new flow fills the maximum time from my arrival.
- Today one decline among the invited Friends removes the Room Request and its Booking Party. The new flow keeps the plan and fills the group.
- Today a room booking needs the date, time, and room from the User. The new flow takes only the people and a rough time, and the Assistant picks the date, time, and room.
- The confirmation reminder on arrival and the return question on leaving are timed by location.
- Booking stays a tap on the booking card by the User. The Assistant only fills the card.

### 6.3 Events

An event leads to a party. The alone version picks one event I can attend between my remaining classes and says how long I can stay. The together version first shows the event's recruiting parties, and when I tap "새로 모집" (recruit anew), it plans a new party and invites Friends.

**Example.** Friday, 13:50. My class in building 24 (13:00–13:50) has just ended, and my next class is at 15:30 in building 301 (15:30–16:45). I have handed over "채용" (recruiting, as in jobs) as an interest to watch. Today there are three events: a job fair (채용박람회) in Culture Hall (문화관), 10:00–17:00; a company information session (기업 설명회) in Culture Hall, 16:00–17:00; and a club concert (동아리 정기공연) in Dure Arts Hall (두레문예관) at 18:00. Minsu's class in building 302 ends at 13:45, and Jieun's class in building 38 ends at 13:50. Both show me their Timetable only. Minsu is already in the 14:20 job fair party.

Walking: building 24 to Culture Hall 4 minutes, Culture Hall to building 301 18 minutes, building 301 to Dure Arts Hall 22 minutes, building 38 to Culture Hall 11 minutes, and building 58 to Dure Arts Hall 5 minutes. Shuttle: 2 minutes to the building 301 stop, 7 minutes from building 301 to the business school stop, 1 minute from that stop to building 58, and a wait of about 3 minutes (an example value). So the shuttle, 18 minutes, beats walking, 22 minutes, to the concert.

| Step | What I do | What the Assistant does | What the map shows |
|---|---|---|---|
| Alone 1 | I say "오늘 볼 만한 거 있어?" (anything worth seeing today?) | From today's events it picks those I can attend between my remaining classes, and puts first the job fair, which matches my watched interest: "13:54 도착 · 78분 볼 수 있어요. 15:30 수업이라 15:12엔 나서요" (arrive 13:54, 78 minutes to look around; class at 15:30, so leave at 15:12) | The route from building 24 to Culture Hall, and the event card (time, place, and "민수가 있는 파티", the party Minsu is in) |
| Alone 2 | I swipe with the arrows | It recalculates for today's other events. The club concert, which is not on my everyday map, comes up because I asked: by shuttle I leave at 17:42. An event that clashes with a class is not dropped but marked (기업 설명회 · "15:30 수업과 겹쳐요", clashes with your 15:30 class); chosen anyway, it is 4 minutes on foot, so leaving at 15:56 works and no notification is sent | The place and route change with each event |
| Alone 3 | I tap "여기로" | It guides me and says it will notify me at 15:12 | My route |
| Alone 4 | | At 15:12 it notifies me: 18 minutes to building 301, class at 15:30 | The way to my next class, Culture Hall to building 301, 18 minutes on foot, arriving 15:30 |
| Together 5 | I tap "민수가 있는 파티" on the event card | It lists the event's recruiting parties, with a party that has a Friend in it at the top: "14:20 문화관 앞 · 3/4명 · 민수 포함" (14:20 in front of Culture Hall, 3 of 4, Minsu in it), leaving at 14:16 to arrive at 14:20. A party I cannot make stays faded with the reason (the 13:30 party, "이미 시작했어요", it has already started) | The meeting place, my route, and the time I can stay (14:20–15:12, 52 minutes) |
| Together 6 | I tap the party and read its post | The post shows the count ("3/4명 · 민수 외 2명", 3 of 4, Minsu and 2 others), the leave-by time (14:16), and when I must leave (15:12). It does not join for me | |
| Together 7 | I tap "참여하기" (join) or "참여 신청" (ask to join) | Once I join (4/4), it notifies me at 14:16 so that I arrive at 14:20 | The same party as Minsu |
| Together 8 | No party fits, or I tap "새로 모집" | It plans a new party: "14:00 문화관 앞에서 만나 채용박람회" (meet in front of Culture Hall at 14:00 for the job fair), 4 people, public recruiting. 14:00 is my arrival, 13:54, rounded up. Minsu is already in a party for this event, so he is not a candidate. Jieun, free at that time, is offered as a candidate ("지은 · 13:50 38동 수업 끝", Jieun: class in building 38 ends at 13:50). If I add nobody, it goes to a confirm card with no invitation | The candidate's face and + |
| Together 9 | I tap Jieun | Jieun arrives at 14:01, so it moves the meeting time to 14:10 and says so | Jieun's route, and the time I can stay (14:10–15:12, 62 minutes) |
| Together 10 | I tap "모집 만들기" (make the party) | It shows the confirm card: today 14:10, in front of Culture Hall, 4 people, public recruiting, and an invitation to Jieun, who arrives at 14:01 | |
| Together 11 | I tap "이대로 만들기" (make as is) | It posts the party and sends Jieun the invitation, which carries her route and leave-by time. The party shows 1/4 until Jieun accepts. It says it will notify me at 14:06. The invitation can also go through KakaoTalk | The party's steps ("14:10 (my name), 지은: 문화관 앞에서 만나기", meet Jieun in front of Culture Hall at 14:10; "15:12까지 채용박람회 · 301동으로 나서기", job fair until 15:12, then leave for building 301) |
| Together 12 | | At 14:06 it notifies me: "문화관 앞까지 걸어서 4분이에요. 지은이 수락했어요" (4 minutes on foot to the front of Culture Hall; Jieun accepted) | |
| Together 13 | I tap "파티 켜기" on the notification | | Only those who turned the Party on see each other's location and expected arrival (Jieun has arrived; 3 minutes left) |

The leave-by times are 15:30 minus 18 minutes (15:12), 14:10 minus 4 minutes (14:06), and 14:20 minus 4 minutes (14:16).

**Rules**

- Starting from the mark of a watched interest on the map gives the same first answer as Alone 1, and the arrows browse only the events of that mark (the job fair and the company session). The concert, which has no mark, is found only by asking.
- A User holds one party per event, as now.
- The order is: what matches a watched interest first, then what allows a longer stay. Events that clash with a class come last.
- When no event can be attended, it says so and suggests handing over an interest to watch.
- An all-day event counts as reachable when I can stay 30 minutes or more, and an event with a start time when I arrive before it starts. The 30 minutes is the same as the current Free Time party rule.
- A new party is public recruiting by default, and Friend invitations go on top of that. If no Friend is added, the confirm card carries no invitation.
- A party with a Friend in it comes first. A Friend already in a party for the event is not a candidate for a new one.
- A public recruiting party is joined at once with "참여하기". A new party is posted after a confirm card. An invited Friend who has not accepted does not count toward the number.
- A public party's start time is the earliest time everyone can arrive, rounded up to the next 10 minutes.

**What changes in the app**

- Today the Assistant finds events and parties that fit my Free Time and shows them as cards. The new flow picks one, shows the route and the time I can stay on the map, and notifies me at the leave-by time.
- Recruiting parties are split by whether I can make them, and parties with a Friend move to the top.
- Adding a Friend while planning a new party recalculates the meeting time.

### 6.4 Parties

Parties follow the same frame as events. Among recruiting parties, the ones I can reach come first, and when I tap "새로 모집", the Assistant plans a new recruiting party and invites Friends. Unlike an event, an activity has no set place or time, so the Assistant fills in the new party's place and time.

**Example.** Thursday, 16:45. My class in building 301 (15:30–16:45) has just ended, and I have no more classes today. Seojun's class in building 24 ends at 16:45, and he shows me his Timetable only. Two badminton parties are recruiting: 17:00 at the gymnasium (체육관), 2/4, and 18:00 at the gymnasium, 3/4. No party has a Friend in it.

Walking: building 301 to the gymnasium 28 minutes, building 24 to the gymnasium 14 minutes, and building 58 to the gymnasium 4 minutes. Shuttle: 2 minutes to the building 301 stop, 7 minutes from building 301 to the business school stop, and 5 minutes from the stop to the gymnasium (1 minute to building 58 plus 4 minutes), with a wait of about 3 minutes (an example value). That is 17 minutes in all, 11 minutes faster than walking, so the answer uses the shuttle.

| Step | What I do | What the Assistant does | What the map shows |
|---|---|---|---|
| Join 1 | I say "배드민턴 칠 사람" (anyone for badminton?) | Among the recruiting badminton parties, it puts first the one I can reach before it starts: "18:00 체육관 · 3/4명" (18:00 at the gymnasium, 3 of 4), leaving at 17:43 by shuttle | The party at the gymnasium and my route from building 301 |
| Join 2 | I swipe with the arrows | It recalculates for the other recruiting party. One I cannot reach stays faded with the reason: the 17:00 party, where even the shuttle gets me there only at 17:02 | The place and route change with each party |
| Join 3 | I tap the party, read its post, and tap "참여하기" or "참여 신청" | It does not join for me. Once I join, it notifies me at 17:43 | |
| Recruit 4 | No party fits, or I tap "새로 모집" | It plans a new recruiting party. The place is where the activity happens, and the time is the earliest I can arrive, 17:02, rounded up to 17:10: "17:10 체육관, 4명, 공개 모집" (17:10 at the gymnasium, 4 people, public recruiting). It puts in first Seojun, who is free then (class in building 24 ends at 16:45; he leaves at 16:56). Removing Seojun with ✕ opens all three spots to the public | The candidate's face and line |
| Recruit 5 | I tap "이대로 만들기" | It posts the party and invites Seojun. Seojun counts only once he accepts, so the party shows 1/4 until then. His invitation says to leave at 16:56 to arrive at 17:10. On the everyday map of anyone who watches "배드민턴" (badminton), a mark appears at the gymnasium | |
| Recruit 6 | I tap "파티 켜기" on the 16:53 leave-by notification | It notifies me at the leave-by time, 16:53, for the shuttle | Those who turned the Party on see each other's location and expected arrival |

**Rules**

- When I name a time or place, it is used as said ("저녁 7시에", at 7 p.m.; "301동 근처에서", near building 301).
- When several places suit the activity, the one nearest the building of my previous item is chosen.
- "Can reach" means arriving before the start from the building of my previous item, on foot or by shuttle.
- A public party's start time is the earliest time I can arrive, rounded up to the next 10 minutes.
- A Friend who is free at the time goes into a new party's plan first. Removing that Friend opens every spot to the public.
- When no party is recruiting, it suggests a new one or handing the activity over as an interest to watch.
- Joining and asking to join stay the User's taps, as now.

**What changes in the app**

- Today's search filters by activity, time, nearby place, and open spots. The new flow adds whether I can reach the party in time and shows it on the map.
- Today's new-party card uses the time and place the User said. The new flow fills in a time and place the User did not say.
- My recruiting party appears on the map of everyone who watches the same interest.

### 6.5 The freshman package

The freshman package is the Tutorial (새내기 튜토리얼) of today's app and its Tutorial Quests, such as getting the student card. The agentic map places those quests on my own day: the Assistant orders the ones I have left so that they fit before my next class, numbers them on the map with times, answers how each one works, and guides me there.

**Example.** My class in building 24 ends at 13:50, and my next class is at 17:00 in building 58. Three Tutorial Quests are left: the health clinic (보건진료소) on the 3rd floor of the Student Center, the student card (학생증) on the 2nd floor of Dure Arts Hall, and the lost-and-found (분실물센터) on the 1st floor of the Asia Center (아시아연구소).

| Step | What I do | What the Assistant does | What the map shows |
|---|---|---|---|
| 1 | I open the app for the first time | It asks for the Timetable first and says why: plans are fitted between classes | The map and one card |
| 2 | I say "새내기 퀘스트 뭐부터?" (which Tutorial Quest first?) | It orders the three places so that all fit before the 17:00 class: the health clinic at 13:51, the student card at 14:04, and the lost-and-found at 14:15, done by 14:20. It says first what decides the order ("학생증은 MySNU 신청 다음 날부터 받아요", the student card can be collected from the day after applying on MySNU) | The three places numbered in order with their times, and the 17:00 class |
| 3 | I tap "1번부터 길 안내" (guide me from no. 1) | It guides me to the first place | My route |
| 4 | I say "학생증 어디서 받아?" (where do I get my student card?) | It answers with the facts first: the place, how to apply, and the opening hours. A "가는 길 보기" (show the way) button follows | The answer as text |
| 5 | I tap "가는 길 보기" | It compares the shuttle with walking and says when I arrive and that I am back before my next class (the shuttle is 4 minutes faster: arrive at 12:08, back before the 13:00 class) | The way there and back to my class |

**Rules**

- A quest is marked done by the User in the quest itself. The Assistant does not mark it.
- The order is the one that fits before the next class.
- A question about one quest gets the facts first and the route when asked.

**What changes in the app**

- Today the Tutorial shows its quests by category, and "지도에서 보기" (show on the map) drops a pin at one quest's place. The new flow orders several quests on my day, draws the order on the map, and answers with the route and the time.

The wireframes are row 7, boards 10 to 12, and row 12.

## 7. The location model

**What Friends always see.** Friends see each other's Timetable: the building of each class and the time it ends ("12:15 302동 수업 끝", class in building 302 ends at 12:15). They never see the course name or the room. The Timetable stays visible when a Friend is off campus, inside a Private Zone, or has turned location off.

**The two levels above it.** Above the Timetable there are two levels: "지금 있는 건물" (the building I am in now, for example "지금 학생회관", now at the Student Center) and "정확한 위치" (exact location, with expected arrival). Each User chooses one for each Friend. Two Friends see each other up to the lower of their two choices. Friends who both chose exact location see each other's exact location at all times, even outside a Party, as the app does today. There is no college level, because walking times are counted between buildings and one college spans about 10 minutes on foot.

**A new Friend's start.** For a User who has location on, a new Friend starts at "지금 있는 건물".

**During a Party.** The members of a Party, each turned on by hand, see each other's exact location and expected arrival, as now. This holds whatever level each Friend chose, and turning the Party off returns each Friend to the chosen level.

**Lowering.** Lowering a level works at once and shows nothing to the other person. With location off, that Friend sees only my Timetable, exactly as if I had never turned location on. The way to hide the Timetable as well is to end the friendship.

**A Friend seen through the Timetable only.** Such a Friend is on the map only while the Timetable says where they are: in the class building during class, and in the same building for 15 minutes after the class ends, as a dashed Avatar. At other times (a long stretch of Free Time, before the first class, after the last class, a day without classes) they are not on the map. They stay in the Friend list on the map screen, with their face and a Timetable label. The 15 minutes is the longest break between back-to-back classes (a 75-minute class ends at 12:15 and the next starts at 12:30), so a Friend with back-to-back classes never drops off the map. It is the only number, and the Assistant uses the same value.

- Map labels: "수업 중 12:15까지" (in class until 12:15) during class; "공강 14:00까지" (free until 14:00) in the 15 minutes after, or "이동 중 · 12:30 16동 수업" (on the move, class at 12:30 in building 16) when the next class follows at once.
- List labels: "공강 · 14:00까지" (free until 14:00), "첫 수업 13:00" (first class at 13:00), "오늘 수업 끝" (classes over for today), and "오늘 수업 없음" (no classes today).
- Tapping the face shows the end time and building on the card ("12:15에 24동 수업이 끝났어요 · 공강 14:00까지", class in building 24 ended at 12:15, free until 14:00), the next class ("다음 수업 14:00 · 43-1동", next class 14:00 in building 43-1), and "지금 위치는 보여 주지 않아요" (current location is not shown).
- A face in the list works like a face on the map: tapping it opens the same card and question chips, and the Friend can be added to a plan. The list puts Friends in Free Time at the top. While an answer hides the list, the list from "＋ 같이" (+ together) is used instead. Friends whose position is known are on the map, and the rest are in the list.
- The 15 dashed minutes apply only to a Friend who already showed the Timetable only when the class ended. A Friend who showed a building or exact location and then lowers it (turned off, a Private Zone, off campus) goes straight to the list, not back to the class building, and looks the same as someone who never turned location on. No mark gives the reason, and a change in a Friend's state sends no push notification.

**What the Assistant may use.** The Assistant uses only what the asker's map shows. The map and every Assistant tool get Friend data through one server function, which sets the level from the viewer and the Friend. My own location is always used exactly. The server does the calculation, and the language model receives Place names and computed minutes, not coordinates. This function is built first, and every tool has a test that it reads Friends only through it, because a single tool that bypasses it would let the Assistant say more than the map shows.

- For a Friend seen through the Timetable only, a plan in which that Friend sets out at the end of their class or within 15 minutes after uses that class building as the start and says so in the basis (in section 6.4, Seojun's class ends at 16:45 and he sets out at 16:56 for the 17:10 party). Otherwise the Assistant does not make up the Friend's position. Walking times are counted only for people whose position is known, and for that Friend it checks only that they will not be late for their next class. The answer says "하은은 지금 어디 있는지 몰라요" (I don't know where Haeun is now), the basis says "하은의 길은 하은의 초대장에 떠요. 나에게는 수락과 거절만 와요" (Haeun's route shows on her invitation; I get only accept or decline), and the condition chip reads "하은 · 자리 모름" (Haeun · position unknown).
- An invitation works out the route from the invited person's real location on their own phone. That route, the expected arrival, and whether the route could be worked out never go back to the inviter. Only accept or decline goes back, so sending invitations again and again cannot reveal a location. A person off campus sees "캠퍼스 밖이라 길은 그리지 못해요" (you're off campus, so no route can be drawn) on their own invitation instead of a route.
- Being reviewed as a candidate tells nobody anything. An invitation, when one comes, is the notification.
- Another person's Assistant mentioning or recommending me, or repeated "어디야?" (where are you?) questions, never change my level and create no question or notification.

Example: on Tuesday at 11:50, Minsu says "배고파". Jieun is counted as "12:15 두산인문관 수업 끝" (class in Doosan Humanities Hall ends at 12:15). Seojun, in Free Time, is counted as "지금 관정" (now at Kwanjeong) if he chose to show Minsu "지금 있는 건물". If he shows only his Timetable, his class building is used only within 15 minutes of his class ending, and otherwise his position is unknown. Those who tap "파티 켜기" when leaving see each other's location and expected arrival.

**The two moments the Assistant asks.** The Assistant does not guess a User's line and change it. It finds the moments when the line must be set, asks once, and remembers the answer. The trigger is always the User's own action.

- When I am about to turn location off. Tapping to turn off one Friend's switch or the Master Switch asks once: "민수에게는 지금 있는 건물만 보여 줄 수도 있어요. 어느 쪽을 골라도 민수에게는 아무 표시도 가지 않아요." (You could show Minsu only the building you are in. Whichever you choose, Minsu sees no sign of it.) The buttons are "위치 끄기" (turn location off), "건물까지만" (building only), and "취소" (cancel), with "위치 끄기" first and the same size. Below them is "시간표는 계속 보여요" (your Timetable stays visible). It asks once per Friend and once for the Master Switch, and after that the switch turns off at once. The Master Switch's question reads "모든 친구에게는 지금 있는 건물만 보여 줄 수도 있어요." (You could show all Friends only the building you are in.) "건물까지만" lowers a Friend at exact location to the building and leaves a Friend at Timetable only as they are. Chosen from one Friend's question, it applies to that Friend; chosen from the Master Switch's question, it applies to every Friend. With the Master Switch off, each Friend's chosen level stays, dimmed, and everyone sees only each other's Timetable; turning it back on returns each Friend to the chosen level.
- When I first make a plan with that Friend. When a Friend first joins a plan I made myself and the plan is set, it asks once: "민수, 지은에게 평소에 어디까지 보일까요?" (How much should Minsu and Jieun usually see?), with a line under it that says what they see now, for example "지금은 둘에게 시간표만 보여요. 뺀 친구는 그대로 둬요." (Right now both see only your Timetable. Anyone you remove stays as they are.) The buttons are "시간표만" (Timetable only), "지금 있는 건물" (the building I am in), and "정확한 위치" (exact location). The option for the current level is shown as selected ("시간표만" in the wireframe), and each name can be removed with its chip. Below them is "넘기면 지금처럼 둬요. 친구에게 알림은 가지 않아요" (skip to keep it as it is; your Friends get no notification). It does not ask when I accept an invitation: the inviter is waiting for my answer, which would press me to show more, and anyone could raise the question just by sending an invitation. A User who wants a Friend to see their exact location outside a Party chooses it here or on the Friend screen.

**What happens by place.** Only lowering happens without asking, and it follows the place, not a guess about the person.

- Off campus, a User is not shown, as now.
- Inside a Private Zone I painted, I am not shown. Once set, it asks nothing more. The build can start with picking buildings.
- In a building whose name alone reveals a person's situation, the building name is not sent. No list of such buildings is kept, because the current Place data has none: the health clinic and the counseling center are inside the Student Center.
- Raising never happens without asking. Meeting often, being near, or the other person already showing more are not consent, and the other person could create them.
- The level does not change by time of day (during class, at the library, in the evening). The class building already shows through the Timetable, and a level that changes with the time would leave the User unsure what others see.

**What is never recorded or sent.** For each Friend, only one level and the date the Assistant asked are stored. No location history is kept. Raising or lowering a level shows nothing on the other person's screen. Being searched for or recommended is never a trigger and is never reported. Nothing about an invited person's route or position goes back to the inviter. A late member sends only the minutes late and the resulting arrival time.

**What is measured.** First, LQ-4 in section 5: no answer, card, map, invitation result, or socket event shows more about a Friend than the asker's map shows. Second, once the three levels are built, each tester in the lab study and the beta is asked one question about a Friend: "지금 민수에게 내가 어떻게 보일까요?" (What does Minsu see of me now?). The choices are the three levels and "모르겠어요" (I don't know). The answer is compared with the level stored on the server and reported as k of n, with no target. Each wrong answer becomes a usability issue.

**What changes in the app.** The per-Friend switch changes from on and off to a choice of three: "시간표만" (location off), "지금 있는 건물", and "정확한 위치". Friends switched on today stay at exact location. A new Friend starts at "지금 있는 건물" instead of exact location, where a new Friend starts today. Timetable labels appear on the map. A Friend seen through the Timetable only shows as a dashed Avatar during class and for 15 minutes after, and otherwise stays in the Friend list as "공강 · 14:00까지".

**Not decided.** Today a position older than 2 minutes dims the Avatar, its name on the map reads "민수 · 3분 전" (Minsu, 3 minutes ago), and the card says "마지막 위치 3분 전" (last position 3 minutes ago); after 10 minutes the Friend leaves the map. A lowered location disappears at once, so a lost signal and a lowered level look different for up to 10 minutes. Whether the three levels keep this is not decided.

## 8. Left out, and why

- Moments to cross paths with Friends today: crossing paths is no use without something to do together; the activity comes first and the route is only the means.
- Notifications nobody asked for, such as passing a Quest's Place: the examples are narrow and the need is unclear. Notifications cover only what the User handed over (leave-by time, before an event starts, returning a seat). A one-line suggestion when the User taps something on the map stays.
- Live coordination that assumes all three people are online: often only I am online, and nobody knows when the others will read a notification, so my plan must stand without their answers.
- Giving Friends' locations only as answers: it goes against Friends always being on the map.
- Class team projects: making a party to set a time and place and then joining again at that time is not convincing, and teammates are not close Friends, which the app assumes. Their parts go too: a party with no time or place, joining by link, and passing times only inside a party.
- Watching as a general ability (the shuttle, reading-room seats): it has few uses. Only events and recruiting parties of interest are watched.
- Seats next to a Friend in a reading room: a Kwanjeong reading room is for studying alone, and studying together is a study group that books a room.
- The order of booths inside a large event: it is useful on a few days a year, and the booths are in one building, which is not a job for a campus map.
- Dragging time on the everyday map to see where Friends will be: it is not important, and it walks through a Friend's whole day.
- A drawing mode, circles, and two-point marking: the visible area and "여기까지" (up to here) do the same, and with no mode there is nothing extra to learn.
- Going home ("집 갈래", I want to go home): most of the way home is off campus (city buses and the station shuttle), and the app knows only the campus circular shuttle. The walk-or-shuttle comparison is used for travel in the other scenes.
- Turning notifications off by kind: a detail unrelated to the big picture that only adds work.
- Sharing levels that Assistants settle between themselves, and telling a person that another person's Assistant recommended them: with few Friends, such a notice reveals who searched, and another person's search would end up setting my level. The Assistant asks once at the two moments in section 7 instead and never changes a level by itself, since a two-week beta gives almost no behavior to learn from, no location history is kept, and widening what others see without the User knowing is risky.

## 9. Not in this design

These are left out of this design and looked at again after the build.

- Using the last few hours of location as context.
- A label for time spent in a building ("관정에 2시간째", two hours at Kwanjeong so far). It can be made from the single time of entering the building.
- "쓸수록 똑똑해지는 입력" (input that gets smarter with use). It is not a core feature.
- From a plan that stays alive after it is set: scheduling across a week, remembering "이때는 안 돼요" (that time doesn't work for me), and rescheduling when a Timetable changes. The member who is late on the day is in this design (section 6.1).
- The day's first screen: with the day starting around 06:00, the first time the app opens that day it shows today's classes and today's events. It is one form of watching that speaks first when the time comes.
- A Timetable change for one date only, and receiving text through the phone's share sheet.

## 10. The wireframes

The final wireframes are the 13 rows below the divider on the team's wireframe canvas (https://claude.ai/artifact/136sh65V4Trkv5KBM78Vgr). They replace the Assistant draft rows above the divider; the other screens (sign-in, parties, events, "내 정보" (my info), and the Timetable) stay as they are above it. Every row except 3 and 11 has a board that can be tapped through (the leftmost, or the second in row 0), and the note under the row holds the example's setup, where its numbers come from, and the details decided in that row. Every board is drawn by one frame component, AmKit, so a change to the frame changes every board. The board count includes the tap-through board where a row has one.

| Row | Name | Scene file | Boards | What it shows |
|---|---|---|---|---|
| 0 | Frame | AmFrame | 17 | The everyday map, asking, the answer on the map with one bottom card, the basis, condition chips, adding Friends, dragging the time band, after inviting, and the legend |
| 1 | Lunch | AmHungry | 23 | "배고파" alone with two cards and the arrows, together with Minsu and Jieun, the invitation, a decline, party on, and a member who is late |
| 2 | A seat to study, alone | AmStudy | 14 | The seat filled for 6 hours without asking, the kiosk confirmation, leaving and returning, a far start, and a full floor |
| 3 | A seat to study, together | AmStudy | 13 | Four people in a six-person group study room, other dates, invitations and Student Number consent, a decline, a full room, the room's end, and booking outside the window |
| 4 | Events | AmEvent | 23 | The interest mark and the answer it opens, one event I can attend between classes, the parties going with a Friend first, joining, and a new recruiting party with Jieun |
| 5 | Parties | AmParty | 13 | A recruiting party I can reach first, one I cannot reach faded, a new recruiting party with Seojun, the time and place I said, and no party recruiting |
| 6 | Asking on the map | AmAsk | 16 | The everyday map and what can be tapped on it, tapping a building (also one with a Friend in it), a Friend's face at each level, "만나고 싶다" (I want to meet), dragging the time band, "여기면 어때?" (how about here?) during a plan, the visible area as input, and my own dot |
| 7 | Other questions | AmMore | 20 | Questions the app answers today, drawn on the map: where a building is, minutes and lateness, shuttle or walk, where a Friend is at each level, menus, the Tutorial, seats, and grouping many results |
| 8 | What cannot be answered and what does not work | AmCant | 28 | Requests out of scope, what the Assistant will not do for others, plans that cannot be met, missing inputs, failures, waiting, and what the app does not do |
| 9 | Friends and location | AmShare | 26 | The three levels, the dashed Avatar for 15 minutes, the list, the two moments the Assistant asks, a new Friend, off campus, a Private Zone, and what a candidate sees (nothing) |
| 10 | Watching interests | AmWatch | 15 | Handing over an interest, the marks on the map, the notification, the interests screen, and requests the app does not watch |
| 11 | Notifications | AmWatch | 17 | Every moment the Assistant speaks first, from leave-by times to bookings and interests, and the in-app notification list |
| 12 | First run | AmStart | 8 | The Timetable first, interest chips, inviting one Friend, the Friend's first view, and the map with and without interests |

## 11. Existing products and papers

Surveyed on 2026-11-14 by web search: 33 products and papers. Some pages were read and some are known only from search results, and "not found" is not proof of absence.

| Name | What it does | Not found in it | Source |
|---|---|---|---|
| Ask Maps (Google Maps, 2026-03) | Answers in conversation with a customized map, routes, arrival times, and stops. Suggests midway spots for meeting friends and makes bookings. Reported to connect to the calendar (2026-08) | Correcting the answer by touching the map, using friends' locations or timetables, choosing a time, a route per person and a merging point, and fitting the plan again after a decline or a late member. Whether it works in Korea was not confirmed | https://blog.google/products-and-platforms/products/maps/ask-maps-immersive-navigation/ |
| Place Agent (Naver Map, 2026-09) | Finds places from a sentence with several conditions, gives the reason for each, and books | A plan for several people, and correcting on the map. How the answer is drawn on the map was not confirmed | https://byline.network/2026/09/17_naver_2/ |
| Kanana's "AI 추천" (AI recommendation; KakaoMap, reported 2026-07) | Builds a travel course that considers the route, lets the user compare places on the map, and books | A plan for several people, and correcting on the map | https://biz.sbs.co.kr/amp/article/20000325513 |
| Kanana (KakaoTalk, 2026-03) | Reads an appointment from a chat, suggests places, adds it as an event, and reminds in the morning | A map, and deciding from each person's location and time | https://news.mtn.co.kr/news-detail/2026031717423575778 |
| Friend Location (KakaoMap, revised 2025-11) | Shows consenting friends' live locations on the map. A user can hide per group | An assistant that plans with those locations | https://www.kakaocorp.com/page/detail/12194 |
| MeetHalfway (2026) | Picks a fair place from the travel times of 2 to 10 people | A time, timetables, and a route per person | https://www.producthunt.com/products/meethalfway |
| Gemini in Calendar (2025-10) | Picks a meeting time when everyone is free | A place, locations, and travel time | https://techcrunch.com/2025/10/14/googles-gemini-can-now-help-you-schedule-google-calendar-meetings |
| Bubbles (Life360, 2020) | Shares only an approximate area | An assistant that plans at that level, and a level that shows only the timetable | https://techcrunch.com/2020/10/12/family-tracking-app-life360-launches-bubbles-a-location-sharing-feature-inspired-by-teens-on-tiktok |
| MapStory (UIST 2025, paper) | An agent decides the map's camera, highlighted areas, and animated paths, for authoring map animations | A plan for people, and correcting by touching the map. A prototype | https://arxiv.org/abs/2505.21966 |
| IMAIA (CVPR 2026, paper) | Reads the map on screen as the context of the conversation | Correcting by pressing or dragging, and a plan for several people. A prototype | https://arxiv.org/abs/2507.06993 |

Not confirmed: Continua, an assistant that joins group chats (reported 2025-08), is reported to collect availability, suggest a meeting time, and suggest a meeting place from everyone's location, but its pages could not be read. It may be the closest. Wabi, Apple's Siri AI, and Snap Map's settings were not confirmed either.

## 12. What remains

1. Share the design with the team and revise it from their feedback. The 13 wireframe rows are the final screens for the map and the Assistant.
2. Build it. The work is split into four packages (`.scratch/iteration-4/agentic-map-work-split.md`): the engine and its contract; the answer screens on the map; invitations, parties, and Friend locations; and notifications, bookings, interests, and first run. The killer feature comes first. The scope (all 13 rows), how the depth is presented, and what is measured are decided above. The review of this design is in `.scratch/iteration-4/design-review-2026-11-14.md`.
3. One thing to check during the build: the reading-room confirmation deadline. The wireframes count 30 minutes from the booking; the library's rules decide whether it counts from the booking or from the start time.
4. Measure. Run LQ-1 to LQ-5 of section 5 against the two baselines. Run a lab study: 8 to 12 participants make the same corrections (adding a person, moving the time, changing the start) on the map and in words, in alternating order. The hypothesis is declared before the sessions: success on the map is no lower than in words, and the median time is lower. Paired differences are reported with 95% intervals. Ask SUS and one usefulness question after each acceptance session. Lunch with a Friend on the map (section 6.1) is added as acceptance story UAT-6, beside the five frozen ones.
5. What to look at again after the build is in section 9.
