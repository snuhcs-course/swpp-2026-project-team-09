# 34: The library login's wrong-password line stands in the app's own row

Parent: [P01 spec](../spec.md); the #641 follow-up (ticket 16's line), reported by the user on 2026-11-27
Status: done
Blocked by: none

Native files: none. Server: none. Releases: the app's JavaScript only.

## What happens now

With a wrong password, the library's login says "아이디나 비밀번호를 다시 확인해 주세요." in a see-through red pill. The pill is laid over the library's page, 8 points under the app's notice, where it covers the page's logo.

## What changes

The line goes in the app's own area, in its own row directly under "아이디와 비밀번호는 도서관 로그인 페이지로만 전달돼요". The web view starts below it.
- It is drawn as a card's failure is: `FailureNote`, red words, no pill.
- While nothing is said, the row keeps the room of the wrong password's line, unseen. So the page does not move when the line comes.
- It still goes at a touch of the page, at a way back from the school's login, and with each login view opened (ticket 16).

## The sweep: every notice over or beside the library's web views

| Web view | Notice | Where it stands | Found |
|---|---|---|---|
| Login (`login-view.tsx`) | The bar's title and ✕ | the app's bar, above the page | clean |
| Login | "아이디와 비밀번호는 도서관 로그인 페이지로만 전달돼요" | the app's own row under the bar | clean |
| Login | A page's alert ("아이디나 비밀번호를 다시 확인해 주세요.", or the site's own words) | over the page, on its logo, in a pill | wrong: fixed here |
| Login | The cover "로그인하는 중이에요" on the way back from the school's login | over an opaque cover that hides the page while the check runs (ticket 13) | clean: no page shows under it |
| Login | The toast "로그인하지 못했어요" | after the login view has closed | clean: not over the page |
| Hidden view (`hidden-view.tsx`) | none: the view is not seen | — | clean |

## Acceptance criteria

- [x] The line stands in the app's row under the notice, not inside the page's view, in red words with no pill. (`library-login-alert.integration`, red on Main.)
- [x] Its row is there, holding its room, before the line comes. (Same file, red on Main.)
- [x] It still goes at a touch, and other alerts are still said in the site's words. (Same file.)
- [ ] Pictures at 1.0 and 1.3: the login with the line, and without it. (Waiting on the emulator; the fake library, no sign-in.)

## Comments

### Agent usage (2026-11-27)

- Agent time: about 15 min in the session that finished it (an estimate: active time with gaps over 5 minutes left out). Reading the login view and the sweep came before, inside ticket 32's time. Pictures not yet taken.
- Tokens: input about 30 uncached, with 11,000 cache writes and 8,600,000 cache reads; output 7,300. No subagents.
