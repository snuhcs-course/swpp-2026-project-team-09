# P08: Connect basic matching and location sync

Status: ready-for-agent

## Problem Statement

A User who wants to attend an event has nobody to go with and no way to find companions. A User who wants to meet a Friend has to ask where they are. Once people agree to go somewhere together, they cannot see each other on the map. The screens planned for P06, P13 and P14 have nothing to connect to.

## Solution

The servers provide everything that lets Users find each other and see each other. Users become Friends through a Friend Request or an Invite Link and propose Meetups. A User picks a Global Event and gets a Quest, alone or through Matching with others. Users form a Party to be together now. Friends and Party members see each other's Avatars move in real time, under switches each User controls. Changes made by one User reach the others' apps without the others asking.

This spec is large because the restart left most domain work without a task of its own. It is organised by feature, and each ticket is delivered by its own pull request.

## User Stories

### Friends

1. As an SNU student, I want a Friend ID of my own that I can read and copy, so that I can give it to someone in any way I like.
2. As an SNU student, I want to enter someone's Friend ID and see whose it is before I send a Friend Request, so that I do not ask the wrong person.
3. As an SNU student, I want to see the Friend Requests sent to me with who sent them, so that I can answer.
4. As an SNU student, I want to accept or decline a Friend Request, so that nobody becomes my Friend without my decision.
5. As an SNU student, I want to see the Friend Requests I sent and to cancel one, so that I can change my mind.
6. As an SNU student, I want to become Friends at once when the person I ask has already asked me, so that we do not answer each other twice.
7. As an SNU student, I want to be told when a Friend ID is unknown, my own, a Friend's, or already asked, so that I understand why no request was sent.
8. As an SNU student, I want to create an Invite Link, so that I can send it to someone through any messenger.
9. As an SNU student, I want an Invite Link to work once and to expire after 24 hours, so that a leaked link does not expose my location.
10. As an SNU student who opened an Invite Link, I want to see who sent it, so that I know whom I am accepting.
11. As an SNU student who is about to become a Friend, I want to be told that accepting starts mutual Location Sharing, so that I consent knowingly.
12. As an SNU student, I want to become Friends by accepting an Invite Link, so that no further step is needed.
13. As an SNU student, I want to decline or ignore an Invite Link, so that nothing happens without my decision.
14. As an SNU student, I want to be told when a link is used, expired, my own, or from someone already my Friend, so that I understand why it did nothing.
15. As an SNU student, I want to list my Friends, so that I know whom I share with.
16. As an SNU student, I want to end a friendship, so that the other person stops seeing me at once.
17. As an SNU student, I want a switch for each Friend, so that I can stop sharing with one person only.

### Meetup

18. As an SNU student, I want to propose a Meetup to a Friend with a title, a place, a start time and an optional end time, so that we can agree to meet.
19. As an SNU student, I want to see the Meetups proposed to me, so that I can answer.
20. As an SNU student, I want to accept or decline a Meetup, so that the proposer knows.
21. As two Friends, we want an accepted Meetup to become a Shared Quest, so that we both see the same plan.
22. As the proposer, I want to withdraw a Meetup that was not answered yet, so that I can change my mind.
23. As the proposer, I want to be told that a sent Meetup cannot be edited, so that I withdraw it and send a new one instead.
24. As an SNU student, I want an unanswered Meetup to expire at its start time, so that old proposals do not pile up.
25. As either Friend, I want to drop the Shared Quest of an accepted Meetup and have the other see that I left, so that the other knows it is off.
26. As an SNU student choosing a point on the map, I want the point named after the Place it is in or near, so that a Meetup or a Sub Quest shows a name instead of coordinates.

### Quest

27. As an SNU student, I want to choose a Global Event to attend and get a Quest for it, so that my plan is recorded even when I go alone.
28. As an SNU student who already holds a Quest for a Global Event, I want attending it again to give me that same Quest, so that I never hold two for one event.
29. As a Holder, I want the Quest to start with a Sub Quest for attending the event with the event's time and place, so that I do not enter them again.
30. As a Holder, I want to add a Sub Quest such as going to a café afterwards, so that the plan covers what we do next.
31. As a Holder, I want to edit or cancel a Sub Quest that a Holder added, so that the plan stays correct.
32. As a Holder, I want the attending Sub Quest to follow changes made to the Global Event, so that the plan is never stale.
33. As a Holder, I want the attending Sub Quest cancelled when the Global Event is cancelled, so that I do not show up for nothing.
34. As a Holder, I want a Sub Quest with an end time to end by itself when that time passes, so that I do not tidy up old steps.
35. As a Holder, I want to mark a Sub Quest as done myself, so that steps without an end time can end.
36. As a Holder, I want my progress to be mine alone, so that leaving early does not end the step for the others.
37. As a Holder, I want my Quest to end when all of its Sub Quests have ended for me, so that my list shows only what is ahead.
38. As a Holder, I want to drop a Quest, so that I can change my mind.
39. As a Holder of a Shared Quest, I want to see the other Holders, so that I know who is coming.
40. As an SNU student, I want today's classes to appear as Class Quests in the same list with their Places, so that one list shows my day.
41. As an SNU student, I want to hold Quests whose times overlap, so that the app does not decide for me.

### Timetable

42. As an SNU student, I want my timetable kept on the server, with the semester's first and last day and my classes, so that it survives a new phone and Class Quests can be made from it.
43. As an SNU student, I want to add, edit and delete a class with its name, weekdays, times, Place and room, so that I can follow a changed timetable.
44. As an SNU student, I want to be warned when two classes overlap and still be able to save, so that I notice a mistake without being stopped.

### Matching

45. As an SNU student, I want to ask for Matching on a Global Event and choose a group size from 2 to 4, so that I find companions.
46. As an SNU student, I want to be told before asking that a match gives me a Shared Quest with people I do not know, so that I consent knowingly.
47. As an SNU student, I want one open request per Global Event, so that I am not matched twice.
48. As an SNU student who already holds a Shared Quest for a Global Event, I want to be told that I cannot ask for Matching on it again, so that I do not end up in two groups.
49. As an SNU student, I want to withdraw my request, so that I can change my mind.
50. As an SNU student, I want to go on using the app while my request waits and to be told when I am matched, so that I do not watch a screen.
51. As an SNU student, I want to be matched within about a minute once enough requests for the same event and the same size exist, so that I do not wait needlessly.
52. As an SNU student, I want to be grouped with people who share my interest hashtags when there is a choice, so that we have something in common.
53. As a matched SNU student, I want a Shared Quest with the others, so that we have a common plan.
54. As a matched SNU student who already held a Quest for that event alone, I want it merged into the Shared Quest, so that I do not hold two.
55. As an SNU student, I want my request to expire when the event starts or is cancelled, so that I am not matched after the fact.
56. As a matched SNU student, I want the match never to be lost between servers, so that I am not told I was matched without getting a Quest.

### Party

57. As an SNU student, I want to create a Party with a title, a capacity and a Join Policy, so that I can gather people.
58. As an SNU student, I want a capacity from 1 to 8 with 4 as the default, so that small and single-person Parties are possible.
59. As an SNU student, I want to mark the Party with one of my Quests when I create it, so that others going to the same event can find it.
60. As an SNU student, I want to be in one Party at a time, so that it is always clear whom I am with.
61. As an SNU student, I want to join an Open Party at once, so that I can walk in.
62. As an SNU student, I want to ask to join an Approval Party, so that the Leader decides.
63. As a Leader, I want to accept or decline each request, so that I control who enters.
64. As a Leader, I want a Closed Party to stay off every list, so that only people I invite can enter.
65. As a Leader, I want to invite my Friends, so that they can enter whatever the Join Policy is.
66. As an invited SNU student, I want to accept or decline, so that I am never added without my decision.
67. As a Holder of the Quest a Party is marked with, I want to join at once whatever the Join Policy is, so that matched companions are not kept waiting.
68. As an SNU student who joins a marked Party from outside, I want to receive its Quest, so that the plan and the route appear in my list.
69. As an SNU student, I want to be told before joining that Party members share their location, so that I consent knowingly.
70. As an SNU student, I want the capacity to hold even when two people join at the same moment, so that a Party is never over its limit.
71. As a Leader, I want to change the title, the capacity and the Join Policy, so that I can adjust as things change.
72. As a Leader, I want to hand the role to another member, so that I can step back.
73. As a Leader, I want to remove a member, so that I can deal with a problem.
74. As a member, I want to leave, so that I can go my own way.
75. As a member, I want the longest-standing member to become Leader when the Leader leaves, so that the Party goes on.
76. As an SNU student, I want the Party to end when its last member leaves, so that empty Parties do not linger.
77. As a Holder, I want to keep my Quest when I leave a Party or when it ends, so that my plan does not depend on the group.
78. As a member, I want to stay in the Party when I drop the Quest it is marked with, so that the group does not depend on my plan.
79. As a Holder, I want at most one running Party per Quest, so that matched companions do not split by accident.
80. As a Holder, I want to be led to the existing Party when I try to create a second one for the same Quest, so that I join instead.
81. As a Holder, I want to create a new Party for the Quest after the earlier one ended, so that we can regroup.
82. As an SNU student, I want a list of Open and Approval Parties, and the same list for one Global Event, so that I can find a group.
83. As a member, I want a switch for the Party, so that I can stop sharing with the group without leaving it.

### Location

84. As an SNU student, I want my Master Switch to be off until I turn it on, so that nothing is shared by default.
85. As an SNU student, I want a Friend or a Party member to see me only while we both have the switch for that relationship on, so that sharing is always mutual.
86. As an SNU student, I want to be visible to a person as long as one relationship between us is on, so that turning off one Friend's switch does not hide me from my Party.
87. As an SNU student, I want to stop seeing the people of a relationship when I turn its switch off, so that I cannot watch without being seen.
88. As an SNU student, I want the Master Switch to hide me from everyone and everyone from me, so that one switch is enough when I want to disappear.
89. As an SNU student, I want to be hidden whenever I am outside the Campus Boundary, so that my life off campus stays private.
90. As an SNU student, I want being hidden to look the same as having sharing off, so that nobody can tell why I am not shown.
91. As an SNU student, I want the server to keep only my latest position, so that no history of my movement exists.
92. As an SNU student, I want others' Avatars to move in near real time, so that the map feels alive.
93. As an SNU student, I want a Friend whose phone stopped reporting to stay on the map, dimmed and marked with the time since the last report, for up to 10 minutes, so that the map does not flicker in a building with poor signal.
94. As an SNU student, I want leaving a Party, ending a friendship or turning a switch off to take effect at once, so that revoking means now.

### Signals

95. As an SNU student, I want changes made by others to my Party, Quests, Friends, Meetups and matches to appear without my asking, so that my screen is current.
96. As an SNU student, I want my app to catch up when it reconnects or returns to the front, so that a missed signal is repaired.
97. As an SNU student, I want newly published or changed Global Events to appear on my map, so that the map is current.

## Implementation Decisions

### Ownership

- The main server owns Users, Friends, Friend Requests, Invite Links, Meetups, Quests, Sub Quests, Parties, timetables and Global Events. The match server owns Matching requests and matches in its own database.
- The mobile app has one API, the main server's, and one socket connection, to the socket server. It never calls the match server or the worker server.
- The main server and the match server call each other over HTTP with a secret both hold, as the worker server calls the main server. Messaging over Redis reaches every instance of a server, and each of these calls is for one instance to handle.
  - The main server passes Matching requests, withdrawals and status questions to the match server and returns the answers to the app.
  - The match server asks the main server which waiting requests still stand, and asks it to create a Shared Quest.
  - The match server takes no part in messaging over Redis.
- The socket server holds no data.

### Repeated requests

- Most requests of this task are protected by a rule: one Party for each User, one running Party for each Quest, one open Matching request for each Global Event, one Quest for each Global Event, one Friend Request between two Users, an Invite Link that works once. A repeat of such a request is refused or changes nothing.
- Three requests have no such rule and require the key described in P04: proposing a Meetup, adding a Sub Quest and adding a class to the timetable.
- The request from the match server to create a Shared Quest is protected by the match identifier, as described below.

### Friends, Friend IDs and Invite Links

- A Friend ID is 8 characters from capital letters and digits, without 0, O, 1, I and L. The main server makes it when the User is created. It is unique, which the database enforces, and it never changes. The User's profile shows it.
- Looking up a Friend ID gives its owner's name and department.
- A Friend Request goes from one User to the holder of a Friend ID and waits until it is accepted, declined or cancelled by its sender. At most one waits between two Users. A request to a User whose own request to the sender is waiting makes the two Friends at once. A decline is not announced to the sender.
- An Invite Link carries a random token, works once and expires after 24 hours. A User may hold several unused links.
- The link is an https address on the team's server, built from the server's public address, which is a setting. Android opens the app from it through App Links: the main server serves the Digital Asset Links file with the app's package name and the fingerprints of its signing certificates, which are a setting too.
- Whether a messenger hands the link to the app is checked on a phone. Where one opens the address in its own browser instead, the main server serves a page at that address with a button that opens the app.
- Accepting a Friend Request or an Invite Link creates the friendship with both switches on. The accept screen states that Location Sharing starts.
- Ending a friendship removes it for both and withdraws the Meetups still proposed between the two. Quests stay.
- Blocking is not part of this iteration.

### Meetup

- A Meetup has a title, a place, a start time and an optional end time. The start is in the future and the end is after the start.
- The place is a Place from the list or a point on the map: a latitude, a longitude and the label the app showed.
- States: proposed, accepted, declined, withdrawn, expired. A proposed Meetup whose start has passed is expired. This is computed when read; nothing is written.
- Accepting creates a Shared Quest held by both Friends with one Sub Quest built from the Meetup. No Party is created.
- A proposed Meetup cannot be edited. After acceptance the Quest follows the Quest rules, so either Friend can add Sub Quests and either can drop it.

### The Place at a position

- The main server answers which Place a position is in or near, or that it is at none, with the lookup of P07. The app asks it for a point a User picks on the map.

### Quest and Sub Quest

- A Quest is a wrapper: a title, its Holders, an optional Global Event, and its Sub Quests. Time and place belong to the Sub Quests.
- A Quest with two or more Holders is a Shared Quest. Nothing else distinguishes it.
- Every Quest has at least one Sub Quest. Sub Quests are one level deep. The only Sub Quest of a Quest cannot be cancelled.
- A User holds at most one Quest for a Global Event, which the database enforces.
  - Attending an event the User already holds a Quest for gives that Quest.
  - When a User who holds a Quest for the event alone becomes a Holder of a Shared Quest for it, through a match or a marked Party, the Quest held alone is deleted, with the Sub Quests its Holder added and the Holder's progress.
  - A User who holds a Shared Quest for the event keeps it: a Matching request for that event is refused, and entering a Party marked with another Quest for it does not make the User a Holder of that Quest.
- A Quest that points at a Global Event starts with a Sub Quest for attending it. That Sub Quest stores no time and no place: they are read from the Global Event, so a change to the event shows at once, and the Sub Quest is cancelled when the event is. Holders cannot edit or cancel it.
- Any Holder may add a Sub Quest and may edit or cancel a Sub Quest that a Holder added. A Sub Quest has a title, an optional start, an optional end after the start, and an optional place of the same two kinds as a Meetup's.
- The plan is shared; progress is personal. A Sub Quest's content is one record for all Holders. Whether it is done is recorded per Holder.
- Each Sub Quest has a completion kind. Two kinds exist now: by time, for a Sub Quest with an end time, and by hand, for one without. The kind is a field so that a verified kind, such as scanning a code at the venue, can be added later without changing the structure.
- A Sub Quest with an end time counts as ended for everyone once that time has passed. This is computed when read; nothing is written. An attending Sub Quest whose Global Event has no end time is ended by hand.
- A Quest whose Sub Quests have all ended for a Holder is left out of that Holder's list.
- Dropping a Quest removes that Holder and that Holder's progress. The other Holders keep the Quest and are told. When the last Holder drops it, the Quest is deleted.
- Several Quests may point at the same Global Event: one per User who goes alone and one per match.
- Class Quests are computed from the timetable when the Quest list is read. They are not stored. They are returned in the same shape as stored Quests, with one Sub Quest whose place is the class's Place.

### Timetable

- The main server stores one timetable per User: the semester's first and last day, either of which may be missing, and the classes. A class has a course name of 30 characters at most, one or more weekdays, a start and an end time of day, a Place from the list and a room text of 20 characters at most.
- Overlapping classes are accepted, and the answer names the classes that overlap.
- Only the owner reads or changes a timetable.
- A Class Quest exists for each class held on today's weekday, within the semester's days where they are set.

### Matching

- A request names a Global Event and a group size from 2 to 4. A User has at most one open request per Global Event.
- The main server takes a request only for a published Global Event that has not started, and passes it to the match server with the User's interest hashtags.
- The match server groups in rounds. A round runs every minute, which is a setting, and one match server runs it at a time.
  - It first asks the main server which of the waiting requests still stand: the Global Event is published and has not started, and the User holds no Shared Quest for it. The others expire.
  - It then groups the waiting requests of each Global Event and size.
- Grouping is one module: given the waiting requests of one Global Event and size, it returns the groups to form. It is called only when enough requests wait for one group. It forms as many groups as it can, putting together the requests that share the most interest hashtags, and the earlier request first where they share the same; the rest wait for the next round.
- That module is the place where grouping by AI replaces the rule in a later iteration. Nothing outside it changes then.
- Being in a Party does not prevent a request. Matching concerns Quests, not Parties.
- A request is waiting, matched, withdrawn or expired. Only a waiting request can be withdrawn.
- A completed match creates one Shared Quest. It never creates a Party.
- A User does not wait on a screen: the request is answered at once as waiting, and the match arrives as a signal.

### From match to Quest

- The match server records each match as awaiting its Quest and asks the main server to create the Shared Quest.
- It repeats the request until the main server answers, also after a restart.
- The main server handles a match identifier once. A repeated request returns the Quest created the first time.
- The main server checks the Global Event again. When the event has started or was cancelled, it answers so; the match server then closes the match, expires its requests and does not ask again.
- A matched User who has come to hold a Shared Quest for the event keeps it and is left out of the new one.
- This one request is handled this way. There is no general outbox.

### Party

- A Party has a title, a capacity from 1 to 8, a Join Policy, a Leader and an optional mark naming one Quest.
- The mark is set at creation by a Holder of that Quest and never changes. A Quest whose Sub Quests have all passed cannot be used as a mark.
- At most one running Party carries a given Quest as its mark. The database enforces this, so that two simultaneous attempts cannot both succeed.
- A User is in at most one Party. The database enforces this too.
- Capacity is checked inside the transaction that adds the member. The Leader cannot set it below the number of members.
- Entry: Open admits at once; Approval creates a request for the Leader; Closed admits by invitation only and is unlisted. A Holder of the marked Quest is admitted at once under any policy, within capacity. An invited Friend is admitted on accepting, within capacity.
- A request to join and an invitation wait until they are answered. They end when the Party ends and when the User enters any Party.
- A User who enters a marked Party without holding its Quest becomes a Holder, under the one-Quest rule above.
- After entry, the Party and the Quest do not affect each other. Leaving, removal and the Party's end leave Quests untouched. Dropping the Quest leaves the membership untouched.
- The creator is the Leader. The Leader can hand over the role. When the Leader leaves, the member who joined earliest becomes Leader. A removed member may enter again.
- The Party ends when the last member leaves. It never ends by itself.
- A marked Party is listed under its Global Event while the Quest has Sub Quests ahead.

### Location

- The app uploads positions to the main server. The main server keeps the latest position per User in Redis with an expiry of 10 minutes. No history is stored anywhere.
- A User has one session (P04). When it ends, by a sign-in on another phone, a sign-out or a used refresh token, the main server clears the User's stored position, so that the phone's last position does not linger.
- An upload is refused when the Master Switch is off, when it was measured more than 60 seconds ago or more than 10 seconds ahead of the server's clock, or when its accuracy radius is over 100 metres. These numbers are provisional until P17 has checked them on a phone.
- The main server checks each position against the Campus Boundary in server code, without a database query. A position outside is not kept, the stored one is cleared, and the answer tells the User that they are not shared because they are off campus.
- Visibility is decided by one module with one question: may this viewer see this subject now? The answer is yes when both Master Switches are on, the subject is inside the Campus Boundary, and at least one relationship between the two, a friendship or a common Party, has the switch on at both ends.
- The Master Switch is stored on the User and starts off. Signing in and signing out leave it as it is. Turning it off clears the stored position. Switches for a Friend and for the Party start on.
- Positions are pushed with their coordinates and the time they were measured over the socket connection to the viewers who are connected and allowed at that moment. Delivery is lossy on purpose: only the newest position matters.
- The app fetches the visible positions once when it connects.
- The lists of Friends and of Party members say for each person whether the viewer can see them now, and never why.
- A hidden User, a User with sharing off and a User who is not a Friend or Party member all look the same to a viewer: no Avatar.
- The viewer's app dims an Avatar whose last report is older than 2 minutes and removes it at 10 minutes.
- Any change that ends visibility removes the Avatar from the viewer's map at once.

### Signals

- For everything except positions, the main server sends a small signal naming the list that changed, and the app fetches that list again. The signals are `friends-changed`, `meetups-changed`, `quests-changed`, `party-changed`, `matching-changed` and `global-events-changed`. They carry nothing else.
- A position travels as `position`, with the User, the coordinates and the time, and its removal as `position-removed`, with the User.
- Signals travel from the main server to the socket server as one NestJS event over Redis, which names the Users it is for, the signal and what it carries, and from the socket server to the apps over Socket.IO.
- The socket server verifies the access token when a connection is opened and places the connection in the User's own room. The main server names the Users each message is for, so the socket server needs no knowledge of Parties or Friends. `global-events-changed` goes to every connected app.
- `global-events-changed` is sent when a Collection publishes an event. P12 sends it when an Administrator publishes, edits or cancels one.
- Delivery is not guaranteed. The app fetches the current state when it connects, when it reconnects and when it returns to the front. There is no periodic polling. A phone whose session ended while it was offline gets 401 on that fetch and closes its connection (P04).
- The socket server checks the token only, not the session. A connection opened with the token of an ended session stays open until the token expires, an hour at most; the app closes it on the 401 above.
- The team accepts that, in the rare case of a lost signal, a list updates late. Stored data is always correct.

## Testing Decisions

- A good test calls a server's API or opens a socket connection as a User would, and checks responses, pushed messages and stored results. It does not assert on internal calls.
- Tests run against a real PostgreSQL and a real Redis.
- Google's token verification is replaced as in P04. A call from one server to another is replaced at the fetch boundary, as the worker's calls are.
- Visibility is tested as a table: every combination of Master Switches, relationship switches, friendship, common Party and Campus Boundary, with the expected answer.
- Party rules are tested under concurrency: two Users joining the last free place, two Holders creating a Party for the same Quest, one User joining two Parties.
- Grouping is tested at the module: a pool with shared hashtags, a pool without, the order of arrival, a remainder that waits.
- Matching is tested for size, expiry of a closed event's requests, withdrawal, merging of a Quest held alone, the repeated request from match to main, and a main server that answers only later.
- Proposing a Meetup, adding a Sub Quest and adding a class are tested with a repeated key: one record, the same response twice.
- Quest progress is tested per Holder: one Holder marks done and the other's state is unchanged; an end time passes and both see it ended.
- Socket tests check that a signal reaches only the Users it names, that a position is pushed only to allowed viewers and that a connection with an invalid token is refused.
- Prior art: the API-level tests of P04 and P07.

## Out of Scope

- Blocking a User.
- A Friend ID chosen by the User.
- Private Zones. Only the Campus Boundary hides a User in this iteration.
- Grouping by AI or by timetable, and recommending an existing match to someone who is looking for companions. Both are part of the product plan and come in a later iteration; the grouping module is where the first lands.
- A sentence that explains a match.
- AI adding Sub Quests.
- Verified completion by code scanning, and badges.
- Conversation inside a Party.
- Push notifications.
- A position that carries the Place the User is in.
- Asking the main server whether a session is live when a socket connection opens.
- The API for Private Events.
- A general outbox or a durable queue. They are reconsidered with notifications in Iteration 2.
- A Party ending by itself.
- Location history.

## Further Notes

- The schedule names 윤유상 and 김태현 as workers and plans 4 hours. The real size is several times that, because Friend, Meetup, Party, Quest and the timetable were added here.
- This task depends on the Campus Boundary, the list of Places and the lookup of P07. The list of published Global Events that the app reads belongs to P12.
- P06 covers the app. Its timetable screens, its Master Switch and its position sending connect to this task's API, and so does its naming of a point on the map.
- Published practice for live location is to push positions over an open connection at intervals of 2 to 10 seconds. The reference app Bump keeps location history; this project does not.
- The Invite Link needs a fixed https address, and a build of the app is tied to it. A link made under one address stops working when the address changes.
