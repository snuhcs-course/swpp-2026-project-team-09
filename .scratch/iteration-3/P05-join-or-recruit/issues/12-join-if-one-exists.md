# 12: Join if one exists, recruit if not, and R1

**What to build:** Asked to recruit, the Assistant first looks for a Quest the User could join and shows it with a question; only when none fits, or the User insists, does it propose a new one. Then R1 measures the change against R0. Spec: `../spec-chat.md`, "Join if one exists" and "Eval world and cases".

**Blocked by:** 11

**Status:** ready-for-agent

- [ ] The instructions say to search before proposing on a request to recruit, unless the User already asked for a new one in the conversation.
- [ ] Rules (i)–(viii) of the spec are in the instructions: unstated conditions not compared and seven days by default; ±30 minutes and 아침 07–11, 점심 11–16, 저녁 17–22; a named Place through the radius; Open and Approval only; Shared Quests held dropped; most Holders first; ask when the activity or day is missing; same meaning matches, look-alikes do not.
- [ ] "N명" asks for capacity N; a request naming a Global Event uses that event's Quests with no time or Place comparison.
- [ ] Found Quests are shown as the Boards' cards with a question; the Assistant never joins by itself.
- [ ] With no match, the Proposal comes with a line that none was found.
- [ ] The existing cases change: `making-parties-for-event` expects a join offer, the recruiting cases allow the search first, `ask-missing-fields-in-one-question` follows rules (i) and (vii).
- [ ] R1 is run on the finished code in both the small and the large world and recorded beside each R0, with the comparison rules of the metrics document and a failure analysis.
