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

- [ ] The sign-in screen shows no drawing, before a sign-in, while the account is checked, and after either refusal.
- [ ] The sign-in button is in the middle of the screen's width, at the height it has today, with its ring and shadow whole.
- [ ] The top of the screen shows the "SNU / now" wordmark, centred, as the after board draws it. The text "SNU Now" and "관악캠퍼스의 지금" are gone from this screen.
- [ ] A screen reader reads the wordmark as "SNU Now".
- [ ] The headline, the line, the link and the refusal's announcement are as they are today in all four states.
- [ ] The two pictures of the drawing are no longer in the app, and nothing refers to them.
- [ ] The loading screen is unchanged.
- [ ] CI's `app-fingerprint` job passes with no notice of a native change.
- [ ] Tests, by ADR 0007: the integration test of the sign-in screen checks the wordmark by its label, that the tagline is gone, and the four states' words as before; the loading screen's test still passes unchanged. Where the button and the wordmark sit is layout, so it is checked by hand on an Android emulator against the after board, on the default state and on a refusal, which is an integration check by the ADR; the check and its screenshots are recorded under this ticket's Comments.
