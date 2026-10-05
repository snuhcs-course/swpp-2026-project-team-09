# P20: Test three flows and prepare APK demo

Status: ready-for-human

## Problem Statement

Every part has been tested where it was built, and the servers have been tested together. Nobody has yet held two phones and gone through the flows as Users would. The course collects a runnable product at the end of the iteration: a demo branch, a README and a short video. Without an installable app and a rehearsed flow, the iteration has nothing to hand in.

## Solution

The team installs the app on two phones, walks through the three flows on campus, records what happens, fixes what blocks a flow and lists the rest as known limitations. The result is an installable APK, the demo branch and a demo video.

## User Stories

1. As the project manager, I want the three flows run on two physical phones, so that the demo shows what Users would experience.
2. As the project manager, I want each step of each flow recorded as passed or failed, so that the state of the product is known.
3. As the project manager, I want defects that block a flow fixed before the demo, so that the demo completes.
4. As the project manager, I want the remaining defects listed as known limitations, so that the README is honest.
5. As a teaching assistant, I want an APK I can install, so that I can try the product myself.
6. As a teaching assistant, I want a branch named for the iteration's demo, so that I find the submitted state.
7. As a teaching assistant, I want a short video of the key functions, so that I can see the product without setting it up.
8. As a teammate, I want the build steps for the APK written down, so that the next iteration's manager can repeat them.
9. As an SNU student in the demo, I want to choose a Global Event, be matched, open a Party and see my companion's Avatar, so that the main flow is shown.
10. As an SNU student in the demo, I want to tap my Quest and see the route to the event, so that finding the way is shown.
11. As an SNU student in the demo, I want to invite a Friend by link, propose a Meetup and see it become a Shared Quest, so that the second flow is shown.
12. As an SNU student in the demo, I want to read today's menus and watch the shuttle on the map, so that the third flow is shown.
13. As the project manager, I want the shuttle route line compared with the road the shuttle takes, so that the line on the map is right.

## Implementation Decisions

### The three flows

| Flow | Steps |
|---|---|
| Event | Two Users sign in. An Administrator publishes a Global Event. Both ask for Matching with size 2. Within a minute both see the Shared Quest. One opens the Party of the Quest and the other enters it. Both see each other's Avatar move. One taps the Quest and sees the route. |
| Friend | One User sends an Invite Link through a messenger. The other opens it and accepts. Both see each other's Avatar. One proposes a Meetup and the other accepts. Both see the Shared Quest. |
| Campus services | A User opens the dining view and reads today's menus. The User turns on the shuttle layer and watches a vehicle move along the route. |

### Conditions

- Both phones are inside the Campus Boundary. Outside it, Users are hidden by design and the flows cannot be shown.
- The shuttle flow is run on a weekday between 08:00 and 21:00.
- The servers run on a laptop behind an https tunnel.

### APK

- The APK is built from the state of the main line that the demo branch is cut from.
- The signing key of this build is registered at Kakao by its key hash and at Google by its SHA-1 fingerprint. Without both, the map is blank and sign-in fails.
- The APK contains ARM libraries only.
- The server address built into the APK is the tunnel's address.

### Submission

- The branch is named `iteration-1-demo` and is cut from the main line after the last fix.
- The README of P18 is checked against the state of that branch. It carries the demo video or a link to it.
- The video shows the three flows in the order above. Editing beyond cutting is not needed.
- Nothing is force-pushed to the demo branch after it is handed in.

### Defects

- A defect that stops a flow from completing is fixed in the task the faulty part belongs to, through a pull request with that Task ID.
- Any other defect is recorded and added to the known limitations of the README.

## Testing Decisions

- The test is the walk-through itself. Each step of the table is a check with a result.
- The record states for each step: passed or failed, the phone, the time, and a screenshot or recording for a failure.
- Each flow is run twice, the second time with the two Users' roles swapped.
- The shuttle route is checked by riding the loop once and watching one's own position against the route line.
- Prior art: the flow tests of P16 define the same three flows on the backend.

## Out of Scope

- Evaluation with Users outside the team.
- Publishing to the Play Store.
- Deployment to a cloud environment.
- Performance and battery measurements.
- A polished video.

## Further Notes

- The schedule names 윤유상 as the worker and the other three members as participants.
- The walk-through needs people, phones and the campus, which is why the status is ready-for-human. An agent can prepare the build steps and the check list.
- The findings feed the design page of the Wiki in P22: what was attempted, what worked and what did not.
- This task depends on every other task of the iteration.
- The course also collects one ZIP file on eTL, named `team9-iter1.zip`, with four files: `team9-iter1-reqspec.pdf`, `team9-iter1-design.pdf`, `team9-iter1-schedule.xlsx` and `team9-iter1-AI-collaboration-report.pdf`. The names must match exactly. The PDFs are exported from the Wiki. The ZIP is a snapshot taken at the deadline and is not part of the repository.
