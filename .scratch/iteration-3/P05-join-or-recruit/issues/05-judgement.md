# 05: Judgement

**What to build:** A session the rules left unpublished is read by the AI, and each session that passes the server's checks is published on its own, after the same event has been looked for; anything else stays a Draft, and a failed call publishes nothing. Spec: `../spec-collection.md`, "Storing and publishing are apart" and "Judgement (main server)"; ADR 0008.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] In the step after a Collection's answer, each session the rules leave unpublished is judged once.
- [ ] A Judgement that could not be made (error, timeout, malformed answer) publishes nothing and is tried once more at the next Collection of its Source, then not again.
- [ ] A Draft an Administrator changed is never judged.
- [ ] E-mail addresses and phone numbers starting with 0 are masked before the post is sent; dates and times are not masked.
- [ ] The model's answer follows a fixed schema: whether the post announces an event, and per session the start, end, place and whether it runs over a period, with the quoted lines for each value.
- [ ] A session passes only when the answer says the post announces an event, each quoted line is in the post, the date, weekday and time agree with it, it is not an application period, the start is before the end, it lasts at most 24 hours and its place matches exactly one Place; each check failing on its own leaves the session a Draft. A post called no event stays a Draft marked so.
- [ ] Where the Source's setting says so, a building number alone is taken as Gwanak (on for SNU Now and extra.snu); a place naming another campus is not matched.
- [ ] The Judgement reads only the post's title, text and Source, with no branch for a particular Source.
- [ ] Each passing session becomes its own Global Event; failing sessions stay as one Draft.
- [ ] The Judgement (values, lines, checks, model id, time) is stored; a published session's Publication Route is Judgement; with automatic publication turned off, nothing is published.
- [ ] Judging is one service step over one Draft, callable later for the stored Drafts.
- [ ] Integration tests use the scripted model; no hangsha code or prompt text is copied.
