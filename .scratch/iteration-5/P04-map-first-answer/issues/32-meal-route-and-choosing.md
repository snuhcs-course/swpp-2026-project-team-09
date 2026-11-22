# 32: A meal answer's route, fading, and choosing on the map

Parent: [P04 spec](../spec.md)
Status: ready-for-agent

Native files: none. Releases: an app OTA update only.

## What to build

The rest of the map part of the answer screen's redesign (boards E1 and E2), after [31](31-meal-candidates-as-small-tags.md).

- The route runs from where the User starts to the chosen place as a solid line, then on to the next fixed thing as a dotted line. Each leg carries its minutes. The start and the next thing are dark labels with their times ("10:45 301동", "15:30 302동 수업"). With nothing after, only the first leg is drawn.
- A candidate is faded when it does not fit the band or when its walking is over thirty minutes. The chosen place is never faded. A faded tag can still be pressed.
- The chosen place's label ends its second line with "메뉴 ›" in place of the "›" after its name. A press on the label opens the place's card, as today's pick does, until the menu card of the list lands.
- Choosing another place pops its dot, and a ring spreads from it twice and stops. Reduced motion shows neither.
- The camera keeps every candidate in view between the time bar and the card. Tags keep clear of Friends' faces as well as of other marks. A tag that cannot be placed leaves its number on its dot.

## Acceptance criteria

- [ ] The crowded answer's first pick: dark start and next labels with their times, the solid way there and the dotted way on with 15 and 17 minutes, the pick's label with "메뉴 ›", and 자하연식당 2층 faded but not 3식당. (Unit test.)
- [ ] 302동식당 chosen: the label moves to it, and only the way there is drawn. (Unit test.)
- [ ] The crowded mock reply on the emulator: the first answer, another candidate pressed, and the label pressed. (Pictures.)
- [ ] No native file changes; lint, format, and types pass on the app.
