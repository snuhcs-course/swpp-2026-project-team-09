# 63: The two frozen P6 cancel cases are superseded by the button's new name

Parent: [P05 spec](../spec.md); P05 ticket 62 (#648), which names the library cancel button 예약 취소, as the phone does
Status: ready-for-human
Blocked by: 62 (#648). On its own this change records a supersession that has not happened yet.

Native files: none. Releases: none; the eval only.

## What happened

#648 makes the rules and `proposeLibraryCancel`'s answer to the model say 예약 취소, the phone's button, in place of 취소하기. Two cases of the frozen P6 suite expect the old name: `p6-bookings-cancel` ("관정 예약 취소해줘") and `p6-bookings-cancel-at-three` ("오늘 3시 예약 취소") have `mentions: [취소하기]`. A review of #648 asked what becomes of them.

## What changes

The way ticket 59 handled `p6-bookings-did-i-return`:
- Both cases keep their frozen labels, and a later run fails them by design. `eval/p6/suite.yaml` lists them under `supersededAfterFreeze`, with the date, the tickets and the reason.
- Dated notes above the two cases in `eval/p6/cases/bookings.yaml`, in `labels-notes.md` and in `rules.md`, whose glossary named the button 취소하기.
- `library-answer-cancel` and `library-answer-cancel-at-three` (`eval/cases/library-answer.yaml`, world `p6-answer`, the current app) ask the same questions and hold the new words: the cancel card alone, 예약 취소 mentioned, and neither 취소하기 nor a cancel said to be done.

## Acceptance criteria

- [x] Both superseded cases are in `supersededAfterFreeze`, each with a `heldBy` case that exists.
- [x] The two live cases load and are checked like the other cases (`eval-case-fields`, `eval-p6-suite`).
- [ ] The two live cases pass a run. Written, not run: no model key on this machine.
