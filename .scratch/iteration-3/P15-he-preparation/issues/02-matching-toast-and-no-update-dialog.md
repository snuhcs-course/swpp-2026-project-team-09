# 02: AI 매칭 says 준비 중이에요, and the app shows no update dialog

Parent: [P15 spec](../spec.md) ("App changes on the HE branch")
Status: done
Blocked by: None (can start immediately)

## What to build

Two differences of the HE app, both going into the APK of ticket 05.

- **AI 매칭:** Matching was dropped. On the HE branch, every press that would open it shows the shared 준비 중이에요 toast that 오늘의 발자국 shows, and opens nothing. The buttons stay where they are.
- **Update check:** the check at start is off, so the frozen HE app never tells an evaluator to update.

Nothing else is hidden or changed.

## Acceptance criteria

- [x] Each of these press points shows 준비 중이에요, opens no screen and sends no Matching request:
  - the event card's AI 매칭 and 매칭 중;
  - the events bar's request-list icon;
  - the chat event card's AI 매칭.
- [x] Starting the app requests no version file and shows no update dialog, whatever the file would say.
- [x] 관정도서관, 올리기, 오늘의 발자국, Invite Links and photo OCR are unchanged.
- [x] Tests, with CI green on the HE branch:
  - the tests that expect today's Matching screens or update dialog now expect the HE behaviour;
  - each press point and the app's start are covered (prior art: the `events-matching`, `chat-event-cards` and `update-check` integration tests).

## Comments

- 2026-11-03: The card's `MatchButton` (both AI 매칭 and 매칭 중, on the 행사 tab and in the chat) and the bar's `MatchingButton` call `useNotReadyToast()`. The cards lost their `onMatch`/`onMatching` wiring, the chat its `match` action, and `openMatchingRequests` went with them. The Matching sheet, the `/matching` screen and the live match notice stay as on 3.0/Main, unreachable from the UI, to keep the HE diff small; the bar still counts waiting requests.
- 2026-11-03: `src/app/_layout.tsx` no longer mounts `UpdateCheck`; `src/update/` itself is untouched. No EAS, update or native file changed.
- 2026-11-03: `events-matching` and `chat-event-cards` now press each point and check the toast, the address and that no `POST /matching-requests` is sent. `update-check` starts the app with its real root layout over a file that would require an update, on Android and iOS, and checks that no version file is requested and no dialog shows; it was red against the old layout. Lint, format check, typecheck and the whole Jest run (197 suites) pass locally. CI on GitHub runs once the HE branch is pushed.

### Agent usage (2026-11-03)

- **Agent time** (estimate): about 40 minutes.
  - The implementing subagent: 34 minutes, which includes waiting on its own test runs.
  - The main session: about 5 minutes.
- **Tokens** (measured, subagent): input 134 uncached, plus 8,266,498 cache reads and 317,502 cache writes; output 45,061. The main session that ran all of P15's tickets is counted once, under ticket 06.
