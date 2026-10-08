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

### Events

**Event**:
An activity held at a set time and place. Every Event is either a Global Event or a Private Event.

**Global Event**:
An Event published to every User, such as a departmental notice or an organizer's submission.
_Avoid_: Official event, public event

**Draft**:
A Global Event that was collected or entered but is not yet visible to Users. An Administrator publishes it.
_Avoid_: Pending event, unverified event

**Private Event**:
An Event a User registers for their own use, visible only on that User's map.
_Avoid_: Personal event

### Quests

**Quest**:
An activity a User sets out to do and what Users gather around, held by one or more Users and made of one or more Sub Quests. A Quest can point at a Global Event. The screens call a Quest that several Users hold or gather for a "파티".
_Avoid_: Mission, plan

**Sub Quest**:
One step of a Quest, such as attending the event or going to a café afterwards. It carries the step's time and place, and Sub Quests are one level deep.
_Avoid_: Objective, task

**Holder**:
A User who holds a Quest. Each Holder tracks their own progress through its Sub Quests.
_Avoid_: Participant, assignee

**Shared Quest**:
A Quest with two or more Holders, such as matched Users, the two Friends of an accepted Meetup or Users who joined another's Quest.
_Avoid_: Common quest

**Leader**:
The one Holder of a Quest, or the one member of a Party, who holds authority over its settings and over who enters it.
_Avoid_: Owner, host

**Join Policy**:
The Leader's setting for how Users enter a Quest or a Party: Open (whoever can see it enters at once), Approval (the Leader accepts each request) or Closed (entry by the Leader's invitation only).
_Avoid_: Visibility, privacy setting

**Board**:
Where an Open or Approval Quest is listed for recruiting, one of four kinds: 식사, 진로, 취미 and 공연. A Closed Quest is on none.
_Avoid_: Category

**Class Quest**:
A Quest for attending one of the User's own classes on a given day, derived from the User's timetable.

**Meetup**:
A proposal between Friends to meet. Accepting it creates a Shared Quest and does not open a Party.
_Avoid_: Appointment

**Matching**:
Finding companions for Users who want them for the same Global Event, by grouping them into a new Shared Quest or by placing one into an Open Quest for that event. They open a Party themselves when the time comes.
_Avoid_: Auto-join

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

### Campus services

**Source**:
A page or feed outside the project that the worker server collects, such as the Co-op menu page or the shuttle operator's vehicle positions.
_Avoid_: Site, provider

**Collection**:
One run of the worker server reading a Source and handing what it read to the main server. A Source records its last successful Collection and its last failure.
_Avoid_: Crawl, scrape, sync
