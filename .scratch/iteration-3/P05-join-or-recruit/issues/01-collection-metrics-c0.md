# 01: Collection metrics C0

**What to build:** The fixed sets, labels and thresholds by which Judgements (evaluation A) and the same-event step (evaluation B) will be scored, committed before any run, so that later runs can show what a change improved. Spec: `../spec-collection.md`, metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** None (can start immediately). Due 2026-11-01.

**Status:** ready-for-agent

- [ ] The fixed set of evaluation A is Drafts: collected posts the rules leave unpublished, from SNU Now and extra.snu, saved as HTML with the date they were fetched. For each session it is labelled with start, end, Place (or none), whether the post announces an event, whether the session runs over a period, and whether it may be published.
- [ ] The set deliberately holds posts that announce no event, posts whose only date line is an application period, multi-session posts, years left out, and building numbers alone.
- [ ] The real overlapping pairs are counted first (the spec's Further Notes lists those found on 10-30); the size of evaluation B's set is then fixed from that count, with its positives (body links, different titles, many-to-one) and hard negatives (대면/비대면, 1차/2차, the same time for another event). The trap 177707 is in it.
- [ ] Both sets are split into a development part and a held-out part; nobody tunes on the held-out part.
- [ ] Thresholds (floor and target) are committed for C1–C7 and D1–D6, as the metrics document's section 2 now defines them, together with what happens when a floor is missed (section 4.1).
- [ ] R0 for each evaluation is defined in the record: the rules alone for A (C1's baseline is 0, since every Draft is one the rules did not publish), and equal starts with title similarity for B.
- [ ] The P05 owner labels every item. A second labeller labels 15 posts of A and 30 hard negative pairs of B on their own; the record keeps both original label files, the agreement (p_o, κ, positive and negative agreement, n) and how disagreements were settled.
- [ ] The TA is asked by message, before C0, whether labels made by the team are acceptable; the date and the answer (or "no answer by C0") are recorded.
- [ ] The commit is tagged as C0 and the tag is written into the metrics record.
