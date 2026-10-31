# 11: Search ranking and nearby Places

**What to build:** Search words rank results instead of filtering them, the model sees more candidates, and a Quest search can ask for a Place and its surroundings, so that "공연" finds "콘서트" and "301동 근처" finds 302동. Spec: `../spec-chat.md`, "A Quest's time and place" and "Search tools".

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] The Quest search gains a `words` input; in both searches, candidates holding more of the words come first, ties in start order, and the rest of the window fills the places left; no candidate is dropped for lacking a word, and the server does not order by Holders.
- [ ] Searches return up to 30 candidates, with descriptions cut at 150 characters.
- [ ] The tool descriptions tell the model to give related words and to correct a typo in the User's question; the instructions say to search Quests without a Board when unsure of one, and to leave out only candidates that are clearly different.
- [ ] The instructions say that a question naming neither 행사 nor 파티 ("뮤지컬 있어?") searches both Global Events and Quests, and that a question about an event's Quests ("그 행사 파티 있어?") also takes Quests with no Global Event for the same activity within the event's span. The cases `search-l-02`, `search-l-06`, `search-t1-07` and `join-17` measure it.
- [ ] The Quest search takes a Place and a radius (about 300 m), measured between positions: a Place's, a point's, or a Global Event's for a Quest attending one. A Quest with words only is left out when a Place is given.
- [ ] Integration tests with the scripted model cover ranking, the limits and the radius; the large world's server recall test passes for the cases this ticket enables.
- [ ] R2 is run (this change alone) in both worlds and recorded beside R1.
