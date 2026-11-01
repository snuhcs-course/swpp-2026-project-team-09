# 06: Admin site: Publication Route and Judgement panel

**What to build:** Administrators see how each event was published, filter by it, and read a Judgement beside its post. Spec: `../spec-collection.md`, "Admin site".

**Blocked by:** 05

**Status:** ready-for-agent

- [x] The events list shows each event's Publication Route and filters by it.
- [x] The list and an event's page show the flag that an Administrator must look at it.
- [x] An event's page shows its Judgement: each session's values, the quoted lines, each check passed or failed, the model and the time. *(If time runs short, this panel is cut; the column and filter stay.)*
- [x] A Draft whose Judgement failed, or that was called no event, shows the AI's values beside the post, so that it can be published or discarded by hand.
- [x] Cancelling an event a Judgement published works as for any other.
- [x] The admin site shows the posts the step failed on or has not finished, which ticket 05 records.
- [x] Component tests cover the column, the filter and the panel.

## Comments

Decided on 2026-11-01, where the ticket and the spec give no value. Jaehyun0320 chose the first two; the rest are the implementer's, noted in the PR.

- **Unsettled posts.** They are a section of the Collection status page, below the Sources, since a Collection is recorded as a success whatever the step does.
- **Route column and filter.** They are on the Published table only, as a Draft has no route; a filter leaves the Drafts shown. The list API is unchanged, and the site filters what it answers, so ended and cancelled events are not in the filter, and nothing the app or the chat reads changes.
- **Filter in the address.** `/?route=judgement`. A filtered row passes the route to the event's page, whose "← Events" goes back to the same filter. An unknown value shows every event.
- **Times in the panel.** A session's times are shown as the AI wrote them. They have no offset and may not be times at all, so `formatInSeoul` would misread or throw on them.
- **A session's event.** The panel says "This event", "Another event" or "Not linked to an event". Ticket 08a widens `globalEventId` to an attached event or a session's own Draft, so it does not say that a Judgement published the session.
- **Check names.** They are shown as the main server gives them, with no labels on the site.
- **No Judgement.** An event whose post has none shows no panel.

Known limit: a failed Judgement stores no `modelId`, so its panel says "Model —". The event's page reads only its own post's Judgement, so a post attached to an existing event (ticket 08a) does not show there; ticket 08b's list of Source Posts is the place for it.

### Agent usage (2026-11-01)

- Agent time: about 35 minutes (estimate), one session with two review subagents, not counting about an hour waiting for the lock on heavy jobs, which other sessions held.
- Tokens, subagents included: input 106, with 5,598,631 cache reads and 329,480 cache writes shown apart; output 80,477. Counted before the last commit, which added these numbers.
