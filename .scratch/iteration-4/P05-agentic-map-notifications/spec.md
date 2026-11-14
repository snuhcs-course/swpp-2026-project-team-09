# P05: Notifications and the seat card of the agentic map

Status: ready-for-agent

Schedule row: Iteration 4 P05, package D of the agentic map (notifications, bookings, interests, and first run). Part 1 is what the first path needs (tickets 01 to 04). Part 2, at the end of this document, is the rest of the package (tickets 05 to 09).

References:
- `.scratch/iteration-4/agentic-map-design.md`: the design. Section 5 ("Notifications", "A study seat", and "Parties and invitations"), section 6.2 (the seat scene, alone), and section 7 (what is never recorded or sent).
- `.scratch/iteration-4/agentic-map-work-split.md`: section 3 (the promises between packages: the notification service, the address a notification opens, and the signal names), section 4 (who changes which files, and the order of schema changes), section 5 (the first path, column D), section 6 (the check, step 5), and section 7 (what stands in until the native Release).
- `.scratch/iteration-4/P04-push-notifications/spec.md`: the address `/main?card=<kind>:<id>`, what a tapped push opens, and the push service as the delivery layer.
- `.scratch/iteration-4/P01-agentic-map-engine/spec.md`: the request context, an app that draws answers, and where a person sets out from.
- The team wireframe canvas, rows "2. 공부할 자리 · 혼자" (boards a1 and a3) and "11. 알림 모음" (boards t12 and t19, the list).
- ADR 0007 (test levels) and ADR 0009 (new capabilities join the chat as tools and prompt fragments).

## Problem Statement

The Assistant of the agentic map speaks first at certain moments: an invitation, an answer to an invitation, and the time to leave. The app's list of notifications, "알림", shows only what waits for the User now: it is composed on the phone from the lists of waiting things, so an answer to an invitation is in it for nobody, and a row cannot say when to leave. The other packages have nothing to call when one of these moments comes, and a row of "알림" leads to a screen of its own choosing, not to the address a tapped push opens.

A User who asks for a seat to study is asked "몇 시부터 몇 시까지 예약할까요?" before anything is shown. The User does not care about the hours: a seat is free most of the day, and the useful answer is a booking card that is already filled.

## Solution

The main server gains a notification service. Another package tells it what to tell a User and when (schedule), tells it again when the time or the facts change (replace), and takes it back (cancel). The service writes the words of each kind, keeps the Notification for the User, and gives it one address, `/main?card=<kind>:<id>`, the address a tapped push opens too. "알림" lists what the service keeps beside what waits for the User, and every row that has an address opens it, so a received invitation leads to the invitation's card on the map.

The first Notifications the service keeps are the two answers to an invitation: the Leader is told that a Friend accepted, or cannot come. Both stay in the list and ring no phone.

A User who asks for a seat without a time gets a booking card filled with the longest time the reading room allows, counted from when the User arrives at 관정관.

## User Stories

1. As an SNU student invited to a party, I want the invitation in "알림", so that I find it when I open the app.
2. As an SNU student, I want a press on the invitation's row to take me to the invitation's card on the map, so that I answer where the plan is drawn.
3. As an SNU student, I want a row of "알림" and a tapped push of the same thing to open the same place, so that the app always works one way.
4. As a Leader, I want "알림" to keep that a Friend accepted my invitation, so that I can see it later without my phone ringing for it.
5. As a Leader, I want "알림" to keep that a Friend cannot come, so that I know who is left.
6. As a Leader, I want a press on such a row to open the party's card on the map.
7. As an SNU student, I want each row of the Assistant's to show its time, so that I know when it was said.
8. As an SNU student, I want the badge on "파티" and the count of new notifications to count only what waits for my answer, so that a row I can do nothing about does not keep a badge up.
9. As an SNU student, I want "알림" to update while it is open when something is told to me, so that I do not pull to refresh.
10. As an SNU student, I want to say "공부할 자리" and get a filled booking card without being asked the hours.
11. As an SNU student, I want the card's start to be the first time I can use the seat after I arrive, so that I do not book minutes I spend walking.
12. As an SNU student, I want the card to take the longest time the reading room allows, so that I do not extend it later.
13. As an SNU student, I want the card to say that it was filled for my arrival, so that I know why it starts at that time.
14. As an SNU student, I want the reply to say when I must leave for my next Class, so that I do not work it out myself.
15. As an SNU student who names a length ("두 시간만"), I want that length from my arrival.
16. As an SNU student who names a time, I want the card as I said it, as today.
17. As a User whose app does not draw answers on the map, I want the Assistant to ask for the time as it does today, so that an update of the server changes nothing for me.
18. As a developer of invitations, I want one service to hand a Notification to, with its words written in one place, so that I add one call and no text.
19. As a developer of the engine, I want to move a Notification's time when a Plan changes, and to take it back when the Plan is gone.
20. As a developer of the answer screen, I want a Notification's address to be `/main?card=<kind>:<id>`, so that a card I add later opens from "알림" with no change on the server.
21. As a developer, I want a Notification to carry no one's position, route, or arrival time beyond what its User already sees, so that "알림" never says more than the map.

## Implementation Decisions

### The notification service

- A new module of the main server holds the service, registered in the application module. It is the one place that keeps a Notification, writes its words, and gives it its address.
- **A Notification** is one thing the Assistant tells one User: its kind, the card it opens, its time, a title, and one line under it. Its identity is the User, the kind, and the card: there is at most one Notification of a kind about a card for a User. An answer to an invitation is also about the Friend who answered, so two Friends who accept into one Quest are two Notifications.
- **The three calls.** `schedule` keeps a Notification for a User from now on, with the time it is for; one kept under the same identity is overwritten. `replace` does the same only when one is kept under that identity, and answers whether it did, so that a change arriving after a cancel does not bring the Notification back. `cancel` forgets it. Each call takes the facts of the kind, never text: the service writes the words.
- **The kinds** are a closed list. This spec adds two, the answers to an invitation: `accepted` and `declined`. A later kind adds its facts, its words, and its caller in its own ticket, as a pushed kind does in the push spec.

| Kind | Told to | Title | Line | Opens | Pushed, by the design |
|---|---|---|---|---|---|
| `accepted` | The Leader | "민수가 수락했어요" | The Quest's title | The party's card, `party:<questId>` | No: it stays in the list only |
| `declined` | The Leader | "지은이 못 온대요" | The Quest's title | The party's card, `party:<questId>` | Only when a better Place exists, which needs planning again after a decline; until then it stays in the list only |

- The name in a title is the User's name as stored, with the subject particle that fits its last syllable.
- **The received invitation** is not kept by the service. Its row in "알림" comes from the list of waiting invitations, as today, so that it leaves the list when it is answered. Its words stay those of the push spec: "<Leader>님의 파티 초대" and the Quest's title. Its address is `/main?card=invitation:<invitationId>`.
- **The address.** One function makes `/main?card=<kind>:<id>` from a card's kind and id, and refuses a kind or an id outside the grammar the app reads: a kind of lowercase letters and `-`, and an id of letters, digits, `-`, `.`, and `,`. The kinds are the ids the map's cards already have (`party`, `friend`, `event`, and the others) and `invitation`.
- **Where it is kept.** Until the notification table exists, a User's Notifications are kept in Redis, in one hash for each User, with the Notification's identity as the field. A User keeps at most 100, the one with the earliest time going first, and the hash is forgotten 7 days after the last Notification was kept in it. No table is added: the list shows a received invitation without one, and the schema is changed by one package at a time. The store sits behind the service, so the table replaces it without a change to any caller.
- **Reading.** `GET /notifications` answers the signed-in User's Notifications, the latest time first, each with its identity as an id, its kind, title, line, time, and address. One whose time is still to come is in the answer with that time.
- **Telling the app.** After each call the service sends the signal `notice` to the User's open apps, which fetch the list again. The signal carries nothing.
- **Nothing rings a phone from this service yet.** Sending a kept Notification as a push at its time needs one sender across the main server's pods and comes with the notification table. The push of a received invitation stays where the push spec put it.
- **The answers to an invitation.** When an invited User accepts, the Leader is told `accepted`; when the User declines, `declined`. Each is scheduled for now, after the invitation's own change is stored, and never fails the request that caused it. An invitation the Leader cancels tells nobody.
- A Notification holds no position, no route, and no arrival time of anyone.

### "알림" in the app

- "알림" is composed from the lists it is composed from today and from the Notifications the service keeps. The kept Notifications come first, the latest first, each with its time at the right ("11:58" today, "11월 14일" for an earlier day). The rows of today follow in today's order.
- A list that fails to load is left out, as today.
- **A press.** A row with an address opens it: the app goes to the main screen with the card of the address, and the main screen opens the card with that id, or the screen the push spec names when the map holds no such card. The invitation's row has the address `/main?card=invitation:<invitationId>`, so it leads to the invitation's card once the map has one, and to the "파티" tab's invitations until then. The rows without an address lead where they lead today.
- **What counts.** The badge on "파티" and the count on "알림" in 내 정보 count what waits for the User's answer, as today. A kept Notification is listed and not counted: nothing marks it read.
- The signal `notice` fetches the kept Notifications again, and so does the connection opening again.
- The app's mock client keeps no Notification and answers an empty list.

### The seat card

- The change applies to an app that draws answers on the map. Any other app gets the system prompt and the tools it gets today, unchanged.
- **When it applies.** The User asks to book a seat (a space whose unit is a seat), for today, and names no start. The Assistant then asks nothing about the time: the tool is called without a start, and the server fills it. A named start, a room, and another day are checked as today.
- **Which seat.** Words that name no space ("공부할 자리", "아무 자리") mean 7층 열람실 일반석 (`7F-7A-zone2`), as "아무 자리" does today.
- **The arrival.** The User is ready now, or at the end of the Class or the Sub Quest the User is in. The User sets out from the Place a Plan would start from: the Place of the position the app sent, or the Place of an item that ended at most 15 minutes ago, or, for a User still in an item, that item's Place. The arrival is the ready time plus the walking minutes from there to 관정관 (Place 62-1), and the ready time itself when the User is already there or when no Place is known.
- **The time.** The start is the first 30-minute mark at or after the arrival, never before the space opens. The length is what the User named, or else the longest the space allows from that start: its maximum (6 hours for a reading-room seat), cut to its closing time, in its 30-minute steps. The result is then checked as any booking is, so a start after closing is refused in today's words.
- **The card** is today's booking card with the filled date, start, and minutes. Its first note says what it was filled for: "13:54 도착에 맞춰 최대 시간으로 채웠어요", "13:54 도착에 맞춰 채웠어요" when the User named the length, and "지금부터 최대 시간으로 채웠어요" (or "지금부터 채웠어요") when no Place is known. The site's notes follow.
- **What the model is told.** The tool's answer gives the arrival (the time, the Place the User sets out from by name, and the walking minutes) and, when an item of the User's day follows the arrival and has a Place, when to leave 관정관 for it: its start minus the walking minutes. The summary states them in words ("13:54에 도착해요. 16:00 수업이라 15:56엔 나서요."), so the reply can. No coordinate reaches the model.
- The card's key and its shape do not change, so no app change is needed to show it.

### Ownership and merge order

- `main-server/src/quests/invitations.service.ts` and the app's real-time signal handling (`mobile/src/live/live-updates.tsx`) are package C's. The tickets change only the lines they name in them, and their pull requests name the owner.
- `main-server/src/assistant/chat/chat-assistant.ts` and the gathering code are package A's. The seat ticket changes only the lines that give an app that draws answers the seat rules and the filling tool, and that let the seat's arrival use the Plan's rule of where a person sets out from.
- The app ticket uses the main screen's reading of `?card=`, which the push spec's ticket 04 adds, and merges after it.
- No ticket changes the database schema or a native file of the app.

## Testing Decisions

A good test states a behaviour a User or another package depends on, through a seam they meet. Expected values are written by hand: the words are the wireframe's, and the times are worked out from the walking table, never recomputed the way the code does.

- **The notification service, unit tests.** The words of each kind from its facts, with names that end with and without a final consonant. The address from a kind and an id, and each refusal: an uppercase kind, an empty id, and an id with a character outside the grammar.
- **The notification service, integration tests.** The seam is the started server over the database and Redis containers. Covered through the invitation routes and `GET /notifications`: an acceptance and a decline each give the Leader one Notification with its title, line, time, and address, and give the invited User none; a cancelled invitation gives none; another User reads nothing of it; no sign-in gives 401; the signal `notice` reaches the Leader. Covered through the service: a second `schedule` under the same identity overwrites; `replace` without a kept Notification keeps nothing and answers false; `cancel` forgets; the 101st drops the one with the earliest time; and the User's hash expires in 7 days. Prior art: the invitation tests and the signal tests.
- **"알림", unit tests.** The rows from the lists and the kept Notifications: their order, the time's two forms, the invitation's address, and a failed list left out. Prior art: the notification adapter's tests.
- **"알림", integration tests.** The router over the real route files with the fake main server: a kept Notification is a row with its time; a press on it goes to the main screen and opens the party's card; a press on the invitation's row ends at the "파티" tab's invitations while the map has no invitation card; the signal `notice` fetches the list again; the badge and the count leave kept Notifications out.
- **The seat card, unit tests.** The arrival and the filled time as a pure function of the day's items, the position's Place, the walking minutes, the space, and now. Boundaries: an arrival exactly on a 30-minute mark, one minute past it, a User in a Class now, a User already at 관정관, no known Place, a closing time that cuts the length, a named length, and an arrival after closing.
- **The seat card, integration tests.** The started server with the scripted model, as the library tests are today: with the `answer` capability a seat asked without a start gives a card with the filled start, minutes, and first note, and a tool answer with the arrival and the time to leave; without the capability the tool refuses a missing start as today, and the system prompt and the tools' descriptions and inputs equal today's; a named start, a room, and another day behave as today with the capability too.
- No test calls the language model, and nothing is added under the server's evaluation folder.

## Out of Scope

- **Sending a kept Notification as a push at its time**, the notification table, rows grouped by date, and a row's muted tone once it is handled. They need a stored due time and one sender across the pods, and come with the table.
- **The other kinds**: the richer words of an invitation that carries its Plan (board t3), a changed invitation, a decline when a better Place exists, a late member, a party still on, the reading-room check-in and return, a room's booking window and end, and a watched interest. Each comes with its feature and adds its facts, words, and caller.
- **The invitation's card on the map.** It needs the reading of an invitation, which is package C's.
- **The seat scene beyond the filled card**: the route to 관정관 on the map, the arrows to other floors and zones, a full floor, not booking yet when the walk takes 15 minutes or more, the booked seat's card, and the check-in and return reminders.
- Study rooms, interests, and first run: part 2.

## Further Notes

- The time to leave is kept in the list by ticket 04, once a Plan can become a party. Until a phone can be rung at that time, the list is where it stands.
- Until the native Release the list stands in for push, as the work split's section 7 says.
- The seat card is seen only with the answer switch on. With it off the app sends no `answer` capability, and the Assistant asks for the time as today.

## Part 2: The rest of the package

Part 1 ends with the first path. Part 2 is the work split's section 8 for package D, in the design's order, one pull request for each wireframe row: sending each Notification at its time (row 11), keeping a study room's plan and its booking window (row 3), storing and matching interests (row 10), and first run (row 12).

What the map draws for these rows waits for two things outside this package: an answer on the map that is not a meal's Plan (the engine's contract), and the screen that draws it. Until then each ticket answers in the card the app has today, and says so.

### Notifications at their time (ticket 05, row 11)

- **A table of Notifications** replaces the Redis hash. A row is one Notification: its User, kind, card, the person it is about, its time, its words (the title, the title while its time is still to come, the line, and the body of its push), whether it rings a phone, and when it was sent. The identity of part 1 is its unique key. The service's three calls and `GET /notifications` keep their shapes. What Redis holds at the change is not carried over.
- **One sender.** Every pod of the main server asks, at a short interval, for the Notifications that ring a phone, whose time has come, and that are not sent. It claims them in one statement that skips rows another pod holds, marks them sent, and then sends each through the push service and tells the User's open apps with the signal `notice`. A Notification is sent at most once: a pod that stops after the mark sends nothing, and the Notification is still in the list. The interval is a setting, 15 seconds by default, and 0 turns the sender off, which the tests do: they call the sender's one step themselves.
- **What rings a phone**, by the design: the time to leave (`leave-by`), and the kinds the other packages add that the design pushes. An acceptance and a decline stay in the list. The push carries the kind's title and body and the Notification's address, and nobody's position, route, or arrival time but the User's own.
- **Kept for 30 days** after its time; the sender deletes older ones.
- The sender reads the clock the Quests read, so a test moves it.

### A study room's plan stays (ticket 06, row 3)

- **A decline no longer ends the plan.** When a companion declines, withdraws, or leaves the Booking Party, the room request stays, gathering, with that companion out of it, and so does its Booking Party. The booker is told ("지은이 못 온대요", in the list and on the phone), and the request says who is out. It ends only when the booker cancels it or leaves, when its time comes unbooked, or when the booker's friendship with every remaining companion is gone.
- **Filling the group.** The booker can ask one more Friend into a gathering request. The Friend is invited into the Booking Party and asked for the Student Number consent as the others were.
- **The room's minimum decides, not the first list.** A request is ready when every remaining companion consented and the people left are at least the room's minimum. Below it the request stays gathering and says how many more are needed.
- **Answers are due by 20:00 on the day before the meeting.** A companion who has not answered by then counts as out, as after a decline. A request made after that hour for the next day has no such deadline.
- **Told at the right moments**: the booker when everyone left has consented ("모두 동의했어요", with the day, the time, and the room), and every Holder 10 minutes before the room's end ("10분 뒤 끝나요").

### The study group's time and the booking window (ticket 07, row 3)

- **The Assistant picks the time.** For an app that draws answers, "민수, 지은, 서준이랑 이번 주에 스터디" needs no date, time, or room from the User. The server picks the room size from the number of people, and three hours inside the booking window by this rule: nobody is left out, the shortest stay among the people is as long as possible, and on a tie the larger total time wins. A stay counts from a person's arrival at 관정관 (their Class's end plus the walk) to when they must leave for what follows. A named length or day is used as said.
- **The answer** is today's room booking card, filled, with one line for each person (arrival, and when they leave early or join late). The plans of other days are the next cards.
- **Outside the booking window** (more than 3 days ahead) the room request is made without a room: the invitations and the consents are gathered first. On the day the window opens for that date, at 09:00, the booker is told "예약 창이 열렸어요" with the filled booking card. The hour is the wireframe's, to be confirmed against the library.
- Only plans in which the booker arrives within one hour of the start are offered.

### Watched interests (ticket 08, row 10)

- **Telling the Assistant.** "채용 관련 행사 뜨면 알려 줘" keeps a watched interest for the User: the words as said, and the topics the Assistant read them as. "배드민턴 이제 그만 알려 줘" removes it. Only events and recruiting parties are watched: a shuttle, a free seat, a Friend's Class, and words too vague to match are answered in the wireframe's words, and nothing is kept.
- **Topics.** Each published Global Event and each recruiting Quest gets a few topic words, read by the language model once when it is published or posted, in Korean, from its title and description. "채용박람회", "커리어 페어", and "기업 설명회" share the topic "채용".
- **A match** is a shared topic between an event or a recruiting Quest and the User's interests. The User's interests are the profile's hashtags and the watched interests.
- **The everyday map** shows only the Global Events and recruiting Quests that match, and a new match carries "!" until the User opens it. A User with no watched interest and no hashtag sees up to three of today's events, faded.
- **Notifications** go only for watched interests, never for a hashtag: once when a match is published, and once on the day at the last time the User can still go.
- **The interests screen** (내 정보 → 관심사) lists the hashtags, the watched interests with a way to remove each, and what is watched.

### First run (ticket 09, row 12)

- After Onboarding, the main screen asks three things in order, each as one card over the map, and each can be skipped: the Timetable (with the reason: plans are fitted between Classes, and Friends see only a Class's building and end), interests (chips; a chosen chip is a watched interest), and one Friend (an Invite Link through the share sheet).
- The phone remembers which cards were answered or skipped. Nothing asks again; each can be done later from 내 정보.
- A User with no interest sees the faded events of ticket 08 and one line over the input that leads to choosing interests.

