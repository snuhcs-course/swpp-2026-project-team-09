# 08a: The same event posted twice: the rules

**What to build:** A new post that the rules can tell is the same event as an existing Global Event is attached to it as another Source Post instead of becoming a second event, before anything is published. Spec: `../spec-collection.md`, "Storing and publishing are apart" and "The same event posted twice".

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [x] The link rule runs first, before times are read: when a new post's body links a stored Source Post, by that Source's address pattern (a setting of the Source), its sessions are attached to the linked post's Global Events whatever their times; when the match between sessions is not one to one, the post is held as a Draft for ticket 08b's queue (until then, left a Draft).
- [x] A session attached by the link rule whose time differs from its published event changes nothing and flags the event.
- [x] For the sessions left, once the rules or a Judgement have read their times, the candidates are the Global Events of any Source starting within one day.
- [x] The refusing rules run next: both with a time of day on the same day and different times, 1차 against 2차, 대면 against 비대면, different roles. Candidates on the day before or after are kept.
- [x] Then equal normalised titles with equal starts attach.
- [x] A session neither attached nor held is published as in ticket 05; an attached session is not published on its own.
- [x] Two existing events are never merged; the step reads only Source Posts, with no branch for a particular Source.
- [x] Integration tests over HTTP cover each rule, the order, the flag, and that nothing is published before the step.
- [x] Once this ticket is deployed, `EXTRA_SNU_COLLECTION` may be turned on (ticket 04), and the ticket says so when it closes.

## Comments

### Decisions (2026-11-01)

Decided by Jaehyun0320 before the work, where the spec has no value.

- **Links reach the server as `links`.** The worker's body text loses an address hidden behind words, so it also sends where the body's web links lead, stored in `source_posts.links`. The description stays as it was. No saved page holds a key behind words: of the development set's posts, one links a post (177392) and its text shows the address, while 13 of 36 web links read otherwise than they lead.
- **An attached session's Draft is removed**, and what it held stays in `source_post_sessions.own_draft`, the only copy of the post's title and text. Ticket 08b makes the Draft again from it, with a new id.
- **The queue's mark is `source_post_sessions.held_for`** (`link_not_one_to_one`, `several_matches`). Ticket 08b adds its own values and the candidates.
- **Roles** are 헬퍼, 디자이너, 멘토, 멘티, 튜터, 튜티 and 스태프: what a participant does, not who it is for.
- **The candidates** are events in any state, but of Drafts only those an Administrator made or the rules read with their post through the step.
- **A normalised title** is NFKC, lower case, without what is in `[]`, `()`, `【】` or `<>`, spaces or punctuation. The refusing rules read the titles as written, never the body.

Decided while building, for the owner to overrule:

- A post that links several stored posts is held, like one whose number of sessions differs from its linked post's, in either direction. The spec names only a linked post of several sessions.
- `2회차` counts as a round as `2차` does, since extra.snu's titles write it so.
- A title of only what is bracketed keeps it, so that two such titles do not both normalise to nothing.
- `source_post_sessions.time_stated` says that the post itself states a time, so that a header's date, often the application period, does not flag an event. A multi-day programme of extra.snu counts as stated.
- A session the rules read is compared and published even while its post's Judgement waits for a retry; only the sessions the Judgement reads wait.
- With `AUTOMATIC_JUDGEMENT=off` a session the rules did not read is neither compared nor published, and its post finishes the step. `overDraft` compares it later.
- A session with several matches is held already in this ticket, since publishing it would show the event twice.

Known limits:

- Only a new post that links a stored one is looked at. When an SNU Now post that links a programme arrives before the programme, only the title rule can catch the pair.
- A bracketed part can be what tells two titles apart: `<A> 특강` and `<B> 특강` with one start attach. Evaluation B (ticket 09) measures this.

### Turning on extra.snu's Collections

Once this ticket is deployed, `EXTRA_SNU_COLLECTION` may be turned on. It is still `off`. A person decides when, after the first Collection's memory check in `infra/production/README.md` § Turning on extra.snu's Collections. Deploy the main server before the worker: a main server of an earlier Release refuses a message with `links`.

### Agent usage (2026-11-01)

- Agent time: about 1 hour 10 minutes (estimate), one session with two review subagents, leaving out about 40 minutes when Docker's engine was down and no test could run.
- Tokens, subagents included: input 172, with 14,857,083 cache reads and 502,802 cache writes shown apart; output 170,542. Counted before the last commit, which added these numbers.
