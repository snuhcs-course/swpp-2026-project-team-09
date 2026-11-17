# Timetable OCR fixtures

The four reference screenshots of P13, the five of P15-52 (below), and what the native OCR module (`modules/snu-now-ocr`) returned for each, saved
from the Android emulator. The reading pipeline's tests (P13 ticket 02) read them. Their owner agreed on 2026-10-18 that
they be committed to this public repository.

| Screenshot        | App        | Original file                         | Lines | Words |
| ----------------- | ---------- | ------------------------------------- | ----- | ----- |
| `everytime-1.png` | 에브리타임 | `KakaoTalk_20261018_010503540.png`    | 45    | 66    |
| `snutt-1.png`     | SNUTT      | `KakaoTalk_20261018_010503540_01.png` | 54    | 61    |
| `snutt-2.png`     | SNUTT      | `KakaoTalk_20261018_010503540_02.png` | 48    | 63    |
| `snutt-3.png`     | SNUTT      | `KakaoTalk_20261018_010503540_03.png` | 42    | 49    |

Each screenshot is 1320 × 2868 pixels from an iPhone. `<name>.json` is the module's answer unchanged
(`NativeOcrResult` in `src/features/timetable-ocr/native-ocr.ts`): the lines and words with their boxes in the
screenshot's pixels and their confidences, and `pixels`, a 330 × 717 copy with `scale` 4. Prettier formatted the JSON; the values are as the module returned
them.

## Ground truth

`<name>.truth.json` is written by hand from the screenshot, block by block: the day, start and end, the class's name and
the room as printed (`roomLine`), with the building it should link to and the rest (`building`, `room`), and the title.
Starts and ends were read off the picture's pixels against its hour lines. A `note` says where the truth is uncertain:
a block that fades out behind SNUTT's tab bar, or a name cut with `…`. `__tests__/support/timetable-ocr.ts` compares
the pipeline's output with them; `.scratch/iteration-2/P13-timetable-ocr/accuracy.md` reports the result.

## Where they were made

- Saved on 2026-10-18.
- Android emulator, AVD with the system image `system-images;android-35;google_apis;x86_64`: Android 15, API level 35,
  x86_64, on an x86_64 Linux computer with KVM.
- A development build of the app with `x86_64` (`ANDROID_X86_64=1`), React Native 0.86.3, Expo SDK 57.
- ML Kit: `com.google.mlkit:text-recognition-korean` 16.0.1 with its bundled model, which brings in
  `play-services-mlkit-text-recognition-common` 19.1.0.
- The module as of commit `86b8171`, before it applied EXIF orientation and sampled very large images. Neither
  changes a 1320 × 2868 PNG screenshot, so the answer would be the same today.
- Every confidence is a number: Android's ML Kit gives one for every line and word. On iOS the same answer would have
  `confidence: null` everywhere (see `modules/snu-now-ocr/README.md`).

## Making them again

With the emulator running, the development build installed and Metro running (`pnpm start`), in `mobile/`:

```bash
P=com.bonnieandclaude.snunow
F=__tests__/fixtures/timetable-ocr
adb reverse tcp:8081 tcp:8081
adb shell run-as $P mkdir -p files
for n in everytime-1 snutt-1 snutt-2 snutt-3; do
  adb push $F/$n.png /data/local/tmp/$n.png
  adb shell run-as $P cp /data/local/tmp/$n.png files/$n.png
  adb shell am start -a android.intent.action.VIEW \
    -d "'snunow://ocr-check?uri=file:///data/data/$P/files/$n.png&name=$n'" $P
  sleep 20 # until the screen lists the lines
  adb exec-out run-as $P cat files/$n.json > $F/$n.json
done
pnpm prettier --write $F
```

Open the app once before the first link, so that the bundle is loaded. The same screen can pick a screenshot from the
album instead (`snunow://ocr-check`, "사진 고르기"). Kakao's map has no x86_64 library, so on the emulator the map
stays blank; the rest of the app runs. The build needs `KAKAO_NATIVE_APP_KEY` set to some value (these were made with
a placeholder), or Kakao's SDK stops the app at its start.

## The five screenshots of P15-52

Copies of iPhone screenshots, 921 × 2000 pixels, given by 안진영 on 2026-11-18 as ones the app had read badly in use.
Their owner agreed on 2026-11-18 that they be committed to this public repository. No device run was made for
P15-52, so they have no saved ML Kit output (`<name>.json`); `__tests__/support/timetable-ocr-new.ts` stands in only
the day letters and hour labels, at boxes measured on the pictures, so that the pipeline's pixel half runs on them.

| Screenshot             | App        | Theme                    | What makes it hard                                                             |
| ---------------------- | ---------- | ------------------------ | ------------------------------------------------------------------------------ |
| `everytime-2.png`      | 에브리타임 | light                    | a 12-hour axis 9 … 6; blocks ending at 12:15 and 13:45; cards below the grid   |
| `everytime-dark-1.png` | 에브리타임 | dark                     | a 12-hour axis 9 … 4; starts at 9:30 and 15:30; `프로그래밍의 원 / 리`         |
| `snutt-4.png`          | SNUTT      | light                    | names wrapped over two lines; the floating tab bar over 18:00                  |
| `snutt-dark-1.png`     | SNUTT      | dark                     | 9 … 21; a block without a room; one name in two rooms; a block of 14:00–16:50  |
| `snutt-grey-1.png`     | SNUTT      | grey, focus-mode overlay | the overlay covers the title and 금; `컴퓨터프로그래 / 밍`; a block fading out |

`<name>.truth.json` is written as P13's are: each block's day, start and end read off the picture's pixels against its
hour lines, the name as printed with wrapped lines joined as they read, and the room as printed. A `note` says where a
name was wrapped or where the end is read by eye (the block fading behind SNUTT's tab bar in `snutt-grey-1`).
