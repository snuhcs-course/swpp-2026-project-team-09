# 03: Sources and Source Posts

**What to build:** A Global Event's post is stored as a Source Post keyed by (Source, key), so that a second Source can be collected and one event can have posts from several Sources. SNU Now collection works as before. Spec: `../spec-collection.md`, "Storage: Sources and Source Posts".

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A Source Post has its Source, its key, its address and how it was attached (its own post, rule, AI, Administrator) with a reason; (Source, key) is unique.
- [ ] A migration moves every collected event's post number and address into a Source Post, discarded events included.
- [ ] The worker's question about stored posts and the Collection message carry the Source and the key; the Source enumeration gains extra.snu.
- [ ] A Global Event has a Publication Route (Administrator, rule, Judgement; empty for a Draft), set by the rules' publication and by an Administrator's.
- [ ] A Global Event has a flag that an Administrator must look at it.
- [ ] No DTO the app receives carries the Publication Route, the flag or the Source Posts' attachment.
- [ ] A discarded event's post is still not brought back by the next Collection.
- [ ] GLOSSARY and README are updated where they describe a collected event's post.
