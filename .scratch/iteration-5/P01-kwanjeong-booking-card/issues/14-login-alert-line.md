# 14: A login page's alert is one line of the app, not the browser's dialog

Parent: [P01 spec](../spec.md); the user on the phone (2026-11-27): with a wrong password, the library's login page raises the browser's own dialog, "'https://k-rsv.snu.ac.kr' 페이지 내용: SSO 응답 오류" with 확인. "한 줄로 바꿀 수 있다면 바꾸는 게 이득 아닌가?"
Status: ready-for-human
Blocked by: ticket 13's second pull request (the cover's limit), on which this one is built

Native files: none. Releases: an app OTA update.

## What happens now

The library login (`mobile/src/library/login-view.tsx`, ADR 0012) shows the library's own login form (`k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login/form`) in a visible web view. The form sends the ID and password to the site's own `/pc/login/login`, and with a wrong one the form comes back and raises the page's `alert("SSO 응답 오류")`. Android's web view draws a page's alert as its own dialog, titled with the page's address, and the User has to press 확인.

## The site's alerts on the login path

Read on 2026-11-27 from the site's pages as they are without a login: the login form (`/pc/login/form`; `/pc/main` sends there without a session), the error page (`/pc/error`), and the script every page loads (`commons/scripts/util/util.js`). The main screen with a session was not read: that needs a login, which an agent does not do. It carries the same shared head as the two pages read.

| Where | When | Words | After it |
| --- | --- | --- | --- |
| Shared head, `goLogin()` | A page finds no session | "로그인 정보가 없습니다. 로그인 화면으로 이동합니다." | Goes to the login form by itself |
| Shared head, `jsonError(msg)` / `jsonErrorGo(msg, goUrl)` | A call of the site answers with an error | The server's message, its `<br/>` as line breaks | Goes to `goUrl` by itself when there is one |
| Login form, on load (`$(document).ready`) | The server marks the form with a message: `if("Y" == "Y"){ alert("…"); }`, blank without one | With a wrong password, "SSO 응답 오류" (seen on the user's phone) | Nothing |
| Login form, `validate()` | 로그인 with an empty field | "아이디를 확인하세요." or "비밀번호를 확인하세요." | The form is not sent (`return false`) |
| `util.js` | Checks of the booking forms' fields | "숫자를 입력하세요.", "시작일이 종료일보다 큽니다.", "…을(를) 입력해 주세요.", a length limit | Not on the login path |

- **확인 continues nothing.** An alert only pauses the page's script until 확인. The code after each one above runs the same once `alert` returns at once: `goLogin` and `jsonErrorGo` go on to their page, and the others stop.
- **`confirm`:** `util.js` has three, "입력하신 정보로 수정하시겠습니까?", "…등록하시겠습니까?", and "삭제하시겠습니까?", used by the booking forms. None is on the login path, so `confirm` is left as the browser's.

## What to build

- **The page script** (`mobile/src/library/login-alert.ts`, `LOGIN_ALERT_SCRIPT`):
  - On the school's pages (`snu.ac.kr` and its subdomains), it replaces `window.alert` with a function that posts `{ kind: 'alert', text }` to the app and opens no dialog.
  - It reads nothing of the page: no field, no form, no cookie, no storage. It runs after the style sheet's script, in its place: as the page starts and again once it has loaded (`LOGIN_PAGE_SCRIPT`). A second run leaves the first one's `alert` as it is.
- **The app** (`login-view.tsx`):
  - The web view takes a message only as an alert's words (`alertWords`), and only from a page of the school over https. "SSO 응답 오류" becomes "아이디나 비밀번호를 다시 확인해 주세요."; any other alert is said in the site's own words, its line breaks as spaces.
  - The words show as one line just under the notice "아이디와 비밀번호는 도서관 로그인 페이지로만 전달돼요", over the top of the page. They take the hint's look, a pill with white words, in the danger colour at 0.88, and have no button. A touch reaches the page through them.
  - The line goes when the User touches the page, as to edit the fields or press 로그인 again. It also goes when a way back from the school's login begins, and with each login view opened. It stays when the site goes on to another page after its alert.
  - An alert lifts the cover of a way back (ticket 13).
- **ADR 0012 is unchanged:**
  - the login is the site's page in a visible web view;
  - the scripts read nothing of the page;
  - nothing of the session leaves the web views;
  - the app sends no request of its own to the site.
- **On Android, the first run** comes as the page starts (`onPageStarted`). The form's alert comes when its document is ready, before the second run once the page has loaded. If a phone ran the first one before the new page existed, its alert would still be the browser's dialog. Only a phone shows which; a native script at the document's start would be the next step.

## Acceptance criteria

- [x] The page script names no input, form, cookie, storage, value, document, password, field, or query. (Unit test.)
- [x] On a page of the school, the page's `alert` posts its words to the app and opens no dialog. It does so once after two runs, and leaves another site's `alert` as it is. (Unit test.)
- [x] The app says "아이디나 비밀번호를 다시 확인해 주세요." for "SSO 응답 오류", the site's own words on one line for another alert, and nothing for another site, plain http, a message that is not JSON, another kind, or empty words. (Unit test.)
- [x] A wrong password: the line shows and "SSO 응답 오류" does not; a touch on the page clears it; the right password then logs in. It failed before the change. (Integration test.)
- [x] The line is one line in a see-through pill of the danger colour, with no button. It failed before the change. (Integration test.)
- [x] An alert during a way back lifts the cover and is said. It failed before the change. (Integration test.)
- [x] The line stays when the site goes on to its login form after the alert. (Integration test; it failed with a first version that cleared it whenever the view left the site's screens.)
- [x] The login view gives its pages the fit and the alerts' script, and has a message handler. (The updated unit test of ticket 02 and the library session's integration test.)
- [ ] On a phone: a wrong password shows the one line and no dialog; the right one then logs in.
- [x] Whole lint, format, and types of the app.

## Comments

### Agent usage (2026-11-27)

- Agent time: about 40 minutes in the p04-58 session, from 18:12 UTC to the push, an estimate. About half of it is test runs on a loaded machine, and the first few minutes close ticket 13's second pull request. No emulator, no subagents.
- Tokens, from 18:12 UTC to this entry: input 96 uncached, with cache reads 12,626,712 and cache writes 99,955; output 60,785.
