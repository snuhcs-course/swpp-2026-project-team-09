# 13: The everyday map shows what matches the User's interests, with "!" on what is newly posted

Parent: [P05 spec](../spec.md) ("Part 2", "Watched interests"); the design's "Watching interests", "Many results on the map" and "First run"
Status: ready-for-agent
Blocked by: 08 (the matches at `GET /interests/matches` and the `interest-new` Notification, merged)
Native files: no

## What to build

While the switch of the answer on the map is on, the everyday map draws only the events and recruiting parties that match the User's interests. What stands at one place shares one mark, named after the first with the number of the rest ("채용박람회 외 1"). A mark carries "!" while one of its items is newly posted for this User, and a tap on a mark gives the same answer as asking, browsing only that mark's items with the arrows. A User who watches nothing sees two or three of today's events, faded. With the switch off the map is as today.

## Behaviour

- **What is on the map.** The matches of `GET /interests/matches`: the published events and the recruiting Quests that share a topic with the profile's hashtags or a watched interest's topics, each with `watched` (true for a watched interest, false for a match on a hashtag only, which shows and never notifies). Other events are not on the map; they are found by asking.
- **One mark per place.** The items at exactly one point share one mark, as the map groups things at one place. The mark is named after its first item, events first by their start and then parties by their next step's start, with " 외 N" for the rest.
- **Newly posted** means: the item has a kept `interest-new` Notification (`GET /notifications`, kind `interest-new`, url `/main?card=event:<id>` or `/main?card=party:<id>`), it matches a watched interest, and its mark has not been opened on this phone. Such a mark carries "!".
- **Opening a mark** removes "!": the phone keeps, for the signed-in User, the items of the marks opened.
- **A tap on a mark** opens the answer frame as asking does, with the mark's name as the words and the answer of `POST /assistant/answers` for `{ kind: 'events', date, eventIds }` of the mark's events (or `{ kind: 'quests', globalEventId: null, questIds }` for a mark of parties only), so that the arrows browse only that mark's items. A mark without "!" gives the same answer.
- **Nothing watched.** A User with no profile hashtag and no watched interest sees up to three of today's events, faded.
- **An older main server.** A main server without `/interests/matches` (404) and a failed read leave the map as today.

## Files

- New, the marks: `mobile/src/features/map/interest-marks.ts` (pure: the sources, the marks, and the cards they keep or add), `mobile/src/features/map/use-interest-marks.ts` (the queries, the opened items, and a tap), `mobile/src/storage/opened-marks.ts` (the opened items per signed-in User), `mobile/src/design-system/map-mark-badge.tsx` (the "!" and the fade around a place's look), `mobile/src/features/assistant/app-turn.ts` (a turn the app asks itself, answered without the model).
- The client: `listInterestMatches` in `mobile/src/api/interest-types.ts`, `client.ts`, `server/interest-client.ts`, and `mock/interests.ts`.
- A few switch-gated lines in the everyday map's files: `features/map/use-map-cards.ts` (the cards kept and added), `screens/main/use-things.ts` (the mark's name and look, from a side map keyed by card id), `screens/main/use-map-view.ts` (the press, before the selection), `map/marker-looks.tsx` (`fresh` and `faded` on a place's and a group's look), and `features/assistant/use-chat.ts` (the chat's `askApp`).

## Must not change

- The map with the switch off: the same cards, the same looks and look names, and no request to `/interests/matches`.
- `CardView` and `adapter.ts`.
- The main server, and native files.

## Acceptance criteria

- [x] Unit tests: the marks from matches (hashtag and watched); grouping at one place with "외 N"; "!" from a kept `interest-new` not yet opened, and none for a hashtag match or an opened item; the faded fallback of today's events.
- [x] Integration test over the main screen with the fake main server, the switch on: only matching events are drawn; a fresh mark has "!"; a tap opens the answer for that mark's events and clears "!"; a User with no interests sees faded events.
- [x] Integration test: with the switch off the map is as today, and a 404 on the matches draws the map as today.
- [x] Each changed source file has its AI-generated row; lint, format, type checks, and the touched tests pass.

## Comments

### Decisions (2026-11-15)

Details the ticket left to the implementation, listed so that any of them can be vetoed.

1. **Sources.** The pure function takes a list of sources, each a kind with the card ids of its items (`event:<id>`, `party:<id>`): the matches of the interests are the source `interest`, each item with `watched`; the faded fallback is the source `today`. A starred Favorite Event is meant to be a third source, `{ kind: 'star', items: [{ id }] }`, added beside them without a rewrite: a `star` look between `fresh` and `plain` in the order of looks (`LOOKS` in `interest-marks.ts`), and the star drawn beside "!" in `MapMarkBadge`. A place's shared mark takes one look, in the order "!", star, plain, faded; a starred event has no "!" of its own.
2. **"!" needs a watched match.** An item whose only match is a hashtag never carries "!", even with a kept `interest-new` (an interest removed since).
3. **Opened items, not places.** Opening a mark keeps each of its items as opened, under `snunow.opened-marks:<userId>`. An item posted later at a place already opened carries "!" again. "!" is not shown until the phone has read the list, and is cleared only once the answer is on screen. A tapped push still opens the item's card, as before, and leaves "!".
4. **The mark's id** is the item's card id when it stands alone, else the place's (`place:<lat>,<lng>`), the id the map's grouping gives. When another thing of the map (a Quest of the User's, a restaurant of a layer) stands at exactly the same point, the place's own card stands there as today, without the mark's name or look.
5. **The mark's name** is what a screen reader says and the answer's words ("채용박람회 외 1"); a fresh one adds " · 새로 올라왔어요". No words are drawn under it: places have none on the map.
6. **The answer's input.** A mark with events asks for its events on the Korea day of the earliest one's start, or today when it started earlier; a mark of parties only asks for its Quests. A mark of both asks for its events. The chat gains `askApp`, a turn the app asks itself without the model: its words, which the answer's pill shows, are the mark's title ("채용박람회 외 1", never the screen reader's "새로 올라왔어요"), and the reply's words are the first Plan's lines, so that a later question sends a conversation the main server accepts. A failed answer takes the turn back, shows "답을 가져오지 못했어요. 잠시 후 다시 시도해 주세요", and leaves "!".
7. **A recruiting party's card.** A matching recruiting Quest with a place on the map gets a party card, `party:<id>`, with "참여하기" opening its room as an open Party's card does; one the map holds already is not added twice.
8. **Waiting.** While the switch is on and the matches or the watched interests are being read, the map's cards wait as a pending read does, so that no other event flashes. A failed notifications read only means no "!".
9. **Nothing watched.** No profile hashtag and an empty (or unknown) list of watched interests. Today's events are those held today in Korea that have not ended, by their start, at most three, drawn at half opacity.
10. **The look.** `fresh` and `faded` are optional fields of a place's and a group's look, named in the look's name only when set, so that the names with the switch off are unchanged. "!" is a 14 pt navy round, sized as a Friend's "+", at the upper left, outside the glyph and clear of a pin's count at the upper right; the box grows by 6 at both sides and the top for a pin (the tip stays) and at every side for a dot (the middle stays). A faded mark is drawn at half opacity. The drawing is a design-system part of its own, `MapMarkBadge`, around the pin, the dot or the group.
11. **The mock** matches the mock's watched interests against the mock events' titles and descriptions; it reads no hashtags.
12. **Not in this ticket.** A Favorite Event on the map, which comes later with the star itself (its toggle, its routes and the `favorite` field) as the source `star`; and the `eventPins` rule of P06, which this ticket does not build on. The interests hint over the input keeps ticket 09's words.

### Agent usage (2026-11-15)

One implementing subagent (Opus 5.5) built the ticket; the figures are counted up to its commit.

- Agent time: about 71 minutes, an estimate from the transcript's timestamps; much of it was waiting for the shared
  check slots.
- Tokens: output 167,499; input 55,548,914, of which 55,133,626 were cache reads, 414,902 cache writes, and 386
  uncached. Without cache reads: 582,787.
