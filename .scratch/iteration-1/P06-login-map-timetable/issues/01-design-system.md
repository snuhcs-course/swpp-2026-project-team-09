# 01: Design system: tokens, font, icons and the components the four screens use

Parent: [P06 spec](../spec.md)
Status: ready-for-human
Blocked by: None (can start immediately)

## What to build

The app gets the team's design system "SNU Now" as its own, ported from the web to React Native: the tokens, the Pretendard font, the icons, and the components that the loading, sign-in, Onboarding and main screens use. A developer opens one catalogue screen in Expo Go and sees each component in each of its variants, so that a difference from the design system is found before a screen is built on it.

The source is the Design System "SNU Now": its brand book, its tokens, its components' types and their web implementation. The names, properties and rules carry over; the HTML and CSS are rewritten. A component none of the four screens uses is left for the task that needs it.

## Acceptance criteria

- [x] The tokens hold the design system's colours, spacing, radii, sizes, shadows and the eight text styles, under the design system's names.
- [x] Pretendard ships with the app in the weights the text styles use, and a screen appears only once the font is ready. A font that fails to load leaves the app usable in the system font.
- [x] The design system's icons exist as one Icon component that takes a name, a size and a colour.
- [x] These components exist with the names, properties and variants of the design system's types: Button, Chip, Badge, Avatar, MapPin, EventCard, TextField, ChatInput, BottomNav, and a dialog for a question with two answers.
- [x] A shared Toast exists, which the frames use and the design system lacks, with one call that shows "준비 중이에요".
- [x] Pressed, selected and disabled states follow the brand book, and motion respects the phone's reduced-motion setting.
- [x] Every control has a touch area of the design system's minimum and a Korean accessibility label.
- [x] The app's configuration says light: the phone's dark setting changes nothing.
- [x] A catalogue screen, reachable in development only, shows every component in every variant.
- [x] Jest tests drive each interactive component as a User would: a press, a toggle, typed text, a chip removed, a toast shown and gone.
- [ ] Screenshots of the catalogue, taken from the app's web target at a phone's size and compared with the design system's previews, are in the pull request under Test Results.
- [x] The app's README says where tokens and shared components live and that a screen uses them instead of its own styles.
- [x] The app's four checks pass: lint, format, types and tests.

## Comments

### Result (2026-10-05)

Built on the branch `1.0/P06-01-design-system`. The four checks pass: lint, format, types, and 38 tests in 14 files.

Decisions:

- The design system's sizes do not count a border, because its CSS adds the border around the size. The app's sizes add it: a pin's head is 40 across (36 and a border of 2 on each side), a campus service's 34, an Avatar's status dot 16, a Chip 34 high, the bottom navigation 65 high.
- The design system has no dialog and no toast. `Dialog` and `Toast` are the app's own, in the design system's tokens. A Dialog takes one or two Buttons, because the spec's wording has a dialog with the one Button "확인".
- The design system's ChatBubble, ActionConfirm, Switch and BottomSheet are not ported: none of the four screens uses them.
- The send button of a ChatInput is grey while nothing is typed. The design system's preview has no such state, because it is a still picture.
- No screen has the navigation library's title bar: the root layout turns it off.
- An Icon uses the web's own attributes for a screen reader on the web target, because React Native's make the browser warn.

Compared with the design system's previews: the catalogue from the web target, 390 wide, beside a page that renders the design system's own web components with the same contents. The differences found and fixed: the sizes above, the two Buttons of an EventCard stacked instead of side by side, and the send button of a ChatInput outside its bar on the web.

Review, and what changed after it:

- The × of a Chip reached over the end of its text and took the toggle's presses. It now stops halfway.
- A disabled ChatInput still sent its suggestions. It no longer does, and a test covers it.
- A tab's count was not spoken. The tab's label now carries it: "파티, 새 소식 2개".
- A Toast was announced twice on Android. The announcement by hand is for iOS only.
- A TextField's error or helper is now its hint for a screen reader.
- A tab and the × of a Chip have a pressed look.

Not checked, and left for the first run on a phone:

- Whether a touch area that reaches past its parent works on both phones. A Chip (34 high), a suggestion (32 high) and a middle-sized Button (40 high) reach 48 through `hitSlop`; React Native's documents say that a touch area stops at the parent's bounds.
- A Toast shown while a Dialog is open is drawn under it.
- A Toast sits above where the bottom navigation is, also on a screen without one, and does not add the phone's gesture inset.
- The catalogue's variants are the design system's previews and a few more, not every combination of every property.
- The Dialog and the Toast are in no screenshot: both need a press.

### Agent usage (2026-10-05)

- Agent time: about 1 hour in this session, an estimate. The first port of these components, made for the earlier attempt at this task, is not counted.
- Tokens, this session from the request to the pull request: input 118 new, 14.1 million read from the cache, 174 thousand written to the cache; output 47 thousand. Two review subagents: 179 thousand in all.
