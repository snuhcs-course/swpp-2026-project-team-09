# 04: Sign-in screen

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: 03 (Loading screen and the flow between screens)

## What to build

A User presses the one button of the sign-in screen, sees that the account is being checked, and is taken on, or is told why not. The screens are the `Login`, `LoginLoading` and `LoginError` frames.

The sign-in is the mock of ticket 02 behind the sign-in module. Google and the main server are connected in ticket 12.

## Acceptance criteria

- [x] The screen has the frame's default, checking and refused states, with the frame's words, pictures and motion.
- [x] A press shows the checking state, and the button takes no second press while it lasts.
- [x] Each ending shows what the spec's table says: signed in leads on to Onboarding or the main screen; an account outside SNU shows the refused state; a closed sheet returns to the default state; any other failure shows the refused state with "잠시 후 다시 시도해 주세요".
- [x] Each of the three legal documents opens on a screen of its own with the frame's placeholder text and closes back to the sign-in screen, also with Android's back button.
- [x] The button and the links carry Korean accessibility labels, and the refused state's line is announced.
- [x] Jest tests: each of the four endings, the button while checking, and a legal document opened and closed.
- [x] The frames were read again when the work started, and what changed since the spec is recorded under Comments.
- [ ] Screenshots of each state, taken from the app's web target at a phone's size and compared with the frames, are in the pull request under Test Results.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Where things are, in `mobile/`:

- `src/screens/sign-in-screen.tsx` is the screen: the wordmark, the words of each state, and the footer with the three links. `src/screens/sign-in-button.tsx` holds the round button, its ring and spinner, and the drawing. `src/screens/use-sign-in.ts` holds the state and asks the sign-in module.
- `src/app/sign-in.tsx` only names the place. `src/app/legal/[document].tsx` is the legal documents' route (`/legal/terms`, `/legal/privacy`, `/legal/location`) and shows `src/screens/legal-screen.tsx`.
- `src/hooks/use-loop.ts` is the repeating motion that the ring, the spinner and the drawing share.
- The three pictures are `assets/images/sign-in-emblem.png`, `sign-in-pointing.png` and `sign-in-refused.png`, copied from the frame.
- `__tests__/sign-in-test.tsx` has the tests. `__tests__/support/app.tsx` now puts the screens in a stack, as the app does, so that a screen can be opened over another and closed.

The frames were read again when the work started. `Login`, `LoginLoading` and `LoginError` are unchanged since the spec: 7595, 751 and 758 bytes at canvas version `1791129072-d0ec`.

Decisions:

- A legal document is a route of its own, pushed over the sign-in screen, so Android's back button closes it as "닫기" does. It has no guard: it is read before signing in. Opened by its address alone, "닫기" leads to the start of the app. An unknown document's address leads there too.
- The button stays enabled while the account is checked, so that a screen reader reads it as busy, and the screen ignores the press.
- A sign-in module that throws counts as "any other failure".
- After a sign-in that succeeded the screen keeps the checking state until the flow has led the User on.
- The refused state's line has the alert role and is a polite live region, for both refusals. The frame has only the first refusal.
- The links' accessible names are their words in the sentence: "이용약관", "개인정보 처리방침", "위치정보 이용".
- The footer's sentence is laid out as pieces in two rows, not as one text, so that each link is 48 points high to the touch. A screen reader reads the pieces one by one.
- Layout: a column of the frame's width, centred on a wider screen. The upper block keeps the frame's distances from the top and the footer its distance from the bottom. The frame counts 44 points of status bar and 34 of home indicator; a phone whose bars take more moves the blocks by the difference. On a screen too short for both, the column scrolls.
- The button's shadow is a new token, `signInButton.shadow`.

Differences from the frame:

- The wordmark's weight is 700, where the frame has 800: the app has no font file for 800. The loading screen does the same.
- The headline uses the `titleLg` text style, whose letter spacing is -0.33 where the frame has -0.44.
- The legal screen's placeholder text is in the `inkSubtle` colour (`#8A90A3`), where the frame has `#858CA0`, which the tokens name as a border's colour.
- With reduced motion the ring is not drawn. In the frame it stands still behind the button, where it cannot be seen.
- With reduced motion the spinner stands still, with its dark quarter at the top.
- The frame's focus outline on the button (for a keyboard, on the web) is not built.
- The legal screen's header is as high as the phone's own status bar plus 56, where the frame has a fixed 44 plus 56.

Not checked: nothing ran in a browser or on a phone. The layout, the pictures, the motion, the shadow, the touch areas and Android's back button are checked by the tests only as far as the tests can see them: the tests run with reduced motion and close a document with "닫기".

### After the review and the screenshots (2026-10-05)

- The two lines of legal links lay against each other, and the touch area of "위치정보 이용" covered most of "이용약관": a press on the one opened the other. The upper line's links now grow up and the lower line's down. No Jest test sees this, because Jest lays nothing out.
- A legal address with a name such as `__proto__` broke the screen. It now leads to the start of the app, as any unknown name does.
- The refused line is announced by hand on iOS, which has no live regions.
- While the account is checked the legal links take no press, and the same document asked for twice is opened once.
- The button and the drawing keep their places around the middle of the screen on a phone narrower than the frame.
- Screenshots of the web target at 390 wide, beside the frame's three states: the wordmark, the tagline, the line under the headline, the footer, the button and the drawing are in the frame's places, measured in the default state. The ring around the button is not drawn under reduced motion, where the frame's still picture shows it. At 360 by 640 nothing overlaps; the footer is reached by scrolling and the drawing is cut off 40 further.
- The screenshots were taken before the changes of this section. None of them moves anything at 390 wide; the press on each link was not tried in a browser or on a phone.

### Agent usage (2026-10-05)

- Agent time: about 35 minutes, an estimate, most of it in subagents.
- Tokens: the main session about 20 thousand out and 4 million read from the cache, an estimate; four subagent runs (the build, a review, the screenshots): about 350 thousand in all.
