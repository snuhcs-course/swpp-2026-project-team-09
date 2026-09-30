# 08: Collect the Co-op and dormitory menus

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 07 (Collect the veterinary college menus on a schedule)

## What to build

The worker collects the SNU Co-op menu page and the dormitory menu page, which share one page format, for today and the coming days. It reads each restaurant's entries with their prices, the operating hours line, and a closure when the page states one, and sends them to the main server as the message of ticket 01, so that a User sees the week's menus by restaurant and meal with prices and hours. The quirks of these pages are recorded in `.scratch/research/external-sources.md`.

## Acceptance criteria

- [ ] Each run fetches both pages for today and the following six days, one request at a time, so that P15 can show seven days. The parser checks the date the page repeats against the date requested and treats a mismatch as a failed fetch.
- [ ] A restaurant's name is read without the phone number the page appends and without the leading marker some names carry.
- [ ] A cell's free text is read into entries: a menu name with its price where the page writes one, in the spacings the page uses; a corner heading kept with the entries under it; a buffet line kept as one entry with one price. An entry without a price is sent without one.
- [ ] The operating hours line is sent as the restaurant's operating hours text for that day, in the spellings the page uses. Busy hours and other notes are not sent as hours.
- [ ] A cell that states a closure produces no entries. An empty cell also produces no entries and is not treated as a closure.
- [ ] The dormitory restaurant that appears on both pages is collected once, under one name, and the README records which name.
- [ ] The Co-op page and the dormitory page are separate sources in the collection status, so that a broken page is noticed on its own.
- [ ] Runs happen twice a day and follow the failure reporting of ticket 07.
- [ ] Saved pages are fixtures in the repository: a normal day, a day with a closed restaurant, a cell with a menu without a price, a buffet line and an operating hours line. Tests feed them to the parser and check the entries, the hours and the closure, and one test checks the message sent for a run.

## Comments

### From ticket 01 (2026-10-01)

Ticket 01 changed the menus message after checking these pages (`.scratch/research/external-sources.md` §4.1 and §4.2). A meal is sent as the lines of its cell, in the page's order, `{ meal, text, kind, price }`. `text` is the line as the page wrote it; `kind` (`heading`, `item` or `note`) and `price` are set only when the collector is sure. The main server's README, section Menus, describes it. What this changes in the criteria above:

- Operating hours are given per meal and sometimes per corner, so they are sent as `note` lines of that meal, not as the restaurant's text for the day. Busy hours and other notices are `note` lines too.
- A closure written in a cell, such as `개천절 휴무`, is sent as a line. A restaurant listed with empty cells is sent with `lines: []`. A message replaces its source's whole day, so every restaurant the page lists for a day is sent.
- A heading such as `<셀프코너> 7,000원` is a `heading` line with its price, and the dishes under it follow as their own lines. A line with several prices, or with a typo in its price, keeps the price in `text` and has `price: null`.
- The restaurants whose names start with `* ` repeat one fixed menu in each cell every day. Send them as the page shows them.

The line model is provisional. Once this collector runs on the real pages, review with the team what it sends, and how many lines it could give a `kind` and a `price`, before relying on the model.
