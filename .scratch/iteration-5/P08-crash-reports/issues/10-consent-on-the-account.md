# 10: The account keeps the consent's version and the usage choice, which the User can change

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: ready-for-agent
Blocked by: None (can start immediately)

Native files: none. Releases: the main server. Nothing a User sees changes until ticket 11's app update.

## What happens now

- Consent is kept on the phone only: `consented` in `mobile/src/storage/kept.ts:20`, written by the consent screen
  (`mobile/src/screens/consent-screen.tsx:46`) and read at a sign-in (`mobile/src/screens/use-sign-in.ts:41`) and at a
  start (`mobile/src/session/start.ts:39`). It holds no version of the texts, so a new phone asks again and a changed
  text does not.
- The `User` model (`main-server/prisma/schema.prisma:51`) holds nothing of consent.
- The sign-in's answer is the tokens and `onboarding` (`main-server/src/auth/dto/sign-in-result.dto.ts`); the Lobby
  is `main-server/src/lobby/dto/lobby.dto.ts`.
- Routes that a User may call before Onboarding carry `@AllowBeforeOnboarding()`
  (`main-server/src/common/allow-before-onboarding.decorator.ts`), as `POST /users/me/onboarding` does.

## What to build

- **Three columns on `User`**, in one migration, all empty for every existing account:
  - `consentVersion Int?` (`consent_version`): the version of the legal documents the User agreed to; null for none;
  - `usageConsent Boolean?` (`usage_consent`): the usage choice given with it; null while no version is agreed;
  - `consentedAt DateTime?` (`consented_at`): when the version was agreed to;
  - `usageChosenAt DateTime?` (`usage_chosen_at`): when the usage choice was last set, by the consent or by the
    switch.
- **`CONSENT_VERSION`**, the current version, a constant of the main server, 1 with this ticket. The app holds the same
  number (ticket 11); a comment on each says the two are raised together.
- **`PUT /users/me/consent`**, with `@AllowBeforeOnboarding()`, since the consent screen comes before Onboarding. Body
  `{ version: integer, usage: boolean }`.
  - A version from 1 to `CONSENT_VERSION` that is higher than the account's is stored with the choice and the time,
    and answered 204.
  - The same version again is answered 204 and stores the choice it carries, so that the app may send it again when
    an answer was lost.
  - A version lower than the account's is refused 409 `CONSENT_VERSION_OUTDATED`; one above `CONSENT_VERSION`, or a
    body of another shape, is refused 400.
- **`PUT /users/me/usage-consent`**, for the switch in 내 정보 (ticket 11). Body `{ usage: boolean }`. It stores the
  choice and its time, answered 204, and leaves the consent version and `consentedAt` as they are; the same choice
  again is 204 too. An account that has agreed to no version is refused 409 `CONSENT_REQUIRED`: the choice is made on
  the consent screen first. A route of its own, rather than the consent route with the same version, so that a change
  of the choice never sends a version, cannot be mistaken for agreeing to the documents, and keeps working unchanged
  when `CONSENT_VERSION` is later raised and the User has not yet agreed to the new one.
- **The sign-in's answer and the Lobby** gain `consent: { version: number | null, usage: boolean | null }`, the
  account's as stored, so that a new phone does not ask again.
- **One read for the usage service (ticket 14):** a function of the users' module that says whether a User's account
  holds a version of at least `CONSENT_VERSION` with usage chosen. It is the only rule for "may be sent", read again
  before each event, so a change of the switch holds from the next event; it has its own unit tests.
- **Documents:** the main server's README (the two routes, the four columns, the rule), and the app's API types are left
  to ticket 11.

## Must not break

- The sign-in, the renewal, the Lobby and every route's answer apart from the new field, which an older app ignores.
- Onboarding: a User who has not finished it can reach the new route, and only it and the routes that already could.
- The demo seed and the admin site's view of Users.

## Acceptance criteria

- [ ] The migration adds the four nullable columns and changes no existing row. (Integration test on the database.)
- [ ] `PUT /users/me/consent` stores a first consent, answers a repeat of the same version 204 and stores its choice,
      refuses a lower version with 409 `CONSENT_VERSION_OUTDATED`, and a higher one or a wrong body with 400.
      (Integration test through the started server.)
- [ ] `PUT /users/me/usage-consent` turns the choice off and on again, each 204, leaving the version and `consentedAt`
      as they were; an account with no version is refused 409 `CONSENT_REQUIRED`. (Integration test.)
- [ ] A User before Onboarding can call both. (Integration test.)
- [ ] The sign-in's answer and the Lobby carry the account's `consent`, null for an account that agreed to none.
      (Integration tests.)
- [ ] The "may be sent" rule: true only for a version of at least `CONSENT_VERSION` with usage true; false for no
      version, a lower one, or usage false. (Unit test.)
- [ ] The main server's README says the above.
- [ ] Lint, format and types of the main server pass.

## Comments
