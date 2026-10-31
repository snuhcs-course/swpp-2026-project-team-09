# 07: Events over a period

**What to build:** An event that runs over several days, such as an exhibition open until 11-30, is published by a Judgement, and its card reads "11월 30일까지". Spec: `../spec-collection.md`, "Judgement" and "App". Cut second if time runs short.

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] The Judgement's schema says whether a session runs over a period.
- [ ] Such a session passes the length check only when its quoted line holds both its first and its last day; every other check still applies.
- [ ] The app shows an event spanning several days as "M월 D일까지" in place of its day and hours; no DTO gains a field.
- [ ] Tests over HTTP cover a period published and one refused; the card is checked on a phone and noted in this ticket.
