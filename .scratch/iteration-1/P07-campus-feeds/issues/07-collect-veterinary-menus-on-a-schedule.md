# 07: Collect the veterinary college menus on a schedule

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 01 (Menus: receive, store and serve)

## What to build

The worker server runs its first collector. Twice a day it fetches the veterinary college cafeteria page, reads the week's menus out of it and sends them to the main server as the message of ticket 01. When the page cannot be fetched or read, it reports the failure to the main server and carries on with the next run. A developer tests the parser with a saved copy of the page, never against the real site.

This ticket sets up what every later collector uses: the schedule, the one place where pages are fetched, the sending of what was collected, the reporting of failures, and the way a page is saved for tests. Tickets 08 to 11 add collectors on top of it.

## Acceptance criteria

- [ ] Schedules run inside the worker with the NestJS schedule module, in Asia/Seoul. One worker instance runs. A run of a source does not start while the previous run of that source is still going.
- [ ] Every page is fetched through one boundary shared by all collectors. It sends a User-Agent that names the project, gives up after a timeout, and makes one request at a time. In tests it is replaced by saved responses, and the real sites are never called.
- [ ] The veterinary college parser reads the current week's table: one lunch entry per weekday from the lunch column, and the dinner from the text under the table when it names one. It reads no prices, because the page has none. The year comes from the collection date, so that a January row read in late December belongs to the next year.
- [ ] Twice a day the collector sends the menus message of ticket 01 with the collection time and waits for the answer. A refused message is treated as a failed run.
- [ ] A run that fails, because the page could not be fetched, the layout was not the expected one or the message was refused, sends the failure message of ticket 01 with a message saying what went wrong, and does not stop later runs.
- [ ] The saved page is a fixture in the repository with the date it was saved. Tests feed it to the parser and check the entries that come out, including the dinner under the table and the year at the turn of the year.
- [ ] A test starts a receiver on the test Redis that answers the message as the main server would, runs the collector once, and checks the message it received. Another checks that a fetch failure produces the failure message.
- [ ] The README of the worker server explains how a collector is put together, the schedule, the fetch boundary, the parser and the sending, how to add a source, and how to save a page for tests. Later tickets follow this note.
