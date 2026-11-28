# 17: The consent screen asks for an answer on usage data, with two buttons

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-human
Blocked by: 11

Native files: none. Releases: an app over-the-air update. The main server, 내 정보's switch and the carry-over are
unchanged.

## What happens now

- PostHog's dashboard (ticket 16) shows 2 daily Users while the whole team uses the app daily.
- The consent screen's usage item (`mobile/src/screens/consent-screen.tsx`, `UsageItem`, `USAGE_ITEM`) is a checkbox,
  not ticked at first, under a divider. "동의하고 시작" works with the box as it is, so most new Users pass it by and
  send `usage: false`.
- Existing Users were carried over with usage data off and are not asked (the owner's decision of 2026-11-26). That
  decision stays: this ticket asks nobody again.

## What to build

The product owner's decision of 2026-11-29: a new sign-up chooses explicitly, with no answer chosen in advance. The
item stays optional in law and in the app (either answer starts the app); only the answer becomes required.

- **A soft box** in place of the divider and checkbox: `color.surfaceSubtle`, radius 16, padding 16. In order:
  - "선택", small (12, SemiBold, faint);
  - the title "사용 기록을 앱 개선에 이용해요" (17, Bold, ink);
  - one sentence (13, muted): "연 화면과 쓴 기능의 기록만 PostHog(미국)에 보내요. 이름이나 글 내용은 보내지
    않아요. 내 정보에서 언제든 바꿀 수 있어요.";
  - the link to the policy's part "사용 기록", as before.
- **Two answers side by side**, equal width, 44 high, radius 12: X on the left, 확인 on the right (the owner asked
  for 확인 on the right). Not chosen: white, a 1 px border, navy words. Chosen: `blue100` ground, a 2 px navy border,
  navy words. They are a radio group labelled with the title; the answers are "X (사용 기록 보내지 않기)" and
  "확인 (사용 기록 보내기)".
- **No answer at first** (`usage: boolean | null`, starting null). "동의하고 시작" takes no press until one is chosen,
  and the line "사용 기록을 고르면 시작할 수 있어요" (12, muted) stands under it meanwhile. "로그아웃" stays under
  that line and works with or without an answer.
- `agreeToDocuments(usage)` receives the chosen answer.
- The design's mock-up also drew a one-time popup for existing Users; it is not wanted.

## Must not break

- The carry-over of existing Users, who are not asked.
- 내 정보's switch "사용 기록 보내기", the routes, and the main server.
- "로그아웃" on the consent screen, the failure's toast and the second press.
- `CheckBox` (`src/screens/check-box.tsx`), which the room book card's 서약서 still uses.

## Acceptance criteria

- [x] Neither answer is chosen at first, "동의하고 시작" takes no press and nothing is sent, and the hint shows.
      (Integration test.)
- [x] 확인 sends `usage: true`; X sends `usage: false`; a change of mind sends the answer last chosen. (Integration
      tests.)
- [x] "로그아웃" signs out with no answer chosen. (Integration test.)
- [x] The mock build's item works the same way. (Integration test.)
- [ ] The screen with no answer, with X and with 확인, on an emulator with the mock build.
- [ ] A person has read the new wording and written "reviewed" and the date under Comments.
- [x] Lint, format and types of the app pass. No native file changes.

## Comments

### Built (2026-11-29)

- `consent-screen.tsx`: `USAGE_ITEM` now holds the kicker, title, sentence, link, the two answers' words and labels,
  and the hint. `UsageItem` draws the box and a `radiogroup` of two `UsageAnswer`s (`radio`, `checked` when chosen).
  `ConsentScreen` keeps `usage` as `boolean | null`; "동의하고 시작" is disabled while it is null.
- **PostHog(미국) is kept in the sentence.** The policy's part says the records go abroad to PostHog, Inc. in the
  United States (paragraph 6), and ticket 11's sentence named it on this screen. 개인정보 보호법 제28조의8 asks that the
  User be told the recipient and the country when the consent to a transfer abroad is taken, and this screen is where
  it is taken, so a link alone was judged not enough. The reviewer of the wording may still drop it.
- The policy's paragraph 7 ("사용 기록 보내기는 선택이에요 … 처음 동의할 때 고르고 …") stays true and is unchanged.
- `CheckBox` is no longer used here but stays for the room book card.
- Tests: `consent-account.integration.test.tsx` (no answer at first and no send, X, 확인 with the next start, a
  change of mind, a failure then a second press, 로그아웃 with no answer), `consent-usage-mock.integration.test.tsx`
  (the radio group in the mock build). `consent`, `loading`, `onboarding` and `invite-link-cold-start` choose X
  before "동의하고 시작".
- The mobile README's paragraph on the consent screen describes the box and the answers.

Checks: `tsc` of the app, oxlint and prettier on the changed files, and the six touched test files one per process
(`consent-account` 16, `consent-usage-mock` 6, `consent` 19, `loading` 9, `onboarding` 9, `invite-link-cold-start`
8, all passing). No emulator run: the screenshots are left to the emulator's agent.

### Agent usage (2026-11-29)

- Agent time: about 1 hour 15 minutes (estimate), over two sessions of one agent (the first was cut by a restart),
  most of it waiting on single-file Jest runs.
- Tokens: about 1.1 million input (estimate; nearly all of it cache reads, with roughly 90 thousand cache writes) and
  about 25 thousand output. The session's exact split was not available to the agent. No subagents.
