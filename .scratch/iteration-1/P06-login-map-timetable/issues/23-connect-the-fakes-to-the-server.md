# 23: Connect this task's fakes to the main server

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 16 (Profile editing), 19 (Timetable), 20 (Private Events), 21 (Choosing a Place: pointing on the map). Each part also waits until the main server serves it.

## What to build

The app's fakes for this task's own features are replaced by the main server, one feature at a time as the main server comes to serve each: the timetable, Private Events, the profile's course level and gender, and the Place at a position. Each part is its own pull request and removes one line of the fake list.

Where the server's shape differs from the fake's, the feature's adapter changes and the screens do not. A part whose server does not exist yet stays fake, and that is recorded in `todo.md`.

## Acceptance criteria

- [ ] The timetable is read and changed through the main server, and its line leaves the fake list.
- [ ] Private Events are read and changed through the main server, and their line leaves the fake list.
- [ ] The course level and the gender are saved through the profile's routes in Onboarding and in profile editing, and the phone's copy is no longer used.
- [ ] A spot chosen on the map is named by the main server's lookup, and the app's own measuring is removed.
- [ ] Each part's Jest tests run against the fake API in the server's shape, and the screens' tests pass unchanged.
- [ ] `todo.md`'s table of fake features is updated with each part.
- [ ] 함재현 confirms each part in a built app against the real server and records it under Comments.
