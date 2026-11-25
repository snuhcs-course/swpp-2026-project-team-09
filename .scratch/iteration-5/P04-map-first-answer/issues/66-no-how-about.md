# 66: A building pressed during a meal's Plan asks nothing: "여기면 어때?" is removed

Parent: [P04 spec](../spec.md)
Status: ready-for-agent
Blocked by: none.

Native files: none. Releases: an app OTA update.

## What happens now

While a meal's Plan is on screen, a press on a building that is not one of its candidates asks the main server about it with that Place fixed. The answer shows as "여기면 어때?" over the Plan, with "여기로 바꾸기" and "그대로" (P02 ticket 26). The caption then names the building, and ✕ and back return to the Plan instead of closing the answer.

The user's decision (2026-11-25): choosing where to eat is pressing one of the places offered; asking about a place on the map is a feature of its own, not the meal's.

## What to build

1. With a meal's Plan on screen, a press on a building that is none of the answer's marks does nothing. That is what it already does while any other answer is on screen. The answer's own marks and Friends' faces keep their presses: the candidates show their Plans, and the pick, 나, and the Plan's people open their cards.
2. The app's side of "여기면 어때?" goes:
   - `how-about.ts`, `use-how-about.ts`, `how-about-card.tsx`;
   - the asking state in the chat sheet;
   - the caption's building name, and ✕ and back returning to the Plan;
   - the reply's card kind and the plan action's case;
   - the map's asking scene and building press;
   - the mock's copies of boards a7 and a8;
   - their tests.
3. The main server stays as it is. A fixed Place in the conditions (`placeId`) is still the server's. Anything there that only this card read is listed in the PR, not deleted.

## Acceptance criteria

- [ ] A building pressed during a meal's Plan asks nothing and changes nothing on screen.
- [ ] The candidates, the pick, 나, the Plan's people, and Friends' faces take their presses as before.
- [ ] No code or mock refers to "여기면 어때?" or its files; a test checks that the card no longer comes.
- [ ] No native file changes; lint, format, and types pass on the app.

## Comments
