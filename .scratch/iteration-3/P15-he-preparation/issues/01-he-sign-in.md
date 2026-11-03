# 01: HE sign-in: the account list, and a first run for every evaluator

Parent: [P15 spec](../spec.md) ("Sign-in", "The HE accounts")
Status: ready-for-agent
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

- [ ] `HE_ACCOUNTS` is a main-server setting that is off unless set.
- [ ] The table holds the spec's seven accounts: key, role, name, department and Google name.
- [ ] With the setting on, each key signs in.
  - A first sign-in creates the User with the persona's Google name, and a User the seed made is found by its key.
  - Onboarding suggests the persona's name and department.
- [ ] Refusals and Google tokens:
  - An unknown key is refused as an invalid token.
  - Every key is refused with the setting off.
  - A test-key Google token signs in with the setting on and with it off.
- [ ] Both Google buttons open the list, with the seven rows in the spec's order.
  - A pick signs in with its key and leads to consent, then Onboarding.
  - Closing the list sends nothing and stays on the sign-in screen.
- [ ] After a sign-out:
  - The next sign-in on the phone shows the consent screen.
  - The main screen shows the location explanation again.
  - The background-sharing choice stays forgotten, as it is today.
- [ ] The mock sign-in of an app without a Google client ID is unchanged.
- [ ] Tests named by ADR 0007, with CI green on the HE branch:
  - server integration tests for the setting on and off, an unknown key and a test-key Google token (prior art: the `auth` and `sign-out` integration tests);
  - app integration tests over the fake server for the list, a pick, a cancel, and a sign-out followed by consent again (prior art: the `sign-in` and `consent` integration tests).
