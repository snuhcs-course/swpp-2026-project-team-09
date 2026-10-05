# 08: Matching: asking, withdrawing and the state of a request

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Quests, their Sub Quests and joining them)

## What to build

A User asks for Matching on a Global Event with a group size from 2 to 4, is answered at once that the request waits, and goes on using the app. The User sees the state of the request and can withdraw it while it waits. Grouping the requests and creating the Shared Quest are ticket 09.

The app speaks to the main server only. The main server decides whether a request can be made and passes it to the match server, which keeps it in its own database. This ticket sets how the two servers call each other: over HTTP with a secret both hold, as the worker server calls the main server, so that one instance handles each call.

## Acceptance criteria

- [ ] The main server and the match server call each other over HTTP with a shared secret, which is a setting of both and is listed in each example settings file. The match server's routes take the main server alone and refuse a call without the secret. The match server takes no part in messaging over Redis: its listener, its client and their settings are removed.
- [ ] A User asks for Matching on a Global Event with a size from 2 to 4. The main server refuses, each with a code of its own, a Global Event that is not published or has started, a size outside the range, and a User who holds a Shared Quest for that event. A User who holds a Quest for it alone can ask.
- [ ] The main server passes an accepted request to the match server with the User, the Global Event, the size and the User's interest hashtags. The match server stores it as waiting, with the time it arrived.
- [ ] A User has at most one open request per Global Event, which the match server's database enforces. A second request while one waits is refused with a code.
- [ ] A User withdraws a waiting request. A request in another state cannot be withdrawn.
- [ ] A User reads the state of their request for a Global Event: waiting, matched, withdrawn or expired, or that there is none. A User reads their open requests as a list.
- [ ] Being in a Party does not prevent a request.
- [ ] When the match server does not answer, the main server answers the app with an error it can tell apart from a refusal, and nothing is stored.
- [ ] Main server tests at the API, with the match server replaced at the fetch boundary: each refusal, what is passed on, a withdrawal, each state read back, and a match server that does not answer.
- [ ] Match server tests at its routes: a request stored, the second one refused, a withdrawal, the states, and a call without the secret refused.
- [ ] The READMEs record their part: the routes and refusals in the main server's, and in the match server's the routes for the main server, the secret, the states of a request, and how a route for the main server is written and tested.
