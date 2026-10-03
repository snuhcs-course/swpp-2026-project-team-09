# 01: Design system: tokens, font, icons and shared components

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The app gets the wireframes' design system "SNU Now" as its own: the tokens, the Pretendard font, the icons and the shared components that every later screen is put together from. A developer opens one catalogue screen in Expo Go and sees each component in each of its variants, so that a difference from the wireframes is found before any screen is built on it.

The design system's files are in the wireframe canvas: its tokens, its component bundle and its styles. Read them again when the work starts; the frames change.

## Acceptance criteria

- [ ] The tokens hold the design system's colours, spacing, radii, sizes and the eight text sizes, under the design system's names.
- [ ] Pretendard ships with the app in the weights the text sizes use, and a screen appears only once the font is ready. A font that fails to load leaves the app usable in the system font.
- [ ] The 22 icons exist as one Icon component that takes a name, a size and a colour.
- [ ] The 14 components exist with the variants and properties the design system gives them: Icon, Button, Chip, Badge, Avatar, MapPin, EventCard, ChatBubble, ActionConfirm, TextField, ChatInput, Switch, BottomNav, BottomSheet.
- [ ] A shared Toast exists, which the design system lacks and the frames use, and with it one call that shows "준비 중이에요".
- [ ] The app is light only: the phone's dark setting changes nothing.
- [ ] Touch targets are at least the design system's minimum, and each control carries a Korean accessibility label.
- [ ] A catalogue screen, reachable in development only, shows every component in every variant.
- [ ] Jest tests drive each interactive component as a User would: a press, a toggle, typed text, a chip removed, a sheet closed.
- [ ] The app's README says where tokens and shared components live and that a screen uses them instead of its own styles.
