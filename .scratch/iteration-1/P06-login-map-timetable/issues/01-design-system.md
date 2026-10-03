# 01: Design system: tokens, font, icons and shared components

Parent: [P06 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

The app gets the wireframes' design system "SNU Now" as its own: the tokens, the Pretendard font, the icons and the shared components that every later screen is put together from. A developer opens one catalogue screen in Expo Go and sees each component in each of its variants, so that a difference from the wireframes is found before any screen is built on it.

The source is the team's Design System "SNU Now", which the wireframe canvas copies: its brand book (the rules for colour, type, spacing, shape, states, wording and icons), its tokens, one guideline per component, the components' types, and their web implementation. It is written for the web with React, so this ticket ports it to React Native: the tokens, names, properties and rules carry over, and the HTML and CSS are rewritten. Read it again when the work starts; it changes.

## Acceptance criteria

- [x] The tokens hold the design system's colours, spacing, radii, sizes and the eight text sizes, under the design system's names.
- [x] Pretendard ships with the app in the weights the text sizes use, and a screen appears only once the font is ready. A font that fails to load leaves the app usable in the system font.
- [x] The 22 icons exist as one Icon component that takes a name, a size and a colour.
- [x] The 14 components exist with the names, properties and variants of the design system's types: Icon, Button, Chip, Badge, Avatar, MapPin, EventCard, ChatBubble, ActionConfirm, TextField, ChatInput, Switch, BottomNav, BottomSheet.
- [x] The components follow the brand book's rules for states: pressed, selected, disabled and focus, and motion that respects the phone's reduced-motion setting.
- [x] A shared Toast exists, which the design system lacks and the frames use, and with it one call that shows "준비 중이에요".
- [x] The app is light only: the phone's dark setting changes nothing.
- [x] Touch targets are at least the design system's minimum, and each control carries a Korean accessibility label.
- [x] A catalogue screen, reachable in development only, shows every component in every variant.
- [x] Jest tests drive each interactive component as a User would: a press, a toggle, typed text, a chip removed.
- [x] The app's README says where tokens and shared components live and that a screen uses them instead of its own styles.

## Comments

### Decisions (2026-10-04)

- **The names are the design system's.** The components and their properties follow its types, also where the glossary prefers another word: `Avatar` is a person's picture anywhere, an event's kind is `official`, and a card's place is its `venue`. The app's README says so. Screens outside the design system use the glossary's words.
- **Where React Native differs from the web, the app follows React Native.** A press is `onPress`, an image is a `source`, and a label is a string, since only text can go inside `Text`.
- **Four components pass on what the User does, which the web's previews did not need.** TextField takes `value` and `onChangeText`. ChatInput keeps its own text and reports `onSend`, for a typed message and for a suggestion alike, and `onFocus`, which the map's entry point uses. Switch shows what it is given and asks for the other state through `onChange`, so that its owner can ask the User before Location Sharing turns on. BottomNav reports `onSelect`.
- **The font ships as four files**, Pretendard 400, 500, 600 and 700, 6 MB together, with its licence (OFL). The design system's file is one variable web font, which React Native cannot use.
- **`react-native-svg` draws the icons.** It is in Expo Go.
- **The focus ring is on the two text inputs only.** The brand book asks for it on every interactive element, which is the web's keyboard focus. A touch on a phone gives a button no focus. The inputs draw it outside their border, so that nothing moves.
- **Pressed states** follow the brand book: a fill darkens (Button, the send button) or the ground is tinted (the secondary and ghost Buttons, a suggestion). A chip's toggle fades while pressed.
- **A Chip's toggle and its × are two controls side by side**, not one inside the other, so that a screen reader reaches each. The × has a 48-point touch area around a 18-point mark.
- **A MapPin takes one of three sets of properties**: the User's own position, a Friend (a name is required), or a category. A category's pin is read by its label, or by its kind's name without one, with its count.
- **The Toast is the app's own.** The design system has none; its look, the ink pill with the label text, is taken from the design system's tokens and is not checked against a frame. One toast shows at a time for 2.4 seconds, and a new one replaces it. On iOS, which has no live regions, the words are announced by hand.
- **Not ported**: Switch's `tone="danger"`, which the design system's types name and its styles do not draw.
- **The BottomSheet is the sheet's body alone**, as in the design system: the screen that shows it places it, moves it and closes it. The criterion's "a sheet closed" was removed for that reason.
- **The three translucent rings** (around the User's position, the sharing dot and a selected pin) are in the tokens as `halo`. The design system's styles draw them and its token file gives them no names.
- **A test may take 60 seconds.** With a cold cache, as in CI, the first test of a file that touches a text input or an animation loads those parts of React Native inside the test. With Jest's 5 seconds, three tests timed out on a cold run and passed on a warm one.

### Review (2026-10-04)

Two reviews of the first commit, one against the repository's standards and one against this ticket and the design system's files, value by value.

- The tokens, the icons' paths and every component's sizes, colours and defaults matched the source, except for what follows, which is fixed: an event card's tags are the small chip (28 points, 12-point text) and its actions share the row equally; ChatInput's `disabled` greys the send button only; the focus of both inputs is a 2-point ring that moves nothing and stays visible on a field with an error; the sharing dot's ring takes no room; the note's icon of an ActionConfirm sits one point lower.
- Fixed for a screen reader: a Chip with both a toggle and an ×; labels that sat on views a screen reader skips; a Switch's description, now its hint; a pin without a label; the Toast on iOS.
- Text styles are built from the tokens' text styles, not written out again.
- The catalogue gained the variants it lacked: the party and quest cards, a photo, a pin with another icon, a badge without its icon, the small chip and a sheet without a title.
- Tests added or tightened: a disabled ChatInput keeps what was typed and sends nothing; the Chip's two controls; a pin read by its kind; the Switch's hint; the Toast still shown before its time is up, and its time starting again.
- Left as it is: the kind-to-colour tables of Badge, MapPin and EventCard stay with their components; the count pills of MapPin and BottomNav differ in colour and stay apart.

### Not checked

Nobody has looked at the catalogue on a phone yet. The checks are the four commands and the two reviews. A person compares the catalogue with the design system's previews in Expo Go.

### Agent usage (2026-10-04)

- Agent time: about 1 hour 10 minutes in one session, an estimate: about 45 minutes of writing and running, and two reviews of about 2 minutes each run side by side, then the fixes.
- Tokens: the two review agents used about 235,000 tokens together (127,000 and 108,000), input and output not told apart. The main session's tokens for this ticket could not be measured apart from the planning in the same session; no cache figures are available.
