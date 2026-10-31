# 03: Sources, Source Posts, and storing apart from publishing

**What to build:** A collected post is stored once as a Source Post keyed by (Source, key), with its numbered sessions each linked to a Global Event, and nothing collected is published inside the Collection's request: a step after the answer publishes what the rules read. SNU Now collection keeps publishing what it publishes today. Spec: `../spec-collection.md`, "Storage" and "Storing and publishing are apart".

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] A Source Post has its Source, its key (SNU Now `bbsidx`, extra.snu `dataSeq`) and its address; (Source, key) is unique.
- [x] Each session of a post links to one Global Event, with its number, how it was attached and the reason; (Source Post, session number) is unique, and a Global Event can have links from several posts.
- [x] A migration moves every collected event's post into a Source Post with one session linked to it, discarded events included, and fills the Publication Route of published events: Administrator when an Administrator created it, rule for a collected event at version 1, Administrator for a collected event at a later version.
- [x] The worker's question about stored posts and the Collection message carry the Source and the key, and the message carries each post's sessions; the Source enumeration gains extra.snu.
- [x] The Collection's request stores and answers only; a step after the answer publishes the sessions the rules read, with the Publication Route rule. The Publication Route is set to Administrator when an Administrator publishes.
- [x] A Global Event has a flag that an Administrator must look at it.
- [x] A setting turns automatic publication off; with it off, the step publishes nothing and every session stays a Draft.
- [x] No DTO the app receives carries the Publication Route, the flag or the links.
- [x] A discarded event's post is still not brought back by the next Collection.
- [x] Integration tests over HTTP cover the above; GLOSSARY and README are updated where they describe a collected event's post.

## Comments

Decided with the ticket's owner on 2026-10-31, where the ticket and the spec give no value:

- The worker's question and message take no old shape. Server and worker go out as one `all` Release, away from the Collection times; a Collection that still meets the other version is refused, recorded as failed and read again by the next one.
- `post_number` and `source_url` stay on `global_events`, unused, for one Release, because old pods of the rolling update read them. A later migration drops them.
- A post the step did not finish, after a failure or a restart, is taken up by the next Collection of its Source (`source_posts.step_finished_at`).
- The setting is `AUTOMATIC_PUBLICATION`, `on` or `off`, default `on`. To stop it without a Release, `infra/production/README.md` changes the ConfigMap and restarts the main server.
- The migration fills the route of cancelled events by the same rule, so a collected one is Administrator, and leaves discarded events empty.
- An Administrator's edit of a published event sets the route to Administrator, as the migration reads a later version. Cancelling leaves it.
- "The links" the app must not receive are the sessions' links to Source Posts. The app keeps `sourceUrl`, now the address of the event's own post.

### Agent usage (2026-10-31)

- Agent time: about 50 minutes (estimate), one session with two review subagents, including the fixes after the PR's review.
- Tokens, subagents included: input 158, with 14,563,204 cache reads and 514,241 cache writes shown apart; output 166,558. Counted before the last commit of those fixes.
