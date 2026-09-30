# Creating the User at first sign-in or after onboarding: benchmark and a comparison for SNU Now

All sources were accessed on 2026-09-30. `[X1]`-style links point to the Sources list at the end. "My judgement" marks conclusions that no source states directly.

## 1. Short answers

- **Created at the first sign-in:** Auth0, Firebase, Supabase, Auth.js and Cognito. Google's backend guide says the same: create the record from the ID token, then prompt for missing profile data [GO2]. Its newer pages allow either creating the account at once or showing a sign-up UI first [GO3][GO1].
- **Deferred:** only Clerk, and only for its built-in fields (name, username, legal acceptance). A `SignUp` is "converted into a user" only when complete, and an inactive one is abandoned after 24 hours [CL1]. For custom fields, Clerk's own onboarding guide is row-first, with an `onboardingComplete` flag [CL4].
- **Hybrid:** Auth0 creates the user but can hold back tokens. A post-login Action renders a Form or redirects, and tokens come only after `/continue` [AU1][AU2].
- **Where pending state lives.** Clerk keeps the sign-up on its server, tied to one client (device) [CL5]. Auth0 keeps the login transaction. None of the sources has the app re-send the Google credential after onboarding.
- **Abandonment, second device, expiry.** Only Clerk documents an expiry (24 h inactive) [CL1]. Row-first platforms keep the row and document no cleanup. Auth0's redirect token lasts 15 min by default [AU1]. No platform documents two phones onboarding one account at once.
- **Google ID token.** Valid for one hour and cannot be revoked [GO6][GO5]. Google's checks are signature, `aud`, `iss` and `exp` [GO1]; no page says a token may be used only once. The nonce is optional [GO4].
- **Chosen for SNU Now: Row-first**, as most platforms do. The User is created at the first sign-in with an empty name and department, and onboarding completes it (section 4).

## 2. Platforms

| Platform                | User created                                                                   | Required data missing                                                                  | Abandoned onboarding                                          |
| ----------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Clerk (built-in fields) | When the `SignUp` completes; `createdUserId` is set only then [CL1]            | `status: missing_requirements` with `missingFields`, filled by `signUp.update()` [CL3] | `abandoned` after 24 h inactive; `abandon_at` [CL1][CL5]      |
| Clerk (custom fields)   | First sign-in [CL4]                                                            | `/onboarding` page, reached by a redirect on a missing flag [CL4]                      | Not documented                                                |
| Auth0                   | First login; the redirect token's `sub` is the Auth0 `user_id` [AU1]           | Post-login Form or redirect; tokens after `/continue` [AU1][AU2]                       | Row stays; the example re-renders while data is missing [AU2] |
| Firebase                | First sign-in [FI1]                                                            | Kept outside Auth, e.g. in Firestore [FI2]; `isNewUser` [FI3]                          | Not documented                                                |
| Supabase                | First ID-token sign-in, in the transaction that issues the refresh token [SB2] | `profiles` table filled by a trigger; example columns nullable [SB1]                   | Not documented                                                |
| Auth.js                 | First OAuth sign-in, adapter `createUser` [AJ1]                                | `pages.newUser` redirect, first sign-in only [AJ2][AJ3]; Prisma `name` nullable [AJ4]  | Not documented                                                |
| Cognito                 | First federated sign-in [CG1][CG2]                                             | Sign-in fails with an error; no prompt [CG3]                                           | Not applicable                                                |

- **Clerk.**
  - `missingFields` lists only built-in fields such as `first_name` and `legal_accepted` [CL2]. Custom data goes in `unsafeMetadata`, copied to the user on completion [CL1].
  - A sign-up "must be associated with the current Client object" [CL5], so each phone has its own.
  - The native Expo hook exchanges the Google ID token and returns `createdSessionId` "if authentication is successful", plus the `SignUp` [CL6]. My judgement: later steps continue that server-side sign-up; the Google token is not sent again.
  - The onboarding guide calls its redirect "a convenience redirect, not an access boundary" and checks the flag at each resource. Its form calls `user.reload()` after the update [CL4]. My judgement: a claim in the token lags the database until the token is refreshed.
- **Auth0.**
  - Pre User Registration runs only for Database and Passwordless connections [AU4]. Post Login runs "including authentication after signup" [AU5], and every login updates the profile [AU3]. Auth0 never says in one sentence that a Google user is created at first login; it follows from these and [AU6].
  - Redirect Actions list "one-time collection of additional required profile data". The pipeline suspends, and resumes when `/continue` gets the original `state`; without it the login fails with `invalid_request` [AU1].
- **Firebase.**
  - "After a user signs in for the first time, a new user account is created" [FI1]. "You cannot add other properties to the user object directly" [FI2].
  - `isNewUser` means "created via sign-up" [FI3]. My judgement: it is true only once, so a resumed onboarding must check the app's own profile.
  - A `beforeUserCreated` function can refuse creation, but must answer within 7 seconds [FI4]. It cannot wait for a form.
- **Supabase.** "If the trigger fails, it could block signups" [SB1]. My judgement: NOT NULL columns filled from Google claims would turn a missing claim into a failed sign-in.
- **Auth.js.** One sign-in creates the user, links the account and starts the session [AJ1]. "New users will be directed here on first sign in" [AJ2], because the redirect depends on `isNewUser` [AJ3]. An abandoned onboarding is not resumed unless the app checks.
- **Cognito.** A failing case is "Your IdP didn't send claims that map to required attributes" [CG3]. Required attributes cannot change after the pool is created, and custom attributes cannot be required [CG4]. A Lambda can add attributes "before creating new users" [CG5], without user interaction. My judgement: app-collected fields must be optional, which is Row-first.

## 3. The Google ID token

- **Lifetime.** "User ID tokens are valid for one hour, and can't be revoked" [GO6]. For Sign in with Google, `exp` "is one hour"; verify "before the expiration time", and do not use `exp` for session management [GO5].
- **Checks.** Signature, `aud`, `iss`, and `exp` not passed [GO1]. No Google page limits a token to one use.
- **Replay.** "To prevent replay attacks, you can include a nonce", and the server checks it matches [GO4]. OIDC ties the nonce to per-session state and calls replay detection "Client specific" [S1]. `jti` "can be used to prevent the JWT from being replayed" [S2]; the GIS payload example carries one [GO5].
- **Key.** Use `sub`, never the email [GO1][GO7].
- My judgement: the same ID token sent twice within its hour passes every documented check. With a nonce, the app must keep it alongside the token until the profile is sent.

## 4. What this means for SNU Now

| Aspect               | Deferred                                                                                                                                                                                     | Row-first (chosen)                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| NOT NULL             | Holds: no User without name and department                                                                                                                                                   | Holds with empty strings until onboarding; `onboarded_at` records completion                                          |
| Abandoned onboarding | Nothing stored; the next start gets 422 again                                                                                                                                                | A User with an empty profile, a session and a refresh token remain; the lobby sends the app back to onboarding        |
| Second phone         | Both get 422. The first submit creates the User; the second becomes a sign-in, and the first phone gets `SESSION_REPLACED`                                                                   | B's sign-in replaces A's session at once; A's next request, the onboarding's included, gets `SESSION_REPLACED`        |
| ID token expiry      | After an hour the submit gets 401; the app gets a new ID token and resends the kept form                                                                                                     | No issue: onboarding uses the access and refresh tokens                                                               |
| Lost response, retry | The same ID token signs in to the new User (profile ignored) and replaces the lost session                                                                                                   | The onboarding request repeats safely                                                                                 |
| Double submit        | Two sign-ins at once: the later session wins (ticket 07). If the app keeps the earlier answer, it gets `SESSION_REPLACED`. The route is public, so ticket 10's per-User keys cannot cover it | Two onboarding requests leave the same profile                                                                        |
| Gating other routes  | None: every access token belongs to a complete User                                                                                                                                          | The lobby refuses a User before onboarding; other routes decide when features show Users to one another               |
| What the app does    | Keep the ID token (and nonce) and the form; handle 422, and 401 after expiry                                                                                                                 | Store the tokens; follow the sign-in's or the lobby's `onboarding`; send the onboarding request, then enter the lobby |

The table is my judgement, drawn from tickets 07, 08 and 10.

**Chosen: Row-first (ticket 08).**

1. **The sign-in stays one request that answers with tokens**, as the refresh does. The app never sends the Google ID token again, so its hour does not bound onboarding.
2. **The name and the department stay NOT NULL**, with empty strings until onboarding, and `onboarded_at` records completion, so no profile column becomes nullable.
3. **One gate.** The lobby, which the app enters at every start, refuses a User before onboarding, and answers with the suggestion read from the stored Google name. What else to refuse is decided when features show Users to one another.

The cost is a User row left by an abandoned onboarding, which the lobby sends back to onboarding at the next start.

## 5. Could not verify

- Clerk with two phones signing up one Google account at once; Auth0's login transaction lifetime; any cleanup of never-onboarded users.
- Whether Credential Manager ID tokens carry `jti` [GO5].

## 6. Sources (all accessed 2026-09-30)

- [CL1] Clerk Docs, SignUp object (Legacy), Next.js reference.
- [CL2] Clerk Docs, SignUpFuture object.
- [CL3] Clerk Docs, Build a custom flow for authenticating with OAuth connections.
- [CL4] Clerk Docs, Add custom onboarding to your authentication flow.
- [CL5] clerk/openapi-specs, Frontend API `fapi/2026-05-12.yml` (`abandon_at`, Get Sign-up).
- [CL6] Clerk Docs, `useSignInWithGoogle()` (Expo).
- [AU1] Auth0 Docs, Redirect with Actions.
- [AU2] Auth0 Docs, Render Forms using Actions.
- [AU3] Auth0 Docs, Understand How Progressive Profiling Works.
- [AU4] Auth0 Docs, Pre User Registration.
- [AU5] Auth0 Docs, Post Login.
- [AU6] Auth0 Docs, Configure User Profile Attribute Synchronization from Upstream Identity Providers.
- [FI1] Firebase, Authenticate with Google on Android (updated 2026-09-24).
- [FI2] Firebase, Users in Firebase Projects (updated 2026-09-24).
- [FI3] Firebase JavaScript API reference, AdditionalUserInfo (updated 2022-07-22).
- [FI4] Firebase, Extend Firebase Authentication with blocking functions (updated 2026-09-24).
- [SB1] Supabase Docs, User Management (source last changed 2026-08-03).
- [SB2] supabase/auth, `internal/api/token_oidc.go` (last commit 2026-08-10).
- [AJ1] Auth.js, `packages/core/src/lib/actions/callback/handle-login.ts`.
- [AJ2] Auth.js, `packages/core/src/types.ts` (`pages.newUser`).
- [AJ3] Auth.js, `packages/core/src/lib/actions/callback/index.ts`.
- [AJ4] Auth.js Docs, Prisma adapter schema.
- [CG1] Amazon Cognito, User pool sign-in with third party identity providers.
- [CG2] Amazon Cognito, Linking federated users to an existing user profile.
- [CG3] Amazon Cognito, Managed login and federation error responses.
- [CG4] Amazon Cognito, Working with user attributes.
- [CG5] Amazon Cognito, Inbound federation Lambda trigger.
- [GO1] Google for Developers, Verify the Google ID token on your server side (updated 2025-12-22).
- [GO2] Google for Developers, Authenticate with a backend server, for the older Google Sign-In for Android library (updated 2025-08-28).
- [GO3] Google for Developers, Sign in with Google best practices (updated 2026-03-18).
- [GO4] Android Developers, Implement Sign in with Google (updated 2026-09-16).
- [GO5] Google for Developers, Sign in with Google JavaScript API reference (updated 2026-09-01).
- [GO6] Google Cloud, Token types (updated 2026-09-24).
- [GO7] Google for Developers, OpenID Connect (updated 2026-06-15).
- [S1] OpenID Connect Core 1.0 incorporating errata set 2, §2 (`nonce`), §3.1.3.7, §15.5.2.
- [S2] RFC 7519, JSON Web Token, §4.1.7.

[CL1]: https://clerk.com/docs/nextjs/reference/objects/sign-up
[CL2]: https://clerk.com/docs/js-frontend/reference/objects/sign-up-future
[CL3]: https://clerk.com/docs/guides/development/custom-flows/authentication/oauth-connections
[CL4]: https://clerk.com/docs/guides/development/add-onboarding-flow
[CL5]: https://github.com/clerk/openapi-specs/blob/main/fapi/2026-05-12.yml
[CL6]: https://clerk.com/docs/expo/reference/native-hooks/use-sign-in-with-google
[AU1]: https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger/redirect-with-actions
[AU2]: https://auth0.com/docs/customize/forms/render
[AU3]: https://auth0.com/docs/manage-users/user-accounts/user-profiles/progressive-profiling
[AU4]: https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/pre-user-registration-trigger
[AU5]: https://auth0.com/docs/customize/actions/explore-triggers/signup-and-login-triggers/login-trigger
[AU6]: https://auth0.com/docs/manage-users/user-accounts/user-profiles/configure-connection-sync-with-auth0
[FI1]: https://firebase.google.com/docs/auth/android/google-signin
[FI2]: https://firebase.google.com/docs/auth/users
[FI3]: https://firebase.google.com/docs/reference/js/auth.additionaluserinfo
[FI4]: https://firebase.google.com/docs/auth/extend-with-blocking-functions
[SB1]: https://supabase.com/docs/guides/auth/managing-user-data
[SB2]: https://github.com/supabase/auth/blob/master/internal/api/token_oidc.go
[AJ1]: https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/lib/actions/callback/handle-login.ts
[AJ2]: https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/types.ts
[AJ3]: https://github.com/nextauthjs/next-auth/blob/main/packages/core/src/lib/actions/callback/index.ts
[AJ4]: https://authjs.dev/getting-started/adapters/prisma
[CG1]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html
[CG2]: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html
[CG3]: https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoint-idp-responses.html
[CG4]: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
[CG5]: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-inbound-federation.html
[GO1]: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
[GO2]: https://developers.google.com/identity/sign-in/android/backend-auth
[GO3]: https://developers.google.com/identity/siwg/best-practices
[GO4]: https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation
[GO5]: https://developers.google.com/identity/gsi/web/reference/js-reference
[GO6]: https://cloud.google.com/docs/authentication/token-types
[GO7]: https://developers.google.com/identity/openid-connect/openid-connect
[S1]: https://openid.net/specs/openid-connect-core-1_0.html
[S2]: https://www.rfc-editor.org/rfc/rfc7519
