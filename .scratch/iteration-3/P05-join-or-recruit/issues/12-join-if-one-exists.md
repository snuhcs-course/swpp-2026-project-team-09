# 12: Join if one exists, recruit if not

**What to build:** Asked to recruit, the Assistant first looks for a Quest the User could join and shows it with a question; only when none fits, or the User insists, does it propose a new one. The bundled run of ticket 12a measures the change. Spec: `../spec-chat.md`, "Join if one exists".

**Blocked by:** 11

**Status:** ready-for-agent

- [x] The instructions say to search before proposing on a request to recruit, unless the User already asked for a new one in the conversation.
- [x] Rules (i)–(viii) of the spec are in the instructions: unstated conditions not compared; an activity without a day searches the next seven days and a day without an activity searches every activity that day; ask only when both are missing; ±30 minutes and 아침 07–11, 점심 11–16, 저녁 17–22; a named Place through the radius; Open and Approval only; cards shown with the most Holders first; same meaning matches, look-alikes do not.
- [x] "N명" asks for capacity N; a request naming a Global Event uses that event's Quests with no time or Place comparison.
- [x] Found Quests are shown as the Boards' cards with a question; the Assistant never joins by itself and never says the User joined.
- [x] With no match, the Proposal comes with a line that none was found; "그래도 새로 만들어 줘" gives a Proposal.
- [x] P19's cases are not edited; the superseded ones listed at C0 are reported apart in the bundled run.
- [x] This ticket has no full evaluation run of its own (P05 owner, 2026-11-01). Its cases may be checked with `pnpm eval --case`, and the full run comes at the end of the bundle, in ticket 12a.

## Comments

### Decisions (2026-11-02)

- A plain "만들어 줘" searches first, as "모집해 줘" does; only a statement that the User wants a new one skips the search (P05 owner, 2026-11-02). The spec names only the second. Its aim is that Users do not end up in separate half-empty Quests, and a plain "만들어 줘" does not say the User has looked.
- A first message that already asks for a new one goes straight to `proposeQuest` with no search: the rule reads "in this conversation, this message included" (P05 owner, 2026-11-02, from #184's review). Read as earlier messages only, the old wording could search once against what the User said, and story 6 says the User is never forced into an existing Quest. It lands before R1, in the bundle, so R1 still compares with R0a.
- `searchRecruitingQuests`'s `radius` is at most 3,000 m: 3,000 is taken, and more is refused back to the model by the input schema (P05 owner, from #168's review). A huge value turned the Place filter off without any sign.
- A `placeId` that names no Place still answers "none", with the reason "There is no such Place." (P05 owner, from #168's review). The old reason said "within 300 m of that Place", which told the model nothing near a Place that is not there. The wording for a Place with nothing around it is unchanged. The server asks whether the Place exists only after an empty result, through `PlacesService.exists`, so a search that finds Quests costs no extra query.
- ADR 0005's sentence now says that search narrows by fixed conditions, the server ranks what is left by the search words, and the model picks from those candidates (P05 owner, from #168's review). Since ticket 11 the model no longer ranks what is left.
- NFD normalising and the event search's escaping tests, also suggested on #168, stay out of this ticket (P05 owner).
- The instructions' new User words: "찾지 말고 바로 열어 줘" and "이거 말고 새 파티로 열어 줘" for asking for a new one, and 플스, 플레이스테이션 and 플랭크 for same meaning and look-alike words. The spec's "그래도 새로 만들어 줘", "민턴", "배드민턴", "배민" and "4명" are not used, since words the model has seen in its prompt measure less in a case that holds them. Each new phrase was searched with `git grep -l -F` in `main-server/eval/` and has no hit; no case file was opened. A number of people is written "N명". The rule's values (07–11, 11–16, 17–22, ±30 minutes, 300 m) are the spec's.
- The rules stay in the chat's prompt, not in a fragment of ADR 0009's kind. They add no tool and change a rule the chat already has for recruiting, so they are no new capability.
- A request that points at an event card already shown takes the event's id from `[Cards shown: …]`, since `resolveGlobalEvent` matches titles and would answer "none" to such words. `searchRecruitingQuests`'s `globalEventId` description says so too.
- When nothing fits and `proposeQuest` refuses fields, the question for the fields also carries the line that none was found.
- Rule (v) has no instruction, since the server drops those Quests. Rule (iv) does, as the ticket lists it, although the search already returns only Open and Approval Quests.
- The most Holders first is the model's order for the cards, as rule (vi) says; the server still does not order by Holders. A scripted test can only show that `showQuests` keeps the order given, and that the model follows these rules is for ticket 12a's run to measure.
- The box on P19 stays open: no P19 case was edited, and reporting the superseded ones apart belongs to ticket 12a's bundled run.

### Agent usage (2026-11-02)

- Agent time: about 25 minutes (estimate), one session with two review subagents, summed from the transcripts with gaps capped at 5 minutes. Waiting for CI and people is capped the same way, so a little of it is counted.
- Tokens, subagents included: input 112, with 4,975,581 cache reads and 273,583 cache writes shown apart; output 61,591. Counted before this commit.
- No eval model calls.
