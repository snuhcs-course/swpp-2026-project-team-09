# 27: Connect the app to P06's server APIs

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 16 (Profile editing), 19 (Timetable), 20 (Private Events), 21 (Choosing a Place: pointing on the map), and for each part its server ticket: 23, 24, 25, 26

## What to build

The app's fakes for this task's own APIs are replaced by the main server, one API at a time as each server ticket lands: the timetable, Private Events, the profile's course level and gender, the Place at a position, and the code on a refused refresh. Each part is its own pull request and removes one line of the fake list.

Where the server's final shape differs from the fake's, the feature's adapter changes and the screens do not.

## Acceptance criteria

- [ ] The timetable is read and changed through the main server (ticket 23), and its line leaves the fake list.
- [ ] Private Events are read and changed through the main server (ticket 24), and their line leaves the fake list.
- [ ] The course level and the gender are saved through the profile's routes (ticket 25) in Onboarding and in profile editing, and the phone's copy is no longer used.
- [ ] A spot chosen on the map is named by the main server's lookup (ticket 26), and the app's own measuring is removed.
- [ ] A refresh refused with `SESSION_REPLACED` shows the dialog of a replaced Session, and the spec's known gap is closed.
- [ ] Each part's Jest tests run against the fake API in the server's final shape, and the screens' tests pass unchanged.
- [ ] `todo.md`'s table of fake features is updated with each part, and the spec's list of features that start fake is left as the record of the start.
- [ ] 함재현 confirms each part in a built app against the real server and records it under Comments.
