# 01: Sign in with another SNU account

Parent: [P27 spec](../spec.md)
Status: ready-for-agent
Blocked by: None (can start immediately)

## What to build

A User whose phone offers only a personal Google account can sign in with an SNU account from the sign-in screen. Below the line under the headline (`@snu.ac.kr`, or `@snu.ac.kr 계정만 가능해요` after a refusal) the screen shows the link `다른 서울대 계정으로 로그인`. It opens Google's explicit sign-in, the account chooser that can add an account, and the ID token it gives goes through the same sign-in as the button's: the main server's check, the refusal of a non-SNU account, Onboarding. `서울대 계정으로 로그인` keeps opening the quick sheet of the phone's accounts, and the kept Session is not touched.

## Acceptance criteria

- [ ] The sign-in screen shows `다른 서울대 계정으로 로그인` below the line in the default state and after a refusal (`not-snu-account` and `failed`), and not while the account is checked.
- [ ] Pressing the link asks Google's explicit sign-in; pressing the button asks the phone's accounts as today.
- [ ] Both ways share everything after the ID token: an SNU account signs in and is led on, a non-SNU account is refused with `@snu.ac.kr 계정만 가능해요`, a closed chooser returns to the default state.
- [ ] One sign-in at a time: pressing the link or the button while a sign-in runs does nothing.
- [ ] Where Google's module is not in the build (Expo Go, the tests, the web), the link runs the same mock sign-in as the button.
- [ ] Restoring a kept Session at launch is unchanged.
- [ ] Screen tests cover the link's states and its outcomes against the mock; the existing sign-in tests pass unchanged.

## Check on a phone

- [ ] On Android, the link opens Google's account chooser with its option to add an account, and an account added there signs in.
- [ ] The button still opens the quick sheet (the "SNU Now에 로그인할까요?" sheet).
