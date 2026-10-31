# 01: Collection metrics C0

**What to build:** The fixed sets, labels and thresholds by which Judgements (evaluation A) and the same-event step (evaluation B) will be scored, committed before any run, so that later runs can show what a change improved. Spec: `../spec-collection.md`, metrics: `../references/iter3-p5 메트릭.md` sections 2 (A, B) and 4.

**Blocked by:** None (can start immediately). Due 2026-11-01.

**Status:** ready-for-agent

- [ ] The fixed set of evaluation A is Drafts: collected posts the rules leave unpublished, from SNU Now and extra.snu, saved as HTML with the date they were fetched. For each session it is labelled with start, end, Place (or none), whether the post announces an event, whether the session runs over a period, and whether it may be published.
- [x] The set deliberately holds posts that announce no event, posts whose only date line is an application period, multi-session posts, years left out, and building numbers alone.
- [x] The real overlapping pairs are counted first (the spec's Further Notes lists those found on 10-30); the size of evaluation B's set is then fixed from that count, with its positives (body links, different titles, many-to-one) and hard negatives (대면/비대면, 1차/2차, the same time for another event). The trap 177707 is in it.
- [x] Both sets are split into a development part and a held-out part; nobody tunes on the held-out part.
- [x] Thresholds (floor and target) are committed for C1–C7 and D1–D6, as the metrics document's section 2 now defines them, together with what happens when a floor is missed (section 4.1).
- [x] R0 for each evaluation is defined in the record: the rules alone for A (C1's baseline is 0, since every Draft is one the rules did not publish), and equal starts with title similarity for B.
- [ ] The P05 owner labels every item. A second labeller labels 15 posts of A and 30 hard negative pairs of B on their own; the record keeps both original label files, the agreement (p_o, κ, positive and negative agreement, n) and how disagreements were settled.
- [ ] The commit is tagged as C0 and the tag is written into the metrics record.

## Comments

### Set built, labels pending (2026-10-31)

The record is `main-server/eval/collection/README.md`. Done by an agent: saved posts, sets, blank label files, thresholds, R0 definitions. Not done, since people do them: the owner's labels, the second labeller's 15 posts and 30 pairs, the agreement and gold files, the C0 tag.

The first box stays open until its labels are in: its posts are saved and dated, and each session's values are blank. The sets' tags say why a post was chosen, not its answer.

Decisions by the P05 owner on 2026-10-31:

- Evaluation B has 120 pairs, with 44 positive candidates (36.7%) against the metrics document's 30–50%. 8 pairs were known on 10-30; 44 were counted over the wider pull, before labelling.
- Evaluation A's development part is the metrics document's 18 posts, outside the fixed 60; the ticket's "split" is read that way. Evaluation B sets aside about 20%, split so that the two parts share no post.
- Evaluation A's 60 posts are 35 of SNU Now and 25 of extra.snu.
- Thresholds are the metrics document's values as written: no floor for D2–D6, D3 and D4 as targets, D5 diagnostic, D6 diagnostic with a target of 0.50.
- An online session's `mayPublish` is false, as the Judgement's check requires one Place.
- The TA is not asked about team-made labels; the P05 owner dropped that step.

Decided by the agent: a pair is post to post, with a session number where a post's other sessions are another event.

For ticket 04: `robots.txt` on 10-31 is `Allow: /` for every agent at www.snu.ac.kr and 404 at extra.snu.ac.kr; the site's terms were not checked. The status codes are 0001 모집중, 0002 마감임박, 0003 모집마감, 0004 모집대기, and the list without a filter leaves 모집마감 out. Evaluation A's Drafts of extra.snu were picked by the same rules over the page's session table, since the collector does not exist yet.

### Agent usage (2026-10-31)

Agent work so far; the labels and later steps may add to it.

- Agent time: about 1 hour (estimate), one session with two review subagents. It includes about 25 minutes of waiting on the site's two-second pacing.
- Tokens, subagents included: input 160, with 13,265,556 cache reads and 524,088 cache writes shown apart; output 147,926. Counted before the PR was opened.
