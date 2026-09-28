# P08: Connect basic matching and location sync

Status: ready-for-agent

## Problem Statement

A User who wants to attend an event has nobody to go with and no way to find companions. A User who wants to meet a Friend has to ask where they are. Once people agree to go somewhere together, they cannot see each other on the map. The screens planned for P13 and P14 have nothing to connect to.

## Solution

The servers provide everything that lets Users find each other and see each other. Users become Friends through an Invite Link and propose Meetups. A User picks a Global Event and gets a Quest, alone or through Matching with others. Users form a Party to be together now. Friends and Party members see each other's Avatars move in real time, under switches each User controls. Changes made by one User reach the others' apps without the others asking.

This spec is large because the restart left most domain work without a task of its own. It is organised by feature, and each feature is delivered by its own pull request.

## User Stories

### Friends

1. As an SNU student, I want to create an Invite Link, so that I can send it to someone through any messenger.
2. As an SNU student, I want an Invite Link to work once and to expire after 24 hours, so that a leaked link does not expose my location.
3. As an SNU student who opened an Invite Link, I want to see who sent it, so that I know whom I am accepting.
4. As an SNU student who opened an Invite Link, I want to be told that accepting starts mutual Location Sharing, so that I consent knowingly.
5. As an SNU student, I want to become Friends by accepting, so that no further step is needed.
6. As an SNU student, I want to decline or ignore an Invite Link, so that nothing happens without my decision.
7. As an SNU student, I want to be told when a link is used, expired, my own, or from someone already my Friend, so that I understand why it did nothing.
8. As an SNU student, I want to list my Friends, so that I know whom I share with.
9. As an SNU student, I want to end a friendship, so that the other person stops seeing me at once.
10. As an SNU student, I want a switch for each Friend, so that I can stop sharing with one person only.

### Meetup

11. As an SNU student, I want to propose a Meetup to a Friend with a title, a place, a start time and an optional end time, so that we can agree to meet.
12. As an SNU student, I want to see the Meetups proposed to me, so that I can answer.
13. As an SNU student, I want to accept or decline a Meetup, so that the proposer knows.
14. As two Friends, we want an accepted Meetup to become a Shared Quest, so that we both see the same plan.
15. As the proposer, I want to withdraw a Meetup that was not answered yet, so that I can change my mind.
16. As the proposer, I want to be told that a sent Meetup cannot be edited, so that I withdraw it and send a new one instead.
17. As an SNU student, I want an unanswered Meetup to expire at its start time, so that old proposals do not pile up.
18. As either Friend, I want to cancel the Shared Quest of an accepted Meetup, so that the other knows it is off.

### Quest

19. As an SNU student, I want to choose a Global Event to attend and get a Quest for it, so that my plan is recorded even when I go alone.
20. As a Holder, I want the Quest to start with a Sub Quest for attending the event with the event's time and place, so that I do not enter them again.
21. As a Holder, I want to add a Sub Quest such as going to a café afterwards, so that the plan covers what we do next.
22. As a Holder, I want to edit or cancel a Sub Quest that a Holder added, so that the plan stays correct.
23. As a Holder, I want the attending Sub Quest to follow changes made to the Global Event, so that the plan is never stale.
24. As a Holder, I want the attending Sub Quest cancelled when the Global Event is cancelled, so that I do not show up for nothing.
25. As a Holder, I want a Sub Quest with an end time to end by itself when that time passes, so that I do not tidy up old steps.
26. As a Holder, I want to mark a Sub Quest as done myself, so that steps without an end time can end.
27. As a Holder, I want my progress to be mine alone, so that leaving early does not end the step for the others.
28. As a Holder, I want my Quest to end when all of its Sub Quests have ended for me, so that my list shows only what is ahead.
29. As a Holder, I want to drop a Quest, so that I can change my mind.
30. As a Holder of a Shared Quest, I want to see the other Holders, so that I know who is coming.
31. As an SNU student, I want today's classes to appear as Class Quests in the same list with their buildings, so that one list shows my day.
32. As an SNU student, I want to hold Quests whose times overlap, so that the app does not decide for me.

### Matching

33. As an SNU student, I want to ask for Matching on a Global Event and choose a group size from 2 to 4, so that I find companions.
34. As an SNU student, I want to be told before asking that a match gives me a Shared Quest with people I do not know, so that I consent knowingly.
35. As an SNU student, I want one open request per Global Event, so that I am not matched twice.
36. As an SNU student, I want to withdraw my request, so that I can change my mind.
37. As an SNU student, I want to be matched as soon as enough requests for the same event and the same size exist, so that I do not wait needlessly.
38. As a matched SNU student, I want a Shared Quest with the others, so that we have a common plan.
39. As a matched SNU student who already held a Quest for that event alone, I want it merged into the Shared Quest, so that I do not hold two.
40. As a matched SNU student, I want one sentence explaining what we have in common, so that I have something to start with.
41. As a matched SNU student, I want a plain sentence when the explanation cannot be produced, so that the match still completes.
42. As an SNU student, I want my request to expire when the event starts, so that I am not matched after the fact.
43. As a matched SNU student, I want the match never to be lost between servers, so that I am not told I was matched without getting a Quest.

### Party

44. As an SNU student, I want to create a Party with a title, a capacity and a Join Policy, so that I can gather people.
45. As an SNU student, I want a capacity from 1 to 8 with 4 as the default, so that small and single-person Parties are possible.
46. As an SNU student, I want to mark the Party with one of my Quests when I create it, so that others going to the same event can find it.
47. As an SNU student, I want to be in one Party at a time, so that it is always clear whom I am with.
48. As an SNU student, I want to join an Open Party at once, so that I can walk in.
49. As an SNU student, I want to ask to join an Approval Party, so that the Leader decides.
50. As a Leader, I want to accept or decline each request, so that I control who enters.
51. As a Leader, I want a Closed Party to stay off every list, so that only people I invite can enter.
52. As a Leader, I want to invite my Friends, so that they can enter whatever the Join Policy is.
53. As an invited SNU student, I want to accept or decline, so that I am never added without my decision.
54. As a Holder of the Quest a Party is marked with, I want to join at once whatever the Join Policy is, so that matched companions are not kept waiting.
55. As an SNU student who joins a marked Party from outside, I want to receive its Quest, so that the plan and the route appear in my list.
56. As an SNU student, I want to be told before joining that Party members share their location, so that I consent knowingly.
57. As an SNU student, I want the capacity to hold even when two people join at the same moment, so that a Party is never over its limit.
58. As a Leader, I want to change the title, the capacity and the Join Policy, so that I can adjust as things change.
59. As a Leader, I want to hand the role to another member, so that I can step back.
60. As a Leader, I want to remove a member, so that I can deal with a problem.
61. As a member, I want to leave, so that I can go my own way.
62. As a member, I want the longest-standing member to become Leader when the Leader leaves, so that the Party goes on.
63. As an SNU student, I want the Party to end when its last member leaves, so that empty Parties do not linger.
64. As a Holder, I want to keep my Quest when I leave a Party or when it ends, so that my plan does not depend on the group.
65. As a member, I want to stay in the Party when I drop the Quest it is marked with, so that the group does not depend on my plan.
66. As a Holder, I want at most one running Party per Quest, so that matched companions do not split by accident.
67. As a Holder, I want to be led to the existing Party when I try to create a second one for the same Quest, so that I join instead.
68. As a Holder, I want to create a new Party for the Quest after the earlier one ended, so that we can regroup.
69. As an SNU student, I want a list of Open and Approval Parties, and the same list for one Global Event, so that I can find a group.
70. As a member, I want a switch for the Party, so that I can stop sharing with the group without leaving it.

### Location

71. As an SNU student, I want my Master Switch to be off until I turn it on, so that nothing is shared by default.
72. As an SNU student, I want a Friend or a Party member to see me only while we both have the switch for that relationship on, so that sharing is always mutual.
73. As an SNU student, I want to be visible to a person as long as one relationship between us is on, so that turning off one Friend's switch does not hide me from my Party.
74. As an SNU student, I want to stop seeing the people of a relationship when I turn its switch off, so that I cannot watch without being seen.
75. As an SNU student, I want the Master Switch to hide me from everyone and everyone from me, so that one switch is enough when I want to disappear.
76. As an SNU student, I want to be hidden whenever I am outside the Campus Boundary, so that my life off campus stays private.
77. As an SNU student, I want being hidden to look the same as having sharing off, so that nobody can tell why I am not shown.
78. As an SNU student, I want the server to keep only my latest position, so that no history of my movement exists.
79. As an SNU student, I want others' Avatars to move in near real time, so that the map feels alive.
80. As an SNU student, I want a Friend whose phone stopped reporting to stay on the map, dimmed and marked with the time since the last report, for up to 10 minutes, so that the map does not flicker in a building with poor signal.
81. As an SNU student, I want leaving a Party, ending a friendship or turning a switch off to take effect at once, so that revoking means now.

### Signals

82. As an SNU student, I want changes made by others to my Party, Quests, Friends, Meetups and matches to appear without my asking, so that my screen is current.
83. As an SNU student, I want my app to catch up when it reconnects or returns to the front, so that a missed signal is repaired.
84. As an SNU student, I want newly published or changed Global Events to appear on my map, so that the map is current.

## Implementation Decisions

### Ownership

- The main server owns Users, Friends, Invite Links, Meetups, Quests, Sub Quests, Parties and Global Events. The match server owns Matching requests and matches in its own database.
- The mobile app has one API, the main server's, and one socket connection, to the socket server. It never calls the match server or the worker server.
- The main server passes Matching requests, withdrawals and status questions to the match server as request-and-response messages and returns the answers to the app.
- The socket server holds no data.

### Repeated requests

- Most requests of this task are protected by a rule: one Party for each User, one running Party for each Quest, one open Matching request for each Global Event, an Invite Link that works once. A repeat of such a request is refused or changes nothing.
- Two requests have no such rule and require the key described in P04: proposing a Meetup and adding a Sub Quest.
- The request from the match server to create a Shared Quest is protected by the match identifier, as described below.

### Friends and Invite Links

- An Invite Link carries a random token, works once and expires after 24 hours.
- The link is an https address on the team's server that opens the app. It needs a fixed server address.
- Accepting creates the friendship with both switches on. The accept screen states that Location Sharing starts.
- Ending a friendship removes it for both.
- Blocking is not part of this iteration.

### Meetup

- A Meetup has a title, a place, a start time and an optional end time. The place is a building from the list or a point on the map.
- States: proposed, accepted, declined, withdrawn, expired.
- Accepting creates a Shared Quest held by both Friends with one Sub Quest built from the Meetup. No Party is created.
- A proposed Meetup cannot be edited. After acceptance the Quest follows the Quest rules, so either Friend can add Sub Quests.

### Quest and Sub Quest

- A Quest is a wrapper: a title, its Holders, an optional Global Event, and its Sub Quests. Time and place belong to the Sub Quests.
- Every Quest has at least one Sub Quest. Sub Quests are one level deep.
- A Quest that points at a Global Event starts with a Sub Quest for attending it. That Sub Quest takes its time and place from the Global Event and cannot be edited by Holders.
- Any Holder may add a Sub Quest and may edit or cancel a Sub Quest that a Holder added.
- The plan is shared; progress is personal. A Sub Quest's content is one record for all Holders. Whether it is done is recorded per Holder.
- Each Sub Quest has a completion kind. Two kinds exist now: by time and by hand. The kind is a field so that a verified kind, such as scanning a code at the venue, can be added later without changing the structure.
- A Sub Quest with an end time counts as ended for everyone once that time has passed. This is computed when read; nothing is written.
- Several Quests may point at the same Global Event: one per User who goes alone and one per match.
- Class Quests are computed from the timetable when the Quest list is read. They are not stored. They are returned in the same shape as stored Quests, with one Sub Quest whose place is the class's building.

### Matching

- A request names a Global Event and a group size from 2 to 4. A User has at most one open request per Global Event.
- Requests are grouped by Global Event and size in the order they arrived. A group completes the moment enough requests exist.
- Being in a Party does not prevent a request. Matching concerns Quests, not Parties.
- An open request expires when the event starts or when the event is cancelled.
- A completed match creates one Shared Quest. It never creates a Party.
- Interests and timetables do not influence grouping in this iteration.

### Explanation by AI

- The match server has an explanation module with one operation: given a match, return one Korean sentence.
- Its input is the matched Users' interest hashtags and the event title. Names, email addresses and locations are not given to the model.
- The implementation runs a free model on the server. Running the model is optional in the development setup; without it, the module returns the fallback.
- The fallback sentence is used when the model is absent, fails or exceeds its time limit. A match never waits on the model.
- AI is central to the product. The interface is built first so that later iterations extend it to grouping and to adding Sub Quests.

### From match to Quest

- The match server records each match as awaiting its Quest and asks the main server to create the Shared Quest.
- It repeats the request until the main server answers, also after a restart.
- The main server handles a match identifier once. A repeated request returns the Quest created the first time.
- This one request is handled this way. There is no general outbox.

### Party

- A Party has a title, a capacity from 1 to 8, a Join Policy, a Leader and an optional mark naming one Quest.
- The mark is set at creation by a Holder of that Quest and never changes. A Quest whose Sub Quests have all passed cannot be used as a mark.
- At most one running Party carries a given Quest as its mark. The database enforces this, so that two simultaneous attempts cannot both succeed.
- A User is in at most one Party. The database enforces this too.
- Capacity is checked inside the transaction that adds the member.
- Entry: Open admits at once; Approval creates a request for the Leader; Closed admits by invitation only and is unlisted. A Holder of the marked Quest is admitted at once under any policy, within capacity. An invited Friend is admitted on accepting, within capacity.
- A User who enters a marked Party without holding its Quest becomes a Holder. A Quest the User held alone for the same Global Event is merged into it.
- After entry, the Party and the Quest do not affect each other. Leaving, removal and the Party's end leave Quests untouched. Dropping the Quest leaves the membership untouched.
- The creator is the Leader. The Leader can hand over the role. When the Leader leaves, the member who joined earliest becomes Leader.
- The Party ends when the last member leaves. It never ends by itself.
- A marked Party is listed under its Global Event while the Quest has Sub Quests ahead.

### Location

- The app uploads positions to the main server. The main server keeps the latest position per User in Redis with an expiry of 10 minutes. No history is stored anywhere.
- An upload is refused when the Master Switch is off, when its time is too old or in the future, or when its accuracy is implausible.
- The main server checks each position against the Campus Boundary in server code, without a database query. A position outside is discarded and the User is recorded as hidden.
- Visibility is decided by one module with one question: may this viewer see this subject now? The answer is yes when both Master Switches are on, the subject is inside the Campus Boundary, and at least one relationship between the two, a friendship or a common Party, has the switch on at both ends.
- The Master Switch starts off. Switches for a Friend and for the Party start on.
- Positions are pushed with their coordinates over the socket connection to the viewers who are connected and allowed at that moment. Delivery is lossy on purpose: only the newest position matters.
- The app fetches the visible positions once when it connects.
- A hidden User, a User with sharing off and a User who is not a Friend or Party member all look the same to a viewer: no Avatar.
- The viewer's app dims an Avatar whose last report is older than 2 minutes and removes it at 10 minutes.
- Any change that ends visibility removes the Avatar from the viewer's map at once.

### Signals

- For everything except positions, the main server sends a small signal naming what changed, and the app fetches that item again.
- Signals travel from the main server to the socket server as NestJS events over Redis, and from the socket server to the apps over Socket.IO.
- The socket server verifies the access token when a connection is opened and places the connection in the User's own room. The main server names the Users each message is for, so the socket server needs no knowledge of Parties or Friends.
- Delivery is not guaranteed. The app fetches the current state when it connects, when it reconnects and when it returns to the front. There is no periodic polling.
- The team accepts that, in the rare case of a lost signal, a list updates late. Stored data is always correct.

## Testing Decisions

- A good test calls a server's API or opens a socket connection as a User would, and checks responses, pushed messages and stored results. It does not assert on internal calls.
- Tests run against a real PostgreSQL and a real Redis.
- The explanation model is replaced at the explanation module's interface. Google's token verification is replaced as in P04.
- Visibility is tested as a table: every combination of Master Switches, relationship switches, friendship, common Party and Campus Boundary, with the expected answer.
- Party rules are tested under concurrency: two Users joining the last free place, two Holders creating a Party for the same Quest, one User joining two Parties.
- Matching is tested for order, size, expiry, withdrawal, merging of a Quest held alone, and the repeated request from match to main.
- Proposing a Meetup and adding a Sub Quest are tested with a repeated key: one Meetup, one Sub Quest, the same response twice.
- Quest progress is tested per Holder: one Holder marks done and the other's state is unchanged; an end time passes and both see it ended.
- Socket tests check that a position is pushed only to allowed viewers and that a connection with an invalid token is refused.
- Prior art: the API-level tests of P04 and P07.

## Out of Scope

- Blocking a User.
- Private Zones. Only the Campus Boundary hides a User in this iteration.
- Grouping by interests, timetable or AI, and recommending an existing match to someone who is looking for companions. Both are part of the product plan and come in a later iteration.
- AI adding Sub Quests.
- Verified completion by code scanning, and badges.
- Conversation inside a Party.
- Push notifications.
- A general outbox or a durable queue. They are reconsidered with notifications in Iteration 2.
- A Party ending by itself.
- Location history.

## Further Notes

- The schedule names 윤유상 and 김태현 as workers and plans 4 hours. The real size is several times that, because Friend, Meetup, Party and Quest were added here. Pull requests are split by feature in this order: Friends, Quest, Party, Location, Signals, Meetup, Matching.
- This task depends on the timetable API of P06 for Class Quests and on the Campus Boundary and building list of P07.
- Published practice for live location is to push positions over an open connection at intervals of 2 to 10 seconds. The reference app Bump keeps location history; this project does not.
- The Invite Link needs a fixed https address. P05 checks whether the tunnel address can be fixed.
