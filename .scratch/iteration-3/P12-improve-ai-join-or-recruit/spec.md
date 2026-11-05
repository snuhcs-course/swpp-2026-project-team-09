# P12: Improve the AI behind 함께하기 (join or recruit): collection and chat

Status: ready-for-agent

Schedule row: Iteration 3, P12, the improvement task of P05. Owner: Jaehyun0320. Spec drafted 2026-11-05 from a grilling session. The decisions it rests on are in `../P05-join-or-recruit/references/P05-ai-redesign.md`, § "부록: P12 결정 (그릴링, 2026-11-05)"; the analysis behind them is the P05 AI failure analysis and the same document's §§ 1–4. Where they differ, this spec holds. ADR 0014 records why a session whose place fails is still compared. The before and after results go into P20.

The spec has two strands that share one measurement: **collection** (evaluations A and B: a Judgement's sessions and the same event posted twice) and **chat** (evaluations C and D: the Assistant finding and proposing Quests). No deadline is set; scope and verification are not cut for time.

## Problem Statement

**Collection.** Many events collected from SNU Now and extra.snu stay Drafts that an Administrator must publish by hand, even when the Judgement read them correctly:

- The server's time checks misread some ways of writing a time. A numbered list line `1. 11월 2일(월) 오후 4–6시` is read as 1월 11일. In `오후 4–6시` the 4 is not taken as an afternoon clock. Invisible characters (soft hyphen, zero-width space, byte-order mark) in a post make a quoted line fail to match the post.
- A place written without "서울대" is not taken as on the Gwanak campus unless it starts with a building number, so `행정관 앞 잔디광장` names no Place.
- Nothing checks that the post's other lines agree with the session's time, so widening what counts as a Place would publish wrong times (a table says 17:00, the body 19:00).

The same event posted on both Sources is seen twice by Users. In evaluation B, 25 of the 32 true pairs were never compared, because only a session the server would publish is compared, and most fail only the place checks. When a Judgement's answer breaks the schema, the eval keeps nothing of what the model wrote, so the cause cannot be found.

**Chat.** The Assistant sometimes fails a User who wants to join or start a Quest:

- When `proposeQuest` refuses a Quest with no Board, it tells the model to ask the User, though the activity already says which Board (`join-36`).
- After `resolvePlace` finds the Place, the model searches without it and gets Quests from anywhere (`join-31`).
- When Approval Quests are shown, the reply often does not say that the Leader must accept a request (J9 is below its floor).
- A search result gives no reason to keep or drop a candidate. The model drops Quests for an event that is already under way (E7). It shows cards that match none of the User's words (E1), or only some of the cards for a question about a time alone (E4).
- When a search has more than 30 candidates, `more: true` is all the model gets, so it cannot narrow the search (E9).

## Solution

**Collection.**

- The time checks read the list number, the `오전/오후 N–M시` range and invisible characters correctly.
- A place on a Source whose posts are about Gwanak is taken as on Gwanak unless the post marks it as elsewhere (연건, 시흥, 서울대병원, another university, another district, and so on).
- A common facility name preceded by another facility's name (`금나래문화체육센터 2층 체육관`) is not taken as the campus building.
- A new check, `timesConsistent`, keeps a session a Draft when another line of the post gives the same day a different start or end.
- The server reads each session's checks as three verdicts: whether it can be published, compared as the same event, or have its values filled into its Draft. A session that fails only the place checks or the length check is still compared with the events that exist. It is never published on its own. It is attached only on the narrow terms of ADR 0014, and otherwise waits in the Same-event queue.
- Evaluation B chooses the sessions it compares with the same function. The collection eval saves the raw text of a schema failure.

**Chat.**

- `proposeQuest`'s refusal for a missing Board tells the model to choose the Board from the activity.
- A search made without `placeId` after `resolvePlace` found one Place says so in its result.
- When the cards shown include an Approval Quest and the reply does not already explain it, the server adds one line saying the Leader accepts each request.
- Each search candidate says which of the User's words it matched (`matched`), whether it starts in the window or is already under way (`window`), and how one enters it (`join`). Two lines of the system prompt say how to use them.
- A search with more candidates than it returns counts them by Board, by day and by word (`narrowBy`).

The improvement is measured once, after every ticket is done, against a before set taken at the same starting point.

## User Stories

### Users seeing collected events

1. As a User, I want an event written as `1. 11월 2일(월) 오후 4–6시` to be published on 11월 2일 at 16:00–18:00, so that I see it without waiting for an Administrator.
2. As a User, I want an event whose post has an invisible character in its time line to be published like any other, so that a formatting accident does not hide it.
3. As a User, I want an event at `행정관 앞 잔디광장` or `906동 3층 세미나실` to be published at that Place, so that events on campus reach me even when the post does not say 서울대.
4. As a User, I want an event at `금나래문화체육센터 2층 체육관` never to be placed at 71동 체육관, so that I don't go to the wrong building.
5. As a User, I want an event at 연건, 시흥 or 서울대병원 never to be placed on the Gwanak campus, so that a Place on the map means Gwanak.
6. As a User, I want an event whose post gives two different times for the same day to stay unpublished until an Administrator decides, so that I never see a wrong time.
7. As a User, I want an event whose table says 14:00 and whose body says 오후 2시–4시 to be published at 14:00–16:00, so that a difference in how the time is written does not hold it back.
8. As a User, I want an event posted on both SNU Now and extra.snu to appear once, so that Users who go to it gather in one place.
9. As a User, I want two different events with similar titles never to be merged into one, so that I don't miss one of them.
10. As a User, I want an event posted on another Source with another time on the same day to stay a separate event or wait for an Administrator, so that a second round is not hidden behind the first.

### Administrators

11. As an Administrator, I want a session that names no Place but has the same title and start as an existing event to be attached to it without my help, so that the Same-event queue holds only real questions.
12. As an Administrator, I want a session that names no Place and that the AI only judged the same to wait in the Same-event queue unless its start is equal to the minute and one title holds the other, so that a wrong merge is rare.
13. As an Administrator, I want a session that is compared but not attached to stay a Draft in the queue with its candidates, so that I can attach it, publish it or discard it as today.
14. As an Administrator, I want to see `timesConsistent` among a Draft's checks by its name, so that I know why it was not published without a new screen.
15. As an Administrator, I want a session attached by mistake to be detachable as today, so that a wrong merge can be undone.
16. As an Administrator, I want nothing to be published that fails a check, so that ADR 0008 still holds.

### Users of the Assistant

17. As a User, I want to say "점심 같이 먹을 사람 모집해 줘" and get a 식사 Quest proposed without being asked which Board, so that recruiting takes one message.
18. As a User, I want the Assistant to be asked which Board only when the activity fits none of 식사, 진로, 취미 and 공연, so that the question is asked when it is needed.
19. As a User, I want a search for Quests "at 301동" to search at 301동 after the Assistant found that Place, so that I don't get Quests from all over the campus.
20. As a User, I want the reply to tell me that an Approval Quest needs the Leader's acceptance whenever one is among the cards, so that I know my request may wait.
21. As a User, I want that line not to be repeated when the Assistant already explained it, so that the reply does not say it twice.
22. As a User who writes in English, I want that line in English, so that the reply stays in my language.
23. As a User, I want a Quest for an exhibition that is already open to be shown when I ask what to do this afternoon, so that events under way are not left out.
24. As a User, I want cards that match none of my words to be left out unless their activity is clearly what I asked for, so that the cards I see are about what I asked.
25. As a User asking only about a time ("오늘 저녁에 뭐 있어?"), I want every Quest in that window shown, up to the card limit, so that I am not shown an arbitrary few.
26. As a User, I want a broad search with many results to be narrowed by Board, day or word rather than cut at 30, so that the Quest I meant is found.
27. As a User of the free-time and library features, I want their replies unchanged except for the Approval line where it applies, so that P12 does not break them.

### Developers and evaluators

28. As a developer, I want each time-parsing fix fixed by a unit test with the post line that failed, so that it does not come back.
29. As a developer, I want `금나래문화체육센터 2층 체육관` → no Place, `체육관` → 71동 and `906동 3층 세미나실` → 906동 fixed by tests before the campus default is widened, so that C3 stays 0.
30. As a developer, I want the three verdicts to come from one function of the checks, so that the publication step and evaluation B cannot drift apart.
31. As an evaluator, I want evaluation B to compare exactly the sessions the publication step compares, so that B measures what runs.
32. As an evaluator, I want the raw text of a schema-failing Judgement saved with the eval run, and never in the production log, so that I can diagnose a-005 and b-082 without leaking posts into logs.
33. As an evaluator, I want one before set and one after set taken from the same starting point, so that the table in P20 compares like with like.
34. As an evaluator, I want each ticket to state its target cases and expected result before it is implemented, so that the after run can be read per change even though it measures them together.
35. As an evaluator, I want the after run's report to say first that it breaks the metrics document's rule of one change per run, so that no reader takes its differences as one change's effect.
36. As an evaluator, I want AB-1 measured on its own by replaying saved Judgements, so that at least one change has an isolated, free measurement.
37. As an evaluator, I want true pairs that a refusal rule turned away after AB-3 listed in the after report, so that we know whether the refusal rules now cost recall.
38. As the budget holder, I want the runs approved by cost before they start, so that the spend stays near USD 9.

## Implementation Decisions

### Scope and order

The scope is the redesign's '중간' bundle: AB-1 to AB-4 and CD-1 to CD-4, as below. If something must be dropped, drop from the end of this order: AB-1, CD-1, CD-2, AB-3, AB-4, CD-3, CD-4, AB-2. `/to-tickets` may cut tickets differently from these eight. AB-4's campus default and `timesConsistent` merge in one PR even when they are split into tickets, because the wider campus default without the time check publishes wrong times (a-015, a-053).

### Collection

**AB-1: time parsing.**

- In the Judgement time reader, a list number at the start of a line (`1. `, `12. `) is not read as part of a date.
- In `오전 N–M시` and `오후 N–M시` (with `–`, `~` or `-`), N is a written clock with the same 오전 or 오후, so `hasTimeOfDay` and `timeAgrees` accept the start.
- The text normaliser that compares quoted lines with the post also removes U+00AD, U+200B and U+FEFF.
- Targets: a-058 session 6, a-064 session 1, a-029 sessions 1 and 2.

**AB-3: three verdicts.**

- A new function of a session's check results gives:
  - `publishable`: every check passes; this is today's `passed`, plus `timesConsistent` once AB-4 lands.
  - `comparable`: every check passes except `length`, `placeInLines` and `placeMatches`.
  - `draftable`: `linesInPost`, and either the time checks or the place checks.
  - `blockedBy`: the failing checks.
- The check list itself and the names the admin shows stay as they are.
- The publication step settles each session by its verdict:
  - publishable: compared and attached, held or published as today;
  - comparable only: compared, and attached only on ADR 0014's terms, otherwise held in the Same-event queue, never published;
  - draftable only: its read values fill its Draft;
  - none: written only, as today.
- ADR 0014's terms:
  - (a) the normalised titles and the starts are equal (the title rule that exists); or
  - (b) the AI answers `same`, the starts are equal to the minute, and one normalised title contains the other.
  - Normalised means `normalisedTitle`: NFKC, lower case, bracketed parts, spaces and punctuation removed.
- For a comparable-only session with no Place, the same-event AI is given the place as written.
- The refusal rules (another time on the same day, another round, in person against online, another role) apply to these sessions as to any other, unchanged.
- Evaluation B's same-event step calls the same verdict function instead of its own copy of the selection.
- The glossary's **Judgement** entry is updated in the same change, to say that a session that is not published may still be compared and attached. No new terms are added.

**AB-4: campus default and time consistency.**

- The Source setting `buildingNumberIsGwanak: boolean` becomes `campusDefault: 'gwanak' | null`. Both SNU Now and extra.snu are `'gwanak'`.
- With `'gwanak'`, a place with no `ELSEWHERE` marker is matched as on Gwanak, as if it carried 서울대학교. Today this is done only for a building number alone.
- `GENERIC_PLACE_NAMES` lists common facility names (체육관, 미술관, 도서관 and others). The list is drawn from the place lines of the stored posts and reviewed in the PR.
  - A generic name preceded on the same line by another facility's name is not matched: `금나래문화체육센터 2층 체육관` → no Place.
  - A generic name alone, with a floor or room at most, is matched to its campus building: `체육관`, `체육관 2층` → 71동.
- A new Judgement check, `timesConsistent`, runs over every line of the post that writes both a date and a time:
  - Lines with a time but no date, such as a programme's running order, are not compared.
  - A worker line numbered for a session (`[n회차] 기간: …`) is compared only with that session.
  - The check fails when a line for the session's day gives another start, or another end.
  - It does not fail when one line gives only a start and the other a start and an end; the session's end is then taken from the line that has one.
  - It does not fail when only the writing differs (`오후 2시` and `14:00`).
- `timesConsistent` enters `publishable` only, never `comparable`: a different time on the same day is already handled by the refusal rules.
- No notice to Administrators is built. The admin lists checks by the name the main server gives (`admin/README.md` § checks), so the new check appears there on its own.

**AB-2: raw failure text.**

- When a Judgement fails the schema, the collection eval runner saves the model's raw text with the run's other saved calls.
- The production publication step logs nothing new; post content stays out of logs.

### Chat

**CD-1: two contract fixes.**

- `proposeQuest`'s refusal for a missing Board changes from "Ask the User which" to telling the model to choose 식사, 진로, 취미 or 공연 from the activity, and to ask only when the activity fits none.
- When a recruiting or Global Event search is called without `placeId` in a message where `resolvePlace` already returned one Place, the result carries a note that `placeId` was not given.
- `resolvePlace` itself is unchanged.

**CD-2: the Approval line.**

- After the loop, the server adds one sentence to the reply when two things hold:
  - the cards shown include a Quest whose Join Policy is Approval;
  - the reply contains fewer than two of 승인, 수락 and 신청.
- The sentence is in Korean, along the lines of "승인제 파티는 참여 신청 후 방장이 수락하면 참여돼요." It is in English when the User's last message has no Hangul.
- It sits with the reply-text handling that already adds the fixed sentence for cards. It applies to every feature that shows Quest cards, not only join or recruit.
- The prompt is not changed for J9.

**CD-3: judgement fields and two picking lines.**

- Each candidate of `searchRecruitingQuests` and `searchGlobalEvents` gains three fields:
  - `matched`: the words of `words` found in its title or description. These come from the same expressions that rank by word count today, now also selected.
  - `window`: `starts` if it starts in the asked window, `underWay` if it began before the window and overlaps it.
  - `join`: `open` or `askToJoin`, from its Join Policy.
- Two lines are added to the chat rules:
  - a candidate that is `underWay` is in the window like one that `starts`;
  - with an activity asked, a candidate with no `matched` word is shown only when its title is clearly that activity.
- The prompt is not otherwise restructured.

**CD-4: `narrowBy`.**

- When a search has more candidates than it returns, the result keeps `more: true` and adds `total` and `narrowBy`:
  - counts by Board;
  - counts by day of the start, in the world's time zone;
  - counts by word of `words`.
- The counts are computed over the same filters as the search. No paging argument is added.

### Measurement

- **Starting point X.** X is `3.0/Main` with `3.0/P11-04-chat` (#204, head `4b2097cb`) merged locally.
  - Ticket branches stack on X. When #204 merges, Main is merged into them: no rebase, no force push.
  - A01 and P07 are not taken in until the after set is done.
  - If #204 changes in review, the difference is recorded. A PR opened before #204 merges says it contains P11's commits.
- **Before set.**
  - Chat only, run at X: C and D in the small and large worlds, and P19 three times (about USD 4.3).
  - Collection uses the saved `collection-held-out-*-464ea9c5` results, since no collection code has changed since that commit.
- **After set.**
  - Run once after every ticket is done: the same bundle, plus evaluations A and B, plus the P4 suite for CD-2's reach.
  - AB-1 is also measured alone by replaying saved Judgements, at no cost.
- **Per-change reading.**
  - Each ticket states its target cases and expected result before it is implemented.
  - After the run, an agent reads the targeted cases' traces and marks each change "as expected", "otherwise" or "cannot tell".
  - Movement in cases no change targeted is recorded as the bundle's effect.
  - The report opens by stating that it breaks rule 4.4.
- **Budget.** About USD 9 for before and after together. Cost is approved again before each run. One heavy job (build, tests, run) at a time.
- **Held-out cases.** They stay clean: rules and lists (the generic place names, the prompt lines) are general, never a case's own sentences or words.

## Testing Decisions

- **What makes a good test here.** It checks what the publication step settles, what a tool returns, or what the reply contains, for a given post or a scripted model. It does not check how a regex or a query is built. Test files are named by their level (ADR 0007).
- **Seams.** There is one seam per strand, the highest that exists.
  - **Collection: the publication step with a scripted Judgement** (prior art: the `judgement-*`, `same-event-*` and `publication-step` integration tests and the `judgements` and `same-event` fixtures). Given a post and a Judgement, the test checks what the step does with each session:
    - whether it is published, attached, held in the Same-event queue, or filled into its Draft;
    - which checks fail, by name.
    - ADR 0014's terms are tested at this seam: equal title and start attaches; AI `same` with an equal start and a contained title attaches; AI `same` with another minute, or titles that do not contain one another, holds; a different time on the same day is refused without asking the AI.
    - Unit tests are kept only where a single function's table of inputs is clearer: the time reader (AB-1's lines; prior art `judgement-time` and `judgement-checks` unit tests), the place matcher (the three fixed cases, the `ELSEWHERE` markers, generic names; prior art `named-place` unit test) and the verdict function's table.
  - **Chat: the Assistant over HTTP with the model scripted** (prior art: the `assistant-join-or-recruit`, `assistant-recruiting-quests`, `assistant-global-events` and `assistant-reply-text` integration tests). A scripted model calls the tools, and the test checks:
    - CD-1: the refusal text and the `placeId` note;
    - CD-3 and CD-4: the new fields and counts;
    - CD-2: the Approval line, which is added once, not added when the reply already has two of the words, in English for an English message, and absent when no Approval card is shown.
- **The eval harness's own tests** (prior art: the `eval-collection-*` unit tests). Evaluation B selects its sessions through the verdict function, and a schema failure's raw text is saved with the run.
- **Eval runs with the real model**, outside CI: the before and after sets as above.

## Out of Scope

- `follow-up-yes-after-menus`: the prompt rule fix is TaeHyun79's, in #204 and P20.
- The recruiting-only tool `findPartiesToJoin` (CD-5) and the decision-table rewrite of the system prompt (CD-6), so J10 and G1 are not expected to move.
- Moving the current time out of the system prompt (CD-7), and the `showQuests` `fromLastSearch`/`except` input (CD-8).
- The activity alias dictionary (CD-9) and search stages 1 and 2 (`pg_trgm`, embeddings). E9 is not expected to reach its target.
- `resolvePlace` returning `one` for an exact name, and the rule for `started` Quests of an event (`large-o-05`).
- The event definition in the Judgement instructions (AB-5, C6), the extra.snu tables outside the session list (AB-6), series (AB-7), and sending images to the Judgement.
- A01's move to the Anthropic API and prompt caching. P12 is measured on OpenRouter, as its before set.
- Any notice to Administrators about `timesConsistent` beyond its name in the check list.

## Further Notes

- **Expected direction, not promises.**
  - C1 may rise from 27/64 to about 35/64 with AB-1, and towards 40/64 with AB-4. C2 and C3 must stay 0.
  - D2 and D3 should move for the first time, since the 25 pairs lost before comparison reach it. D4 may rise with the held sessions and is tuned after this.
  - J9 should pass its floor deterministically. E4, E7 and E1 should improve partly, E9 slightly.
- **Verified while grilling.**
  - In the last evaluation B the refusal rules lost no true pair (D3 = D2 = 8/32); every miss happened before comparison.
  - The publication step skips the comparison when no Place is found for the session's `placeId`.
  - Evaluation B's same-event step selects with its own `passed && number !== null && start !== null`.
  - J9 passes per tagged case only when both card and reply checks pass.
- **Watch after AB-3.** More sessions now meet the refusal rules. The after report lists any true pair refused as another time on the same day.
- **Decision record.** ADR 0014 (0013 is reserved for A01). ADR 0008 still holds for publication.
