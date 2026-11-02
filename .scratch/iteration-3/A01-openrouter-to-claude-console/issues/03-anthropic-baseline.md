# 03: Every eval suite's baseline on the Anthropic path

Parent: [A01 spec](../spec.md) ("Testing Decisions")
Status: ready-for-human
Blocked by: 01, 02

## What to build

One run of every suite on the Anthropic path, recorded beside the last OpenRouter run of each, so that later work is measured on the path production uses.

## Acceptance criteria

- [ ] The cost of the runs is estimated from the last runs' tokens and the Anthropic prices with caching, and 안진영 approves it before anything runs (estimate on 2026-11-02: about USD 1.5–2 for the chat suites; this ticket adds the collection evaluations' share, and states the basis: the system-prompt breakpoint read by every case after the first, and the steps of a message reading each other).
- [ ] P19, P4, P5 (small and large worlds), P6 and the collection evaluations A and B (`pnpm eval:collection`, the Judgement and the same-event choice) run once each on one commit, with today's limits (8 steps, 30 s, 4,000 output tokens; the collection runs with their own).
- [ ] Each suite's record gets an "Anthropic baseline" entry beside its last OpenRouter run, marked as a different condition (metrics 4.3): pass rates, the cache hit rate, cost per turn and time.
- [ ] Any metric that moves past the noise the suite's records already show is read, and the record says what it found.
