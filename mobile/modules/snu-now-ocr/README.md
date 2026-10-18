# snu-now-ocr

A local Expo module around Google ML Kit Text Recognition v2 with the Korean recogniser. It reads the text of an image
on the phone, for the timetable import (P13). `src/features/timetable-ocr/native-ocr.ts` is the one file that calls
it; the mobile README's "Text recognition (OCR)" section describes the answer and the development screen.

| Platform | Library                                                                    | Model                           |
| -------- | -------------------------------------------------------------------------- | ------------------------------- |
| Android  | `com.google.mlkit:text-recognition-korean:16.0.1` (`android/build.gradle`) | Bundled in the app; no download |
| iOS      | `GoogleMLKit/TextRecognitionKorean` `~> 9.0` (`ios/SnuNowOcr.podspec`)     | Bundled in the pod              |

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

- Boxes are `{ x, y, w, h }` in the original image's pixels, upright, from its top-left corner. `width` and `height`
  are the original's, upright.
- Android decodes the image to an ARGB_8888 bitmap (a 16-bit PNG too) and turns it upright by its EXIF orientation
  (`androidx.exifinterface`). An image whose longer side is above 4096 pixels is decoded at a power-of-two fraction of
  its size, and the boxes are scaled back to the original's pixels; a phone's screenshot is read whole. The answer is
  built off the main thread and the bitmaps are recycled once it is.
- iOS redraws the image upright at scale 1 first, so its points are its pixels.
- `pixels` is the image scaled to 330 pixels wide (never up), the aspect kept, as RGBA bytes row by row from the top,
  in base64. `scale` is the original's width over the copy's: a pixel (x, y) of the copy is (x × scale, y × scale) in
  the original. The copy's height is rounded to whole pixels, so the vertical ratio differs from `scale` by less than
  half a pixel of the copy over its height: none for a 1320 × 2868 screenshot (717 rows, 4 exactly), at most about
  0.07 % for others. There is no separate vertical scale.

## Building

Android builds with the app (`pnpm android`); for an x86_64 emulator, see "The emulator" in the mobile README.

iOS has not been built yet: the first `pod install` on a Mac fetches ML Kit's pods (`GoogleMLKit` 9.x). At that
install, check the versions CocoaPods settles on for `GoogleUtilities` and `GTMSessionFetcher`, which ML Kit and
Google's sign-in (`GoogleSignIn`, through `react-native-nitro-google-signin`) both depend on: if their ranges do not
meet, `pod install` fails, and one of the two has to move to a version that agrees. ML Kit's iOS frameworks have long
had no arm64 slice for the simulator on Apple Silicon, so the simulator build may need a Rosetta simulator or a phone.
