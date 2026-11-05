# AI facility booking: research and design (TODO)

Status: plan only, for a later iteration. Nothing here is built. P13-06 ships only the link button ("시설 예약하기") on a made Proposal.

Read on 2026-11-04, from public pages only: no login, no booking, no form sent. What a logged-in page shows is not known yet and is marked **unverified**.

## The two sites

| | athletics.snu.ac.kr (스포츠진흥원 체육시설 예약) | ssims.snu.ac.kr (예약하샤, colleges' study rooms) |
|---|---|---|
| Public without login | The facility list (`/facility/list`) and each facility's page (`/facility/list?mode=view&facility_idx=N`) with its rules and a month calendar of 예약가능 / 예약불가 days | Nothing: `/index.do` answers 302 to `/loginpage.do`, then `SSOService.do` |
| Login | mySNU single sign-on. `/member/login` is the school's SSO page (form fields `user_id`, `user_passwd`, MFA by mail / SMS / push; `lnksys_id=snu-mfa-athletics`, `return_url=https://athletics.snu.ac.kr/member/login`). Booking pages redirect there with `returnto` and `returntoparams` | mySNU single sign-on. `SSOService.do` posts `agt_id=snu-sims`, `agt_url=https://ssims.snu.ac.kr` to `https://nsso.snu.ac.kr/sso/usr/login/link` |
| Session | `JSESSIONID`-style cookie of the site after the SSO return (**unverified** name) | `JSESSIONID` (Tomcat, `HttpOnly`) and `WMONID`, set before the login |
| robots.txt | `Allow: /`, `Disallow: /webdata` | `Disallow: /` |
| Automated reads | Answered 200 to plain `curl` | Answered 403 to earlier automated reads (P13 decisions); the PM checks it in a browser |

The two sites use the same school SSO (`nsso.snu.ac.kr`) as 관정's `k-rsv.snu.ac.kr` (ADR 0012).

## athletics.snu.ac.kr

**Facilities.** The list holds, with their `facility_idx`: 종합운동장 1, 보조운동장 2, 71-1동 다목적 체육관 301호 17 and 101호 18, GX룸(107호) 19, 무용실(B101호) 20, 71동 한국무용실 24, 탁구장 27, 풋살장(기숙사삼거리) 30, 농구장(공대) 35. Shown as 예약불가 on the list: 현대무용실 25, 태권도장 26, 복싱장 28, 웨이트트레이닝장 29, 농구장(기숙사삼거리) 31. Index 52 is an administrators' page.

**Rules on a facility's page** (종합운동장, as an example):
- 예약가능기간: 화요일 09:30 ~ 일요일 24:00, a weekly window;
- 사용시간 07:00 ~ 23:00; 사용주기/사용횟수 매주 1회; 최대예약시간 1회 120분;
- 최소 예약인원 4명 (2 for most indoor rooms). "모든 시설은 최소 사용자 수 이상의 사용자 정보를 입력하고 인증 받아야 합니다. 사용자 정보는 재학중인 학생, 재직중인 교직원 정보를 입력해야 합니다." So a booking names every user, each a current student or staff member, and each is **verified** (how: **unverified**, likely 학번 and name);
- "체육시설 사용수칙 준수 서약서 내용 확인 바랍니다": the User agrees to the rules' pledge; a breach restricts use.

**Requests.**
- Read, public: `GET /facility/list?mode=view&facility_idx=N&cur_month=YYYY-MM` gives the month's 예약가능 days as HTML (`.btn-reservation` with `data-date`). An Assistant tool could read it without a session, on our server or the phone.
- Book: a 예약가능 day's button opens `GET /facility/reservation?mode=form&facility_idx=N&date=YYYY-MM-DD`, which without a session answers `alert("로그인 하신 후 이용가능 합니다.")` and goes to `/member/login`. The form's fields (time slot, the users' 학번 and names, the pledge) and the request it sends are **unverified**: reading them needs a login.
- Cancel: a "my bookings" page is likely under `/facility/` or `/member/` (**unverified**).

**Phone-side session (ADR 0012).** Likely workable as for 관정: the SSO page in a visible web view, then a hidden same-origin web view that sends the site's own form posts with the cookie the browser adds. Differences:
- the site answers HTML, not JSON, so the fixed call script must parse the page in the web view and post back only the fields we need (slots, a booking's id, success or the alert's text);
- a session ending shows as the `alert` page or a redirect to `/member/login`, which the script must read as `sessionEnded`;
- the SSO here asks for MFA (mail / SMS / push), which the visible login view shows as it is.

## ssims.snu.ac.kr (예약하샤)

Nothing is public. Which rooms of 58 (SK경영관), 44-1 (신양학술정보관), 300 (유회진 학술정보관) and 301 (제1공학관) it books, its deep links, its requests and its rules are all **unverified** until the PM's browser check. Who may book is likely limited by college (the 공부공간 layer's restricted spaces), and a group room may need its members' 학번, as 관정's rooms do.

**Phone-side session.** The same plan as athletics, if the site's pages answer the hidden web view as they answer a browser. Its `robots.txt` disallows all crawling; calls the User makes from their own session are not crawling, but the site's terms of use must be read first (**unverified**: no public terms page was found).

## Terms of use

- athletics: the 체육시설 사용수칙 and its 서약서 (shown after login, **unverified**); 개인정보처리방침 at `/member/privacy-policy`. Nothing public forbids booking through another client, but each booking names real users who must agree.
- ssims: not public. To read before any build.
- Both: the school's SSO credentials must never reach our servers (ADR 0012's reasons hold).

## What the Assistant would need

- **Tools**, as the library's (`src/assistant/library/`), behind a client capability such as `clientCapabilities: ['athletics']`:
  - `findFacility` (from `seed/facility-booking.json` grown to one row per facility with its `facility_idx`, rules, 최소 인원 and hours);
  - `findFacilityFreeDays` / slots (the month's calendar; public for athletics, so the server could read it, with a cache);
  - `proposeFacilityBooking` (a card, no write), `proposeFacilityCancel`.
- **Cards**: a booking card with the facility, the date and slot, the users (the User and the Friends of the party, each with consent, as 관정's room requests take their 학번 and registered name) and the pledge to agree; a cancel card; a done card. The write runs only on the card's press, from the phone.
- **Companions**: the 최소 예약인원 means a booking names 2–4 people. The party's invited Friends are the natural users; their 학번 and names go only to the booker's phone after each consents (as in ADR 0012's consequences).
- **The Proposal's link**: once a facility is booked in the app, 시설 예약하기 becomes "예약하기" on the card; until then the link stays.

## Open questions (TODO)

1. The athletics booking form's fields and request, from a logged-in browser (the PM, by hand, without sending).
2. How athletics verifies each user (학번 + name? a code?).
3. ssims: rooms per building, deep links, rules, terms (the PM's browser check).
4. Whether both sites behave inside a hidden Android web view (no `X-Frame-Options` issue, since the view opens the page itself).
5. Whether the school allows an app to book on a User's behalf; ask 스포츠진흥원 (02-880-7809, sports@snu.ac.kr) before building.
