# 04: The privacy policy says what an error report holds and where it goes

Parent: [P08 spec](../spec.md)
Status: ready-for-agent
Blocked by: 02

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
    (the plan's retention, which ticket 05 reads from the account);
  - how to stop: the switch "오류 보고 보내기" in 내 정보.
- The consent screen names the part where it lists what the User agrees to.
- The switch's link (ticket 02) opens this part.

## Must not break

- The two parts already written, and the consent a signed-in User has already given: whether a changed policy asks
  for consent again follows what the consent screen does today for a changed text, and the pull request says which.

## Acceptance criteria

- [ ] The privacy policy shows the part with the five points above. (Integration test on the text's presence.)
- [ ] The consent screen names it. (Integration test.)
- [ ] The switch's link opens the part. (Integration test.)
- [ ] A person has read the wording and written "reviewed" with their name and the date under Comments.
- [ ] Lint, format and types of the app pass.

## Comments
