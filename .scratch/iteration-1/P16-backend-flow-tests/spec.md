# P16: Run core backend tests

Status: ready-for-agent

## Problem Statement

Each server is tested on its own in the task that builds it. Nothing yet proves that the four servers work together. A flow can pass every server's own tests and still fail where one server hands over to the next: the worker to the main server, the match server to the main server, the main server to the socket server.

## Solution

A set of tests that starts all four servers with their data stores and runs the three demo flows from end to end through the servers' public interfaces, the way the app would.

## User Stories

1. As a developer, I want one command that starts all servers and runs the flow tests, so that I can check the whole backend before a demo.
2. As a developer, I want the flow tests to use no real external service, so that they give the same result every time.
3. As a developer, I want each flow test to start from an empty state, so that tests do not depend on each other.
4. As a developer, I want a failing flow test to say which step failed, so that I know which server to look at.
5. As the project manager, I want the three flows of the demo proven on the backend, so that a failure in the demo can only come from the app.
6. As an SNU student going to an event, I want the path from asking for Matching to seeing my companion's position to work across servers, so that the main demo works.
7. As an SNU student meeting a Friend, I want the path from an Invite Link to seeing my Friend's position to work across servers, so that the second demo works.
8. As an SNU student checking campus services, I want collected menus and shuttle positions to reach the app's API, so that the third demo works.
9. As an SNU student outside the Campus Boundary, I want the whole system to keep me hidden, so that privacy holds end to end.
10. As an SNU student who turned a switch off, I want the whole system to stop delivering my position at once, so that revoking holds end to end.
11. As a matched SNU student, I want my Quest created even when the main server was unreachable at the moment of the match, so that the retry is proven.

## Implementation Decisions

- The tests live in their own project at the repository root, independent like every other project.
- The four servers run as built, together with a real PostgreSQL and a real Redis. The tests act only through HTTP and socket connections.
- Replaced parts, each at its configured boundary: Google's token verification, the pages and endpoints the worker collects from, Kakao's walking route API, and the explanation model.
- Flow 1, event: two Users sign in; an Administrator publishes a Global Event; both ask for Matching with size 2; both hold the same Shared Quest with an explanation; one creates a Party marked with the Quest; the other joins directly; both turn the Master Switch on and upload positions inside the Campus Boundary; each receives the other's position over the socket; a route to the event's place is returned.
- Flow 2, Friend: a User creates an Invite Link; a second User accepts; each receives the other's position; one proposes a Meetup; the other accepts; both hold the Shared Quest; the friendship is ended and positions stop.
- Flow 3, campus services: the worker collects from saved pages; menus are served by the main server; a shuttle vehicle is served at a position on the route line.
- Negative cases run inside the flows: a Google account outside SNU is refused; a position outside the Campus Boundary is never delivered; a switch turned off stops delivery; a second Party for the same Quest is refused; the match server's request is repeated after the main server was stopped and started.
- Tests for one server's rules stay in that server's task. This task does not repeat them.

## Testing Decisions

- A good flow test reads like the demo script: a sequence of actions by named Users with a check after each step.
- The tests use Vitest.
- The boundary for every test is the servers' public interface. No test reads a database or Redis directly, except to empty them between tests.
- Waiting for a pushed message uses a bounded wait with a clear failure message, not a fixed sleep.
- Prior art: the API-level tests of P04, P07 and P08.

## Out of Scope

- Tests of the mobile app and the admin site.
- Load and performance tests. The schedule places them in Iteration 3.
- A continuous integration workflow. The schedule places it in Iteration 2.
- Coverage targets.

## Further Notes

- The schedule names 김태현 as the worker and 윤유상 as a participant.
- This task depends on P04, P07, P08 and P12.
- The results go into the testing page of the Wiki, which is written in P23.
