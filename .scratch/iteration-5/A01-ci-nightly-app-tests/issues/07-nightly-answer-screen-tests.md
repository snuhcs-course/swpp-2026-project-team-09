# 07: The nightly level's answer-screen and main-screen tests test the app as it is

Parent: [A01 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None

Native files: none. Releases: none; only test files change.

## What happens now

The nightly-level CI run on 5.0/Main at 7891852f7 (run 46046862134) failed 23 app integration tests in 14 files. The app's integration tests run only at the nightly level, so none of the pull requests merged on 2026-11-27 ran them. This ticket takes the six answer-screen and main-screen files, 14 of the 23 tests. The party and events files are another ticket's.

Each file was run alone on 5.0/Main at 980634220 with `--maxWorkers=2`, on a Mac under a load of 11 to 18. None of the failures is the app doing something wrong. Four tests are out of date after a pull request changed what the app means to do, and two files have cases slower than Jest's 60 seconds.

| Test | Cause | What changed |
| --- | --- | --- |
| `library-sign-out` › does not wait on the library's site in `signOut()` | Out of date since PR 603 (P08-11) | The sign-out also empties the account's consent copy in the same write ("cleared at a sign-out and a Session's end", ticket P08-11). The test expected the old write without `consent`. |
| `timetable-class-slots` › removes a slot with 삭제, and its days are free again | Out of date since PR 680 (P06-11a) | No day is held by another slot any more ("Every day button can be pressed in every slot", ticket P06-11a), so a day button has no `disabled` state. The test still expected `disabled: false`. |
| `main-event-point` › the merged marker's card › one chosen opens its own card with its actions | Out of date since PR 718 (P06-29) | "같이 갈 사람 찾기" of an event that 파티 gather for opens their sheet over the map, not the form ("With one or more 파티 recruiting, the card's button opens the same recruiting sheet over the map", ticket P06-29). The test still expected `/party-form?eventId=e1`. |
| `answer-frame-library-room-reports` › says the room is booked but the party changed | Out of date since PR 673 (P01-20) | The card has one sentence slot ("In a turn, only the latest bubble draws its words", ticket P01-20). The party-changed line comes after the booking's own "G412 예약되었어요!" in the same turn and takes the slot. Bisected: green at PR 673's parent, red at PR 673. |
| `answer-top-stops`, all 10 cases (9 failed on the nightly) | Slow, since PR 686 (P01-22), which added the file | Each case takes 35 to 70 seconds alone. The reply of several requests is slow to set up: `answer-steps-gold`, with the same setup, took 44 seconds a case on the nightly. The first case past 60 seconds failed, and every case after it failed at once on `over-map`, because the timed-out case left the start screen behind. |
| `main-chat` › sends only the latest 20 messages, and the case after it | Slow | Eleven turns take 42 seconds alone and passed 60 on the nightly runner. The next case failed on the timed-out case's leftovers and passes alone. |

## What to build

1. `library-sign-out` expects the sign-out's write to carry `consent: NO_CONSENT`.
2. `timetable-class-slots` expects the removed slot's day off (`checked: false`) and enabled.
3. `main-event-point` expects the chosen event's sheet over the map: "모집 중인 파티 2" and 이서연's row, with the main screen still shown. The talk beside it has no 파티, so the sheet also shows that the chosen event's id was used.
4. `answer-frame-library-room-reports` expects the party-changed line in the slot and the booking's own line gone.
5. `answer-top-stops` allows each case 150 seconds, and `main-chat` its eleven-turn case, as the app's other long files do (ticket 03).

## Acceptance criteria

- [x] Five files pass, each run alone: `library-sign-out`, `timetable-class-slots`, `main-event-point`, `answer-frame-library-room-reports`, `main-chat`.
- [ ] `answer-top-stops` passes at the next nightly level. On the Mac, under a load of 29 to 41, its first case took 150 seconds and its second 164; under a load of 18 they took 35 to 68 seconds. On the nightly runner a case took about 55.
- [x] No assertion is weakened: each out-of-date one checks the new behaviour in its place.
- [x] The same changed behaviours were looked for in the other integration tests (below).
- [x] No app source or native file changes; lint, format, and types pass on the app.
- [ ] The next nightly level passes these six files.

## Comments

Built from a triage of nightly-level run 46046862134. The room report was bisected by checking out `mobile/src` and `mobile/__tests__` at PRs 646, 673's parent, 673, 684 and 706's parent.

Swept for the same changed behaviours, and each file run once alone. All passed but `answer-study-group-book`, whose first case passed 60 seconds under a load of 30 and every case after it failed with it. It passed on the nightly, so that was the Mac's load.

- A day button's `disabled` state: no other test reads it (`timetable`, `timetable-server` checked).
- The sign-out's `keep` write: every other test reads the kept state with `toMatchObject`, which a new field does not break.
- "같이 갈 사람 찾기" to `/party-form`: only `map-event-card`, already updated by PR 718.
- A booking's "예약되었어요" followed by another line in the same turn: `answer-frame-library-rooms-seats`, `answer-study-group-book`, `answer-frame-library-room-requests`.

### Agent usage (2026-11-28)

- Agent time: about 1.5 hours in one session, the test runs and the bisect included (an estimate).
- Tokens: see the pull request; recorded when it is opened.
