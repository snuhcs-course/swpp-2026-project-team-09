# 04: Android map module and build settings

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 03 (Map component and stand-in map)

## What to build

A built Android app shows Kakao's map behind the map component. The native module's Android side is written in Kotlin from scratch, as a local Expo module inside the app project, and the app's configuration gains what a build needs. 안진영 writes it without running it; 함재현 builds it, checks it on the shared Android phone against the spec's device check, fixes what fails and merges.

The Kakao native app key is a person's to supply. The agent adds the setting, asks for the value and waits, as `.scratch/research/external-sources.md` §7.1.1 says. §7.2 of that file holds what P05's trial build found.

## Acceptance criteria

- [ ] The app's configuration names the identifier `com.bonnieandclaude.snunow` for Android and iOS, adds Kakao's Maven repository and builds for arm64. The Android and iOS project folders are generated and not committed.
- [ ] The module's Android side implements the whole interface of ticket 03 with Kakao Maps SDK for Android 2.15.2: the rectangle and zoom limits, camera moves, markers with an image and a text, Avatars that glide, the route line, taps, the long press and the camera's stop.
- [ ] Where the SDK does not limit panning, the module brings the camera back inside the rectangle when a move ends outside.
- [ ] The module starts the SDK with the native app key from the settings, and resumes and pauses the map with the screen.
- [ ] Kakao's logo is moved to the bottom right, above the bottom navigation, visible and unchanged.
- [ ] In a build that holds the module the map component uses it; Expo Go keeps the stand-in and does not load the module.
- [ ] The app's README gives the steps from a clean checkout to an app on a phone: the tools and their versions, the settings to fill in, the commands, and what a wrong key hash looks like.
- [ ] The pull request stays a draft until the device check is recorded under Comments, item by item: the map appears, a marker appears with its name, an Avatar glides to a new position, the route line appears and clears, the map survives leaving the screen and coming back, taps on a marker and on the map are answered, a long press is answered, the camera's stop is reported, and the camera cannot be left outside the campus.
- [ ] What the device check changed in the interface of ticket 03, if anything, is recorded under Comments, for ticket 22.
