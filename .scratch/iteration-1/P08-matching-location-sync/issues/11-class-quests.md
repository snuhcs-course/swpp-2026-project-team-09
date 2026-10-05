# 11: Class Quests

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them), 10 (Timetable), 14 (Quest: requests, invitations and the Leader's controls)

## What to build

A User's Quest list shows today's classes beside the stored Quests, so that one list shows the day. A Class Quest is computed from the timetable each time the list is read, and nothing is stored for it. It has the shape of a stored Quest, with a Sub Quest for each of the class's times today that carries the time's start, end, Place and room.

Since nothing is stored, a Class Quest takes no part in what Users do with stored Quests: it is never dropped, given a Sub Quest, joined, led or given a Party, and each route that tries is refused.

## Acceptance criteria

- [ ] The Quest list returns a Class Quest for each of the User's classes that has a time on today's weekday, by the date in Asia/Seoul, every week. The Class Quests follow the stored Quests, in the order of their first start today.
- [ ] A Class Quest has the shape of a stored Quest: the course name as its title, no Global Event, the User as its only Holder, no Leader, capacity 1 and Join Policy Closed. It is marked as a Class Quest, and a stored Quest is marked as not one, so that the app can show it with an icon of its own.
- [ ] A Class Quest has one Sub Quest for each of the class's times today, in the order of their starts, titled with the course name, with today's start and end of that time as instants and completion by time. The Sub Quest's place is the time's Place, with the room after the Place's name in the label. A time without a Place gives a Sub Quest without a place, and its room is not shown.
- [ ] The Quest's identifier is the class's, and a Sub Quest's is its time's.
- [ ] A Sub Quest of a Class Quest ends by time, as any Sub Quest with an end time does. A Class Quest whose Sub Quests have all ended is left out of the list, as any Quest is.
- [ ] Reading one Quest by its identifier answers a Class Quest as the list does, ended or not, on a day its class has a time. On another day the identifier is answered as an unknown Quest.
- [ ] Nothing is stored for a Class Quest. A change to the timetable shows in the next read.
- [ ] For the identifier of any of the User's classes, whether it has a time today or not, these routes refuse with a code of its own for a Class Quest, and nothing changes: dropping the Quest; adding a Sub Quest, and editing, cancelling and marking done one of its Sub Quests; joining; asking to join; each of the Leader's controls: changing the settings, handing over the role, removing a Holder, and listing, accepting and declining requests to join; and inviting.
- [ ] For the identifier of another User's class, each of these routes answers as it does for a Quest the User does not hold: as an unknown Quest.
- [ ] Opening a Party for a Class Quest is answered as for an unknown Quest, since it is no stored Quest the opener holds (ticket 05).
- [ ] A Class Quest is never in the list of recruiting Quests, for all Global Events or for one.
- [ ] Main server tests at the API, with the clock set by the test: a class with a time today in the list after a stored Quest; a class without a time today absent; a class with two times today as one Class Quest with two Sub Quests in the order of their starts; the same class on another of its weekdays; a time with a Place and a room, with a Place only, and without a Place; a Class Quest left out once its Sub Quests have ended; reading one by itself today and on another day; a change to the timetable in the next read; each refused route for the User's own class, with a time today and without; each route for another User's class; opening a Party for it; and the list of recruiting Quests without it.
- [ ] The main server's README records how a Class Quest is computed, its shape and identifiers, and what it cannot do with each route's answer.
