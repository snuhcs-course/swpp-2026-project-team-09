# 62: The Assistant names the library cancel button as the phone does, 예약 취소

Parent: [P05 spec](../spec.md)
Status: ready-for-human
Blocked by: None

## What happens now

The phone's library cancel button is "예약 취소" (PR 646, the cards after a booking), but the server's rules and tool
summaries still say "취소하기". The phone hides the Assistant's words over those cards, so the old word shows only
elsewhere: the text chat, and the history.

## What to build

- The library cancel tool's summary, "예약 취소를 눌러야 취소돼요.", and its description.
- The rule for `notInUse` ("예약 취소를 누르면 취소돼요"), and the rule about a shown card ("예약하기 (or 예약 취소,
  반납하기)").
- The return button stays 반납하기, as on the phone. The Quest cancel button ("취소하기" / "나가기", `cancel-quest.ts`) is
  another button, and stays.

## Acceptance criteria

- [x] No library rule, summary or description says 취소하기. (`library-rules.unit.test.ts` with its fixture,
  `assistant-library-cards.integration.test.ts`.)
- [x] The frozen P6 cases that expect 취소하기 (`eval/p6/cases/bookings.yaml`, two cases) are left as frozen, and named in
  the PR.
