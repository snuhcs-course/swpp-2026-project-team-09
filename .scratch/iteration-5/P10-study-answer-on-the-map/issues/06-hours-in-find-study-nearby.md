# 06: findStudyNearby uses the opening hours, for apps without study-plan

Parent: [P10 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01

## What to build

- Today `findStudyNearby` ranks by stay only and can pick a space that is closed then (case-table item C1). Apps without `study-plan` keep it, so it should use 01's `openAt`:
  - closed spaces are left out;
  - unknown ones come after the known-open ones;
  - a stay ends at the closing.
- Its Lookup's shape is unchanged.

## Acceptance criteria

- [ ] At 23:30, no space closed then is the pick, and a space with unknown hours is never the pick while a known-open one fits. (Unit tests.)
- [ ] The Lookup's fields are unchanged for an app with `area`. (Integration test.)
