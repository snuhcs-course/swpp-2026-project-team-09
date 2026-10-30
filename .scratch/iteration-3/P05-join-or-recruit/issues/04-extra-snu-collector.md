# 04: extra.snu collector

**What to build:** The worker collects extra.snu (비교과) twice a day, one Global Event for each session of a programme, so that Users see programmes posted only there. Spec: `../spec-collection.md`, "extra.snu collection (worker)".

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Opening pages sits behind an interface; the detail pages open in a headless browser (Playwright) because of the site's waiting room, and tests read saved pages.
- [ ] The first four list pages are read, one detail page every two seconds, twice a day apart from the SNU Now schedule.
- [ ] Each session becomes one collected event keyed by the programme's `dataSeq` and the session's number, with its time and place from the page's structured fields, and the description and application period in the description.
- [ ] A programme that redirects to the SSO sign-in is skipped and counted, not recorded as a failure.
- [ ] A session the rules can read is published, as for SNU Now; the rest are Drafts.
- [ ] extra.snu's Collection status appears beside the other Sources.
- [ ] The worker's image carries the browser, its memory limit fits it, and the local and Production setups run it.
- [ ] `robots.txt` and the terms were checked, and the result is written in this ticket.
