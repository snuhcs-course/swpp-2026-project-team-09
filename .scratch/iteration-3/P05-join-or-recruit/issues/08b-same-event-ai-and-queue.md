# 08b: The same event posted twice: the AI's choice, the queue and detaching

**What to build:** Where the rules cannot decide, the AI chooses among the candidates; what it cannot decide waits for an Administrator, who can also detach a session attached by mistake. Spec: `../spec-collection.md`, "The same event posted twice" and "Admin site". Cut first if time runs short.

**Blocked by:** 08a

**Status:** ready-for-agent

- [x] For the candidates the rules left, the AI chooses one or none, or is unsure.
- [x] Unsure, several matches, a link rule whose sessions do not match one to one, or a failed call leave the session a Draft in the Administrator's queue with its candidates.
- [x] With automatic publication turned off, the AI's choice is stored but nothing is published.
- [x] The admin site shows an event's linked Source Posts and sessions (Source, link, how attached, reason), a detach action that makes the session its own Draft again with the event's Quests left in place, and a queue page whose sessions can be attached or published as their own.
- [x] Integration tests with the scripted model and admin component tests cover the above.

## Comments

### Decisions (2026-11-01)

Decided by Jaehyun0320 before the work, where the spec has no value.

- **One call per post**, with an answer per session, as a Judgement reads the whole post. Cost hardly differs: Haiku 5.5 at USD 0.10 and 0.50 per million tokens makes a post with ten candidates about USD 0.001, and only posts of several sessions differ. A session a Judgement read has no row until it is settled, so an answer is stored by post and start (`same_event_answers`).
- **A many-to-one post:** a post of several sessions attaches each. A single session that could stand for several programmes is answered `unsure`, since (Source Post, session number) is unique.
- **A queued session's candidates are worked out when asked for**, not stored: within a day and not refused, plus the events of the posts it links. So 08a's held sessions work as they are, a removed candidate goes, a cancelled one says so and a later one appears. The ids the AI was asked about stay on its answer, for the check under the lock. An Administrator may see other candidates than the AI did.
- **`needsAdministrator` after detaching stays on.** `POST :id/acknowledge`, "Mark as looked at" on the event's page, takes any flag off, without a new version or a signal. Until now nothing could.
- **Publishing a queued Draft without a time or place is refused** with `GLOBAL_EVENT_INCOMPLETE` and a link to the Draft's page. It stays queued until attached or published on the queue, or published or discarded on its own page; the queue has no Discard.
- `SAME_EVENT_AI_CHOICE`, `off` by default and in Production. It is turned on when evaluation B passes D1's floor of 0 and the posts may be sent to the model provider, by a person. The queue, attaching and detaching work with it off.

- **A detached Draft has version 2** (Jaehyun0320, 2026-11-01, PR #158's review), unlike the SQL in PR #150's Rollback Scenario, which is otherwise followed. `readByRules=false` alone would leave it judgeable by `overDraft`. Since it counts as an Administrator's change, one detached session stops the Judgement of the post's other Drafts too, such as one waiting for its retry; those stay Drafts. A Judgement of the post could otherwise repeat the detached session.

Decided while building, for the owner to overrule:

- **`reason` is the AI's one sentence**, at most 300 characters, in Korean. It is shown on the event's page and the queue, escaped as any text.
- **Reasons for the queue beyond those named:** `candidates_changed`, when the chosen event is no longer a candidate or one the AI was not asked about has appeared. This is what two pods reach: no second call is made. Two sessions choosing one event are `several_matches`, also when a sibling session already went to it, by the AI or by the title rule. With the AI off the title rule stays as in 08a.
- **Two sessions at one start share one answer**, so the question lists both places. An answer of `same` holds them all as `several_matches`, since it cannot say which of them it means.
- An Administrator's attachment raises no flag: they saw both times.
- An attached Draft's links and any candidate state may be attached to on the queue, the state being shown. A linked post's Draft that no one read a time for is offered too, which the step itself would not attach to.
- The call takes the Judgement's limits (`JUDGEMENT_TIMEOUT_MS`, `JUDGEMENT_MAX_OUTPUT_TOKENS`). A candidate's text is not cut: at this price length costs little, and the longest page of the development set's posts is about 2,800 characters.

Known limits:

- A Draft edited on its own page while the step holds it (`holdJudged`) is overwritten, as in 08a: the page takes no lock.
- `same_event_answers` keeps the first answer about a start. A session whose candidates change after `different`, with publication off, goes to the queue when it is next compared.
- Queue actions compare the Draft's version under the lock. The window in which an edit on the Draft's own page lands inside an attach or a publish is covered by the code's guards, with no test forcing it.

Ticket 09's runner can use `candidatesLeft`, `matchAmong` (`same-event.ts`), `chooseSameEvent`, `appliedChoice` and `holdOf` (`same-event-choice.ts`) with no database. D4 counts `heldFor` by value.

### Agent usage (2026-11-01)

- Agent time: about 1 hour (estimate), one session with two review subagents, leaving out the time waiting for a person and for another session's evaluation to end.
- Tokens, subagents included: input 132, with 11,469,011 cache reads and 539,936 cache writes shown apart; output 186,261. Counted before the PR was opened and its review.
