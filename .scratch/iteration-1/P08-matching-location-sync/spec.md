# P08: Connect basic matching and location sync

Status: ready-for-agent

## Problem Statement

A User who wants to attend an event has nobody to go with and no way to find companions. A User who wants to meet a Friend has to ask where they are. Once people agree to go somewhere together, they cannot see each other on the map. The screens planned for P06, P13 and P14 have nothing to connect to.

## Solution

The servers provide everything that lets Users find each other and see each other. Users become Friends through a Friend Request or an Invite Link and propose Meetups. A User picks a Global Event or makes a Quest of their own, and gathers others around the Quest by letting them join it or through Matching. Users open a Party to be together now. Friends and Party members see each other's Avatars move in real time, under switches each User controls. Changes made by one User reach the others' apps without the others asking.

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
28. As an SNU student, I want to make a Quest of my own with a title and a first Sub Quest, without a Global Event, so that I can gather people for something no event covers.
29. As an SNU student who already holds a Quest for a Global Event, I want attending it again to give me that same Quest, so that I never hold two for one event.
30. As a Holder, I want the Quest to start with a Sub Quest for attending the event with the event's time and place, so that I do not enter them again.
31. As a Holder, I want to add a Sub Quest such as going to a café afterwards, so that the plan covers what we do next.
32. As a Holder, I want to edit or cancel a Sub Quest that a Holder added, so that the plan stays correct.
33. As a Holder, I want the attending Sub Quest to follow changes made to the Global Event, so that the plan is never stale.
34. As a Holder, I want the attending Sub Quest cancelled when the Global Event is cancelled, so that I do not show up for nothing.
35. As a Holder, I want a Sub Quest with an end time to end by itself when that time passes, so that I do not tidy up old steps.
36. As a Holder, I want to mark a Sub Quest as done myself, so that steps without an end time can end.
37. As a Holder, I want my progress to be mine alone, so that leaving early does not end the step for the others.
38. As a Holder, I want my Quest to end when all of its Sub Quests have ended for me, so that my list shows only what is ahead.
39. As a Holder, I want to drop a Quest, so that I can change my mind.
40. As a Holder of a Shared Quest, I want to see the other Holders and which of them is the Leader, so that I know who is coming and who decides.
41. As an SNU student, I want each of today's classes to appear as a Class Quest in the same list, with a Sub Quest for each of its times today and that time's Place and room, so that one list shows my day.
42. As an SNU student, I want to hold Quests whose times overlap, so that the app does not decide for me.

### Gathering around a Quest

43. As an SNU student who attends a Global Event or makes a Quest, I want to be its Leader, so that I decide who joins my plan.
44. As a Leader, I want a capacity from 1 to 8 with 4 as the default, so that the group stays the size I want.
45. As a Leader, I want a Quest I attend alone to be Closed until I choose otherwise, so that nobody joins a plan I did not offer.
46. As a Leader, I want to make my Quest Open or Approval, so that others can find it and join.
47. As an SNU student, I want a list of the Open and Approval Quests that are still ahead, and the same list for one Global Event, each with its Leader, its number of Holders, its capacity, its Join Policy and its next Sub Quest, so that I can find a group to join.
48. As an SNU student, I want to join an Open Quest at once, so that I can walk in.
49. As an SNU student, I want to ask to join an Approval Quest and to withdraw the request, so that the Leader decides and I can change my mind.
50. As a Leader, I want to accept or decline each request, so that I control who joins.
51. As a Leader, I want to invite my Friends whatever the Join Policy is, so that the people I know can join even a Closed Quest.
52. As an invited SNU student, I want to accept or decline, so that I never hold a Quest without my decision.
53. As an SNU student who holds a Quest alone for a Global Event, I want it replaced by the Quest I join for that event, so that I never hold two.
54. As an SNU student who holds a Shared Quest for a Global Event, I want to be told that I must drop it before joining another Quest for that event, so that I do not end up in two groups.
55. As a Leader, I want the capacity to hold even when two people join at the same moment, so that a Quest is never over its limit.
56. As a Leader, I want to change the title of a Quest without a Global Event, the capacity and the Join Policy, so that I can adjust as things change.
57. As a Leader, I want to hand the role to another Holder, so that I can step back.
58. As a Leader, I want to remove a Holder, so that I can deal with a problem.
59. As a Holder, I want the Holder who joined earliest to become Leader when the Leader drops the Quest, so that the Quest goes on.

### Timetable

60. As an SNU student, I want my classes kept on the server, so that they survive a new phone and Class Quests can be made from them.
61. As an SNU student, I want to add, replace and delete a class with its course name and its times, each with a weekday, a start, an end, a Place and a room, so that a course held on two days in two rooms is one class and I can follow a changed timetable.
62. As an SNU student, I want to be warned when two classes overlap and still be able to save, so that I notice a mistake without being stopped.
63. As an SNU student, I want to clear my timetable at once when a semester ends, so that I can enter the next semester's classes.

### Matching

64. As an SNU student, I want to ask for Matching on a Global Event and choose a group size from 2 to 4, so that I find companions.
65. As an SNU student, I want to be told before asking that Matching gives me a Shared Quest with people I do not know, so that I consent knowingly.
66. As an SNU student, I want one open request per Global Event, so that I am not matched twice.
67. As an SNU student who already holds a Shared Quest for a Global Event, I want to be told that I cannot ask for Matching on it again, so that I do not end up in two groups.
68. As an SNU student, I want to withdraw my request, so that I can change my mind.
69. As an SNU student, I want to go on using the app while my request waits and to be told when I am matched, so that I do not watch a screen.
70. As an SNU student, I want to be matched within about a minute once enough requests for the same event and the same size exist, or an Open Quest for the event has a free place, so that I do not wait needlessly.
71. As an SNU student, I want to be placed into an Open Quest for the event whose capacity is the size I chose, so that I join a group that is already gathering.
72. As the Leader of an Open Quest, I want Matching to fill its free places with people who asked for the same event and size, so that my group fills without my searching.
73. As an SNU student, I want to be grouped with people who share my interest hashtags when there is a choice, so that we have something in common.
74. As a matched SNU student, I want a Shared Quest with the others, so that we have a common plan.
75. As a matched SNU student who already held a Quest for that event alone, I want it merged into the Shared Quest, so that I do not hold two.
76. As an SNU student, I want my request to expire when the event starts or is cancelled, so that I am not matched after the fact.
77. As a matched SNU student, I want the match never to be lost between servers, so that I am not told I was matched without getting a Quest.

### Party

78. As a Holder, I want to open the Party of one of my Quests when the time comes, so that we who hold it can be together and see each other.
79. As an SNU student, I want to open a Party tied to no Quest, so that I can be with my Friends now.
80. As an SNU student, I want to give a Party a title, a capacity from 1 to 8 with 4 as the default, and a Join Policy that is Closed unless I choose otherwise, so that I decide who comes.
81. As an SNU student, I want to be in one Party at a time, so that it is always clear whom I am with.
82. As a Holder, I want to be told when another Holder opens the Party of our Quest, so that I can enter it.
83. As a Holder, I want to enter the Party of my Quest at once whatever its Join Policy is, so that the people I planned with are not kept waiting.
84. As a Holder, I want my location shared with a Party only once I enter it myself, so that holding a Quest never shares where I am.
85. As an SNU student, I want to see in my list of Friends which Friends are in a Party, with its title, its number of members and its Join Policy but not where it is, so that I can join my Friends.
86. As an SNU student, I want to enter an Open Party that a Friend is in at once, so that I can walk in.
87. As an SNU student, I want to ask to enter an Approval Party that a Friend is in, so that the Leader decides.
88. As a Leader, I want to accept or decline each request, so that I control who enters.
89. As a Leader, I want a Closed Party to admit only the people I invite and the Holders of its Quest, so that nobody else walks in.
90. As a Leader, I want to invite a Friend or a Holder of the Party's Quest, so that they can enter whatever the Join Policy is.
91. As an invited SNU student, I want to accept or decline, so that I am never added without my decision.
92. As an SNU student who enters a Party without holding its Quest, I want my Quests to stay as they are, so that being together now does not sign me up for the plan.
93. As an SNU student, I want to be told before entering that Party members share their location, so that I consent knowingly.
94. As an SNU student, I want the capacity to hold even when two people enter at the same moment, so that a Party is never over its limit.
95. As a Leader, I want to change the title, the capacity and the Join Policy, so that I can adjust as things change.
96. As a Leader, I want to hand the role to another member, so that I can step back.
97. As a Leader, I want to remove a member, so that I can deal with a problem.
98. As a member, I want to leave, so that I can go my own way.
99. As a member, I want the longest-standing member to become Leader when the Leader leaves, so that the Party goes on.
100. As an SNU student, I want the Party to end when its last member leaves, so that empty Parties do not linger.
101. As a Holder, I want to keep my Quest when I leave a Party or when it ends, so that my plan does not depend on the group.
102. As a member, I want to stay in the Party when I drop its Quest, so that the group does not depend on my plan.
103. As a Holder, I want at most one running Party per Quest, so that the Holders do not split by accident.
104. As a Holder, I want to be led to the existing Party when I try to open a second one for the same Quest, so that I enter it instead.
105. As a Holder, I want to open a new Party for the Quest after the earlier one ended, so that we can regroup.
106. As a member, I want a switch for the Party, so that I can stop sharing with the group without leaving it.

### Location

107. As an SNU student, I want my Master Switch to be off until I turn it on, so that nothing is shared by default.
108. As an SNU student, I want a Friend or a Party member to see me only while we both have the switch for that relationship on, so that sharing is always mutual.
109. As an SNU student, I want to be visible to a person as long as one relationship between us is on, so that turning off one Friend's switch does not hide me from my Party.
110. As an SNU student, I want to stop seeing the people of a relationship when I turn its switch off, so that I cannot watch without being seen.
111. As an SNU student, I want the Master Switch to hide me from everyone and everyone from me, so that one switch is enough when I want to disappear.
112. As an SNU student, I want to be hidden whenever I am outside the Campus Boundary, so that my life off campus stays private.
113. As an SNU student, I want being hidden to look the same as having sharing off, so that nobody can tell why I am not shown.
114. As an SNU student, I want the server to keep only my latest position, so that no history of my movement exists.
115. As an SNU student, I want others' Avatars to move in near real time, so that the map feels alive.
116. As an SNU student, I want a Friend whose phone stopped reporting to stay on the map, dimmed and marked with the time since the last report, for up to 10 minutes, so that the map does not flicker in a building with poor signal.
117. As an SNU student, I want leaving a Party, ending a friendship or turning a switch off to take effect at once, so that revoking means now.

### Signals

118. As an SNU student, I want changes made by others to my Party, Quests, Friends, Meetups and matches to appear without my asking, so that my screen is current.
119. As an SNU student, I want my app to catch up when it reconnects or returns to the front, so that a missed signal is repaired.
120. As an SNU student, I want newly published or changed Global Events to appear on my map, so that the map is current.

## Implementation Decisions

### Ownership

- The main server owns Users, Friends, Friend Requests, Invite Links, Meetups, Quests, Sub Quests, Parties, timetables and Global Events. The match server owns Matching requests and matches in its own database.
- The mobile app has one API, the main server's, and one socket connection, to the socket server. It never calls the match server or the worker server.
- The main server and the match server call each other over HTTP with a secret both hold, as the worker server calls the main server. Messaging over Redis reaches every instance of a server, and each of these calls is for one instance to handle.
  - The main server passes Matching requests, withdrawals and status questions to the match server and returns the answers to the app.
  - The match server asks the main server which waiting requests still stand and which Open Quests have a free place, asks it to create a Shared Quest, and asks it to place a User into an Open Quest.
  - The match server takes no part in messaging over Redis.
- The socket server holds no data.

### Repeated requests

- Most requests of this task are protected by a rule: one Party for each User, one running Party for each Quest, one open Matching request for each Global Event, one Quest for each Global Event, a User a Holder of a Quest once, one waiting request and one waiting invitation of a User for a Quest or a Party, one Friend Request between two Users, an Invite Link that works once. A repeat of such a request is refused or changes nothing.
- Four requests have no such rule and require the key described in P04: proposing a Meetup, making a Quest of one's own, adding a Sub Quest and adding a class to the timetable.
- The request from the match server to create a Shared Quest is protected by the match identifier, and its request to place a User into an Open Quest by the User's being a Holder of it already, as described below.

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
- Accepting creates a Shared Quest held by both Friends with one Sub Quest built from the Meetup, led by the proposer. No Party is opened.
- A proposed Meetup cannot be edited. After acceptance the Quest follows the Quest rules, so either Friend can add Sub Quests and either can drop it.

### The Place at a position

- The main server answers which Place a position is in or near, or that it is at none, with the lookup of P07. The app asks it for a point a User picks on the map.

### Quest and Sub Quest

- A Quest is a wrapper: a title, its Holders, a Leader, a capacity, a Join Policy, an optional Global Event, and its Sub Quests. Time and place belong to the Sub Quests.
- A Quest with two or more Holders is a Shared Quest. Nothing else distinguishes it.
- A User makes a Quest of their own, without a Global Event, with a title and a first Sub Quest: a title, an optional start, an optional end and an optional place. It has the shape of the Quest an accepted Meetup gives. No other kind of Event is created, and Private Events are untouched.
- Every Quest has at least one Sub Quest. Sub Quests are one level deep. The only Sub Quest of a Quest cannot be cancelled.
- A User holds at most one Quest for a Global Event, which the database enforces.
  - Attending an event the User already holds a Quest for gives that Quest.
  - When a User who holds a Quest for the event alone enters another Quest for it, in any way described below or through Matching, the Quest held alone is deleted, with the Sub Quests its Holder added and the Holder's progress.
  - A User who holds a Shared Quest for the event keeps it: a Matching request for that event is refused, and entering another Quest for it is refused until the User drops it.
- A Quest that points at a Global Event starts with a Sub Quest for attending it. That Sub Quest stores no time and no place: they are read from the Global Event, so a change to the event shows at once, and the Sub Quest is cancelled when the event is. Holders cannot edit or cancel it.
- Any Holder may add a Sub Quest and may edit or cancel a Sub Quest that a Holder added. A Sub Quest has a title, an optional start, an optional end after the start, and an optional place of the same two kinds as a Meetup's.
- The plan is shared; progress is personal. A Sub Quest's content is one record for all Holders. Whether it is done is recorded per Holder.
- Each Sub Quest has a completion kind. Two kinds exist now: by time, for a Sub Quest with an end time, and by hand, for one without. The kind is a field so that a verified kind, such as scanning a code at the venue, can be added later without changing the structure.
- A Sub Quest with an end time counts as ended for everyone once that time has passed. This is computed when read; nothing is written. An attending Sub Quest whose Global Event has no end time is ended by hand.
- A Quest whose Sub Quests have all ended for a Holder is left out of that Holder's list.
- Dropping a Quest removes that Holder and that Holder's progress. The other Holders keep the Quest and are told. When the last Holder drops it, the Quest is deleted.
- Several Quests may point at the same Global Event, each with its own Holders.
- Class Quests are computed from the timetable when the Quest list is read, and nothing is stored for them. A Class Quest exists for each class that has a time on today's weekday, by the date in Asia/Seoul, every week. It is returned in the shape of a stored Quest and marked as a Class Quest: the course name as its title, the User as its only Holder, no Leader, capacity 1 and Join Policy Closed, and one Sub Quest for each of the class's times today, in the order of their starts, with today's start and end, completion by time, and the time's Place with the room after its name as its place. A time without a Place gives a Sub Quest without a place. The Quest's identifier is the class's, and a Sub Quest's is its time's.
- A Class Quest cannot be dropped, given a Sub Quest, joined, asked to join, given settings, invited to or given a Party, and it is never in the list of recruiting Quests.

### Gathering around a Quest

- Every stored Quest has a Leader, a capacity and a Join Policy.
- The Leader is the User who attended or made the Quest. When the Leader drops it, the Holder who entered earliest becomes Leader.
- The Leader hands the role to another Holder, removes a Holder, changes the title of a Quest without a Global Event, the capacity and the Join Policy, and answers requests and invites. Every other action on a Quest is any Holder's, as above. A removed Holder loses their progress as one who dropped the Quest, and may enter again.
- The capacity is from 1 to 8, 4 when left out, and never below the number of Holders.
- The Join Policy is Open, Approval or Closed, Closed when left out. The three mean the same for a Quest and a Party; only who can see one differs.
  - Open: whoever can see it enters at once.
  - Approval: whoever can see it asks, and the Leader accepts or declines.
  - Closed: entry by the Leader's invitation only.
  - The Leader's invitation works under every Join Policy, and the invited User enters on accepting.
  - Every User can see an Open or an Approval Quest, in the list of recruiting Quests. A Closed Quest is in no list.
- The settings a Quest starts with follow how it came to be:
  - attending a Global Event: Closed, capacity 4, led by the User. The Leader starts gathering people by making it Open or Approval.
  - a Quest a User makes: the Join Policy and the capacity the User gives.
  - an accepted Meetup: Closed, capacity 4, led by the proposer.
  - a match: Closed, capacity the match's size, led by the User whose request arrived earliest.
- The list of recruiting Quests holds the Open and Approval Quests that have Sub Quests ahead, the newest first, and the same for one Global Event. A Sub Quest is ahead while it is not cancelled and its end has not passed; a Holder's own mark of done does not count. Each entry has the Quest's title, its Global Event if any, its Leader, the number of Holders, the capacity, the Join Policy and its first Sub Quest ahead with its time and place. The list leaves out the Quests the reader holds.
- An Open or Approval Quest is posted on a board, one of meal, career, hobby and show, which the list of recruiting Quests can be narrowed to; a Closed Quest has none, and every Quest may carry a description of up to 200 characters, its recruiting post.
- A User enters a Quest by joining an Open one, by a request the Leader accepts, or by an invitation the User accepts. The capacity is checked inside the transaction that adds the Holder. A Quest whose Sub Quests have all passed takes nobody, and the one-Quest rule above holds on every entry.
- The Leader invites Friends. A request and an invitation wait until they are answered, and end with the Quest and when their User becomes a Holder of that Quest.
- Entering a Quest neither opens nor enters a Party.

### Timetable

- A User's timetable is the User's classes, and nothing else is stored for it: no semester's days and no record of its own. A User keeps one timetable from semester to semester and clears it when a semester ends.
- A class has a course name of 30 characters at most and from 1 to 10 times. A time has a weekday, a start and an end time of day in Asia/Seoul with the end after the start, an optional Place from the list and an optional room of 20 characters at most; an empty room is no room. A course held on Monday in one room and on Wednesday in another is one class with two times. Two times of one class that share a weekday and cross each other are refused.
- A User holds at most 15 classes, however many times they have. The count and the insert happen in one transaction that locks the User's row, so that two adds at the same moment cannot pass the limit together.
- A User reads the timetable, adds a class, replaces a class whole, deletes a class, and resets the timetable, which deletes every class and answers the same when there were none.
- Two classes overlap when a time of one and a time of the other share a weekday and each starts before the other ends; times that touch do not overlap. Overlapping classes are accepted, and the answer names the classes each class overlaps.
- Only its owner reads or changes a class: another User's class is answered as not found, before anything else about the request is checked.

### Matching

- A request names a Global Event and a group size from 2 to 4. A User has at most one open request per Global Event.
- The main server takes a request only for a published Global Event that has not started, and passes it to the match server with the User's interest hashtags.
- The match server groups in rounds. A round runs every minute, which is a setting, and one match server runs it at a time.
  - It first asks the main server which of the waiting requests still stand: the Global Event is published and has not started, and the User holds no Shared Quest for it. The others expire.
  - It then places waiting requests into Open Quests, as below.
  - It then groups the remaining waiting requests of each Global Event and size.
- A request can be placed into a Quest that is already gathering. A Quest is eligible for a request when it is for the request's Global Event, is Open, has a free place and has a capacity equal to the size the requester chose. An Approval or a Closed Quest is never eligible, and a request is never placed into a Quest its User holds.
  - The match server asks the main server for the eligible Quests, each with its free places, its Holders and the time it was made. It fills them in order: the earliest request into the earliest Quest, until the Quest is full or no request is left.
  - For each placement, the main server adds the User as a Holder under the rules of entering a Quest. The request stays waiting until the main server answers that its User entered; it is then matched and names that Quest.
  - A User who can no longer enter, because the Quest filled or closed or the User holds a Shared Quest by then, is refused. The request stays waiting, and the next round expires it if it no longer stands.
- Grouping is one module: given the waiting requests of one Global Event and size, it returns the groups to form. It is called only when enough requests wait for one group. It forms as many groups as it can, putting together the requests that share the most interest hashtags, and the earlier request first where they share the same; the rest wait for the next round.
- That module is the place where grouping by AI replaces the rule in a later iteration. Nothing outside it changes then.
- Being in a Party does not prevent a request. Matching concerns Quests, not Parties.
- A request is waiting, matched, withdrawn or expired. Only a waiting request can be withdrawn.
- A completed match creates one Shared Quest, and a placement adds one Holder to a Quest. Neither opens a Party.
- A User does not wait on a screen: the request is answered at once as waiting, and the match arrives as a signal.

### From match to Quest

- The match server records each match as awaiting its Quest and asks the main server to create the Shared Quest.
- It repeats the request until the main server answers, also after a restart.
- The main server handles a match identifier once. A repeated request returns the Quest created the first time.
- The main server checks the Global Event again. When the event has started or was cancelled, it answers so; the match server then closes the match, expires its requests and does not ask again.
- A matched User who has come to hold a Shared Quest for the event keeps it and is left out of the new one.
- The match server names the matched Users in the order their requests arrived. The first of them who is free leads the Quest, which is Closed and whose capacity is the match's size.
- This one request is handled this way. A placement into an Open Quest keeps no record of its own: its request stays waiting until the main server answers, and the next round decides it again. The main server answers a placement of a User who already holds that Quest as entered. There is no general outbox.

### Party

- A Party has a title, a capacity from 1 to 8 that is 4 when left out, a Join Policy that is Closed when left out, a Leader, its members and, when it was opened for one, its Quest.
- A Party is opened by hand. A Holder opens the Party of one of their Quests, or a User opens one tied to no Quest. The opener is its Leader and its first member. A Quest whose Sub Quests have all passed, a Class Quest and a Quest the opener does not hold cannot be given. The Party's Quest never changes; when its last Holder drops it, the Party goes on tied to no Quest.
- At most one running Party has a given Quest. The database enforces this, so that two simultaneous attempts cannot both succeed.
- A User is in at most one Party. The database enforces this too.
- There is no public list of Parties and no list of Parties for a Global Event. A User sees the running Parties of the Quests they hold and the Parties their Friends are in, each with its title, its number of members, its capacity, its Join Policy and which of the User's Friends are in it, and never a position.
- Entry:
  - A Holder of the Party's Quest enters at once by their own action, under any Join Policy.
  - A Friend of any member enters an Open Party at once, and asks to enter an Approval Party, which the Leader accepts or declines.
  - The Leader invites a Friend or a Holder of the Party's Quest, under any Join Policy, and the invited User enters on accepting. A Closed Party takes nobody else.
  - Capacity is checked inside the transaction that adds the member. The Leader cannot set it below the number of members.
- A request to enter and an invitation wait until they are answered. They end when the Party ends and when the User enters any Party.
- Entering a Party never changes Quests: a User who enters without holding the Party's Quest does not become a Holder. Leaving, removal and the Party's end leave Quests untouched. Dropping the Quest leaves the membership untouched.
- The Leader changes the title, the capacity and the Join Policy, hands over the role and removes members. When the Leader leaves, the member who entered earliest becomes Leader. A removed member may enter again.
- The Party ends when the last member leaves. It never ends by itself.

### Location

- The app uploads positions to the main server. The main server keeps the latest position per User in Redis with an expiry of 10 minutes. No history is stored anywhere.
- A User has one session (P04). When it ends, by a sign-in on another phone, a sign-out or a used refresh token, the main server clears the User's stored position, so that the phone's last position does not linger.
- An upload is refused when the Master Switch is off, when it was measured more than 60 seconds ago or more than 10 seconds ahead of the server's clock, or when its accuracy radius is over 100 metres. These numbers are provisional until P17 has checked them on a phone.
- The main server checks each position against the Campus Boundary in server code, without a database query. A position outside is not kept, the stored one is cleared, and the answer tells the User that they are not shared because they are off campus.
- Visibility is decided by one module with one question: may this viewer see this subject now? The answer is yes when both Master Switches are on, the subject is inside the Campus Boundary, and at least one relationship between the two, a friendship or a common Party, has the switch on at both ends. Holding the same Quest is no relationship: a Holder shares nothing with a Party until they enter it themselves.
- The Master Switch is stored on the User and starts off. Signing in and signing out leave it as it is. Turning it off clears the stored position. Switches for a Friend and for the Party start on.
- Positions are pushed with their coordinates and the time they were measured over the socket connection to the viewers who are connected and allowed at that moment. Delivery is lossy on purpose: only the newest position matters.
- The app fetches the visible positions once when it connects.
- The lists of Friends and of Party members say for each person whether the viewer can see them now, and never why.
- A hidden User, a User with sharing off and a User who is not a Friend or Party member all look the same to a viewer: no Avatar.
- The viewer's app dims an Avatar whose last report is older than 2 minutes and removes it at 10 minutes.
- Any change that ends visibility removes the Avatar from the viewer's map at once.

### Signals

- For everything except positions, the main server sends a small signal naming the list that changed, and the app fetches that list again. The signals are `friends-changed`, `meetups-changed`, `quests-changed`, `party-changed`, `matching-changed` and `global-events-changed`. They carry nothing else.
- `quests-changed` goes to the Holders of a Quest when its Sub Quests, its Holders, its Leader or its settings change, to the Leader when a request arrives or is withdrawn, to a User whose request or invitation was answered, to an invited User and to a removed Holder.
- `party-changed` goes to the members of a Party, the Holders of its Quest and the Friends of its members when it opens or ends, when its members change and when its title, capacity or Join Policy changes; and to the Leader when a request arrives or is withdrawn, to a User whose request or invitation was answered, to an invited User and to a removed member.
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
- Visibility is tested as a table: every combination of Master Switches, relationship switches, friendship, common Party and Campus Boundary, with the expected answer. A Holder of a Party's Quest who has not entered the Party sees none of its members through it.
- Quest rules are tested under concurrency: two Users joining the last free place of a Quest, and a request and an invitation accepted for it at the same moment.
- Party rules are tested under concurrency: two Users entering the last free place, a request and an invitation accepted at the same moment, two Holders opening a Party for the same Quest, one User entering two Parties.
- Grouping is tested at the module: a pool with shared hashtags, a pool without, the order of arrival, a remainder that waits.
- Matching is tested for size, expiry of a closed event's requests, withdrawal, merging of a Quest held alone, the repeated request from match to main, a main server that answers only later, placement into an Open Quest in order of arrival, a Quest that filled or closed before its placement, and two match servers running a round at the same moment.
- Proposing a Meetup, making a Quest, adding a Sub Quest and adding a class are tested with a repeated key: one record, the same response twice.
- The timetable is tested under concurrency: several first adds of one User at once each succeed, and adds at the same moment stop at the limit of 15 classes.
- Class Quests are tested with the clock set by the test.
- Quest progress is tested per Holder: one Holder marks done and the other's state is unchanged; an end time passes and both see it ended.
- Socket tests check that a signal reaches only the Users it names, that a position is pushed only to allowed viewers and that a connection with an invalid token is refused.
- Prior art: the API-level tests of P04 and P07.

## Out of Scope

- Blocking a User.
- A Friend ID chosen by the User.
- Private Zones. Only the Campus Boundary hides a User in this iteration.
- Grouping by AI or by timetable, and recommending an existing match to someone who is looking for companions. Both are part of the product plan and come in a later iteration; the grouping module is where the first lands.
- Matching into an Approval Quest by sending its Leader a request.
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
- A list of Parties for every User or for a Global Event.
- Location history.
- Bringing a timetable in from SNUTT. SNUTT offers no public API, and the page SNUTT hosts for bringing a timetable in works only for the web addresses SNUTT's operators allow, so it needs their permission first. It is a later possibility that depends on that permission. The timetable's shape fits such a timetable: a class with several times, each with its own place, and a Place that may be missing.

## Further Notes

- The schedule names 윤유상 and 김태현 as workers and plans 4 hours. The real size is several times that, because Friend, Meetup, Party, Quest and the timetable were added here.
- This task depends on the Campus Boundary, the list of Places and the lookup of P07. The list of published Global Events that the app reads belongs to P12.
- P06 covers the app. Its Master Switch and its position sending connect to this task's API, and so does its naming of a point on the map. The app's timetable screens are not P06's: a later task of the app builds them on this task's timetable routes.
- Published practice for live location is to push positions over an open connection at intervals of 2 to 10 seconds. The reference app Bump keeps location history; this project does not.
- The Invite Link needs a fixed https address, and a build of the app is tied to it. A link made under one address stops working when the address changes.
