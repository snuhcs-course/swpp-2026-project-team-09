# 08b: The same event posted twice: the AI's choice, the queue and detaching

**What to build:** Where the rules cannot decide, the AI chooses among the candidates; what it cannot decide waits for an Administrator, who can also detach a session attached by mistake. Spec: `../spec-collection.md`, "The same event posted twice" and "Admin site". Cut first if time runs short.

**Blocked by:** 08a

**Status:** ready-for-agent

- [ ] For the candidates the rules left, the AI chooses one or none, or is unsure.
- [ ] Unsure, several matches, a link rule whose sessions do not match one to one, or a failed call leave the session a Draft in the Administrator's queue with its candidates.
- [ ] With automatic publication turned off, the AI's choice is stored but nothing is published.
- [ ] The admin site shows an event's linked Source Posts and sessions (Source, link, how attached, reason), a detach action that makes the session its own Draft again with the event's Quests left in place, and a queue page whose sessions can be attached or published as their own.
- [ ] Integration tests with the scripted model and admin component tests cover the above.
