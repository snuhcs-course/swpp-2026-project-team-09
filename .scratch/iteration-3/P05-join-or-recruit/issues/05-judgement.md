# 05: Judgement

**What to build:** A session the rules left unpublished is read by the AI, and each session that passes the server's checks is published on its own, after the same event has been looked for; anything else stays a Draft, and a failed call publishes nothing. Spec: `../spec-collection.md`, "Storing and publishing are apart" and "Judgement (main server)"; ADR 0008.

**Blocked by:** 03

**Status:** ready-for-agent

- [x] In the step after a Collection's answer, each session the rules leave unpublished is judged once.
- [x] A Judgement that could not be made (error, timeout, malformed answer) publishes nothing and is tried once more at the next Collection of its Source, then not again.
- [x] A Draft an Administrator changed is never judged.
- [x] E-mail addresses and phone numbers starting with 0 are masked before the post is sent; dates and times are not masked.
- [x] The model's answer follows a fixed schema: whether the post announces an event, and per session the start, end, place and whether it runs over a period, with the quoted lines for each value.
- [x] A session passes only when the answer says the post announces an event, each quoted line is in the post, the date, weekday and time agree with it, it is not an application period, the start is before the end, it lasts at most 24 hours and its place matches exactly one Place; each check failing on its own leaves the session a Draft. A post called no event stays a Draft marked so.
- [x] A session with a day and no time of day does not pass unless it is read as running over a period.
- [x] Where the Source's setting says so, a building number alone is taken as Gwanak (on for SNU Now and extra.snu); a place naming another campus is not matched.
- [x] The Judgement reads only the post's title, text and Source, with no branch for a particular Source.
- [x] Each passing session becomes its own Global Event; failing sessions stay as one Draft.
- [x] The Judgement (values, lines, checks, model id, time) is stored; a published session's Publication Route is Judgement; with automatic publication turned off, nothing is published.
- [x] The step judges only with `AUTOMATIC_JUDGEMENT=on`, `off` by default and in Production. With it off no model is called, no post leaves the server and the rules' publication goes on; `infra/production/README.md` says when to turn it on (ticket 09).
- [x] Judging is one service step over one Draft, callable later for the stored Drafts and by the evaluation whatever the setting says.
- [x] A post the step failed on or has not finished is recorded and the admin API gives it, so that a failure shows beyond the logs (PR #143: the Collection is recorded as a success whatever the step does).
- [x] Integration tests use the scripted model; no hangsha code or prompt text is copied.

## Comments

Decided on 2026-11-01, where the ticket and the spec give no value. Jaehyun0320 chose the first four; the rest are the implementer's, noted in the PR.

- **Sending posts.** Masked posts may be sent to the model provider: agreed by Jaehyun0320 and TaeHyun79 today.
- **No key.** `AUTOMATIC_JUDGEMENT=on` without `OPENROUTER_API_KEY` or `ASSISTANT_MODEL` refuses to start, so it uses no try. A key the provider refuses is a failed call and uses a try.
- **Limits.** 60 seconds and 4,000 output tokens per call (`JUDGEMENT_TIMEOUT_MS`, `JUDGEMENT_MAX_OUTPUT_TOKENS`). One call at a time in a step, after the posts that need no model.
- **Several sessions.** "Failing sessions stay as one Draft" is kept only where a post was stored as one Draft. Drafts are neither added for failing sessions nor deleted: a Draft of a post stored with one per session holds the time and place the worker read, which are nowhere else with Judgements off. The spec now says so. One call and one Judgement per post, since its Drafts share one text; `judgeDraft(id)` judges the Draft's post.
- **Storage.** `judgements`, one row per Source Post, read through `judgement` of the admin detail DTO. A post called no event is `outcome: no_event` with `announcesEvent: false`, and adds no column to the event. Ticket 06 reads these.
- **Tries and the step.** `judgements.attempts` counts a try when it is claimed, at most two. `step_finished_at` stays without a limit and only says that the step will come back; it asks the model only while a try is left. A post is finished once its Judgement has an answer or no try left.
- **An Administrator's change.** Any change to any session of a post stops that post being judged, not only the changed Draft: the answer covers the whole post.
- **Over a period.** The schema reads it and the time-of-day check lets it by, but the length check fails it until ticket 07. So no such session passes yet.
- **Added checks.** The place is in its quoted lines, the end has a time of day when one is given, and a session is not one the rules or the same answer already gave. The prompt also gives today's date, for a date without a year.
- **extra.snu text.** The session lines reach the Judgement through the post's description, which ticket 04 writes, with no branch here.

Known limits, for ticket 09's failure analysis: a place with only a name and no 서울대 or number does not match (as with the rules), so many extra.snu places may stay Drafts, which is not measured yet and which ticket 09 measures and answers with a Source setting; an application heading two lines above a time line is not seen; a model outage uses both tries of the posts it meets, and `overDraft` cannot retry those.

### Agent usage (2026-11-01)

- Agent time: about 50 minutes (estimate), one session with two review subagents.
- Tokens, subagents included: input 120, with 12,059,682 cache reads and 522,494 cache writes shown apart; output 189,805. Counted before the last commit, which added this section.
