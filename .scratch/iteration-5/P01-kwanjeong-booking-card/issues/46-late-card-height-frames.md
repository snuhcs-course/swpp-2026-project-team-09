# 46: A card's height told after the map rests frames the answer once more

Parent: P10 ticket 30 (one framing per event).
Status: ready-for-human
Blocked by: nothing.

Native files: none. Releases: an OTA update.

## What was wrong

- A teammate saw, on a branch holding today's Main, the map framing an answer with its pick and marks under the time card: on the first answer after a cold start, and on every answer at font 1.3.
- The framing follows the cards' layout only until the map rests after the answer's glide (`framed-camera.ts`). The time card tells its height from its own layout. When that height came after the rest, as a slow first layout can, the frame kept a top padding of the status bar alone (`answer-padding.ts`) and never counted the card.
- On the emulator at font 1.0 the pick ended clear in each case tried, the timing being on the right side there. The cases at 1.3 could not be run: the Mac's load hung the emulator.

## What changes

- After the framing has closed, a card's first height frames the event's drawing once more: the time card going from no height to one, or the chat card. Only while the map rests where the framing left it, so a pan of the User's stands.
- A height told again, as a card folds, its person rows open, or the chat card rises, still moves nothing (P10 ticket 31).
- The rule is in the one framing hook every drawing uses: meal and study answers, the steps of several requests, the scene the app makes, and lookups.

## Acceptance criteria

- [x] The time card's first height told after the map rested, at 120 and at 156 high, frames once more, to the camera the answer gets with that card laid out; a later fold moves nothing. (`answer-camera-events`, new; fails on Main.)
- [x] The chat card's first height told after the rest frames once more. (New; fails on Main.)
- [x] A pan of the User's before the time card's height stands; a height told before the rest moves nothing more. (New; pass on both.)
- [x] Every change of a card already counted, there and back, moves nothing and draws no mark anew. (P10 ticket 31's cases, unchanged.)
- [x] No native file changes; lint, format and types pass for all of `mobile`.

## Comments

### Agent usage (2026-11-28)

- Agent time: about 1 h 5 min in this session (an estimate: active time with gaps over 5 minutes left out), from the emulator check on Main through the tests, the fix, and the integration sweep. Much of it went to waiting on the emulator and on test runs under a machine load near 30.
- Tokens: input 200 uncached, with 90,400 cache writes and 37,600,000 cache reads; output 40,000. No subagents.
