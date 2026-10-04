# 13: The signal for Global Events

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Friends by Friend ID, and the signal path)

## What to build

A newly published Global Event appears on every User's map without the User asking. When a Collection publishes an event, the main server sends `global-events-changed` to every connected app, and the app fetches the published events again. P12 sends the same signal when an Administrator publishes, edits or cancels an event.

## Acceptance criteria

- [ ] `global-events-changed` goes to every connected app when a Collection stores at least one event as published. It names no Users and carries nothing. A Collection that stores only Drafts, or nothing new, sends none.
- [ ] The signal is sent once the events are stored, and a failure to send it leaves the Collection's result as it is.
- [ ] One operation of the main server sends the signal, and its README tells P12 to call it when an Administrator publishes, edits or cancels a Global Event.
- [ ] A main server test: a Collection that publishes an event puts the signal on Redis, and one that stores only a Draft does not.
- [ ] A socket server test: the signal reaches every connection.
- [ ] The READMEs record the signal and what the app does on it.
