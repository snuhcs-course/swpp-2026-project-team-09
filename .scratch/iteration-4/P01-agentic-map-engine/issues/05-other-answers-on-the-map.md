# 05: Other answers on the map

Parent: [P01 spec](../spec.md) ("The contract", "The Assistant")
Status: needs-triage
Blocked by: 03

## What to build

The Assistant's other answers that involve a Place (where a Place is, the minutes to a Place and whether the User will be late, and a Restaurant's menu) come back with a map scene in the answer's shape for an app with the `answer` capability, so that the answer screen draws them as it draws a Plan.

## Acceptance criteria

- [ ] The contract says how an answer without a Plan carries a map scene, on both sides.
- [ ] Each of the three answers returns its scene, computed by the server from the walking table and the User's day.
- [ ] An app without the capability is answered as before.
- [ ] Unit tests for each scene and integration tests at the Assistant's endpoint.

## Comments
