# 30: The map is framed once per event, then the camera is the User's

Parent: [P10 spec](../spec.md). Found on the user's phone on 2026-11-28, in a study answer and after opening 관정관: once a search set the first zoom, the map could not be moved freely; it kept coming back to its place. His words: "최초 질의 혹은 클릭 이후 줌 세팅이 된 이후에는 마음대로 움직일 수 있어야 하는거야."
Status: ready-for-human

Native files: none. Releases: an app OTA update; it needs no server change.

## The rule

The map is framed once for each event that asks for framing, and the User's pan and zoom stand until the next one.

- **Framing events:** a new reply; a press that opens or chooses something (a candidate row, a mark, a step, a place opened, the list again); a Plan made or left as it is; a recalculation that brings other places; the frame shown again.
- **Not framing events:** a re-render, a change of the card's height, the keyboard, a recalculation that keeps the same places, the phone's position, and a poll (free seats, Friends' positions, standings, a way fetched again).

## What changes

- **One rule, in one place** (`screens/main/framed-camera.ts`, `useFramedCamera`). Every drawing on the map goes through `useDrawnMap`: a Plan, a Lookup, a scene the app made (seat booking, steps, Proposal, cards), and a received invitation's way. Each says what its framing is of (`FrameKey`: the reply, and what was opened or chosen in it). The camera frames on a change of that key, when the drawing comes onto the map, or when it becomes the one the map shows.
- **Its own layout only.** A framing follows the card's height and the stage until the map first rests after its glide. From then on nothing moves the camera until the next event.
- **A place's view opened or closed.** A Plan's key holds the place whose view is open (`menuFor`): a meal's menu, a study place's view, or an event's. Opening the view of the place already shown, or going back to the list, frames again, and the framing follows the card as it rises for the view.
- **Steps framed by where they are.** Several requests' steps are each drawn at their own answer (P03 ticket 21). Their key holds the step chosen and every step's place, so another plan of the chosen step, or a recalculation that moves a step, frames again; a booking's time on the bar moves no step and frames nothing.
- **One drawing framed at a time.** A scene the app made is drawn over the Plan, and the Plan over the Lookup (`useDrawnAnswer` in `use-map-view.ts`). Only the one drawn frames; the others wait until they are shown again.

## Acceptance criteria

- [x] After a seat card's booking is framed, the phone's position, the card raised, the keyboard, and the time on the bar move no camera. (Integration test, counting the camera's moves; all four failed before.)
- [x] After a meal answer is framed, the phone's position, the card raised, and the keyboard move no camera, and a new reply frames again. (Integration test; the keyboard failed before.)
- [x] After several requests' steps are framed, the phone's position, the card raised, and the keyboard move no camera; another step chosen and another plan of the chosen step's answer frame again. (Integration test; the plan failed before.)
- [x] After a meal answer is framed, opening the menu of the place shown and going back to the list each frame again. (Integration test; the menu's opening failed before.)
- [x] A recalculation that keeps the places moves nothing once the framing has rested; one that brings another place frames once its card has stayed the same for 120 ms. A change of the card frames again only before the map rests. (Unit tests of the hook.)
- [x] Whole lint, format and types of the app.
- [ ] The user checks in the released app that the map moves freely after the first zoom in a study answer and with 관정관 open.

## Comments

Taken `5.0/Main` in after #725, #729 and #733 (2026-11-28). Their drawings all go through `useDrawnMap`: the chosen step's answer is drawn in the steps' scene, the seat step's booking too, and a Lookup that takes the map for its turn is the Lookup's own drawing. The steps' key was missing their places, which #725 made move with each step's own answer.

TaeHyun79's review found two keys that missed a press: the steps' places (above), and a place's view opened over the Plan already shown, or closed. Both are fixed, each with a test that failed first.

### Agent usage (2026-11-28)

- Agent time: about 2 hours, an estimate, in one session. About half of it was spent waiting for the app's integration files, which ran slowly while the Mac was heavily loaded (load average 20 to 50).
- Tokens: input 75.9M, of which 75.7M cache reads, 0.18M cache writes and about 200 uncached; output about 104k. No subagents.

### Agent usage (2026-11-28, after the review)

- Agent time: about 50 minutes (an estimate), in the same session, from 10:45 KST: taking `5.0/Main` in, the two must-fixes of TaeHyun79's review, and one run of the camera files, most of it waiting for the integration files.
- Tokens: 138 input, 43,248 output; cache reads 12,657,415, cache writes 184,571. No subagents.
