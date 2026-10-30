# P05 (collection): a second Source, Judgements and the same event posted twice

Status: ready-for-agent

References: `references/iter3-p5 메트릭.md` holds the metrics (evaluations A and B). This spec comes from a grilling on 2026-10-30 and 10-31 over the P05 pre-research and plan, which are not in the repository; it holds wherever they differ. ADR 0008 records why a Judgement publishes only what the server checks.

## Problem Statement

Users see only the Global Events the worker reads from one Source, the SNU Now events board, and only those whose time and place the collection rules could read. Many school events are posted only on extra.snu (비교과), the university's programme site, so Users never see them. Of the posts that are collected, many stay Drafts because their time line is written in a way the rules do not read, their place is only a building number, or the event runs over a period ("상시"). An Administrator must open each Draft, read the post and publish it by hand, and in practice most stay unpublished. Once a second Source is collected, the same event will often arrive twice, once as an SNU Now notice and once as an extra.snu programme, and Users would see it twice and gather for it in two separate places.

## Solution

The worker collects extra.snu as a second Source, one Global Event for each session of a programme.

When the rules leave a collected post a Draft, the main server asks the AI for a Judgement: for each session, its time and place and the lines of the post it read them from. The server checks every value against the post, and publishes the sessions that pass every check. Anything that fails, and anything the AI could not answer, stays a Draft for an Administrator, who sees the AI's values, the lines and the checks that failed. Events that run over a period are published too, and their cards read "11월 30일까지".

When a new post is the same event as a Global Event that already exists, from either Source, the new post is attached to that event as another Source Post instead of becoming a second event. The rules attach the obvious pairs and refuse the impossible ones; the AI decides between the remaining candidates. When it is unsure, the new post stays a Draft in an Administrator's queue. An Administrator can detach a Source Post that was attached by mistake.

Administrators see, for every published Global Event, its Publication Route (an Administrator, the rules or a Judgement), and can filter by it. Users never see it.

Words: a **Source Post** is one post on a Source that a Global Event was read from; a Global Event can have several. A **Judgement** is the AI's reading of a Draft. The **Publication Route** is how an event came to be published. See `GLOSSARY.md`.

## User Stories

### Users

1. As a User, I want to see extra.snu programmes on the Events tab and the map, so that I can find school events that are not posted on SNU Now.
2. As a User, I want each session of a multi-session programme to be its own Global Event, so that I can find companions for the session I will attend.
3. As a User, I want events whose time line the rules could not read to appear once the AI has read them, so that I do not miss events because of how a notice was written.
4. As a User, I want an event that SNU Now and extra.snu both posted to appear once, so that I do not see it twice or gather for it in two different Quests.
5. As a User, I want an event that runs over a period, such as an exhibition open until 11-30, to appear with "11월 30일까지" on its card, so that I know I can go any day until then.
6. As a User, I want the time and place of an event the AI published to be as correct as one an Administrator published, so that I can trust every card the same way.
7. As a User, I want no sign on a card of how it was published, so that the app stays simple.
8. As a User, I want the Assistant to find extra.snu events too, so that a search covers every Source.
9. As a User, I want an event whose Source Post was later found to be a different event to keep its own Quests, so that a mistake by the AI does not move my plans to another event.

### Administrators

10. As an Administrator, I want each published Global Event to show its Publication Route, so that I know which ones nobody on the team has looked at.
11. As an Administrator, I want to filter the events list by Publication Route, so that I can review what Judgements published.
12. As an Administrator, I want to see a Judgement's values for each session, the lines of the post they came from and the checks that passed or failed, so that I can see why a Draft was or was not published.
13. As an Administrator, I want to see the model and the time of a Judgement, so that I can tell which run made it.
14. As an Administrator, I want a Draft whose Judgement failed to stay a Draft with the AI's values shown beside the post, so that publishing it by hand takes one look.
15. As an Administrator, I want a Judgement that could not be made (a model error, a timeout, a malformed answer) to publish nothing, so that an outage never shows Users guessed times.
16. As an Administrator, I want a failed Judgement to be tried once more at the next Collection, so that a passing outage does not leave Drafts unread.
17. As an Administrator, I want a Draft I changed never to be judged, so that the AI never overrides my work.
18. As an Administrator, I want to see every Source Post of a Global Event with its Source, its link and how it was attached, so that I can check that they are the same event.
19. As an Administrator, I want a queue of new posts the system could not decide about (unsure, several candidates, a failed call), each with its candidates, so that I can attach it, or publish it as its own event.
20. As an Administrator, I want to detach a Source Post that was attached by mistake, so that it becomes its own Draft again.
21. As an Administrator, I want to be told when a Source Post attached to a published event gives another time, so that I can decide which is right, rather than the system changing a published event.
22. As an Administrator, I want an extra.snu programme that needs a sign-in to be skipped and counted, so that I know how many the worker could not read without treating it as a failed Collection.
23. As an Administrator, I want the Collection status of extra.snu to appear beside the other Sources, so that I can see when it last succeeded or failed.
24. As an Administrator, I want to cancel an event a Judgement published the way I cancel any other, so that I need no new action for it.

### The team

25. As a team member, I want the AI's precision on a fixed, committed set of posts to be measured before and after each change, so that we can show that a change made it better.
26. As a team member, I want e-mail addresses and phone numbers in a post masked before it is sent to the model provider, so that we send less personal data.
27. As a team member, I want the worker to read extra.snu slowly (one detail page every two seconds, the first four list pages, twice a day), so that we do not burden the university's site.
28. As a team member, I want the existing SNU Now events to keep working after the storage changes, so that the migration loses nothing.
29. As a team member, I want Judgements to be one step that can be run over a given Draft, so that we can later run it over the Drafts already stored.
30. As a team member, I want tests to run without a model, so that CI stays deterministic and free.

## Implementation Decisions

### Storage: Sources and Source Posts

- Judgements and the same-event step read only a post's title, text and Source, so that a later Source needs only its own collector. What differs by Source is a setting of that Source, not a branch in their code: whether a building number alone is taken as Gwanak, and the address pattern by which a body's link names one of its posts.

- A Global Event's link to its post moves out of the event into a **Source Post** table: Source, the post's key on that Source, its address, how it was attached (the event's own post, by a rule, by the AI, by an Administrator) and, when attached, the reason (the rule's name, or the AI's choice). A Source Post's (Source, key) is unique. A Global Event has zero (created by an Administrator) or more Source Posts.
- Keys: an SNU Now post's key is its `bbsidx`; an extra.snu session's key is the programme's `dataSeq` and the session's number.
- A migration moves every existing collected event's post number and address into a Source Post. Discarded events keep their Source Posts so that the next Collection does not bring them back.
- The worker's question "which of these posts are stored?" and the Collection message carry the Source and the key in place of the post number. The Source enumeration gains extra.snu.
- A Global Event gains its Publication Route (Administrator, rule, Judgement; empty for a Draft) and a flag that an Administrator must look at it (a Source Post that gives another time). Neither is in any DTO the app receives.

### extra.snu collection (worker)

- A new collector reads extra.snu's list and detail pages. The detail page sits behind a waiting-room script, so it is opened with a headless browser (Playwright). Opening pages sits behind an interface so that the parser is tested on saved pages.
- It reads the list's first four pages, opens one detail page every two seconds, and runs twice a day, apart from the SNU Now schedule (four times a day).
- A programme whose detail page redirects to the SSO sign-in is skipped and counted in the Collection's result; it is not a failure.
- Each session of a programme becomes one collected event, with the session's time and place from the page's structured fields. The programme's description and application period go into the description.
- The worker's container image gains a browser; its memory limit is raised to fit it.
- `robots.txt` and the site's terms are checked before the first Production Collection and noted in the ticket.

### Judgement (main server)

- Runs in the main server, after the Collection's message is stored and answered, never within the request: the worker waits only five seconds.
- A collected event the rules leave a Draft is judged once. If the Judgement could not be made (an error, a timeout, a malformed answer) it is tried once more at the next Collection of its Source, and then not again. A Draft an Administrator has changed is never judged.
- The model is the Assistant's model (Haiku 5.5 through OpenRouter) with a fixed JSON schema. Its answer has, for each session, the start, the end, the place, whether it is an event at all, whether it runs over a period, and for each value the lines of the post it read it from.
- Before the post is sent, e-mail addresses and phone numbers starting with 0 are replaced by a mask. Dates and times do not match the masks. The checks compare the quoted lines with the masked text.
- The server checks each session, and publishes a session only if every check passes:
  - each quoted line is in the post;
  - the date, the weekday and the time agree with the quoted line;
  - the quoted line is not an application or registration period;
  - the start comes before the end;
  - a session lasts at most 24 hours, unless it is read as running over a period, in which case the quoted line must hold both its first and last day;
  - the place matches exactly one Place. On a school Source, a building number alone ("301동 117호") is taken as Gwanak; a place naming another campus is not matched.
- A post with several sessions becomes one Global Event per session that passes; the sessions that fail stay as one Draft.
- The Judgement is stored with the event: the values, the lines, each check and whether it passed, the model id and the time. Publishing by a Judgement sets the Publication Route to Judgement. Publishing tells the apps to refetch the published Global Events as any publication does.
- Running a Judgement is one service step over one Draft, so that a later script can run it over the stored Drafts. Running it over the Drafts stored before this work is not part of this spec.
- Hangsha's prompt rules (application and event periods apart, 오전/오후 carried to a later time, one session per time, only a confirmed place) may guide the prompt, but none of its code or prompt text is copied: it has no licence.

### The same event posted twice (main server)

- Runs after a new Source Post is stored, and before its Judgement. A Draft that fails and is retried is compared again at the retry, against the events that exist then.
- A new Source Post is only ever attached to an existing Global Event. Two existing events are never merged.
- Candidates: the Global Events, of any Source, whose start is within one day of the new post's.
- A rule attaches the new post when the post's body links the candidate's Source Post, or when the normalised titles are equal and the starts are equal.
- A rule refuses a candidate when the start times differ, when one is a 1차 and the other a 2차 session, when one is 대면 and the other 비대면, or when the roles differ.
- For the candidates left, the AI chooses one of them or none, or answers unsure.
- When the AI is unsure, when the new post matches several candidates, or when the call fails, the new post stays a Draft and enters the Administrator's queue with its candidates. It is not shown to Users, so nothing is lost by waiting.
- When an attached Source Post gives a time other than a published event's, the event is not changed; it is flagged for an Administrator.
- An Administrator can attach a queued post to a candidate, publish it as its own event, or detach an attached Source Post, which becomes its own Draft again. The Quests of the event stay with it.

### Admin site

- The events list gains a Publication Route column and a filter by it.
- An event's page shows its Source Posts (Source, link, how attached, reason) with a detach action, and its Judgement (each session's values, lines, checks, model, time).
- A queue page lists the undecided new posts with their candidates and the actions above.
- The flag of a differing time shows on the list and the page.

### App

- An event that runs over several days reads "M월 D일까지" in the place of its day and hours. Nothing else in the app changes, and no DTO gains a field.

### Metrics (first ticket)

- The fixed sets and thresholds of evaluations A and B in `iter3-p5 메트릭.md` are committed before the first run, as C0. One labeller (the P05 owner) labels them; a second labeller is pending the team.

## Testing Decisions

- A good test checks behaviour a caller sees through the seam, not how it is built: what is stored and published, what the admin API and the app API return, which Collections and skips are recorded.
- **Main server over HTTP, with the model scripted** (prior art: `collection`, `stored-event-posts`, `admin-global-event*`, `published-global-events` e2e specs, and `test/scripted-model.ts`): a Collection message goes in, the admin and app APIs are read. Covers keys per Source and the migration, publication by the rules and by a Judgement, each check failing on its own, failing closed, the single retry, never judging a changed Draft, masking, attaching by rule and by the AI, refusing by rule, the queue, detaching, the time flag, and that no app DTO carries the Publication Route or the Judgement.
- **Worker parser on saved pages** (prior art: `event-page-parser`, `event-collector` e2e specs and `test/pages`): sessions, the SSO skip, the list range, the two-second pacing through the fetching interface.
- **Admin site components** (prior art: `admin/__tests__/event-page.test.tsx`): the column and filter, the Judgement panel, the queue and the detach action.
- **Offline evaluation with the real model**, outside CI: the Judgement step and the same-event step over the committed sets, scored as evaluations A and B define.
- The app's "M월 D일까지" is checked on a phone; the app has no test setup.

## Out of Scope

- Department and college notice boards, which are Iteration 4.
- The career centre's and student affairs' sites.
- Running Judgements over the Drafts stored before this work (it can be run later).
- Merging two Global Events that both exist.
- An event's capacity or application deadline.
- Any sign in the app of how an event was published.

## Further Notes

- If time runs short, cut in this order: the same-event step (and with it the queue and detaching), then publishing events over a period, then the admin site's Judgement panel.
- Assumptions pending the team: that the PM allows posts to be sent to the model provider once masked; the second labeller.
- Prior art for a Judgement and its failure: hangsha's Gemini parser fills events and shows them even when the call fails, and its parser appears to have stopped for about three weeks unnoticed (ADR 0008).
- Real overlapping pairs for tests and the metric set, checked on 2026-10-30 (SNU Now `bbsidx` ↔ extra.snu `dataSeq`):
  - 178226 ↔ PGM012002414 (IEEE Authorship Seminar, 11-02 10:00, 관정관 양두석홀)
  - 178064 ↔ PGM012002395 (취업역량강화특강; the body says to apply on extra.snu)
  - 178013 ↔ PGM012002403 (면접 전략 특강; the body's application link is extra.snu)
  - 178079 ↔ PGM012002382 (알렉산더테크닉 대면; the body links `dataSeq=PGM012002382`)
  - 177764 ↔ PGM012002390, …391, …393, …394 (one post for four programmes: many-to-one)
  - Trap: 177707 (알렉산더테크닉 **비대면**) against PGM012002382 (**대면**). Its title is closer than the true pair's; its body links PGM012002381.
