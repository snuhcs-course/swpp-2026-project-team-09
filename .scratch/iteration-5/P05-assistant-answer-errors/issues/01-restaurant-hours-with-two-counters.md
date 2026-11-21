# 01: A restaurant's hours survive a cell with two counters

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the worker server.

## What happens now

301동식당's lunch cell on the menu page has two hours lines, "식사 11:30~13:30" and "TAKE-OUT 10:30~16:00". The worker's reader keeps hours only from a cell with exactly one hours line, so 301동식당's lunch is stored without hours. The meal planner then falls back to the general lunch window, 11:00–14:30, and prints it as the restaurant's hours ("점심 301동식당 · 11:00–14:30"), while the menu answer, written from the collected note, says 11:30~13:30.

## What to build

The reader skips the hours lines under a take-out section ("<TAKE-OUT>", "<TAKE-OUT 카페 301동>"). A cell left with one hours line keeps it; a cell with several, such as one for each corner, keeps none as before.

## Acceptance criteria

- [x] 301동식당's lunch cell, with its take-out sections, gives 11:30–13:30. (Unit test, fails before the fix.)
- [x] A cell with one hours line gives that line, as before. (Unit test.)
- [x] A cell with no readable hours gives none. (Unit test.)
- [x] Lint, format and types of the worker server pass.

## Comments

### Agent usage (2026-11-21)

- Agent time: about 12 minutes (an estimate from the transcripts, gaps over five minutes left out). It covers the tracing of every error of the usage test by five read-only subagents, this spec and its thirteen tickets, and this fix.
- Tokens, subagents included: output 147k; input 36.7M, of which 35.7M cache reads, 1.01M cache writes and 542 uncached.
