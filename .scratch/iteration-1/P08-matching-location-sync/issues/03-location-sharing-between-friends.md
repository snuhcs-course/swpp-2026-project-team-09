# 03: Location Sharing between Friends

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A User turns the Master Switch on and their app uploads positions. A Friend's map shows the User's Avatar moving, as long as both have their Master Switch on, both have the switch for that friendship on, and the User is inside the Campus Boundary. The moment one of these stops holding, the Avatar leaves the Friend's map. The server keeps only the latest position, for 10 minutes, and no history.

One module answers who may see whom. This ticket gives it the friendship; ticket 05 adds the Party.

## Acceptance criteria

- [ ] The Master Switch is stored on the User and starts off. A User turns it on and off, the lobby returns it, and signing in and signing out leave it as it is.
- [ ] Each Friend has a switch on the friendship, which starts on. A User changes their own, and the list of Friends returns it.
- [ ] An upload carries a latitude, a longitude, the accuracy radius in metres and the time it was measured. It is refused, each with a code of its own, when the Master Switch is off, when it was measured more than 60 seconds ago or more than 10 seconds ahead of the server's clock, and when the accuracy radius is over 100 metres. The three numbers are named constants.
- [ ] A position outside the Campus Boundary is not kept, the stored one is cleared, and the answer tells the User that they are not shared because they are off campus. The Boundary is checked in server code, without a database query.
- [ ] The latest position of a User is kept in Redis and expires 10 minutes after it was stored. No position is written to the database or to a log.
- [ ] One module answers whether a viewer may see a subject now: both Master Switches are on, the subject has a position inside the Campus Boundary, and a relationship between the two has its switch on at both ends. It is tested as a table of every combination of the two Master Switches, the two switches of the friendship, the friendship existing or not, and inside or outside the Boundary.
- [ ] Each position that is kept is pushed as `position`, with the User, the coordinates and the time it was measured, to the Users who may see the subject at that moment.
- [ ] `position-removed`, with the User, goes at once to each viewer who could see the subject and no longer can: when the subject or the viewer turns the Master Switch off, when either turns the friendship's switch off, when the friendship ends, when the subject leaves the Campus Boundary, and when the subject's session ends.
- [ ] A session that ends, by a sign-in on another phone, a sign-out or a used refresh token, clears the User's stored position.
- [ ] A User fetches the positions they may see now, each with the time it was measured. The list of Friends says for each Friend whether the User can see them now, and never why.
- [ ] A viewer cannot tell a Friend who is off campus from one with sharing off or one whose position has expired: all three have no position and are not visible.
- [ ] Main server tests at the API: each refusal, a position outside the Boundary, the expiry, the fetch, each removal with the event seen on Redis and the Users it names, and the session's end.
- [ ] A socket server test: a position reaches a viewer it names and no other connection.
- [ ] The READMEs record their part: the switches, the upload with its refusals and its numbers as provisional until P17, what is stored and for how long, the visibility rule, and `position` and `position-removed` with what the app does on each. The socket server's README states that a connection opened with the token of an ended session stays open until the token expires.
