# 08: The sign-in screen has the app's wordmark, the button in the middle, and no drawing

Parent: [P15 spec](../spec.md), item 8; found by 김태현 using the Production app on 2026-11-18; the team canvas's before/after boards for this item (the boards under the title "P15-8. 로그인 화면")
Status: ready-for-agent
Owner: TaeHyun79
Blocked by: ticket [06](06-app-icon.md) (#355), which puts the wordmark's master in the repository under `docs/design/app-icon/`

## What is on screen now

- At the top, the name "SNU Now" is set as text in SNU blue, with the tagline "관악캠퍼스의 지금" under it.
- The round sign-in button with the SNU emblem stands left of the middle. To its right a drawn character points at it and nudges towards it.
- When a sign-in is refused (an account that is not @snu.ac.kr, or a failure), another drawing of the same character stands in its place, still.
- Under them: the headline "서울대 계정으로 로그인", the line "@snu.ac.kr", and the link "다른 서울대 계정으로 로그인".

## What changes

- **The drawing is removed**, in every state: the pointing one and the refused one. Their two pictures leave the app.
- **The sign-in button moves to the middle** of the screen's width. Its height on the screen does not change.
- **The name becomes the app icon's wordmark:** the two lines "SNU / now" in SNU blue, whose "o" is the map's person marker in `#2F6BFF` with a white hole. It is the same wordmark as on the splash, on the screen's white. It is centred, about 165 wide in the 390-wide frame, with its top where the name's top is today, as the after board draws it. On a narrower phone it keeps its size and stays centred.
- **The tagline "관악캠퍼스의 지금" is removed** from this screen.
- The wordmark is a picture, so it carries the label "SNU Now" for a screen reader, which reads the name today.

## What stays as it is

- The button itself: its size, the emblem, the ring that grows out of it, its shadow, its press, and the spinner while the account is checked.
- The headline, the line under it and the link, in every state: "서울대 계정으로 로그인 · @snu.ac.kr", "학교 계정 확인 중…", and the two refusals with their red line. A refusal is still announced as it is today.
- "다른 서울대 계정으로 로그인", and that it is not shown while the account is checked.
- The loading screen. It keeps its "SNU Now" in text and its tagline over the campus photos; a wordmark over a photo has not been drawn. Decided with 김태현 on 2026-11-18.
- The wordmark's design, which ticket 06 fixed.
- No native file changes: the screen's pictures travel with the app's JavaScript, so the change ships over the air.

## Acceptance criteria

- [x] The sign-in screen shows no drawing, before a sign-in, while the account is checked, and after either refusal.
- [x] The sign-in button is in the middle of the screen's width, at the height it has today, with its ring and shadow whole.
- [x] The top of the screen shows the "SNU / now" wordmark, centred, as the after board draws it. The text "SNU Now" and "관악캠퍼스의 지금" are gone from this screen.
- [x] A screen reader reads the wordmark as "SNU Now".
- [x] The headline, the line, the link and the refusal's announcement are as they are today in all four states.
- [x] The two pictures of the drawing are no longer in the app, and nothing refers to them.
- [x] The loading screen is unchanged.
- [x] The ticket adds no native change: its Android and iOS fingerprints equal `4.0/Main`'s at `6039fff3`. CI's `app-fingerprint` job can still show ticket 06's notice of a native change on this branch, until the next native Release.
- [x] Tests, by ADR 0007: the integration test of the sign-in screen checks the wordmark by its label, that the tagline is gone, and the four states' words as before; the loading screen's test still passes unchanged. Where the button and the wordmark sit is layout, so it is checked by hand on an Android emulator against the after board, on the default state and on a refusal, which is an integration check by the ADR; the check and its screenshots are recorded under this ticket's Comments.

## Comments

### Notes from the implementation (2026-11-18)

- **The wordmark is a PNG made from ticket 06's master.**
  - `docs/design/app-icon/make_icon.py` writes one more SVG and PNG: `sign-in-wordmark.svg`, the splash's crop with no
    margin, and from it `mobile/assets/images/sign-in-wordmark.png`, 660 × 513 RGBA. 660 is four times the 165 the
    screen shows it at.
  - The script writes every PNG again. The six PNGs that `app.json` names and the five SVGs came out byte for byte the
    same (SHA-1 before and after), and `git status` showed only the two new files.
  - Not `splash-icon.png`: its 2-unit margin would tie the screen's numbers to the splash's, which is sized for Android
    12's splash circle and is a native file. Not an SVG component: it would copy the master's paths into the app.
- **The screen:**
  - The wordmark is an `Image` labelled "SNU Now" with the role `image`, 165 × 128.25 at the frame's top 92, centred
    by `left: '50%'` and a negative margin, so it keeps its size on a narrower phone.
  - The height is given: React Native's `Image` takes a static picture's own size as its height otherwise, and the
    first build on the emulator drew it 513 high.
  - The button is centred the same way at its top 280. The 390-wide stage that held the button and the drawing is
    gone.
- **Where the board and the ticket differ:**
  - **Width.** The after board draws the wordmark 150 wide, so its ink is about 147. Its callout box is 166 wide. The
    ticket says about 165, so the ink is 165.
  - **Top.** The board's ink starts at 89.4 in the frame. On the emulator today's name's letters start at 92.2 dp, and
    the ticket says the top is where the name's top is today, so the top is 92.
  - **Label.** The board's SVG is labelled "SNU now"; the ticket's "SNU Now" is used.
- **Where each criterion is checked:**
  - `mobile/__tests__/sign-in.integration.test.tsx`:
    - "shows the one button and what it is for" finds the picture "SNU Now" by its role and label, and finds no text
      "SNU Now" and no "관악캠퍼스의 지금".
    - That test, "checks the account after a press…", "refuses an account outside SNU…" and "asks to try again
      later" check that the only picture outside the button is the wordmark, so no drawing in the default state, while
      the account is checked and after either refusal. A drawing is hidden from a screen reader, so the test reads the
      pictures, not the roles.
    - The four states' words, the link and the refusal's alert are the tests as they were.
    - All four new checks failed on the old code.
  - `mobile/__tests__/loading.integration.test.tsx` passes unchanged, and `loading-screen.tsx` is unchanged.
  - The layout, the ring and the shadow: the hand check below.
- **No reference to the drawings is left** in the code, the tests, the READMEs or the catalogue. `git grep` finds them
  only in Iteration 1's ticket `P06-login-map-timetable/issues/04-sign-in-screen.md`, which records where they came
  from, and that record stays.
- **`mobile/README.md` is unchanged.** No sentence describes the name or the drawing, and its `assets/` line, "the
  sign-in screen's pictures", now means the emblem and the wordmark.
- **The fingerprint, compared locally.**
  - `expo-updates fingerprint:generate`, as `release.sh fingerprint-and-decide` runs it, on two exports in the same
    folder with the same `node_modules` and the same build settings: `origin/4.0/Main` (`6039fff3`) and this
    branch's `mobile/`.
  - Android `81b331cddef48f0644d1fddb32f6afa139659b38` and iOS `e94a99a264a920ae1e72fac35e58f0ecae7cbcf6` for both.
  - The sources included `expoConfig` and its files `icon.png`, `android-icon-foreground.png`, `splash-icon.png` and
    `google-services.json`. One extra byte on `splash-icon.png` changed the Android hash, so the method sees a native
    change.
  - Run in the worktree itself the hashes differ, because the `node_modules` symlink's relative path is part of the
    autolinking sources. With that path made the same, the sources are equal.
  - The build settings must be shaped like real ones. With an iOS URL scheme not starting with
    `com.googleusercontent.apps.`, the Google sign-in plugin throws, and the config, with its PNGs, silently drops
    out of the fingerprint.

### Hand check on an Android emulator (2026-11-18)

**Setup:** emulator `sdk_gphone64_arm64` (Medium_Phone AVD, Android 16, 1080 × 2400 at 420 dpi, so 411 × 914 dp), the
app's debug build 1.0.3 with the bundle from Metro, against the app's own mock data. Metro ran with
`EXPO_PUBLIC_FIRST_STATE=1`, so the app started signed out with nothing kept, and
`EXPO_PUBLIC_SIGN_IN_ENDING=not-snu-account`, so a press ends in the refusal. Places were measured on the screenshots,
in dp. The emulator's animations were off, and with them off the app draws no ring, so they were turned on for the
check and off again after.

**This change:**

- **Default state:**
  - The wordmark's ink runs from 92.2 to 219.8 and from 123.0 to 288.0, so 165 wide. Its centre, 205.7, is the
    screen's.
  - The button is 140 wide from 135.6, centred, with its top at 280 as before.
  - The ring, caught while it grows, and the shadow are whole and clear of the wordmark.
- **While the account is checked** (a screenshot 80 ms after the press; the mock answers after 300 ms): the spinner in
  the button, "학교 계정 확인 중…" and "@snu.ac.kr", no link and no drawing. The wordmark and the button are where they
  were.
- **The refusal of an account outside SNU:** "로그인하지 못했어요", the red "@snu.ac.kr 계정만 가능해요" and the link, with
  no drawing. The places are the same.
- **The screen reader's view:** the wordmark is a focusable `ImageView` whose content description is "SNU Now".
  TalkBack itself was not turned on.
- The other refusal, "잠시 후 다시 시도해 주세요", was not checked by hand. Its layout is the same and the tests check its
  words.

**The same build on `4.0/Main` (`6039fff3`), before:**

- The name's letters start at 92.2, and the tagline is under them.
- The button stands left of the middle, from 90.6, with its top at 280. The pointing drawing is at its right.
- After the refusal, the refused drawing stands there.
- Metro's development warning shows at the bottom of these two screenshots. It is not part of the screen.

The screenshots are in the PR body.

### Agent usage (2026-11-18)

Estimates from the session transcripts, with gaps of 5 minutes or more left out, up to the pull request:

- Agent time: about 50 minutes, in one session with three Opus 5.5 subagents: one implemented the ticket and did the emulator check, two reviewed it. The times partly overlap, and the session's share includes a few minutes spent on ticket 07's merge in the same window.
- Tokens: output about 33,000. Input about 38.1 million: 37.6 million cache reads, 0.44 million cache writes and about 400 uncached.
