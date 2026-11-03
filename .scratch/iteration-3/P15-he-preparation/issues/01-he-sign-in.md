# 01: HE sign-in: the account list, and a first run for every evaluator

Parent: [P15 spec](../spec.md) ("Sign-in", "The HE accounts")
Status: done
Blocked by: None (can start immediately)

## What to build

An evaluator signs in by picking one of the seven HE accounts from a list on the sign-in screen, and every evaluator on a phone starts at the first run.

- **Server:** a main-server setting, `HE_ACCOUNTS`, off by default, puts the HE stand-in in front of the Google check.
  - An ID token that is one of the seven account keys is answered with that account's claims:
    - the key as the Google subject;
    - the SNU hosted domain;
    - a verified address on a `.invalid` domain;
    - the Google name `<name> / 학생 / <department>`.
  - Any other token goes through the Google check unchanged. With the setting off, nothing changes.
  - The keys, roles, personas and Google names are one table, which ticket 03's seed extends.
- **App:** both Google buttons of the sign-in screen open an in-app list of the seven accounts.
  - Each row shows its role and name, such as `1라운드 · 김하늘`.
  - A pick sends its key where Google's ID token went. Closing the list is a cancel.
  - From there the real code runs: consent, then Onboarding with the persona's name and department suggested, then the main screen.
- **Sign-out:** it also forgets this phone's consent and location explanation, so that the next evaluator on the phone sees both again.

## Acceptance criteria

- [x] `HE_ACCOUNTS` is a main-server setting that is off unless set.
- [x] The table holds the spec's seven accounts: key, role, name, department and Google name.
- [x] With the setting on, each key signs in.
  - A first sign-in creates the User with the persona's Google name, and a User the seed made is found by its key.
  - Onboarding suggests the persona's name and department.
- [x] Refusals and Google tokens:
  - An unknown key is refused as an invalid token.
  - Every key is refused with the setting off.
  - A test-key Google token signs in with the setting on and with it off.
- [x] Both Google buttons open the list, with the seven rows in the spec's order.
  - A pick signs in with its key and leads to consent, then Onboarding.
  - Closing the list sends nothing and stays on the sign-in screen.
- [x] After a sign-out:
  - The next sign-in on the phone shows the consent screen.
  - The main screen shows the location explanation again.
  - The background-sharing choice stays forgotten, as it is today.
- [x] The mock sign-in of an app without a Google client ID is unchanged.
- [x] Tests named by ADR 0007, with CI green on the HE branch:
  - server integration tests for the setting on and off, an unknown key and a test-key Google token (prior art: the `auth` and `sign-out` integration tests);
  - app integration tests over the fake server for the list, a pick, a cancel, and a sign-out followed by consent again (prior art: the `sign-in` and `consent` integration tests).

## Comments

- **Built (2026-11-03), on `3.0/P15-he-01`.**
  - **Server:** the account table is `main-server/src/he/he-accounts.ts` (`HE_ACCOUNTS`: key, role, name, department, Google name), for ticket 03's seed to import and extend. The stand-in is `heAccountClaims` in `main-server/src/auth/he-stand-in.ts`, which `AuthService.signIn` asks before the Google check while the setting is on. The email is `<key>@he.invalid`. The admin site's sign-in is unchanged.
  - **The setting:** `HE_ACCOUNTS=on` in the main server's environment turns it on; unset or `off`, nothing changes. It is in `settings.ts`, `.env.example` and the README's Sign-in. The shared test settings set it `off`, since Nest writes a validated default back into the environment and a second `startApp` in a file would then read `false`.
  - **App:** `askGoogle` in `mobile/src/auth/google.ts` now opens the list (`mobile/src/auth/he-accounts.ts`, the app's copy of the keys, roles and names, and `mobile/src/screens/he-account-sheet.tsx`, a bottom sheet on the sign-in screen) in place of Google's sheet and chooser. Everything after Google's step is the existing code, and the mock (no Google client ID) is untouched. `signOut()` now also forgets `consented` and `locationExplained`.
  - **Tests:** `main-server/test/he-sign-in.integration.test.ts` (on, unset, unknown key, Google token) and `mobile/__tests__/he-sign-in.integration.test.tsx` (the list from both buttons, a pick to consent and Onboarding, a cancel, a sign-out followed by consent and the explanation again). Changed to the HE behaviour: `google.unit.test.ts` (asking Google), `consent.integration.test.tsx` and `api/sign-in.integration.test.ts` (consent is asked again after a sign-out) and `library-sign-out.integration.test.tsx` (what the sign-out keeps).
  - **Not ticked:** CI green on the HE branch, which runs only once the branch is pushed. Locally, lint, format check, typecheck and every test of `main-server` and `mobile` pass.
- **CI (2026-11-03):** every CI check passed on `a78b952` and on `d0a4ed5`, the pushed `3.0/P15-he`, which holds this ticket. That ticks the last box.
