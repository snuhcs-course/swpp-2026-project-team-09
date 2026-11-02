# SNU Now

SNU Now is a social map for Seoul National University's Gwanak campus. Its users attend events with companions, meet friends between classes and use campus services.

## Language

### People

**User**:
A person who signed in to the app with an SNU Google account. User stories name this role "SNU student".
_Avoid_: Member (a member belongs to a Party)

**Session**:
The app signed in on one phone for a User. A User has at most one: signing in on another phone ends it.
_Avoid_: Login, device

**Administrator**:
A team member who signs in to the admin site to confirm, publish and create Global Events, and to make two Users Friends or end their friendship when setting up demo accounts. An Administrator is not a User, even when the same person also uses the app.
_Avoid_: Organizer, manager

**Avatar**:
The figure that stands for a User on the map and moves as the User moves.
_Avoid_: Pin, profile marker

**Friend**:
A User connected to another by an accepted Friend Request, an accepted Invite Link or an Administrator. Friendship is mutual.
_Avoid_: Follower, contact

**Friend ID**:
The short code by which others name a User when they send a Friend Request. Each User has one, and no two Users share it.
_Avoid_: Friend code, username, handle

**Friend Request**:
A request to become Friends, sent by a User to the holder of a Friend ID, who accepts or declines it.
_Avoid_: Follow request

**Invite Link**:
A one-time link a User sends so that whoever opens and accepts it becomes their Friend.
_Avoid_: Share link, invitation code

**Student Number**:
A User's 학번, the number by which SNU knows a student. Its first four digits are the year of admission. The library needs it to name each member of a group study room.
_Avoid_: Student ID (the 학생증), school number

**Affiliation**:
A User's 소속: undergraduate (학부), graduate (대학원) or exchange student (교환학생).
_Avoid_: Department (a department is the 학과), status

### Events

**Event**:
An activity held at a set time and place. Every Event is either a Global Event or a Private Event.

**Global Event**:
An Event published to every User, such as a departmental notice or an organizer's submission.
_Avoid_: Official event, public event

**Draft**:
A Global Event that was collected or entered but is not yet visible to Users. An Administrator publishes it, or it is published on its own once its time and place are read from its post or confirmed by a Judgement.
_Avoid_: Pending event, unverified event

**Publication Route**:
How a Global Event came to be published: by an Administrator, by the rules that read its post, or by a Judgement. Only Administrators see it.

**Judgement**:
The AI's reading of a Draft: for each session, its time and place, and the lines of the post they were read from. One call reads the Draft's whole Source Post, so a post has one Judgement, tried at most twice. A Judgement publishes the sessions that pass the server's checks and leaves the rest a Draft. It may read a session as running over a period, such as an exhibition open for several days.
_Avoid_: AI verification, AI publishing

**Unsettled post**:
A Source Post the publication step failed on or has not finished with, or whose Judgement could not be made while a Draft of it waits. Administrators see them on the Collection status page, since a Collection is recorded as a success whatever the step does.

**Private Event**:
An Event a User registers for their own use, visible only on that User's map.
_Avoid_: Personal event

### Quests

**Quest**:
An activity a User sets out to do and what Users gather around, held by one or more Users and made of one or more Sub Quests. A Quest can point at a Global Event. The screens call a Quest that several Users hold or gather for a "파티".
_Avoid_: Mission, plan

**Sub Quest**:
One step of a Quest, such as attending the event or going to a café afterwards. It carries the step's time and where it happens: a Place, a point on the map, or only the words the User wrote. Sub Quests are one level deep.
_Avoid_: Objective, task

**Holder**:
A User who holds a Quest. Each Holder tracks their own progress through its Sub Quests.
_Avoid_: Participant, assignee

**Shared Quest**:
A Quest with two or more Holders, such as matched Users or Users who joined another's Quest.
_Avoid_: Common quest

**Leader**:
The one Holder of a Quest, or the one member of a Party, who holds authority over its settings and over who enters it.
_Avoid_: Owner, host

**Join Policy**:
The Leader's setting for how Users enter a Quest or a Party: Open (whoever can see it enters at once), Approval (the Leader accepts each request) or Closed (entry by the Leader's invitation only).
_Avoid_: Visibility, privacy setting

The screens call an Open or Approval Quest a "공개 파티" and a Closed Quest a "비공개 파티". A plan with a Friend is a 비공개 파티.

**Board**:
Where an Open or Approval Quest is listed for recruiting, one of four kinds: 식사, 진로, 취미 and 공연. A Closed Quest is on none.
_Avoid_: Category

**Full**:
Said of a Quest whose Holders already number its capacity. Nobody more can enter it until a Holder leaves.
_Avoid_: Closed (Closed is a Join Policy), 마감 (an application deadline)

**Class Quest**:
A Quest for attending one of the User's own classes on a given day, derived from the User's timetable.

**Meetup** (retired in Iteration 2):
A proposal between Friends to meet. Accepting it created a Shared Quest and did not open a Party. A 비공개 파티, a Closed Quest whose Leader invites the Friend, takes its place.
_Avoid_: Appointment

**Matching**:
Finding companions for Users who want them for the same Global Event, by grouping them into a new Shared Quest or by placing one into an Open Quest for that event. They open a Party themselves when the time comes.
_Avoid_: Auto-join

### The User's day

**Timetable**:
The Classes of a User, kept from semester to semester until the User resets it.
_Avoid_: Schedule

**Class**:
A course of a User's Timetable, with the times it meets each week and, for each time, a Place if one is known.
_Avoid_: Lecture

**Free Time**:
A stretch of a User's day not taken by a Class or by a timed Sub Quest of a Quest they hold. The screens call it "공강".
_Avoid_: Spare time

### Parties

**Party**:
A group of Users who are together now and share their locations. A User opens it by hand, for one Quest or for none, and belongs to at most one Party at a time. The screens call it the "활성 파티".
_Avoid_: Group, team

### Location

**Location Sharing**:
Mutual visibility of live location within one relationship, either a friendship or a Party. Each relationship is switched on and off on its own.

**Master Switch**:
A User's single switch that turns all of their Location Sharing on or off.
_Avoid_: Global toggle, ghost mode

**Campus Boundary**:
The outline of the Gwanak campus, with 10 m around it for the error of a phone's position. A User outside it is hidden from everyone.
_Avoid_: Geofence

**Place**:
A building or a named spot on the Gwanak campus, such as 제1공학관 (301동) or 종합운동장. A User picks one from the list of Places, and a position is inside one, near one or at none.
_Avoid_: Building (a building is a Place like any other), venue, location (a location is a User's position)

**Private Zone**:
An area in which a User's location is hidden from everyone else.
_Avoid_: Hidden area

### The app

**Onboarding**:
What a new User completes after the first sign-in: confirming a name and a department.
_Avoid_: Sign-up, registration

**Lobby**:
What the app fetches to run, such as the User's profile.
_Avoid_: Home, bootstrap

**Assistant**:
The AI a User chats with from the main screen's input bar. It answers about campus services and finds Global Events and recruiting Quests, and it makes Proposals. The screens call it "SNU Now AI".
_Avoid_: Chatbot, AI agent, bot

**Proposal**:
A Quest the Assistant filled in from what a User wrote, shown for the User to make or to edit first. Nothing exists until the User makes it.
_Avoid_: Draft (a Draft is an unpublished Global Event), suggestion

**Alias**:
Words that name a Place or a Friend to the Assistant by someone's say-so rather than by the catalog: a User's own, learned from one choice of theirs; everyone's, learned once enough distinct accounts chose the same Place for the same words; or curated, written by the team for groups of buildings such as 공대. An Alias points only at a catalog Place or a current Friend.
_Avoid_: Synonym, nickname, shortcut (a Shortcut is a Suggestion)

**Induced Rule**:
A matching rule the Assistant's model wrote from the words the matcher got wrong, in a small language of restricted regular expressions over a Place's name or a User's words, and that the server put in force only after replaying it over the Resolution Events: it must fix the words of several accounts and break none. An Induced Rule never names a Place; what it writes is matched by the catalog as any words are.
_Avoid_: Learned regex, model rule, heuristic

**Suggestion**:
The one request the server picks for the moment when a User opens the chat, shown in grey and run with a tap without the model: a Proposal or a walking route. A Shortcut is a Suggestion made from what the User did before. After an answer, the Suggestion is the next line: a sentence shown in grey in the empty input, which 채우기 puts there to send.
_Avoid_: Recommendation, hint, ghost text (the grey look, not the thing)

**Resolution Event**:
One row the server keeps when a resolver answers or a User chooses, rejects or edits a candidate: the normalised words, the ids shown and the outcome, never the sentence. What Aliases are learned from and what the learning curve is measured on.
_Avoid_: Log line, conversation

### The tutorial

**Tutorial**:
The 새내기 튜토리얼: a guide for new students to the basics of campus life, made of Tutorial Quests. A User goes through it in any order, skips what does not interest them and can stop it.
_Avoid_: Quest, Onboarding (Onboarding is the name and department after the first sign-in)

**Tutorial Quest**:
One page of the Tutorial, a step of campus life such as getting the student card, which a User starts and completes. It is not a Quest: it has no Holder, Board, Sub Quest or capacity.
_Avoid_: Quest

### 관정도서관

**Library Space**:
One entry of the catalogue of 관정도서관: a reading-room sector, a size of group study room on a floor, or a media room. What a User asks to book is a Library Space, and the library then gives a seat or a room of it.
_Avoid_: Place (a Place is a building or spot on the campus), room, sector

**Library Session**:
The User logged in to 관정도서관's booking site on one phone. It stays on that phone, and the app's sign-out ends it.
_Avoid_: Session (a Session is the app signed in), library login

**Library Card**:
A card of an Assistant reply that the phone fills from 관정도서관, such as free seats or the User's bookings, and from which the User books, cancels or returns.
_Avoid_: Library pass, the library's membership card

**Booking Party**:
A 비공개 파티, a Closed Quest, made for one group-study-room booking: the booker leads it, and the Friends who will be named in the booking are invited to it.
_Avoid_: Room party, study group

**Room Request**:
The record of one group-study-room booking with companions while it gathers their consents, until it is booked, cancelled, dissolved or expired. Each companion's consent to share their Student Number is for that request only.
_Avoid_: Consent request, booking request

### Campus services

**Source**:
A page or feed outside the project that the worker server collects, such as the Co-op menu page or the shuttle operator's vehicle positions.
_Avoid_: Site, provider

**Source Post**:
One post on a Source that Global Events were read from, such as an SNU Now notice or an extra.snu program, stored once by its Source and its key on that Source. It is read as one or more numbered sessions, each linked to one Global Event. A Global Event can have several, when more than one Source posted the same event: a new post's sessions are attached to the event that exists instead of becoming a second one. A post's session (회차, `SourcePostSession`) is not a **Session**, the app signed in on one phone.
_Avoid_: Original, article, duplicate

**Same-event queue**:
The sessions of Source Posts that wait for an Administrator, since neither the rules nor the AI could say whether they are an event that exists. Each stays a Draft with its candidates, which Users do not see, until an Administrator attaches it to one, publishes it as its own or discards its Draft. Detaching is the way back from a session attached by mistake: it becomes its own Draft again, and the event keeps its Quests.
_Avoid_: Review list, pending posts

**Restaurant**:
A dining place whose daily menu a Source publishes.
_Avoid_: Cafeteria

**Travel Time**:
The time from one Place to another, on foot or by the circular shuttle.
_Avoid_: ETA, distance

**Shuttle Stop**:
One of the operator's stops on the route of the circular shuttle.
_Avoid_: Bus stop

**Collection**:
One run of the worker server reading a Source and handing what it read to the main server. A Source records its last successful Collection and its last failure.
_Avoid_: Crawl, scrape, sync

### Running the system

**Dev Server**:
The team's shared server that always runs the newest development work, which the app on a phone reaches at one fixed address instead of a laptop.
_Avoid_: Staging, test server, dev environment

**Production**:
The system that real Users' phones reach during user testing, the beta test, and the final demo. New work reaches it only through a Release.
_Avoid_: Prod server, AWS server, live server

**Release**:
A reviewed state of the code that the team puts on Production for one server or the admin site, or for all of them at once, named for that target, the day it ships in Korea, and its place among that day's Releases of the target. Different servers may run different Releases. The tag that marks the commit a Production APK was built from is not a Release.
_Avoid_: Deployment (the Dev Server deploys without Releases), version, build

**Demo Data**:
The Users, Events, Quests, Party, menus and shuttle vehicles that fill a system so that every feature can be tried at once. The Dev Server carries it alongside the team's own accounts.
_Avoid_: Fixtures, seed (the seed is the Places and other data every system needs)

**Demo Account**:
A team member's own account that Demo Data treats as a participant: it receives demo Friends, Friend Requests, a Quest invitation and a Meetup.
_Avoid_: Test account
