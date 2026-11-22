# 02: A login page that fits the phone, and no login ID in the AI input

Parent: [P01 spec](../spec.md); the owner's report of 2026-11-22 on Release `26.11.22-16`
Status: ready-for-agent
Blocked by: none

Native files: none. Releases: an app OTA update only.

## What happens now

- **The login page does not fit the phone.** "관정도서관 로그인" (`mobile/src/library/login-view.tsx`) shows the library's own login form (`k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/login/form`) in a web view. The form is laid out for a desktop: the site's style sheet gives the body `min-width: 959px` and places the form as a 430-pixel box by absolute offsets (`left: 50%`, `margin-left: -225px`), and the page's viewport is the device's width with zooming forbidden. So on a phone the page is wider than the screen and scrolled sideways: the "SNU LOGIN" logo is cut at the left, the fields, "ID저장" and 로그인 sit in broken places, and large empty space lies above and below.
- **Autofill writes the login ID into the AI input.** After the login, the answer screen's input ("이어서 말하기") held the saved login ID with Android's yellow autofill highlight. None of the app's text fields told autofill to leave it alone, so Android's autofill service took them for fields it may fill.

## What changes

### The login form in one column

- The login view gives the page one script, before the page loads and again once it has loaded, since on Android the first run can come before the page exists. On the site's login pages only (`/NEW_SNU_BOOKING/pc/login/`), it adds a style sheet once: the body's least width goes, and the form becomes one column across the screen, 20 points in from each side. The logo is at most the screen's width, and the labels are 14 points. Each field is the whole width and 48 high, with 16-point text. "ID저장" sits under them, and 로그인 is a 52-high button in the key colour across the whole width.
- The script adds a style element and nothing else. It reads no field, and the login view still takes no messages (`onMessage`), so nothing on the page reaches the app. The page's own scripts, its "ID저장" cookie, and the password manager's filling of its fields stay as they were.
- One quiet line under the header says that the ID and password go only to the library's login page: "아이디와 비밀번호는 도서관 로그인 페이지로만 전달돼요".

### No autofill in the app's own text fields

- Every `TextInput` of the app takes `NOT_AUTOFILLED` (`mobile/src/design-system/autofill.ts`) as its first prop: `autoComplete="off"`, `importantForAutofill="no"` and `textContentType="none"`. On Android `autoComplete="off"` and `importantForAutofill="no"` both set `IMPORTANT_FOR_AUTOFILL_NO` on the field, so autofill neither fills it nor offers to save it. That covers the AI input, the design system's chat input, search field and text field, the onboarding fields, the timetable's new name, and the party form's own tag.
- The web view's fields are the page's, not ours, so the password manager still fills them.

## What stays as it is

- The login's flow: the five minutes, ✕, the check that ends it, and the hidden view.
- The site's other pages, which the script leaves alone.

## Acceptance criteria

- [x] On the login form the script adds the style sheet once, before and after the page has loaded, and adds it even before the page's head is parsed. On the site's other pages and on other sites it adds nothing. (Unit test.)
- [x] The style sheet lifts the body's least width and lays the form out in one column across the width. (Unit test; emulator picture.)
- [x] The login view gives its pages that script and no message handler, and injects nothing else. (Unit test; the library session's integration test.)
- [x] The AI input, the chat input, the search field, the text field, the onboarding fields, and the timetable's new name carry `autoComplete="off"`, `importantForAutofill="no"` and `textContentType="none"`. (Unit test of the props.)
- [ ] The login ID no longer appears in the AI input after a login. This is not checked here: it needs a real login, which an agent does not do. The tests check the props that tell Android's autofill to leave the field alone.
- [x] No native file changes; oxlint, Prettier and tsc pass on the app.

## Comments

### Emulator check (2026-11-22)

The debug app on an Android emulator with the mock servers. The emulator's app had the library's "logged in" flag set, so its row in 내 정보 offered 로그아웃, which was not pressed. For the picture, a local change that was not committed opened the login view by itself, on the login form's address. The library's real login form loaded in one column across the width: the "SNU LOGIN" logo whole, 아이디 and 비밀번호 with full-width empty fields, "ID저장", and 로그인 as a full-width button, with nothing to scroll sideways. Nothing was typed or pressed on the page.

### Agent usage (2026-11-22)

- Agent time: about 25 minutes in one session, measured from the transcript up to the pull request (an estimate). It covers reading the login page and its style sheet, the fix, the tests, and the emulator picture.
- Tokens: output 64k; input 12.7M, of which 12.5M cache reads, 193k cache writes and 140 uncached. No subagents.
