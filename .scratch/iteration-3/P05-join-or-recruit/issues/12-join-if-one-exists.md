# 12: Join if one exists, recruit if not

**What to build:** Asked to recruit, the Assistant first looks for a Quest the User could join and shows it with a question; only when none fits, or the User insists, does it propose a new one. R3 measures the change. Spec: `../spec-chat.md`, "Join if one exists".

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] The instructions say to search before proposing on a request to recruit, unless the User already asked for a new one in the conversation.
- [ ] Rules (i)–(viii) of the spec are in the instructions: unstated conditions not compared; an activity without a day searches the next seven days and a day without an activity searches every activity that day; ask only when both are missing; ±30 minutes and 아침 07–11, 점심 11–16, 저녁 17–22; a named Place through the radius; Open and Approval only; cards shown with the most Holders first; same meaning matches, look-alikes do not.
- [ ] "N명" asks for capacity N; a request naming a Global Event uses that event's Quests with no time or Place comparison.
- [ ] Found Quests are shown as the Boards' cards with a question; the Assistant never joins by itself and never says the User joined.
- [ ] With no match, the Proposal comes with a line that none was found; "그래도 새로 만들어 줘" gives a Proposal.
- [ ] P19's cases are not edited; the superseded ones listed at C0 are reported apart in the regression run.
- [ ] R3 is run (this change alone) in both worlds and recorded beside R2; P19's cases run three times on the same commit and are compared with their baseline.
