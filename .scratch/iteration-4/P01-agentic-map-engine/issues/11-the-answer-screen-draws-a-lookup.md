# 11: The answer screen draws a Lookup

Parent: [P01 spec](../spec.md) ("The contract"), split from [05](05-other-answers-on-the-map.md)
Status: ready-for-agent
Blocked by: 06, and package B's pull requests 245 and 246 on `4.0/Main`

## What to build

A reply with a Lookup is drawn in the answer frame the way a Plan is: the scene on the map between the pill and the card, and in the card the condition chips, the two lines, "근거" with the basis, the band when there is one, and the buttons. Ticket 06 makes the server send a Lookup; until this ticket the app shows only the model's sentence. The screen files are package B's (`mobile/src/screens/main/`, `mobile/src/map/`, `mobile/src/features/assistant/use-chat.ts`); B is named as their owner in the pull request.

## Acceptance criteria

- [ ] A reply's Lookup reaches its bubble and the answer frame, which shows it as it shows a Plan's card: the chips (which do nothing when tapped), the lines, "근거" with the basis, and the band without handles.
- [ ] The map draws the Lookup's scene with the same looks as a Plan's: the pick, the next item, the people, the routes and their flags. A shuttle stop, the shuttle's ride, the faded walk, and the flags for setting out, being late, and the shuttle each get a look of their own from the design system's tokens. A building-level face has a plain border.
- [ ] The camera fits the Lookup as it fits a Plan, and closing the answer returns to the everyday map.
- [ ] "길 안내" (`guide`) starts today's route guidance to the Place. A `remind` or `meet` action is not drawn until its screen exists (package D's notification, package B's "만나고 싶다").
- [ ] Unit tests for the drawing of each scene kind; integration tests of the frame with a Lookup through the app's API mock (the copy of a real reply).

## Decisions (2026-11-15)

1. **Built after B's two open pull requests are merged**, on top of them, so that their rework of the frame is not done twice.
2. **No new screen piece**: the Lookup's card is the Plan's card without the arrows and without "이대로 초대".

## Comments
