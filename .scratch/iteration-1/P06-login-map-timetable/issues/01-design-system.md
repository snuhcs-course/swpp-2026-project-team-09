# 01: Design system: tokens, font, icons and the components the four screens use

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The app gets the team's design system "SNU Now" as its own, ported from the web to React Native: the tokens, the Pretendard font, the icons, and the components that the loading, sign-in, Onboarding and main screens use. A developer opens one catalogue screen in Expo Go and sees each component in each of its variants, so that a difference from the design system is found before a screen is built on it.

The source is the Design System "SNU Now": its brand book, its tokens, its components' types and their web implementation. The names, properties and rules carry over; the HTML and CSS are rewritten. A component none of the four screens uses is left for the task that needs it.

## Acceptance criteria

- [ ] The tokens hold the design system's colours, spacing, radii, sizes, shadows and the eight text styles, under the design system's names.
- [ ] Pretendard ships with the app in the weights the text styles use, and a screen appears only once the font is ready. A font that fails to load leaves the app usable in the system font.
- [ ] The design system's icons exist as one Icon component that takes a name, a size and a colour.
- [ ] These components exist with the names, properties and variants of the design system's types: Button, Chip, Badge, Avatar, MapPin, EventCard, TextField, ChatInput, BottomNav, and a dialog for a question with two answers.
- [ ] A shared Toast exists, which the frames use and the design system lacks, with one call that shows "준비 중이에요".
- [ ] Pressed, selected and disabled states follow the brand book, and motion respects the phone's reduced-motion setting.
- [ ] Every control has a touch area of the design system's minimum and a Korean accessibility label.
- [ ] The app's configuration says light: the phone's dark setting changes nothing.
- [ ] A catalogue screen, reachable in development only, shows every component in every variant.
- [ ] Jest tests drive each interactive component as a User would: a press, a toggle, typed text, a chip removed, a toast shown and gone.
- [ ] Screenshots of the catalogue, taken from the app's web target at a phone's size and compared with the design system's previews, are in the pull request under Test Results.
- [ ] The app's README says where tokens and shared components live and that a screen uses them instead of its own styles.
- [ ] The app's four checks pass: lint, format, types and tests.
