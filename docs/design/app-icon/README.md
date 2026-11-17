# SNU Now app icon

The app's icon is the two-line wordmark "SNU / now" on white, whose "o" is the app's own map marker. The team chose
it on 2026-11-18. Every image of it that the app ships, the launcher icon, Android's adaptive icon layers, the splash,
the notification icon, the favicon and the sign-in screen's wordmark, is written from one master by one script.

![The master](snu-now-icon.svg)

## Files here

| File                          | What it is                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `snu-now-icon.svg`            | The master: `viewBox` 0–100 on a white square. "SNU" is outlined from Pretendard Bold, so it needs no font. |
| `android-icon-foreground.svg` | Android's adaptive foreground: the wordmark on transparent, on the 108 dp layer.                            |
| `android-icon-monochrome.svg` | Android's themed icon: the same geometry in one colour, with the pin's hole cut out.                        |
| `splash-icon.svg`             | The splash: the whole wordmark cropped to its ink, on transparent.                                          |
| `notification-icon.svg`       | The notification's small icon: the pin alone, white, with its hole cut out.                                 |
| `sign-in-wordmark.svg`        | The sign-in screen's wordmark: cropped to its ink with no margin, on transparent.                           |
| `make_icon.py`                | Writes every SVG above from the master's geometry, then renders the PNGs below.                             |

The SVGs and the script are outside `mobile/`, so they are not part of the app's fingerprint. Only the PNGs that
`mobile/app.json` names are.

## What it writes into the app

Every PNG goes to `mobile/assets/images/`. Those that `mobile/app.json` names keep the name it gives them. The sign-in
screen's wordmark is not in `app.json`: `mobile/src/screens/sign-in-screen.tsx` imports it, so it travels with the
app's JavaScript.

| PNG                           | From                          | Size        | Mode                 | `app.json`                             |
| ----------------------------- | ----------------------------- | ----------- | -------------------- | -------------------------------------- |
| `icon.png`                    | `snu-now-icon.svg`            | 1024 × 1024 | RGB, no alpha        | `icon`, which iOS takes as well        |
| `favicon.png`                 | `snu-now-icon.svg`            | 48 × 48     | RGB, no alpha        | `web.favicon`                          |
| `android-icon-foreground.png` | `android-icon-foreground.svg` | 1024 × 1024 | RGBA                 | `android.adaptiveIcon.foregroundImage` |
| `android-icon-monochrome.png` | `android-icon-monochrome.svg` | 1024 × 1024 | RGBA, `#001A72` only | `android.adaptiveIcon.monochromeImage` |
| `splash-icon.png`             | `splash-icon.svg`             | 1024 × 810  | RGBA                 | `expo-splash-screen`'s `image`         |
| `notification-icon.png`       | `notification-icon.svg`       | 96 × 96     | RGBA, white only     | `expo-notifications`' `icon`           |
| `sign-in-wordmark.png`        | `sign-in-wordmark.svg`        | 660 × 513   | RGBA                 | none                                   |

The colours around them are in `app.json` too: the adaptive icon's `backgroundColor` and the splash's are `#FFFFFF`,
and the notification's `color`, which Android tints the small icon with, is `#001A72`. The splash's `imageWidth` is 140.

## Writing the images again

From the repository's root, with the cairo library installed (`brew install cairo` on macOS, `apt install libcairo2`
on Debian or Ubuntu):

```bash
python3 -m venv /tmp/app-icon-venv
/tmp/app-icon-venv/bin/pip install cairosvg fonttools pillow
DYLD_FALLBACK_LIBRARY_PATH=/opt/homebrew/lib /tmp/app-icon-venv/bin/python docs/design/app-icon/make_icon.py
```

`DYLD_FALLBACK_LIBRARY_PATH` lets the venv's `cairosvg` find Homebrew's cairo on an Apple Silicon Mac; elsewhere it is
not needed. `make_icon.py --svg-only` writes only the SVGs and needs only `fonttools`. The images were last written
with CairoSVG 2.9.1, fontTools 4.68.0, Pillow 13.0.0 and cairo 1.18.

A new PNG that `app.json` names changes the app's fingerprint, so it reaches phones only with a raised `version` and a
native Release (`CLAUDE.md`, "The app's native files"). Write the images again only for a change of the design. The
script writes every PNG each time; with the versions above, an image whose SVG did not change comes out byte for byte
the same, and `git status` shows which ones changed.

## The design

- Background `#FFFFFF`. Letters `#001A72` (`color.snuBlue` in `mobile/src/design-system/tokens.ts`). Pin `#2F6BFF`
  (`color.me`), with a white hole.
- "SNU": Pretendard Bold (`mobile/assets/fonts/Pretendard-Bold.otf`), font size 25 with letter spacing 1, so the cap
  height is about 18 units. Baseline at y = 44, centred on its ink, not on its advances.
- "now": drawn, not typed. `n` is an arch and `w` two bowls with a shorter middle stem, stroked 5.5 wide with butt
  caps, so they are as thick as the pin's ring and the three read as one word. Baseline at y = 70, at 0.78 of their
  own units from x = 19.6.
- The "o" is the person marker on the app's map: a square with three fully rounded corners, turned 45° so the sharp
  corner points down. Its tip dips below the baseline.
- The ink spans x = 19.6–80.4 and y = 26.1–73.4, so a circular mask cuts nothing.
- Rejected on the way, and not to be reopened: an icon built on the SNU emblem (the emblem is the university's mark),
  a navy background, and the same design on light blue (`#E3EAFB`). With white, the icon's edge fades on a light home
  screen; that was accepted.

## How each image comes from the master

- **The app icon and the favicon** are the master as it is, rendered at 1024 and at 48 px. The alpha channel is
  dropped: the white square covers the whole canvas, and iOS takes no transparency in an app icon.
- **The adaptive foreground** puts the master's 100 units on the middle 72 dp of the 108 dp layer, so a unit u becomes
  18 + 0.72 u dp. A launcher shows those 72 dp, so the icon looks as the master does. The wordmark spans about
  x = 32–76 and y = 37–71 dp, all within 27 dp of the centre, inside the 66 dp safe circle. The white square is left
  out, since the background is the colour `#FFFFFF`; the pin keeps its white hole.
- **The monochrome layer** is the foreground's geometry with "SNU", `n`, `w` and the pin all in `#001A72`. The pin and
  its hole are one even-odd path, so the hole is transparent and the launcher's themed colour shows through it.
- **The splash** is the whole wordmark, its viewBox the ink's box with 2 units of margin on each side. With
  `imageWidth` 140, `expo-splash-screen` puts it 140 dp wide on Android 12's 288 dp splash canvas, whose icon shows
  inside a 192 dp circle. The farthest ink is then 79 dp from the centre; a width above 170 would cut it.
- **The sign-in screen's wordmark** is the splash's crop with no margin, so the picture's edges are the ink's and the
  screen places the ink itself. It is 660 px wide, four times the 165 the screen shows it at, so it stays sharp on
  every phone's density.
- **The notification icon** is the pin alone, scaled so that its height fills 80 of the 96 px and centred, with 8 px
  clear above and below as Android's 24 dp grid keeps 2 dp. It is white, with its hole cut out like the monochrome
  layer's, since Android draws only its alpha, in the notification's `color`.

## Checking it

On a real Android phone: the launcher under its mask, the themed icon, a notification, the icon at about 48 px on a
dark and on a light wallpaper, and the splash on a cold start.
