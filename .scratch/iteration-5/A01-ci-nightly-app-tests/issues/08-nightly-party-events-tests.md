# 08: The nightly level's failing 파티 and 행사 tests test the app as it is

Parent: [A01 spec](../spec.md)
Status: ready-for-human (built; waits for review)
Blocked by: None

Native files: none. Releases: none; only test files change.

## What happens now

The nightly-level CI run on 5.0/Main at 7891852f7 (run 46046862134) failed 23 app integration tests in 14 files. Eight of the tests, in eight files, are about 파티 and 행사. The 파티 and 행사 PRs merged on 2026-11-27 and 2026-11-28 did not run them, since a pull request's CI skips the integration level. 5.0/Main has moved to 980634220 since, with no change under `mobile/`, so all eight still fail there. Each file was run alone with `--maxWorkers=2`.

Each of the eight is out of date, or was wrong when it was written. The app does what each one means to check. Nothing here is a regression a User would meet.

| Test | Class | Cause | What changed |
| --- | --- | --- | --- |
| `api/client` › the mock of Parties › lists the Parties and gives the User's own | stale | PR 688 (P06-19, part 2: "`GET /parties` adds, only for a Party whose Quest the User holds, its members") gave the mock's held 파티 `members`. The test's exact `toEqual` was not updated. | The test expects the three `members`, in the order they entered. |
| `notifications-join-requests` › a request to join declined › opens 찾기 | wrong since PR 699 (P06-20) | The test router prints the main screen's cleared `card` parameter, `/party?card=undefined&tab=find`. `notifications` and `party-gone` already allow for this. | Matched as `^/party\?(?:card=undefined&)?tab=find$`, as those files match `/main`. |
| `room-wireframe` › the room's head › draws the 모집글 under the title | stale | PR 715 (P06-26: "the room's 일정" says "오늘 14:00") made 일정's step say "오늘 17:40", as the head's box does. PR 688 wrote the test when only the box said it. | Two "오늘 17:40": the box's and the step's, as the test already counted "301동 앞". |
| `events-tab` › the tab opened at one event › names the event on the Badge and card | stale | PR 688 (P06-19, "No badges at all") removed the room's Badges. Two titles are left: the head's event line and the attending Sub Quest in 일정. | Two, and the test's name says the event line, not a Badge. |
| `events-recruiting` › + 파티 모집 with a Quest the User holds alone › opens the edit form | wrong since PR 714 (P06-28) | `MY_CAREER` is 비공개 (`joinPolicy: 'closed'`). The form's title for its edit has been 파티 수정 since the form was built. 모집글 수정 is the title for a 공개 one. The screen showed 파티 수정 and 수정 완료. | Expects 파티 수정 and the 수정 완료 button. |
| `party-post` › the place of a 파티 picked on the map › opens a small map | wrong since PR 721 (P06-27) | `place-chevron` is an `Icon` with no label. Such an icon is hidden from screen readers, so `getByTestId` does not find it without `includeHiddenElements`. | `getByTestId('place-chevron', { includeHiddenElements: true })` and `toBeOnTheScreen()`, as `room-event` reads `event-chevron`. |
| `room-typed-place` › the place of a Sub Quest in 일정 › opens a small map | wrong since PR 721 | The same. | The same. |
| `party-invites` › the place of an invitation's 파티 › opens a small map | wrong since PR 721 | The same. | The same. |

PR 721's two checks that no › is shown ("leaves 장소 미정 as words", and "takes no press for words typed alone") passed without checking anything. Without `includeHiddenElements` they could never find the hidden icon. They now look for it among the hidden elements too.

## What to build

1. Each of the eight tests checks what the app does now, as the table says. No assertion is loosened.
2. The two "no ›" checks look among hidden elements.

## Acceptance criteria

- [x] The eight files pass, each run alone with `--maxWorkers=2`.
- [x] The files that check the same changes pass, each run once: `room-event`, `room-plan`, `map-event-card`, `notifications`, `party-mine`, and `party-gone`.
- [x] No app source or native file changes; lint, format, and types pass on the app.

## Comments

Built from a triage of nightly-level run 46046862134. Each failure was read from the run's job logs and reproduced alone on 5.0/Main 980634220. The sweep covered the same test IDs (`place-chevron` and the other unlabelled icons' test IDs), `members` in exact mock checks, `card=undefined` in addresses, "오늘 HH:MM" in the room's tests, and Badge text.

The mock's held 파티 `m1` names three `members` but counts four (`memberCount: 4`); the fourth is the User. The app reads the members of the User's own 파티 from `GET /parties/mine`, so no screen shows the difference. It is left as PR 688 made it.

### Agent usage (2026-11-28)

- Agent time: about 1 hour in one session, test runs included (an estimate).
- Tokens (estimates; no exact counter was available to the session): input about 7,000,000 (cache reads about 6,800,000, cache writes about 150,000); output about 25,000. No subagents.
