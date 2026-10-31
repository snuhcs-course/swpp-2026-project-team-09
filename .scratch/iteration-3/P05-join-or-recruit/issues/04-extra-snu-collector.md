# 04: extra.snu collector

**What to build:** The worker collects extra.snu (비교과) twice a day, one Source Post per programme with one session per 회차, so that Users see programmes posted only there. Spec: `../spec-collection.md`, "extra.snu collection (worker)".

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Opening pages sits behind an interface; the detail pages open in a headless browser (Playwright) because of the site's waiting room, and tests read saved pages.
- [ ] The first four list pages are read and the stored question is asked by `dataSeq` before any detail page is opened; new programmes' detail pages are opened one every two seconds, twice a day apart from the SNU Now schedule.
- [ ] Each programme is one collected post keyed by `dataSeq`, its sessions numbered with their time and place from the page's structured fields, and the description and application period in the description.
- [ ] A programme that redirects to the SSO sign-in is skipped and counted, not recorded as a failure.
- [ ] A session the rules can read is published by the step of ticket 03; the rest are Drafts.
- [ ] extra.snu's Collection status appears beside the other Sources.
- [ ] The worker's image carries the browser, its memory limit fits it, and the local and Production setups run it.
- [ ] `robots.txt` and the terms were checked, and the result is written in this ticket.
