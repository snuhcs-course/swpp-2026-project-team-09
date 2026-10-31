# 08a: The same event posted twice: the rules

**What to build:** A new post that the rules can tell is the same event as an existing Global Event is attached to it as another Source Post instead of becoming a second event, before anything is published. Spec: `../spec-collection.md`, "Storing and publishing are apart" and "The same event posted twice".

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] The link rule runs first, before times are read: when a new post's body links a stored Source Post, by that Source's address pattern (a setting of the Source), its sessions are attached to the linked post's Global Events whatever their times; when the match between sessions is not one to one, the post is held as a Draft for ticket 08b's queue (until then, left a Draft).
- [ ] A session attached by the link rule whose time differs from its published event changes nothing and flags the event.
- [ ] For the sessions left, once the rules or a Judgement have read their times, the candidates are the Global Events of any Source starting within one day.
- [ ] The refusing rules run next: both with a time of day on the same day and different times, 1차 against 2차, 대면 against 비대면, different roles. Candidates on the day before or after are kept.
- [ ] Then equal normalised titles with equal starts attach.
- [ ] A session neither attached nor held is published as in ticket 05; an attached session is not published on its own.
- [ ] Two existing events are never merged; the step reads only Source Posts, with no branch for a particular Source.
- [ ] Integration tests over HTTP cover each rule, the order, the flag, and that nothing is published before the step.
