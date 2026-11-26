# 12: The booking's time card draws the meal's band

Parent: [P01 spec](../spec.md); the user's phone, twice on 2026-11-27: "여전히 시간 카드의 시간 구간의 갈색 부분의 높이가 밥과 다르네"
Status: ready-for-agent
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

The two time cards draw different bands:
- A meal's time card draws `TimeBand` inside `Bar`: a lane 20 high, its handles, the "＋ 같이" slot, the grip, and the people's rows.
- A seat booking's time card (`BookingBar`) draws the library's own `SlotBand` in a plain white row. Its track is 28 high, with its own handles.

So the gold band and its handles differ in height between the two answers.

## What changes

- **One time card:** `BookingBar` draws the same `Bar` and `TimeBand` the meal's bar draws, at the same height, with the same handles, grip and "＋ 같이" slot. The slot is empty for a booking, as the meal leaves it when nobody can be added.
- **The booking's band data, from the card's slot:**
  - the span, the room's hours as the range, and now;
  - the User's Classes and Quests of that day as busy blocks in their own lane;
  - the words of today, "15:00–16:00 · 1시간", or the Class it runs into.
- **Its rules:** the band carries the library's rules (`TimeBand.rules`, which the app sets and the server never sends):
  - 30-minute steps;
  - the room's shortest and longest length;
  - no start before the next start the room takes today.

  `TimeBand`'s drags, steps and whole moves follow them, so the booking moves as it did. A band without rules moves by a meal's (5-minute steps, at least 15 minutes), as before.
- **What the bar says around the band** is the meal card's: a Class or Quest the booking runs into is drawn red on the User's lane (the booking's own time is the card's fixed window), the words say "17:30 수업과 겹쳐요", and the note between the track's ends names what bounds the band before it, now when that is later than the last Class ("16:00 지금").
- **Unchanged:**
  - `SlotBand` stays only inside the chat's seat card, which has no time card;
  - the band's range, which the time-card-range ticket changes next.

## Acceptance criteria

- [x] The booking's time card draws `TimeBand` (its track and its handles), and no `SlotBand`. (Integration test.)
- [x] A step of the end moves it by 30 minutes, and a drag cannot start the booking before its earliest start. (Integration and unit tests.)
- [x] A meal's band steps and moves as before. (The existing time-band tests.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 40 minutes (an estimate), in one session, from 03:00 to 03:40 KST.
- Tokens: within that session's totals for 2026-11-27 (no subagents).
