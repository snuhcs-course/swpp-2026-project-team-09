# 03: The shuttle, and buttons that show it on the map

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

A User asks "셔틀 어디 있어?" and gets the vehicles the operator reports now, or is told the shuttle is not running. Under the answer, 지도에서 셔틀 보기 closes the sheet and turns the map's shuttle layer on. A menu answer gets 지도에서 식당 보기 the same way, with the dining layer.

This ticket adds the first presenter. A presenter is a tool through which the model puts something real into the reply, rather than describing it in prose.

P06-07 (#81) changes the main screen's Quest list in the same screen this ticket changes. Whichever lands second rebases over the other.

## Acceptance criteria

- [ ] **`getShuttle`.**
  - It returns the vehicles the operator reports now, with when they were collected.
  - When the shuttle is not running, or nothing recent was collected, it returns "none" with the reason. The model then says so instead of guessing.
- [ ] `showOnMap` takes `dining` or `shuttle` and adds that map button to the reply. The reply's contract carries map buttons beside the text.
- [ ] The chat Assistant's tool set includes both tools.
- [ ] **The map buttons in the app.**
  - They appear under the Assistant's bubble: 지도에서 셔틀 보기 for `shuttle`, 지도에서 식당 보기 for `dining`.
  - Pressing one closes the sheet and turns that layer on, using the map's existing layers.
- [ ] **End-to-end tests with the scripted fake:**
  - `getShuttle` returns the reported vehicles
  - `getShuttle` returns "none" when the shuttle is not running
  - `showOnMap` puts the button in the reply
  - an unknown layer is refused back to the model
- [ ] **Screen tests:** a reply with a map button shows it, and pressing it closes the sheet with the layer on.
