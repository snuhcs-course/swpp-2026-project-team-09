# 02: Global Events: states and collected events

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: the first Collection, stored as lines), 03 (Buildings and the Campus Boundary)

## What to build

The main server stores Global Events with their states, Draft, published, cancelled and discarded, and receives collected events from the worker. Four times a day the worker lists the university's events from today on, asks the main server which of the listed posts it already stores, reads the detail page of the others only, and sends each as one event: the title, the body as text, the start and end when the rules read them, the place text, the post number and the source link. A post is one event, identified by its post number.

The main server publishes a collected event when the rules read its start from the body's time line, with a time of day, and its place names exactly one Place of the list (tickets 03 and 06). The event's position is that Place's, so it can go on the map without a person. Every other collected event is a Draft, with its text, or with its title alone when its page was not the post, for the Administrator to fill in or discard: an event online or off campus, one whose place names no Place or several, and a post that is not an event, which mostly writes no such time and place. A discarded event stays stored, so that the next Collection does not bring it back. No Collection changes a stored event, whatever its state.

The administrative API and the User-facing list of published Global Events belong to P12. This ticket gives P12 the records and the rules it needs, and serves no events to Users.

## Acceptance criteria

- [x] A Global Event record holds what P12 edits and publishes: a title, a description, an optional start, an optional end, an optional place text, an optional position as a latitude and a longitude, a state (Draft, published, cancelled or discarded), and a version for P12's edit check. A published event has a title, a start and a position. A collected one also holds the post number and the source link; one an Administrator creates by hand has neither.
- [x] The main server answers the worker's question, which of these post numbers do you store, with the stored ones in any state, so that a discarded or published post is not read again.
- [x] The main server stores a collected post once: the same post sent twice leaves one record, and a post already stored, in any state, is left exactly as it is.
- [x] A collected event is stored as published when its start came from the body's time line with a time of day and its place text names exactly one Place of the list: by building number, with the university's name or the building's name beside it (`서울대학교 302동 105호`, `학생회관(63동)`), or by name, with the university's name. Its position is that Place's coordinates. Otherwise it is stored as a Draft, with whatever was read. A start read only from the header's date does not publish: that date is often the application period.
- [x] The worker lists the events from today on with the list's date filter, page by page until the list says there is nothing more, and reads only the detail pages the main server does not store. It asks for one page at a time, four times a day, and ticket 01's command runs this Collection too. The Source's Collection status is recorded as ticket 01 does, a page without the expected structure is a failed Collection as there, but for a post's page that is not the post, which is stored as a Draft (decisions below), and a failure leaves the stored events as they are.
- [x] The parser reads the title, the body as text, the start and end from the body's time line or the header's date, saying which, the place from the body's place line, the post number and the link. Spacing and no-break spaces inside the labels do not matter. When the time or the place cannot be read, the event is still sent with the text. An application period or deadline is not read; it stays in the description.
- [x] The rules are the team's own: no code, pattern list or keyword list from Haengsha.
- [x] Parser tests with saved pages: a post with a time and a place, a post with a date range, a post whose time cannot be read, a post with an application deadline, a list page with its date filter, the page past the end of the list, and the firewall's block page.
- [x] Message-boundary tests: the question about stored posts answered for a stored, a discarded and an unknown post; an event with a start time and a place naming one Place stored as published with that Place's position; a place with a building number the list does not hold, a place that names several Places, a place online and a start from the header's date alone each stored as a Draft; the same post twice stored once; a post already published, edited or discarded left as it is; an invalid message refused; a failure recorded.
- [x] The main server's README records the Global Event states, what a collected event carries, when a collected event is published, and the rule that a Collection never changes a stored post, for P12.

## Comments

### What this ticket sets for P12 (2026-10-02)

The main server's README holds the full text: Global Events, and Questions under Requests from the worker server. The worker server's README says how a post is read: Events.

- **The record**: `global_events`, model `GlobalEvent`: `title`, `description`, `startsAt` and `endsAt` (optional), `place` (optional), `latitude` and `longitude` (optional), `state` (`draft`, `published`, `cancelled`, `discarded`, by default `draft`), `version` (from 1), and for a collected event `postNumber` (unique) and `sourceUrl`. The migration is `20261004010000_add_global_events`; it also adds `snu_events` to `Source`.
- **What P12 must keep**: a published event has a title, a start and a position. Nothing in the database enforces it; the Collection only publishes such events, and P12's publishing has to check it.
- **No Collection changes a stored event.** Storing is `createMany` with `skipDuplicates`, so a post already stored, in any state, is left as it is, also when two messages race. P12 can edit, cancel and discard without a Collection undoing it.
- **The worker's question**: `POST /global-events/stored-posts` with `{ postNumbers }` answers 200 with `{ postNumbers }`, the stored ones in the order asked, whatever their state.
- **What a Draft may already hold**: a start from the header's date, which is often the application period, a day stored at 00:00, and a position from a place that named one entry even when no time was read. P12's check before an Administrator publishes a Draft cannot rest on those fields being filled.

### Decisions made while implementing (2026-10-02)

- **At most one request to `/global-events/collected` per Collection**, carrying every post read, `events: []` when nothing is new, so that a Collection that found nothing new is still recorded as successful. A Collection that stops while reading the posts sends one too, with why it stopped; one that fails before it has listed and asked about the posts sends none, only `/collections/failed`.
- **A post whose page is not the post is skipped and waits as a Draft; only the Source failing stops the Collection.** "A page without the expected structure is a failed Collection" holds for the list's pages, for a page that cannot be fetched, and for the firewall's block page, which is recognised by its refresh to `snucert.snu.ac.kr/waf/error.html`. A post's page that is none of these and not the post is that post's problem, not the Source's: the post is sent with its title from the list, an empty description and nothing else, so that it is stored as a Draft that an Administrator reads at the Source, and it is never fetched again. Three such pages in a row mean the pages have changed: the Collection fails and none of the three is sent. A skipped post is kept back until a post after it is read or the list ends, so a Collection that stops before then does not send it. Stopping at the first post that could not be read, as first done, made one odd post fail every Collection and hold up every post listed after it.
- **A Collection that stops keeps what it read, and says why in the same message.** The posts read before, if any, are posted to `/global-events/collected` with why it stopped as `failureReason`, and the main server stores them and records the failure in place of a success in one transaction. So `lastSucceededAt` stays the time of the last Collection that went through the whole list, and the posts and the failure are stored together or not at all. Recording the success and the failure with the same time, as first done, left the status to a strict comparison of the two times; sending the posts and then the failure in two requests, as done next with `complete: false`, could store the one without the other. Storing is repeatable, so nothing is lost, and those posts are never fetched again, which is what "a post is read once" asks; the first version, all or nothing, read them all again on every run while one post failed.
- **Post pages are read one after the other, and none after one that could not be fetched or was blocked**, since the next request is likely blocked too. Reading on would collect the posts after it, but a blocked run would then ask for every remaining page.
- **The list's date filter runs from today over the next 365 days** (`LISTED_DAYS`). "From today on" needs an end; a year holds every post, which appear one to three months ahead, on as many pages as a month. The page repeats its filter, and the parser checks it, because an unfiltered list runs to some 600 pages.
- **The list is read until the page past its end** (`검색된 자료가 없습니다.`), one request more than the pager's last page, as the ticket says. A page whose posts were all listed before fails the Collection, so that a list that answered every page past the end with an earlier one is not read without end.
- **Four times a day at 00:00, 06:00, 12:00 and 18:00**, evenly apart. Provisional, as the menus' times.
- **The question carries no `source` and no time.** There is one events Source, and the post number identifies a post within it. The README's rules for the worker's requests gain Questions: a `POST` whose path names what it asks for, carrying only what it asks about, answered with 200 and what it asks for. Its shape and its answer's are in each server's `dto/`.
- **A start or an end is a time with its offset or a day**, `2026-10-13T17:00:00+09:00` or `2026-10-13`, the forms the messages already use. `readFrom` says `body` or `header`. The main server's schema turns each into a moment and whether it had a time of day, and stores a day at 00:00 Asia/Seoul: the ticket's record has no all-day flag. Since the end takes the start's form and a day never publishes, only a Draft holds such a 00:00, and its description holds the original line.
- **A post's page must be the post asked for**: its canonical link is the post's address, which gives the post number and the source link, as a menu page must repeat the date asked for.
- **The time line is the first line labelled `일시`, `일자`, `일정` or `기간`, exactly, with a value.** These are the labels P05 measured with (external-sources.md §3). A label that only ends with one is not read: `신청 기간`, `접수기간` and `지원 기간` are application periods, but so the rules also miss `운영기간` or `행사 일시`. A missed line makes a Draft; a misread one could publish a wrong time. The place line's labels, and the `]`, `|` and label-alone forms both lines take, are under "The place rule after a real Collection (2026-10-03)".
- **The start is the first day written with its year and the time after it, before any range mark**; the end follows the mark. A day without its year is in the start's year, or the next when it would come first. The end takes the start's form and is dropped unless it comes after the start. A post of several sessions gives its first session: 176561's `1부(18:30~19:30) / 2부(20:00~21:00)` is published as 18:30 to 19:30, and an Administrator splits it.
- **A time is read only when it is clear whether it is before or after noon** (after the review): on the 24-hour clock, two digits before a colon or an hour after 12 (`09:30`, `17:00`, `14시`), or with `오전`, `오후`, `저녁`, `AM` or `PM`. `2시`, `2:00` and `7시 30분` alone could be either, so the start is their day and the event a Draft; 12 with a half of the day is read only as noon (`오후 12시`, `12:00 PM`). `밤`, `낮`, `아침` and `새벽` are not read, so they do not make a time clear: `밤 9시` is not read, while `새벽 02:00` is, by the 24-hour clock. `3시간` is a length, not a time.
- **The description is the body as a browser shows it**: source white space collapsed, a line for each `<br>` and each block (`p`, `div`, `li`, table cells), no-break spaces as spaces.
- **The place text is optional in the record**, like the start. The ticket lists it without "optional", but a post without a place line has none, and `null` says so.
- **A Draft whose place names exactly one entry gets that entry's position**, so that the Administrator only adds what is missing. A Draft whose place names none or several has none. The README tells P12 that a Draft may so hold a position, and a start from the header's date, before anyone has checked them.
- **A number decides its building** (rewritten on 2026-10-03, below): `302동`, `(63동)`, `71-1동`, but not a number inside a word, as in the address `역삼1동`; seven buildings are named `(관악사)학부 생활관`. A name is matched as a whole word (after the review), with or without the name's own spaces and whatever the case of its Latin letters: `국립중앙박물관` names no 박물관 and `행정관리팀` no 행정관. A name inside a longer matched name does not count (`유전공학연구소 신관` is not also 유전공학연구소); a name without a letter, OpenStreetMap's `901`, is matched by number only, or `901호` would match it.
- **A place elsewhere names no Place**: on another campus (`연건`, `시흥`, `평창`, `수원`; after the review), and since 2026-10-03 also at the university's hospitals, at the stations named after it, at another university, in another district or region, or in a flat, since the list is Gwanak's. A generic name such as `올림픽공원 체육관` no longer names one either: a name alone needs the university's name beside it.
- **`PlacesModule` exports `PlacesService`**, and `GlobalEventsModule` reads the list of Places through it on each request to `/global-events/collected`. Ticket 03 had `BuildingsModule` export `BuildingsService`; ticket 06 replaced it.
- **`seoulDay()` moved to the worker's `src/common/seoul-day.ts`**, now that two collectors use it.
- **The menu schedule test looks for its job among the worker's jobs** (`toContainEqual`), since the worker now has two. Ticket 04's two jobs keep it passing.
- **No real run while implementing** (2026-10-02). The ticket does not ask for one, so none was made, following the rule for real runs; the offline run below uses the pages saved for the tests. One was made on 2026-10-03: see "The place rule after a real Collection".
- **Not in `GLOSSARY.md`**: `published`, `cancelled`, `discarded` and `post`. They can go to `/domain-modeling`.

### The saved pages (2026-10-02)

Fifteen requests, each to its own address, once, with the project's User-Agent, by a script outside the repository; each answered 200.

- 16:36:51 the list's page 1, `https://www.snu.ac.kr/snunow/events?sc=y&df=2026.10.02&dt=2027.10.02&page=1`: 12 posts, the pager's last page 8, and the filter repeated in `input[name="df"]` and `input[name="dt"]`.
- 16:37:12 page 9, past the end: `.board-noresult`, `검색된 자료가 없습니다.`, and the filter repeated.
- 16:37:37 to 16:38:07 the twelve posts of page 1, one after the other: 176576, 176564, 176561, 176558, 176549, 176540, 176525, 176522, 176519, 176516, 176510, 176504.
- 16:47:05 page 2, for the collector's test of two pages: 12 posts.

Committed to `worker-server/test/pages/` are pages 1, 2 and 9 and six posts: 176525, 176516, 176561, 176558, 176564 and 176549. The other six posts were read to choose and stay out of the repository. No label held a no-break space in these pages, so the test of one is an edit of 176561; the firewall's block page is ticket 01's, written by hand.

### What the rules make of the posts read (2026-10-02)

The built parser and the built place rule, run offline over the twelve posts of page 1 against the 225 buildings of the seed, before and after the review's changes, with the same result but for 176558's position:

- **Published, 3**, each at the right building: 176516 (`오후 2시` at `71-1동`, the building from OpenStreetMap), 176525 (17:00 at `132동`), 176561 (18:30 at `46동`, 천문관측소, its first session).
- **Drafts, 9**:
  - 176504: its `일시` line is empty and the times sit on two session lines, so the header's dates; its place `201동` gave the position.
  - 176519: a time, but online (`형식: 온라인 Zoom`), no place line.
  - 176558: a range of days. Its place lists five facilities, of which the list holds 종합운동장 alone, as a whole word, so the Draft gets its position; before the review `종합체육관` also matched 체육관, and it got none.
  - 176522: a programme of six sessions, `운영기간` and `오프라인 장소`, neither label read.
  - 176510, 176540, 176549, 176564, 176576: calls for applicants, a contest and a hackathon, with no time line; the header's dates, which for 176564 are the application period (the event is on 10-17).

### Tests (2026-10-02)

The files as they stand after the review:

- Worker, parsers with saved pages: `test/event-list-page-parser.e2e-spec.ts` (5): a page with its filter, the page past the end, another filter, the block page, a post without a number. `test/event-page-parser.e2e-spec.ts` (32): a time and a place, a time in words, a date range, a time that cannot be read, an application deadline and an application period with times, labels with no-break spaces, lists and a table, the page of another post and the block page, and edits for a range across the new year, `일자` and `기간`, an end without a time, an end before the start, `3시간`, an empty place line, and twelve times of day, clear or not.
- Worker, collector with the Sources and the main server replaced: `test/event-collector.e2e-spec.ts` (10): two pages and the end, the question, only the posts not stored read and sent, nothing new, a post that fails first, a post that fails after another was read, a list page that fails, a list without end, a refused question, the schedule, and the command. `MainServerStub` gained `answers` for the question.
- Main server, at the message boundary: `test/global-events.e2e-spec.ts` (36), the one file that sends as the events list's Source and so checks its status: published with the building's position and with an end; Drafts for the header's dates, a header start with a time, a day without a time, no day, an unknown number, two numbers, a shared name, online, no place; a place matched by name, by the longer name, by a whole name, by number alone, not by a name of digits, whatever its spacing and case; no building for a number or a name inside a word or a place on another campus; the same post twice; a post published, edited or discarded left as it is; seven invalid messages with nothing stored and the status unchanged; a success and a failure recorded. `test/stored-event-posts.e2e-spec.ts` (2): the question for a stored, a discarded and an unknown post, and a refused question, with the posts stored directly.
- Written first and seen to fail: the list parser (no module, then the two checks), the first post test, the first published event (no handler), the three name matches, the four repeats (unique violation) and the two questions (no handler), all nine first collector tests, and for the review the nine new parser cases (seven times of day, another post, a post without a number), the post read before a failing one, and three new places (a name inside a word, two on another campus). The rest were written after the rule they check, so each rule was broken by hand and its test seen to fail: 22 breaks in the parsers, 14 in the main server and 7 in the collector, then 8 in the worker and 5 in the main server for the review's rules, every one caught.
- The branch stands on ticket 03's, `1.0/P07-03-buildings-and-campus-boundary` at `d9a692b0`, with the worker refactor `891a7246` replayed on it; the ticket's commits were replayed without a conflict. There the whole suites pass: main server 25 files and 282 tests, worker server 8 files and 91 tests; the event tests also with `TZ=UTC`. `lint`, `format:check` and `typecheck` pass in both.
- The ticket's one migration, `20261002080053_add_global_events`, was made in a temporary container, `p07-02-global-events-postgres`, since removed with its volume. On the rebased branch, a fresh database migrated with `pnpm db:migrate` showed no difference from the schema (`prisma migrate diff`).

### Review (2026-10-02)

A Standards review and a Spec review ran side by side on the feature commit and on the worker refactor `891a7246`, which this ticket's pull request carries. The fix commit acts on them; the decisions above say how the rules stand now.

- Spec: all ten acceptance criteria read as implemented, and the tests sit only at the three agreed seams. Its findings:
  - **A wrong time could be published**: `저녁 7시` was read as 07:00 and `2:00 PM` as 02:00. A time is now read only when it is clear whether it is before or after noon, and the event is a Draft otherwise.
  - **A place off campus could be published**: `국립중앙박물관` matched 박물관, 70동, and `연건캠퍼스 의과대학 행정관` matched 행정관, 60동. A name now matches only as a whole word, and a place on another campus names no entry.
  - **All or nothing**: decided again, as above. What was read before a post that fails is now kept, so it is not fetched again; the user is asked to review the decision.
  - **The record hides what P12 needs**: a Draft may already hold a start from the header's date and a position. The data stays, since the ticket stores a Draft "with whatever was read"; the README and the section for P12 above now say what such a Draft holds, so that P12's check does not rest on those fields.
  - **The post parser trusted the canonical link**: it now checks that the page is the post asked for.
  - Left as they are, with the reasons in the decisions above: the optional place text; a Draft's position; the guard against a list without end, which costs nothing on a list that ends. The refactor's `@Collects()` and `DiscoveryService` also stay: a collector names its own Sources, so tickets 02 and 04 could each add a collector without editing one shared list.
- Standards: five breaches and one item owed. Its findings:
  - **Two test files sent as the events list's Source into the shared database**, while one checked the Source's status, which another file's message could change between a send and a read. Every test that stores events now sits in `test/global-events.e2e-spec.ts`, which alone checks that status; `test/stored-event-posts.e2e-spec.ts` stores its posts with a database connection. The README now says that the file that checks a Source's status is the only one that sends as it.
  - **A post of the list without `bbsidx` became `NaN`**; it now fails the Collection.
  - **The question and its answer were shaped in the collector**; they are in `src/event/dto/stored-event-posts.dto.ts` now.
  - **The README said every message names its `source` and time**; the rule now holds for a message that reports a Collection, and a question carries only what it asks about.
  - **"Site" in these comments**, which the glossary avoids; it reads "list" now.
  - The agent usage owed is the coordinator's to record.
  - Judgement calls acted on: each edit of a saved page in the tests has its comment, as the worker README asks; the comments that restated the code are gone, among them one in `collect-sources.ts` from the refactor, and so is the controller's note about P12; the README's example feature is `global-events`; the worker README lists all six range marks; `EventSource`, which shadows Node's global, is `EventListSource`; `valueOf()` is `firstValue()`; the main server's schema turns each bound into a moment and whether it has a time of day, so `moment()` and `hasTimeOfDay()` are gone; the `bbsidx` pattern is in one parser only, since a post's page is now checked against the address of the post asked for; one function reads a time of day for the start and the end; the post parser cleans text in one place.
  - Judgement calls left:
    - `handOver(source, collectedAt, pattern, message)` repeats what the message carries: the failure report needs the Source and the time when the message could not be built at all.
    - `collectOne(source: string)`, narrowed by each collector through TypeScript's method bivariance: the command passes only names a collector declared with `@Collects()`, so a type parameter on `Collector` would check nothing more.
    - `menu-line.ts` keeps its own no-break-space handling: a shared helper for one `replaceAll` would tie the two features together.
    - `buildingOfPlace()` stays in `global-events/`: it is the events' rule for publishing, with whole words and other campuses, not the User's search in `buildings/`, whose rules differ; moving it would also have met ticket 03's renames there.

### Agent usage (2026-10-02)

Tickets 02 to 05 were built in one orchestrated run: one session placed the agents and kept the branches and the PRs, and each ticket had an implementing agent in a worktree of its own.

- Agent time: about 2 hours 9 minutes, an estimate. Nobody was waited for.
  - The implementing agent worked about 82 minutes: 56 from reading the ticket to its report, and 26 acting on the review and moving the branch onto ticket 03's.
  - The worker refactor that this ticket's pull request carries took another agent about 16 minutes, and a merging agent about 2 to run the worker's checks on it.
  - The Standards reviewer worked about 13 minutes and the Spec reviewer about 16, at the same time.
- Tokens, for the five agents, counted from their transcripts when this section was written:
  - Input: 137,383,725 in total, of which 135,339,522 were cache reads, 2,043,421 cache writes and 782 uncached.
  - Output: 119,683. The transcripts record only part of the output of most steps, so this is a lower bound.
- The orchestrating session's share is recorded once for the run, under ticket 04.

### On ticket 03's branch with the margin (2026-10-02)

Ticket 03's branch took in `1.0/Main`, which now holds ticket 05, and the Campus Boundary's 10 m margin. This ticket's commits were moved onto it without a conflict.

- The building list that a place is matched against holds 226 entries now, with 정문수위실 (115동). No test of this ticket changed.
- On this branch: main server 26 files and 306 tests, worker server 8 files and 91 tests; lint, format:check and typecheck pass in both. The numbers in the sections above are those of their time.
- The agent time of the move is counted under ticket 04.

### On ticket 03's branch with the outlines (2026-10-02)

Ticket 03's branch gained the buildings' outlines and the lookup of the building at a position, and this ticket's commits were moved onto it again.

- One conflict, in `BuildingsModule`: it exports `BuildingsService`, which this ticket reads the list through, and `BuildingLookup`.
- A building now carries an `outline`. The list that a place is matched against is the same; no test of this ticket changed.
- On this branch: main server 27 files and 321 tests, worker server 8 files and 91 tests; lint, format:check and typecheck pass in both. The agent time of the move is counted under ticket 04.

### On 1.0/Main with tickets 03 and 06 (2026-10-03)

Ticket 03 reached `1.0/Main` squashed, as #29, and ticket 06 after it, as #32, which calls the entries of the list Places. `1.0/Main` at `039eb291` was merged into this branch, so its history stays as it was pushed.

- Since the branch's copy of ticket 03 is not the squashed one, Git saw both sides add ticket 03's files: ten files conflicted, and the files ticket 06 removed came back without a conflict, among them `src/buildings/` and the migration `add_buildings` beside `add_places`. The merge keeps `1.0/Main`'s ticket 03 and 06 and this ticket's own changes alone; it differs from `1.0/Main` only in this ticket's files.
- Ticket 06 removed `BuildingsModule`, which this ticket had made export `BuildingsService`. `PlacesModule` now exports `PlacesService`, and `GlobalEventsModule` reads the list through it.
- A place is matched against the list of Places: `building-of-place.ts` is `named-place.ts`, `buildingOfPlace()` is `namedPlace()`, and the main server's README and the tests say Place. The rules are unchanged.
- Ticket 06's list adds four Places, among them 해동첨단공학관 (303동), so a place that writes `303동` now names one. No test of this ticket changed its expectations.
- On this branch: main server 29 files and 342 tests, worker server 8 files and 91 tests; lint, format:check and typecheck pass in both.

### The place rule after a real Collection (2026-10-03)

One Collection of the whole list, on 2026-10-03 against the seed's 230 Places, stored 82 posts: 13 published and 69 Drafts. 43 had a place line. The old rule published one at the wrong building (176096, `국제대학원 국제회의실`, at 140동; the room is in 140-2동, as 176087 writes), gave a Draft one place of the five it lists (176558), and missed `서울대학교미술관` (twice), `서울대학교박물관` and `버들골·풍산마당`.

- **A wrong position must not be published; more Drafts are accepted.** A place names a Place only when all that it writes is that Place.
- **The university has to be named, by name or by a building's name and number together.** A name alone, or a number alone, is also another university's or a government complex's. Without `서울대`, `관악캠퍼스`, `SNU` or `Seoul National University`, a number counts only beside a name that agrees with it.
- **A number decides, and a name beside it must agree**: one of the Places the name names, its series included, has the same number before the hyphen, so `국제대학원 140-2동` is 140-2동. **A name that another Place's name continues with a number names the series**, so `국제대학원` alone names none.
- **The place is cut into parts** at the list's and a route's separators, not inside a name. Each part must name the same Place, apart from an online part or one that is only a room or a floor: a hybrid event is published at its room.
- **Elsewhere names none**: the other campuses and hospitals, the stations named after the university, another university, another district or region, a flat.
- **More place lines are read**, by a list of labels that name the event's own place (`교육 장소`, `오프라인 장소` and the like, not `집결 장소` or `신청 장소`), by `]` or `|` in place of the colon, and by a label alone on its line taking the next line. Of the 82 posts, six more give a place line; five name their building's number on campus, and `시간 및 장소` stays a Draft. With the time lines read the same way, 176294 (38동) and 176291 (4동) are published, at the right buildings.
- Over the 43 places, 13 change. Five gain a position or lose a wrong one: 174155, 174821, 175817, 174185, and 176096, now a Draft. Two places that list several become Drafts without a position: 176558, and 174122 (`행정관(60동) 및 주변 오픈스페이스`). Six Drafts lose their position, for a name or a number without the university's: 174149 (`규장각한국학연구원`), 174143, 174152, 174182, 176429, 176504. Of the 13 published, only 176096 changed.

### On 1.0/Main with ticket 04 (2026-10-04)

Ticket 04 reached `1.0/Main` as #31, which moved the worker's messages from Redis to HTTP routes for the worker alone. `1.0/Main` at `bfd21335` was merged into this branch; where both changed the same logic, `1.0/Main`'s stays.

- **The two messages are routes now**, as `1.0/Main`'s README sets them: `POST /global-events/collected`, marked `@WorkerOnly()`, answers 204, and a failure goes to `POST /collections/failed`. The question is `POST /global-events/stored-posts`, also `@WorkerOnly()`, and answers 200 with its answer: the first route for the worker that answers with a body, so the main server's README gains a rule for questions. The worker asks with `MainServer.ask()`, beside `send()`, and the tests with `askAsWorker()`; the worker's stub answers a question from its `answers`. Both routes are in the test of the worker's routes without the worker's token.
- **`Collector` is `1.0/Main`'s**: a collector hands over through `handOver()` alone. It gains a protected `ask()` for a question, which reads what the main server holds as a page is read, and its `logger` is protected, so that the events collector logs a skipped post with it. A Collection that stops early hands over what it read with `failureReason` instead of sending twice.
- **The migration is `20261004010000_add_global_events`**, renamed from `20261002080053`, so that it comes after `1.0/Main`'s `20261002090315_add_shuttle`. Both add a value to `Source`; `snu_events` now comes after the shuttle's two.
- **`seoulDay()` stays in `src/common/seoul-day.ts`**, which the menus collector reads again in place of its own copy, since the events collector needs it too.
- **The menu schedule test is `1.0/Main`'s**: ticket 04 brought the same `toContainEqual`, so this ticket no longer changes that test. The worker has four jobs.
- `1.0/Main`'s `PageFetcher`, one for each collector, gives a page up after 5 seconds; a post's page that does not come in time stops the Collection, as a page that cannot be fetched does.
