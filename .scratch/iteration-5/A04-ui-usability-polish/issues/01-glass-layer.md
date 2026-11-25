# 01: The glass layer in the design system

Parent: [A04 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately).

Native files: none. Releases: an app OTA update only.

## What happens now

- Nothing in the app is translucent. The token `color.surfaceGlass` (white at 0.8, `design-system/tokens.ts`) is defined and used by nothing.
- `expo-glass-effect` is in `mobile/package.json` (added with the placeholder in PR #3) and imported nowhere. There is no `expo-blur`.
- The design-system catalogue screen (`app/catalogue.tsx`, `catalogue/`) shows every shared component under its name, and `catalogue.integration` checks the names.
- `mobile/README.md` § Design system describes the shared components.

## What to build

A design-system component that draws a glass surface at a named level. A caller never gives numbers. The levels come from the changelog's § 5-1 (`references/changelog-11-24.md`):

| Level | Takes | Look |
|---|---|---|
| panel | outer bars, bottom sheets, cards over the map | white about 50%, a thin light line along the top; blur later (ticket 03) |
| inner | chips, boxes, white buttons, light coloured chips inside a panel | white 80% |
| field | grey input fields inside a panel | navy (`#001A72`) at 5% |
| map chip | small chips standing on the map (walk minutes, candidate tags, route time chips) | white 60% |
| dark chip | black time and place chips ("10:45 301동") | navy-black at 48% |

- The component takes the usual layout style (padding, radius, border) from its caller, and its children.
- Keep the surface behind one component, so that ticket 03 can add a blur inside it without touching any caller.
- The catalogue shows the component at each level, over something that shows through.
- `mobile/README.md` § Design system gains a "Glass layer" part. It says:
  - the levels and what takes each;
  - that navy main buttons and full-screen white pages never take glass;
  - that a new Assistant panel over the map uses the component, not its own colours.
- Settle whether `color.surfaceGlass` becomes one of the levels or is removed. Leave no unused token behind.
- `expo-glass-effect` in `mobile/package.json` is also unused, but it stays: removing it is a native change. Ticket 03, which makes the native Release, uses it or drops it.

The canvas boards that show the levels: Mf5Kit and Mf5Row-meal (<https://claude.ai/artifact/NgBrKLs1RhN9tVywM6376Y>).

## Must not break

- No screen uses the component yet; tickets 02 and 06 do. No screen's look changes in this ticket.
- `catalogue.integration` and the design-system unit tests.

## Acceptance criteria

- [ ] The component draws each of the five levels, and the catalogue shows it under its name. (`catalogue.integration`, which fails before the change.)
- [ ] `mobile/README.md` § Design system has the Glass layer part.
- [ ] A screenshot of the catalogue's glass entry on the emulator goes in the pull request.
- [ ] No native file changes; lint, format and types pass on the app.

## Comments
