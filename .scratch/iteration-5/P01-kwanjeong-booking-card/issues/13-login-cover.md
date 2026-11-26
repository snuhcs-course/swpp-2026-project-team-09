# 13: No library page shows between the login and the close

Parent: [P01 spec](../spec.md); the user on the phone (2026-11-27): after a library login, the library site's own page shows for a moment and then disappears.
Status: ready-for-human
Blocked by: nothing

Native files: none. Releases: an app OTA update.

## What happens now

The library login (`mobile/src/library/login-view.tsx`) is the site's own page in a visible web view (ADR 0012). After the school's login (`nsso.snu.ac.kr`) the view comes back to the site's main screen (`…/NEW_SNU_BOOKING/pc/main`). The view closes only when two things have happened:

- the main screen has loaded (`loading` false), and `onLanded` starts a check of the session (`login-checks.ts`);
- that check, one read through the hidden view, has found the session.

The main screen paints while it loads and while the check runs, so the site's own page shows for that moment, and then the view closes.

## What to build

A cover, a view of the app over the web view, from the moment the view comes back from the school's login until the check ends:

- **When the cover comes:** as soon as the web view starts to load one of the site's main, booking, or my-booking screens (`isLoginDone`) after a page off them, before that page paints.
- **When it goes:**
  - the check finds the session, and the view closes with it as before;
  - or the check finds none, and the cover goes, showing the site's page with the view still open, as before;
  - or 15 seconds have passed since the way back began (`COVER_LIMIT_MS`), when the page never landed or the check is still under way. The site's page then shows, with ✕ above it, so the User is never left behind the cover. A check still under way can still close the view. A later way back starts the limit afresh.
- **Not covered:** the page the login starts from, and the school's login page.
- **Its look:** the screen's surface colour, with "로그인하는 중이에요" in the app's hint look: one line in a see-through pill, no spinner and no button. The bar with ✕ and its note stay above it, so ✕ still closes the view.
- **The check's state:** `LibraryLogin` is told whether a check runs (`checking`, from `library-session.tsx`).
- **ADR 0012 is unchanged:**
  - the login is still the site's page in a visible web view;
  - no script is added to the page;
  - nothing of the session leaves the web views;
  - the app sends no request of its own to the site.

## Acceptance criteria

The tests use the navigation events a login gives, with the fake library. They are in `library-login-cover.integration.test.tsx`, new.

- [x] No cover over the page the login starts from, nor over the school's login.
- [x] The cover is there as soon as the view starts loading the site's main screen back from the school's login, and the view closes logged in once the page has landed and the check found the session. It failed before the change.
- [x] The cover stays over the landed page while the check is still under way (the library holds its read), and the view closes logged in once it answers. It failed before the change.
- [x] The cover goes when the check finds no session, and the view stays open. It failed before the change: no cover came.
- [x] The cover comes off 15 seconds after the way back began when the page never lands, and the view stays open. It failed before the limit was added.
- [x] The cover's words are one line in a see-through pill, and the cover has no button. It failed before the hint look was given.
- [x] The library session's tests of the login pass unchanged.
- [ ] On a phone: after the school's login, only "로그인하는 중이에요" shows until the view closes, and the site's page never flashes.
- [ ] On a phone: the cover never stays longer than 15 seconds.
- [x] Whole lint, format, and types of the app.

## Comments

### Agent usage (2026-11-27)

- One session, p04-58, built tickets 12 and 13 together in one pull request. These are the two tickets' total, the same in ticket 12: count them once.
- Agent time: about 25 minutes, from 17:28 UTC to the push, an estimate. No emulator, no subagents.
- Tokens, from 17:28 UTC to this entry: input 128 uncached, with cache reads 35,690,269 and cache writes 157,833; output 59,655.
- The cover's 15-second limit and hint look, a second pull request after the first was approved: about 20 minutes more in the same session, from 17:51 UTC to the push, an estimate, about half of it the tests running on a loaded machine. No emulator, no subagents. Tokens: input 46 uncached, with cache reads 4,163,512 and cache writes 31,484; output 21,091. These are ticket 13's alone.
