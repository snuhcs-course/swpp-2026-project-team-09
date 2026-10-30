# 11: Search ranking and nearby Places

**What to build:** Search words rank results instead of filtering them, the model sees more candidates, and a Quest search can ask for a Place and its surroundings, so that "공연" finds "콘서트" and "301동 근처" finds 302동. Spec: `../spec-chat.md`, "Search tools" and "Join if one exists".

**Blocked by:** 10

**Status:** ready-for-agent

- [ ] Candidates holding more of the search words come first, ties in start order, and the rest of the window fills the places left; no candidate is dropped for lacking a word.
- [ ] Searches return up to 30 candidates, with descriptions cut at 150 characters.
- [ ] The tool descriptions tell the model to give related words and to correct a typo in the User's question; the instructions say to search Quests without a Board when unsure of one, and to leave out only candidates that are clearly different.
- [ ] The Quest search takes a Place and a radius (about 300 m), computed from the Places' positions; a Quest whose place is only words is left out when a Place is given.
- [ ] Tests over HTTP with the scripted model cover ranking, the limits and the radius.
