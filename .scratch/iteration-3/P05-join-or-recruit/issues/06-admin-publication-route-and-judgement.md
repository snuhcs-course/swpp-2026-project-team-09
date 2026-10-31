# 06: Admin site: Publication Route and Judgement panel

**What to build:** Administrators see how each event was published, filter by it, and read a Judgement beside its post. Spec: `../spec-collection.md`, "Admin site".

**Blocked by:** 05

**Status:** ready-for-agent

- [ ] The events list shows each event's Publication Route and filters by it.
- [ ] The list and an event's page show the flag that an Administrator must look at it.
- [ ] An event's page shows its Judgement: each session's values, the quoted lines, each check passed or failed, the model and the time. *(If time runs short, this panel is cut; the column and filter stay.)*
- [ ] A Draft whose Judgement failed, or that was called no event, shows the AI's values beside the post, so that it can be published or discarded by hand.
- [ ] Cancelling an event a Judgement published works as for any other.
- [ ] Component tests cover the column, the filter and the panel.
