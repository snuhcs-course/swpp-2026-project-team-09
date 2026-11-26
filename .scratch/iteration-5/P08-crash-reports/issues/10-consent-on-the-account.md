# 10: The account keeps the consent's version and the usage choice, which the User can change

Parent: [P08 spec](../spec.md), [Usage data with PostHog](../spec.md#usage-data-with-posthog)
Status: done
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

- [x] The migration adds the four nullable columns and changes no existing row. (Integration test on the database.)
- [x] `PUT /users/me/consent` stores a first consent, answers a repeat of the same version 204 and stores its choice,
      refuses a lower version with 409 `CONSENT_VERSION_OUTDATED`, and a higher one or a wrong body with 400.
      (Integration test through the started server.)
- [x] `PUT /users/me/usage-consent` turns the choice off and on again, each 204, leaving the version and `consentedAt`
      as they were; an account with no version is refused 409 `CONSENT_REQUIRED`. (Integration test.)
- [x] A User before Onboarding can call both. (Integration test.)
- [x] The sign-in's answer and the Lobby carry the account's `consent`, null for an account that agreed to none.
      (Integration tests.)
- [x] The "may be sent" rule: true only for a version of at least `CONSENT_VERSION` with usage true; false for no
      version, a lower one, or usage false. (Unit test.)
- [x] The main server's README says the above.
- [x] Lint, format and types of the main server pass.

## Comments

### Built (2026-11-26)

What was built (main server only):

- Migration `20261126000000_add_consent`: four nullable columns on `users`, `consent_version INTEGER`,
  `usage_consent BOOLEAN`, `consented_at TIMESTAMP(3)` and `usage_chosen_at TIMESTAMP(3)`, no default, no backfill.
  The SQL was written in Prisma's form and checked against the schema: on a database migrated with it,
  `prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma` gives an empty migration.
- `src/users/consent.ts`: `CONSENT_VERSION = 1`, with the comment that it is raised with the app's, and the pure rule
  `usageMayBeSent({ consentVersion, usageConsent })`. `UsersService.usageMayBeSent(userId)` reads the two columns
  again on each call and applies the rule: this is the read ticket 14 calls before each event.
- `PUT /users/me/consent` (`consentSchema`, `{ version: int 1..CONSENT_VERSION, usage: boolean }`, strict) and
  `PUT /users/me/usage-consent` (`usageConsentSchema`, `{ usage: boolean }`, strict), both in `UsersController`, both
  `@AllowBeforeOnboarding()`, both 204. Refusals: 409 `CONSENT_VERSION_OUTDATED`, 409 `CONSENT_REQUIRED`, 400 for a
  body of another shape, 401 without a token.
- `consent: { version, usage }` in the sign-in's answer (`SignInResultDto`) and the Lobby (`LobbyDto`), from
  `UsersService.consentOf`.
- README: the section Consent (the columns, the routes, the rule), the sign-in's and the Lobby's answers, the list of
  routes open before onboarding, and the folder layout's `users/` line.
- Tests: `consent-rule.unit.test.ts` (the rule), `consent.integration.test.ts` (the consent route, before onboarding,
  the sign-in's answer, the Lobby), `usage-consent.integration.test.ts`, `consent-migration.integration.test.ts` (a
  database migrated to the schema before the migration, two Users stored, then migrated: every row unchanged but the
  four empty columns). The test helper `signInResultSchema` and the Lobby test expect the new field.

Decisions and things inferred:

- The ticket's heading says three columns and its list has four; the four of the list were built.
- The consent route is two conditional updates, no lock: first "the account's version is null or lower" (stores the
  version, the choice, `consentedAt` and `usageChosenAt`), then "the same version" (stores the choice and
  `usageChosenAt` only, so `consentedAt` stays the time of the first agreement). Neither matching means the account
  holds a higher version: 409.
- The usage route is one conditional update on "a version is held"; the same choice again still sets
  `usageChosenAt`, as "stores the choice and its time" reads.
- `PUT /users/me/usage-consent` is open before onboarding too, as the acceptance criterion "A User before Onboarding
  can call both" asks, although the ticket's "What to build" names only the consent route as needing it.
- A `version` sent to the usage route is refused 400 (strict body), not ignored, so that a request meant as a consent
  is never taken as only a switch.
- The lower-version refusal is tested by writing version 2 into the row directly, since the server accepts no version
  above 1 yet.
- The old-schema migration helper of `source-posts-migration.integration.test.ts` moved to `test/old-schema.ts`
  (`migrateBefore`) so both migration tests use it; that test passes unchanged otherwise.
- The app is untouched: its API types and fake server ignore the new field and compile as they are (ticket 11).

### Agent usage (2026-11-26)

- Agent time: about 35 minutes (estimate), one session.
- Tokens: to be filled in by the orchestrator.
