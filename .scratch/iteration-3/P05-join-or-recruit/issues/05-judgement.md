# 05: Judgement

**What to build:** A Draft the rules left unpublished is read by the AI, and each of its sessions that passes the server's checks is published on its own; anything else stays a Draft, and a failed call publishes nothing. Spec: `../spec-collection.md`, "Judgement (main server)"; ADR 0008.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] After a Collection's message is answered, each new Draft is judged once, outside the request.
- [ ] A Judgement that could not be made (error, timeout, malformed answer) publishes nothing and is tried once more at the next Collection of its Source, then not again.
- [ ] A Draft an Administrator changed is never judged.
- [ ] E-mail addresses and phone numbers starting with 0 are masked before the post is sent; dates and times are not masked.
- [ ] The model's answer follows a fixed schema: per session, start, end, place, whether it is an event, and the quoted lines for each value.
- [ ] A session is published only when each quoted line is in the post, the date, weekday and time agree with it, it is not an application period, the start is before the end, it lasts at most 24 hours and its place matches exactly one Place; each check failing on its own leaves the session a Draft.
- [ ] Where a Source's setting says so, a building number alone is taken as Gwanak (on for SNU Now and extra.snu); a place naming another campus is not matched.
- [ ] The Judgement reads only the post's title, text and Source, with no branch for a particular Source.
- [ ] A post with several sessions becomes one Global Event per passing session; failing sessions stay as one Draft.
- [ ] The Judgement (values, lines, checks, model id, time) is stored, the Publication Route is Judgement, and the apps are told to refetch as on any publication.
- [ ] Judging is one service step over one Draft, callable later for the stored Drafts.
- [ ] Tests use the scripted model; no hangsha code or prompt text is copied.
