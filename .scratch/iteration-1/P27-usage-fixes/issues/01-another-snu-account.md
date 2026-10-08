# 01: Sign in with another SNU account

Parent: [P27 spec](../spec.md)
Status: resolved
Blocked by: None (can start immediately)

## What to build

A User whose phone offers only a personal Google account can sign in with an SNU account from the sign-in screen. Below the line under the headline (`@snu.ac.kr`, or `@snu.ac.kr 계정만 가능해요` after a refusal) the screen shows the link `다른 서울대 계정으로 로그인`. It opens Google's explicit sign-in, the account chooser that can add an account, and the ID token it gives goes through the same sign-in as the button's: the main server's check, the refusal of a non-SNU account, Onboarding. `서울대 계정으로 로그인` keeps opening the quick sheet of the phone's accounts, and the kept Session is not touched.

## Acceptance criteria

- [x] The sign-in screen shows `다른 서울대 계정으로 로그인` below the line in the default state and after a refusal (`not-snu-account` and `failed`), and not while the account is checked.
- [x] Pressing the link asks Google's explicit sign-in; pressing the button asks the phone's accounts as today.
- [x] Both ways share everything after the ID token: an SNU account signs in and is led on, a non-SNU account is refused with `@snu.ac.kr 계정만 가능해요`, a closed chooser returns to the default state.
- [x] One sign-in at a time: pressing the link or the button while a sign-in runs does nothing.
- [x] Where Google's module is not in the build (Expo Go, the tests, the web), the link runs the same mock sign-in as the button.
- [x] Restoring a kept Session at launch is unchanged.
- [x] Screen tests cover the link's states and its outcomes against the mock; the existing sign-in tests pass unchanged.

## Check on a phone

- [ ] On Android, the link opens Google's account chooser with its option to add an account, and an account added there signs in.
- [ ] The button still opens the quick sheet (the "SNU Now에 로그인할까요?" sheet).

## Comments

### 구현 전 정리 (2026-10-08)

- 현재 동작: 로그인 화면(`mobile/src/screens/sign-in-screen.tsx`)에는 버튼 하나뿐이다. 버튼은 `useSignIn().start` → `signIn()`(`src/auth/sign-in.ts`) → `askGoogle()`(`src/auth/google.ts`)로 이어지고, `askGoogle`은 `createAccount()`(폰의 계정 시트)를 열며 폰에 계정이 없을 때(`noSavedCredentialFound`)만 `presentExplicitSignIn()`으로 넘어간다. 그래서 개인 계정이 하나라도 있는 폰에서는 앱 안에서 계정을 추가할 길이 없다. Google 모듈이 없으면(Expo Go, 테스트, 웹) `signInWithMock()`이 돈다. 진행 중에는 `useSignIn`의 `checking` ref가 두 번째 누름을 막는다.
- 바꿀 동작: 헤드라인 아래 줄 밑에 `다른 서울대 계정으로 로그인` 링크를 기본 상태와 거절 상태(`not-snu-account`, `failed`)에서 보이고, 확인 중에는 숨긴다. 링크는 Google의 명시적 로그인(`presentExplicitSignIn`, 계정을 추가할 수 있는 선택 창)을 바로 연다. ID 토큰 이후(메인 서버 확인, SNU 아닌 계정 거절, 취소, Onboarding)는 버튼과 같다. Google 모듈이 없으면 링크도 같은 mock을 탄다. 저장된 Session 복원은 건드리지 않는다.
- 고칠 곳: `src/auth/google.ts`(+ `google.web.ts`)의 `askGoogle`이 어떻게 물을지(기본 `'phone-accounts'` / `'chooser'`)를 받는다. `src/auth/sign-in.ts`의 `signIn`이 그 값을 받아 Google에 넘긴다(mock 경로는 같다). `src/screens/use-sign-in.ts`의 `start`가 그 값을 받는다. `sign-in-screen.tsx`의 `Copy` 아래에 링크를 둔다. 기존 `sign-in-test`의 기본 상태 검사가 `queryByRole('link')`가 없음을 확인하므로, 링크는 텍스트 버튼(`Button variant="ghost"`, role `button`)으로 둔다.

### Agent usage (2026-10-09)

- Agent time: about 1 hour (the merge with 08, half of it) in the resumed session (2026-10-08 to 09), an estimate. Much of it was spent waiting for the shared test slot while the Mac was short on memory. The earlier session, which was force-quit, is not counted: its usage was lost.
- Tokens: about 62 thousand in all, all subagents: half of the merger shared with 08 (27 thousand). The subagent reports give only totals, so input and output, and the cache reads and writes, cannot be shown separately. Included is a ninth of the shared code review and review fixes (about 36 thousand tokens and 2.5 minutes). The orchestrator's own tokens are not counted.
