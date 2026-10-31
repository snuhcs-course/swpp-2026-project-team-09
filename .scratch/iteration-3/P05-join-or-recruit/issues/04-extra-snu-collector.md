# 04: extra.snu collector

**What to build:** The worker collects extra.snu (비교과) twice a day, one Source Post per programme with one session per 회차, so that Users see programmes posted only there. Spec: `../spec-collection.md`, "extra.snu collection (worker)".

**Blocked by:** 03

**Status:** ready-for-agent

- [x] Opening pages sits behind an interface; the detail pages open in a headless browser (Playwright) because of the site's waiting room, and tests read saved pages.
- [x] The first four list pages are read and the stored question is asked by `dataSeq` before any detail page is opened; new programmes' detail pages are opened one every two seconds, twice a day apart from the SNU Now schedule.
- [x] Each programme is one collected post keyed by `dataSeq`, its sessions numbered with their time and place from the page's structured fields, and the description and application period in the description.
- [x] A programme that redirects to the SSO sign-in is skipped and counted, not recorded as a failure.
- [x] A session the rules can read is published by the step of ticket 03; the rest are Drafts.
- [x] extra.snu's Collection status appears beside the other Sources.
- [ ] The worker's image carries the browser, its memory limit fits it, and the local and Production setups run it.
- [x] The scheduled Collection runs only with `EXTRA_SNU_COLLECTION=on`, `off` by default and in Production, so that a Release before ticket 08a's starts nothing; `infra/production/README.md` says when to turn it on.
- [x] `robots.txt` and the terms were checked, and the result is written in this ticket.

## Comments

### robots.txt and the terms (2026-11-01)

- `https://extra.snu.ac.kr/robots.txt` answers 404: the site has none.
- The site links no terms of use. Its footer links the university's privacy policy and `https://www.snu.ac.kr/prohibition_of_unauthorized_email_collection`, which refuses the automatic collection of the e-mail addresses it shows, citing 정보통신망법 제50조의2. It does not forbid reading the site.
- The P05 owner chose to mask e-mail addresses in the worker. SNU Now's collector still stores them; it is outside this ticket. The law's reading has not been checked by anyone qualified.

### Decisions by the P05 owner (2026-11-01)

- Collections at 03:00 and 15:00. Memory limit 1Gi, request 256Mi.
- The list's codes, read from a saved list page: 0001 모집중, 0002 마감임박, 0003 모집마감, 0004 모집대기. It reads 0001, 0002 and 0004.
- Skipped posts are kept in `CollectionStatus.lastSkippedPosts` and shown on the admin site's Collection status.
- A programme of several sessions titles each `제목 (n회차)`, which takes one line in `toDraft`.
- A start at 00:00 is sent as a day, and a session over 24 hours with `readFrom` null. Both stay Drafts.

### Left for a person

The box on the image and memory stays open. The image was built and its browser opened a local page (arm64, 1.17 GB), and a page took about 300 MB of browser and 120 MB of Node on a Mac against a local server. Nothing has opened the real site from this code or run in Production. Open: the waiting room with images blocked, the list's address with the three codes, and whether the waiting room reaches any port but 443, which is all the worker's network policy allows.

### Agent usage (2026-11-01)

- Agent time: about 40 minutes (estimate), one session with two review subagents.
- Tokens, subagents included: input 132, with 11,250,033 cache reads and 502,223 cache writes shown apart; output 149,423. Counted before this comment's commit.
