# 22: iOS map module and iOS sign-in

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 04 (Android map module and build settings), with its device check recorded; 14 (Real Google sign-in and the socket connection)

## What to build

A built iOS app shows Kakao's map behind the map component and signs a User in with Google. The native module's iOS side is written in Swift from scratch, to the interface as the Android device check left it. 안진영 writes it without running it; 함재현 builds it on a Mac, checks it on the simulator against the spec's device check, fixes what fails and merges.

The registrations are a person's: the bundle identifier at Kakao, and an iOS client at Google with its URL scheme. The agent adds the settings, asks for the values and waits.

## Acceptance criteria

- [ ] The module's iOS side implements the whole interface with Kakao Maps SDK for iOS, taken as a CocoaPods pod.
- [ ] The module drives the engine itself: it prepares and activates it when the view is attached to a window, pauses and resets it when the view leaves or the app goes to the background, and activates it again on return.
- [ ] The module sets the map's size when the view's size changes, a first size of zero included.
- [ ] What the screen asks for before the map is ready is kept and carried out once it is.
- [ ] Where the SDK does not limit panning, the module brings the camera back inside the rectangle when a move ends outside. Kakao's logo sits at the bottom right, above the bottom navigation.
- [ ] The sign-in module works on iOS with the iOS client and the Web client as the server client, so that the main server's check does not change.
- [ ] The app's README gives the steps to a build on the simulator and on an iPhone, with what must be registered at Kakao and at Google.
- [ ] `.scratch/research/external-sources.md` gains what was learned for iOS, with its sources: the SDK and its version, the registrations and the sign-in's settings.
- [ ] The pull request stays a draft until 함재현 records under Comments the device check on the simulator, item by item as in ticket 04, and a real sign-in.
- [ ] The Jest tests and Expo Go are unchanged: the stand-in map and the fake sign-in still serve a build without the module.
