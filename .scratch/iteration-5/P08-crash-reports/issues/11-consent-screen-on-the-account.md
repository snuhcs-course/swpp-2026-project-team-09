# 11: The consent screen and 내 정보's switch keep the usage choice on the account, with the policy's part

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-agent
Blocked by: 10

Native files: none. Releases: an app over-the-air update, after a main server Release with ticket 10, since the
screen and the switch call its routes. The Korean wording below is a draft: a person reviews it before that Release
(`ready-for-human` for that part).

## What happens now

- The consent screen (`mobile/src/screens/consent-screen.tsx`) lists the three legal documents and one sentence on
  error reports (`CONSENT_ERROR_REPORTS`), and "동의하고 시작" keeps `consented: true` on the phone (`:46`). No
  wireframe draws it; its look is the design system's.
- The screen is shown by `behindConsent` (`mobile/src/session/session.tsx:67`), from the phone's `consented` at a
  sign-in (`mobile/src/screens/use-sign-in.ts:41`) and at a start with a kept Session
  (`mobile/src/session/start.ts:39`).
- The privacy policy (`mobile/src/screens/legal-documents.ts`) has three parts, the last "오류 보고". A part can be
  opened by name (`/legal/privacy?part=error-reports`, P08 ticket 05).
- 내 정보's row "오류 보고 보내기" is `mobile/src/screens/me/error-reports-row.tsx`: a card with a `SwitchRow`, a
  caption and a link to the policy's part. Its choice is the phone's (P08 ticket 03).
- The design system has no checkbox; the app draws checkboxes in `src/screens/main/library/room-parts.tsx` and
  `src/screens/party/form/friend-picker.tsx`.

## What to build

- **The account's consent in the app.** The sign-in's answer and the Lobby are read with their `consent` (ticket 10);
  a missing field reads as null. The phone keeps a copy, `consent: { version, usage }` in `Kept`, written from the
  sign-in's answer, each Lobby, the consent's own answer and the switch's, and cleared at a sign-out and a Session's end. The old
  `consented` is no longer read.
- **`CONSENT_VERSION`**, 1, in the app, with a comment that it is raised together with the main server's.
- **When the screen shows:** at a sign-in and at a start with a kept Session, when the kept copy's version is null or
  lower than `CONSENT_VERSION`. So a User who agreed on the phone before is asked once again, and a new phone whose
  account holds version 1 is not asked. The rest of the order (sign-in, consent, Onboarding, the Lobby) stays.
- **The screen** keeps its three documents and the error reports' sentence, and gains below them an optional item: a
  checkbox, not ticked at first, its label, one sentence, and a link that opens the policy at the new part. When the
  phone had kept the earlier `consented: true`, a line above the documents says why the User is asked again.
- **"동의하고 시작"** sends `PUT /users/me/consent` with `CONSENT_VERSION` and the checkbox, keeps the account's answer
  on the phone, and goes on. If it fails, the screen stays, says so as the app's other sends do, and the button tries
  again; nothing is kept. "로그아웃" stays as it is.
- **The row "사용 기록 보내기" in 내 정보**, a card of its own right under "오류 보고 보내기", drawn as that row is: a
  `SwitchRow` with a one-line caption and the link "개인정보 처리방침 보기", which opens the policy at `part: 'usage'`.
  It shows the kept copy's `usage`. Turning it sends `PUT /users/me/usage-consent` (ticket 10) and keeps the answer
  on the phone; the version is not touched and no consent is asked again. While the request is on its way the switch
  shows the new position; if it fails, the switch goes back and the failure is said as the app's other sends do.
  Ticket 12 makes the phone's sending follow the kept value at once. "오류 보고 보내기" is left as it is.
- **The mock build** keeps the consent and the switch's choice on the phone in place of the main server, so the screen works there.
- **The privacy policy's part "사용 기록"** (`part: 'usage'`), after "오류 보고", with the wording below.
- **Usage data is not sent by this ticket.** It only records the choice and its changes; the app has no PostHog until
  ticket 12, and the main server reads the account's value before each event (ticket 14).

### The Korean wording (draft, for a person's review)

The consent screen's item:

- Label: `사용 기록 보내기 (선택)`
- Sentence: `앱에서 연 화면과 쓴 기능의 기록을 PostHog(미국)에 보내 SNU Now를 고치는 데 써요. 고르지 않아도 모든 기능을 쓸 수 있고, 내 정보에서 언제든 바꿀 수 있어요.`
- Link: `개인정보 처리방침의 '사용 기록' 보기`
- The line for a User asked again: `개인정보 처리방침에 '사용 기록'이 더해져 다시 동의를 받아요.`
- The failure: `동의를 저장하지 못했어요. 잠시 후 다시 눌러 주세요.`

내 정보's row:

- Label: `사용 기록 보내기`
- Caption: `켜 두면 앱에서 연 화면과 쓴 기능의 기록을 PostHog(미국)에 보내요. 이름·위치·입력한 내용은 보내지 않아요.`
- Link: `개인정보 처리방침 보기`
- The failure: `바꾸지 못했어요. 잠시 후 다시 해 주세요.`

The privacy policy's part, heading `사용 기록`, paragraphs:

1. `SNU Now를 어떻게 쓰는지 알고 고치기 위해, '사용 기록 보내기'를 켠 경우에만 사용 기록을 보내요.`
2. `사용 기록에는 앱을 연 때, 연 화면의 이름(주소에서 id를 지운 것), 그리고 다음 기능을 요청한 때와 그 결과(완료, 또는 실패와 그 이유)가 담겨요: AI 어시스턴트에게 질문해 답을 받은 것, 파티를 만든 것(공개·비공개만), 파티에 참여한 것(초대 수락·바로 참여·참여 신청 수락 중 어느 것인지), 친구가 된 것(친구 신청 수락·초대 링크 수락 중 어느 것인지), 관정도서관 좌석을 예약한 것. 앱이 서버에 보낸 요청이 실패하면 그 요청의 종류(주소에서 id를 지운 것)와 실패 이유도 담겨요.`
3. `SNU Now 서버도 AI 어시스턴트의 답, 파티 만들기, 파티 참여, 친구 맺기를 마치면 그 사실을 같은 방식으로 보내요.`
4. `함께 담기는 것은 계정의 내부 id, 앱의 버전, 휴대폰의 기종과 OS 버전이에요. 내부 id는 SNU Now가 정한 무작위 값이고, 이름·이메일·학번이 아니에요.`
5. `이름, 이메일, 학번, 위치, 친구 목록, 파티 제목, 장소, AI 어시스턴트에게 쓴 말과 그 답, 그 밖에 입력한 내용은 보내지 않아요. IP 주소도 남기지 않아요.`
6. `사용 기록은 PostHog, Inc.가 받아 미국(버지니아)에 있는 서버에 보관해요(개인정보의 국외 이전). 앱을 쓰는 동안 인터넷으로 그때그때 보내요. 보관 기간은 1년이고, 그 기간이 지나면 PostHog가 지워요.`
7. `사용 기록 보내기는 선택이에요. 고르지 않아도 모든 기능을 그대로 쓸 수 있어요. 처음 동의할 때 고르고, 그 뒤에도 내 정보 › 사용 기록 보내기에서 언제든 켜고 끌 수 있어요. 고르기 전과 꺼 두는 동안에는 아무것도 보내지 않아요. 이미 보낸 사용 기록은 끈 뒤에도 보관 기간이 끝날 때까지 PostHog에 남고, 그 뒤에 지워져요.`

Points for the reviewer of the wording:

- The retention, 1 year, is the free plan's as PostHog's pricing page states it; ticket 15 reads it on the account's
  plan page before the Release, and the figure follows what it shows.
- 개인정보 보호법 제28조의8 asks a transfer abroad to name the recipient's contact. Neither this part nor the error
  reports' part names one: a person decides whether to add PostHog's privacy contact here and Sentry's (Functional
  Software, Inc.) in "오류 보고".
- The switch is the way to withdraw the consent in the app (개인정보 보호법 제37조). Records sent before it was turned
  off are not deleted at once; paragraph 7 says they stay until the retention ends. A person checks that this reads
  plainly enough.

## Must not break

- The sign-in, the order of consent, Onboarding and the Lobby, and "로그아웃" on the consent screen.
- The three parts of the privacy policy already written, and opening a part by name.
- Sentry's switch "오류 보고 보내기", which stays on the phone and is not touched, and the other rows of 내 정보 and
  their order apart from the new row's place.
- A start with no network for a User whose kept copy holds the current version: the screen does not show.

## Acceptance criteria

- [ ] An account with no version is shown the screen after a sign-in; one with version 1 is not, on a phone that
      kept nothing. (Integration test over the fake main server.)
- [ ] A start with a kept Session shows the screen when the phone kept the old `consented: true` and no account copy,
      with the line saying why; and not when the copy holds version 1. (Integration test.)
- [ ] The checkbox is not ticked at first; "동의하고 시작" sends version 1 with the checkbox's state, and the next
      start does not ask again. (Integration test.)
- [ ] A failed send keeps the User on the screen with the failure's words, and a second press sends again.
      (Integration test.)
- [ ] The privacy policy shows the part "사용 기록" with its seven paragraphs, and the item's link opens it.
      (Integration test.)
- [ ] 내 정보's row shows the account's choice under "오류 보고 보내기"; turning it off and on sends
      `PUT /users/me/usage-consent` each time with the new value, keeps it on the phone, and does not show the consent
      screen; a failed send puts the switch back with the failure's words; its link opens the part. (Integration
      tests.)
- [ ] The mock build asks and keeps the consent and the switch's choice on the phone. (Integration test.)
- [ ] The screen with the item, not ticked and ticked, 내 정보's row on and off, and the policy's part, on an emulator with the mock build; the
      screens go to the orchestrator before the pull request. (Emulator.)
- [ ] A person has read the wording and written "reviewed" and the date under Comments.
- [ ] Lint, format and types of the app pass. No native file changes.

## Comments
