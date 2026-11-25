---
status: accepted
---

# The Tour's Practice runs on the phone, with the real screens and made-up data

The Tour (P09, Iteration 5) lets a new User try asking the Assistant, making a 파티, turning it on and accepting a request to join, before they have any Friend. That needs someone to answer them, a Practice Person, and a 파티 nobody else may see. We chose to keep all of it on the phone: while the Tour is in Practice, the app's one client (`apiClient`, `mobile/src/api/client.ts`) answers from an in-memory Practice client built on the mock client, and the screens are the app's real ones. Nothing reaches the main server, so no other User can see a Practice 파티 or Practice Person, and the Tour ships as an app OTA update with no server Release.

## Considered Options

- **Ghost data on the server.** Practice Persons as User rows and Practice 파티 marked as such, filtered out of Boards, Friend lists, Notifications, pushes and metrics. Every query would need the filter, and one missed shows a made-up 파티 to real Users.
- **Screens made for the Tour.** Copies of the map, answer and 파티 screens with fixed content. The real screens are still being rebuilt (P04), so the copies would soon teach a screen the app no longer has.

## Consequences

- The Assistant's answers in Practice are a script, not the model. They come from the mock Assistant (`mobile/src/api/mock/`), which is kept up to date as features change, re-dated to the phone's day: the mock is built for one fixed moment.
- The Practice client implements the same interface as the real one, so a change to what the Assistant or a 파티 sends fails the build until the script follows. A change in meaning that keeps the shape is caught only by the test that runs the Tour on the real screens.
- Practice data must not reach the real query cache, and it is gone when the Tour ends or is stopped.
- The User's own position and push registration are not Practice's: they keep going to the main server during the Tour.
- Practice is marked on screen the whole time, because the screens look real.
