# 08: The library's words match the card

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: [02](02-seat-booking-fits-the-day.md), which changes the same words.

Native files: none. Releases: the main server.

## What happens now

- The seat and room proposals end with "예약하기를 눌러야 예약돼요", from the server's words and from the model's rules. A User signed out of 관정도서관 sees only "관정도서관 로그인이 필요해요" and a 로그인 button on the card; the main server cannot know whether the phone is signed in.
- One zone has three names: the catalogue's "7A 열람실 1 구역(노트북존)" in the words, and the app's "7층 노트북존" and "7A 노트북존" on the card. The library itself is "관정관" in the rules and "관정도서관" in the app.

## What to build

- The words keep naming 예약하기, which the P6 benchmark's labels require, and add what to do when the card shows 로그인 in its place: "예약하기를 눌러야 예약돼요. 카드에 로그인이 보이면 관정도서관에 먼저 로그인해요." The same in the study room's words.
- The rules of an app that draws answers say the same, and to call the library 관정도서관, not 관정관. The text chat's rules stay as they were, as their fixture holds them.

Left as it is: the zone's names. The room chip names a kind of room on a floor ("7층 노트북존"), the list cell the seat space's short name ("7A 노트북존"), and the words and the card the catalogue's name ("7A 열람실 1 구역(노트북존)"). That split is the seat card's design; one name everywhere would rename catalogue entries that the P6 benchmark's cases and the card's tests use, for a small gain.

## Acceptance criteria

- [x] A seat or room proposal says what to do when the card shows 로그인. (Integration tests of the booking, the filled seat and the study room.)
- [x] The answer rules say to sign in first and name the library 관정도서관. (Unit test, fails before the fix.)
- [x] The text chat's rules are unchanged. (Unit test against their fixture.)
- [x] Lint, format and types of the main server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 3 minutes (an estimate from the transcript, gaps over five minutes left out).
- Tokens: output 12k; input 7.0M, of which 7.0M cache reads, 26k cache writes and 34 uncached. No subagents.
