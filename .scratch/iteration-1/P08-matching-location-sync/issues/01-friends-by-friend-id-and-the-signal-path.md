# 01: Friends by Friend ID, and the signal path

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User has a Friend ID and gives it to someone. That person enters it, sees whose it is and sends a Friend Request. The User sees the request with its sender and accepts or declines it; accepting makes the two Friends. Either can end the friendship. The Invite Link is ticket 02, and what Friends see of each other on the map is ticket 03.

The other User's app learns of each step without asking. This is the first signal, so the ticket also builds the path every later ticket uses: the main server names the Users a signal is for, the signal travels as one NestJS event over Redis to every socket server, and each socket server sends it to the connections of those Users.

## Acceptance criteria

- [ ] Every User has a Friend ID: 8 characters from capital letters and digits, without 0, O, 1, I and L. The main server makes it when the User is created, the database keeps it unique, and it never changes. The profile and the lobby return it. The migration removes the Users stored before it, with their sessions, since no database is deployed yet.
- [ ] Looking up a Friend ID returns its owner's name and department, and says so when nobody holds it.
- [ ] Sending a Friend Request to a Friend ID leaves one waiting request. It is refused, each with a code of its own, for the sender's own ID, an ID nobody holds, a User who is already a Friend, and a request to that User already waiting.
- [ ] A request to a User whose own request to the sender is waiting makes the two Friends at once and leaves no request.
- [ ] A User lists the Friend Requests sent to them, each with its sender's name and department, and the ones they sent.
- [ ] Accepting creates the friendship. Declining removes the request, and so does cancelling by its sender. Only the receiver accepts or declines, and only the sender cancels.
- [ ] A User lists their Friends, each with the name and the department. Ending a friendship removes it for both.
- [ ] Two requests that cross, and two answers to one request sent at the same moment, leave one friendship or none: the database allows one friendship and one waiting request between two Users.
- [ ] A socket connection joins its User's own room, beside the room of its session.
- [ ] The main server sends a signal by naming the Users it is for, the signal and what it carries. It travels as one NestJS event over Redis, and every socket server sends it under the signal's name to those Users' rooms. A signal that names no Users goes to every connection. `session-ended` and `shuttle-vehicles-updated` stay as they are.
- [ ] `friends-changed` goes to both Users when a Friend Request is sent, accepted, declined or cancelled, and when a friendship ends. It carries nothing.
- [ ] Main server tests at the API: each refusal, the crossing requests, the lists, ending a friendship, and the event seen on Redis with the Users it names.
- [ ] Socket server tests: a signal reaches every connection of a User it names and no connection of another User, and a signal that names nobody reaches every connection.
- [ ] The READMEs record their part: the Friend ID, the routes and their refusals in the main server's, and the User's room, the event from the main server and the signals in the socket server's, with what the app does on each signal.
