# 01: Collection metrics C0

**What to build:** The fixed sets, labels and thresholds by which Judgements (evaluation A) and the same-event step (evaluation B) will be scored, committed before any run, so that later runs can show what a change improved. Spec: `../spec-collection.md`, metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** None (can start immediately). Due 2026-11-01.

**Status:** ready-for-agent

- [ ] A fixed set of collected posts (SNU Now Drafts and extra.snu programmes) is saved with, for each session, the expected start, end, Place (or none), whether it is an event and whether it runs over a period.
- [ ] A fixed set of post pairs is saved with the expected answer (same event, different, many-to-one), including the real pairs and the 대면/비대면 trap in the spec's Further Notes.
- [ ] The set's split into a development part and a held-out part is recorded, and nobody tunes on the held-out part.
- [ ] Thresholds for C1–C4 and D1–D5 (floor and target) are committed beside the sets.
- [ ] The commit is tagged as C0 and the tag is written into the metrics record.
- [ ] The labels note that one labeller (the P05 owner) made them and that a second labeller is pending the team.
