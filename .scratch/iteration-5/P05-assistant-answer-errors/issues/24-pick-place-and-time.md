# 24: A Place picked on the map and a time on a wheel, asked back as controls

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None. Both sides: the main server (this ticket's PR) and then the app (P04).

Native files: none.

## What happens now

Found in use (feedback 2026-11-22, item 4): every question the model asks back is words, except the which-Friend grid and, after ticket 23, the Board chips. A Place can already be given by tapping a building (`[Tapped: place …]`), but nothing tells the User so and nothing waits for the tap. A time is always typed.

## What to build

A released app refuses a whole reply that has an offer it does not know: `isAssistantReply` takes only `ask` offers, and `isRefusal` takes only `ask`, `open` and `pick-friend`. So the new offers go only to an app that says a new capability, `pick`, and the server keeps them out of refusals.

- **`pick-place`**: `{ kind: 'pick-place', label: '지도에서 고르기', text: '여기서' }`.
  - A press turns the map into picking. A tap on a building sends `text` as the User's words, with the Place tapped (`context.tapped`).
  - It is set when planNewQuest answers `needs-place`, and when proposeQuest refuses its `placeId`.
  - proposeQuest takes the tapped Place's id, as planNewQuest already does.
- **`pick-time`**: `{ kind: 'pick-time', label: '시간 고르기', date, free: [{ from, until }] }`.
  - A wheel on `date` marks the asker's Free Time, "HH:MM" each, with "24:00" for the end of the day. A pick sends "HH:MM에".
  - It is set when planNewQuest answers `needs-time` (the 파티's day), and when proposeQuest refuses its `startsAt` (the day given, or today when none was given or it is gone).
- With either, the tool's answer carries a `note`: the app shows the picker, so ask in one short question.
- Row 14's 시간 바꾸기 of ticket 17 is the app's: it draws the same wheel for the kept Quest's day, which `kept` gives.

## Acceptance criteria

- [x] `needs-place` with `pick` carries `pick-place`. Without `pick`, no offer. (`assistant-pick-offers.integration.test.ts`; 5.0/Main refuses `pick` with 400.)
- [x] `needs-time` carries `pick-time` for the 파티's day, with the asker's Class left out of its Free Time.
- [x] proposeQuest refused for its time carries `pick-time` for today, and refused for its Place carries `pick-place`; the Place tapped then is taken.
- [x] Lint, format and types of the main server pass.
- [ ] The app (P04): sends `pick`, draws both offers, and sends what a press says.

## Comments

### Agent usage (2026-11-22)

The main server's side only. The app's side is P04's and is not counted here.

- Agent time: about 6 minutes. This is an estimate: gaps under 5 minutes between transcript entries, summed.
- Tokens: input 8,563,005 (cache reads 8,531,682, cache writes 31,283, uncached 40); output 21,854. Without cache reads, 31,323.
