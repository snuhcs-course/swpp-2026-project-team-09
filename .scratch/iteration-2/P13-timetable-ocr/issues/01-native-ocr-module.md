# 01: The native OCR module, picking an image, and the saved outputs of the four screenshots

Parent: [P13 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The app can read the text of an image on the phone. A local Expo module wraps Google ML Kit Text Recognition v2 with the Korean recogniser, on Android and iOS. Given an image URI, it returns the recognised lines and their elements, each with its text, its bounding box in image pixels and its confidence where the platform gives one, and a downscaled RGBA copy of the image (about 330 px wide) with the scale back to the original.

`expo-image-picker` is added for picking a screenshot from the album. P06's ticket 04 adds it too; whichever lands first adds it, and the other reuses it.

A development-only screen runs the module on an image picked from the album and saves its output as JSON. It is used once on the Android emulator to save the outputs of the four reference screenshots, which ticket 02 reads as test fixtures.

Expo Go has no native module: there, nothing calls it, and `이미지로 불러오기` keeps its "준비 중이에요" toast.

## Acceptance criteria

- [x] A local Expo module beside the map module exposes one function: read an image URI, return lines, elements, boxes, confidences and the downscaled RGBA copy with its scale.
- [x] Android uses `com.google.mlkit:text-recognition-korean` with the bundled model, so no download is needed at first use.
- [ ] iOS uses `GoogleMLKit/TextRecognitionKorean`; it builds on 함재현's Mac. ML Kit's iOS pods have had no arm64 slice for the Apple-silicon simulator, so a device or a Rosetta simulator may be needed; the README says which worked.
- [x] What each platform returns as confidence (per line, per element, or none) is checked and written in the module's README, so that ticket 02 applies the right rule (the spec's "Where the platform gives no confidence").
- [x] The JS side has a typed wrapper, and an "unavailable" answer where the module is missing (Expo Go, web, Jest).
- [x] `expo-image-picker` is added: images only, no editing. The photo-library permission text is set in the app config.
- [x] The Android development build can add the `x86_64` ABI for the emulator through a development-only setting; release builds stay `arm64-v8a`.
- [x] The development-only screen picks an image, runs the module and saves the output as JSON. It is reachable only in development builds.
- [x] The outputs of the four reference screenshots are saved from the emulator, with the device and ML Kit version noted.
- [x] The four screenshots, their saved outputs and pixel copies are committed as test fixtures; their owner agreed on 2026-10-18.
- [x] A Jest test covers the wrapper's "unavailable" answer.
- [ ] A device check by 함재현 on the shared Android phone and on iOS: the module reads one screenshot.

## Comments

### Agent usage (2026-10-18)

- Agent time: about 2 h 25 min, an estimate: one implementing agent on branch `2.0/P13-01-native-ocr-module`, most of it waiting on the Android builds (a full build of both ABIs, then an x86_64 build after the machine powered off) and the emulator run; the self-review's fixes are included. The coordinating session is not counted here.
- Tokens: recorded by the main session.
- Not done here: the iOS build on 함재현's Mac (the podspec and Swift code are written but never compiled) and the device check on the shared Android phone and on iOS.
