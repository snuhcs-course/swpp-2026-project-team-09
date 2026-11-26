# 06: findStudyNearby uses the opening hours, for apps without study-plan

Parent: [P10 spec](../spec.md)
Status: ready-for-human
Blocked by: 01

## What to build

- Today `findStudyNearby` ranks by stay only and can pick a space that is closed then (case-table item C1). Apps without `study-plan` keep it, so it should use 01's `openAt`:
  - closed spaces are left out;
  - unknown ones come after the known-open ones;
  - a stay ends at the closing.
- Its Lookup's shape is unchanged.

## Built (2026-11-27)

- `byHours` and `withClosing` (`lookup/study-near.ts`) rank `findStudyNearby`'s candidates by `StudySpacesService.hoursOf` at the arrival: closed left out, known open first, unknown after, each by `byStay`.
- A stay ends at the closing when that comes before the next item, or within three hours when nothing follows; a later close ends nothing, so the shorter walk still decides then.
- An unknown pick (none known open) gets "○○은 여는 시간을 몰라요" in the basis, and the model `hoursKnown: false`. All closed answers `none` with `all-closed`.
- The tool's description and `STUDY_RULES` are unchanged, so the prompt is too.

## Acceptance criteria

- [x] At 23:30, no space closed then is the pick, and a space with unknown hours is never the pick while a known-open one fits. (Unit tests, `study-lookup-hours.unit.test.ts`.)
- [x] The Lookup's fields are unchanged for an app with `area`. (Integration test, `assistant-study-area.integration.test.ts`, unchanged and passing.)
