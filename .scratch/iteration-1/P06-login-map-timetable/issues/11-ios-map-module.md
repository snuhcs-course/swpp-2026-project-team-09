# 11: iOS map module

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 07 (Android map module), with its device check recorded

## What to build

A built iOS app shows Kakao's map of the campus behind the map component. The native module's iOS side is written in Swift to the interface of ticket 06 as the Android device check left it, by a teammate with a Mac, and checked on the simulator against the same device check.

The registration is a person's: the iOS app's identifier at Kakao. The agent adds what the app's configuration needs, asks for what a person must do and waits.

## Acceptance criteria

- [ ] The module's iOS side implements the whole interface of ticket 06 with Kakao Maps SDK for iOS, taken as a CocoaPods pod: the rectangle and zoom limits, camera moves, markers with an image and a text, Avatars that glide, the route line, a press on a marker and the camera's stop.
- [ ] The module drives the SDK's engine itself: it prepares and activates it when the view is attached to a window, pauses and resets it when the view leaves or the app goes to the background, and activates it again on return.
- [ ] The module sets the map's size when the view's size changes, a first size of zero included.
- [ ] What the screen asks for before the map is ready is kept and carried out once it is.
- [ ] Where the SDK does not limit panning, the module brings the camera back inside the rectangle when a move ends outside. Kakao's logo is visible and unchanged.
- [ ] The iOS app's identifier is `com.bonnieandclaude.snunow`, and the iOS project folder is generated and not committed.
- [ ] The app's README gives the steps to a build on the simulator and on an iPhone, with what must be registered at Kakao.
- [ ] `.scratch/research/external-sources.md` gains what was learned for iOS, with its sources: the SDK, its version and its registration.
- [ ] The device check is run on the simulator and recorded under Comments, item by item as in ticket 07, with screenshots of ticket 06's development screen in the pull request under Test Results.
- [ ] The words of the plain ground no longer name Android alone.
- [ ] The Jest tests, Expo Go and the Android build are unchanged.
- [ ] The app's four checks pass: lint, format, types and tests.
