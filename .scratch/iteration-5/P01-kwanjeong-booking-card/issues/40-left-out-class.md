# 40: The app keeps the Classes left out for the conversation, for every kind of answer

Parent: the P05 spec's ticket 70 (the main server's side). Found on the user's phone on 2026-11-27: after a seat answer, "1시 수업 휴강이야" was answered that a Class can be left out "식사 추천에서만", and the time card's ✕ put one back on a meal alone.
Status: ready-for-human
Blocked by: the main server's P05 ticket 70 (#689, merged).

Native files: none. Releases: an app OTA update, after the main server with #689.

## What changes

- **The conversation keeps the list.** Each reply's `skipped` stays with its bubble (`assistant-bubble.ts`). The conversation's list is the latest one (`features/assistant/left-out.ts`), and every message (`request-context.ts`) and every recalculation (`recalculateAnswer`) sends it. Nothing is sent before a reply gave one, so a main server before #689 sees nothing new.
- **The ✕, for any kind.** A time card's ✕ takes the Class out of the conversation's list at once (`chat.putBack`), then recalculates the answer on screen of any kind (`shown.putBack`; `withoutSkipped` always gives new conditions). A meal's own `input.skipped` loses it too.
- **The seat's band.** The seat answer's band is built in the app from the User's Quests (`bookingBandOf`). It now takes the conversation's list: those Classes are off the lane and out of the card's clash words, drawn apart in `band.skipped` with their ✕, and the card's height counts their row (`answer-frame.tsx`). A ✕ there puts the Class back: the lane and the card's own clash words return, and the slot is kept.

## Acceptance criteria

- [x] The conversation's list is the latest reply's, a ✕ takes one out at once, and every request of the conversation sends it. (Unit test, new.)
- [x] A recalculation sends the list as it is when sent, and a ✕ puts the Class back before it asks, for any kind. (Unit tests, failing before the change.)
- [x] The seat's band draws a left-out Class apart, off the lane and out of the clash words. (Unit test, failing before the change.)
- [ ] Emulator pictures of a seat answer with a Class left out, at font scale 1.0 and 1.3.
- [x] No native file changes; lint, format and types pass on the app.

## Phone steps, once the server (#689) and this are released

1. Type "관정 열람실 자리 있어?", then "1시 수업 휴강이야".
2. The reply says the Class was left out, with no "식사 추천에서만". The seat's time card shows the 13:00 Class as a dashed gap and a "뺀 수업" row with a "13:00 ✕" chip, and the seat time reaches past 13:00.
3. Pressing ✕ puts the Class back on the lane; the card then shows its own clash words and keeps the slot.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 25 minutes, an estimate, in one session.
- Tokens, estimated as this ticket's share of that session: input 45M, of which 45M cache reads, 0.07M cache writes and under 1k uncached; output 45k.
