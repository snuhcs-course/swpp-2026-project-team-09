# 13: The signal for Global Events

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A newly published Global Event appears on every User's map without the User asking. When a Collection publishes an event, the main server sends `global-events-changed` to every connected app, and the app fetches the published events again. P12 sends the same signal when an Administrator publishes, edits or cancels an event.

## Acceptance criteria

- [x] `global-events-changed` goes to every connected app when a Collection stores at least one event as published. It names no Users and carries nothing. A Collection that stores only Drafts, or nothing new, sends none.
- [x] The signal is sent once the events are stored, and a failure to send it leaves the Collection's result as it is.
- [x] One operation of the main server sends the signal, and its README tells P12 to call it when an Administrator publishes, edits or cancels a Global Event.
- [x] A main server test: a Collection that publishes an event puts the signal on Redis, and one that stores only a Draft does not.
- [x] A socket server test: the signal reaches every connection.
- [x] The READMEs record the signal and what the app does on it.

## Comments

### Decisions (2026-10-04)

- `GlobalEventsService.signalChanged(): void` sends `global-events-changed` to `'everyone'` with no payload. P12 calls it after its transaction commits when an Administrator publishes, edits or cancels a Global Event; `GlobalEventsModule` does not export the service yet, since P12's routes live in that module.
- A Collection inserts with `createManyAndReturn({ skipDuplicates: true, select: { state: true } })`, so only the posts it newly stored count: the signal goes once, after the transaction, when at least one of them is `published`. A post already stored, in any state, sends none.
- The socket server test is ticket 01's `A signal that names no Users reaches every connection` in `socket-server/test/signals.e2e-spec.ts`, which already sends `global-events-changed` without `userIds` and checks that two connections each receive it with no argument.
- The main server tests are in `main-server/test/global-events.e2e-spec.ts`, the only file that publishes events, and frame each Collection between two signals of their own so that a late signal of an earlier test is not counted.

### Agent usage (2026-10-04)

- Agent time: about 5 minutes, an estimate: one implementing agent. The session that ran the agents of all P08 tickets is counted once, under ticket 09.
- Tokens, counted from the agent's transcript:
  - Input: 2,913,669, of which 2,834,260 were cache reads, 79,345 cache writes and 64 uncached.
  - Output: 429, a lower bound, since the transcript records only part of the output of most steps.
