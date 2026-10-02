# 02: Global Events: states and collected events

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: the first Collection, stored as lines), 03 (Buildings and the Campus Boundary)

## What to build

The main server stores Global Events with their states, Draft, published, cancelled and discarded, and receives collected events from the worker. Four times a day the worker lists the university's events from today on, asks the main server which of the listed posts it already stores, reads the detail page of the others only, and sends each as one event: the title, the body as text, the start and end when the rules read them, the place text, the post number and the source link. A post is one event, identified by its post number.

The main server publishes a collected event when the rules read its start from the body's time line, with a time of day, and its place matches exactly one entry of the building list (ticket 03). The event's position is that entry's, so it can go on the map without a person. Every other collected event is a Draft, with its text, for the Administrator to fill in or discard: an event online or off campus, one whose place matched no entry or several, and a post that is not an event. A discarded event stays stored, so that the next Collection does not bring it back. No Collection changes a stored event, whatever its state.

The administrative API and the User-facing list of published Global Events belong to P12. This ticket gives P12 the records and the rules it needs, and serves no events to Users.

## Acceptance criteria

- [x] A Global Event record holds what P12 edits and publishes: a title, a description, an optional start, an optional end, a place text, an optional position as a latitude and a longitude, a state (Draft, published, cancelled or discarded), and a version for P12's edit check. A published event has a title, a start and a position. A collected one also holds the post number and the source link; one an Administrator creates by hand has neither.
- [x] The main server answers the worker's question, which of these post numbers do you store, with the stored ones in any state, so that a discarded or published post is not read again.
- [x] The main server stores a collected post once: the same post sent twice leaves one record, and a post already stored, in any state, is left exactly as it is.
- [x] A collected event is stored as published when its start came from the body's time line with a time of day and its place text matches exactly one entry of the building list, by building number (`302동 105호`, `(63동)`) or by name. Its position is that entry's coordinates. Otherwise it is stored as a Draft, with whatever was read. A start read only from the header's date does not publish: that date is often the application period.
- [x] The worker lists the events from today on with the list's date filter, page by page until the list says there is nothing more, and reads only the detail pages the main server does not store. It asks for one page at a time, four times a day, and ticket 01's command runs this Collection too. The Source's Collection status is recorded as ticket 01 does, a page without the expected structure is a failed Collection as there, and a failure leaves the stored events as they are.
- [x] The parser reads the title, the body as text, the start and end from the body's time line or the header's date, saying which, the place from the body's place line, the post number and the link. Spacing and no-break spaces inside the labels do not matter. When the time or the place cannot be read, the event is still sent with the text. An application period or deadline is not read; it stays in the description.
- [x] The rules are the team's own: no code, pattern list or keyword list from Haengsha.
- [x] Parser tests with saved pages: a post with a time and a place, a post with a date range, a post whose time cannot be read, a post with an application deadline, a list page with its date filter, the page past the end of the list, and the firewall's block page.
- [x] Message-boundary tests: the question about stored posts answered for a stored, a discarded and an unknown post; an event with a start time and one matching building stored as published with that building's position; a place with a building number the list does not hold, a place that matches several entries, a place online and a start from the header's date alone each stored as a Draft; the same post twice stored once; a post already published, edited or discarded left as it is; an invalid message refused; a failure recorded.
- [x] The main server's README records the Global Event states, what a collected event carries, when a collected event is published, and the rule that a Collection never changes a stored post, for P12.

## Comments

### What this ticket sets for P12 (2026-10-02)

The main server's README holds the full text: Global Events, and Questions under Messages from the worker server. The worker server's README says how a post is read: Events.

- **The record**: `global_events`, model `GlobalEvent`: `title`, `description`, `startsAt` and `endsAt` (optional), `place` (optional), `latitude` and `longitude` (optional), `state` (`draft`, `published`, `cancelled`, `discarded`, by default `draft`), `version` (from 1), and for a collected event `postNumber` (unique) and `sourceUrl`. The migration is `20261002080053_add_global_events`; it also adds `snu_events` to `Source`.
- **What P12 must keep**: a published event has a title, a start and a position. Nothing in the database enforces it; the Collection only publishes such events, and P12's publishing has to check it.
- **No Collection changes a stored event.** Storing is `createMany` with `skipDuplicates`, so a post already stored, in any state, is left as it is, also when two messages race. P12 can edit, cancel and discard without a Collection undoing it.
- **The worker's question**: `stored-event-posts` with `{ postNumbers }` answers `{ postNumbers }`, the stored ones in the order asked, whatever their state.

### Decisions made while implementing (2026-10-02)

- **One `events-collected` message per Collection, all or nothing**, as ticket 01's menus. It carries every post read, `events: []` when nothing is new, so that a Collection that found nothing new is still recorded as successful. A post whose page cannot be fetched or read fails the Collection: the posts read before it are not sent and are read again next time. The cost is that a post the parser cannot read fails every Collection until the parser is fixed; the Collection status shows it.
- **Post pages are read one after the other, and none after one that failed**, since a block page means the next request is likely blocked too.
- **The list's date filter runs from today over the next 365 days** (`LISTED_DAYS`). "From today on" needs an end; a year holds every post, which appear one to three months ahead, on as many pages as a month. The page repeats its filter, and the parser checks it, because an unfiltered list runs to some 600 pages.
- **The list is read until the page past its end** (`검색된 자료가 없습니다.`), one request more than the pager's last page, as the ticket says. A page whose posts were all listed before fails the Collection, so that a site that answered every page past the end with an earlier one is not read without end.
- **Four times a day at 00:00, 06:00, 12:00 and 18:00**, evenly apart. Provisional, as the menus' times.
- **The question carries no `source`.** There is one events Source, and the post number identifies a post within it. The README's message rules gain Questions: named after what they ask for, answered with it.
- **A start or an end is a time with its offset or a day**, `2026-10-13T17:00:00+09:00` or `2026-10-13`, the forms the messages already use. `readFrom` says `body` or `header`. The main server stores a day at 00:00 Asia/Seoul: the ticket's record has no all-day flag. Since the end takes the start's form and a day never publishes, only a Draft holds such a 00:00, and its description holds the original line.
- **The post number and the link come from the post page's canonical link**, which is also the structure checked with the title and the body. A page that served another post would be stored under that post's own number.
- **The time line is the first line labelled `일시`, `일자`, `일정` or `기간`, exactly, with a value; the place line `장소`.** These are the labels P05 measured with (external-sources.md §3). A label that only ends with one is not read: `신청 기간`, `접수기간` and `지원 기간` are application periods, but so the rules also miss `운영기간`, `오프라인 장소` or `행사 일시`. A missed line makes a Draft; a misread one could publish a wrong time.
- **The start is the first day written with its year and the time after it, before any range mark**; the end follows the mark. `오전`/`오후`, `N시` and `N시 M분` are read; `3시간` is not a time. A day without its year is in the start's year, or the next when it would come first. The end takes the start's form and is dropped unless it comes after the start. A post of several sessions gives its first session: 176561's `1부(18:30~19:30) / 2부(20:00~21:00)` is published as 18:30 to 19:30, and an Administrator splits it.
- **The description is the body as a browser shows it**: source white space collapsed, a line for each `<br>` and each block (`p`, `div`, `li`, table cells), no-break spaces as spaces.
- **The place text is optional in the record**, like the start. The ticket lists it without "optional", but a post without a place line has none, and `null` says so.
- **A Draft whose place names exactly one entry gets that entry's position**, so that the Administrator only adds what is missing. A Draft whose place names none or several has none.
- **A place is matched by number first.** When it writes a building number (`302동`, `(63동)`, `71-1동`), only numbers count, since seven buildings are named `(관악사)학부 생활관`. Otherwise by name, ignoring spaces and the case of Latin letters; a name inside a longer matched name does not count (자하연 in 자하연식당); a name without a letter, OpenStreetMap's `901`, is matched by number only, or `901호` would match it; a number inside a word, as in the address `역삼1동`, is not a building number.
- **`BuildingsModule` exports `BuildingsService`**, as ticket 03 suggested, and `GlobalEventsModule` reads the list through it on each message.
- **`seoulDay()` moved to the worker's `src/common/seoul-day.ts`**, now that two collectors use it.
- **The menu schedule test looks for its job among the worker's jobs** (`toContainEqual`), since the worker now has two. Ticket 04's third job keeps it passing.
- **No real run.** The ticket does not ask for one, so none was made, following the rule for real runs. The offline run below uses the pages saved for the tests.
- **Not in `GLOSSARY.md`**: `published`, `cancelled`, `discarded` and `post`. They can go to `/domain-modeling`.

### The saved pages (2026-10-02)

Fifteen requests, each to its own address, once, with the project's User-Agent, by a script outside the repository; each answered 200.

- 16:36:51 the list's page 1, `https://www.snu.ac.kr/snunow/events?sc=y&df=2026.10.02&dt=2027.10.02&page=1`: 12 posts, the pager's last page 8, and the filter repeated in `input[name="df"]` and `input[name="dt"]`.
- 16:37:12 page 9, past the end: `.board-noresult`, `검색된 자료가 없습니다.`, and the filter repeated.
- 16:37:37 to 16:38:07 the twelve posts of page 1, one after the other: 176576, 176564, 176561, 176558, 176549, 176540, 176525, 176522, 176519, 176516, 176510, 176504.
- 16:47:05 page 2, for the collector's test of two pages: 12 posts.

Committed to `worker-server/test/pages/` are pages 1, 2 and 9 and six posts: 176525, 176516, 176561, 176558, 176564 and 176549. The other six posts were read to choose and stay out of the repository. No label held a no-break space in these pages, so the test of one is an edit of 176561; the firewall's block page is ticket 01's, written by hand.

### What the rules make of the posts read (2026-10-02)

The built parser and the built place rule, run offline over the twelve posts of page 1 against the 225 buildings of the seed:

- **Published, 3**, each at the right building: 176516 (`오후 2시` at `71-1동`, the building from OpenStreetMap), 176525 (17:00 at `132동`), 176561 (18:30 at `46동`, 천문관측소, its first session).
- **Drafts, 9**:
  - 176504: its `일시` line is empty and the times sit on two session lines, so the header's dates; its place `201동` gave the position.
  - 176519: a time, but online (`형식: 온라인 Zoom`), no place line.
  - 176558: a range of days, and a place naming several facilities, 종합운동장 and 체육관 among them.
  - 176522: a programme of six sessions, `운영기간` and `오프라인 장소`, neither label read.
  - 176510, 176540, 176549, 176564, 176576: calls for applicants, a contest and a hackathon, with no time line; the header's dates, which for 176564 are the application period (the event is on 10-17).

### Tests (2026-10-02)

- Worker, parsers with saved pages: `test/event-list-page-parser.e2e-spec.ts` (4): a page with its filter, the page past the end, another filter, the block page. `test/event-page-parser.e2e-spec.ts` (19): a time and a place, a time in words, a date range, a time that cannot be read, an application deadline and an application period with times, labels with no-break spaces, lists and a table, the block page, and edits for a range across the new year, `일자` and `기간`, an end without a time, an end before the start, `3시간` and an empty place line.
- Worker, collector with the Sources and the main server replaced: `test/event-collector.e2e-spec.ts` (9): two pages and the end, the question, only the posts not stored read and sent, nothing new, a post that fails, a list page that fails, a list without end, a refused question, the schedule, and the command. `MainServerStub` gained `answers` for the question.
- Main server, at the message boundary: `test/global-events.e2e-spec.ts` (18): published with the building's position and with an end; Drafts for the header's dates, a header start with a time, a day without a time, no day, an unknown number, two numbers, a shared name, online, no place; a place matched by name, by the longer name, by number alone, not by a name of digits, whatever its spacing and case, and not by a number inside a word. `test/collected-events.e2e-spec.ts` (15): the same post twice, a post published, edited or discarded left as it is, the question for a published, a discarded and an unknown post, a refused question, seven invalid messages with nothing stored and the status unchanged, a success and a failure recorded.
- Written first and seen to fail: the list parser (no module, then the two checks), the first post test, the first published event (no handler), the three name matches, the four repeats (unique violation) and the two questions (no handler), and all nine collector tests. The rest were written after the rule they check, so each rule was broken by hand and its test seen to fail: 22 breaks in the parsers, 14 in the main server and 7 in the collector, every one caught.
- The whole suites pass, before and after merging `1.0/P07-02-05-integration`, which brought ticket 03's usage notes only: main server 26 files and 298 tests, worker server 8 files and 76 tests; the event tests also with `TZ=UTC`. `lint`, `format:check` and `typecheck` pass in both.
- The ticket's one migration, `20261002080053_add_global_events`, was made in a temporary container, `p07-02-global-events-postgres`, since removed with its volume. After the merge, a fresh database migrated with `pnpm db:migrate` showed no difference from the schema (`prisma migrate diff`).
