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
