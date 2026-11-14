# 04: The Friend view, and the Assistant reads Friends only through it

Parent: [P03 spec](../spec.md) ("The Friend view")
Status: ready-for-agent
Blocked by: none

## What to build

One service of the main server answers what a viewer sees of each Friend: the level, and the position and Place that level allows, read from today's switches. The Assistant reads who the User's Friends are and where they are only through it, which is ticket 04 of the engine's package (`P01-agentic-map-engine/issues/04-friends-through-one-view.md`).

## Acceptance criteria

- [x] The Friend view lists every Friend of the viewer with a level. A Friend whose position the viewer may see now is at `exact`, with that position and its Place; every other Friend is at `timetable`, with no position and no Place.
- [x] The level follows the visibility rule of today: both Master Switches, and a friendship or a common Party with its switch on at both ends.
- [x] The meal Plan reads its Friends, their positions, and their levels through the view, in the one place it reads positions today.
- [x] Every other tool of the Assistant that reads who the User's Friends are reads the view.
- [x] No source file of the Assistant imports the position store, the visibility rule, or the location sharing service, and a test fails when one does.
- [x] For each tool that returns anything about a Friend, a test with the view answering "Timetable only" for a Friend who has a position: the tool's result, what the model is given, and the reply hold no position and no Place beyond the Timetable's.
- [x] An app without the `answer` capability is answered as before.
- [x] Integration tests of the view over the started server with real switches: seen, each switch off, no position kept, a common Party, and a User who is no Friend.

## Comments

- The prompt, the tools, and their order are unchanged: only the service behind the tools that read Friends changed. Locally only the test files this ticket touches were run; CI runs the rest of the Assistant's tests, which check an app without `answer`.

### Decisions (2026-11-14)

- The view is `FriendViewService.list(viewerId)` in `main-server/src/friends/`, provided by `FriendsModule`, which now imports `PlacesModule` for `PlaceLookup`. No caller needs one Friend's view, so there is no method for one.
- A Friend's Place is what `PlaceLookup.at` gives for the position, inside or near a Place, as the meal Plan has always read it, so that the Plans stay the same. It is null when no Place is that near.
- A Party member who is no Friend is left out even when the viewer may see them, because the view lists Friends only.
- The meal Plan keeps the position only when the view gives `exact`, and passes only its latitude and longitude on, so that the time it was measured reaches no answer.
- Every Assistant service that took `FriendsService` (the Friend resolver, `proposeQuest`'s invitees, `findFreeFriends`, `findMealRestaurants`, and the library booking's companions) now takes `FriendViewService`, and nothing in the Assistant uses `FriendsService` any more. `AssistantModule` no longer imports `LocationSharingModule`.
- The "Timetable only" tests share a helper in `test/location-sharing.ts`: the Friend uploads a position at 8동 with more digits than any seed Place has, then turns their sharing with the asker off. A test then looks for those coordinates, 8동, and 두산인문관 in what the model received and in the reply.
- The unit test reads every `.ts` file under `src/assistant/` and matches the import paths `location-sharing/position-store`, `location-sharing/visibility.service`, and `location-sharing/location-sharing.service`, dynamic imports included.
