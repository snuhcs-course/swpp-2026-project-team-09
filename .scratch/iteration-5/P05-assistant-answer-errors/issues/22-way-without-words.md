# 22: A way the map draws comes with no words

Parent: [P05 spec](../spec.md)
Status: ready-for-agent
Blocked by: None.

Native files: none. Releases: the main server.

## What happens now

The app is changing so that a reply's words are never dropped beside a Lookup: they become the dock's one line. For a way, the model's sentence would then show whenever it writes one, and the rules ask it for one every time ("문화관은 지금 있는 301동에서 걸어서 18분이에요."), which only repeats the flag and the route.

When the model writes nothing, the server puts its fixed sentence there instead ("아래에서 확인해 보세요."), which would show as the line too.

## What to build

- The way rules have the model write no text after findWay answers found, and one short sentence only when the User asked whether they will be late or when to set out, asked about the shuttle, is there already (atPlace), or a gate on the way is closed. It never says the shuttle is not running unless asked about the shuttle.
- findWay's found answer carries the same as a `note`, where the model reads it as it writes. A first try with the rules alone still had a sentence in 6 of 6 runs, most saying the shuttle was not running.
- A reply that shows only a `way` or `place` Lookup and has no words has `text: ""`, not the fixed sentence. Anything else shown with no words keeps the fixed sentence.
- The app sends such a reply back as the Lookup's lines, as it does for every Lookup (`shownText`), so the server's history check, which wants an Assistant's text, holds.
- The eval takes a case's `context` (where the asker is) and `text.none` (the reply has no words).

## Acceptance criteria

- [ ] A way Lookup with no words is replied with `text: ""` and no fixed sentence; a menu Lookup with no words still has the fixed sentence. (`assistant-answer-reply.unit.test.ts`, which failed before the change.)
- [ ] The eval cases `way-where-is-a-building` ("301동 어디야?") and `way-how-to-go` come back with the way drawn and no words.
- [ ] Lint, format and types of the main server pass.
