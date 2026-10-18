# snu-now-ocr

A local Expo module around Google ML Kit Text Recognition v2 with the Korean recogniser. It reads the text of an image
on the phone, for the timetable import (P13). `src/features/timetable-ocr/native-ocr.ts` is the one file that calls
it; the mobile README's "Text recognition (OCR)" section describes the answer and the development screen.

| Platform | Library                                                                    | Model                           |
| -------- | -------------------------------------------------------------------------- | ------------------------------- |
| Android  | `com.google.mlkit:text-recognition-korean:16.0.1` (`android/build.gradle`) | Bundled in the app; no download |
| iOS      | `GoogleMLKit/TextRecognitionKorean` `>= 7.0.0` (`ios/SnuNowOcr.podspec`)   | Bundled in the pod              |

## Confidence

What each platform gives, checked on 2026-10-18 against the libraries themselves:

- **Android**: a confidence for every line and every element (word), from `Text.Line.getConfidence()` and
  `Text.Element.getConfidence()` (`play-services-mlkit-text-recognition-common` 19.1.0, which
  `text-recognition-korean` 16.0.1 brings in). It is a `float` between 0 and 1 and is always present, so on Android
  `confidence` is never null. A `Text.Symbol` (a character) has one too, which the module does not return; a
  `Text.TextBlock` has none.
- **iOS**: none. `MLKTextLine` and `MLKTextElement` in `MLKitTextRecognitionCommon` 6.0.0 (the version that
  `GoogleMLKit` 9.0.0 uses) hold only `text`, `frame`, `recognizedLanguages` and `cornerPoints`. The module returns
  `confidence: null` for every line and element on iOS.

The reading pipeline must therefore work with no confidence at all: on iOS every line is without one, and a threshold
can only apply on Android.

## Boxes and the small copy

- Boxes are `{ x, y, w, h }` in the original image's pixels, from its top-left corner. Android decodes the image to an
  ARGB_8888 bitmap (a 16-bit PNG too) and gives ML Kit the bitmap, so its boxes are in the file's pixels; iOS redraws
  the image upright at scale 1 first. EXIF orientation is not applied on Android: screenshots have none.
- `pixels` is the image scaled to 330 pixels wide (never up), the aspect kept, as RGBA bytes row by row from the top,
  in base64. `scale` is the original's width over the copy's: a pixel (x, y) of the copy is (x × scale, y × scale) in
  the original.

## Building

Android builds with the app (`pnpm android`); for an x86_64 emulator, see "The emulator" in the mobile README. iOS
has not been built yet: the first `pod install` on a Mac fetches ML Kit's pods. ML Kit's iOS frameworks have long had
no arm64 slice for the simulator on Apple Silicon, so the simulator build may need a Rosetta simulator or a phone.
