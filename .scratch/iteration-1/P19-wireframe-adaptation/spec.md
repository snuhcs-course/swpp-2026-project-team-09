# P19: Adapt prototype screens to the wireframe design

Status: ready-for-agent

## Problem Statement

The screens of P06, P13, P14 and P15 were built with a provisional arrangement so that the flows could be connected early. Each was laid out by whoever built it. The wireframes of P09 define how the screens should be arranged and how a User moves between them. Until the screens follow the wireframes, the app does not look like one product.

## Solution

The existing screens are rearranged to follow the wireframes and the screen transitions defined in P09. What each screen does stays the same.

## User Stories

1. As an SNU student, I want every screen to follow one arrangement, so that the app feels like one product.
2. As an SNU student, I want the map to stay the main screen with my Avatar on it, so that the app is about where people are.
3. As an SNU student, I want the Party member list and the Quest list at the sides of the map, so that I see my group and my plans without leaving the map.
4. As an SNU student, I want panels to open over the map and close back to it, so that I never lose my place.
5. As an SNU student, I want to move between screens as the wireframes define, so that navigation is predictable.
6. As an SNU student, I want buttons, lists, cards and switches to look and behave the same everywhere, so that I learn them once.
7. As an SNU student, I want empty, loading and error states to look the same everywhere, so that I recognise them.
8. As an SNU student, I want the back button of my phone to close the topmost panel, so that it does what Android users expect.
9. As an SNU student, I want text and touch targets large enough to use while walking, so that I can use the app on the move.
10. As a developer, I want shared components for the repeated elements, so that a later design change is made in one place.
11. As the project manager, I want each screen compared with its wireframe, so that differences are decisions and not accidents.

## Implementation Decisions

- The input is the set of wireframes and screen transitions produced in P09 and published in the Wiki.
- This task changes arrangement, navigation and appearance. It changes no server behaviour and no rule.
- The team's reference for the arrangement is a game interface: the world fills the screen, the group is listed on one side and the quests on the other. The map takes the place of the world.
- Elements that repeat across screens become shared components of the app: panel, card, list row, switch row, primary button, empty state, error state.
- The screen tests of P06, P13, P14 and P15 keep passing. A test that fails because it looked for an element by its position is rewritten to look for it by its meaning.
- Where a wireframe asks for behaviour that no task built, the difference is recorded and raised with the team lead. It is not built inside this task.
- Where a wireframe cannot be followed because of the map module's limits, the difference is recorded with the reason.

## Testing Decisions

- The existing screen tests are the safety net: they pass before and after.
- Each screen is compared with its wireframe by a person, and the result is recorded as same, or different with the reason.
- Navigation is tested with Jest: each transition defined in P09 leads to the screen it names, and the back button closes the topmost panel.
- Prior art: the screen tests of P06, P13, P14 and P15.

## Out of Scope

- New features.
- Visual design beyond the wireframes: brand, illustrations, animation.
- The admin site.
- Changes to the wireframes themselves.
- Accessibility auditing. The heuristic evaluation in Iteration 3 covers usability.

## Further Notes

- The schedule names 안진영 and 함재현 as workers.
- This task cannot start before P09 is published. Until then the status of any ticket derived from this spec is blocked by P09.
- This task depends on P06, P13, P14 and P15.
