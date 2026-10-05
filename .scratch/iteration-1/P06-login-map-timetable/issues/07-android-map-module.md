# 07: Android map module

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: 06 (Map component, its interface and marker images)

## What to build

A built Android app shows Kakao's map of the campus behind the map component. The native module's Android side is written in Kotlin from scratch, as a local Expo module inside the app project, and the app's configuration gains what a build needs. It is run on an Android emulator on the developer's machine against the spec's device check, and once more on the team's shared phone before the pull request is merged.

The Kakao native app key is a person's to supply. The agent adds the setting, asks for the value and waits, as `.scratch/research/external-sources.md` §7.1.1 says. §7.2 of that file holds what P05's trial build found: the SDK ships ARM libraries only.

## Acceptance criteria

- [ ] The app's configuration names the identifier `com.bonnieandclaude.snunow`, adds Kakao's Maven repository and builds for arm64. The Android and iOS project folders are generated and not committed.
- [ ] The module implements the whole interface of ticket 06 with Kakao Maps SDK for Android 2.15.2: the rectangle and zoom limits, camera moves, markers with an image and a text, Avatars that glide, the route line, a press on a marker and the camera's stop.
- [ ] Where the SDK does not limit panning, the module brings the camera back inside the rectangle when a move ends outside.
- [ ] The module starts the SDK with the native app key from the settings, and resumes and pauses the map with the screen.
- [ ] Kakao's logo is visible and unchanged.
- [ ] In a build that holds the module the map component uses it. Expo Go and the web keep the plain ground and do not load the module.
- [ ] The app's README gives the steps from a clean checkout to the app on an emulator and on a phone: the tools and their versions, the emulator's system image, the settings to fill in, the commands, and what a wrong key hash looks like.
- [ ] The device check is run on the emulator and recorded under Comments, item by item: the map appears, a marker appears with its name, an Avatar glides to a new position, the route line appears and clears, the map survives leaving the screen and coming back, a press on a marker is answered, the camera's stop is reported, and the camera cannot be left outside the campus.
- [ ] If Kakao's map does not run on the emulator, that is recorded under Comments with what was tried, and the device check is run on the shared phone instead.
- [ ] Screenshots of the development screen of ticket 06 on the emulator are in the pull request under Test Results.
- [ ] The pull request is merged only after the device check passed on the team's shared phone, recorded under Comments.
- [ ] What the device check changed in the interface of ticket 06, if anything, is recorded under Comments for ticket 11.
- [ ] The main screen's tickets that were merged before this one are run on the emulator, and their screenshots, compared with the frames, are added under Comments.
- [ ] The app's four checks pass: lint, format, types and tests.
