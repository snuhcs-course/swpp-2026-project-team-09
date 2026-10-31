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
9. As a User, I want only what I said to be compared: no Place unless I named one, the next seven days from today when I gave an activity and no day, and every activity when I gave a day and no activity, so that conditions I did not state do not hide Quests.
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
27. As a User, I want Quests that already started never to be returned, except Quests for an event still under way, so that every Quest shown is one I can still go to.
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
37. As a User, I want Quests I already asked to join not to be offered again, so that I am not offered what the app refuses.
38. As a team member, I want P19's cases left as they are and run before and after, so that this work is shown not to make the rest of the chat worse.

## Implementation Decisions

### A Quest's time and place

- A Quest's start is its first Sub Quest's start. For a Sub Quest attending a Global Event, its time and place are the event's as it is now: it stores neither, so every filter reads them from the event.
- A Quest for a Global Event is treated as its event: it is in a window when the event's span overlaps it, and it is returned until the event ends, so that the Quests of an exhibition running for weeks stay findable. Any other Quest is in a window when its start is in it, and is never returned once its start has passed.
- A Quest's position, for distances, is its first Sub Quest's: a Place's position, a point on the map, or its Global Event's position. A Quest has words only when its first Sub Quest has none of these.

### Search tools

- Both search tools take `after` and `before`, each a date with a time of day in Asia/Seoul, alongside today's days. With only `after`, the window ends at 23:59 of that day. With only a day, the window is the whole day.
- An event is in the window when its span overlaps it. An event without an end is taken to last until the end of its start's day, as today.
- The Quest search drops, always: Full Quests; Quests out of time as above; Quests for a Global Event for which the reader holds a Shared Quest; and Quests the reader has already asked to join and is waiting on.
- The Quest search takes, besides its present inputs, `words`, an optional fewest places left (`minPlacesLeft`, default one), an optional exact capacity, and an optional Place with a radius (about 300 m), measured between positions; a Quest with words only is left out when a Place is given.
- Every filter runs in the database query, before the list is cut, rather than over every recruiting Quest read into memory, so that a search stays quick with a thousand Quests. Searches return up to 30 candidates instead of 20, with descriptions cut at 150 characters.
- The server's order: search words rank the results instead of filtering them. Candidates that hold more of the words come first, ties in start order, and the rest of the window fills the places left. The server does not order by Holders.
- The tool descriptions tell the model to give related words (공연 → 콘서트, 음악회, 연주회, 뮤지컬) and to correct a typo in the User's question. The instructions tell it to search Quests without a Board when it is not sure of one, and, when choosing among candidates, to leave out only those that are clearly different.
- Each Quest in a result keeps its places left, its Join Policy and its number of Holders.

### Join if one exists

- The Assistant's instructions say: on a request to recruit, search for Quests first, with the rules below, unless the User has already said to make a new one in this conversation.
- Rules:
  - (i) Compare only what the User stated. With an activity and no day, the next seven days from today; with a day and no activity, every activity that day.
  - (ii) A named time is ±30 minutes; 아침 07–11, 점심 11–16, 저녁 17–22.
  - (iii) A named Place matches Quests at that Place or within about 300 m, through the search's radius; a Quest with words only is left out.
  - (iv) Only Open and Approval Quests.
  - (v) Quests for an event of which the reader holds a Shared Quest, and Quests the reader already asked to join, are dropped by the server; telling the User they already go is not part of this spec.
  - (vi) When several fit, the Assistant shows them with the most Holders first. This is the order of the cards it shows, not the server's order.
  - (vii) With neither an activity nor a day, ask. With no match, say so and propose.
  - (viii) Same meaning matches, look-alike words do not.
- A number of people the User names is the capacity with the User: "4명" asks for capacity four.
- When the request names a Global Event, the candidates are that event's Quests, with no time or Place comparison.
- The Assistant never joins a Quest itself. It shows cards with the existing card buttons and asks.
- Making a new Quest is the existing Proposal, unchanged, with a line that none was found.

### The P05 eval suite

- A P05 suite sits beside P19's in the existing harness, as P04's does: its own case directory, its own small world and its own default clock. P19's directory, world, cases and pinned counts are not touched.
- The small world holds what evaluation C and most of D need: Quests the asker holds, Quests led by others, a Full Quest, a Quest already started, a Quest for an event under way, a Quest the asker already asked to join, Quests at a nearby Place, a Quest with words only, a Shared Quest the asker holds for an event, the typo and synonym posts, and Quests on another Board than the obvious one.
- A large world serves evaluation D at scale: about 1,000 Quests and a few hundred Global Events generated from attributes with a fixed seed, with titles varied by checked wordings, hand-made traps on top, and each case's expected cards computed from the attributes once and stored. It is committed as a versioned data file (`large-world-v1`) read through its own loader; changing it or its answers makes a new version. A case names the world it runs in. Both worlds exist only in the database container of a run.
- A reply shows at most 20 cards, so no case expects more than 20.
- P19 cases whose expected answer this work changes (`making-parties-for-event`, the recruiting cases that now search first, `ask-missing-fields-in-one-question`) are listed at C0 as superseded, with the P05 case that holds the new answer. They are not edited. P19's cases run three times before and after the work as a regression check, and the superseded ones are reported apart.
- Scoring adds card-level micro precision and recall per subset, and the mean over cases beside it. New subsets cover the conditions above: N (capacity), R (nearby Place), O (an event under way); H covers started Quests, `after` alone and the parts of the day.

### Metrics (first tickets)

- The cases, both worlds, the labels and every threshold of evaluations C and D in `iter3-p5 메트릭.md` are committed before the first run, as C0, and R0 runs on the code before this work. Every later run changes one thing: R1 after ticket 10, R2 after 11, R3 after 12.
- The small world's answers are drafted, as P04's are, by an agent in a separate session that sees only the rules above, the world and the case, never the Assistant's prompts, tools or code. The P05 owner reviews every draft and records each change with its reason. A second labeller labels an overlapping part from scratch, without the drafts, and the agreement is reported. The large world's answers are computed, and only its wordings are checked by a person.

## Testing Decisions

- A good test checks what the tool returns for a call, or what the Assistant's reply contains for a scripted model, not how the query is built. A condition added to a search never adds a result: its results are a subset of the search without it. Test files are named by their level (ADR 0007): `.unit.test.ts` or `.integration.test.ts`.
- **Assistant over HTTP with the model scripted** (prior art: the `assistant-global-events` and `assistant-recruiting-quests` integration tests and the scripted model): a scripted model calls a tool with given inputs, and the test checks the tool's result: the window by overlap and the end-of-day default, Quests by start, Quests for an event kept until it ends, started, Full and already requested Quests dropped, `minPlacesLeft` and capacity, Shared Quests held, the radius and words-only Quests, the Global Event's time and place read for attending Sub Quests, 30 candidates and 150 characters, words ranking but not filtering.
- **The eval harness's own tests** (prior art: the `eval-*` unit and integration tests) cover the suite, both worlds, the loader, the new checks and the scorer.
- **The large world without a model**, in CI: the search tools called with each case's intended inputs return every expected card (server recall). It lands with ticket 10, which makes it pass; until then the cases it needs are marked as expected to fail.
- **Eval cases with the real model**, outside CI: evaluations C and D in both worlds, R0 to R3, recorded as the metrics document's section 4 says.

## Out of Scope

- Telling a User that they already go to an event (rule v's message).
- Search stages 1 and 2 (pg_trgm, keyword groups and RRF; embeddings), which are Iteration 4 candidates.
- The Assistant joining a Quest by itself.
- Events' capacity and application deadlines.
- Changing the Boards or the Events tab.

## Further Notes

- The Quest search's start rule (first Sub Quest) applies to the Assistant's tools only. The Boards keep listing Quests with any Sub Quest ahead.
- Excluding Quests the reader already asked to join matches P04's story 19.
- The Full and started filters are the same code the join search uses, so the time and room work comes first.
- Typos in posts are caught only while the misspelt Quest or event is among the 30 candidates. When a window holds more than 30, one whose words do not rank it in is cut, so evaluation D reports E3 per world; stage 1 addresses that.
