# 08: The same event posted twice

**What to build:** A new post that is the same event as an existing Global Event is attached to it as another Source Post instead of becoming a second event; what cannot be decided waits for an Administrator, who can also detach a mistake. Spec: `../spec-collection.md`, "The same event posted twice" and "Admin site". Cut first if time runs short.

**Blocked by:** 03, 05

**Status:** ready-for-agent

- [ ] After a new Source Post is stored and before its Judgement, it is compared with the Global Events of any Source whose start is within one day; a retried Draft is compared again at its retry.
- [ ] The step reads only Source Posts, with no branch for a particular Source; each Source's post address pattern is a setting of that Source.
- [ ] A rule attaches it when its body links the candidate's Source Post, or when the normalised titles and the starts are equal.
- [ ] A rule refuses a candidate whose start time differs, or that differs by 1차/2차, 대면/비대면 or role.
- [ ] For the candidates left, the AI chooses one or none, or is unsure.
- [ ] Unsure, several matches or a failed call leave the new post a Draft in the Administrator's queue with its candidates.
- [ ] Two existing events are never merged.
- [ ] An attached Source Post with another time than its published event flags the event and changes nothing.
- [ ] The admin site shows an event's Source Posts (Source, link, how attached, reason), a detach action that makes the post its own Draft again with the event's Quests left in place, and a queue page whose posts can be attached or published as their own.
- [ ] Tests over HTTP with the scripted model and admin component tests cover the above.
