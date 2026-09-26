# Owner profile and manual timetable

Implement the agreed authenticated private profile editing and manual weekly class
timetable within main-server. API and validation: [contract](../../docs/prototype-api.md).
Independent optimistic versions prevent silent concurrent overwrite. Preserve edited
names on Google relogin. No OCR, AI choice, public listing or matching inference.

Acceptance: real PostgreSQL HTTP integration proves defaults, authenticated owner
privacy, concurrent winners/conflicts, atomic replacement, and relogin preservation.
Unit validation covers calendar rollover, overlaps, bounds and supplied ownership.
