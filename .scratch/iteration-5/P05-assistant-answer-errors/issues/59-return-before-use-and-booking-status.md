# 59: "반납해줘" before the seat is in use cancels it, and "반납 됐어?" shows the bookings

Parent: [P05 spec](../spec.md); the user's phone (2026-11-27, a seat booked through the app before opening, preview 1.0.5): "반납해줘" was answered "반납 카드를 보여 드렸어요…" while the return card said "지금 사용 중인 좌석이 없어요", and "반납 잘 됐니?" was refused as something the Assistant cannot see
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server. The prompt change reaches every app, the text chat's included.

## What happened

Read from the code; no request went to the library site or to Production.
- `proposeLibraryReturn` checked nothing: it always showed the return card and answered "반납 카드를 보여 줬어요. 반납하기를 눌러야 반납돼요.", which the model repeated. A seat is returned only once confirmed at the 좌석배정기, and the phone's return card keeps only bookings in use, so a booked seat not yet started was dropped.
- One rule line shared by every app said that a question whether something was done ("반납했어?") is answered by saying the Assistant cannot see the User's bookings, with no card. `showMyLibraryBookings` already shows a card that lists each booking with its state.

## What changes

- `proposeLibraryReturn` reads the User's seat stay of today (`library/seat-stay-now.ts`: the one under way, else the next to start). A seat booked through the app's card is one. While that stay has not started, it shows the cancel card for that booking (`cancel:-:<date>:<HHMM>`) and answers `notInUse: true`; from the start on, and for a room named, it shows the return card as before.
- No library tool summary names a card: cancel and return say only what pressing does, seats and bookings say what is shown below, and a book card's summary says the booking was put below.
- The rules every app shares (`rulesWith`): 반납 is only for a seat confirmed at the 좌석배정기, or a room in use, and a booking not yet in use is cancelled; on `notInUse`, one sentence that the seat is not in use yet and that 취소하기 cancels it; "내 예약", "예약 됐어?", "취소 됐어?", "반납 됐어?" and "반납했어?" call `showMyLibraryBookings`, with one sentence, naming no card, that each booking's state is shown below, and never whether it went through; the sentence for a shown card names no card. "You never see … the User's bookings" now says "as the library holds them", since `notInUse` comes from the app's own record.
- The frozen P6 case `p6-bookings-did-i-return`, which expects the old refusal, keeps its label. It is listed under `supersededAfterFreeze` in `eval/p6/suite.yaml`, with dated notes in the case file, `labels-notes.md` and `rules.md`; `library-answer-did-i-return` holds the new answer.
- Not built here: the phone's return card offering 취소하기 for a booked seat it finds not in use, which covers the time from the start to the kiosk confirm that the server cannot see. It belongs to the session that owns the card.

## Acceptance criteria

- [x] A seat stay that starts later gives the cancel card's key and `notInUse`; a started one still gives the return card, and a room named gives its return card. (Integration test, failing before the change.)
- [x] Every app's rules send "반납 됐어?" to `showMyLibraryBookings`, cancel a seat not in use, and name no card; the text chat's fixture holds the new shared lines. (Unit test, failing before the change.)
- [x] The tests that pin a library summary hold the new words.
- [x] The eval case `library-answer-did-i-return`. Written, not run: no model key on this machine. "반납해줘" for a seat not yet in use has no eval case: the P6 world holds no seat stay, and adding one would change the frozen P6 cases' answers.
- [x] README; whole lint, format and types of the main server; the touched test files run locally.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 35 minutes of one subagent session, from the traced causes to the push; the causes were traced earlier in the session that started it. An estimate.
- Tokens: not measurable from inside the subagent; the session that started it adds them.
