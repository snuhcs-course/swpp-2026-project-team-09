# 03: Sources, Source Posts, and storing apart from publishing

**What to build:** A collected post is stored once as a Source Post keyed by (Source, key), with its numbered sessions each linked to a Global Event, and nothing collected is published inside the Collection's request: a step after the answer publishes what the rules read. SNU Now collection keeps publishing what it publishes today. Spec: `../spec-collection.md`, "Storage" and "Storing and publishing are apart".

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] A Source Post has its Source, its key (SNU Now `bbsidx`, extra.snu `dataSeq`) and its address; (Source, key) is unique.
- [ ] Each session of a post links to one Global Event, with its number, how it was attached and the reason; (Source Post, session number) is unique, and a Global Event can have links from several posts.
- [ ] A migration moves every collected event's post into a Source Post with one session linked to it, discarded events included, and fills the Publication Route of published events: Administrator when an Administrator created it, rule for a collected event at version 1, Administrator for a collected event at a later version.
- [ ] The worker's question about stored posts and the Collection message carry the Source and the key, and the message carries each post's sessions; the Source enumeration gains extra.snu.
- [ ] The Collection's request stores and answers only; a step after the answer publishes the sessions the rules read, with the Publication Route rule. The Publication Route is set to Administrator when an Administrator publishes.
- [ ] A Global Event has a flag that an Administrator must look at it.
- [ ] A setting turns automatic publication off; with it off, the step publishes nothing and every session stays a Draft.
- [ ] No DTO the app receives carries the Publication Route, the flag or the links.
- [ ] A discarded event's post is still not brought back by the next Collection.
- [ ] Integration tests over HTTP cover the above; GLOSSARY and README are updated where they describe a collected event's post.
