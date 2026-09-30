# 09: Collect the events list as Drafts

Parent: [P07 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02 (Global Events: storage, states and collected Drafts), 07 (Collect the veterinary college menus on a schedule)

## What to build

Four times a day the worker reads the university's official events list and the detail page of each post on it, reads the title, the description, the start and end time, the place text and the source link by rules, and sends them to the main server as the message of ticket 02, so that each event reaches the Administrator as a Draft with a link to check the original. When the time or the place cannot be read, the post is still sent with its original text, so that the Administrator can fill them in.

The rules are the team's own. The source code of Haengsha was read to learn which pages exist and how they are built, but no code, pattern list or keyword list is copied from it, because its repository carries no licence.

## Acceptance criteria

- [ ] Each run fetches the first page of the events list and then the detail page of every post on it, one at a time. The worker keeps no record of earlier runs, so every post on the page is sent every time; the main server keeps one Draft per session.
- [ ] A post is identified by the post key in its address, and its source link is the address of its detail page.
- [ ] The parser reads the title, the posting date and the body as the original text. From the body it reads the start and the end from the line labelled as the date and time of the event, in the spellings the page uses, and the place from the line labelled as the place. A period labelled otherwise, such as an application period, is never the event's time.
- [ ] A post whose time or place cannot be read is sent with the original text and without that field, so that the main server stores it as a Draft that is not fully read.
- [ ] The rules read one start and one end per post in this iteration. A post that describes several sessions arrives as one Draft; the Administrator splits it.
- [ ] Runs happen four times a day. A detail page that fails does not stop the run: the other posts are still sent, and the failure is reported as in ticket 07.
- [ ] The README of the worker records what the rules read and what they ignore.
- [ ] Saved pages are fixtures in the repository: a list page, a post with a time and a place, a post spanning several days, a post with an application period as well as an event time, and a post whose time cannot be read. Tests feed them to the parser and check the fields that come out, and one test checks the message sent for a run.
