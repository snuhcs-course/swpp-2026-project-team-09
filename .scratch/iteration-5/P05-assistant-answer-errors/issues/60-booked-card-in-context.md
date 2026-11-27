# 60: A book card the User changed on the phone reaches the model in words, as they left it

Parent: [P05 spec](../spec.md); the user's phone (2026-11-27, preview 1.0.5, Production): the Assistant proposed a book card for 7층 7A 열람실; on the phone the User switched it to 8층 정숙 열람실 and booked it. The next reply said "앞서 제가 7층 7A 열람실 2 구역이라고 한 건 잘못이었어요": the model took the User's change for its own error
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: the main server. No wire change, so the app needs no release.

## What happened

These are read from the code; there is no log.
- The app sends the card back as the User left it, by reference `{ kind: 'library', id: <key> }`, with the 8층 key.
- `run-messages.ts` gave the model its own earlier words, which named 7A, and a bare `[Cards shown: library <key>]`. Nothing said that the User can change a card on the phone, or that they booked it.
- The done message is the app's own bubble and is never sent, and the rules say that the model never sees bookings. So the model read an 8층 key beside its 7A words and called its words wrong. The seat-stay Quest, titled with 8층 8A, was in `[Ahead: …]`.

## What changes

- `run-messages.ts` writes a book card's key out in words, from `bookKeyOf` and the catalogue's name: `[Cards shown: library card for 관정 8층 8A 열람실 1 구역(QUIET ZONE), 11/27 14:00–17:00, as the User left it]`, with `seat <label>` (or `room <name>`) after the name when the key names one. Every other card, and a book card of a space the catalogue lacks, stays its kind and id. The chat's Feature carries the catalogue for it (`libraryCatalogue`).
- One rule line, in the library rules shared by the text chat and the apps that draw answers: "On the phone the User can change a card's room, time and seat, and a card in [Cards shown: …] is as the User left it. Where it differs from your earlier words, the User changed it: it is not your error, so never apologise for your words or say they were wrong. A seat item in [Ahead: …] at the card's time means the User booked it."
- No new request field: no `booked` flag, no booking number, and no seat the card offered by itself.
- The eval harness takes a library card in a written Assistant turn, its key as its seed (`{ kind: library, seed: <key> }`, as a Restaurant card's seed is its key); no world seeds it.
- Not built: the `wait` and `e=` parts of a key stay out of the words; the server set them, not the User.

## Acceptance criteria

- [x] An earlier reply that proposed 7F-7A-zone2, sent back with an 8F book key, reaches the model as the 8층 space in words, as the User left it; a seat goes with it, and a seats card stays its key. (Integration test, failing before the change.)
- [x] The rule line in both chats' rules; the text chat's fixture updated. (Unit test.)
- [x] A library card in a written turn is sent back by its key. (Integration test.)
- [x] The eval case `library-answer-changed-card-no-apology`: the turn after a changed card names 8층 and neither apologises nor says its earlier words were wrong. Not run: no model key on this machine.
- [x] README; whole lint, format and types of the main server; the touched test files run locally.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 25 minutes of one subagent session, from the traced cause to the pushed branch. An estimate.
- Tokens: not measurable from inside the subagent; a rough estimate is input about 4 million, of which about 3.8 million were cache reads, 150,000 cache writes and a few thousand uncached; output about 35,000. No further subagents.
