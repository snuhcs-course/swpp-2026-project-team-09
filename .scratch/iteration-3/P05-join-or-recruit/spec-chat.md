# P05 (chat): join if one exists, recruit if not, and searching by time and room

Status: ready-for-agent

References: `references/iter3-p5 메트릭.md` holds the metrics (evaluations C and D). This spec comes from a grilling on 2026-10-30 and 10-31 over the P05 pre-research, plan and search stages, which are not in the repository; it holds wherever they differ. Of the search stages, stage 0 is in this spec; stages 1 and 2 are listed under Out of Scope. The Assistant is described in `.scratch/iteration-2/P07-ai-activity-chat/spec.md` and ADR 0005.

## Problem Statement

A User who asks the Assistant "내일 저녁 공연 같이 갈 사람 모집해 줘" gets a Proposal for a new Quest at once, even when an Open Quest for the same thing at the same time already has room. Users end up in separate half-empty Quests instead of together.

When a User asks for "11/2 17:00 이후" events or Quests, the search tools take only days. They return the whole day sorted by start and cut at twenty, so on a busy day the evening ones, which the User asked for, are the ones cut. The Quest search also returns Full Quests and Quests that already started, which take places in the twenty and which the model must notice by itself. Search words act as a filter, so a post that says "콘서트" is missed when the User asks for "공연", and a post with a typo is missed altogether.

## Solution

When a User asks the Assistant to recruit for something, it first looks for a recruiting Quest the User could join: the same activity, on the same day, at a close time, at the same or a nearby Place if the User named one, with room left. If it finds some, it shows them as cards and asks whether the User wants to join one; the User joins from the card as on the Boards. If it finds none, or the User says to make a new one anyway, it makes a Proposal as it does today, saying that none was found.

The search tools take a time window. The server keeps only what overlaps it, drops Full Quests and Quests that already started, and drops what the User cannot enter, before the list is cut. Search words rank the results instead of filtering them, so the model sees close matches too and picks from more candidates.

Words: a **Full** Quest has as many Holders as its capacity. A Quest's start is its first Sub Quest's start. "파티" in this spec, as on the screens, means an Open or Approval Quest, not a Party.

## User Stories

### Join if one exists, recruit if not

1. As a User, I want the Assistant to look for a Quest I could join before it proposes a new one, so that I end up with people already going.
2. As a User, I want the Quests it found to be shown as the Boards' cards with a question whether I want to join, so that I decide.
3. As a User, I want to join from the card, as on the Boards, so that nothing happens until I press it.
4. As a User, I want an Approval Quest's card to send a request to join, so that its Leader still decides.
5. As a User, I want a Proposal for a new Quest when none fits, with a line saying none was found, so that I know it looked.
6. As a User, I want to say "그래도 새로 만들어 줘" and get a Proposal, so that I am never forced into an existing Quest.
7. As a User, I want only Quests for the same activity, so that "공연 보러 갈 사람" never shows a dinner Quest at the same time.
8. As a User, I want words of the same meaning to count as the same activity ("민턴" and "배드민턴") and words that only look alike not to ("배민" and "배드민턴"), so that matching follows meaning.
9. As a User, I want only what I said to be compared: no Place unless I named one, and the next seven days from today when I gave no day, so that conditions I did not state do not hide Quests.
10. As a User, I want a time I named to match Quests starting within 30 minutes of it, so that "7시" finds a 7:20 Quest.
11. As a User, I want "아침", "점심" and "저녁" to mean 07–11, 11–16 and 17–22, so that a part of the day finds the Quests in it.
12. As a User, I want a Place I named to match Quests at that Place or a nearby one, so that "301동 근처" finds one at 302동.
13. As a User, I want a Quest whose place is only words, with no Place, not to be offered when I named a Place, so that I am not sent somewhere unknown.
14. As a User, I want "4명 모집해 줘" to mean four people with me, and to be offered only Quests whose capacity is four with room left, so that the group is the size I asked for.
15. As a User, I want "모집해 줘" without a number to be matched against Quests of any capacity with room left.
16. As a User, I want only Open and Approval Quests to be offered, so that I am never offered a 비공개 파티.
17. As a User who already holds a Shared Quest for a Global Event, I want not to be offered another Quest for that event, so that I am not offered what the app refuses.
18. As a User, I want the Quests with the most Holders first when several fit, so that I join the liveliest one.
19. As a User, I want the Assistant to ask for the activity or the day when I gave neither, and to offer to make one when nothing fits, so that it never guesses.
20. As a User who asks to recruit for a Global Event ("이 공연 같이 갈 사람 모집해 줘"), I want the Quests for that event offered, whatever their time and place, so that I join those going to it.
21. As a User who was just shown an event's card, I want to ask "그 행사 파티 있어?" and get that event's Quests, so that a follow-up works.

### Searching by time and room

22. As a User, I want "11/2 17:00 이후 행사" to return the events from 17:00 to the end of that day, so that the evening ones are not cut.
23. As a User, I want an event that is under way in the window I asked for, such as an exhibition running all week, to be included, so that ongoing events are found.
24. As a User, I want "17시 이후 파티" to return Quests starting from 17:00 to the end of that day.
25. As a User, I want to give both ends ("11/2 15–18시"), so that I can ask for any window.
26. As a User, I want Full Quests never to be returned, so that every Quest shown has room.
27. As a User, I want Quests that already started never to be returned, so that every Quest shown is one I can still go to.
28. As a User, I want "2자리 이상 남은 파티" to return only Quests with at least two places left, so that my friend and I can join together.
29. As a User, I want each Quest shown to say how many places are left and whether it is 바로 참여 or 승인제, as now.
30. As a User, I want "공연" to find posts that say "콘서트" or "버스킹", so that wording does not hide events.
31. As a User, I want a Quest posted with a typo ("콘서드 가실 분") still to be found, so that a typo does not hide it.
32. As a User, I want a typo in my own question to be understood, so that I need not retype it.
33. As a User, I want the Assistant to say plainly when nothing matches, so that I am not shown wrong cards.

### The team

34. As a team member, I want what the server can decide (time, room, started, Shared Quests held) decided by the server before the list is cut, so that the model gets fewer and better candidates and the result does not depend on the model noticing.
35. As a team member, I want the behaviour measured on fixed cases before and after the change (R0, R1), so that we can show it got better.
36. As a team member, I want CI tests that need no model, so that CI stays deterministic.

## Implementation Decisions

### Search tools

- Both search tools take `after` and `before`, each a date with a time of day in Asia/Seoul, alongside today's days. With only `after`, the window ends at 23:59 of that day. With only a day, the window is the whole day.
- An event is in the window when its span overlaps it. An event without an end is taken to last until the end of its start's day, as today.
- A Quest is in the window when its start (its first Sub Quest's start) is in it. A Quest whose start has passed is never returned, by either tool or the join search.
- The Quest search drops Full Quests always. It takes an optional fewest places left (`minPlacesLeft`, default one) and an optional exact capacity.
- The Quest search drops, for the reader, the Quests for a Global Event for which the reader holds a Shared Quest.
- Every filter runs before the list is cut, in the database query rather than over every recruiting Quest read into memory, so that a search stays quick with a thousand Quests. Searches return up to 30 candidates instead of 20, with descriptions cut at 150 characters.
- Search words rank the results instead of filtering them: candidates that hold more of the words come first, ties in start order, and the rest of the window fills the places left. The tool descriptions tell the model to give related words (공연 → 콘서트, 음악회, 연주회, 뮤지컬) and to correct a typo in the User's question.
- The instructions tell the model to search Quests without a Board when it is not sure of one, and, when choosing among candidates, to leave out only those that are clearly different.
- Each Quest in a result keeps its places left and its Join Policy.

### Join if one exists

- The Assistant's instructions say: on a request to recruit, search for Quests first, with the rules below, unless the User has already said to make a new one in this conversation.
- Rules: (i) compare only what the User stated; without a day, the next seven days from today. (ii) A named time is ±30 minutes; 아침 07–11, 점심 11–16, 저녁 17–22. (iii) A named Place matches Quests at that Place or at a Place within about 300 m, which the server computes from the Places' positions; a Quest whose place is only words is left out. (iv) Only Open and Approval Quests. (v) Quests for an event of which the reader holds a Shared Quest are dropped; telling the User they already go is not part of this spec. (vi) Several matches are shown with the most Holders first. (vii) Without an activity or a day, ask; with no match, say so and propose. (viii) Same meaning matches, look-alike words do not.
- A number of people the User names is the capacity with the User: "4명" asks for capacity four.
- When the request names a Global Event, the candidates are that event's Quests, with no time or Place comparison.
- The Place comparison is a new input of the Quest search (a Place and a radius) rather than a separate tool.
- The Assistant never joins a Quest itself. It shows cards with the existing card buttons and asks.
- Making a new Quest is the existing Proposal, unchanged, with a line that none was found.

### Eval world and cases

- The eval world gains Quests the asker holds, Quests led by others, a Full Quest, a Quest already started, Quests at a nearby Place and a Quest whose place is only words, a Shared Quest the asker holds for an event, and the typo and synonym posts that evaluation D needs. These changes go in one list with the P04–P07 world changes and are frozen on one day.
- A second, large world serves evaluation D at scale: about 1,000 Quests and a few hundred Global Events generated from attributes with a fixed seed, with titles varied by checked wordings, hand-made traps on top, and each case's expected cards computed from the attributes. A case names the world it runs in; the existing cases keep the small world. Both worlds exist only in the database container of a run. The large world is generated once and committed as a versioned data file (`large-world-v1`) with each case's expected cards, so that the same world and answers serve every later change to the Assistant; changing either makes a new version.
- Scoring adds card-level micro precision and recall per subset. New subsets cover the conditions above: N (capacity), R (nearby Place), O (an event under way); H covers started Quests, `after` alone and the parts of the day. Each search subset has at least five cases.
- Existing cases change: `making-parties-for-event` now expects a join offer; the recruiting cases allow the search before the Proposal; `ask-missing-fields-in-one-question` follows rules (i) and (vii); the fixed test of the Full `아침 러닝 크루` with `"placesLeft":0` changes now that Full Quests are not returned.

### Metrics (first ticket)

- The fixed cases and thresholds of evaluations C and D in `iter3-p5 메트릭.md` are committed before the first run, as C0, and R0 is run on the code before this work. J3a's Full Quest trap moves to the server-filtered traps (J3b), since the server now drops Full Quests. One labeller (the P05 owner); a second is pending the team.

## Testing Decisions

- A good test checks what the tool returns for a call, or what the Assistant's reply contains for a scripted model, not how the query is built. A condition added to a search never adds a result: its results are a subset of the search without it.
- **Assistant over HTTP with the model scripted** (prior art: `assistant-global-events`, `assistant-recruiting-quests` e2e specs and `test/scripted-model.ts`): a scripted model calls a tool with given inputs, and the test checks the tool's result: the window by overlap and the end-of-day default, Quests by start, started and Full Quests dropped, `minPlacesLeft` and capacity, Shared Quests held, the Place radius and words-only places, ordering by Holders, 30 candidates and 150 characters, words ranking but not filtering.
- **The eval harness's own tests** (prior art: `eval-*.e2e-spec.ts`) cover any new check or world shape.
- **The large world without a model**, in CI: the search tools called with each case's intended inputs return every expected card (server recall).
- **Eval cases with the real model**, outside CI: evaluations C and D, run as R0 before this work and R1 after it, recorded as the metrics document's section 4 says.

## Out of Scope

- Telling a User that they already go to an event (rule v's message).
- Search stages 1 and 2 (pg_trgm, keyword groups and RRF; embeddings), which are Iteration 4 candidates.
- The Assistant joining a Quest by itself.
- Events' capacity and application deadlines.
- Changing the Boards or the Events tab.

## Further Notes

- The Quest search's start rule (first Sub Quest) applies to the Assistant's tools only. The Boards keep listing Quests with any Sub Quest ahead.
- The Full and started filters are the same code the join search uses, so the time and room work comes first.
- Typos in posts are caught for Quests (the model reads their titles among the candidates) but not for events whose words do not rank them into the 30; stage 1 addresses that.
