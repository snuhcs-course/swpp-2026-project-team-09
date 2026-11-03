# 02: AI 매칭 says 준비 중이에요, and the app shows no update dialog

Parent: [P15 spec](../spec.md) ("App changes on the HE branch")
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

Two differences of the HE app, both going into the APK of ticket 05.

- **AI 매칭:** Matching was dropped. On the HE branch, every press that would open it shows the shared 준비 중이에요 toast that 오늘의 발자국 shows, and opens nothing. The buttons stay where they are.
- **Update check:** the check at start is off, so the frozen HE app never tells an evaluator to update.

Nothing else is hidden or changed.

## Acceptance criteria

- [ ] Each of these press points shows 준비 중이에요, opens no screen and sends no Matching request:
  - the event card's AI 매칭 and 매칭 중;
  - the events bar's request-list icon;
  - the chat event card's AI 매칭.
- [ ] Starting the app requests no version file and shows no update dialog, whatever the file would say.
- [ ] 관정도서관, 올리기, 오늘의 발자국, Invite Links and photo OCR are unchanged.
- [ ] Tests, with CI green on the HE branch:
  - the tests that expect today's Matching screens or update dialog now expect the HE behaviour;
  - each press point and the app's start are covered (prior art: the `events-matching`, `chat-event-cards` and `update-check` integration tests).
