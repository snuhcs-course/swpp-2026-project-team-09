# 05: The privacy policy says what an error report holds and where it goes

Parent: [P08 spec](../spec.md)
Status: ready-for-human
Blocked by: 03

Native files: none. Releases: an app over-the-air update. A person reviews the wording before the Release.

## What happens now

- The legal texts are in `mobile/src/screens/legal-documents.ts`, shown by `legal/[document]`; the consent screen is
  `mobile/src/screens/consent-screen.tsx`.
- Of the privacy policy only two parts are written: 학번, 학적상 이름 and 소속, and the library login.

## What to build

- A part of the privacy policy for error reports, in Korean:
  - what is collected: the User id, the device model, the OS version, the app's version, and error reports (the kind
    of error, where in the app's code, the screens visited before it);
  - what is not: names, 학번, positions, Friends, parties' words, anything typed;
  - why: to find and fix crashes;
  - to whom: Functional Software, Inc. (Sentry), in the United States, as a transfer abroad, with how long it is kept
    (the plan's retention, which ticket 06 reads from the account);
  - how to stop: the switch "오류 보고 보내기" in 내 정보.
- The consent screen names the part where it lists what the User agrees to.
- The switch's link (ticket 03) opens this part.

## Must not break

- The two parts already written, and the consent a signed-in User has already given: whether a changed policy asks
  for consent again follows what the consent screen does today for a changed text, and the pull request says which.

## Acceptance criteria

- [x] The privacy policy shows the part with the five points above. (Integration test on the text's presence.)
- [x] The consent screen names it. (Integration test.)
- [x] The switch's link opens the part. (Integration test.)
- [ ] A person has read the wording and written "reviewed" and the date under Comments.
- [x] Lint, format and types of the app pass.

## Comments

### Built (2026-11-24)

- **The part** is the third section of the privacy policy in `mobile/src/screens/legal-documents.ts`, headed
  "오류 보고", after the two parts already written, which are unchanged. Its words follow the facts the owner decided
  for this ticket (recipient, what is and is not sent, the native crash, 30 days, the switch, on by default).
- **Opening the part:** a section may carry a `part` name; `/legal/privacy?part=error-reports` opens the policy and
  scrolls to that section once it is laid out (`legal-screen.tsx`). Without `part`, or with an unknown one, the
  document opens at its top as before. The switch's link "개인정보 처리방침 보기" passes `part: 'error-reports'`.
- **The consent screen** gains one sentence under the three documents (`CONSENT_ERROR_REPORTS`) that names the part
  "오류 보고" and where to turn it off. It is plain text, not a fourth link: the part is reached through the
  "개인정보 처리방침" row.
- **Consent again:** no. The consent today is one boolean kept on the phone (`consented` in `src/storage/kept.ts`),
  with no version of the texts, so a changed text does not ask again; this ticket follows that and adds no version.
  A User who agreed before sees the new part only by opening the policy.
- **Differences from the ticket, following the owner's facts:**
  - What is not sent: the owner's list (이름, 이메일, 학번, 위치, 친구, 파티 제목, 입력한 내용) in place of the
    ticket's "parties' words".
  - What is sent adds the app's update, and says the User id is a random id of ours, not the name, email or 학번.
  - A sentence on native crashes, sent by the phone's own crash reporter without the scrubbing step.
  - Retention was first written as 30 days, not read from the account; the figure was then taken out (see The
    retention below).
  - The policy says sending is on at first, and that a crash stored while it was on is sent only when it is turned on
    again.
- **Words to check in the review** (the code sends more than the decided list names): Sentry's sessions (release
  health) are sent while the switch is on; HTTP breadcrumbs keep a request's method, scrubbed path and status; an
  error's message is cut to 200 characters but not removed, and the README says a message may hold what a User typed,
  which sits uneasily with "입력한 내용은 보내지 않아요".
- **Tests:** `__tests__/consent.integration.test.tsx` (the part's words and the two older parts, the consent sentence,
  opening at the part and at the top) and `__tests__/telemetry/error-reports-switch.integration.test.tsx` (the
  switch's link opens the part).

### After the build (2026-11-25)

The three points the build flagged for the reviewer were true of the code, so the policy's words were changed to say
them rather than left for later:

- **Requests.** A report also holds the requests the app made (method, path with ids removed, status). The policy now
  names "앱이 서버에 보낸 요청의 종류·결과" beside the screens.
- **Sessions.** While the switch is on, Sentry is also told of each start of the app and whether it ended without an
  error. The policy has a sentence for it.
- **An error's message** is cut to 200 characters, not removed, and may hold what a User typed. The policy no longer
  says that what was typed is never sent; it says a message may carry it.

Still a person's: the review of the wording, and whether Users who already agreed should be asked again (today's
consent keeps no version of the texts, so they are not).

### The retention (2026-11-25)

The policy no longer names 30 days. The figure is Sentry's for the Developer plan, but nobody has read it on this
organisation's Subscription page, and a policy must not state a guess. It now reads "보관 기간은 Sentry가 SNU Now의
요금제에 정해 둔 기간이고, 그 기간이 지나면 Sentry가 지워요." Once ticket 06 records the account's figure, the number
can go back in.

### Screenshots (2026-11-25)

Taken on an x86_64 emulator from a mock build of this branch.

- `../references/05-consent.png`: the consent screen with its new sentence.
- `../references/05-policy-error-reports.png`: the privacy policy as the switch's link opens it, without a scroll by
  hand. The part is the policy's last, so the screen is at its end: the heading stands a few lines below the top, and
  the whole part down to its last sentence is in the one picture. There is no separate picture of the part's end.

### The retention figure is back (2026-11-25)

Read on the account (ticket 06): the Developer plan with a Business trial until 2026-12-08. The policy's sentence now
reads "보관 기간은 최대 90일이고, 그 기간이 지나면 Sentry가 지워요." This is ticket 07's first step.

### Agent usage (2026-11-24)

- Agent time: about 45 minutes in one implementation session, an estimate; most of it waited on the slow integration
  tests on a loaded machine.
- Tokens: 114,882 in all for the implementation session, as its usage reports; the split into input, cache reads, cache writes and output was not available.
