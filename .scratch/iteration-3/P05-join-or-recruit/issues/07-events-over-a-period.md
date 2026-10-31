# 07: Events over a period

**What to build:** An event that runs over several days, such as an exhibition open until 11-30, is published by a Judgement, and its card reads "11월 30일까지". Spec: `../spec-collection.md`, "Judgement" and "App". Cut second if time runs short.

**Blocked by:** 05

**Status:** ready-for-agent

- [x] The Judgement's schema says whether a session runs over a period.
- [x] Such a session passes the length check only when its quoted line holds both its first and its last day; every other check still applies.
- [x] The app shows an event spanning several days as "M월 D일까지" in place of its day and hours; no DTO gains a field.
- [ ] Tests over HTTP cover a period published and one refused; the card is checked on a phone and noted in this ticket.

## Comments

Decided on 2026-11-01 by the implementer, where the ticket and the spec give no value. Reasons are in the PR.

- **What is stored.** An end that is a day alone, or the 00:00 extra.snu writes where it has no time, is stored at 23:59 (+09:00) of that day, as Jaehyun0320 proposed. Only a session over a period is treated so: 22:00 ~ 00:00 of a sitting keeps its 00:00.
- **The gate.** One quoted line holds both days, as the ticket says. Two things are added, both refusing: the two days must differ, since a day read over a period has no time of day and would show 00:00 on its card; and a range its line writes must end on the session's end, the same check a sitting has.
- **Reading hyphens.** A hyphen ends a range between days. A day written right after a hyphen is read only when a day or a clock stands before that hyphen, so `301-1-2` reads none. A two-digit year now needs the same mark after the month, or `11/5 - 11/30` read as a day of 2011.
- **The app.** An event is over a period when its end is more than 24 hours after its start, the limit the Judgement holds a sitting to. It applies to events an Administrator made too. `eventTime` is the one function, so the 행사 tab and its sheets, the map, the Assistant's cards, the AI 매칭 list, the party form and the room all read it.

To check on a phone (not done; a person does this):

- [ ] An event over several days reads "M월 D일까지" on the 행사 tab's card.
- [ ] The same on the map's card and in an Assistant card.
- [ ] A one-evening event and a 22:00 ~ 02:00 event keep their day and hours.

Known limits, none changed here, for ticket 09's failure analysis and whoever picks up the app:

- A line that lists days, `11월 5일, 11월 30일 14:00`, holds both days, so a session the model calls over a period passes as one period.
- `11월 5일~30일` stays a Draft: `dateAgrees` does not read `30일` as a day, and that check is left as it is.
- A yearless period over half a year long, `12월 20일 ~ 6월 30일` read in November, stays a Draft, since each day takes its nearest year.
- An event that has started cannot be asked for Matching (`GLOBAL_EVENT_STARTED`, "이미 시작한 행사예요"), so "AI 매칭" is refused for most of a period.
- A Quest for it attends the event's Sub Quest, whose time is the event's: a Quest made for a period event whose start is a day alone shows 00:00 and, in its room, 00:00–23:59. The list is by start, so a running period comes first. Neither is changed.
